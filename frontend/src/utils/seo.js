import { useEffect } from 'react'
import { site } from '../config/site'

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

const JSON_LD_ID = 'page-json-ld'

/**
 * Sets the page title, meta description, canonical URL and social-share tags for the current page.
 * Pass `jsonLd` (an object) to add structured data for search engines.
 */
export function useSeo({ title, description, image, jsonLd }) {
  const ld = jsonLd ? JSON.stringify(jsonLd) : null

  useEffect(() => {
    if (!title) return
    const full = title.includes(site.name) ? title : `${title} | ${site.name}`
    const base = site.url.replace(/\/$/, '')
    const url = base + window.location.pathname
    const shareImage = image || `${base}/og-image.png`

    document.title = full
    setCanonical(url)
    setMeta('property', 'og:title', full)
    setMeta('property', 'og:type', 'website')
    setMeta('property', 'og:url', url)
    setMeta('property', 'og:image', shareImage)
    setMeta('name', 'twitter:card', 'summary_large_image')
    if (description) {
      setMeta('name', 'description', description)
      setMeta('property', 'og:description', description)
    }
  }, [title, description, image])

  useEffect(() => {
    document.getElementById(JSON_LD_ID)?.remove()
    if (!ld) return
    const script = document.createElement('script')
    script.id = JSON_LD_ID
    script.type = 'application/ld+json'
    script.textContent = ld
    document.head.appendChild(script)
    return () => script.remove()
  }, [ld])
}
