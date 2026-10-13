import { useState } from 'react'

/**
 * Thumbnails that can be reordered by dragging OR with the arrow buttons (keyboard friendly).
 * items: [{ key, url, isCover }]   The first photo is shown first on the website.
 */
export default function PhotoGrid({ items, onReorder, onCover, onRemove, disabled = false }) {
  const [dragKey, setDragKey] = useState(null)
  const [overKey, setOverKey] = useState(null)

  const move = (from, to) => {
    if (to < 0 || to >= items.length || from === to) return
    const keys = items.map((i) => i.key)
    const [moved] = keys.splice(from, 1)
    keys.splice(to, 0, moved)
    onReorder(keys)
  }

  function onDrop(targetKey) {
    const from = items.findIndex((i) => i.key === dragKey)
    const to = items.findIndex((i) => i.key === targetKey)
    setDragKey(null)
    setOverKey(null)
    if (from >= 0 && to >= 0) move(from, to)
  }

  if (items.length === 0) return null

  return (
    <ul className="photo-grid">
      {items.map((item, index) => (
        <li
          key={item.key}
          className={`photo-item ${item.key === dragKey ? 'is-dragging' : ''} ${item.key === overKey && dragKey !== item.key ? 'is-over' : ''}`}
          draggable={!disabled}
          onDragStart={(e) => {
            setDragKey(item.key)
            e.dataTransfer.effectAllowed = 'move'
            e.dataTransfer.setData('text/plain', String(item.key))
          }}
          onDragOver={(e) => {
            if (dragKey === null) return
            e.preventDefault()
            setOverKey(item.key)
          }}
          onDrop={(e) => {
            e.preventDefault()
            onDrop(item.key)
          }}
          onDragEnd={() => {
            setDragKey(null)
            setOverKey(null)
          }}
        >
          <img src={item.url} alt={`Photo ${index + 1}${item.isCover ? ' (cover)' : ''}`} draggable={false} />
          {item.isCover && <span className="photo-cover-badge">Cover</span>}
          <div className="photo-tools">
            <button type="button" disabled={disabled || index === 0} onClick={() => move(index, index - 1)} aria-label={`Move photo ${index + 1} earlier`}>
              ←
            </button>
            <button type="button" disabled={disabled || index === items.length - 1} onClick={() => move(index, index + 1)} aria-label={`Move photo ${index + 1} later`}>
              →
            </button>
            {!item.isCover && (
              <button type="button" disabled={disabled} onClick={() => onCover(item.key)}>
                Set cover<span className="sr-only"> for photo {index + 1}</span>
              </button>
            )}
            <button type="button" className="photo-remove" disabled={disabled} onClick={() => onRemove(item.key)}>
              Remove<span className="sr-only"> photo {index + 1}</span>
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
