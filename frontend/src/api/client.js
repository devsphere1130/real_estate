const BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, status, fields = {}) {
    super(message)
    this.status = status
    this.fields = fields // { fieldName: "message" } for 422 validation errors
  }
}

function parseError(status, body) {
  const detail = body?.detail
  if (typeof detail === 'string') return new ApiError(detail, status)
  if (Array.isArray(detail)) {
    const fields = {}
    for (const item of detail) {
      const field = item.loc?.[item.loc.length - 1]
      if (typeof field === 'string' && !fields[field]) {
        fields[field] = String(item.msg || 'Invalid value').replace(/^Value error, /, '')
      }
    }
    return new ApiError('Please check the highlighted fields.', status, fields)
  }
  return new ApiError('Something went wrong. Please try again.', status)
}

/**
 * Low-level request. `body` is sent as JSON, `form` (FormData) as multipart, `token` as a Bearer header.
 */
export async function request(method, path, { params, body, form, token, signal } = {}) {
  const url = new URL(BASE + path)
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value)
  }

  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (body) headers['Content-Type'] = 'application/json'

  let response
  try {
    response = await fetch(url, {
      method,
      signal,
      headers,
      body: form ?? (body ? JSON.stringify(body) : undefined),
    })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new ApiError('Cannot reach the server. Check your internet connection and try again.', 0)
  }

  const data = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) throw parseError(response.status, data)
  return data
}

export const api = {
  get: (path, params, signal) => request('GET', path, { params, signal }),
  post: (path, body) => request('POST', path, { body }),
}

/** Photo URLs from the API are paths like /uploads/abc.jpg. */
export const assetUrl = (path) => (path ? BASE + path : null)

export const listingsApi = {
  list: (params, signal) => api.get('/api/listings', params, signal),
  get: (refCode, signal) => api.get(`/api/listings/${encodeURIComponent(refCode)}`, undefined, signal),
}

export const submitLead = (payload) => api.post('/api/leads', payload)
