import { useEffect, useState } from 'react';
import { FILLED_BLOCKS, FONT_CHOICES } from '../appearance';
import { KEYBOARD_KEY_IDS, normalizeKeyEntry } from '../config';
import { configPatch, configValue, SECTIONS, updateKeybinds } from '../editorConfig';
import { LAYOUT_ITEMS, PALETTES } from '../layout';
import { ColorField, EyeToggle, Field, PaletteColor, RecordList } from './EditorFields';

const mediaModes = [['playlist', 'Lista de reprodução'], ['single', 'Somente o primeiro']];
const sources = (kind) => [['auto', 'Automático'], [kind, 'Arquivo'], ['youtube', 'YouTube']];
const keys = [...new Set(KEYBOARD_KEY_IDS)];
const labels = {
  tipLabel: 'Título da dica', rulesLabel: 'Regras', changelogsLabel: 'Novidades', keybindsLabel: 'Teclas',
  staffLabel: 'Equipe', serverTeamLabel: 'Cargo padrão da equipe', hideUiLabel: 'Botão esconder interface',
  showUiLabel: 'Botão mostrar interface', preparingEntry: 'Preparando entrada', entryReady: 'Entrada liberada',
  loadingComplete: 'Carregamento concluído', almostThere: 'Quase pronto', loadingResources: 'Carregando recursos',
  initializing: 'Inicialização', initializingServer: 'Inicializando servidor', synchronizing: 'Sincronização',
  detectingResources: 'Detectando recursos', resources: 'Contador de recursos', remaining: 'Tempo restante',
  noKeybind: 'Tecla sem descrição', videoVolumeLabel: 'Título do volume do vídeo',
};
const identity = [
  ['communityName','Texto de apresentação','text',80], ['serverName','Título da cidade','text',80],
  ['slogan','Subtítulo','area',140],
  ['logoUrl','Logotipo · arquivo ou URL','source'], ['brand.mark','Marca curta','text',4],
  ['brand.title','Título da marca','text',70], ['brand.subtitle','Subtítulo da marca','text',90],
  ['footer.text','Créditos do rodapé','text',120], ['tip','Dica','area',180],
];
const socialLabels = { instagram: 'Instagram', tiktok: 'TikTok', x: 'X / Twitter', tebex: 'Loja Tebex',
  discord: 'Discord', youtube: 'YouTube', site: 'Site' };
const contentSections = { rules: 'Regras', news: 'Novidades', keys: 'Teclas', team: 'Equipe',
  features: 'Destaques', socials: 'Redes e links' };
const colorLabels = {
  bgDark: 'Fundo da tela', bgPanel: 'Fundo dos painéis', bgCard: 'Fundo dos cartões', border: 'Bordas',
  accent: 'Destaque', accentDim: 'Destaque suave', accentHover: 'Destaque ao passar o mouse',
  text: 'Texto principal', textMuted: 'Texto secundário', success: 'Sucesso', error: 'Erro',
};

const listDefinitions = {
  rules: { path: 'rules', title: 'Regras da cidade', limit: 80, create: () => '',
    describe: (value, i) => (i + 1) + '. ' + (value || 'Nova regra') },
  news: { path: 'changelogs', title: 'Novidades e versões', limit: 30, create: () => ({ version: '', date: '', items: [] }),
    describe: (item) => item.version, fields: [['version', 'Versão', 'text', 32], ['date', 'Data', 'text', 32]] },
  keys: { path: 'keybinds', title: 'Comandos', limit: 60, create: () => ({ key: '', action: '', description: '' }),
    describe: (item) => [item.key, item.action].filter(Boolean).join(' · '),
    fields: [['action', 'Nome da ação', 'text', 80], ['description', 'Descrição', 'area', 160]] },
  team: { path: 'staff', title: 'Membros da equipe', limit: 24, create: () => ({ name: '', role: '', photo: '' }),
    describe: (item) => item.name, fields: [['name','Nome','text',80], ['role','Cargo','text',80], ['photo','Foto · arquivo ou URL','source']] },
  features: { path: 'featureCards', title: 'Cartões de destaque', limit: 3,
    create: () => ({ title: '', description: '', icon: 'people' }), describe: (item) => item.title,
    fields: [['title','Título','text',60], ['description','Descrição','area',120]] },
  video: { path: 'backgroundMedia.items', title: 'Vídeos', limit: 12,
    create: (settings) => ({ title: '', type: 'auto', src: '', duration: settings.backgroundMedia.rotateSeconds, muted: false }),
    describe: (item) => item.title || item.src, fields: [['title','Título','text',80], ['src','Arquivo ou URL do vídeo','source']] },
  music: { path: 'musicTracks', title: 'Faixas', limit: 20,
    create: () => ({ name: '', artist: '', album: '', cover: '', src: '', type: 'auto' }),
    describe: (item) => item.name || item.src,
    fields: [['name','Nome','text',80], ['artist','Artista','text',80], ['album','Álbum','text',80],
      ['src','Arquivo ou URL da faixa','source'], ['cover','Capa · arquivo ou URL','source']] },
};

function TabRow({ options, selected, onSelect }) {
  return <div className="editor-tab-row">
    {Object.entries(options).map(([id, label]) => (
      <button key={id} type="button" aria-pressed={id === selected} onClick={() => onSelect(id)}>{label}</button>
    ))}
  </div>;
}

function SettingsFields({ fields, settings, change }) {
  return fields.map(([path, label, type, limit]) => (
    <Field key={path} label={label} type={type} limit={limit} value={configValue(settings, path)}
      onChange={(value) => change(path, value)} />
  ));
}

function LabelFields({ ids, settings, change }) {
  return ids.map((key) => (
    <div key={key} className="editor-label-settings">
      <EyeToggle label={labels[key] + ' · rótulo'} visible={settings.textVisibility[key] !== false}
        onChange={(visible) => change('textVisibility.' + key, visible)} />
      <Field label={labels[key] + ' · texto'} limit={100} value={settings.uiText[key]}
        onChange={(value) => change('uiText.' + key, value)} />
    </div>
  ));
}

export function BlockAppearance({ id, settings, change }) {
  const style = settings.elements[id] || {};
  const filled = FILLED_BLOCKS.includes(id);
  const patch = (value) => change('elements.' + id, { ...style, ...value });
  return (
    <>
      <EyeToggle label={LAYOUT_ITEMS[id]} visible={style.visible !== false} onChange={(visible) => patch({ visible })} />
      <details open>
        <summary>Texto</summary>
        <div className="editor-record">
          <EyeToggle label="Texto do bloco" visible={style.textVisible !== false}
            onChange={(textVisible) => patch({ textVisible })} />
          <Field label="Fonte" type="select" value={style.fontFamily} options={[
            ['', 'Padrão'], ...Object.entries(FONT_CHOICES).map(([value, [label]]) => [value, label]),
          ]} onChange={(fontFamily) => patch({ fontFamily: fontFamily || undefined })} />
          <Field label="Tamanho da fonte (px)" type="number" min={8} max={240} value={style.fontSize}
            fallback={id === 'title' ? 120 : 16} onChange={(fontSize) => patch({ fontSize })} />
          <button type="button" disabled={style.fontSize === undefined}
            onClick={() => patch({ fontSize: undefined })}>Restaurar tamanho do texto</button>
          <ColorField label="Cor do texto" color={style.textColor || (id === 'title' ? settings.colors.accent : settings.colors.text)}
            opacity={style.textOpacity ?? 1} onColor={(textColor) => patch({ textColor })}
            onOpacity={(textOpacity) => patch({ textOpacity })} />
          <ColorField label="Cor de destaque" color={style.accentColor || settings.colors.accent}
            onColor={(accentColor) => patch({ accentColor })} />
        </div>
      </details>
      <details>
        <summary>Fundo e borda</summary>
        <div className="editor-record">
          <EyeToggle label="Fundo" visible={style.backgroundEnabled ?? filled}
            onChange={(backgroundEnabled) => patch({ backgroundEnabled })} />
          <ColorField label="Cor do fundo" color={style.backgroundColor ?? '#15151b'}
            opacity={style.backgroundOpacity ?? 0.86} onColor={(backgroundColor) => patch({ backgroundColor, backgroundEnabled: style.backgroundEnabled ?? true })}
            onOpacity={(backgroundOpacity) => patch({ backgroundOpacity, backgroundEnabled: style.backgroundEnabled ?? true })} />
          <EyeToggle label="Borda" visible={style.borderEnabled ?? filled}
            onChange={(borderEnabled) => patch({ borderEnabled })} />
          <ColorField label="Cor da borda" color={style.borderColor ?? '#aaaaaa'}
            opacity={style.borderOpacity ?? 0.5} onColor={(borderColor) => patch({ borderColor, borderEnabled: style.borderEnabled ?? true })}
            onOpacity={(borderOpacity) => patch({ borderOpacity, borderEnabled: style.borderEnabled ?? true })} />
          <EyeToggle label="Efeito de vidro" visible={style.glassEnabled === true}
            onChange={(glassEnabled) => patch({ glassEnabled })} />
          {id === 'teamCard' && (
            <EyeToggle label="Filete lateral" visible={style.accentLineEnabled === true}
              onChange={(accentLineEnabled) => patch({ accentLineEnabled })} />
          )}
          <Field label="Curvatura dos cantos (px)" type="range" min={0} max={80} fallback={filled ? 16 : 0}
            value={style.radius} onChange={(radius) => patch({ radius })} />
        </div>
      </details>
      <button type="button" disabled={Object.keys(style).length === 0}
        onClick={() => change('elements.' + id, style.visible === false ? { visible: false } : {})}>Restaurar aparência</button>
    </>
  );
}

function ConfigList({ id, settings, change, onChange, onPreviewStaff, onPreviewVideo }) {
  const list = listDefinitions[id];
  const entries = configValue(settings, list.path);
  return <RecordList title={list.title} entries={entries} limit={list.limit} create={() => list.create(settings)}
    describe={list.describe}
    onChange={(next) => id === 'keys' ? onChange(updateKeybinds(settings, next)) : change(list.path, next)}
    render={(entry, update, index) => {
      if (id === 'rules') return <Field label="Regra" type="area" limit={220} value={entry} onChange={update} />;
      const set = (key, value) => update({ ...entry, [key]: value });
      return (
        <>
          {id === 'keys' && <Field label="Tecla" type="select" value={entry.key}
            options={[[ '', 'Selecione a tecla' ], ...keys.map((key) =>
              [key, key, entries.some((other, i) => i !== index && other.key === key)])]}
            onChange={(value) => set('key', value)} />}
          {list.fields.map(([key, label, type, limit]) => (
            <Field key={key} label={label} type={type} limit={limit} value={entry[key]} onChange={(value) => set(key, value)} />
          ))}
          {id === 'news' && <Field label="Novidades · uma por linha" type="area" limit={4320}
            value={(Array.isArray(entry.items) ? entry.items : []).join('\n')}
            onChange={(value) => set('items', value.split('\n').slice(0, 24))} />}
          {id === 'features' && <Field label="Ícone" type="select" value={entry.icon} options={[
            ['people','Pessoas'], ['shield','Escudo'], ['star','Estrela'], ['info','Informação'],
            ['lightning','Raio'], ['document','Documento'], ['keyboard','Teclado'],
          ]} onChange={(value) => set('icon', value)} />}
          {(id === 'video' || id === 'music') && (
            <Field label="Formato" type="select" value={entry.type} options={sources(id === 'video' ? 'video' : 'audio')}
              onChange={(value) => set('type', value)} />
          )}
          {id === 'video' && (
            <>
              <Field label="Duração antes da troca (s)" type="number" value={entry.duration} min={8} max={600}
                onChange={(value) => set('duration', value)} />
              <Field label="Vídeo com som" type="eye" value={!entry.muted} onChange={(value) => set('muted', !value)} />
              <button type="button" disabled={!entry.src} onClick={() => onPreviewVideo(entries.slice(0, index).filter((item) => item.src).length)}>Ver este vídeo</button>
            </>
          )}
          {id === 'team' && <button type="button" disabled={!entry.name && !entry.photo}
            onClick={() => onPreviewStaff(entries.slice(0, index).filter((member) => member.name || member.photo).length)}>Ver este membro</button>}
        </>
      );
    }} />;
}

function KeyPreviewSettings({ settings, change, onPreviewKey }) {
  const [selected, setSelected] = useState(() => settings.keybinds.find((entry) => entry.key)?.key || 'F1');
  const key = normalizeKeyEntry(settings.keys[selected]);
  // Some key identifiers contain periods. Keep the keyboard table keyed by the literal identifier.
  const write = (patch) => change('keys', { ...settings.keys, [selected]: { ...key, ...patch } });
  return <details>
    <summary>Teclado visual</summary>
    <div className="editor-record">
      <Field label="Tecla no desenho" type="select" value={selected} options={keys.map((id) => [id, id])}
        onChange={(id) => { setSelected(id); onPreviewKey(id); }} />
      <EyeToggle label="Destaque da tecla" visible={key.enabled} onChange={(enabled) => write({ enabled })} />
      <Field label="Descrição ao clicar na tecla" value={key.info} limit={160} onChange={(info) => write({ info })} />
      <button type="button" onClick={() => onPreviewKey(selected)}>Ver descrição na prévia</button>
    </div>
  </details>;
}

function ContentSettings({ id, settings, change, onChange, onPreviewKey, onPreviewStaff, onPreviewVideo }) {
  const flags = { rules: 'RulesEnabled', news: 'ChangelogsEnabled', keys: 'KeybindsEnabled', team: 'StaffEnabled', socials: 'SocialEnabled' };
  const titleKeys = { rules: 'rulesLabel', news: 'changelogsLabel', keys: 'keybindsLabel', team: 'staffLabel' };
  const links = { rules: 'rules', news: 'changelogs', keys: 'keybinds' };
  return <>
    {flags[id] && <EyeToggle label={SECTIONS[flags[id]]} visible={settings[flags[id]]} onChange={(value) => change(flags[id], value)} />}
    {titleKeys[id] && <LabelFields ids={[titleKeys[id]]} settings={settings} change={change} />}
    {links[id] && <Field label="Link externo · vazio abre o pop-up" type="source" limit={2048}
      value={settings.links[links[id]]} onChange={(value) => change('links.' + links[id], value || '#')} />}
    {id === 'socials' ? <>
      <SettingsFields settings={settings} change={change}
        fields={Object.entries(socialLabels).map(([key, label]) => ['social.' + key, label, 'source', 2048])} />
      <LabelFields ids={['hideUiLabel', 'showUiLabel']} settings={settings} change={change} />
    </> : <ConfigList id={id} settings={settings} change={change} onChange={onChange}
      onPreviewStaff={onPreviewStaff} onPreviewVideo={onPreviewVideo} />}
    {id === 'team' && <>
      <EyeToggle label="Rodízio da equipe" visible={settings.staffCarouselEnabled}
        onChange={(value) => change('staffCarouselEnabled', value)} />
      <Field label="Intervalo entre membros (s)" type="number" min={3} max={60} value={settings.staffCarouselSeconds}
        onChange={(value) => change('staffCarouselSeconds', value)} />
      <LabelFields ids={['serverTeamLabel']} settings={settings} change={change} />
    </>}
    {id === 'keys' && <>
      <KeyPreviewSettings settings={settings} change={change} onPreviewKey={onPreviewKey} />
      <LabelFields ids={['noKeybind']} settings={settings} change={change} />
    </>}
  </>;
}

function MediaSettings({ media, settings, change, onChange, onPreviewVideo }) {
  const video = settings.backgroundMedia;
  const updateMedia = (key, value) => change('backgroundMedia.' + key, value);
  function changeInterval(value) {
    change('backgroundMedia', { ...video, rotateSeconds: value,
      items: video.items.map((item) => item.duration === video.rotateSeconds ? { ...item, duration: value } : item) });
  }
  return <>
    <Field label="Volume inicial (%)" type="range" min={0} max={100} value={Math.round(settings.musicVolume * 100)}
      onChange={(value) => change('musicVolume', value / 100)} />
    <Field label="Fonte do áudio" type="select" value={video.audio === 'native' ? 'video' : video.audio}
      options={[[ 'video','Som do vídeo' ], [ 'separate','Playlist de músicas' ], [ 'none','Silêncio' ]]}
      onChange={(value) => updateMedia('audio', value)} />
    {media === 'video' ? <>
      <EyeToggle label="Vídeo de fundo" visible={settings.VideoEnabled} onChange={(value) => change('VideoEnabled', value)} />
      <Field label="Modo de reprodução" type="select" options={mediaModes} value={video.mode}
        onChange={(value) => updateMedia('mode', value)} />
      <Field label="Som dos vídeos" type="eye" value={!settings.videoMuted} onChange={(value) => change('videoMuted', !value)} />
      <Field label="Ordem aleatória de vídeos" type="eye" value={video.shuffle} onChange={(value) => updateMedia('shuffle', value)} />
      <Field label="Intervalo padrão dos vídeos (s)" type="number" min={8} max={600} value={video.rotateSeconds} onChange={changeInterval} />
    </> : <>
      <EyeToggle label="Playlist de músicas" visible={settings.MusicEnabled} onChange={(value) => change('MusicEnabled', value)} />
      <Field label="Reprodução automática" type="eye" value={settings.musicAutoplay} onChange={(value) => change('musicAutoplay', value)} />
      <Field label="Capa da música" type="eye" value={settings.musicShowCover} onChange={(value) => change('musicShowCover', value)} />
      <Field label="Ordem aleatória de músicas" type="eye" value={settings.musicShuffle} onChange={(value) => change('musicShuffle', value)} />
      <Field label="Modo da playlist" type="select" options={mediaModes} value={settings.musicSourceMode}
        onChange={(value) => change('musicSourceMode', value)} />
    </>}
    <ConfigList id={media} settings={settings} change={change} onChange={onChange} onPreviewVideo={onPreviewVideo} />
  </>;
}

export function EditorPanels({ panel, settings, onChange, selected, onPick, onVisibility, onScene, onPreviewKey,
  onPreviewStaff, onPreviewVideo }) {
  const [content, setContent] = useState('rules');
  const [media, setMedia] = useState('video');
  useEffect(() => {
    if (panel === 'content') onScene(['rules', 'news', 'keys', 'team'].includes(content) ? content : '');
  }, [panel, content]);
  const change = (path, value) => onChange(configPatch(settings, path, value));
  const props = { settings, change, onChange, onPreviewKey, onPreviewStaff, onPreviewVideo };
  const section = { rules: 'rules', news: 'news', keys: 'keys', keyDetail: 'keys',
    team: 'team', teamCard: 'team', features: 'features', socials: 'socials' }[selected];
  if (panel === 'block' && selected) {
    const direct = { intro: ['communityName'], title: ['serverName'], tagline: ['slogan'],
      branding: ['logoUrl','brand.mark','brand.title','brand.subtitle'], tip: ['tip'], footer: ['footer.text'] };
    const dataFields = identity.filter(([path]) => direct[selected]?.includes(path));
    const statusFields = ['initializingServer','loadingResources','detectingResources','preparingEntry','synchronizing',
      'resources','remaining','initializing','loadingComplete','almostThere','entryReady'];
    return <>
      <BlockAppearance id={selected} settings={settings} change={change} />
      <details open={dataFields.length > 0 || Boolean(section)}>
        <summary>Conteúdo do bloco</summary>
        <div className="editor-record">
          <SettingsFields fields={dataFields} settings={settings} change={change} />
          {selected === 'branding' && [['logoUrl', 'Logotipo'], ['brand_title', 'Título da marca'],
            ['brand_subtitle', 'Subtítulo da marca']].map(([key, label]) => (
              <EyeToggle key={key} label={label} visible={settings.textVisibility[key] !== false}
                onChange={(visible) => change('textVisibility.' + key, visible)} />
            ))}
          {selected === 'tip' && <LabelFields ids={['tipLabel']} settings={settings} change={change} />}
          {selected === 'status' && <LabelFields ids={statusFields} settings={settings} change={change} />}
          {selected === 'shortcuts' && <>
            <LabelFields ids={['rulesLabel','changelogsLabel','keybindsLabel']} settings={settings} change={change} />
            {['RulesEnabled','ChangelogsEnabled','KeybindsEnabled'].map((flag) => (
              <EyeToggle key={flag} label={SECTIONS[flag]} visible={settings[flag]} onChange={(value) => change(flag, value)} />
            ))}
          </>}
          {selected === 'audio' && <>
            <LabelFields ids={['videoVolumeLabel']} settings={settings} change={change} />
            <Field label="Volume inicial (%)" type="range" min={0} max={100} value={Math.round(settings.musicVolume * 100)}
              onChange={(value) => change('musicVolume', value / 100)} />
          </>}
          {section && <ContentSettings key={section} id={section} {...props} />}
        </div>
      </details>
    </>;
  }
  if (panel === 'sections') return <>
    <details open><summary>Blocos da tela</summary><div className="editor-record">
      {Object.entries(LAYOUT_ITEMS).map(([id, label]) => (
        <EyeToggle key={id} label={label} visible={settings.elements[id]?.visible !== false}
          onChange={(visible) => onVisibility(id, visible)} onLabel={() => onPick(id)} />
      ))}
    </div></details>
    <details><summary>Recursos da tela</summary><div className="editor-record">
      {Object.entries(SECTIONS).map(([key, label]) => (
        <EyeToggle key={key} label={label} visible={settings[key]} onChange={(value) => change(key, value)} />
      ))}
    </div></details>
  </>;
  if (panel === 'identity') return <SettingsFields fields={identity} settings={settings} change={change} />;
  if (panel === 'palette') return <>
    <TabRow options={{ ...Object.fromEntries(Object.entries(PALETTES).map(([id, palette]) => [id, palette.label])), custom: 'Personalizada' }}
      selected={settings.palettePreset || 'custom'}
      onSelect={(id) => id === 'custom' ? change('palettePreset', '')
        : onChange({ palettePreset: id, colors: PALETTES[id].colors, followGlobalTheme: false })} />
    <Field label="Usar destaque do Forge Management ao publicar" type="eye" value={settings.followGlobalTheme}
      onChange={(value) => change('followGlobalTheme', value)} />
    {Object.entries(colorLabels).map(([id, label]) => <PaletteColor key={id} label={label}
      value={settings.colors[id]} onChange={(value) => change('colors.' + id, value)} />)}
    <Field label="Degradê de destaque (CSS)" type="area" limit={1024} value={settings.colors.gradientAccent}
      onChange={(value) => change('colors.gradientAccent', value)} />
  </>;
  if (panel === 'media') return <>
    <TabRow options={{ video: 'Vídeos', music: 'Músicas' }} selected={media}
      onSelect={(value) => { setMedia(value); onScene(''); }} />
    <MediaSettings media={media} {...props} />
  </>;
  if (panel === 'content') return <>
    <TabRow options={contentSections} selected={content}
      onSelect={setContent} />
    <ContentSettings key={content} id={content} {...props} />
  </>;
  if (panel === 'general') return <>
    <Field label="Idioma" type="select" value={settings.language}
      options={[[ 'pt-BR','Português' ], [ 'en-US','Inglês' ], [ 'es-ES','Espanhol' ]]}
      onChange={(value) => change('language', value)} />
    <Field label="Tempo mínimo de carregamento (s)" type="number" min={0} max={900}
      value={settings.minimumLoadscreenSeconds} onChange={(value) => change('minimumLoadscreenSeconds', value)} />
    <small>0 desativa a espera mínima.</small>
    <details><summary>Textos da interface</summary><div className="editor-record">
      <LabelFields ids={Object.keys(labels)} settings={settings} change={change} />
    </div></details>
  </>;
  return null;
}
