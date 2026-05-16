/**
 * Module-level token store.
 * TokenRegistrar component (in App.jsx) calls setTokenGetter() once Clerk loads.
 * All api.js functions call getAuthHeaders() to get the Bearer token.
 */

let _getToken = null

export function setTokenGetter(fn) {
  _getToken = fn
}

export async function getAuthHeaders() {
  if (!_getToken) return {}
  try {
    const token = await _getToken()
    if (!token) return {}
    return { Authorization: `Bearer ${token}` }
  } catch {
    return {}
  }
}
