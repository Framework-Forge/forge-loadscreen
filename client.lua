-- Only close the loading screen when the player has spawned and the configured
-- minimum display time has passed.
local spawned = false
local loadingScreenStartedAt = GetGameTimer()
local minimumLoadscreenSeconds = 0
local runtimeConfigLoaded = false
local Config = {}
local loadingScreenClosed = false
local minimumDurationFinished = false
local minimumDurationRunning = false

-- Forward declarations of functions to avoid global scoping issues
local openMainMenu
local openSectionsMenu
local openColorsMenu
local openBrandingMenu
local openVideoMenu
local openDurationMenu
local openMusicMenu
local openTipMenu
local openSocialMenu
local openRulesMenu
local openStaffMenu
local openChangelogsMenu
local openKeybindsMenu
local saveAndApplyConfig

local function getMinimumLoadscreenSeconds(config)
    if type(config) ~= "table" then return 0 end

    local value =
        config.minimumLoadscreenSeconds or
        config.MinimumLoadscreenSeconds or
        config.minimumLoadscreenDuration or
        config.MinimumLoadscreenDuration or
        config.minLoadscreenSeconds or
        config.MinLoadscreenSeconds or
        config.minimumDuration or
        config.MinimumDuration or
        config.minDuration or
        config.MinDuration

    value = tonumber(value) or 0
    if value < 0 then value = 0 end

    return math.floor(value)
end

local function applyRuntimeConfig(newConfig)
    if type(newConfig) == "table" then
        Config = newConfig
        minimumLoadscreenSeconds = getMinimumLoadscreenSeconds(Config)

        local elapsedMs = tonumber(Config.loadingElapsedMs)
        if elapsedMs and elapsedMs > 0 and not loadingScreenClosed then
            loadingScreenStartedAt = GetGameTimer() - elapsedMs
        end
    end

    runtimeConfigLoaded = true
end

local function sendLoadingScreenMessage(payload)
    SendLoadingScreenMessage(json.encode(payload))
end

local function loadRuntimeConfig()
    if runtimeConfigLoaded then return end

    local timeoutAt = GetGameTimer() + 5000
    while (not pr_lib or not pr_lib.callback or not pr_lib.callback.await) and GetGameTimer() < timeoutAt do
        Wait(100)
    end

    if pr_lib and pr_lib.callback and pr_lib.callback.await then
        local currentConfig = pr_lib.callback.await("forge-loadscreen:server:getConfig", 5000)
        if currentConfig then
            applyRuntimeConfig(currentConfig)
            return
        end
    end

    runtimeConfigLoaded = true
end

local function waitForMinimumDuration()
    if minimumDurationFinished then return end

    while minimumDurationRunning do
        Wait(100)
    end

    if minimumDurationFinished then return end

    minimumDurationRunning = true
    loadRuntimeConfig()

    local minimumMs = minimumLoadscreenSeconds * 1000
    local remainingMs = minimumMs - (GetGameTimer() - loadingScreenStartedAt)
    local initialWaitMs = math.max(remainingMs, 0)

    while remainingMs > 0 do
        local waitProgress = 0
        if initialWaitMs > 0 then
            waitProgress = 1.0 - (remainingMs / initialWaitMs)
        end

        sendLoadingScreenMessage({
            action = "minimumDurationWait",
            remainingSeconds = math.ceil(remainingMs / 1000),
            waitTotalSeconds = math.ceil(initialWaitMs / 1000),
            waitProgress = waitProgress,
            minimumLoadscreenSeconds = minimumLoadscreenSeconds
        })

        Wait(math.min(remainingMs, 1000))
        remainingMs = minimumMs - (GetGameTimer() - loadingScreenStartedAt)
    end

    if initialWaitMs > 0 then
        sendLoadingScreenMessage({
            action = "minimumDurationWait",
            remainingSeconds = 0,
            waitTotalSeconds = math.ceil(initialWaitMs / 1000),
            waitProgress = 1.0,
            minimumLoadscreenSeconds = minimumLoadscreenSeconds
        })
        Wait(100)
    end

    minimumDurationFinished = true
    minimumDurationRunning = false
end

local function closeLoadingScreenAfterMinimumDuration()
    if loadingScreenClosed then return end

    waitForMinimumDuration()

    ShutdownLoadingScreen()
    ShutdownLoadingScreenNui()
    loadingScreenClosed = true
end

exports("WaitForMinimumDuration", waitForMinimumDuration)
exports("FinishLoadingScreen", closeLoadingScreenAfterMinimumDuration)
exports("GetMinimumLoadscreenSeconds", function()
    loadRuntimeConfig()
    return minimumLoadscreenSeconds
end)

AddEventHandler("playerSpawned", function()
    if spawned then return end

    spawned = true
    CreateThread(closeLoadingScreenAfterMinimumDuration)
end)

-- Color helper functions
local function hexToRgb(hex)
    hex = hex:gsub("#","")
    if #hex == 3 then
        return tonumber("0x"..hex:sub(1,1)) * 17, tonumber("0x"..hex:sub(2,2)) * 17, tonumber("0x"..hex:sub(3,3)) * 17
    elseif #hex == 6 then
        return tonumber("0x"..hex:sub(1,2)), tonumber("0x"..hex:sub(3,4)), tonumber("0x"..hex:sub(5,6))
    end
    return 0, 0, 0
end

local function makeRgba(hex, alpha)
    local r, g, b = hexToRgb(hex or "#ffffff")
    return ("rgba(%d, %d, %d, %.2f)"):format(r, g, b, tonumber(alpha) or 1.0)
end

local function parseRgbaOrHex(colorStr)
    if not colorStr then return "#ffffff", 1.0 end
    
    -- Check if it is rgba(r, g, b, a)
    local r, g, b, a = colorStr:match("rgba%s*%(%s*(%d+)%s*,%s*(%d+)%s*,%s*(%d+)%s*,%s*([%d%.]+)%s*%)")
    if r and g and b and a then
        local hex = ("#%02x%02x%02x"):format(tonumber(r), tonumber(g), tonumber(b))
        return hex, tonumber(a)
    end
    
    -- Check if it is rgb(r, g, b)
    local r2, g2, b2 = colorStr:match("rgb%s*%(%s*(%d+)%s*,%s*(%d+)%s*,%s*(%d+)%s*%)")
    if r2 and g2 and b2 then
        local hex = ("#%02x%02x%02x"):format(tonumber(r2), tonumber(g2), tonumber(b2))
        return hex, 1.0
    end
    
    -- If it is already hex
    if colorStr:match("^#%x%x%x%x%x%x$") or colorStr:match("^#%x%x%x$") then
        return colorStr, 1.0
    end
    
    return "#ffffff", 1.0
end

-- Check if pr_lib is loaded
CreateThread(function()
    -- Give a short timeout for pr_bridge to register itself
    Wait(500)
    if not pr_lib then
        print("^1[forge-loadscreen] Erro: pr_bridge não foi carregado! O menu admin não funcionará.^0")
    end
end)

RegisterNetEvent("forge-loadscreen:client:openAdminMenu", function()
    if not pr_lib then
        print("^1[forge-loadscreen] Erro: pr_bridge não carregou. Não é possível abrir o menu.^0")
        return
    end

    local currentConfig, err = pr_lib.callback.await("forge-loadscreen:server:getConfig", 5000)
    if currentConfig then
        applyRuntimeConfig(currentConfig)
    else
        pr_lib.debug.error("[forge-loadscreen] Falha ao obter configuração atual do servidor: " .. tostring(err))
    end

    openMainMenu()
end)

RegisterNetEvent("forge-loadscreen:client:setRuntimeConfig", function(newConfig)
    applyRuntimeConfig(newConfig)
end)

-- Function definitions
openMainMenu = function()
    pr_lib.menus.RegisterContext({
        id = "forge_loadscreen:admin_menu",
        title = "Configuração Loading Screen",
        options = {
            {
                title = "Seções Ativas",
                description = "Habilitar ou desabilitar partes da tela de carregamento",
                icon = "toggle-on",
                onSelect = openSectionsMenu
            },
            {
                title = "Cores e Aparência",
                description = "Ajustar cores e opacidade dos painéis e cartões",
                icon = "palette",
                onSelect = openColorsMenu
            },
            {
                title = "Textos de Branding",
                description = ("Comunidade: %s | Slogan: %s"):format(Config.communityName or "N/A", Config.slogan or "N/A"),
                icon = "font",
                onSelect = openBrandingMenu
            },
            {
                title = "Vídeo de Fundo",
                description = ("Vídeo: %s"):format(Config.videoSource or "N/A"),
                icon = "video",
                onSelect = openVideoMenu
            },
            {
                title = "Tempo Minimo de Loading",
                description = ("Minimo: %d segundos"):format(getMinimumLoadscreenSeconds(Config)),
                icon = "clock",
                onSelect = openDurationMenu
            },
            {
                title = "Música de Fundo",
                description = ("Volume: %s"):format(Config.musicVolume or 0.6),
                icon = "music",
                onSelect = openMusicMenu
            },
            {
                title = "Dica (Tip)",
                description = Config.tip or "Nenhuma dica configurada",
                icon = "lightbulb",
                onSelect = openTipMenu
            },
            {
                title = "Links Sociais",
                description = "Configurar links de redes sociais e tebex",
                icon = "share-nodes",
                onSelect = openSocialMenu
            },
            {
                title = "Regras do Servidor",
                description = ("Gerenciar regras (%d cadastradas)"):format(Config.rules and #Config.rules or 0),
                icon = "gavel",
                onSelect = openRulesMenu
            },
            {
                title = "Change Logs",
                description = ("Gerenciar changelogs (%d cadastrados)"):format(Config.changelogs and #Config.changelogs or 0),
                icon = "file-lines",
                onSelect = openChangelogsMenu
            },
            {
                title = "Gerenciar Staff",
                description = ("Gerenciar staff (%d cadastrados)"):format(Config.staff and #Config.staff or 0),
                icon = "people-group",
                onSelect = openStaffMenu
            },
            {
                title = "Gerenciar Keybinds",
                description = ("Gerenciar keybinds (%d cadastrados)"):format(Config.keybinds and #Config.keybinds or 0),
                icon = "keyboard",
                onSelect = openKeybindsMenu
            },
            {
                title = "Salvar e Aplicar",
                description = "Salvar alterações e aplicar em tempo real",
                icon = "floppy-disk",
                onSelect = saveAndApplyConfig
            }
        }
    })

    pr_lib.menus.ShowContext("forge_loadscreen:admin_menu")
end

openSectionsMenu = function()
    pr_lib.menus.RegisterContext({
        id = "forge_loadscreen:sections_menu",
        title = "Seções Ativas",
        menu = "forge_loadscreen:admin_menu",
        options = {
            {
                title = "Branding (Logo/Nomes)",
                description = Config.BrandingEnabled and "Status: ATIVO" or "Status: INATIVO",
                icon = Config.BrandingEnabled and "check" or "xmark",
                onSelect = function()
                    Config.BrandingEnabled = not Config.BrandingEnabled
                    openSectionsMenu()
                end
            },
            {
                title = "Vídeo de Fundo",
                description = Config.VideoEnabled and "Status: ATIVO" or "Status: INATIVO",
                icon = Config.VideoEnabled and "check" or "xmark",
                onSelect = function()
                    Config.VideoEnabled = not Config.VideoEnabled
                    openSectionsMenu()
                end
            },
            {
                title = "Música de Fundo",
                description = Config.MusicEnabled and "Status: ATIVO" or "Status: INATIVO",
                icon = Config.MusicEnabled and "check" or "xmark",
                onSelect = function()
                    Config.MusicEnabled = not Config.MusicEnabled
                    openSectionsMenu()
                end
            },
            {
                title = "Dica (Tip)",
                description = Config.TipEnabled and "Status: ATIVO" or "Status: INATIVO",
                icon = Config.TipEnabled and "check" or "xmark",
                onSelect = function()
                    Config.TipEnabled = not Config.TipEnabled
                    openSectionsMenu()
                end
            },
            {
                title = "Regras do Servidor",
                description = Config.RulesEnabled and "Status: ATIVO" or "Status: INATIVO",
                icon = Config.RulesEnabled and "check" or "xmark",
                onSelect = function()
                    Config.RulesEnabled = not Config.RulesEnabled
                    openSectionsMenu()
                end
            },
            {
                title = "Change Logs",
                description = Config.ChangelogsEnabled and "Status: ATIVO" or "Status: INATIVO",
                icon = Config.ChangelogsEnabled and "check" or "xmark",
                onSelect = function()
                    Config.ChangelogsEnabled = not Config.ChangelogsEnabled
                    openSectionsMenu()
                end
            },
            {
                title = "Keybinds (Teclas)",
                description = Config.KeybindsEnabled and "Status: ATIVO" or "Status: INATIVO",
                icon = Config.KeybindsEnabled and "check" or "xmark",
                onSelect = function()
                    Config.KeybindsEnabled = not Config.KeybindsEnabled
                    openSectionsMenu()
                end
            },
            {
                title = "Staff",
                description = Config.StaffEnabled and "Status: ATIVO" or "Status: INATIVO",
                icon = Config.StaffEnabled and "check" or "xmark",
                onSelect = function()
                    Config.StaffEnabled = not Config.StaffEnabled
                    openSectionsMenu()
                end
            },
            {
                title = "Links Sociais",
                description = Config.SocialEnabled and "Status: ATIVO" or "Status: INATIVO",
                icon = Config.SocialEnabled and "check" or "xmark",
                onSelect = function()
                    Config.SocialEnabled = not Config.SocialEnabled
                    openSectionsMenu()
                end
            }
        }
    })
    pr_lib.menus.ShowContext("forge_loadscreen:sections_menu")
end

openColorsMenu = function()
    if not Config.colors then Config.colors = {} end
    
    local panelHex, panelAlpha = parseRgbaOrHex(Config.colors.bgPanel)
    local cardHex, cardAlpha = parseRgbaOrHex(Config.colors.bgCard)
    local borderHex, borderAlpha = parseRgbaOrHex(Config.colors.border)
    local accentHex, _ = parseRgbaOrHex(Config.colors.accent)

    local input = pr_lib.menus.InputDialog("Cores e Aparência", {
        { type = 'color', label = 'Fundo do Painel', default = panelHex },
        { type = 'slider', label = 'Opacidade do Painel', default = panelAlpha, min = 0.0, max = 1.0, step = 0.05 },
        
        { type = 'color', label = 'Fundo dos Cartões', default = cardHex },
        { type = 'slider', label = 'Opacidade dos Cartões', default = cardAlpha, min = 0.0, max = 1.0, step = 0.05 },
        
        { type = 'color', label = 'Cor da Borda', default = borderHex },
        { type = 'slider', label = 'Opacidade da Borda', default = borderAlpha, min = 0.0, max = 1.0, step = 0.05 },
        
        { type = 'color', label = 'Cor de Destaque / Accent', default = accentHex }
    })

    if input then
        Config.colors.bgPanel = makeRgba(input[1], input[2])
        Config.colors.bgCard = makeRgba(input[3], input[4])
        Config.colors.border = makeRgba(input[5], input[6])
        Config.colors.accent = input[7]
        
        pr_lib.notifications.Notify({
            title = "Aparência",
            description = "Cores e opacidades atualizadas localmente!",
            type = "success"
        })
    end
    openMainMenu()
end

openBrandingMenu = function()
    local input = pr_lib.menus.InputDialog("Textos de Branding", {
        { type = 'input', label = 'Nome da Comunidade', default = Config.communityName or "" },
        { type = 'input', label = 'Slogan', default = Config.slogan or "" }
    })

    if input then
        Config.communityName = input[1]
        Config.slogan = input[2]
        pr_lib.notifications.Notify({
            title = "Branding",
            description = "Branding atualizado localmente!",
            type = "success"
        })
    end
    openMainMenu()
end

openVideoMenu = function()
    local input = pr_lib.menus.InputDialog("Configurar Vídeo", {
        { type = 'input', label = 'Caminho/URL do Vídeo', default = Config.videoSource or "" },
        { type = 'select', label = 'Tipo do Vídeo', default = Config.videoType or "local", options = {
            { value = "auto", label = "Automático" },
            { value = "local", label = "Local (no script)" },
            { value = "youtube", label = "YouTube" }
        }},
        { type = 'checkbox', label = 'Mutado', checked = Config.videoMuted }
    })

    if input then
        Config.videoSource = input[1]
        Config.videoType = input[2]
        Config.videoMuted = input[3]
        pr_lib.notifications.Notify({
            title = "Vídeo de Fundo",
            description = "Configuração do vídeo atualizada!",
            type = "success"
        })
    end
    openMainMenu()
end

openDurationMenu = function()
    local input = pr_lib.menus.InputDialog("Tempo Minimo de Loading", {
        {
            type = 'number',
            label = 'Segundos minimos',
            default = getMinimumLoadscreenSeconds(Config),
            min = 0,
            max = 600,
            step = 1
        }
    })

    if input then
        Config.minimumLoadscreenSeconds = getMinimumLoadscreenSeconds({
            minimumLoadscreenSeconds = input[1]
        })
        minimumLoadscreenSeconds = Config.minimumLoadscreenSeconds

        pr_lib.notifications.Notify({
            title = "Tempo Minimo",
            description = ("Loading screen vai ficar pelo menos %d segundos."):format(Config.minimumLoadscreenSeconds),
            type = "success"
        })
    end

    openMainMenu()
end

openMusicMenu = function()
    pr_lib.menus.RegisterContext({
        id = "forge_loadscreen:music_menu",
        title = "Música de Fundo",
        menu = "forge_loadscreen:admin_menu",
        options = {
            {
                title = "Ajustar Volume",
                description = ("Volume atual: %s"):format(Config.musicVolume or 0.6),
                icon = "volume-high",
                onSelect = function()
                    local input = pr_lib.menus.InputDialog("Volume da Música", {
                        { type = 'number', label = 'Volume (0.0 a 1.0)', default = Config.musicVolume or 0.6, min = 0, max = 1, step = 0.1 }
                    })
                    if input and input[1] then
                        Config.musicVolume = tonumber(input[1])
                    end
                    openMusicMenu()
                end
            },
            {
                title = "Editar Faixa 1",
                description = ("Nome: %s | Src: %s"):format(
                    Config.musicTracks[1] and Config.musicTracks[1].name or "Vazia",
                    Config.musicTracks[1] and Config.musicTracks[1].src or "N/A"
                ),
                icon = "music",
                onSelect = function()
                    local track1 = Config.musicTracks[1] or { name = "", src = "" }
                    local input = pr_lib.menus.InputDialog("Editar Faixa 1", {
                        { type = 'input', label = 'Nome da Música', default = track1.name or "" },
                        { type = 'input', label = 'Caminho/URL do arquivo (.mp3)', default = track1.src or "" }
                    })
                    if input then
                        Config.musicTracks[1] = { name = input[1], src = input[2] }
                    end
                    openMusicMenu()
                end
            },
            {
                title = "Editar Faixa 2",
                description = ("Nome: %s | Src: %s"):format(
                    Config.musicTracks[2] and Config.musicTracks[2].name or "Vazia",
                    Config.musicTracks[2] and Config.musicTracks[2].src or "N/A"
                ),
                icon = "music",
                onSelect = function()
                    local track2 = Config.musicTracks[2] or { name = "", src = "" }
                    local input = pr_lib.menus.InputDialog("Editar Faixa 2", {
                        { type = 'input', label = 'Nome da Música', default = track2.name or "" },
                        { type = 'input', label = 'Caminho/URL do arquivo (.mp3)', default = track2.src or "" }
                    })
                    if input then
                        Config.musicTracks[2] = { name = input[1], src = input[2] }
                    end
                    openMusicMenu()
                end
            }
        }
    })
    pr_lib.menus.ShowContext("forge_loadscreen:music_menu")
end

openTipMenu = function()
    local input = pr_lib.menus.InputDialog("Configurar Dica", {
        { type = 'input', label = 'Texto da Dica', default = Config.tip or "" }
    })

    if input and input[1] then
        Config.tip = input[1]
        pr_lib.notifications.Notify({
            title = "Dica",
            description = "Dica atualizada localmente!",
            type = "success"
        })
    end
    openMainMenu()
end

openSocialMenu = function()
    local input = pr_lib.menus.InputDialog("Links Sociais", {
        { type = 'input', label = 'Instagram', default = Config.social.instagram or "" },
        { type = 'input', label = 'TikTok', default = Config.social.tiktok or "" },
        { type = 'input', label = 'X (Twitter)', default = Config.social.x or "" },
        { type = 'input', label = 'Tebex', default = Config.social.tebex or "" },
        { type = 'input', label = 'Discord', default = Config.social.discord or "" },
        { type = 'input', label = 'YouTube', default = Config.social.youtube or "" }
    })

    if input then
        Config.social.instagram = input[1]
        Config.social.tiktok = input[2]
        Config.social.x = input[3]
        Config.social.tebex = input[4]
        Config.social.discord = input[5]
        Config.social.youtube = input[6]
        pr_lib.notifications.Notify({
            title = "Links Sociais",
            description = "Links sociais atualizados!",
            type = "success"
        })
    end
    openMainMenu()
end

openRulesMenu = function()
    local options = {}
    
    for idx, rule in ipairs(Config.rules or {}) do
        table.insert(options, {
            title = ("Regra %d"):format(idx),
            description = rule,
            icon = "gavel",
            onSelect = function()
                pr_lib.menus.RegisterContext({
                    id = "forge_loadscreen:manage_rule",
                    title = ("Gerenciar Regra %d"):format(idx),
                    menu = "forge_loadscreen:rules_menu",
                    options = {
                        {
                            title = "Editar Regra",
                            description = "Alterar o texto desta regra",
                            icon = "pen-to-square",
                            onSelect = function()
                                local input = pr_lib.menus.InputDialog("Editar Regra", {
                                    { type = 'input', label = 'Texto da Regra', default = rule }
                                })
                                if input and input[1] then
                                    Config.rules[idx] = input[1]
                                    pr_lib.notifications.Notify({ title = "Regras", description = "Regra editada localmente!", type = "success" })
                                end
                                openRulesMenu()
                            end
                        },
                        {
                            title = "Apagar Regra",
                            description = "Remover esta regra da lista",
                            icon = "trash",
                            onSelect = function()
                                table.remove(Config.rules, idx)
                                pr_lib.notifications.Notify({ title = "Regras", description = "Regra apagada localmente!", type = "success" })
                                openRulesMenu()
                            end
                        }
                    }
                })
                pr_lib.menus.ShowContext("forge_loadscreen:manage_rule")
            end
        })
    end

    table.insert(options, {
        title = "Adicionar Nova Regra",
        description = "Criar uma nova regra para a lista",
        icon = "plus",
        onSelect = function()
            local input = pr_lib.menus.InputDialog("Nova Regra", {
                { type = 'input', label = 'Texto da Nova Regra' }
            })
            if input and input[1] and input[1] ~= "" then
                if not Config.rules then Config.rules = {} end
                table.insert(Config.rules, input[1])
                pr_lib.notifications.Notify({ title = "Regras", description = "Nova regra adicionada localmente!", type = "success" })
            end
            openRulesMenu()
        end
    })

    pr_lib.menus.RegisterContext({
        id = "forge_loadscreen:rules_menu",
        title = "Gerenciar Regras",
        menu = "forge_loadscreen:admin_menu",
        options = options
    })
    pr_lib.menus.ShowContext("forge_loadscreen:rules_menu")
end

openStaffMenu = function()
    local options = {}

    for idx, member in ipairs(Config.staff or {}) do
        table.insert(options, {
            title = member.name or "Membro Sem Nome",
            description = ("Cargo: %s | Foto: %s"):format(member.role or "Nenhum", member.photo or "Nenhuma"),
            icon = "user",
            onSelect = function()
                pr_lib.menus.RegisterContext({
                    id = "forge_loadscreen:manage_staff_member",
                    title = ("Gerenciar %s"):format(member.name or "Membro"),
                    menu = "forge_loadscreen:staff_menu",
                    options = {
                        {
                            title = "Editar Membro",
                            description = "Alterar nome, cargo ou foto",
                            icon = "user-pen",
                            onSelect = function()
                                local input = pr_lib.menus.InputDialog("Editar Staff", {
                                    { type = 'input', label = 'Nome', default = member.name or "" },
                                    { type = 'input', label = 'Cargo/Função', default = member.role or "" },
                                    { type = 'input', label = 'Caminho/URL da Foto', default = member.photo or "" }
                                })
                                if input then
                                    Config.staff[idx] = {
                                        name = input[1],
                                        role = input[2],
                                        photo = input[3]
                                    }
                                    pr_lib.notifications.Notify({ title = "Staff", description = "Membro atualizado localmente!", type = "success" })
                                end
                                openStaffMenu()
                            end
                        },
                        {
                            title = "Apagar Membro",
                            description = "Remover este membro da equipe",
                            icon = "trash",
                            onSelect = function()
                                table.remove(Config.staff, idx)
                                pr_lib.notifications.Notify({ title = "Staff", description = "Membro removido localmente!", type = "success" })
                                openStaffMenu()
                            end
                        }
                    }
                })
                pr_lib.menus.ShowContext("forge_loadscreen:manage_staff_member")
            end
        })
    end

    table.insert(options, {
        title = "Adicionar Novo Membro",
        description = "Adicionar um novo integrante da Staff",
        icon = "user-plus",
        onSelect = function()
            local input = pr_lib.menus.InputDialog("Novo Membro Staff", {
                { type = 'input', label = 'Nome' },
                { type = 'input', label = 'Cargo/Função' },
                { type = 'input', label = 'Caminho/URL da Foto', default = "./images/staff/default.png" }
            })
            if input and input[1] and input[1] ~= "" then
                if not Config.staff then Config.staff = {} end
                table.insert(Config.staff, {
                    name = input[1],
                    role = input[2] or "",
                    photo = input[3] or ""
                })
                pr_lib.notifications.Notify({ title = "Staff", description = "Novo membro adicionado localmente!", type = "success" })
            end
            openStaffMenu()
        end
    })

    pr_lib.menus.RegisterContext({
        id = "forge_loadscreen:staff_menu",
        title = "Gerenciar Staff",
        menu = "forge_loadscreen:admin_menu",
        options = options
    })
    pr_lib.menus.ShowContext("forge_loadscreen:staff_menu")
end

openChangelogsMenu = function()
    local options = {}

    for idx, entry in ipairs(Config.changelogs or {}) do
        table.insert(options, {
            title = ("Versão %s"):format(entry.version or "N/A"),
            description = ("Data: %s | %d itens"):format(entry.date or "N/A", entry.items and #entry.items or 0),
            icon = "file-lines",
            onSelect = function()
                pr_lib.menus.RegisterContext({
                    id = "forge_loadscreen:manage_changelog_entry",
                    title = ("Gerenciar Versão %s"):format(entry.version or ""),
                    menu = "forge_loadscreen:changelogs_menu",
                    options = {
                        {
                            title = "Editar Detalhes",
                            description = "Alterar versão e data",
                            icon = "pen-to-square",
                            onSelect = function()
                                local input = pr_lib.menus.InputDialog("Editar Detalhes", {
                                    { type = 'input', label = 'Versão', default = entry.version or "" },
                                    { type = 'input', label = 'Data', default = entry.date or "" }
                                })
                                if input then
                                    entry.version = input[1]
                                    entry.date = input[2]
                                    pr_lib.notifications.Notify({ title = "Changelog", description = "Detalhes atualizados!", type = "success" })
                                end
                                openChangelogsMenu()
                            end
                        },
                        {
                            title = "Gerenciar Itens (Novidades)",
                            description = "Adicionar ou remover linhas de alteração",
                            icon = "list-check",
                            onSelect = function()
                                local itemOptions = {}
                                for itemIdx, itemText in ipairs(entry.items or {}) do
                                    table.insert(itemOptions, {
                                        title = itemText,
                                        description = "Clique para apagar esta linha",
                                        icon = "minus",
                                        onSelect = function()
                                            table.remove(entry.items, itemIdx)
                                            pr_lib.notifications.Notify({ title = "Changelog", description = "Linha removida!", type = "success" })
                                            openChangelogsMenu()
                                        end
                                    })
                                end
                                table.insert(itemOptions, {
                                    title = "Adicionar Nova Linha",
                                    description = "Adicionar uma linha de novidade",
                                    icon = "plus",
                                    onSelect = function()
                                        local input = pr_lib.menus.InputDialog("Nova Linha", {
                                            { type = 'input', label = 'Texto do Item' }
                                        })
                                        if input and input[1] and input[1] ~= "" then
                                            if not entry.items then entry.items = {} end
                                            table.insert(entry.items, input[1])
                                            pr_lib.notifications.Notify({ title = "Changelog", description = "Item adicionado!", type = "success" })
                                        end
                                        openChangelogsMenu()
                                    end
                                })
                                pr_lib.menus.RegisterContext({
                                    id = "forge_loadscreen:manage_changelog_items",
                                    title = "Novidades da Versão",
                                    menu = "forge_loadscreen:manage_changelog_entry",
                                    options = itemOptions
                                })
                                pr_lib.menus.ShowContext("forge_loadscreen:manage_changelog_items")
                            end
                        },
                        {
                            title = "Apagar Versão",
                            description = "Excluir todo este changelog",
                            icon = "trash",
                            onSelect = function()
                                table.remove(Config.changelogs, idx)
                                pr_lib.notifications.Notify({ title = "Changelog", description = "Versão excluída localmente!", type = "success" })
                                openChangelogsMenu()
                            end
                        }
                    }
                })
                pr_lib.menus.ShowContext("forge_loadscreen:manage_changelog_entry")
            end
        })
    end

    table.insert(options, {
        title = "Criar Nova Versão",
        description = "Adicionar um novo changelog",
        icon = "plus",
        onSelect = function()
            local input = pr_lib.menus.InputDialog("Nova Versão Changelog", {
                { type = 'input', label = 'Versão (ex: 1.1.0)' },
                { type = 'input', label = 'Data (ex: 2026 ou 21/06)' }
            })
            if input and input[1] and input[1] ~= "" then
                if not Config.changelogs then Config.changelogs = {} end
                table.insert(Config.changelogs, {
                    version = input[1],
                    date = input[2] or "",
                    items = {}
                })
                pr_lib.notifications.Notify({ title = "Changelog", description = "Nova versão criada! Gerencie para adicionar itens.", type = "success" })
            end
            openChangelogsMenu()
        end
    })

    pr_lib.menus.RegisterContext({
        id = "forge_loadscreen:changelogs_menu",
        title = "Gerenciar Change Logs",
        menu = "forge_loadscreen:admin_menu",
        options = options
    })
    pr_lib.menus.ShowContext("forge_loadscreen:changelogs_menu")
end

openKeybindsMenu = function()
    local options = {}

    for idx, bind in ipairs(Config.keybinds or {}) do
        table.insert(options, {
            title = ("Tecla %s"):format(bind.key or "N/A"),
            description = ("Ação: %s | Desc: %s"):format(bind.action or "Nenhuma", bind.description or "Nenhuma"),
            icon = "keyboard",
            onSelect = function()
                pr_lib.menus.RegisterContext({
                    id = "forge_loadscreen:manage_keybind",
                    title = ("Tecla %s"):format(bind.key or ""),
                    menu = "forge_loadscreen:keybinds_menu",
                    options = {
                        {
                            title = "Editar Keybind",
                            description = "Alterar tecla, ação ou descrição",
                            icon = "pen-to-square",
                            onSelect = function()
                                local input = pr_lib.menus.InputDialog("Editar Keybind", {
                                    { type = 'input', label = 'Tecla (ex: F1, E, M)', default = bind.key or "" },
                                    { type = 'input', label = 'Ação (ex: Abrir Inventário)', default = bind.action or "" },
                                    { type = 'input', label = 'Descrição/Legenda', default = bind.description or "" }
                                })
                                if input and input[1] and input[1] ~= "" then
                                    bind.key = input[1]
                                    bind.action = input[2] or ""
                                    bind.description = input[3] or ""
                                    pr_lib.notifications.Notify({ title = "Keybinds", description = "Tecla atualizada localmente!", type = "success" })
                                end
                                openKeybindsMenu()
                            end
                        },
                        {
                            title = "Apagar Keybind",
                            description = "Remover esta tecla da lista",
                            icon = "trash",
                            onSelect = function()
                                table.remove(Config.keybinds, idx)
                                pr_lib.notifications.Notify({ title = "Keybinds", description = "Tecla removida localmente!", type = "success" })
                                openKeybindsMenu()
                            end
                        }
                    }
                })
                pr_lib.menus.ShowContext("forge_loadscreen:manage_keybind")
            end
        })
    end

    table.insert(options, {
        title = "Adicionar Novo Keybind",
        description = "Cadastrar uma nova tecla de atalho",
        icon = "plus",
        onSelect = function()
            local input = pr_lib.menus.InputDialog("Novo Keybind", {
                { type = 'input', label = 'Tecla (ex: F5, G, K)' },
                { type = 'input', label = 'Ação (ex: Usar Cinto)' },
                { type = 'input', label = 'Descrição/Legenda' }
            })
            if input and input[1] and input[1] ~= "" then
                if not Config.keybinds then Config.keybinds = {} end
                table.insert(Config.keybinds, {
                    key = input[1],
                    action = input[2] or "",
                    description = input[3] or ""
                })
                pr_lib.notifications.Notify({ title = "Keybinds", description = "Novo keybind adicionado!", type = "success" })
            end
            openKeybindsMenu()
        end
    })

    pr_lib.menus.RegisterContext({
        id = "forge_loadscreen:keybinds_menu",
        title = "Gerenciar Keybinds",
        menu = "forge_loadscreen:admin_menu",
        options = options
    })
    pr_lib.menus.ShowContext("forge_loadscreen:keybinds_menu")
end

saveAndApplyConfig = function()
    -- Rebuild Config.keys dynamically from Config.keybinds
    if Config.keybinds then
        Config.keys = {}
        for _, bind in ipairs(Config.keybinds) do
            if bind.key and bind.key ~= "" then
                Config.keys[bind.key] = {
                    enabled = true,
                    info = bind.description or bind.action or ""
                }
            end
        end
    end

    pr_lib.notifications.Notify({
        title = "Salvando...",
        description = "Enviando novas configurações ao servidor...",
        type = "inform"
    })
    
    local success, err = pr_lib.callback.await("forge-loadscreen:server:saveConfig", 5000, Config)
    if success then
        applyRuntimeConfig(Config)
        SendNUIMessage({ action = 'updateConfig', config = Config })
        pr_lib.notifications.Notify({
            title = "Sucesso",
            description = "Alterações salvas e aplicadas em tempo real!",
            type = "success"
        })
    else
        pr_lib.notifications.Notify({
            title = "Erro",
            description = "Falha ao salvar: " .. tostring(err or "erro desconhecido"),
            type = "error"
        })
    end
    openMainMenu()
end

-- Events and Callbacks for Loading Screen Preview in-game
RegisterNetEvent("forge-loadscreen:client:showPreview", function()
    if not pr_lib then return end
    
    local currentConfig, err = pr_lib.callback.await("forge-loadscreen:server:getConfig", 5000)
    if currentConfig then
        applyRuntimeConfig(currentConfig)
    end
    
    SendNUIMessage({ action = 'show', isPreview = true, config = Config })
    SetNuiFocus(true, true)
    pr_lib.notifications.Notify({
        title = "Loading Screen",
        description = "Pré-visualização iniciada! Pressione ESC ou clique no botão vermelho no topo direito para fechar.",
        type = "inform"
    })
end)

RegisterNUICallback("closePreview", function(data, cb)
    SendNUIMessage({ action = 'hide' })
    SetNuiFocus(false, false)
    cb('ok')
end)

-- Comando de backup para fechar a tela em caso de problemas de foco NUI
pr_lib.addCommand("stoploadscreen", {
    help = "Força o encerramento da loading screen in-game"
}, function()
    loadingScreenClosed = true
    SendNUIMessage({ action = 'hide' })
    SetNuiFocus(false, false)
end)

-- Ocultar a página NUI do jogo automaticamente quando o jogador entrar ou o script for reiniciado
