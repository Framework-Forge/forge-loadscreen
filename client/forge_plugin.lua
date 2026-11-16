local function awaitBridge()
    local timeoutAt = GetGameTimer() + 5000
    while (not pr_lib or not pr_lib.callback or not pr_lib.callback.await) and GetGameTimer() < timeoutAt do
        Wait(100)
    end

    return pr_lib and pr_lib.callback and pr_lib.callback.await
end

RegisterNUICallback('forgeLoadscreenGetConfig', function(_, cb)
    if not awaitBridge() then
        cb({ ok = false, error = 'bridge_unavailable' })
        return
    end

    local ok, result = pr_lib.callback.await('forge-loadscreen:server:plugin:getConfig', 5000)
    cb({ ok = ok == true, data = result, error = ok == true and nil or result })
end)

RegisterNUICallback('forgeLoadscreenSaveConfig', function(data, cb)
    if not awaitBridge() then
        cb({ ok = false, error = 'bridge_unavailable' })
        return
    end

    local ok, result = pr_lib.callback.await('forge-loadscreen:server:plugin:saveConfig', 8000, data or {})
    cb({ ok = ok == true, data = result, error = ok == true and nil or result })
end)

RegisterNUICallback('forgeLoadscreenPreview', function(_, cb)
    if not awaitBridge() then
        cb({ ok = false, error = 'bridge_unavailable' })
        return
    end

    local allowed = pr_lib.callback.await('forge-loadscreen:server:plugin:canPreview', 5000)
    if allowed ~= true then
        cb({ ok = false, error = 'no_permission' })
        return
    end

    TriggerEvent('forge-loadscreen:client:showPreview')
    cb({ ok = true })
end)
