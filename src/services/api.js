/**
 * api.js — Axios HTTP client for the Divider MES backend
 *
 * Base: /wp-json/factory/v1/  (Headless WordPress / Node on AWS)
 * Auth: Bearer token stored in localStorage under 'mes_auth_token'
 * Offline resilience: POST/PUT/PATCH failures are queued via syncManager
 */

import axios from 'axios'
import { syncManager } from './syncManager.js'

// ─── Environment config ────────────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/wp-json/factory/v1/'
const TIMEOUT_MS = 12_000 // 12 s — generous for factory Wi-Fi

// ─── Create the axios instance ────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// ─── REQUEST INTERCEPTOR ─────────────────────────────────────────────────
// Attach Bearer token on every outbound request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('mes_auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Tag the request timestamp for latency logging
    config.metadata = { startTime: Date.now() }

    return config
  },
  (error) => Promise.reject(error),
)

// ─── RESPONSE INTERCEPTOR ────────────────────────────────────────────────
api.interceptors.response.use(
  // ✅ Success — pass through
  (response) => {
    const duration = Date.now() - (response.config?.metadata?.startTime ?? Date.now())
    if (import.meta.env.DEV) {
      console.info(`[API] ${response.config.method?.toUpperCase()} ${response.config.url} → ${response.status} (${duration}ms)`)
    }
    return response
  },

  // ❌ Error — handle network failures and 4xx/5xx
  async (error) => {
    const { config, response, code } = error

    const isMutating = ['post', 'put', 'patch', 'delete'].includes(
      config?.method?.toLowerCase() ?? '',
    )

    const isNetworkFailure =
      !response &&                           // no server response at all
      (code === 'ECONNABORTED' ||            // timeout
       code === 'ERR_NETWORK' ||             // offline / DNS fail
       code === 'ERR_INTERNET_DISCONNECTED' ||
       !navigator.onLine)                    // browser reports offline

    // ── Offline / Timeout → queue the payload for later sync ──────────
    if (isMutating && isNetworkFailure && config) {
      const queuedItem = {
        url: config.url,
        method: config.method,
        data: (() => {
          // Safely parse stringified JSON data back to an object
          try {
            return typeof config.data === 'string'
              ? JSON.parse(config.data)
              : config.data ?? {}
          } catch {
            return config.data ?? {}
          }
        })(),
        headers: {
          // Forward auth header so the retry also authenticates
          Authorization: config.headers?.Authorization ?? '',
          'Content-Type': 'application/json',
        },
        enqueuedAt: new Date().toISOString(),
      }

      syncManager.enqueue(queuedItem)

      if (import.meta.env.DEV) {
        console.warn('[API] Offline — queued payload:', queuedItem)
      }

      // Return a resolved "offline" response so the caller doesn't crash
      return Promise.resolve({
        data: { offline: true, queued: true, payload: queuedItem },
        status: 0,
        statusText: 'OFFLINE',
        headers: {},
        config,
      })
    }

    // ── 401 Unauthorized — token expired, redirect to login ───────────
    if (response?.status === 401) {
      localStorage.removeItem('mes_auth_token')
      window.location.href = '/login'
    }

    // ── 403 Forbidden ─────────────────────────────────────────────────
    if (response?.status === 403) {
      console.error('[API] 403 Forbidden — insufficient permissions for:', config?.url)
    }

    // ── 5xx Server errors — log and propagate ─────────────────────────
    if (response?.status >= 500) {
      console.error('[API] Server error:', response.status, response.data)
    }

    return Promise.reject(error)
  },
)

// ─── Typed endpoint helpers ───────────────────────────────────────────────
// Using thin wrappers so callers stay clean and decoupled from axios.

/**
 * Auth
 */
export const authAPI = {
  /** Obtain JWT from WP JWT Auth or Node auth endpoint */
  login: (username, password) =>
    api.post('/auth/login', { username, password }),

  /** Verify a manager PIN (server-side hash comparison) */
  verifyPin: (pin) =>
    api.post('/auth/verify-pin', { pin }),

  /** Refresh an expiring token */
  refresh: () =>
    api.post('/auth/refresh'),
}

/**
 * Production Ledger
 */
export const ledgerAPI = {
  /** Bulk-save an array of production entries for the current shift */
  saveBatch: (entries) =>
    api.post('/ledger/batch', { entries }),

  /** Single entry save */
  saveEntry: (entry) =>
    api.post('/ledger', entry),

  /** Fetch entries for a given production week */
  getWeek: (week) =>
    api.get('/ledger', { params: { week } }),
}

/**
 * Inventory
 */
export const inventoryAPI = {
  getAll: () =>
    api.get('/inventory'),

  adjust: (itemId, delta, reason) =>
    api.patch(`/inventory/${itemId}`, { delta, reason }),
}

/**
 * Dispatch / Logistics
 */
export const dispatchAPI = {
  confirm: (payload) =>
    api.post('/dispatch', payload),

  getLogs: (week) =>
    api.get('/dispatch', { params: { week } }),
}

/**
 * Payroll
 */
export const payrollAPI = {
  getWeekly: (week) =>
    api.get('/payroll', { params: { week } }),

  saveCashEntry: (entry) =>
    api.post('/payroll/cash', entry),
}

/**
 * Downtime
 */
export const downtimeAPI = {
  create: (session) =>
    api.post('/downtime', session),

  resolve: (id, notes) =>
    api.patch(`/downtime/${id}/resolve`, { notes }),

  getLogs: (week) =>
    api.get('/downtime', { params: { week } }),
}

/**
 * Settings / Config
 */
export const settingsAPI = {
  getPieceRates: () =>
    api.get('/settings/piece-rates'),

  savePieceRates: (rates) =>
    api.put('/settings/piece-rates', { rates }),

  getThresholds: () =>
    api.get('/settings/thresholds'),

  saveThresholds: (thresholds) =>
    api.put('/settings/thresholds', thresholds),
}

export default api
