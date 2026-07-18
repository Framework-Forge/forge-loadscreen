import { KEYBOARD_LAYOUT_MAIN, KEYBOARD_LAYOUT_NAV, KEYBOARD_LAYOUT_NUMPAD } from '../config';
import './Keyboard.css';

const ROW_COUNT = Math.max(
  KEYBOARD_LAYOUT_MAIN.length,
  KEYBOARD_LAYOUT_NAV.length,
  KEYBOARD_LAYOUT_NUMPAD.length
);

function KeySegment({ row, keys, getKeyState, onKeyClick, align }) {
  if (!row || row.length === 0) return <div className={`keyboard__segment keyboard__segment--${align}`} />;
  return (
    <div className={`keyboard__segment keyboard__segment--${align}`}>
      {row.map(({ id, label, width }) => {
        const { enabled, info } = getKeyState(id);
        return (
          <button
            key={id}
            type="button"
            className={`keyboard__key ${enabled ? 'keyboard__key--enabled' : ''}`}
            style={{ '--key-width': width }}
            onClick={() => onKeyClick && onKeyClick(id, info)}
          >
            <span className="keyboard__key-label">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Visual 100% keyboard: one row per line with main, nav, numpad on the same line.
 */
export default function Keyboard({ keys = {}, onKeyClick }) {
  const getKeyState = (id) => {
    const entry = keys[id];
    if (!entry) return { enabled: false, info: '' };
    const enabled = entry.enabled === true;
    const info = (entry.info ?? '').trim();
    return { enabled, info };
  };

  return (
    <div className="keyboard">
      {Array.from({ length: ROW_COUNT }, (_, rowIdx) => (
        <div key={rowIdx} className="keyboard__row">
          <KeySegment
            row={KEYBOARD_LAYOUT_MAIN[rowIdx]}
            keys={keys}
            getKeyState={getKeyState}
            onKeyClick={onKeyClick}
            align="main"
          />
          <div className="keyboard__block-gap" aria-hidden />
          <KeySegment
            row={KEYBOARD_LAYOUT_NAV[rowIdx]}
            keys={keys}
            getKeyState={getKeyState}
            onKeyClick={onKeyClick}
            align="nav"
          />
          <div className="keyboard__block-gap" aria-hidden />
          <KeySegment
            row={KEYBOARD_LAYOUT_NUMPAD[rowIdx]}
            keys={keys}
            getKeyState={getKeyState}
            onKeyClick={onKeyClick}
            align="numpad"
          />
        </div>
      ))}
    </div>
  );
}
