Config = {}
local connectionStartedAt = {}

local function nowMs()
    return os.time() * 1000
end

local function logSuccess(message)
    if pr_lib and pr_lib.debug and pr_lib.debug.success then
        pr_lib.debug.success(message)
    else
        print(message)
    end
end

local function logWarn(message)
    if pr_lib and pr_lib.debug and pr_lib.debug.warn then
        pr_lib.debug.warn(message)
    else
        print(message)
    end
end

local function logError(message)
    if pr_lib and pr_lib.debug and pr_lib.debug.error then
        pr_lib.debug.error(message)
    else
        print(("^1%s^0"):format(message))
    end
end

local function hasConfigPermission(src)
    if ForgeLoadscreenConfigService then return ForgeLoadscreenConfigService.CanManage(src) end
    if src == 0 then return true end
    return IsPlayerAceAllowed(src, "forge-loadscreen.admin")
        or IsPlayerAceAllowed(src, "forge-management.admin")
        or IsPlayerAceAllowed(src, "forge-core.admin")
        or IsPlayerAceAllowed(src, "forge-core.admin")
end

local function loadSavedConfig(silent)
    local configFile = LoadResourceFile(GetCurrentResourceName(), "config.json")
    if not configFile then
        logError("[forge-loadscreen] Arquivo config.json nao encontrado!")
        return
    end

    local savedData = json.decode(configFile)
    if not savedData then
        logError("[forge-loadscreen] Falha ao decodificar config.json")
        return
    end

    Config = savedData
    if not silent then
        logSuccess("[forge-loadscreen] Configuracoes carregadas com sucesso de config.json")
    end
end

local function countStartedResources()
    local total = 0
    local resourceAmount = GetNumResources()

    for index = 0, resourceAmount - 1 do
        local resourceName = GetResourceByFindIndex(index)
        local state = resourceName and GetResourceState(resourceName)

        if state == "started" or state == "starting" then
            total = total + 1
        end
    end

    return total
end

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

local function stripRuntimeData(config)
    config.serverResourceCount = nil
    config.resourceCount = nil
    config.resourceTotal = nil
    config.loadingElapsedMs = nil
    return config
end

local function themeHex(value, fallback)
    return type(value) == 'string' and value:match('^#%x%x%x%x%x%x$') and value or fallback
end

function ForgeLoadscreenConfigWithTheme(config, theme)
    if config.followGlobalTheme == false or GetResourceState('forge-management') ~= 'started' then return config end
    if type(theme) ~= 'table' then
        local ok, result = pcall(function() return exports['forge-management']:GetTheme() end)
        if not ok or type(result) ~= 'table' then return config end
        theme = result
    end

    local accent = themeHex(theme.accentColor)
    if not accent then return config end

    local runtimeConfig, colors = {}, {}
    for key, value in pairs(config) do runtimeConfig[key] = value end
    for key, value in pairs(config.colors or {}) do colors[key] = value end
    local r = tonumber(accent:sub(2, 3), 16)
    local g = tonumber(accent:sub(4, 5), 16)
    local b = tonumber(accent:sub(6, 7), 16)
    colors.accent = accent
    colors.accentDim = ('rgba(%d, %d, %d, 0.65)'):format(r, g, b)
    colors.accentHover = ('rgba(%d, %d, %d, 0.15)'):format(r, g, b)
    colors.border = ('rgba(%d, %d, %d, 0.48)'):format(r, g, b)
    colors.gradientAccent = ('linear-gradient(135deg, %s 0%%, %s 65%%, %s 100%%)'):format(
        themeHex(theme.accentBright, '#ffffff'), accent, themeHex(theme.accentDeep, accent)
    )
    runtimeConfig.colors = colors
    return runtimeConfig
end

local function copyConfigWithRuntimeData(src)
    loadSavedConfig(true)

    local runtimeConfig = {}
    for key, value in pairs(Config or {}) do
        runtimeConfig[key] = value
    end
    runtimeConfig = ForgeLoadscreenConfigWithTheme(runtimeConfig)

    if runtimeConfig.logoUrl then
        local brand = {}
        for key, value in pairs(runtimeConfig.brand or {}) do brand[key] = value end
        brand.logo = runtimeConfig.logoUrl
        runtimeConfig.brand = brand
    end

    local startedAt = src and connectionStartedAt[src]
    runtimeConfig.serverResourceCount = countStartedResources()
    runtimeConfig.loadingElapsedMs = startedAt and math.max(0, nowMs() - startedAt) or 0
    return runtimeConfig
end

CreateThread(function()
    if not pr_lib then
        print("^1[forge-loadscreen] Erro critico: pr_bridge nao foi carregado! Verifique o manifest.^0")
        return
    end

    loadSavedConfig()

    if pr_lib.callback and pr_lib.callback.register then
        pr_lib.callback.register("forge-loadscreen:server:canManage", function(src)
            return hasConfigPermission(src)
        end)
        pr_lib.callback.register("forge-loadscreen:server:getConfig", function(src, adminDraft)
            if adminDraft == true then
                if not hasConfigPermission(src) then return nil, 'no_permission' end
                loadSavedConfig(true)
                return Config
            end
            return copyConfigWithRuntimeData(src)
        end)

        pr_lib.callback.register("forge-loadscreen:server:saveConfig", function(src, newConfig)
            if not hasConfigPermission(src) then
                logWarn(("[forge-loadscreen] ID %s tentou salvar configuracao sem permissao."):format(src))
                return false, "no_permission"
            end

            if not newConfig or type(newConfig) ~= "table" then
                logError("[forge-loadscreen] Recebida tentativa de salvar configuracao invalida.")
                return false
            end

            if not ForgeLoadscreenConfigService then return false, 'config_service_unavailable' end
            return ForgeLoadscreenConfigService.Save(src, newConfig)
        end)
    else
        logError("[forge-loadscreen] pr_lib.callback nao esta disponivel!")
    end

    if pr_lib.addCommand then
        pr_lib.addCommand("adminloadscreen", {
            help = "Abre o editor visual da tela de carregamento",
            -- groups = { "admin", "god" }
        }, function(source)
            if source == 0 then
                logWarn("[forge-loadscreen] Este comando so pode ser usado por jogadores dentro do jogo.")
                return
            end

            if not hasConfigPermission(source) then
                logWarn(("[forge-loadscreen] ID %s tentou abrir admin sem permissao."):format(source))
                return
            end

            TriggerClientEvent("forge-loadscreen:client:openAdminMenu", source)
        end)

        pr_lib.addCommand("adminloadscreenmenu", {
            help = "Abre o menu clássico da tela de carregamento"
        }, function(source)
            if source ~= 0 and hasConfigPermission(source) then
                TriggerClientEvent("forge-loadscreen:client:openAdminMenu", source, false, false, true)
            end
        end)

        pr_lib.addCommand("previewloadscreen", {
            help = "Pre-visualiza a loading screen in-game",
            -- groups = { "admin", "god" }
        }, function(source)
            if source == 0 then
                logWarn("[forge-loadscreen] Este comando so pode ser usado por jogadores dentro do jogo.")
                return
            end

            if not hasConfigPermission(source) then
                logWarn(("[forge-loadscreen] ID %s tentou abrir preview sem permissao."):format(source))
                return
            end

            TriggerClientEvent("forge-loadscreen:client:showPreview", source)
        end)
    else
        logError("[forge-loadscreen] pr_lib.addCommand nao esta disponivel!")
    end
end)

AddEventHandler("playerConnecting", function(_, setKickReason, deferrals)
    local src = source
    connectionStartedAt[src] = nowMs()
    deferrals.handover(copyConfigWithRuntimeData(src))
end)

AddEventHandler("playerJoining", function()
    local src = source

    SetTimeout(1000, function()
        TriggerClientEvent("forge-loadscreen:client:setRuntimeConfig", src, copyConfigWithRuntimeData(src))
    end)
end)

AddEventHandler("playerDropped", function()
    connectionStartedAt[source] = nil
end)
