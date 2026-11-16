export const FONT_CHOICES = {
  orbitron: ['Orbitron', '"Orbitron", sans-serif'],
  rajdhani: ['Rajdhani', '"Rajdhani", sans-serif'],
  arial: ['Arial', 'Arial, sans-serif'],
  georgia: ['Georgia', 'Georgia, serif'],
  verdana: ['Verdana', 'Verdana, sans-serif'],
  mono: ['Monoespaçada', '"Courier New", monospace'],
};

export const FILLED_BLOCKS = ['socials', 'features', 'status', 'shortcuts', 'tip', 'teamCard',
  'audio', 'rules', 'news', 'keys', 'keyDetail', 'team'];

const COLOR_FIELDS = ['backgroundColor', 'borderColor', 'textColor', 'accentColor'];
const FLAGS = ['visible', 'textVisible', 'backgroundEnabled', 'borderEnabled', 'glassEnabled', 'accentLineEnabled'];
const LIMITS = { backgroundOpacity: [0, 1], borderOpacity: [0, 1], textOpacity: [0, 1], radius: [0, 80], fontSize: [8, 240] };
const isHex = (value) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

export function normalizeAppearance(input, ids) {
  const blocks = {};
  for (const id of ids) {
    const raw = input?.[id];
    if (!raw || typeof raw !== 'object') continue;
    const style = {};
    for (const field of FLAGS) if (typeof raw[field] === 'boolean') style[field] = raw[field];
    for (const field of COLOR_FIELDS) if (isHex(raw[field])) style[field] = raw[field];
    for (const [field, [min, max]] of Object.entries(LIMITS)) {
      if (Number.isFinite(raw[field])) style[field] = Math.max(min, Math.min(max, raw[field]));
    }
    if (typeof raw.fontFamily === 'string' && Object.hasOwn(FONT_CHOICES, raw.fontFamily)) style.fontFamily = raw.fontFamily;
    if (Object.keys(style).length) blocks[id] = style;
  }
  return blocks;
}

export function colorWithOpacity(color, opacity) {
  if (!isHex(color)) return color;
  const rgb = [1, 3, 5].map((offset) => Number.parseInt(color.slice(offset, offset + 2), 16));
  return `rgba(${rgb.join(', ')}, ${opacity})`;
}

export function appearanceProps(id, appearance) {
  if (!appearance) return {};
  const { visible, textVisible, backgroundEnabled, backgroundColor, backgroundOpacity, borderEnabled, borderColor,
    borderOpacity, radius, textColor, textOpacity, fontFamily, fontSize, accentColor, glassEnabled, accentLineEnabled } = appearance;
  const fill = backgroundEnabled !== undefined || backgroundColor !== undefined || backgroundOpacity !== undefined;
  const border = borderEnabled !== undefined || borderColor !== undefined || borderOpacity !== undefined;
  const fillOff = backgroundEnabled === false || backgroundOpacity === 0;
  const borderOff = borderEnabled === false || borderOpacity === 0;
  const ink = textVisible === false || textColor !== undefined || textOpacity !== undefined;
  const style = {};
  if (fill) style['--block-background'] = fillOff ? 'transparent'
    : colorWithOpacity(backgroundColor || '#15151b', backgroundOpacity ?? 0.86);
  if (border) style['--block-border'] = borderOff ? 'transparent'
    : colorWithOpacity(borderColor || '#aaaaaa', borderOpacity ?? 0.5);
  if (radius !== undefined) style['--block-radius'] = radius + 'px';
  if (ink) style['--block-ink'] = textVisible === false ? 'transparent' : textColor
    ? colorWithOpacity(textColor, textOpacity ?? 1)
    : `color-mix(in srgb, var(${id === 'title' ? '--stage-accent' : '--stage-text'}) ${(textOpacity ?? 1) * 100}%, transparent)`;
  if (fontFamily) style['--block-font'] = FONT_CHOICES[fontFamily]?.[1];
  if (fontSize !== undefined) style['--block-font-size'] = fontSize + 'px';
  if (accentColor) style['--block-accent'] = accentColor;
  return {
    'data-layout-hidden': visible === false ? '' : undefined,
    'data-block-fill': fill ? (fillOff ? 'off' : 'on') : undefined,
    'data-block-border': border ? (borderOff ? 'off' : 'on') : undefined,
    'data-block-glass': glassEnabled ? '' : undefined,
    'data-team-accent-line': id === 'teamCard' && accentLineEnabled ? '' : undefined,
    'data-block-radius': radius !== undefined ? '' : undefined,
    'data-block-ink': ink ? '' : undefined,
    'data-block-font': fontFamily ? '' : undefined,
    'data-block-font-size': fontSize !== undefined ? '' : undefined,
    'data-block-accent': accentColor ? '' : undefined,
    style,
  };
}
