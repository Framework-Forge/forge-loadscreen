import { normalizeKeyEntry, parseConfig } from './config.js';

export const SECTIONS = {
  BrandingEnabled: 'Marca e logotipo', VideoEnabled: 'Vídeo de fundo', MusicEnabled: 'Músicas',
  TipEnabled: 'Dica', RulesEnabled: 'Regras', ChangelogsEnabled: 'Novidades',
  KeybindsEnabled: 'Teclas', StaffEnabled: 'Equipe', SocialEnabled: 'Redes sociais',
};

export function editorDraft(raw) {
  const parsed = parseConfig(raw);
  const flags = Object.fromEntries(Object.keys(SECTIONS).map((field) =>
    [field, parsed[field[0].toLowerCase() + field.slice(1)]]));
  return {
    ...flags,
    layout: parsed.layout, elements: parsed.elements, textVisibility: parsed.textVisibility, colors: parsed.colors,
    palettePreset: parsed.palettePreset, followGlobalTheme: parsed.followGlobalTheme,
    language: parsed.language, communityName: parsed.communityName, serverName: parsed.serverName,
    slogan: parsed.slogan, tagline: parsed.tagline, tip: parsed.tip, logoUrl: raw.logoUrl ?? parsed.brand.logo,
    brand: parsed.brand, footer: parsed.footer, uiText: parsed.uiText, links: parsed.links, social: parsed.social,
    minimumLoadscreenSeconds: Number(parsed.minimumLoadscreenSeconds) || 0,
    backgroundMedia: parsed.backgroundMedia, videoMuted: raw.videoMuted ?? false,
    musicTracks: parsed.musicTracks, musicVolume: parsed.musicVolume, musicAutoplay: parsed.musicAutoplay,
    musicShowCover: parsed.musicShowCover, musicShuffle: parsed.musicShuffle, musicSourceMode: parsed.musicSourceMode,
    staff: parsed.staff.map((member) => typeof member === 'string' ? { name: member } : member),
    staffCarouselEnabled: parsed.staffCarouselEnabled, staffCarouselSeconds: parsed.staffCarouselSeconds,
    featureCards: parsed.featureCards, rules: parsed.rules, changelogs: parsed.changelogs,
    keybinds: parsed.keybinds, keys: raw.keys ?? parsed.keys,
  };
}

export function configValue(settings, path) {
  return path.split('.').reduce((value, key) => value?.[key], settings);
}

export function configPatch(settings, path, value) {
  const [key, ...rest] = path.split('.');
  return { [key]: rest.length ? { ...settings?.[key], ...configPatch(settings?.[key], rest.join('.'), value) } : value };
}

export function updateKeybinds(settings, next) {
  const previous = new Map(settings.keybinds.map((entry) => [entry.key, entry]));
  const keys = { ...settings.keys };
  const bindingKeys = new Set(next.map((entry) => entry.key));
  for (const key of previous.keys()) if (!bindingKeys.has(key)) delete keys[key];
  const description = (entry) => entry?.description || entry?.action || '';
  for (const entry of next) {
    if (!entry.key) continue;
    const existing = keys[entry.key] == null ? null : normalizeKeyEntry(keys[entry.key]);
    if (!existing || existing.info === description(previous.get(entry.key))) {
      keys[entry.key] = { enabled: existing?.enabled ?? true, info: description(entry) };
    }
  }
  return { keybinds: next, keys };
}
