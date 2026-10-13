import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Scroll to the top on page changes, or to the #section when the URL has one.
 * Content above a section (e.g. listings that load after the page opens) can change height and push the
 * section down, so for a short while we keep it in place, unless the visitor starts scrolling.
 */
export default function ScrollManager() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0)
      return
    }

    let userScrolled = false
    const stop = () => {
      userScrolled = true
    }
    const target = () => document.getElementById(hash.slice(1))
    const align = (behavior) => {
      if (!userScrolled) target()?.scrollIntoView({ behavior })
    }

    const first = setTimeout(() => {
      align('smooth')
      target()?.focus({ preventScroll: true })
    }, 50)
    const observer = new ResizeObserver(() => align('auto'))
    observer.observe(document.body)
    const done = setTimeout(() => observer.disconnect(), 2500)

    const events = ['wheel', 'touchstart', 'keydown', 'mousedown']
    events.forEach((e) => window.addEventListener(e, stop, { passive: true, once: true }))

    return () => {
      clearTimeout(first)
      clearTimeout(done)
      observer.disconnect()
      events.forEach((e) => window.removeEventListener(e, stop))
    }
  }, [pathname, hash])

  return null
}
