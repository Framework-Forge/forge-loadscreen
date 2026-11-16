-- Only close the loading screen when the player has spawned and the configured
-- minimum display time has passed.
local spawned = false
local loadingScreenStartedAt = GetGameTimer()
local minimumLoadscreenSeconds = 0
local runtimeConfigLoaded = false
local Config = {}
local previewEditing = false
local loadingScreenClosed = false
local minimumDurationFinished = false
local minimumDurationRunning = false

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

local function publishRuntimeConfig()
    if type(Config) ~= "table" or not next(Config) then return end

    sendLoadingScreenMessage({ action = "updateConfig", config = Config })
    SendNUIMessage({ action = "updateConfig", config = Config })
end

local function loadRuntimeConfig()
    if runtimeConfigLoaded then return true end

    local timeoutAt = GetGameTimer() + 5000
    while (not pr_lib or not pr_lib.callback or not pr_lib.callback.await) and GetGameTimer() < timeoutAt do
        Wait(100)
    end

    if pr_lib and pr_lib.callback and pr_lib.callback.await then
        local currentConfig = pr_lib.callback.await("forge-loadscreen:server:getConfig", 5000)
        if currentConfig then
            applyRuntimeConfig(currentConfig)
            publishRuntimeConfig()
            return true
        end
    end

    return false
end

CreateThread(function()
    Wait(0)
    loadRuntimeConfig()
end)

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


-- Runtime and administrative editing are separate. The editor works on a copy.
ForgeLoadscreenRuntime = {
    Apply = applyRuntimeConfig,
    Publish = publishRuntimeConfig,
    Preview = function(config, editLayout, dirty)
        previewEditing = editLayout == true
        SendNUIMessage({ action = 'show', isPreview = true, editLayout = previewEditing, unsaved = dirty == true, config = config })
        SetNuiFocus(true, true)
    end,
}

RegisterNetEvent("forge-loadscreen:client:setRuntimeConfig", function(newConfig)
    applyRuntimeConfig(newConfig)
    publishRuntimeConfig()
end)

RegisterNetEvent("forge-loadscreen:client:openAdminMenu", function(parentMenu, parentResource, classic)
    local callerResource = parentResource or GetInvokingResource()
    CreateThread(function()
        if not ForgeLoadscreenAdmin then
            print("^1[forge-loadscreen] Editor administrativo indisponivel.^0")
        elseif classic then
            ForgeLoadscreenAdmin.Open(parentMenu, callerResource)
        else
            ForgeLoadscreenAdmin.OpenVisual()
        end
    end)
end)

RegisterNetEvent("forge-loadscreen:client:showPreview", function()
    local currentConfig = pr_lib.callback.await("forge-loadscreen:server:getConfig", 5000)
    if currentConfig then applyRuntimeConfig(currentConfig) end
    ForgeLoadscreenRuntime.Preview(Config)
end)

local function closePreview()
    previewEditing = false
    SendNUIMessage({ action = 'hide' })
    SetNuiFocus(false, false)
    TriggerEvent('forge-loadscreen:client:previewClosed')
end

RegisterNUICallback('savePreviewConfig', function(data, cb)
    if not previewEditing or not ForgeLoadscreenAdmin then
        cb({ ok = false, error = 'no_permission' })
        return
    end
    local saved, result = ForgeLoadscreenAdmin.SavePreview(data)
    if saved then cb({ ok = true, config = result })
    else cb({ ok = false, error = result }) end
end)

RegisterNUICallback("closePreview", function(_, cb)
    cb('ok')
    closePreview()
end)

RegisterNUICallback('applyPreviewLayout', function(data, cb)
    local applied = previewEditing and ForgeLoadscreenAdmin and ForgeLoadscreenAdmin.ApplyPreview(data)
    cb({ ok = applied == true })
    if applied then closePreview() end
end)

pr_lib.addCommand("stoploadscreen", {
    help = "Fecha a previa da loading screen in-game"
}, function()
    loadingScreenClosed = true
    closePreview()
end)
