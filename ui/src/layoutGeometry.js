import { layoutMinimum, normalizeBox } from './layout.js';

export const GUTTER = 12;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function boundsOf(items) {
  const entries = Object.values(items);
  const x = Math.min(...entries.map((item) => item.x));
  const y = Math.min(...entries.map((item) => item.y));
  return {
    x, y,
    width: Math.max(...entries.map((item) => item.x + item.width)) - x,
    height: Math.max(...entries.map((item) => item.y + item.height)) - y,
  };
}

export function fitRect(id, rect, viewport) {
  const min = layoutMinimum(id, viewport);
  const width = clamp(rect.width, min.width, viewport.width - 2 * GUTTER);
  const height = clamp(rect.height, min.height, viewport.height - 2 * GUTTER);
  return {
    x: clamp(rect.x, GUTTER, viewport.width - width - GUTTER),
    y: clamp(rect.y, GUTTER, viewport.height - height - GUTTER),
    width, height,
  };
}

export function toPercent(rect, viewport) {
  return normalizeBox({
    x: rect.x / viewport.width * 100, y: rect.y / viewport.height * 100,
    width: rect.width / viewport.width * 100, height: rect.height / viewport.height * 100,
  });
}

export function moveSelection(items, dx, dy, viewport) {
  const box = boundsOf(items);
  const x = clamp(box.x + dx, GUTTER, viewport.width - GUTTER - box.width);
  const y = clamp(box.y + dy, GUTTER, viewport.height - GUTTER - box.height);
  return Object.fromEntries(Object.entries(items).map(([id, item]) =>
    [id, { ...item, x: item.x + x - box.x, y: item.y + y - box.y }]));
}

export function resizeItem(id, item, dx, dy, viewport) {
  const min = layoutMinimum(id, viewport);
  return {
    ...item,
    width: clamp(item.width + dx, min.width, viewport.width - item.x - GUTTER),
    height: clamp(item.height + dy, min.height, viewport.height - item.y - GUTTER),
  };
}

export function scaleSelection(items, dx, dy, corner, viewport) {
  const box = boundsOf(items);
  const left = corner.endsWith('w');
  const top = corner.startsWith('n');
  const anchorX = left ? box.x + box.width : box.x;
  const anchorY = top ? box.y + box.height : box.y;
  const widthLimit = left ? anchorX - GUTTER : viewport.width - GUTTER - anchorX;
  const heightLimit = top ? anchorY - GUTTER : viewport.height - GUTTER - anchorY;
  const max = Math.min(widthLimit / box.width, heightLimit / box.height);
  const min = Math.max(...Object.entries(items).map(([id, item]) => {
    const limit = layoutMinimum(id, viewport);
    return Math.max(limit.width / item.width, limit.height / item.height);
  }));
  const signedX = left ? -dx : dx;
  const signedY = top ? -dy : dy;
  const scale = clamp(1 + (signedX * box.width + signedY * box.height) / (box.width ** 2 + box.height ** 2), min, Math.max(min, max));
  return Object.fromEntries(Object.entries(items).map(([id, item]) => [id, {
    x: anchorX + (item.x - anchorX) * scale,
    y: anchorY + (item.y - anchorY) * scale,
    width: item.width * scale,
    height: item.height * scale,
  }]));
}

export function arrangeSelection(items, command, viewport, gap) {
  const entries = Object.entries(items);
  const box = boundsOf(items);
  if (command === 'size') {
    const reference = entries.reduce((smallest, [, item]) =>
      item.width * item.height < smallest.width * smallest.height ? item : smallest, entries[0][1]);
    const minimums = entries.map(([id]) => layoutMinimum(id, viewport));
    const width = Math.max(reference.width, ...minimums.map((item) => item.width));
    const height = Math.max(reference.height, ...minimums.map((item) => item.height));
    return Object.fromEntries(entries.map(([id, item]) => [id, fitRect(id, { ...item, width, height }, viewport)]));
  }

  if (command === 'horizontal' || command === 'vertical') {
    const axis = command === 'horizontal' ? 'x' : 'y';
    const size = axis === 'x' ? 'width' : 'height';
    const space = viewport[size] - 2 * GUTTER;
    const ordered = entries.sort((a, b) => a[1][axis] - b[1][axis]);
    const occupied = ordered.reduce((sum, [, item]) => sum + item[size], 0);
    const spacing = gap ?? Math.max(0, (box[size] - occupied) / (ordered.length - 1));
    const used = occupied + spacing * (ordered.length - 1);
    if (used > space + 0.01) return null;
    let next = clamp(box[axis], GUTTER, viewport[size] - GUTTER - used);
    return Object.fromEntries(ordered.map(([id, item]) => {
      const rect = { ...item, [axis]: next };
      next += item[size] + spacing;
      return [id, rect];
    }));
  }

  return Object.fromEntries(entries.map(([id, item]) => {
    const positions = {
      left: { x: box.x }, right: { x: box.x + box.width - item.width },
      top: { y: box.y }, bottom: { y: box.y + box.height - item.height },
      'center-x': { x: box.x + (box.width - item.width) / 2 },
      'center-y': { y: box.y + (box.height - item.height) / 2 },
    };
    return [id, { ...item, ...positions[command] }];
  }));
}

export function patternSelection(items, pattern, rotation, gap, viewport) {
  const entries = Object.entries(items);
  const radians = rotation * Math.PI / 180;
  const points = entries.map(([id, item], index) => {
    const fraction = index / (entries.length - 1);
    if (pattern === 'line') {
      const offset = fraction * 2 - 1;
      return { id, item, x: Math.cos(radians) * offset, y: Math.sin(radians) * offset };
    }
    const angle = pattern === 'circle' ? 2 * Math.PI * index / entries.length - Math.PI / 2
      : Math.PI + Math.PI * fraction;
    return { id, item, x: Math.cos(angle + radians), y: Math.sin(angle + radians) };
  });

  // Find a common radius where each pair is separated on at least one axis.
  let radius = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    for (const b of points.slice(i + 1)) {
      const dx = Math.abs(a.x - b.x);
      const dy = Math.abs(a.y - b.y);
      const roomX = dx > 1e-6 ? ((a.item.width + b.item.width) / 2 + gap) / dx : Infinity;
      const roomY = dy > 1e-6 ? ((a.item.height + b.item.height) / 2 + gap) / dy : Infinity;
      radius = Math.max(radius, Math.min(roomX, roomY));
    }
  }
  const original = boundsOf(items);
  const arranged = Object.fromEntries(points.map(({ id, item, x, y }) => [id, {
    ...item,
    x: original.x + original.width / 2 + x * radius - item.width / 2,
    y: original.y + original.height / 2 + y * radius - item.height / 2,
  }]));
  const box = boundsOf(arranged);
  if (box.width > viewport.width - 2 * GUTTER + 0.01 || box.height > viewport.height - 2 * GUTTER + 0.01) return null;
  return moveSelection(arranged, 0, 0, viewport);
}

export function intersects(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
    a.y < b.y + b.height && a.y + a.height > b.y;
}
