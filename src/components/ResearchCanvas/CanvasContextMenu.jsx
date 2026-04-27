import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './CanvasContextMenu.scss';

/**
 * Icon-first contextual menu for canvas elements.
 *
 * Phase 1 actions: delete (single or group). Future phases extend `items`
 * with release-connection-side, copy-deep-link, suggest-edit, etc.
 *
 * Lives inside the ResearchCanvas folder per universal principle 10
 * (canvas isolation): it is part of the canvas internals and is not
 * exported or used by any code outside this folder.
 */
const CanvasContextMenu = ({ x, y, items, onClose }) => {
  const ref = useRef(null);
  const [position, setPosition] = useState({ left: x, top: y });

  useEffect(() => {
    const onPointerDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) onClose();
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  // Clamp inside viewport to keep menu fully visible.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pad = 8;
    let left = x;
    let top = y;
    if (left + rect.width + pad > window.innerWidth) {
      left = Math.max(pad, window.innerWidth - rect.width - pad);
    }
    if (top + rect.height + pad > window.innerHeight) {
      top = Math.max(pad, window.innerHeight - rect.height - pad);
    }
    setPosition({ left, top });
  }, [x, y]);

  return (
    <div
      ref={ref}
      className="canvas-context-menu"
      style={{ left: `${position.left}px`, top: `${position.top}px` }}
      role="menu"
      onPointerDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          className={`canvas-context-menu__item canvas-context-menu__item--${item.id}`}
          title={item.label}
          aria-label={item.label}
          onClick={(event) => {
            event.stopPropagation();
            item.onSelect();
            onClose();
          }}
        >
          <span className="canvas-context-menu__icon" aria-hidden="true">{item.icon}</span>
        </button>
      ))}
    </div>
  );
};

export default CanvasContextMenu;
