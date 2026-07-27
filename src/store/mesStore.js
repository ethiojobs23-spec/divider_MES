import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabaseClient'

export const useMesStore = defineStore('mes', () => {
  // ─── Initializing Data ─────────────────────────────────────────────────────
  const isLoading = ref(false)
  
  async function fetchInitialData() {
    isLoading.value = true
    try {
      // 1. Fetch active operators
      const { data: ops } = await supabase.from('mes_operators').select('*').eq('is_active', true)
      if (ops) operators.value = ops

      // 2. Fetch inventory
      const { data: inv } = await supabase.from('mes_inventory').select('*')
      if (inv) inventory.value = inv

      // 3. Fetch this week's ledger
      const { data: ledger } = await supabase.from('mes_production_logs').select('*').eq('production_week', currentProductionWeek.value)
      if (ledger) ledgerEntries.value = ledger.map(mapSupabaseLedgerToLocal)

      // 4. Fetch this week's cash entries
      const { data: cash } = await supabase.from('mes_financial_ledger').select('*')
      if (cash) cashEntries.value = cash.map(mapSupabaseCashToLocal)

      // 5. Fetch dispatch logs for this week
      const { data: dispatches } = await supabase
        .from('mes_dispatch_logs')
        .select('*')
        .eq('production_week', currentProductionWeek.value)
        .order('created_at', { ascending: false })
      if (dispatches) dispatchLogs.value = dispatches.map(mapSupabaseDispatchToLocal)

    } catch (err) {
      console.error('[Store] Error fetching initial data:', err)
    } finally {
      isLoading.value = false
    }
  }

  // ─── Operator State ────────────────────────────────────────────────────────
  const activeOperator = ref(null)
  const clockedInOperators = ref({}) // We keep clock ins local session-based for UI, or use attendanceStore
  const operators = ref([])

  const isOperatorClockedIn = computed(() => (id) => !!clockedInOperators.value[id])

  function clockIn(operator) {
    clockedInOperators.value[operator.id] = new Date().toISOString()
    activeOperator.value = operator
  }

  function clockOut(operator) {
    delete clockedInOperators.value[operator.id]
    if (activeOperator.value?.id === operator.id) {
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
    fetchInitialData() // refresh when week changes
  }

  // ─── Production Ledger ─────────────────────────────────────────────────────
  const ledgerEntries = ref([])

  function mapSupabaseLedgerToLocal(dbRow) {
    const op = operators.value.find(o => o.id === dbRow.operator_id)
    return {
      id: dbRow.id,
      timestamp: dbRow.created_at,
      week: dbRow.production_week,
      operator: op ? op.name : 'Unknown',
      dividerType: dbRow.divider_type,
      placement: dbRow.placement_style,
      size: dbRow.size_cm + 'cm',
      goodProduction: dbRow.qty_produced,
      wasteMaterial: dbRow.qty_waste
    }
  }

  async function submitProductionLog(data) {
    if (!activeOperator.value) return false
    try {
      const payload = {
        operator_id: activeOperator.value.id,
        production_week: currentProductionWeek.value,
        production_date: new Date().toISOString().split('T')[0],
        divider_type: data.dividerType,
        placement_style: data.placement,
        size_cm: parseInt(data.size),
        qty_produced: data.goodProduction || 0,
        qty_waste: data.wasteMaterial || 0
      }

      const { data: savedRow, error } = await supabase.from('mes_production_logs').insert(payload).select().single()
      if (error) throw error

      ledgerEntries.value.push(mapSupabaseLedgerToLocal(savedRow))
      return true
    } catch (err) {
      console.error('[Store] Production log failed:', err)
      return false
    }
  }

  const weeklyAggregation = computed(() => {
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
  const inventory = ref([])

  // ─── Cash Advances ─────────────────────────────────────────────────────────
  const cashEntries = ref([])

  function mapSupabaseCashToLocal(dbRow) {
    const op = operators.value.find(o => o.id === dbRow.operator_id)
    return {
      id: dbRow.id,
      timestamp: dbRow.created_at,
      week: currentProductionWeek.value,
      operator: op ? op.name : dbRow.target_name,
      type: dbRow.transaction_type,
      amount: dbRow.amount,
      note: dbRow.notes
    }
  }

  async function addCashEntry(entry) {
    try {
      const payload = {
        operator_id: activeOperator.value?.id || null,
        target_name: entry.operator || 'Company',
        transaction_type: entry.type,
        amount: entry.amount,
        transaction_date: new Date().toISOString().split('T')[0],
        notes: entry.note
      }
      
      const { data: savedRow, error } = await supabase.from('mes_financial_ledger').insert(payload).select().single()
      if (error) throw error

      cashEntries.value.push(mapSupabaseCashToLocal(savedRow))
      return true
    } catch (err) {
      console.error('[Store] Cash log failed:', err)
      return false
    }
  }

  async function approveCashEntry(id) {
    try {
      const { error } = await supabase.from('mes_financial_ledger').update({ transaction_type: 'advance' }).eq('id', id)
      if (error) throw error
      const entry = cashEntries.value.find(e => e.id === id)
      if (entry) entry.type = 'advance'
    } catch (err) {
      console.error('[Store] Cash approve failed:', err)
    }
  }

  async function rejectCashEntry(id) {
    try {
      const { error } = await supabase.from('mes_financial_ledger').update({ transaction_type: 'rejected_advance' }).eq('id', id)
      if (error) throw error
      const entry = cashEntries.value.find(e => e.id === id)
      if (entry) entry.type = 'rejected_advance'
    } catch (err) {
      console.error('[Store] Cash reject failed:', err)
    }
  }

  const totalAdvances = computed(() =>
    cashEntries.value.filter(e => e.type === 'advance').reduce((s, e) => s + Number(e.amount), 0)
  )
  const totalExpenses = computed(() =>
    cashEntries.value.filter(e => e.type === 'expense').reduce((s, e) => s + Number(e.amount), 0)
  )

  // ─── Dispatch / Logistics ───────────────────────────────────────────────────
  const dispatchLogs = ref([])
  const clients = ref(['Addis Ababa Main', 'Hawassa Depot', 'Dire Dawa Branch'])

  function mapSupabaseDispatchToLocal(dbRow) {
    return {
      id: dbRow.id,
      timestamp: dbRow.created_at,
      dividerType: dbRow.divider_type,
      client: dbRow.client_name,
      quantity: dbRow.quantity,
      dispatchedBy: dbRow.dispatched_by ?? 'Operator',
    }
  }

  async function addDispatch(data) {
    try {
      const payload = {
        production_week: currentProductionWeek.value,
        divider_type: data.dividerType,
        client_name: data.client,
        quantity: data.quantity,
        dispatched_by: activeOperator.value?.name ?? 'Manager',
        dispatch_date: new Date().toISOString().split('T')[0],
      }
      const { data: savedRow, error } = await supabase
        .from('mes_dispatch_logs')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      dispatchLogs.value.unshift(mapSupabaseDispatchToLocal(savedRow))
      return true
    } catch (err) {
      console.error('[Store] Dispatch failed:', err)
      return false
    }
  }

  const totalDispatched = computed(() =>
    dispatchLogs.value.reduce((s, d) => s + (Number(d.quantity) || 0), 0)
  )

  // ─── Admin Config — Piece Rates & Thresholds ───────────────────────────────
  const pieceRates = ref({
    '50': { '9cm': { 'ብተና': 2.50, 'ውስጥ': 3.00, 'የተለየ': 3.50 }, '7cm': { 'ብተና': 2.00, 'ውስጥ': 2.50, 'የተለየ': 3.00 } },
    '40': { '9cm': { 'ብተና': 2.25, 'ውስጥ': 2.75, 'የተለየ': 3.25 }, '7cm': { 'ብተና': 1.75, 'ውስጥ': 2.25, 'የተለየ': 2.75 } },
    '30': { '9cm': { 'ብተና': 2.00, 'ውስጥ': 2.50, 'የተለየ': 3.00 }, '7cm': { 'ብተና': 1.50, 'ውስጥ': 2.00, 'የተለየ': 2.50 } },
    '16': { '9cm': { 'ብተና': 1.75, 'ውስጥ': 2.25, 'የተለየ': 2.75 }, '7cm': { 'ብተና': 1.25, 'ውስጥ': 1.75, 'የተለየ': 2.25 } },
    '12': { '9cm': { 'ብተና': 1.50, 'ውስጥ': 2.00, 'የተለየ': 2.50 }, '7cm': { 'ብተና': 1.00, 'ውስጥ': 1.50, 'የተለየ': 2.00 } },
    '45': { '9cm': { 'ብተና': 2.40, 'ውስጥ': 2.90, 'የተለየ': 3.40 }, '7cm': { 'ብተና': 1.90, 'ውስጥ': 2.40, 'የተለየ': 2.90 } },
  })

  function setPieceRate(type, size, placement, value) {
    if (!pieceRates.value[type]) pieceRates.value[type] = {}
    if (!pieceRates.value[type][size]) pieceRates.value[type][size] = {}
    pieceRates.value[type][size][placement] = value
  }

  // Waste alert thresholds (used by QualityControl + AdminSettings)
  const wasteThresholds = ref({ warn: 8, critical: 15 })

  function setWasteThreshold(level, value) {
    wasteThresholds.value[level] = Number(value)
  }

  function updateSystemConfig(key, value) {
    systemConfig.value[key] = value
  }

  const systemConfig = ref({
    autoPauseOnDowntime: false,
    requireOperatorForEntry: false,
    telegramBotEnabled: false,
    exportRecipient: 'Frezer',
  })

  // ─── Analytics Computeds ───────────────────────────────────────────────────
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

  const totalGoodAllTime = computed(() =>
    ledgerEntries.value.reduce((s, e) => s + (Number(e.goodProduction) || 0), 0)
  )
  const totalWasteAllTime = computed(() =>
    ledgerEntries.value.reduce((s, e) => s + (Number(e.wasteMaterial) || 0), 0)
  )
  const overallWastePct = computed(() => {
    const total = totalGoodAllTime.value + totalWasteAllTime.value
    return total > 0 ? +((totalWasteAllTime.value / total) * 100).toFixed(1) : 0
  })

  // Admin access flag (used by router guard)
  const hasAdminAccess = ref(false)
  function grantAdminAccess() { hasAdminAccess.value = true }
  function revokeAdminAccess() { hasAdminAccess.value = false }

  // ─── Downtime ──────────────────────────────────────────────────────────────
  const downtimeSessions = ref([])
  const activeDowntime = ref(null)

  async function startDowntime(reason) {
    if (activeDowntime.value || !activeOperator.value) return
    try {
      const payload = {
        issue_category: reason,
        operator_id: activeOperator.value.id,
        start_time: new Date().toISOString()
      }
      const { data, error } = await supabase.from('mes_downtime_logs').insert(payload).select().single()
      if (error) throw error

      activeDowntime.value = data
    } catch (err) {
      console.error('[Store] Start downtime failed:', err)
    }
  }

  async function resolveDowntime(notes = '') {
    if (!activeDowntime.value) return
    try {
      const endTime = new Date()
      const start = new Date(activeDowntime.value.start_time)
      const duration = Math.floor((endTime - start) / 60000)

      const payload = {
        end_time: endTime.toISOString(),
        duration_minutes: duration,
        resolution_notes: notes,
        resolved_by: 'Supervisor'
      }
      
      const { data, error } = await supabase
        .from('mes_downtime_logs')
        .update(payload)
        .eq('id', activeDowntime.value.id)
        .select()
        .single()
        
      if (error) throw error

      downtimeSessions.value.push(data)
      activeDowntime.value = null
    } catch (err) {
      console.error('[Store] Resolve downtime failed:', err)
    }
  }

  async function logDowntime(data) {
    if (data.action === 'start') return await startDowntime(data.reason)
    else if (data.action === 'resolve') return await resolveDowntime(data.notes)
  }

  return {
    isLoading, fetchInitialData,
    operators, activeOperator, clockedInOperators,
    isOperatorClockedIn, clockIn, clockOut, setOperator,
    currentProductionWeek, setProductionWeek,
    ledgerEntries, submitProductionLog, weeklyAggregation,
    inventory,
    cashEntries, addCashEntry, approveCashEntry, rejectCashEntry, totalAdvances, totalExpenses,
    dispatchLogs, clients, addDispatch, totalDispatched,
    pieceRates, setPieceRate,
    wasteThresholds, setWasteThreshold,
    systemConfig, updateSystemConfig,
    operatorEfficiency,
    totalGoodAllTime, totalWasteAllTime, overallWastePct,
    hasAdminAccess, grantAdminAccess, revokeAdminAccess,
    downtimeSessions, activeDowntime, startDowntime, resolveDowntime, logDowntime,
  }
})
