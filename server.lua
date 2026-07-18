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

local function copyConfigWithRuntimeData(src)
    loadSavedConfig(true)

    local runtimeConfig = {}
    for key, value in pairs(Config or {}) do
        runtimeConfig[key] = value
    end

    -- Injetar cores do forge-management
    if GetResourceState('forge-management') == 'started' then
        local ok, theme = pcall(function()
            return exports['forge-management']:GetTheme()
        end)
        if ok and theme and theme.accentColor then
            if not runtimeConfig.colors then runtimeConfig.colors = {} end
            runtimeConfig.colors.accent = theme.accentColor
            runtimeConfig.colors.accentDim = theme.accentColor .. "a6"
            runtimeConfig.colors.accentHover = theme.accentColor .. "26"
            runtimeConfig.colors.border = theme.accentColor .. "59"

            local bright = theme.accentBright or "#ffffff"
            local deep = theme.accentDeep or "#000000"
            runtimeConfig.colors.gradientAccent = ("linear-gradient(135deg, %s 0%%, %s 50%%, %s 100%%)"):format(bright, theme.accentColor, deep)
        end
    end

    if runtimeConfig.logoUrl then
        if not runtimeConfig.brand then runtimeConfig.brand = {} end
        runtimeConfig.brand.logo = runtimeConfig.logoUrl
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
        pr_lib.callback.register("forge-loadscreen:server:getConfig", function(src)
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

            Config = stripRuntimeData(newConfig)

            local savedString = json.encode(Config, { indent = true })
            local success = SaveResourceFile(GetCurrentResourceName(), "config.json", savedString, -1)

            if success then
                logSuccess(("[forge-loadscreen] Configuracoes salvas e aplicadas por ID %s"):format(src))
                return true
            end

            logError("[forge-loadscreen] Falha ao salvar as configuracoes em config.json")
            return false
        end)
    else
        logError("[forge-loadscreen] pr_lib.callback nao esta disponivel!")
    end

    if pr_lib.addCommand then
        pr_lib.addCommand("adminloadscreen", {
            help = "Abre o menu de configuracao da tela de carregamento",
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
