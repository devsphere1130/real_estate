import { ApiError, request } from '../api/client'
import { expireSession, getToken } from './auth'

/** Every admin call sends the token; a 401 means the session ended, so we log out. */
async function call(method, path, opts = {}) {
  try {
    return await request(method, path, { ...opts, token: getToken() })
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) expireSession()
    throw err
  }
}

export const adminApi = {
  login: (email, password) => request('POST', '/api/admin/login', { body: { email, password } }),
  me: () => call('GET', '/api/admin/me'),
  stats: () => call('GET', '/api/admin/stats'),
  monthStats: (signal) => call('GET', '/api/admin/stats/month', { signal }),

  listings: (params, signal) => call('GET', '/api/admin/listings', { params, signal }),
  listing: (id, signal) => call('GET', `/api/admin/listings/${id}`, { signal }),
  createListing: (body) => call('POST', '/api/admin/listings', { body }),
  updateListing: (id, body) => call('PUT', `/api/admin/listings/${id}`, { body }),
  patchListing: (id, body) => call('PATCH', `/api/admin/listings/${id}`, { body }),
  deleteListing: (id) => call('DELETE', `/api/admin/listings/${id}`),

  uploadPhotos: (id, files) => {
    const form = new FormData()
    files.forEach((file) => form.append('files', file))
    return call('POST', `/api/admin/listings/${id}/photos`, { form })
  },
  deletePhoto: (id, photoId) => call('DELETE', `/api/admin/listings/${id}/photos/${photoId}`),
  setCover: (id, photoId) => call('PATCH', `/api/admin/listings/${id}/photos/${photoId}/cover`),
  reorderPhotos: (id, photoIds) => call('PUT', `/api/admin/listings/${id}/photos/order`, { body: { photo_ids: photoIds } }),

  leads: (params, signal) => call('GET', '/api/admin/leads', { params, signal }),
  patchLead: (id, body) => call('PATCH', `/api/admin/leads/${id}`, { body }),
  deleteLead: (id) => call('DELETE', `/api/admin/leads/${id}`),
}
