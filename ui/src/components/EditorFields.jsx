import { useId, useLayoutEffect, useRef, useState } from 'react';
import { colorWithOpacity } from '../appearance';

export function EyeToggle({ label, visible, onChange, onLabel }) {
  return (
    <div className="editor-eye-row">
      {onLabel ? <button type="button" className="editor-text-button" onClick={onLabel}>{label}</button> : <span>{label}</span>}
      <button className="editor-eye" type="button" aria-label={label + ' visível'} aria-pressed={visible}
        title={visible ? 'Ocultar ' + label : 'Mostrar ' + label} onClick={() => onChange(!visible)}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <path d="M2 12s3.7-6 10-6 10 6 10 6-3.7 6-10 6S2 12 2 12Z" />
          <circle cx="12" cy="12" r="2.7" />
          {!visible && <path d="M3 3 21 21" />}
        </svg>
      </button>
    </div>
  );
}

export function Field({ label, value, onChange, type = 'text', options, min, max, step = 1, limit, fallback, placeholder }) {
  const id = useId();
  const labelText = <label htmlFor={id}>{label}</label>;
  if (type === 'eye') return <EyeToggle label={label} visible={value ?? fallback ?? true} onChange={onChange} />;
  if (type === 'select') {
    return <div className="editor-field">{labelText}
      <select id={id} value={value ?? fallback ?? ''} onChange={(event) => onChange(event.target.value)}>
        {options.map(([option, text, disabled]) => <option key={option} value={option} disabled={disabled}>{text}</option>)}
      </select></div>;
  }
  if (type === 'number' || type === 'range') {
    return <div className="editor-field">{labelText}
      <input id={id} type={type} min={min} max={max} step={step} value={value ?? fallback ?? min ?? 0}
        onChange={(event) => {
          const next = event.target.valueAsNumber;
          if (Number.isFinite(next)) onChange(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, next)));
          else if (type === 'number') onChange('');
        }}
        onBlur={() => { if (value === '') onChange(fallback ?? min ?? 0); }} />
      {type === 'range' && <output htmlFor={id}>{value ?? fallback ?? min}</output>}
    </div>;
  }
  const Tag = type === 'area' ? 'textarea' : 'input';
  if (type === 'source') {
    return <div className="editor-field">{labelText}
      <input key={value ?? ''} id={id} placeholder={placeholder} defaultValue={value ?? ''} maxLength={limit ?? 260}
        onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
        onBlur={(event) => {
          const next = event.target.value.trim();
          if (next !== value) onChange(next);
        }} />
    </div>;
  }
  return <div className="editor-field">{labelText}
    <Tag id={id} rows={type === 'area' ? 3 : undefined} maxLength={limit} placeholder={placeholder}
      value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
  </div>;
}

export function ColorField({ label, color, onColor, opacity, onOpacity }) {
  const picker = useId();
  const hex = /^#[\da-f]{6}$/i.test(color) ? color : '#ffffff';
  return (
    <div className="editor-color-field">
      <label htmlFor={picker}>{label}</label>
      <div>
        <input id={picker} type="color" value={hex} onChange={(event) => onColor(event.target.value)} />
        <input key={hex} aria-label={label + ' hexadecimal'} defaultValue={hex} maxLength={7}
          onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
          onBlur={(event) => {
            const next = event.target.value.trim();
            if (/^#[\da-f]{6}$/i.test(next)) {
              if (next !== hex) onColor(next);
            } else event.target.value = hex;
          }} />
        {onOpacity && <label className="editor-alpha">
          <span>Opacidade</span>
          <input type="range" min="0" max="100" step="1" value={Math.round(opacity * 100)}
            onChange={(event) => onOpacity(Number(event.target.value) / 100)} />
          <output>{Math.round(opacity * 100)}%</output>
        </label>}
      </div>
    </div>
  );
}

function splitColor(raw) {
  if (/^#[\da-f]{6}$/i.test(raw)) return [raw, 1];
  if (/^#[\da-f]{3}$/i.test(raw)) return ['#' + raw.slice(1).split('').map((char) => char + char).join(''), 1];
  const parts = /^rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\s*\)$/.exec(raw);
  if (!parts) return ['#ffffff', 1];
  return ['#' + parts.slice(1, 4).map((part) => Math.min(255, Number(part)).toString(16).padStart(2, '0')).join(''),
    parts[4] === undefined ? 1 : Math.min(1, Number(parts[4]))];
}

export function PaletteColor({ label, value, onChange }) {
  const [hex, alpha] = splitColor(value);
  const change = (color, opacity) => onChange(opacity === 1 ? color : colorWithOpacity(color, opacity));
  return <ColorField label={label} color={hex} opacity={alpha}
    onColor={(color) => change(color, alpha)} onOpacity={(opacity) => change(hex, opacity)} />;
}

let nextListKey = 0;

export function RecordList({ title, entries, limit, create, describe, onChange, render }) {
  const keys = useRef([]);
  const [opened, setOpened] = useState(null);
  const scrollToNew = useRef(false);
  const openRecord = useRef(null);
  while (keys.current.length < entries.length) keys.current.push(++nextListKey);
  keys.current.length = entries.length;
  useLayoutEffect(() => {
    if (!scrollToNew.current) return;
    scrollToNew.current = false;
    openRecord.current?.scrollIntoView({ block: 'nearest' });
  }, [opened]);

  function add() {
    const key = ++nextListKey;
    keys.current.push(key);
    scrollToNew.current = true;
    setOpened(key);
    onChange([...entries, create()]);
  }
  function move(index, target) {
    const next = entries.slice();
    [next[index], next[target]] = [next[target], next[index]];
    const present = keys.current;
    [present[index], present[target]] = [present[target], present[index]];
    onChange(next);
  }
  return (
    <section className="editor-records">
      <div className="layout-editor__heading">
        <strong>{title}</strong>
        <button type="button" disabled={entries.length >= limit} onClick={add}>Adicionar</button>
      </div>
      {entries.map((entry, index) => {
        const key = keys.current[index];
        const open = key === opened;
        return (
          <details key={key} open={open} ref={open ? openRecord : undefined}>
            <summary onClick={(event) => {
              event.preventDefault();
              setOpened(open ? null : key);
            }}>{describe(entry, index) || 'Novo item'}</summary>
            {open && <div className="editor-record">
              {render(entry, (value) => onChange(entries.map((item, i) => i === index ? value : item)), index)}
              <div className="layout-editor__actions">
                <button type="button" disabled={index === 0} onClick={() => move(index, index - 1)}>Subir</button>
                <button type="button" disabled={index === entries.length - 1} onClick={() => move(index, index + 1)}>Descer</button>
                <button type="button" onClick={() => {
                  keys.current.splice(index, 1);
                  setOpened(null);
                  onChange(entries.filter((_, i) => i !== index));
                }}>Remover</button>
              </div>
            </div>}
          </details>
        );
      })}
    </section>
  );
}
