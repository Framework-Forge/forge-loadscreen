import { appearanceProps } from './appearance.js';

export const LAYOUT_ITEMS = {
  branding: 'Logotipo e marca',
  intro: 'Texto de apresentação',
  title: 'Título da cidade',
  tagline: 'Subtítulo',
  socials: 'Redes sociais e Esconder UI',
  features: 'Destaques da cidade',
  status: 'Carregamento',
  shortcuts: 'Atalhos de Regras, Novidades e Teclas',
  tip: 'Dica',
  teamCard: 'Cartão da equipe',
  audio: 'Volume e áudio',
  footer: 'Rodapé',
  rules: 'Janela de regras',
  news: 'Janela de novidades',
  keys: 'Janela de teclas',
  keyDetail: 'Descrição da tecla',
  team: 'Janela da equipe',
};

export const DIALOG_ITEMS = ['rules', 'news', 'keys', 'keyDetail', 'team'];

const PANELS = ['branding', 'socials', 'teamCard', 'audio', 'features', 'status', 'shortcuts', 'tip'];

function minimumPixels(id) {
  if (DIALOG_ITEMS.includes(id)) return { width: 170, height: 116 };
  if (PANELS.includes(id)) return { width: 140, height: 44 };
  return { width: 44, height: 28 };
}

export function layoutMinimum(id, viewport) {
  const minimum = minimumPixels(id);
  return { width: Math.max(minimum.width, viewport.width / 100),
    height: Math.max(minimum.height, viewport.height / 100) };
}

export const LAYOUT_FIELDS = {
  x: 'Posição X', y: 'Posição Y', width: 'Largura', height: 'Altura',
};

function percent(value, min) {
  return Math.round(Math.max(min, Math.min(100, value)) * 100) / 100;
}

export function normalizeBox(box) {
  if (!box || !Object.keys(LAYOUT_FIELDS).every((key) => Number.isFinite(box[key]))) return null;
  return { x: percent(box.x, 0), y: percent(box.y, 0),
    width: percent(box.width, 1), height: percent(box.height, 1) };
}

export function normalizeLayout(layout) {
  const result = {};
  for (const id of Object.keys(LAYOUT_ITEMS)) {
    const box = normalizeBox(layout?.[id]);
    if (box) result[id] = box;
  }
  return result;
}

export function layoutProps(id, layout, elements) {
  const box = layout[id];
  const minimum = minimumPixels(id);
  const { style, ...appearance } = appearanceProps(id, elements?.[id]);
  return {
    ...appearance,
    'data-layout': id,
    'data-custom-layout': box ? '' : undefined,
    style: box ? {
      ...style,
      '--layout-min-width': minimum.width + 'px', '--layout-min-height': minimum.height + 'px',
      '--layout-x': `${box.x}vw`, '--layout-y': `${box.y}vh`,
      '--layout-width': `${box.width}vw`, '--layout-height': `${box.height}vh`,
    } : style,
  };
}

function palette(label, accent, rgb, light, dark, panel, card, text, textMuted) {
  return {
    label,
    colors: {
      bgDark: dark, bgPanel: panel, bgCard: card, border: `rgba(${rgb}, 0.48)`,
      accent, accentDim: `rgba(${rgb}, 0.65)`, accentHover: `rgba(${rgb}, 0.17)`,
      text, textMuted, success: '#4ade80', error: '#f87171',
      gradientAccent: `linear-gradient(135deg, ${light} 0%, ${accent} 100%)`,
    },
  };
}

export const PALETTES = {
  forge: palette('Forge', '#ff7a1a', '255, 122, 26', '#ffc58d', '#101012',
    'rgba(23, 21, 21, 0.9)', 'rgba(42, 32, 28, 0.92)', '#fff5ec', '#c9bcb5'),
  lime: palette('Verde Lima', '#a8e83c', '168, 232, 60', '#e0ff9d', '#0c130e',
    'rgba(16, 29, 20, 0.92)', 'rgba(28, 46, 29, 0.92)', '#f3ffe8', '#bcccac'),
  indigo: palette('Azul Anil', '#859bff', '133, 155, 255', '#c8cfff', '#0d1124',
    'rgba(19, 26, 51, 0.93)', 'rgba(32, 42, 74, 0.93)', '#f0f2ff', '#bfc6e0'),
};
