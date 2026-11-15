-- Native PRLib context editor. Drafts never change the live configuration until save.
local Admin = {}
ForgeLoadscreenAdmin = Admin
local draft, dirty, busy, previewing = nil, false, false, false
local rootContext
local rootId = 'forge_loadscreen:admin'
local parentMenu, parentResource
local openRoot, openList, openFields, openPalette, openGradient, openKeys
local function menus() return pr_lib.menu or pr_lib.menus end
local function copy(value)
    if type(value) ~= 'table' then return value end
    local result = {}; for key, item in pairs(value) do result[key] = copy(item) end
    return result
end
local function get(path)
    local value = draft
    for _, key in ipairs(path) do
        if type(value) ~= 'table' then return nil end
        value = value[key]
    end
    return value
end
local function put(path, value)
    local target = draft
    for index = 1, #path - 1 do
        local key = path[index]; if type(target[key]) ~= 'table' then target[key] = {} end
        target = target[key]
    end
    target[path[#path]] = value; dirty = true
end
local function notify(message, kind)
    pr_lib.notifications.Notify({ title = 'Forge Loadscreen', description = message, type = kind or 'inform' })
end
local function ask(title, rows) return menus().InputDialog(title, rows) end
local function confirm(text)
    return menus().AlertDialog({ header = 'Confirmar alteração', content = text, cancel = true }) == 'confirm'
end
local function option(title, description, fn, icon)
    return { title = title, description = description, icon = icon or 'sliders', onSelect = fn }
end
local function show(id, title, parent, options)
    local context={ id = id, title = title .. (dirty and ' • rascunho' or ''), menu = parent, options = options }
    if id == rootId then context.menuResource = parentResource end
    if id==rootId then rootContext=context
    elseif rootContext then
        rootContext.title='Forge Loadscreen'..(dirty and ' • rascunho' or '')
        rootContext.options[1].title=dirty and 'Alterações não salvas' or 'Configuração carregada'
        menus().RegisterContext(rootContext)
    end
    menus().RegisterContext(context)
    menus().ShowContext(id)
end
local function choices(values)
    local options = {}
    for _, value in ipairs(values) do options[#options + 1] = { value = value[1], label = value[2] } end
    return options
end
local modes = choices({ { 'single', 'Apenas o primeiro item' }, { 'playlist', 'Lista de reprodução' } })
local mediaTypes = choices({ { 'auto', 'Detectar automaticamente' }, { 'video', 'Arquivo de vídeo' }, { 'youtube', 'YouTube' } })
local musicTypes = choices({ { 'auto', 'Detectar automaticamente' }, { 'audio', 'Arquivo de áudio' }, { 'youtube', 'YouTube' } })
local audioModes = choices({ { 'video', 'Som do próprio vídeo' }, { 'separate', 'Playlist de músicas separada' }, { 'none', 'Sem som' } })
local function field(label, path, kind, default, min, max, options)
    return { label = label, path = path, type = kind or 'input', default = default, min = min, max = max, options = options }
end

local identity = {
    field('Nome do servidor', {'serverName'}), field('Nome da comunidade', {'communityName'}),
    field('Slogan', {'slogan'}, 'textarea'), field('Chamada de carregamento', {'tagline'}),
    field('Dica', {'tip'}, 'textarea'), field('Logotipo: URL ou caminho', {'logoUrl'}),
    field('Marca curta (sem logotipo)', {'brand','mark'}), field('Título da marca', {'brand','title'}),
    field('Subtítulo da marca', {'brand','subtitle'}), field('Créditos do rodapé', {'footer','text'}, 'textarea'),
    field('Idioma', {'language'}, 'select', 'pt-BR', nil, nil,
        choices({{'pt-BR','Português'},{'en-US','Inglês'},{'es-ES','Espanhol'}})),
}
local textLabels = {
    {'tipLabel','Título da dica'}, {'rulesLabel','Botão Regras'}, {'changelogsLabel','Botão Novidades'},
    {'keybindsLabel','Botão Teclas'}, {'staffLabel','Botão Equipe'}, {'serverTeamLabel','Título da equipe'},
    {'backLabel','Botão Voltar'}, {'hideUiLabel','Botão Esconder interface'}, {'showUiLabel','Botão Mostrar interface'},
    {'preparingEntry','Preparando entrada'}, {'entryReady','Entrada liberada'}, {'loadingComplete','Carregamento concluído'},
    {'almostThere','Quase pronto'}, {'loadingResources','Carregando recursos'}, {'initializing','Inicialização'},
    {'initializingServer','Inicializando servidor'}, {'synchronizing','Sincronização'}, {'detectingResources','Detectando recursos'},
    {'resources','Contador: recursos'}, {'remaining','Contador: restantes'}, {'noKeybind','Tecla sem comando'},
}
local texts = {}; for _, entry in ipairs(textLabels) do texts[#texts+1] = field(entry[2], {'uiText',entry[1]}) end
local sections = {}
for _, entry in ipairs({{'Branding','Marca e logotipo'},{'Video','Vídeo / fundo'},{'Music','Músicas separadas'},
    {'Tip','Dica'},{'Rules','Regras'},{'Changelogs','Novidades'},{'Keybinds','Teclas e comandos'},
    {'Staff','Equipe'},{'Social','Redes sociais'}}) do
    sections[#sections+1] = field(entry[2], {entry[1]..'Enabled'}, 'checkbox', entry[1] ~= 'Tip')
end
local socials, links = {}, {}
for _, entry in ipairs({{'instagram','Instagram'},{'tiktok','TikTok'},{'x','X / Twitter'},{'tebex','Loja Tebex'},
    {'discord','Discord'},{'youtube','YouTube'},{'site','Site'}}) do socials[#socials+1] = field(entry[2], {'social',entry[1]}) end
for _, entry in ipairs({{'rules','Link externo de Regras'},{'changelogs','Link externo de Novidades'},{'keybinds','Link externo de Teclas'}}) do
    links[#links+1] = field(entry[2]..' (# abre o painel interno)', {'links',entry[1]}, 'input', '#')
end
local videoFields = {
    field('Vídeo ativado', {'VideoEnabled'}, 'checkbox', true),
    field('Modo de reprodução', {'backgroundMedia','mode'}, 'select', 'playlist', nil, nil, modes),
    field('Fonte de áudio', {'backgroundMedia','audio'}, 'select', 'separate', nil, nil, audioModes),
    field('Silenciar todos os vídeos', {'videoMuted'}, 'checkbox', false),
    field('Ordem aleatória', {'backgroundMedia','shuffle'}, 'checkbox', false),
    field('Intervalo padrão entre vídeos (s)', {'backgroundMedia','rotateSeconds'}, 'slider', 42, 8, 600),
}
local musicFields = {
    field('Músicas ativadas', {'MusicEnabled'}, 'checkbox', true),
    field('Tocar automaticamente', {'musicAutoplay'}, 'checkbox', true),
    field('Mostrar capa', {'musicShowCover'}, 'checkbox', true),
    field('Ordem aleatória', {'musicShuffle'}, 'checkbox', false),
    field('Modo de reprodução', {'musicSourceMode'}, 'select', 'playlist', nil, nil, modes),
    field('Volume (%)', {'musicVolume'}, 'slider', 0.6, 0, 100),
}
local staffFields = {
    field('Alternar membros automaticamente', {'staffCarouselEnabled'}, 'checkbox', true),
    field('Intervalo da equipe (s)', {'staffCarouselSeconds'}, 'slider', 6, 3, 60),
}
local palettes = {
    {'bgDark','Fundo principal'}, {'bgPanel','Fundo dos painéis'}, {'bgCard','Fundo dos cartões'},
    {'border','Bordas'}, {'accent','Destaque'}, {'accentDim','Destaque suave'}, {'accentHover','Destaque ao passar o mouse'},
    {'text','Texto principal'}, {'textMuted','Texto secundário'}, {'success','Sucesso'}, {'error','Erro'},
}

local function syncMedia()
    local media = draft.backgroundMedia or {}; draft.backgroundMedia = media
    media.enabled = draft.VideoEnabled ~= false
    draft.backgroundAudio, draft.backgroundMode = media.audio or 'separate', media.mode or 'playlist'
    local first = media.items and media.items[1]
    draft.videoSource, draft.videoType = first and first.src or '', first and first.type or 'auto'
    -- Remove stale normalized aliases supplied by older editors.
    for _, entry in ipairs(sections) do draft[entry.path[1]:gsub('^%u', string.lower)] = nil end
end
local function inputRow(spec, value)
    if value == nil then value = spec.default end
    local row = { type = spec.type, label = spec.label, default = value,
        min = spec.min, max = spec.max, step = spec.type == 'slider' and 1 or nil,
        options = spec.options, searchable = spec.type == 'select', maxLength = 2048 }
    if spec.type == 'checkbox' then row.checked = value == true end
    if spec.path[1] == 'musicVolume' then row.default = math.floor((tonumber(value) or 0.6) * 100 + 0.5) end
    return row
end
openFields = function(id, title, specs, parent)
    local options = {}
    if id=='forge_loadscreen:video' then
        options[#options+1]=option('Lista de vídeos','Adicionar, editar, ordenar e remover cada vídeo',function() openList('videos',nil,id) end,'film')
    elseif id=='forge_loadscreen:music' then
        options[#options+1]=option('Lista de músicas','Adicionar, editar, ordenar e remover cada faixa',function() openList('tracks',nil,id) end,'list')
    elseif id=='forge_loadscreen:staff_options' then
        options[#options+1]=option('Pessoas da equipe','Adicionar, editar, ordenar e remover membros',function() openList('staff',nil,id) end,'users')
    elseif id=='forge_loadscreen:identity' then
        options[#options+1]=option('Textos dos botões e do carregamento','Editar cada frase em seu próprio campo',function() openFields('forge_loadscreen:texts','Textos da interface',texts,id) end,'language')
    elseif id=='forge_loadscreen:social' then
        options[#options+1]=option('Links dos painéis','Usar # para abrir os painéis internos',function() openFields('forge_loadscreen:links','Links dos painéis',links,id) end,'link')
    end
    for _, spec in ipairs(specs) do
        local value = get(spec.path); if value == nil then value = spec.default end
        local display = type(value) == 'boolean' and (value and 'Ativado' or 'Desativado') or tostring(value or 'Não definido')
        options[#options+1] = option(spec.label, display, function()
            local result = ask(spec.label, { inputRow(spec, get(spec.path)) })
            if result and result[1] ~= nil then
                local nextValue = result[1]
                if spec.type == 'slider' then nextValue = math.max(spec.min, math.min(spec.max, tonumber(nextValue) or spec.default)) end
                if spec.path[1] == 'musicVolume' then nextValue = nextValue / 100 end
                if spec.path[2] == 'rotateSeconds' then
                    local previous = get(spec.path) or spec.default
                    for _, item in ipairs(get({'backgroundMedia','items'}) or {}) do
                        if not item.duration or item.duration == previous then item.duration = nextValue end
                    end
                end
                put(spec.path, nextValue); syncMedia()
            end
            openFields(id, title, specs, parent)
        end)
    end
    show(id, title, parent or rootId, options)
end

local function splitColor(value)
    value = tostring(value or '#ffffff')
    if value:match('^#%x%x%x%x%x%x$') then return value, 100 end
    if value:match('^#%x%x%x$') then
        local r,g,b = value:sub(2,2),value:sub(3,3),value:sub(4,4); return '#'..r..r..g..g..b..b,100
    end
    local r,g,b,a = value:match('rgba?%(%s*(%d+)%s*,%s*(%d+)%s*,%s*(%d+)%s*,?%s*([%d%.]*)%s*%)')
    if r then return ('#%02x%02x%02x'):format(tonumber(r),tonumber(g),tonumber(b)), math.floor((tonumber(a) or 1)*100+0.5) end
    return '#ffffff',100
end
local function rgba(hex, opacity)
    if opacity >= 100 then return hex end
    return ('rgba(%d, %d, %d, %.2f)'):format(tonumber(hex:sub(2,3),16),tonumber(hex:sub(4,5),16),tonumber(hex:sub(6,7),16),opacity/100)
end
local function colorDialog(label, value, position)
    local hex, opacity = splitColor(value)
    local rows = {{type='color',label='Cor',default=hex,format='hex',required=true},
        {type='slider',label='Opacidade (%)',default=opacity,min=0,max=100,step=1}}
    if position then rows[#rows+1]={type='slider',label='Posição no degradê (%)',default=position,min=0,max=100,step=1} end
    local result = ask(label, rows)
    if not result then return end
    if type(result[1])~='string' or not result[1]:match('^#%x%x%x%x%x%x$') then notify('Escolha uma cor na paleta.','error');return end
    return rgba(result[1], tonumber(result[2]) or opacity), tonumber(result[3]) or position
end
local function gradientParts(value)
    local angle = tonumber(tostring(value):match('linear%-gradient%(%s*([%d%.]+)deg')) or 135
    local body = tostring(value):match('linear%-gradient%((.*)%)') or ''
    local chunks, start, depth = {},1,0
    for index=1,#body do
        local char=body:sub(index,index)
        if char=='(' then depth=depth+1 elseif char==')' then depth=depth-1
        elseif char==',' and depth==0 then chunks[#chunks+1]=body:sub(start,index-1);start=index+1 end
    end
    chunks[#chunks+1]=body:sub(start)
    local stops={}
    for _,chunk in ipairs(chunks) do
        local color,at=chunk:match('^%s*(.-)%s+([%d%.]+)%%%s*$')
        if color then stops[#stops+1]={color=color,position=tonumber(at)} end
    end
    if #stops<2 then stops={{color='#ffffff',position=0},{color='#9cf000',position=100}} end
    return angle,stops
end
local function saveGradient(angle, stops)
    table.sort(stops,function(a,b) return a.position<b.position end)
    local parts={}; for _,stop in ipairs(stops) do parts[#parts+1]=stop.color..' '..stop.position..'%' end
    put({'colors','gradientAccent'},'linear-gradient('..angle..'deg, '..table.concat(parts,', ')..')')
end
openGradient = function()
    local angle,stops=gradientParts(get({'colors','gradientAccent'}))
    local id='forge_loadscreen:gradient'
    local options={option('Direção do degradê',angle..'°',function()
        local result=ask('Direção',{{type='slider',label='Ângulo (graus)',default=angle,min=0,max=360,step=1}})
        if result then saveGradient(result[1],stops) end;openGradient()
    end)}
    for index,stop in ipairs(stops) do
        options[#options+1]=option('Cor '..index,stop.color..' • '..stop.position..'%',function()
            local actions={option('Editar cor e posição','Paleta e controles deslizantes',function()
                local color,at=colorDialog('Cor '..index,stop.color,stop.position)
                if color then stop.color,stop.position=color,at;saveGradient(angle,stops) end;openGradient()
            end,'palette')}
            actions[#actions+1]={title='Remover cor',icon='trash',disabled=#stops<=2,onSelect=function()
                if confirm('Remover esta cor do degradê?') then table.remove(stops,index);saveGradient(angle,stops) end;openGradient()
            end}
            show(id..':stop','Cor '..index,id,actions)
        end,'palette')
    end
    options[#options+1]={title='Adicionar cor',icon='plus',disabled=#stops>=8,onSelect=function()
        local color,at=colorDialog('Nova cor','#ffffff',50)
        if color then stops[#stops+1]={color=color,position=at};saveGradient(angle,stops) end;openGradient()
    end}
    show(id,'Degradê de destaque','forge_loadscreen:palette',options)
end
openPalette = function()
    local options={}
    for _,entry in ipairs(palettes) do options[#options+1]=option(entry[2],tostring(get({'colors',entry[1]}) or ''),function()
        local color=colorDialog(entry[2],get({'colors',entry[1]}));if color then put({'colors',entry[1]},color) end;openPalette()
    end,'palette') end
    options[#options+1]=option('Degradê de destaque','Cada cor tem paleta, opacidade e posição',openGradient,'palette')
    show('forge_loadscreen:palette','Paleta de cores',rootId,options)
end

local keyNames={ 'Escape','`','Tab','CapsLock','ShiftLeft','ShiftRight','CtrlLeft','CtrlRight','Win','AltLeft','AltRight',
    'Space','Enter','Backspace','Insert','Home','PageUp','Delete','End','PageDown','Up','Down','Left','Right',
    '-','=','[',']','\\',';','\'',',','.','/','NumLock','NumpadDivide','NumpadMultiply','NumpadSubtract','NumpadAdd','NumpadEnter','NumpadDecimal' }
for index=0,9 do keyNames[#keyNames+1]=tostring(index);keyNames[#keyNames+1]='Numpad'..index end
for index=1,12 do keyNames[#keyNames+1]='F'..index end
for index=65,90 do keyNames[#keyNames+1]=string.char(index) end
table.sort(keyNames)
local keyOptions={};for _,name in ipairs(keyNames) do keyOptions[#keyOptions+1]={value=name,label=name} end

local lists={
    videos={title='Vídeos',path={'backgroundMedia','items'},limit=12, fields={
        {key='title',label='Título'}, {key='src',label='Arquivo / URL',required=true},
        {key='type',label='Tipo',type='select',default='auto',options=mediaTypes},
        {key='duration',label='Duração antes da troca (s)',type='slider',default=42,min=8,max=600},
        {key='muted',label='Silenciar este vídeo',type='checkbox',default=false}}},
    tracks={title='Músicas',path={'musicTracks'},limit=20,fields={
        {key='name',label='Nome',required=true},{key='artist',label='Artista'},{key='album',label='Álbum'},
        {key='src',label='Arquivo / URL',required=true},{key='cover',label='Capa: arquivo / URL'},
        {key='type',label='Tipo',type='select',default='auto',options=musicTypes}}},
    staff={title='Equipe',path={'staff'},limit=24,fields={
        {key='name',label='Nome',required=true},{key='role',label='Cargo'},{key='photo',label='Foto: arquivo / URL'}}},
    rules={title='Regras',path={'rules'},limit=80,string=true,length=220},
    changelogs={title='Novidades / versões',path={'changelogs'},limit=30,fields={
        {key='version',label='Versão',required=true},{key='date',label='Data'}},nested=true},
    features={title='Cartões informativos',path={'featureCards'},limit=3,fields={
        {key='title',label='Título',required=true},{key='description',label='Descrição',type='textarea'},
        {key='icon',label='Ícone',type='select',default='people',options=choices({{'people','Pessoas'},{'shield','Escudo'},
            {'star','Estrela'},{'info','Informação'},{'lightning','Raio'},{'document','Documento'},{'keyboard','Teclado'}})}}},
    keybinds={title='Teclas e comandos',path={'keybinds'},limit=60,fields={
        {key='key',label='Tecla',type='select',options=keyOptions,required=true},
        {key='action',label='Nome da ação',required=true},{key='description',label='Descrição',type='textarea'},
        {key='enabled',label='Destacar no teclado visual',type='checkbox',default=true}}},
}
local function items(spec)
    local value=get(spec.path)
    if type(value)~='table' then local previous=dirty;put(spec.path,{});dirty=previous;value=get(spec.path) end
    return value
end
local function itemTitle(value,index)
    if type(value)~='table' then return tostring(value) end
    return value.title or value.name or value.version or value.key or ('Item '..index)
end
local function editItem(spec,index)
    local values=items(spec);local original=index and values[index];local item=type(original)=='table' and copy(original) or {}
    local rows={}
    if spec.string then rows={{type='textarea',label='Texto',default=original or '',required=true,maxLength=spec.length or 180}}
    else for _,entry in ipairs(spec.fields) do
        local value=item[entry.key];if value==nil then value=entry.default end
        if entry.key=='enabled' then local state=draft.keys and draft.keys[item.key];value=not state or state.enabled~=false end
        rows[#rows+1]={type=entry.type or 'input',label=entry.label,default=value,checked=value==true,
            min=entry.min,max=entry.max,step=entry.type=='slider' and 1 or nil,options=entry.options,
            searchable=entry.type=='select',required=entry.required,maxLength=2048}
    end end
    local result=ask(index and 'Editar '..itemTitle(original,index) or 'Adicionar em '..spec.title,rows)
    if not result then return end
    if spec.string then item=result[1] else for number,entry in ipairs(spec.fields) do item[entry.key]=result[number] end end
    if spec==lists.keybinds then
        for number,bind in ipairs(values) do if number~=index and bind.key==item.key then notify('Essa tecla já está cadastrada.','error');return end end
        draft.keys=draft.keys or {}
        if original and original.key~=item.key then draft.keys[original.key]=nil end
        draft.keys[item.key]={enabled=item.enabled==true,info=item.description~='' and item.description or item.action}
        item.enabled=nil
    end
    if spec.nested and not item.items then item.items={} end
    if index then values[index]=item else values[#values+1]=item end
    dirty=true;syncMedia()
end
openList = function(name, spec, parent)
    spec=spec or lists[name];local values=items(spec);local id='forge_loadscreen:list:'..name
    local options={}
    if name=='keybinds' then options[#options+1]=option('Teclado visual','Destaques e informação ao clicar em cada tecla',openKeys,'keyboard') end
    for index,value in ipairs(values) do
        options[#options+1]=option(itemTitle(value,index),'Editar, ordenar ou remover',function()
            local actions={option('Editar','Modificar somente este item',function() editItem(spec,index);openList(name,spec,parent) end,'pen')}
            if spec==lists.videos or spec==lists.tracks then
                actions[#actions+1]={title='Usar como primeiro',description='Este será o item escolhido no modo de reprodução única.',icon='play',disabled=index==1,onSelect=function()
                    table.remove(values,index);table.insert(values,1,value);dirty=true;syncMedia();openList(name,spec,parent)
                end}
            end
            if spec.nested then actions[#actions+1]=option('Linhas de novidades','Adicionar, editar e remover cada novidade',function()
                local path=copy(spec.path);path[#path+1]=index;path[#path+1]='items'
                openList(name..':'..index,{title='Novidades: '..value.version,path=path,limit=24,string=true,length=180},id..':item')
            end,'list') end
            actions[#actions+1]={title='Mover para cima',icon='arrow-up',disabled=index==1,onSelect=function()
                values[index-1],values[index]=values[index],values[index-1];dirty=true;syncMedia();openList(name,spec,parent)
            end}
            actions[#actions+1]={title='Mover para baixo',icon='arrow-down',disabled=index==#values,onSelect=function()
                values[index+1],values[index]=values[index],values[index+1];dirty=true;syncMedia();openList(name,spec,parent)
            end}
            actions[#actions+1]=option('Remover','Exige confirmação',function()
                if confirm('Remover '..itemTitle(value,index)..'?') then
                    if spec==lists.keybinds and draft.keys then draft.keys[value.key]=nil end
                    table.remove(values,index);dirty=true;syncMedia()
                end;openList(name,spec,parent)
            end,'trash')
            show(id..':item',itemTitle(value,index),id,actions)
        end,'list')
    end
    options[#options+1]={title='Adicionar',description=('%d / %d itens'):format(#values,spec.limit),icon='plus',disabled=#values>=spec.limit,
        onSelect=function() if #values<spec.limit then editItem(spec);openList(name,spec,parent) end end}
    show(id,spec.title,parent or rootId,options)
end
openKeys = function()
    local options={};local keys={};for key in pairs(draft.keys or {}) do keys[#keys+1]=key end;table.sort(keys)
    local function edit(key)
        local old=draft.keys and draft.keys[key] or {}
        local result=ask('Teclado visual',{
            {type='select',label='Tecla',default=key,options=keyOptions,required=true,searchable=true,disabled=key~=nil},
            {type='checkbox',label='Destacar tecla',checked=old.enabled~=false},
            {type='textarea',label='Informação ao clicar',default=old.info or '',maxLength=160}})
        if result then
            draft.keys=draft.keys or {}
            if result[1]~=key and draft.keys[result[1]] then notify('A tecla já existe.','error');return end
            if key and result[1]~=key then draft.keys[key]=nil end
            draft.keys[result[1]]={enabled=result[2]==true,info=result[3] or ''};dirty=true
        end
    end
    for _,key in ipairs(keys) do
        local state=draft.keys[key]
        options[#options+1]=option(key,(state.enabled~=false and 'Ativa • ' or 'Inativa • ')..tostring(state.info or ''),function()
            show('forge_loadscreen:key',key,'forge_loadscreen:keys',{
                option('Editar','Corresponde ao destaque e à informação do teclado',function() edit(key);openKeys() end),
                option('Remover destaque','O comando cadastrado é mantido, mas a tecla fica inativa',function()
                    if confirm('Remover destaque desta tecla?') then draft.keys[key]={enabled=false,info=''};dirty=true end;openKeys()
                end,'trash')})
        end,'keyboard')
    end
    options[#options+1]=option('Adicionar destaque','Escolha uma tecla e sua informação',function() edit();openKeys() end,'plus')
    show('forge_loadscreen:keys','Teclado visual',rootId,options)
end

local function duration()
    local seconds=tonumber(draft.minimumLoadscreenSeconds) or 0
    local result=ask('Espera mínima obrigatória',{
        {type='checkbox',label='Exigir tempo mínimo antes da entrada',checked=seconds>0},
        {type='slider',label='Tempo total mínimo (segundos)',default=seconds>0 and seconds or 180,min=0,max=900,step=1,
            description='É o tempo total, não uma espera extra. 0 desativa; 180 = três minutos.'}})
    if result then put({'minimumLoadscreenSeconds'},result[1] and math.max(0,math.min(900,tonumber(result[2]) or 0)) or 0) end
    openRoot()
end
local function save()
    if busy then return end
    busy=true;syncMedia()
    local ok,success,result=pcall(pr_lib.callback.await,'forge-loadscreen:server:saveConfig',10000,copy(draft))
    busy=false
    if ok and success==true then
        draft=copy(result);dirty=false
        ForgeLoadscreenRuntime.Apply(result);ForgeLoadscreenRuntime.Publish()
        notify('Configuração salva e aplicada.','success')
    else
        local reason=ok and result or success
        local messages={no_permission='sem permissão',rate_limited='aguarde dois segundos e tente novamente',
            backup_failed='não foi possível criar a cópia de segurança',save_failed='não foi possível gravar o arquivo',
            invalid_config='configuração inválida',config_service_unavailable='serviço de configuração indisponível'}
        notify('Não foi possível salvar: '..tostring(messages[reason] or reason or 'erro desconhecido'),'error')
    end
    openRoot()
end
local function reload()
    local config,err=pr_lib.callback.await('forge-loadscreen:server:getConfig',10000)
    if type(config)~='table' then notify('Falha ao carregar: '..tostring(err),'error');return false end
    draft=copy(config)
    for key,value in pairs(draft.keys or {}) do
        if type(value)=='boolean' then draft.keys[key]={enabled=value,info=''} end
    end
    for _,key in ipairs({'loadingElapsedMs','serverResourceCount','resourceCount','resourceTotal'}) do draft[key]=nil end
    dirty=false;return true
end
openRoot = function()
    local options={
        {title=dirty and 'Alterações não salvas' or 'Configuração carregada',description='Edite o rascunho e use Salvar e aplicar. A prévia não grava o JSON.',readOnly=true,icon='circle-info'},
        option('Seções da tela','Ativar e desativar cada parte',function() openFields('forge_loadscreen:sections','Seções',sections) end,'toggle-on'),
        option('Informações, identidade e textos','Nome, marca, logotipo, idioma, dica e rodapé',function() openFields('forge_loadscreen:identity','Informações e textos',identity) end,'font'),
        option('Paleta de cores','Cores, transparência e degradê',openPalette,'palette'),
        option('Vídeo e áudio do fundo','Ativação, som, ordem, intervalo e modo',function() openFields('forge_loadscreen:video','Reprodução do fundo',videoFields) end,'video'),
        option('Configurações de música','Volume, início automático, capas e ordem',function() openFields('forge_loadscreen:music','Reprodução de músicas',musicFields) end,'music'),
        option('Tempo mínimo de carregamento',tostring(draft.minimumLoadscreenSeconds or 0)..' segundos (0 = sem espera extra)',duration,'clock'),
        option('Equipe e desenvolvedores','Pessoas, carrossel e tempo entre membros',function() openFields('forge_loadscreen:staff_options','Equipe e desenvolvedores',staffFields) end,'users'),
        option('Teclas e comandos','Uma opção para cada comando cadastrado',function() openList('keybinds') end,'keyboard'),
        option('Regras do servidor','Uma opção por regra',function() openList('rules') end,'gavel'),
        option('Novidades e versões','Versões e suas linhas de novidades',function() openList('changelogs') end,'file-lines'),
        option('Cartões informativos','Título, descrição e ícone de até três cartões',function() openList('features') end,'rectangle-list'),
        option('Redes sociais e site','Links públicos da comunidade',function() openFields('forge_loadscreen:social','Redes sociais',socials) end,'share-nodes'),
        option('Pré-visualizar rascunho','Mostra as alterações sem gravar o arquivo',function()
            syncMedia();previewing=true;menus().HideContext(false);ForgeLoadscreenRuntime.Preview(copy(draft))
        end,'eye'),
        option('Salvar e aplicar','Grava o JSON pelo servidor, após validar a permissão',save,'floppy-disk'),
        option('Descartar alterações','Recarrega o arquivo salvo; exige confirmação',function()
            if confirm('Descartar o rascunho e carregar novamente o JSON salvo?') and reload() then openRoot() end
        end,'rotate-left'),
    }
    show(rootId,'Forge Loadscreen',parentMenu,options)
end
function Admin.Open(menu, resource)
    if busy then return end
    local allowed=pr_lib.callback.await('forge-loadscreen:server:canManage',10000)
    if allowed~=true then notify('Sem permissão para configurar a loadscreen.','error');return end
    -- The root can belong to another resource; all internal children remain local.
    parentMenu = type(menu) == 'string' and menu ~= '' and menu or nil
    parentResource = parentMenu and type(resource) == 'string' and resource ~= '' and resource or nil
    if dirty and draft then openRoot();return end
    if reload() then openRoot() end
end
AddEventHandler('forge-loadscreen:client:previewClosed',function()
    if previewing then previewing=false;openRoot() end
end)
-- Schema is local to this resource and used by the offline coverage test.
Admin.Schema={identity=identity,texts=texts,sections=sections,socials=socials,links=links,
    video=videoFields,music=musicFields,staff=staffFields,lists=lists,palettes=palettes}
