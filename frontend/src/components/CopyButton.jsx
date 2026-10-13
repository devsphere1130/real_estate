import { useEffect, useRef, useState } from 'react'
import { CheckIcon, CopyIcon } from './Icons'

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for older browsers / non-secure contexts
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch {
      ok = false
    }
    document.body.removeChild(area)
    return ok
  }
}

export default function CopyButton({ text, label = 'Copy number' }) {
  const [state, setState] = useState('idle') // idle | copied | failed
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  async function handleClick() {
    setState((await copyText(text)) ? 'copied' : 'failed')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setState('idle'), 2200)
  }

  return (
    <>
      <button type="button" className="btn btn-ghost" onClick={handleClick}>
        {state === 'copied' ? <CheckIcon /> : <CopyIcon />}
        <span>{state === 'copied' ? 'Copied' : label}</span>
      </button>
      <span className="sr-only" role="status">
        {state === 'copied' && 'Phone number copied'}
        {state === 'failed' && 'Could not copy. Please select the number and copy it manually.'}
      </span>
    </>
  )
}
