import { useEffect, useRef } from 'react';
import './DeleteConfirmDialog.scss';

/**
 * Phase 1 plan #18: every Delete action (node, group of nodes, connection)
 * must open a confirmation dialog before any UI or backend mutation. The
 * dialog states what will be deleted and lists the impact (every incident
 * connection that will also be removed) so the user understands the full
 * effect before confirming. Cancel leaves state unchanged; Confirm
 * triggers the deletion (which then persists through the autosave
 * effect, satisfying plan #19).
 *
 * Lives inside the canvas folder per universal principle #10 (canvas
 * isolation).
 */
const DeleteConfirmDialog = ({ summary, impactItems, onConfirm, onCancel }) => {
  const confirmRef = useRef(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCancel();
      } else if (event.key === 'Enter') {
        event.stopPropagation();
        onConfirm();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onCancel, onConfirm]);

  return (
    <div
      className="delete-confirm-dialog__backdrop"
      role="presentation"
      onPointerDown={(event) => {
        // Click on backdrop = cancel.
        if (event.target === event.currentTarget) onCancel();
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div
        className="delete-confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-confirm-dialog-title"
      >
        <div className="delete-confirm-dialog__header">
          <span className="delete-confirm-dialog__icon" aria-hidden="true">
            ✕
          </span>
          <span className="delete-confirm-dialog__title" id="delete-confirm-dialog-title">
            {summary}
          </span>
        </div>

        {impactItems && impactItems.length > 0 ? (
          <div className="delete-confirm-dialog__impact">
            <div className="delete-confirm-dialog__impact-label">
              Connections that will also be removed:
            </div>
            <ul className="delete-confirm-dialog__impact-list">
              {impactItems.map((item) => (
                <li key={item.id} className="delete-confirm-dialog__impact-item">
                  <span className="delete-confirm-dialog__impact-from">{item.from}</span>
                  <span className="delete-confirm-dialog__impact-arrow" aria-hidden="true">
                    →
                  </span>
                  <span className="delete-confirm-dialog__impact-to">{item.to}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="delete-confirm-dialog__impact delete-confirm-dialog__impact--empty">
            No other connections will be affected.
          </div>
        )}

        <div className="delete-confirm-dialog__actions">
          <button
            type="button"
            className="delete-confirm-dialog__btn delete-confirm-dialog__btn--cancel"
            title="Cancel"
            aria-label="Cancel"
            onClick={onCancel}
          >
            <span aria-hidden="true">✕</span>
          </button>
          <button
            ref={confirmRef}
            type="button"
            className="delete-confirm-dialog__btn delete-confirm-dialog__btn--confirm"
            title="Confirm delete"
            aria-label="Confirm delete"
            onClick={onConfirm}
          >
            <span aria-hidden="true">✓</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmDialog;
