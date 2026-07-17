import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Helper: Amharic abbreviation → English label
const PLACEMENT_LABELS = { 'ብተና': 'Bitena', 'ውስጥ': 'Wist', 'የተለየ': 'Yetelayi' }

export const useMesStore = defineStore('mes', () => {
  // ─── Operator State ────────────────────────────────────────────────────────
  const activeOperator = ref(null)
  const clockedInOperators = ref({}) // { operatorId: clockInTimestamp }

  const operators = ref([
    { id: 1, name: 'Zelalem', role: 'Line Operator', avatar: 'Z', color: 'from-emerald-600 to-teal-700' },
    { id: 2, name: 'Aben',    role: 'Line Operator', avatar: 'A', color: 'from-blue-600 to-indigo-700' },
    { id: 3, name: 'Teme',    role: 'Line Operator', avatar: 'T', color: 'from-violet-600 to-purple-700' },
    { id: 4, name: 'Selam',   role: 'Supervisor',    avatar: 'S', color: 'from-amber-600 to-orange-700' },
    { id: 5, name: 'Biruk',   role: 'Line Operator', avatar: 'B', color: 'from-rose-600 to-pink-700' },
    { id: 6, name: 'Meron',   role: 'Line Operator', avatar: 'M', color: 'from-cyan-600 to-sky-700' },
  ])

  const isOperatorClockedIn = computed(() => (id) => !!clockedInOperators.value[id])

  function clockIn(operator) {
    clockedInOperators.value[operator.id] = new Date().toISOString()
    activeOperator.value = operator
  }

  function clockOut(operator) {
    delete clockedInOperators.value[operator.id]
    if (activeOperator.value?.id === operator.id) {
      // Hand off to another clocked-in operator if any
      const remaining = Object.keys(clockedInOperators.value)
      activeOperator.value = remaining.length
        ? operators.value.find(o => o.id === Number(remaining[0])) ?? null
        : null
    }
  }

  function setOperator(operator) {
    activeOperator.value = operator
  }

  // ─── Production Week ───────────────────────────────────────────────────────
  const currentProductionWeek = ref(getCurrentWeekLabel())

  function getCurrentWeekLabel() {
    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const week = Math.ceil(((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7)
    return `W${String(week).padStart(2, '0')}-${now.getFullYear()}`
  }

  function setProductionWeek(label) {
    currentProductionWeek.value = label
  }

  // ─── Production Ledger ─────────────────────────────────────────────────────
  const ledgerEntries = ref([])

  function saveProductionEntry(entry) {
    ledgerEntries.value.push({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      week: currentProductionWeek.value,
      operator: activeOperator.value?.name ?? 'Unknown',
      ...entry,
    })
  }

  // Weekly aggregation for payroll
  const weeklyAggregation = computed(() => {
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    const groups = { 'M&T': [], 'W&T': [], 'F&S': [] }
    ledgerEntries.value.forEach(e => {
      const d = new Date(e.timestamp).getDay()
      if (d === 1 || d === 2) groups['M&T'].push(e)
      else if (d === 3 || d === 4) groups['W&T'].push(e)
      else if (d === 5 || d === 6) groups['F&S'].push(e)
    })
    const sum = (arr) => arr.reduce((a, b) => a + (Number(b.goodProduction) || 0), 0)
    const mt = sum(groups['M&T'])
    const wt = sum(groups['W&T'])
    const fs = sum(groups['F&S'])
    return { 'M&T': mt, 'W&T': wt, 'F&S': fs, TOTAL: mt + wt + fs }
  })

  // ─── Inventory ─────────────────────────────────────────────────────────────
  const inventory = ref([
    { id: 1, name: 'Wire',       unit: 'kg',  qty: 0 },
    { id: 2, name: 'Chaf',       unit: 'kg',  qty: 0 },
    { id: 3, name: 'Shibo',      unit: 'pcs', qty: 0 },
    { id: 4, name: 'Plaster',    unit: 'kg',  qty: 0 },
    { id: 5, name: 'Paper Fuse', unit: 'pcs', qty: 0 },
    { id: 6, name: 'Lead Cm',    unit: 'cm',  qty: 0 },
    { id: 7, name: 'Glue Stucko',unit: 'kg',  qty: 0 },
  ])

  function adjustInventory(itemId, delta) {
    const item = inventory.value.find(i => i.id === itemId)
    if (item) item.qty = Math.max(0, item.qty + delta)
  }

  // ─── Cash Advances ─────────────────────────────────────────────────────────
  const cashEntries = ref([])

  function addCashEntry(entry) {
    cashEntries.value.push({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      week: currentProductionWeek.value,
      operator: activeOperator.value?.name ?? 'Unknown',
      ...entry,
    })
  }

  const totalAdvances = computed(() =>
    cashEntries.value.filter(e => e.type === 'advance').reduce((s, e) => s + Number(e.amount), 0)
  )
  const totalExpenses = computed(() =>
    cashEntries.value.filter(e => e.type === 'expense').reduce((s, e) => s + Number(e.amount), 0)
  )

  // ─── Dispatch / Logistics ───────────────────────────────────────────────────
  const dispatchLogs = ref([])

  const clients = ref([
    'Addis Ababa Main',
    'Hawassa Depot',
    'Dire Dawa Branch',
    'Bahir Dar Store',
    'Mekelle Outlet',
    'Adama Warehouse',
  ])

  function addDispatch(entry) {
    dispatchLogs.value.push({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      week: currentProductionWeek.value,
      dispatchedBy: activeOperator.value?.name ?? 'Unknown',
      ...entry,
    })
  }

  const totalDispatched = computed(() =>
    dispatchLogs.value.reduce((s, e) => s + Number(e.quantity), 0)
  )

  // ─── Admin Config — Piece Rates & Thresholds ───────────────────────────────
  // Matrix: dividerType × size × placement → ETB per piece
  const pieceRates = ref({
    '50': { '9cm': { 'ብተና': 2.50, 'ውስጥ': 3.00, 'የተለየ': 3.50 }, '7cm': { 'ብተና': 2.00, 'ውስጥ': 2.50, 'የተለየ': 3.00 } },
    '40': { '9cm': { 'ብተና': 2.25, 'ውስጥ': 2.75, 'የተለየ': 3.25 }, '7cm': { 'ብተና': 1.75, 'ውስጥ': 2.25, 'የተለየ': 2.75 } },
    '30': { '9cm': { 'ብተና': 2.00, 'ውስጥ': 2.50, 'የተለየ': 3.00 }, '7cm': { 'ብተና': 1.50, 'ውስጥ': 2.00, 'የተለየ': 2.50 } },
    '16': { '9cm': { 'ብተና': 1.75, 'ውስጥ': 2.25, 'የተለየ': 2.75 }, '7cm': { 'ብተና': 1.25, 'ውስጥ': 1.75, 'የተለየ': 2.25 } },
    '12': { '9cm': { 'ብተና': 1.50, 'ውስጥ': 2.00, 'የተለየ': 2.50 }, '7cm': { 'ብተና': 1.00, 'ውስጥ': 1.50, 'የተለየ': 2.00 } },
    '45': { '9cm': { 'ብተና': 2.40, 'ውስጥ': 2.90, 'የተለየ': 3.40 }, '7cm': { 'ብተና': 1.90, 'ውስጥ': 2.40, 'የተለየ': 2.90 } },
  })

  function setPieceRate(dividerType, size, placement, rate) {
    if (!pieceRates.value[dividerType]) pieceRates.value[dividerType] = {}
    if (!pieceRates.value[dividerType][size]) pieceRates.value[dividerType][size] = {}
    pieceRates.value[dividerType][size][placement] = Number(rate)
  }

  // Waste alert thresholds (% of total production)
  const wasteThresholds = ref({
    warn:     8,   // amber alert
    critical: 15,  // red alert
  })

  function setWasteThreshold(level, value) {
    wasteThresholds.value[level] = Math.max(0, Math.min(100, Number(value)))
  }

  // System config flags
  const systemConfig = ref({
    autoPauseOnDowntime: true,
    requireOperatorForEntry: true,
    telegramBotEnabled: false,
    telegramChatId: '',
    exportRecipient: 'Frezer',
  })

  function updateSystemConfig(key, value) {
    systemConfig.value[key] = value
  }

  // ─── Analytics Computeds ───────────────────────────────────────────────────
  // Per-operator efficiency: { name, good, waste, wastePercent }
  const operatorEfficiency = computed(() => {
    return operators.value.map(op => {
      const entries = ledgerEntries.value.filter(e => e.operator === op.name)
      const good  = entries.reduce((s, e) => s + (Number(e.goodProduction) || 0), 0)
      const waste = entries.reduce((s, e) => s + (Number(e.wasteMaterial)  || 0), 0)
      const total = good + waste
      const wastePercent = total > 0 ? +((waste / total) * 100).toFixed(1) : 0
      return { ...op, good, waste, total, wastePercent }
    }).sort((a, b) => a.wastePercent - b.wastePercent)
  })

  // Last 7 calendar-day production totals (for trend chart)
  const sevenDayTrend = computed(() => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const label = d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit' })
      const dayStr = d.toISOString().slice(0, 10)
      const good  = ledgerEntries.value
        .filter(e => e.timestamp.startsWith(dayStr))
        .reduce((s, e) => s + (Number(e.goodProduction) || 0), 0)
      const waste = ledgerEntries.value
        .filter(e => e.timestamp.startsWith(dayStr))
        .reduce((s, e) => s + (Number(e.wasteMaterial) || 0), 0)
      days.push({ label, good, waste })
    }
    return days
  })

  const totalGoodAllTime   = computed(() => ledgerEntries.value.reduce((s,e) => s + (Number(e.goodProduction)||0), 0))
  const totalWasteAllTime  = computed(() => ledgerEntries.value.reduce((s,e) => s + (Number(e.wasteMaterial)||0), 0))
  const overallWastePct    = computed(() => {
    const total = totalGoodAllTime.value + totalWasteAllTime.value
    return total > 0 ? +((totalWasteAllTime.value / total) * 100).toFixed(1) : 0
  })

  // ─── Downtime ──────────────────────────────────────────────────────────────
  const downtimeSessions = ref([])
  const activeDowntime = ref(null)

  function startDowntime(reason) {
    if (activeDowntime.value) return
    activeDowntime.value = {
      id: Date.now(),
      reason,
      startTime: new Date().toISOString(),
      operator: activeOperator.value?.name ?? 'Unknown',
    }
  }

  function resolveDowntime(notes = '') {
    if (!activeDowntime.value) return
    const session = {
      ...activeDowntime.value,
      endTime: new Date().toISOString(),
      notes,
      duration: Date.now() - new Date(activeDowntime.value.startTime).getTime(),
    }
    downtimeSessions.value.push(session)
    activeDowntime.value = null
  }

  // ─── PIN / Admin Auth ──────────────────────────────────────────────────────
  // PIN stored in localStorage (plain in dev; SHA-256 in production).
  const adminPin       = ref(localStorage.getItem('mes_admin_pin') ?? '1234')
  const hasAdminAccess = ref(false)

  // JWT auth token for API calls
  const authToken = ref(localStorage.getItem('mes_auth_token') ?? null)

  function grantAdminAccess() {
    hasAdminAccess.value = true
    // Auto-revoke after 30 minutes of inactivity
    setTimeout(() => { hasAdminAccess.value = false }, 30 * 60 * 1000)
  }

  function revokeAdminAccess() {
    hasAdminAccess.value = false
  }

  function setAdminPin(newPin) {
    if (!/^\d{4}$/.test(newPin)) {
      console.error('[Store] PIN must be exactly 4 digits')
      return
    }
    adminPin.value = newPin
    localStorage.setItem('mes_admin_pin', newPin)
  }

  function setAuthToken(token) {
    authToken.value = token
    localStorage.setItem('mes_auth_token', token)
  }

  function clearAuthToken() {
    authToken.value = null
    localStorage.removeItem('mes_auth_token')
    hasAdminAccess.value = false
  }

  return {
    // Operators
    operators, activeOperator, clockedInOperators,
    isOperatorClockedIn, clockIn, clockOut, setOperator,
    // Week
    currentProductionWeek, setProductionWeek,
    // Ledger
    ledgerEntries, saveProductionEntry, weeklyAggregation,
    // Inventory
    inventory, adjustInventory,
    // Cash
    cashEntries, addCashEntry, totalAdvances, totalExpenses,
    // Downtime
    downtimeSessions, activeDowntime, startDowntime, resolveDowntime,
    // Dispatch
    dispatchLogs, clients, addDispatch, totalDispatched,
    // Admin Config
    pieceRates, setPieceRate, wasteThresholds, setWasteThreshold,
    systemConfig, updateSystemConfig,
    // Analytics
    operatorEfficiency, sevenDayTrend,
    totalGoodAllTime, totalWasteAllTime, overallWastePct,
    // PIN / Admin Auth
    adminPin, hasAdminAccess, grantAdminAccess, revokeAdminAccess, setAdminPin,
    // Auth token
    authToken, setAuthToken, clearAuthToken,
  }
},
{ persist: false } // set to true with pinia-plugin-persistedstate if needed
)
