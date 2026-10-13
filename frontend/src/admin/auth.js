// Admin token storage.
// sessionStorage keeps the token only for this browser tab (it is gone when the tab closes), which is
// safer than localStorage for an admin panel. If storage is blocked we fall back to memory.
const KEY = 'devsphere-admin-token'
let memoryToken = null
const listeners = new Set()

export function getToken() {
  try {
    return sessionStorage.getItem(KEY) || memoryToken
  } catch {
    return memoryToken
  }
}

export function setToken(token) {
  memoryToken = token
  try {
    sessionStorage.setItem(KEY, token)
  } catch {
    /* memory fallback */
  }
}

export function clearToken() {
  memoryToken = null
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

/** Seconds-since-epoch expiry from the JWT payload, or null if unreadable. */
export function tokenExpiry(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(payload)).exp ?? null
  } catch {
    return null
  }
}

export function isExpired(token) {
  const exp = tokenExpiry(token)
  return exp !== null && exp * 1000 <= Date.now()
}

/** Called when the API says 401: forget the token and tell the app to go back to the login page. */
export function expireSession() {
  clearToken()
  listeners.forEach((fn) => fn())
}

export function onSessionExpired(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
