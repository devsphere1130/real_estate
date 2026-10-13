import { useEffect, useId, useRef } from 'react'

/** Confirmation step before something destructive. Uses the native <dialog> so focus and Escape just work. */
export default function ConfirmDialog({ open, title, children, confirmLabel = 'Delete', busy = false, onConfirm, onCancel }) {
  const ref = useRef(null)
  const cancelRef = useRef(null)
  const id = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      cancelRef.current?.focus() // safest default: Cancel
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={`${id}-title`}
      onCancel={(e) => {
        e.preventDefault()
        if (!busy) onCancel()
      }}
      onClick={(e) => {
        if (e.target === ref.current && !busy) onCancel()
      }}
    >
      <div className="dialog-body">
        <h2 id={`${id}-title`}>{title}</h2>
        <div className="dialog-text">{children}</div>
        <div className="dialog-actions">
          <button type="button" ref={cancelRef} className="btn btn-ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={busy}>
            {busy ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
