import { useLayoutEffect, useRef, useState } from 'react';
import { DIALOG_ITEMS, LAYOUT_FIELDS, LAYOUT_ITEMS, normalizeBox } from '../layout';
import { EditorPanels } from './EditorPanels';
import { arrangeSelection, boundsOf, fitRect, intersects, moveSelection, patternSelection,
  resizeItem, scaleSelection, toPercent } from '../layoutGeometry';

const TOOLS = [
  ['left', '⇤', 'Alinhar à esquerda'], ['center-x', '↔', 'Alinhar os centros na mesma coluna'],
  ['right', '⇥', 'Alinhar à direita'], ['top', '⇡', 'Alinhar no topo'],
  ['center-y', '↕', 'Alinhar os centros na mesma linha'], ['bottom', '⇣', 'Alinhar na base'],
  ['horizontal', '↤↦', 'Distribuir horizontalmente'], ['vertical', '↥↧', 'Distribuir verticalmente'],
  ['size', '▣', 'Igualar tamanhos'],
];
const PATTERNS = { free: 'Livre', line: 'Linha reta', circle: 'Círculo', arc: 'Meia-lua' };
const CORNERS = { nw: '↖', ne: '↗', sw: '↙', se: '↘' };
const PANELS = { layout: 'Layout', block: 'Bloco', sections: 'Visibilidade', identity: 'Identidade',
  palette: 'Cores', media: 'Mídia', content: 'Conteúdo', general: 'Geral' };
const SAVE_ERRORS = {
  no_permission: 'Seu acesso à edição não está disponível.',
  rate_limited: 'Aguarde alguns segundos e tente salvar novamente.',
  backup_failed: 'Não foi possível criar a cópia de segurança do JSON.',
  save_failed: 'Não foi possível gravar a configuração.',
};

const viewportSize = () => ({ width: window.innerWidth, height: window.innerHeight });
const isAdditive = (event) => event.ctrlKey || event.shiftKey || event.metaKey;
const boxStyle = ({ x, y, width, height }) => ({ left: x, top: y, width, height });

function SelectionTools({ count, gap, onGap, onArrange, pattern, onPattern, rotation, onRotation }) {
  return (
    <section className="layout-editor__group" aria-label="Organizar seleção">
      <div className="layout-editor__commands">
        {TOOLS.map(([command, icon, label]) => (
          <button key={command} type="button" title={label} aria-label={label}
            disabled={count < (command === 'horizontal' || command === 'vertical' ? 3 : 2)}
            onClick={() => onArrange(command)}>{icon}</button>
        ))}
      </div>
      <div className="layout-editor__spacing">
        <label>Espaçamento (px)
          <input type="number" min="0" max="500" value={gap} onChange={(event) => onGap(event.target.value)} />
        </label>
        <button type="button" onClick={() => onArrange('horizontal', gap)} aria-label="Aplicar espaçamento horizontal">Aplicar H</button>
        <button type="button" onClick={() => onArrange('vertical', gap)} aria-label="Aplicar espaçamento vertical">Aplicar V</button>
      </div>
      <div className="layout-editor__patterns" aria-label="Organização">
        {Object.entries(PATTERNS).map(([id, label]) => (
          <button key={id} type="button" aria-pressed={pattern === id} onClick={() => onPattern(id)}>{label}</button>
        ))}
      </div>
      {pattern !== 'free' && (
        <label>Rotação (°)
          <input key={rotation} type="number" min="-180" max="180" step="5" defaultValue={rotation}
            onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
            onBlur={(event) => onRotation(event.currentTarget.valueAsNumber)} />
        </label>
      )}
    </section>
  );
}

export default function PreviewEditor({ settings, unsavedOnOpen, scene, onScene, onChange, onApply, onCancel,
  onPreviewKey, onPreviewStaff, onPreviewVideo }) {
  const [rects, setRects] = useState({});
  const [selected, setSelected] = useState([]);
  const [marquee, setMarquee] = useState(null);
  const [dockRight, setDockRight] = useState(false);
  const [panel, setPanel] = useState('layout');
  const [interactive, setInteractive] = useState(false);
  const [saved, setSaved] = useState(unsavedOnOpen ? null : settings);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [gap, setGap] = useState('12');
  const [pattern, setPattern] = useState('free');
  const [rotation, setRotation] = useState(0);
  const stage = useRef(null);
  const drag = useRef(null);
  const busy = useRef(false);
  const elements = useRef([]);

  function measure() {
    const measured = {};
    for (const element of elements.current) {
      const { left: x, top: y, width, height } = element.getBoundingClientRect();
      if (width > 0 && height > 0) measured[element.dataset.layout] = { x, y, width, height };
    }
    setRects(measured);
  }

  useLayoutEffect(() => {
    elements.current = Array.from(document.querySelectorAll('.app [data-layout]')).filter((element) =>
      scene ? element.dataset.layout === scene : !DIALOG_ITEMS.includes(element.dataset.layout));
    const observer = new ResizeObserver(measure);
    elements.current.forEach((element) => observer.observe(element));
    window.addEventListener('resize', measure);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [scene, settings]);

  const ids = selected.filter((id) => rects[id]);
  const selectedRects = Object.fromEntries(ids.map((id) => [id, rects[id]]));
  const group = ids.length > 1 ? boundsOf(selectedRects) : null;
  const viewport = viewportSize();
  const activeId = ids.length === 1 ? ids[0] : null;
  const inspected = selected.length === 1 ? selected[0] : scene || null;
  const values = activeId && (settings.layout[activeId] || toPercent(rects[activeId], viewport));

  function select(next) {
    setSelected(next);
    if (next.length !== 1) setPanel((current) => current === 'block' ? 'layout' : current);
    setPattern('free');
    setNotice('');
  }

  function changeScene(next) {
    select(next ? [next] : []);
    onScene(next);
  }

  function pick(id) {
    onScene(DIALOG_ITEMS.includes(id) ? id : '');
    select([id]);
    setPanel('block');
    setInteractive(false);
  }

  function setVisibility(id, visible) {
    onChange({ elements: { ...settings.elements, [id]: { ...settings.elements[id], visible } } });
  }

  function writeRects(next, size = viewportSize()) {
    const patch = Object.fromEntries(Object.entries(next).map(([id, item]) => [id, toPercent(item, size)]));
    onChange({ layout: { ...settings.layout, ...patch } });
  }

  function start(event, mode, id) {
    if (event.button !== 0 || drag.current || busy.current) return;
    event.preventDefault();
    event.stopPropagation();
    stage.current.focus({ preventScroll: true });

    let targets = ids;
    if (mode === 'move' && isAdditive(event)) {
      select(ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);
      return;
    }
    if (mode === 'move' && !ids.includes(id)) targets = [id];
    if (mode === 'resize') targets = [id];
    if (mode === 'marquee') targets = isAdditive(event) ? ids : [];
    if (mode === 'marquee' || targets !== ids) select(targets);
    else setNotice('');

    const size = viewportSize();
    drag.current = {
      mode, id, viewport: size, pointerId: event.pointerId,
      x: event.clientX, y: event.clientY, targets,
      items: Object.fromEntries(targets.map((item) => [item, fitRect(item, rects[item], size)])),
    };
    stage.current.setPointerCapture(event.pointerId);
  }

  function move(event) {
    const original = drag.current;
    if (!original || original.pointerId !== event.pointerId) return;
    const dx = event.clientX - original.x;
    const dy = event.clientY - original.y;
    if (!original.moved && Math.max(Math.abs(dx), Math.abs(dy)) < 3) return;
    original.moved = true;
    const { mode, id, items, viewport: size } = original;

    if (mode === 'marquee') {
      const box = { x: Math.min(event.clientX, original.x), y: Math.min(event.clientY, original.y),
        width: Math.abs(dx), height: Math.abs(dy) };
      setMarquee(box);
      const hits = Object.entries(rects).filter(([, rect]) => intersects(box, rect)).map(([name]) => name);
      setSelected([...new Set([...original.targets, ...hits])]);
      return;
    }
    if (mode === 'resize') {
      writeRects({ [id]: resizeItem(id, items[id], dx, dy, size) }, size);
    } else {
      writeRects(mode === 'scale' ? scaleSelection(items, dx, dy, id, size)
        : moveSelection(items, dx, dy, size), size);
    }
  }

  function end(event) {
    if (drag.current?.pointerId !== event.pointerId) return;
    const action = drag.current;
    drag.current = null;
    setMarquee(null);
    if (event.type === 'pointerup' && action.mode === 'move' && !action.moved && action.targets.length === 1) {
      setPanel('block');
    }
  }

  function arrange(command, explicitGap) {
    const items = Object.fromEntries(ids.map((id) => [id, fitRect(id, rects[id], viewport)]));
    const spacing = explicitGap === undefined ? undefined : Math.max(0, Math.min(500, Number(explicitGap) || 0));
    const next = arrangeSelection(items, command, viewport, spacing);
    setNotice(next ? '' : 'O grupo não cabe com esse espaçamento.');
    if (next) {
      setPattern('free');
      writeRects(next);
    }
  }

  function changePattern(next, angle = 0) {
    if (next === 'free') {
      setPattern(next);
      setNotice('');
      return;
    }
    const items = Object.fromEntries(ids.map((id) => [id, fitRect(id, rects[id], viewport)]));
    const spacing = Math.max(0, Math.min(500, Number(gap) || 0));
    const nextRects = patternSelection(items, next, angle, spacing, viewport);
    setNotice(nextRects ? '' : 'Esse formato não cabe na tela. Reduza os itens ou o espaçamento.');
    if (nextRects) {
      setPattern(next);
      setRotation(angle);
      writeRects(nextRects);
    }
  }

  function resetSelected() {
    const layout = { ...settings.layout };
    ids.forEach((id) => { delete layout[id]; });
    onChange({ layout });
  }

  async function apply() {
    if (busy.current || settings === saved) return;
    busy.current = true;
    setSaving(true);
    setNotice('');
    try {
      const result = await onApply(settings);
      setSaved(result);
      setNotice('Configuração salva e aplicada.');
    } catch (error) {
      setNotice(SAVE_ERRORS[error.message] || 'Não foi possível salvar a configuração. Tente novamente.');
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  useLayoutEffect(() => {
    function keyboard(event) {
      if (event.repeat || busy.current || event.defaultPrevented) return;
      const editingField = event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement
        || event.target instanceof HTMLTextAreaElement;
      if (event.key === 'Escape') {
        event.preventDefault();
        if (editingField) event.target.blur();
        else onCancel();
      }
      if (event.key === 'Enter' && !editingField && !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault();
        apply();
      }
    }
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  });

  const hitboxes = Object.entries(rects).sort(([, a], [, b]) => b.width * b.height - a.width * a.height);
  return (
    <>
      {!interactive && <div ref={stage} className="layout-canvas" tabIndex={-1} aria-label="Área de edição do layout"
        onPointerDown={(event) => start(event, 'marquee')} onPointerMove={move} onPointerUp={end}
        onPointerCancel={end} onLostPointerCapture={end}>
        {hitboxes.map(([id, box]) => (
          <button key={id} type="button" className="layout-canvas__box" style={boxStyle(box)}
            aria-pressed={selected.includes(id)} data-edit-id={id} title={LAYOUT_ITEMS[id]}
            onPointerDown={(event) => start(event, 'move', id)}
            onClick={(event) => { if (event.detail === 0) pick(id); }}>
            <span>{LAYOUT_ITEMS[id]}</span>
          </button>
        ))}
        {activeId && (
          <button type="button" className="layout-canvas__handle" aria-label="Redimensionar elemento"
            title="Arraste para redimensionar" style={{
              left: rects[activeId].x + rects[activeId].width, top: rects[activeId].y + rects[activeId].height,
            }} onPointerDown={(event) => start(event, 'resize', activeId)} />
        )}
        {group && !marquee && (
          <div className="layout-canvas__group" style={boxStyle(group)}>
            {Object.entries(CORNERS).map(([corner, icon]) => (
              <button type="button" key={corner} className={`layout-canvas__handle layout-canvas__handle--${corner}`}
                data-corner={corner} aria-label={`Escalar grupo ${icon}`} title="Escalar o grupo proporcionalmente"
                onPointerDown={(event) => start(event, 'scale', corner)}>{icon}</button>
            ))}
          </div>
        )}
        {marquee && <div className="layout-canvas__marquee" style={boxStyle(marquee)} />}
      </div>}
      {!interactive && panel === 'layout' && <div className="layout-editor__help">
        Arraste um bloco · <kbd>Ctrl</kbd> / <kbd>Shift</kbd> para selecionar vários · Arraste no fundo para selecionar por área
      </div>}
      <aside className={`layout-editor${dockRight ? ' layout-editor--right' : ''}`} aria-label="Editor visual">
        <div className="layout-editor__heading">
          <strong>Editor da Loadscreen</strong>
          <button type="button" onClick={() => setDockRight(!dockRight)}>Mudar lado</button>
        </div>
        <div className="layout-editor__bar">
          <span>{settings === saved ? 'Configuração salva' : 'Alterações por salvar'}</span>
          <button type="button" aria-pressed={interactive} disabled={saving}
            onClick={() => setInteractive(!interactive)}>{interactive ? 'Mostrar grade' : 'Testar prévia'}</button>
        </div>
        <fieldset className="editor-form" disabled={saving}>
        <div className="layout-editor__tabs" aria-label="Categorias do editor">
          {Object.entries(PANELS).map(([id, label]) => (
            <button key={id} type="button" aria-pressed={panel === id} disabled={id === 'block' && !inspected}
              onClick={() => {
                setPanel(id);
                if (id === 'identity' || id === 'media' || id === 'general') changeScene('');
              }}>{label}</button>
          ))}
        </div>
        {panel === 'layout' && (
          <>
            <details className="layout-editor__scenes">
              <summary>{scene ? LAYOUT_ITEMS[scene] : 'Tela principal e pop-ups'}</summary>
              <div className="layout-editor__scenes-list">
                {['', ...DIALOG_ITEMS].map((id) => (
                  <button key={id} type="button" aria-pressed={scene === id}
                    onClick={(event) => { changeScene(id); event.currentTarget.closest('details').open = false; }}>
                    {LAYOUT_ITEMS[id] || 'Tela principal'}
                  </button>
                ))}
              </div>
            </details>
            {scene && !rects[scene] && <p>Ative esta seção no menu do Loadscreen para editar a janela.</p>}
            {ids.length > 0 && (
              <div className="layout-editor__heading">
                <strong>{activeId ? LAYOUT_ITEMS[activeId] : `${ids.length} itens selecionados`}</strong>
                <button type="button" onClick={() => select([])} aria-label="Limpar seleção">×</button>
              </div>
            )}
            {values && (
              <div key={activeId} className="layout-editor__dimensions">
                {Object.entries(LAYOUT_FIELDS).map(([key, label]) => (
                  <label key={key}>{label} (%)
                    <input key={values[key]} type="number" min={key === 'width' || key === 'height' ? 1 : 0}
                      max="100" step="0.1" defaultValue={values[key]}
                      onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
                      onBlur={(event) => {
                        const value = event.currentTarget.valueAsNumber;
                        if (!Number.isFinite(value)) {
                          event.currentTarget.value = values[key];
                        } else if (value !== values[key]) {
                          const box = normalizeBox({ ...values, [key]: value });
                          event.currentTarget.value = box[key];
                          onChange({ layout: { ...settings.layout, [activeId]: box } });
                        }
                      }} />
                  </label>
                ))}
              </div>
            )}
            {group && <SelectionTools count={ids.length} gap={gap} onGap={setGap} onArrange={arrange}
              pattern={pattern} rotation={rotation} onPattern={changePattern} onRotation={(value) => {
                if (Number.isFinite(value)) changePattern(pattern, Math.max(-180, Math.min(180, value)));
              }} />}
            <div className="layout-editor__actions">
              <button type="button" disabled={!ids.some((id) => settings.layout[id])}
                onClick={resetSelected}>Restaurar seleção</button>
              <button type="button" disabled={!Object.keys(settings.layout).length}
                onClick={() => { onChange({ layout: {} }); select(ids); }}>Restaurar layout</button>
            </div>
          </>
        )}
        {panel === 'block' && inspected && <strong className="editor-block-title">{LAYOUT_ITEMS[inspected]}</strong>}
        <EditorPanels panel={panel} settings={settings} onChange={onChange} selected={inspected}
          onPick={pick} onVisibility={setVisibility} onScene={changeScene}
          onPreviewVideo={onPreviewVideo} onPreviewStaff={onPreviewStaff} onPreviewKey={onPreviewKey} />
        </fieldset>
        <footer className="layout-editor__footer">
          <button type="button" className="layout-editor__apply" onClick={apply} disabled={saving || settings === saved}>
            {saving ? 'Salvando…' : 'Salvar e aplicar'}
          </button>
          {notice && <p role="status">{notice}</p>}
        </footer>
      </aside>
    </>
  );
}
