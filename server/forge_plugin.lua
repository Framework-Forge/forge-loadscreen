local RESOURCE = GetCurrentResourceName()
local CONFIG_FILE = 'config.json'
local BACKUP_FILE = 'config.plugin-backup.json'
local REQUIRED_PERMS = { 'forge-loadscreen.admin', 'forge-management.admin' }
local writeCooldown = {}

local function canManage(source)
    if source == 0 then return true end

    if GetResourceState('forge-management') == 'started' then
        local ok, allowed = pcall(function()
            return exports['forge-management']:CanManage(source)
        end)
        if ok then return allowed == true end
    end

    -- Fallback caso o forge-management nao esteja disponivel.
    return IsPlayerAceAllowed(source, 'forge-management.admin')
        or IsPlayerAceAllowed(source, 'admin')
        or IsPlayerAceAllowed(source, 'group.admin')
end

local function cleanString(value, fallback, maxLength)
    if value == nil then return fallback or '' end
    value = tostring(value):gsub('[%z\1-\8\11\12\14-\31]', '')
    maxLength = maxLength or 160
    if #value > maxLength then
        value = value:sub(1, maxLength)
    end
    return value
end

local function cleanNumber(value, fallback, min, max)
    value = tonumber(value)
    if not value then value = fallback or 0 end
    if min and value < min then value = min end
    if max and value > max then value = max end
    return value
end

local function cleanBool(value, fallback)
    if value == true or value == false then return value end
    return fallback == true
end

local function cleanPath(value, fallback, maxLength)
    value = cleanString(value, fallback or '', maxLength or 260)
    if value:find('%.%.', 1, false) then return fallback or '' end
    return value
end

local function cleanColor(value, fallback)
    value = cleanString(value, fallback or '#ffffff', 80)
    if value:match('^#%x%x%x$') or value:match('^#%x%x%x%x%x%x$') then
        return value
    end
    if value:match('^rgba%(%s*%d+%s*,%s*%d+%s*,%s*%d+%s*,%s*[%d%.]+%s*%)$') then
        return value
    end
    if value:match('^rgb%(%s*%d+%s*,%s*%d+%s*,%s*%d+%s*%)$') then
        return value
    end
    if value:match('^linear%-gradient%(') and #value <= 180 then
        return value
    end
    return fallback or '#ffffff'
end

local function readConfig()
    local raw = LoadResourceFile(RESOURCE, CONFIG_FILE)
    if not raw then return nil, 'config_missing' end

    local ok, decoded = pcall(json.decode, raw)
    if not ok or type(decoded) ~= 'table' then
        return nil, 'invalid_json'
    end

    return decoded
end

local function cleanStringArray(input, maxItems, maxLength)
    local result = {}
    if type(input) ~= 'table' then return result end

    for _, value in ipairs(input) do
        if #result >= maxItems then break end
        value = cleanString(value, '', maxLength)
        if value ~= '' then
            result[#result + 1] = value
        end
    end

    return result
end

local function cleanSocial(input)
    input = type(input) == 'table' and input or {}
    return {
        instagram = cleanPath(input.instagram, '', 220),
        tiktok = cleanPath(input.tiktok, '', 220),
        x = cleanPath(input.x, '', 220),
        tebex = cleanPath(input.tebex, '', 220),
        discord = cleanPath(input.discord, '', 220),
        youtube = cleanPath(input.youtube, '', 220),
        site = cleanPath(input.site, '', 220),
    }
end

local function cleanLinks(input)
    input = type(input) == 'table' and input or {}
    return {
        rules = cleanPath(input.rules, '#', 220),
        changelogs = cleanPath(input.changelogs, '#', 220),
        keybinds = cleanPath(input.keybinds, '#', 220),
    }
end

local function cleanBrand(input, current)
    input = type(input) == 'table' and input or {}
    current = type(current) == 'table' and current or {}
    return {
        mark = cleanString(input.mark, current.mark or 'A', 12),
        title = cleanString(input.title, current.title or 'FiveM', 48),
        subtitle = cleanString(input.subtitle, current.subtitle or 'Powered by CitizenFX', 80),
    }
end

local function cleanUiText(input, current)
    input = type(input) == 'table' and input or {}
    current = type(current) == 'table' and current or {}
    return {
        tipLabel = cleanString(input.tipLabel, current.tipLabel or 'DICA', 32),
        rulesLabel = cleanString(input.rulesLabel, current.rulesLabel or 'Regras', 32),
        changelogsLabel = cleanString(input.changelogsLabel, current.changelogsLabel or 'Novidades', 32),
        keybindsLabel = cleanString(input.keybindsLabel, current.keybindsLabel or 'Teclas', 32),
        staffLabel = cleanString(input.staffLabel, current.staffLabel or 'Equipe', 32),
        serverTeamLabel = cleanString(input.serverTeamLabel, current.serverTeamLabel or 'Equipe do servidor', 60),
        backLabel = cleanString(input.backLabel, current.backLabel or 'Voltar', 32),
        preparingEntry = cleanString(input.preparingEntry, current.preparingEntry or 'Preparando entrada', 80),
        entryReady = cleanString(input.entryReady, current.entryReady or 'Entrada liberada', 80),
        loadingComplete = cleanString(input.loadingComplete, current.loadingComplete or 'Carregamento concluido', 80),
        almostThere = cleanString(input.almostThere, current.almostThere or 'Quase la...', 80),
        loadingResources = cleanString(input.loadingResources, current.loadingResources or 'Carregando recursos do servidor...', 100),
        initializing = cleanString(input.initializing, current.initializing or 'Inicializando servidor...', 80),
        initializingServer = cleanString(input.initializingServer, current.initializingServer or 'Inicializando servidor', 80),
        synchronizing = cleanString(input.synchronizing, current.synchronizing or 'Sincronizando sessao...', 80),
        detectingResources = cleanString(input.detectingResources, current.detectingResources or 'detectando recursos', 60),
        resources = cleanString(input.resources, current.resources or 'recursos', 32),
        remaining = cleanString(input.remaining, current.remaining or 'restantes', 32),
        noKeybind = cleanString(input.noKeybind, current.noKeybind or 'Nenhuma tecla atribuida', 80),
        hideUiLabel = cleanString(input.hideUiLabel, current.hideUiLabel or 'Esconder UI', 40),
        showUiLabel = cleanString(input.showUiLabel, current.showUiLabel or 'Mostrar UI', 40),
    }
end

local function cleanFeatureCards(input, current)
    local result = {}
    input = type(input) == 'table' and input or {}
    current = type(current) == 'table' and current or {}

    for index = 1, 3 do
        local card = type(input[index]) == 'table' and input[index] or {}
        local old = type(current[index]) == 'table' and current[index] or {}
        result[index] = {
            title = cleanString(card.title, old.title or '', 60),
            description = cleanString(card.description, old.description or '', 120),
            icon = cleanString(card.icon, old.icon or '', 24),
        }
    end

    return result
end

local function cleanFooter(input, current)
    input = type(input) == 'table' and input or {}
    current = type(current) == 'table' and current or {}
    return {
        text = cleanString(input.text, current.text or 'DESENVOLVIDO COM AMOR POR EQUIPE forge STUDIOS', 120),
    }
end

local function cleanColors(input, current)
    input = type(input) == 'table' and input or {}
    current = type(current) == 'table' and current or {}
    return {
        bgDark = cleanColor(input.bgDark, current.bgDark or '#0f0a14'),
        bgPanel = cleanColor(input.bgPanel, current.bgPanel or 'rgba(8, 8, 18, 0.72)'),
        bgCard = cleanColor(input.bgCard, current.bgCard or 'rgba(31, 0, 156, 0.40)'),
        border = cleanColor(input.border, current.border or 'rgba(255, 255, 255, 0.16)'),
        accent = cleanColor(input.accent, current.accent or '#ff334f'),
        accentDim = cleanColor(input.accentDim, current.accentDim or 'rgba(255, 51, 79, 0.65)'),
        accentHover = cleanColor(input.accentHover, current.accentHover or 'rgba(255, 51, 79, 0.15)'),
        text = cleanColor(input.text, current.text or '#ffffff'),
        textMuted = cleanColor(input.textMuted, current.textMuted or '#b7b2c4'),
        success = cleanColor(input.success, current.success or '#4ade80'),
        error = cleanColor(input.error, current.error or '#f87171'),
        gradientAccent = cleanColor(input.gradientAccent, current.gradientAccent or 'linear-gradient(135deg, #ffffff 0%, #ff334f 100%)'),
    }
end

local function cleanBackgroundMedia(input, current)
    input = type(input) == 'table' and input or {}
    current = type(current) == 'table' and current or {}
    local items = {}
    local rawItems = type(input.items) == 'table' and input.items or {}

    for _, item in ipairs(rawItems) do
        if #items >= 12 then break end
        if type(item) == 'table' then
            local src = cleanPath(item.src or item.source or item.url or item.path, '', 260)
            if src ~= '' then
                items[#items + 1] = {
                    title = cleanString(item.title or item.name, ('Video %d'):format(#items + 1), 80),
                    type = cleanString(item.type or 'auto', 'auto', 16),
                    src = src,
                    duration = cleanNumber(item.duration or item.durationSeconds, 42, 8, 600),
                    muted = cleanBool(item.muted, false),
                }
            end
        end
    end

    return {
        enabled = cleanBool(input.enabled, current.enabled ~= false),
        mode = cleanString(input.mode, current.mode or 'playlist', 24),
        audio = cleanString(input.audio, current.audio or 'separate', 24),
        shuffle = cleanBool(input.shuffle, current.shuffle == true),
        rotateSeconds = cleanNumber(input.rotateSeconds, current.rotateSeconds or 42, 8, 600),
        items = items,
    }
end

local function cleanMusicTracks(input)
    local result = {}
    if type(input) ~= 'table' then return result end

    for _, track in ipairs(input) do
        if #result >= 20 then break end
        if type(track) == 'table' then
            local src = cleanPath(track.src or track.source or track.url or track.path, '', 260)
            if src ~= '' then
                result[#result + 1] = {
                    name = cleanString(track.name or track.title, ('Track %d'):format(#result + 1), 80),
                    artist = cleanString(track.artist or track.author, '', 80),
                    album = cleanString(track.album, '', 80),
                    cover = cleanPath(track.cover or track.image or track.artwork or track.thumbnail, '', 260),
                    type = cleanString(track.type or 'auto', 'auto', 16),
                    src = src,
                }
            end
        end
    end

    return result
end

local function cleanStaff(input)
    local result = {}
    if type(input) ~= 'table' then return result end

    for _, member in ipairs(input) do
        if #result >= 24 then break end
        if type(member) == 'table' then
            local name = cleanString(member.name, '', 80)
            local role = cleanString(member.role, '', 80)
            local photo = cleanPath(member.photo, '', 260)
            if name ~= '' or photo ~= '' then
                result[#result + 1] = { name = name, role = role, photo = photo }
            end
        end
    end

    return result
end

local function cleanChangelogs(input)
    local result = {}
    if type(input) ~= 'table' then return result end

    for _, entry in ipairs(input) do
        if #result >= 30 then break end
        if type(entry) == 'table' then
            result[#result + 1] = {
                version = cleanString(entry.version, '', 32),
                date = cleanString(entry.date, '', 32),
                items = cleanStringArray(entry.items, 24, 180),
            }
        end
    end

    return result
end

local function cleanKeybinds(input)
    local result = {}
    if type(input) ~= 'table' then return result end

    for _, bind in ipairs(input) do
        if #result >= 60 then break end
        if type(bind) == 'table' then
            local key = cleanString(bind.key, '', 24)
            if key ~= '' then
                result[#result + 1] = {
                    key = key,
                    action = cleanString(bind.action, '', 80),
                    description = cleanString(bind.description, '', 160),
                }
            end
        end
    end

    return result
end

local function buildKeysFromKeybinds(keybinds)
    local keys = {}
    for _, bind in ipairs(keybinds or {}) do
        keys[bind.key] = {
            enabled = true,
            info = bind.description ~= '' and bind.description or bind.action,
        }
    end
    return keys
end

local function sanitizeConfig(input, current)
    input = type(input) == 'table' and input or {}
    current = type(current) == 'table' and current or {}

    local backgroundMedia = cleanBackgroundMedia(input.backgroundMedia, current.backgroundMedia)
    local musicTracks = cleanMusicTracks(input.musicTracks)
    local keybinds = cleanKeybinds(input.keybinds)

    local sanitized = {
        BrandingEnabled = cleanBool(input.BrandingEnabled, current.BrandingEnabled ~= false),
        VideoEnabled = cleanBool(input.VideoEnabled, current.VideoEnabled ~= false),
        MusicEnabled = cleanBool(input.MusicEnabled, current.MusicEnabled ~= false),
        TipEnabled = cleanBool(input.TipEnabled, current.TipEnabled ~= false),
        RulesEnabled = cleanBool(input.RulesEnabled, current.RulesEnabled ~= false),
        ChangelogsEnabled = cleanBool(input.ChangelogsEnabled, current.ChangelogsEnabled ~= false),
        KeybindsEnabled = cleanBool(input.KeybindsEnabled, current.KeybindsEnabled ~= false),
        StaffEnabled = cleanBool(input.StaffEnabled, current.StaffEnabled ~= false),
        SocialEnabled = cleanBool(input.SocialEnabled, current.SocialEnabled ~= false),

        language = cleanString(input.language, current.language or 'pt-BR', 12),
        communityName = cleanString(input.communityName, current.communityName or '', 80),
        serverName = cleanString(input.serverName, current.serverName or '', 80),
        slogan = cleanString(input.slogan, current.slogan or '', 140),
        tagline = cleanString(input.tagline, current.tagline or 'LOADING', 40),
        tip = cleanString(input.tip, current.tip or '', 180),
        minimumLoadscreenSeconds = cleanNumber(input.minimumLoadscreenSeconds, current.minimumLoadscreenSeconds or 0, 0, 900),
        logoUrl = cleanPath(input.logoUrl, current.logoUrl or '', 260),

        colors = cleanColors(input.colors, current.colors),
        social = cleanSocial(input.social),
        links = cleanLinks(input.links),
        brand = cleanBrand(input.brand, current.brand),
        uiText = cleanUiText(input.uiText, current.uiText),
        featureCards = cleanFeatureCards(input.featureCards, current.featureCards),
        footer = cleanFooter(input.footer, current.footer),

        backgroundAudio = cleanString(input.backgroundAudio or backgroundMedia.audio, 'separate', 24),
        backgroundMode = cleanString(input.backgroundMode or backgroundMedia.mode, 'playlist', 24),
        backgroundMedia = backgroundMedia,
        videoSource = backgroundMedia.items[1] and backgroundMedia.items[1].src or cleanPath(input.videoSource, current.videoSource or '', 260),
        videoType = backgroundMedia.items[1] and backgroundMedia.items[1].type or cleanString(input.videoType, current.videoType or 'auto', 16),
        videoMuted = cleanBool(input.videoMuted, current.videoMuted == true),

        musicTracks = musicTracks,
        musicVolume = cleanNumber(input.musicVolume, current.musicVolume or 0.6, 0, 1),
        musicAutoplay = cleanBool(input.musicAutoplay, current.musicAutoplay ~= false),
        musicShowCover = cleanBool(input.musicShowCover, current.musicShowCover ~= false),
        musicShuffle = cleanBool(input.musicShuffle, current.musicShuffle == true),
        musicSourceMode = cleanString(input.musicSourceMode, current.musicSourceMode or 'playlist', 24),

        staff = cleanStaff(input.staff),
        staffCarouselEnabled = cleanBool(input.staffCarouselEnabled, current.staffCarouselEnabled ~= false),
        staffCarouselSeconds = cleanNumber(input.staffCarouselSeconds, current.staffCarouselSeconds or 6, 3, 60),

        rules = cleanStringArray(input.rules, 80, 220),
        changelogs = cleanChangelogs(input.changelogs),
        keybinds = keybinds,
        keys = buildKeysFromKeybinds(keybinds),
    }

    return sanitized
end

local function audit(source, action, details)
    if GetResourceState('forge-management') ~= 'started' then return end
    pcall(function()
        exports['forge-management']:Audit(source, action, 'forge-loadscreen', details or {})
    end)
end

local function saveConfig(source, config)
    local current, err = readConfig()
    if not current then return false, err end

    local sanitized = sanitizeConfig(config, current)
    local previous = json.encode(current, { indent = true })
    if previous then
        SaveResourceFile(RESOURCE, BACKUP_FILE, previous, -1)
    end

    local saved = SaveResourceFile(RESOURCE, CONFIG_FILE, json.encode(sanitized, { indent = true }), -1)
    if not saved then return false, 'save_failed' end

    Config = sanitized
    audit(source, 'forge-loadscreen.config.save', {
        videos = #(sanitized.backgroundMedia.items or {}),
        tracks = #(sanitized.musicTracks or {}),
        staff = #(sanitized.staff or {}),
        language = sanitized.language,
    })

    TriggerClientEvent('forge-loadscreen:client:setRuntimeConfig', -1, sanitized)
    return true, sanitized
end

local activeDownloads = {}
local downloadStates = {}

local function publishDownloadProgress(source, data)
    downloadStates[source] = data
    TriggerClientEvent('forge-loadscreen:client:downloadProgress', source, data)
end

local function fileExists(path)
    local f = io.open(path, 'r')
    if f then
        f:close()
        return true
    end
    return false
end

local function copyFile(src, dest)
    local infile = io.open(src, 'rb')
    if not infile then return false end
    local outfile = io.open(dest, 'wb')
    if not outfile then
        infile:close()
        return false
    end
    local chunk = infile:read(4096)
    while chunk do
        outfile:write(chunk)
        chunk = infile:read(4096)
    end
    infile:close()
    outfile:close()
    return true
end

local function getDownloadPaths(kind, videoId)
    local resourcePath = GetResourcePath(RESOURCE)
    local folder = kind == 'video' and 'videos' or 'music'
    local ext = kind == 'video' and 'mp4' or 'webm'
    local filename = string.format('%s_%s.%s', kind, videoId, ext)

    local distFolder = string.format('%s/ui/dist/%s', resourcePath, folder)
    local publicFolder = string.format('%s/ui/public/%s', resourcePath, folder)

    local distPath = string.format('%s/%s', distFolder, filename)
    local publicPath = string.format('%s/%s', publicFolder, filename)
    local configPath = string.format('./%s/%s', folder, filename)

    return {
        dist = distPath:gsub('/', '\\'),
        public = publicPath:gsub('/', '\\'),
        config = configPath,
        filename = filename
    }
end

local function runDownload(source, url, kind, videoId)
    local paths = getDownloadPaths(kind, videoId)

    if fileExists(paths.dist) and fileExists(paths.public) then
        publishDownloadProgress(source, {
            id = videoId,
            kind = kind,
            progress = 100.0,
            speed = 'Concluido',
            eta = '00:00',
            status = 'completed',
            path = paths.config
        })
        return true
    end

    local rp = GetResourcePath(RESOURCE):gsub('/', '\\')
    local ytdlpPath = rp .. '\\tools\\yt-dlp.exe'
    local toolsDir  = rp .. '\\tools'
    local format    = kind == 'video' and '18' or 'bestaudio[ext=webm]/bestaudio'

    if not fileExists(ytdlpPath) then
        publishDownloadProgress(source, {
            id = videoId, kind = kind, progress = 0, status = 'failed',
            error = 'yt-dlp.exe nao encontrado em tools\\'
        })
        return false
    end

    -- Ensure output directories exist
    os.execute(string.format('mkdir "%s\\ui\\dist\\%s" 2>nul',   rp, kind == 'video' and 'videos' or 'music'))
    os.execute(string.format('mkdir "%s\\ui\\public\\%s" 2>nul', rp, kind == 'video' and 'videos' or 'music'))
    os.execute(string.format('mkdir "%s" 2>nul', toolsDir))

    local safeId   = videoId:gsub('[^%w_%-]', '_')
    local logPath  = toolsDir .. '\\dl_' .. safeId .. '.log'
    local donePath = toolsDir .. '\\dl_' .. safeId .. '.done'
    local exitPath = toolsDir .. '\\dl_' .. safeId .. '.exit'
    local batPath  = toolsDir .. '\\dl_' .. safeId .. '.bat'

    -- Cleanup stale temp files
    os.remove(logPath)
    os.remove(donePath)
    os.remove(exitPath)
    os.remove(batPath)

    -- Write a batch file: set PATH, run yt-dlp, redirect output, write sentinel
    local batLines = table.concat({
        '@echo off',
        'set "PATH=C:\\Users\\Spacer dev\\.deno\\bin;%PATH%"',
        string.format('"%s" --newline --no-colors --no-playlist --format "%s" --output "%s" "%s" > "%s" 2>&1',
            ytdlpPath, format, paths.dist, url, logPath),
        string.format('echo %%ERRORLEVEL%% > "%s"', exitPath),
        string.format('echo 1 > "%s"', donePath),
    }, '\r\n') .. '\r\n'

    local bf = io.open(batPath, 'w')
    if not bf then
        publishDownloadProgress(source, {
            id = videoId, kind = kind, progress = 0, status = 'failed',
            error = 'Nao foi possivel criar arquivo de download temporario'
        })
        return false
    end
    bf:write(batLines)
    bf:close()

    publishDownloadProgress(source, {
        id = videoId, kind = kind, progress = 0.1,
        speed = 'Iniciando...', eta = '--:--', status = 'downloading'
    })

    -- Launch batch in the background.
    -- Keep the quoting simple; nested cmd /c quoting can fail before yt-dlp starts.
    os.execute(string.format('start "" /B "%s"', batPath))
    print('[forge-loadscreen] Download iniciado em background: ' .. videoId)

    activeDownloads[source] = { cancel = false }

    -- Poll the log file for progress; Wait(N) yields the coroutine between polls
    CreateThread(function()
        local maxSec  = 600 -- 10-minute hard timeout
        local elapsed = 0
        local lastPct = -1

        Wait(2000) -- give yt-dlp time to start
        elapsed = elapsed + 2

        while elapsed < maxSec do
            -- Honour cancellation request
            if activeDownloads[source] and activeDownloads[source].cancel then
                os.remove(logPath)
                os.remove(donePath)
                os.remove(exitPath)
                os.remove(batPath)
                os.remove(paths.dist)
                publishDownloadProgress(source, {
                    id = videoId, kind = kind, progress = 0, status = 'failed', error = 'Download cancelado'
                })
                activeDownloads[source] = nil
                return
            end

            -- Read progress from log
            local lf = io.open(logPath, 'r')
            if lf then
                local content = lf:read('*all')
                lf:close()

                local bestPct, bestSpeed, bestEta
                for line in content:gmatch('[^\r\n]+') do
                    local pct = line:match('%[download%]%s+(%d+%.?%d*)%%')
                    if pct then
                        bestPct   = tonumber(pct)
                        bestSpeed = line:match('at%s+(%S+)')
                        bestEta   = line:match('ETA%s+(%S+)')
                    end
                end

                if bestPct and math.floor(bestPct) ~= lastPct then
                    lastPct = math.floor(bestPct)
                    publishDownloadProgress(source, {
                        id = videoId, kind = kind,
                        progress = bestPct,
                        speed    = bestSpeed or '...',
                        eta      = bestEta   or '...',
                        status   = 'downloading'
                    })
                end
            end

            -- Check done sentinel
            local df = io.open(donePath, 'r')
            if df then
                df:close()
                os.remove(donePath)
                os.remove(batPath)

                local exitCode = '1'
                local ef = io.open(exitPath, 'r')
                if ef then
                    exitCode = (ef:read('*l') or '1'):gsub('%s+', '')
                    ef:close()
                end
                os.remove(exitPath)

                if exitCode == '0' and fileExists(paths.dist) then
                    copyFile(paths.dist, paths.public)
                    os.remove(logPath)
                    publishDownloadProgress(source, {
                        id = videoId, kind = kind, progress = 100.0,
                        speed = 'Concluido', eta = '00:00', status = 'completed', path = paths.config
                    })
                else
                    local detail = 'Download falhou - verifique se a URL e valida.'
                    local lf = io.open(logPath, 'r')
                    if lf then
                        local content = lf:read('*all') or ''
                        lf:close()
                        os.remove(logPath)
                        local lastLine
                        for line in content:gmatch('[^\r\n]+') do
                            if line ~= '' then lastLine = line end
                        end
                        if lastLine and #lastLine > 0 then
                            detail = lastLine:sub(1, 180)
                        end
                    end
                    publishDownloadProgress(source, {
                        id = videoId, kind = kind, progress = 0, status = 'failed',
                        error = detail
                    })
                end

                activeDownloads[source] = nil
                return
            end

            Wait(2000)
            elapsed = elapsed + 2

            if elapsed >= 12 and lastPct < 0 and not fileExists(logPath) and not fileExists(donePath) then
                os.remove(batPath)
                os.remove(exitPath)
                publishDownloadProgress(source, {
                    id = videoId, kind = kind, progress = 0, status = 'failed',
                    error = 'O processo de download nao iniciou. Verifique permissoes do servidor para executar .bat/.exe.'
                })
                activeDownloads[source] = nil
                return
            end
        end

        -- Timeout
        os.remove(batPath); os.remove(logPath); os.remove(donePath); os.remove(exitPath)
        publishDownloadProgress(source, {
            id = videoId, kind = kind, progress = 0, status = 'failed', error = 'Download expirou (limite 10 min)'
        })
        activeDownloads[source] = nil
    end)

    return true
end

CreateThread(function()
    while not pr_lib or not pr_lib.callback or not pr_lib.callback.register do
        Wait(250)
    end

    pr_lib.callback.register('forge-loadscreen:server:plugin:getConfig', function(source)
        if not canManage(source) then return false, 'no_permission' end
        local config, err = readConfig()
        if not config then return false, err end
        return true, config
    end)

    pr_lib.callback.register('forge-loadscreen:server:plugin:saveConfig', function(source, payload)
        if not canManage(source) then return false, 'no_permission' end

        local now = os.time()
        if writeCooldown[source] and now - writeCooldown[source] < 2 then
            return false, 'rate_limited'
        end
        writeCooldown[source] = now

        return saveConfig(source, payload)
    end)

    pr_lib.callback.register('forge-loadscreen:server:plugin:canPreview', function(source)
        return canManage(source)
    end)

    pr_lib.callback.register('forge-loadscreen:server:management:load', function(source)
        if not canManage(source) then return false, 'no_permission' end
        local config, err = readConfig()
        if not config then return false, err end
        return true, config
    end)

    pr_lib.callback.register('forge-loadscreen:server:management:action', function(source, module, action, payload)
        if not canManage(source) then return false, 'no_permission' end
        if action ~= 'save' then return false, 'invalid_action' end

        local now = os.time()
        if writeCooldown[source] and now - writeCooldown[source] < 2 then
            return false, 'rate_limited'
        end
        writeCooldown[source] = now

        return saveConfig(source, payload)
    end)

end)

local function managementLocaleToLoadscreen(locale)
    locale = tostring(locale or 'pt-br'):lower()
    if locale == 'pt' or locale == 'pt-br' or locale == 'pt_br' or locale == 'pt-brasil' then return 'pt-BR' end
    if locale == 'en' or locale == 'en-us' or locale == 'en_us' then return 'en-US' end
    if locale == 'es' or locale == 'es-es' or locale == 'es_es' then return 'es-ES' end
    return 'pt-BR'
end
local function loadscreenLocaleText(language)
    if language == 'en-US' then
        return {
            tipLabel = 'TIP', rulesLabel = 'Rules', changelogsLabel = 'Changelogs', keybindsLabel = 'Keys', staffLabel = 'Staff', serverTeamLabel = 'Server team', backLabel = 'Back', preparingEntry = 'Preparing entry', entryReady = 'Entry ready', loadingComplete = 'Loading complete', almostThere = 'Almost there...', loadingResources = 'Loading server resources...', initializing = 'Initializing server...', initializingServer = 'Initializing server', synchronizing = 'Synchronizing session...', detectingResources = 'detecting resources', resources = 'resources', remaining = 'remaining', noKeybind = 'No key assigned', hideUiLabel = 'Hide UI', showUiLabel = 'Show UI'
        }
    elseif language == 'es-ES' then
        return {
            tipLabel = 'CONSEJO', rulesLabel = 'Reglas', changelogsLabel = 'Novedades', keybindsLabel = 'Teclas', staffLabel = 'Equipo', serverTeamLabel = 'Equipo del servidor', backLabel = 'Volver', preparingEntry = 'Preparando entrada', entryReady = 'Entrada liberada', loadingComplete = 'Carga completada', almostThere = 'Casi listo...', loadingResources = 'Cargando recursos del servidor...', initializing = 'Inicializando servidor...', initializingServer = 'Inicializando servidor', synchronizing = 'Sincronizando sesion...', detectingResources = 'detectando recursos', resources = 'recursos', remaining = 'restantes', noKeybind = 'Ninguna tecla asignada', hideUiLabel = 'Ocultar UI', showUiLabel = 'Mostrar UI'
        }
    end

    return {
        tipLabel = 'DICA', rulesLabel = 'Regras', changelogsLabel = 'Novidades', keybindsLabel = 'Teclas', staffLabel = 'Equipe', serverTeamLabel = 'Equipe do servidor', backLabel = 'Voltar', preparingEntry = 'Preparando entrada', entryReady = 'Entrada liberada', loadingComplete = 'Carregamento concluido', almostThere = 'Quase la...', loadingResources = 'Carregando recursos do servidor...', initializing = 'Inicializando servidor...', initializingServer = 'Inicializando servidor', synchronizing = 'Sincronizando sessao...', detectingResources = 'detectando recursos', resources = 'recursos', remaining = 'restantes', noKeybind = 'Nenhuma tecla atribuida', hideUiLabel = 'Esconder UI', showUiLabel = 'Mostrar UI'
    }
end
local function registerforgePlugin()
    if GetResourceState('forge-management') ~= 'started' then return end

    local ok, reason = exports['forge-management']:RegisterPlugin({
        id = 'forge-loadscreen',
        label = 'Loadscreen',
        icon = 'monitor-play',
        requiredPerms = {},
        capabilities = { 'read', 'write', 'health' },
        minProtocolVersion = 2,
        category = 'visual',
        order = 20,
        description = 'Configura videos, musicas, cores, textos e staff da loadscreen.',
        version = GetResourceMetadata(GetCurrentResourceName(), 'version', 0) or '1.0.0',
        native = {
            module = 'config',
            load = 'forge-loadscreen:server:management:load',
            action = 'forge-loadscreen:server:management:action',
            actions = {
                save = 'Salvar configuracao',
            },
            fields = {
                { path = 'communityName', type = 'text', label = 'Texto superior', action = 'save' },
                { path = 'serverName', type = 'text', label = 'Logo principal / titulo', action = 'save' },
                { path = 'logoUrl', type = 'text', label = 'Link da Logo (URL)', action = 'save' },
                { path = 'slogan', type = 'text', label = 'Slogan', action = 'save' },
                { path = 'tagline', type = 'text', label = 'Tagline', action = 'save' },
                { path = 'minimumLoadscreenSeconds', type = 'number', label = 'Tempo minimo em segundos', min = 0, max = 900, step = 1, action = 'save' },
                { path = 'BrandingEnabled', type = 'boolean', label = 'Branding ativo', action = 'save' },
                { path = 'VideoEnabled', type = 'boolean', label = 'Video ativo', action = 'save' },
                { path = 'MusicEnabled', type = 'boolean', label = 'Musica ativa', action = 'save' },
                { path = 'TipEnabled', type = 'boolean', label = 'Dica ativa', action = 'save' },
                { path = 'RulesEnabled', type = 'boolean', label = 'Regras ativas', action = 'save' },
                { path = 'ChangelogsEnabled', type = 'boolean', label = 'Novidades ativas', action = 'save' },
                { path = 'KeybindsEnabled', type = 'boolean', label = 'Teclas ativas', action = 'save' },
                { path = 'StaffEnabled', type = 'boolean', label = 'Staff ativo', action = 'save' },
                { path = 'SocialEnabled', type = 'boolean', label = 'Redes sociais ativas', action = 'save' },
                { path = 'musicVolume', type = 'number', label = 'Volume da musica', min = 0, max = 1, step = 0.05, action = 'save' },
                { path = 'musicAutoplay', type = 'boolean', label = 'Musica autoplay', action = 'save' },
                { path = 'musicShuffle', type = 'boolean', label = 'Musica aleatoria', action = 'save' },
                { path = 'staffCarouselEnabled', type = 'boolean', label = 'Carrossel de staff', action = 'save' },
                { path = 'staffCarouselSeconds', type = 'number', label = 'Tempo do carrossel staff', min = 3, max = 60, step = 1, action = 'save' },
                { path = 'tip', type = 'textarea', label = 'Dica principal', action = 'save' },
                { path = 'colors', type = 'json', label = 'Cores', description = 'Objeto JSON com as cores da loadscreen.', action = 'save' },
                { path = 'backgroundMedia', type = 'json', label = 'Videos de fundo', description = 'Objeto JSON com playlist, modo e itens de video.', action = 'save' },
                { path = 'musicTracks', type = 'json', label = 'Musicas', description = 'Lista JSON de musicas.', action = 'save' },
                { path = 'staff', type = 'json', label = 'Equipe', description = 'Lista JSON de membros da equipe.', action = 'save' },
                { path = 'featureCards', type = 'json', label = 'Cards de destaque', description = 'Lista JSON com os tres cards do topo.', action = 'save' },
                { path = 'rules', type = 'json', label = 'Regras', description = 'Lista JSON de regras.', action = 'save' },
                { path = 'changelogs', type = 'json', label = 'Novidades', description = 'Lista JSON de changelogs.', action = 'save' },
                { path = 'keybinds', type = 'json', label = 'Teclas', description = 'Lista JSON de atalhos.', action = 'save' },
                { path = 'social', type = 'json', label = 'Redes sociais', description = 'Objeto JSON com links sociais.', action = 'save' },
                { path = 'links', type = 'json', label = 'Links rapidos', description = 'Objeto JSON com links de regras, novidades e teclas.', action = 'save' },
                { path = 'uiText', type = 'json', label = 'Textos da interface', description = 'Objeto JSON com labels exibidas na loadscreen.', action = 'save' },
            },
        },
    })

    if not ok then
        print(('[forge-loadscreen] Plugin do forge Management rejeitado: %s'):format(reason or 'desconhecido'))
    elseif reason ~= 'unchanged' then
        print('[forge-loadscreen] Plugin registrado no forge Management')
    end
end

AddEventHandler('forge-management:server:pluginsReady', registerforgePlugin)

AddEventHandler('onResourceStart', function(resourceName)
    if resourceName == 'forge-management' or resourceName == RESOURCE then
        SetTimeout(500, registerforgePlugin)
    end
end)

AddEventHandler('onResourceStop', function(resourceName)
    if resourceName == RESOURCE and GetResourceState('forge-management') == 'started' then
        pcall(function()
            exports['forge-management']:UnregisterPlugin('forge-loadscreen')
        end)
    end
end)


AddEventHandler('forge-management:server:localeUpdated', function(locale)
    local config = readConfig()
    if type(config) ~= 'table' then return end
    config.language = managementLocaleToLoadscreen(locale)
    config.uiText = loadscreenLocaleText(config.language)
    saveConfig(0, config)
end)
AddEventHandler('forge-management:server:themeUpdated', function(theme)
    if type(theme) ~= 'table' or not theme.accentColor then return end
    local config, err = readConfig()
    if not config then return end
    
    config.colors = config.colors or {}
    config.colors.accent = theme.accentColor
    config.colors.border = theme.accentColor
    
    local r = tonumber(theme.accentColor:sub(2,3), 16) or 255
    local g = tonumber(theme.accentColor:sub(4,5), 16) or 122
    local b = tonumber(theme.accentColor:sub(6,7), 16) or 26
    
    config.colors.accentHover = ('rgba(%d, %d, %d, 0.15)'):format(r, g, b)
    config.colors.accentDim = ('rgba(%d, %d, %d, 0.65)'):format(r, g, b)
    config.colors.bgCard = ('rgba(%d, %d, %d, 0.40)'):format(r, g, b)

    saveConfig(0, config)
end)


