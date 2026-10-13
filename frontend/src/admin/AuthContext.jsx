import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { adminApi } from './adminApi'
import { clearToken, getToken, isExpired, onSessionExpired, setToken, tokenExpiry } from './auth'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

const EXPIRED_NOTICE = 'Your session has ended. Please log in again.'

export function AuthProvider({ children }) {
  const [state, setState] = useState(() => {
    const token = getToken()
    if (token && !isExpired(token)) return { status: 'checking', admin: null, notice: '' }
    clearToken()
    return { status: 'out', admin: null, notice: '' }
  })

  // On first load, confirm a stored token is still accepted by the server.
  useEffect(() => {
    if (state.status !== 'checking') return
    adminApi
      .me()
      .then((admin) => setState({ status: 'in', admin, notice: '' }))
      .catch(() => {
        clearToken()
        setState({ status: 'out', admin: null, notice: '' })
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The API answered 401 somewhere: go back to login.
  useEffect(() => onSessionExpired(() => setState({ status: 'out', admin: null, notice: EXPIRED_NOTICE })), [])

  // Log out automatically when the token's own expiry time arrives.
  useEffect(() => {
    if (state.status !== 'in') return
    const exp = tokenExpiry(getToken() || '')
    if (!exp) return
    const ms = Math.min(exp * 1000 - Date.now(), 2 ** 31 - 1)
    const timer = setTimeout(() => {
      clearToken()
      setState({ status: 'out', admin: null, notice: EXPIRED_NOTICE })
    }, Math.max(ms, 0))
    return () => clearTimeout(timer)
  }, [state.status])

  const login = useCallback(async (email, password) => {
    const { access_token } = await adminApi.login(email, password)
    setToken(access_token)
    const admin = await adminApi.me()
    setState({ status: 'in', admin, notice: '' })
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setState({ status: 'out', admin: null, notice: '' })
  }, [])

  const value = useMemo(() => ({ ...state, login, logout }), [state, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
