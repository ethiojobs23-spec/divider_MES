// Developer: Mintesnot Abebe | Brand: dev MinteIO
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { useInventoryStore } from './inventoryStore'
import { useAttendanceStore } from './attendanceStore'
import { syncManager } from '@/services/syncManager'
import { 
  getISOWeekLabel, 
  getShiftedWeekLabel, 
  getWeekStatus, 
  compareWeekLabels, 
  getWeekDateRange 
} from '@/utils/dateUtils'

const defaultSystemConfig = {
  autoPauseOnDowntime: false,
  requireOperatorForEntry: false,
  telegramBotEnabled: false,
  exportRecipient: 'Frezer',
  botToken: '',
  chatId: '',
  payoutDay: 'Friday',
  otherDividerType: {
    enabled: false,
    label: 'Other'
  },
  otherPlacement: {
    enabled: false,
    label: 'Other'
  }
}

export const defaultPieceRates = {
  MFG: {
    '50': 2.50,
    '40': 2.25,
    '30': 2.00,
    '16': 1.75,
    '12': 1.50,
    '45': 2.40,
    'Other': 2.00
  },
  PP: {
    '50': { '9cm': 0.75, '7cm': 0.60 },
    '40': { '9cm': 0.70, '7cm': 0.55 },
    '30': { '9cm': 0.65, '7cm': 0.50 },
    '16': { '9cm': 0.60, '7cm': 0.45 },
    '12': { '9cm': 0.55, '7cm': 0.40 },
    '45': { '9cm': 0.70, '7cm': 0.55 },
    'Other': { '9cm': 0.60, '7cm': 0.45 }
  },
  PL: {
    '50': { '9cm': 0.85, '7cm': 0.70 },
    '40': { '9cm': 0.80, '7cm': 0.65 },
    '30': { '9cm': 0.75, '7cm': 0.60 },
    '16': { '9cm': 0.70, '7cm': 0.55 },
    '12': { '9cm': 0.65, '7cm': 0.50 },
    '45': { '9cm': 0.80, '7cm': 0.65 },
    'Other': { '9cm': 0.70, '7cm': 0.55 }
  },
  C: {
    'null': {
      '9cm': { 'ብተና': 1.50, 'ውስጥ': 2.00, 'የተለየ': 2.50, 'Other': 1.50 },
      '7cm': { 'ብተና': 1.00, 'ውስጥ': 1.50, 'የተለየ': 2.00, 'Other': 1.00 }
    }
  }
}

export function normalizePieceRates(raw) {
  if (!raw || typeof raw !== 'object') return JSON.parse(JSON.stringify(defaultPieceRates))
  
  const result = JSON.parse(JSON.stringify(defaultPieceRates))
  
  // 1. MFG
  if (raw.MFG && typeof raw.MFG === 'object') {
    for (const [type, val] of Object.entries(raw.MFG)) {
      if (typeof val === 'number' && !isNaN(val)) {
        result.MFG[type] = val
      } else if (val && typeof val === 'object') {
        const num = val?.['9cm']?.['ብተና'] ?? val?.['9cm']?.['ውስጥ'] ?? Object.values(val?.['9cm'] || {})[0]
        if (typeof num === 'number' && !isNaN(num)) result.MFG[type] = num
      }
    }
  }

  // 2. PP
  if (raw.PP && typeof raw.PP === 'object') {
    for (const [type, sizeObj] of Object.entries(raw.PP)) {
      if (sizeObj && typeof sizeObj === 'object') {
        if (!result.PP[type]) result.PP[type] = { '9cm': 0, '7cm': 0 }
        for (const [size, val] of Object.entries(sizeObj)) {
          if (typeof val === 'number' && !isNaN(val)) result.PP[type][size] = val
        }
      }
    }
  }

  // 3. PL
  if (raw.PL && typeof raw.PL === 'object') {
    for (const [type, sizeObj] of Object.entries(raw.PL)) {
      if (sizeObj && typeof sizeObj === 'object') {
        if (!result.PL[type]) result.PL[type] = { '9cm': 0, '7cm': 0 }
        for (const [size, val] of Object.entries(sizeObj)) {
          if (typeof val === 'number' && !isNaN(val)) result.PL[type][size] = val
        }
      }
    }
  }

  // 4. C
  if (raw.C && typeof raw.C === 'object') {
    if (raw.C['null'] && typeof raw.C['null'] === 'object') {
      result.C['null'] = raw.C['null']
    } else {
      const firstTypeObj = Object.values(raw.C)[0]
      if (firstTypeObj && typeof firstTypeObj === 'object') {
        result.C['null'] = firstTypeObj
      }
    }
  }

  return result
}

export const useMesStore = defineStore('mes', () => {
  // ─── Initializing Data ─────────────────────────────────────────────────────
  const isLoading = ref(false)
  
  async function fetchInitialData() {
    isLoading.value = true
    try {
      // 1. Fetch active operators and customers
      const { data: ops, error: opsErr } = await supabase.from('mes_operators').select('*').neq('role', 'customer')
      if (opsErr) throw opsErr

      // Fetch Customers
      const { data: clientsData, error: clientsErr } = await supabase.from('mes_customers').select('*')
      if (clientsErr) throw clientsErr

      operators.value = ops.map((o, idx) => {
        return {
          ...o,
          color: o.color || `bg-${['blue','emerald','indigo','purple','rose','amber','teal'][idx % 7]}-500`
        }
      })
      clients.value = (clientsData || []).map(c => ({
        ...c,
        name: c.company_name,
        full_name: c.contact_person,
        avatar: c.company_name.charAt(0).toUpperCase(),
        color: 'bg-emerald-500'
      }))

      // 2. Fetch all-time production and dispatch to compute inventory
      const { data: allProd } = await supabase.from('mes_production_logs').select('divider_type, qty_produced')
      const { data: allDisp } = await supabase.from('mes_dispatch_logs').select('divider_type, quantity')
      const invMap = {}
      if (allProd) {
        allProd.forEach(p => {
          if (!invMap[p.divider_type]) invMap[p.divider_type] = 0
          invMap[p.divider_type] += (Number(p.qty_produced) || 0)
        })
      }
      if (allDisp) {
        allDisp.forEach(d => {
          if (!invMap[d.divider_type]) invMap[d.divider_type] = 0
          invMap[d.divider_type] -= (Number(d.quantity) || 0)
        })
      }
      inventory.value = Object.keys(invMap).map(type => ({
        divider_type: type,
        available: invMap[type]
      }))

      // 3. Fetch this week's ledger
      const { data: ledger } = await supabase.from('mes_production_logs').select('*').eq('production_week', currentProductionWeek.value)
      if (ledger) ledgerEntries.value = ledger.map(mapSupabaseLedgerToLocal)

      // 4. Fetch this week's cash entries + shift submissions
      const { data: cash } = await supabase.from('mes_financial_ledger').select('*')
      if (cash) {
        cashEntries.value = cash
          .filter(r => r.transaction_type !== 'shift_submission' && r.transaction_type !== 'operator_config')
          .map(mapSupabaseCashToLocal)
        shiftSubmissions.value = cash
          .filter(r => r.transaction_type === 'shift_submission')
          .map(r => ({ ...r, details: (() => { try { return JSON.parse(r.notes) } catch { return {} } })() }))
        // Load operator configs (work_types, payroll_config)
        const configs = cash.filter(r => r.transaction_type === 'operator_config')
        // Sort by id so later configs override earlier ones properly
        configs.sort((a,b) => a.id - b.id).forEach(c => {
          try {
            const parsed = JSON.parse(c.notes)
            const op = operators.value.find(o => o.id === c.operator_id)
            if (op) {
              if (parsed.work_types) op.work_types = parsed.work_types
              if (parsed.payroll_config) op.payroll_config = parsed.payroll_config
            }
          } catch {}
        })

        // Load system configs (pieceRates, thresholds, etc)
        const sysConfigs = cash.filter(r => r.transaction_type === 'system_config' && r.target_name === 'global')
        sysConfigs.sort((a,b) => a.id - b.id).forEach(c => {
          try {
            const parsed = JSON.parse(c.notes)
            if (parsed.pieceRates) {
              pieceRates.value = normalizePieceRates(parsed.pieceRates)
            }
            if (parsed.wasteThresholds) wasteThresholds.value = parsed.wasteThresholds
            if (parsed.systemConfig) {
              systemConfig.value = {
                ...defaultSystemConfig,
                ...parsed.systemConfig,
                otherDividerType: {
                  ...defaultSystemConfig.otherDividerType,
                  ...(parsed.systemConfig.otherDividerType || {})
                },
                otherPlacement: {
                  ...defaultSystemConfig.otherPlacement,
                  ...(parsed.systemConfig.otherPlacement || {})
                }
              }
            }
            if (parsed.clockingWindows) {
              useAttendanceStore().clockingWindows = parsed.clockingWindows
            }
          } catch {}
        })
      }

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
  const clients = ref([])

  const isOperatorClockedIn = computed(() => (id) => {
    if (clockedInOperators.value[id]) return true
    try {
      const attStore = useAttendanceStore()
      const today = new Date().toISOString().split('T')[0]
      return attStore.clockInLog.some(log => 
        log.operatorId === id && 
        log.shiftDate === today && 
        !log.clockOut
      )
    } catch {
      return false
    }
  })

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
  // Default to the real ISO 8601 current week
  const actualCalendarWeek = computed(() => getISOWeekLabel(new Date()))
  const currentProductionWeek = ref(getISOWeekLabel(new Date()))

  // Detailed status of the currently selected week (current / past / upcoming)
  const weekStatus = computed(() => {
    return getWeekStatus(currentProductionWeek.value)
  })

  function getCurrentWeekLabel() {
    return getISOWeekLabel(new Date())
  }

  function setProductionWeek(label) {
    if (!label) return
    currentProductionWeek.value = label
    fetchInitialData() // refresh when week changes
  }

  function shiftProductionWeek(delta) {
    const nextLabel = getShiftedWeekLabel(currentProductionWeek.value, delta)
    setProductionWeek(nextLabel)
  }

  function resetToCurrentWeek() {
    const actual = getISOWeekLabel(new Date())
    if (currentProductionWeek.value !== actual) {
      setProductionWeek(actual)
    }
  }

  // ─── Production Ledger ─────────────────────────────────────────────────────
  const ledgerEntries = ref([])

  function mapSupabaseLedgerToLocal(dbRow) {
    const op = operators.value.find(o => Number(o.id) === Number(dbRow.operator_id))
    return {
      id: dbRow.id,
      timestamp: dbRow.created_at,
      productionDate: dbRow.production_date || (dbRow.created_at ? dbRow.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
      week: dbRow.production_week,
      operator: op ? op.name : (dbRow.operator_name || 'Unknown'),
      operator_id: dbRow.operator_id != null ? Number(dbRow.operator_id) : null,
      workCategory: dbRow.work_category || 'MFG',
      dividerType: dbRow.divider_type,
      placement: dbRow.placement_style,
      size: dbRow.size_cm ? dbRow.size_cm + 'cm' : null,
      goodProduction: Number(dbRow.qty_produced) || 0,
      wasteMaterial: Number(dbRow.qty_waste) || 0,
      hoursWorked: dbRow.hours_worked != null ? Number(dbRow.hours_worked) : null,
      loggedByAdmin: dbRow.logged_by_admin || false
    }
  }

  // ── Overtime Helper ──────────────────────────────────────────────
  const OVERTIME_MULTIPLIER = 1.5

  /** Returns true if today is Saturday (6) or Sunday (0) */
  function isWeekendOvertime() {
    const day = new Date().getDay()
    return day === 0 || day === 6
  }

  async function submitProductionLog(data) {
    try {
      const overtime = isWeekendOvertime()
      const baseQty  = data.goodProduction || 0
      // Apply 1.5× multiplier on weekends to reflect higher piece-rate earnings
      const effectiveQty = overtime
        ? Math.round(baseQty * OVERTIME_MULTIPLIER)
        : baseQty

      const payload = {
        operator_id: data.operator_id || (activeOperator.value ? activeOperator.value.id : null),
        production_week: currentProductionWeek.value,
        production_date: data.production_date || new Date().toISOString().split('T')[0],
        work_category: data.workCategory || 'MFG',
        divider_type: (data.dividerType && data.dividerType !== 'Other' && !isNaN(parseInt(data.dividerType))) ? parseInt(data.dividerType) : null,
        placement_style: data.placement || null,
        size_cm: data.size ? parseInt(data.size) : null,
        qty_produced: effectiveQty,
        qty_waste: data.wasteMaterial || 0,
        hours_worked: data.hoursWorked || null,
        notes: data.notes || null,
        is_overtime: overtime,
        logged_by_admin: data.loggedByAdmin || false
      }

      // Optimistic UI update
      const tempId = Date.now()
      const optimisticRow = { id: tempId, created_at: data.timestamp_override || new Date().toISOString(), ...payload }
      ledgerEntries.value.push(mapSupabaseLedgerToLocal(optimisticRow))

      if (navigator.onLine) {
        supabase.from('mes_production_logs').insert(payload).select().single().then(({ data: savedRow, error }) => {
          if (!error && savedRow) {
            const entry = ledgerEntries.value.find(e => e.id === tempId)
            if (entry) entry.id = savedRow.id
          } else {
            syncManager.enqueue({ action: 'insert', table: 'mes_production_logs', payload })
          }
        }).catch(() => {
          syncManager.enqueue({ action: 'insert', table: 'mes_production_logs', payload })
        })
      } else {
        syncManager.enqueue({ action: 'insert', table: 'mes_production_logs', payload })
      }
      
      // Update local inventory immediately
      const invItem = inventory.value.find(i => i.divider_type === data.dividerType)
      if (invItem) invItem.available += effectiveQty
      else inventory.value.push({ divider_type: data.dividerType, available: effectiveQty })

      // Auto-deduct raw materials
      const inventoryStore = useInventoryStore()
      inventoryStore.deductForProduction(data.dividerType, effectiveQty)

      return { ok: true, overtime, effectiveQty, rawQty: baseQty }
    } catch (err) {
      console.error('[Store] Production log failed:', err)
      return { ok: false, overtime: false, effectiveQty: 0, rawQty: 0 }
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
    const op = operators.value.find(o => Number(o.id) === Number(dbRow.operator_id))
    let week = currentProductionWeek.value
    if (dbRow.transaction_date) {
      try { week = getISOWeekLabel(new Date(dbRow.transaction_date)) } catch {}
    } else if (dbRow.created_at) {
      try { week = getISOWeekLabel(new Date(dbRow.created_at)) } catch {}
    }
    return {
      id: dbRow.id,
      timestamp: dbRow.created_at || (dbRow.transaction_date ? new Date(dbRow.transaction_date).toISOString() : new Date().toISOString()),
      week,
      operator: op ? op.name : dbRow.target_name,
      operator_id: dbRow.operator_id != null ? Number(dbRow.operator_id) : null,
      type: dbRow.transaction_type,
      amount: Number(dbRow.amount) || 0,
      note: dbRow.notes
    }
  }

  async function addCashEntry(entry) {
    try {
      const payload = {
        operator_id: entry.operator_id || activeOperator.value?.id || null,
        target_name: entry.operator || 'Company',
        transaction_type: entry.type,
        amount: entry.amount,
        transaction_date: new Date().toISOString().split('T')[0],
        notes: entry.note
      }
      const tempId = Date.now()
      const optimisticRow = { id: tempId, created_at: new Date().toISOString(), ...payload }
      cashEntries.value.push(mapSupabaseCashToLocal(optimisticRow))

      if (navigator.onLine) {
        supabase.from('mes_financial_ledger').insert(payload).select().single().then(({ data: savedRow, error }) => {
          if (!error && savedRow) {
            const entry = cashEntries.value.find(e => e.id === tempId)
            if (entry) entry.id = savedRow.id
          } else {
            syncManager.enqueue({ action: 'insert', table: 'mes_financial_ledger', payload })
          }
        }).catch(() => {
          syncManager.enqueue({ action: 'insert', table: 'mes_financial_ledger', payload })
        })
      } else {
        syncManager.enqueue({ action: 'insert', table: 'mes_financial_ledger', payload })
      }
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
      const tempId = Date.now()
      const optimisticRow = { id: tempId, created_at: new Date().toISOString(), ...payload }
      dispatchLogs.value.unshift(mapSupabaseDispatchToLocal(optimisticRow))

      if (navigator.onLine) {
        supabase.from('mes_dispatch_logs').insert(payload).select().single().then(({ data: savedRow, error }) => {
          if (!error && savedRow) {
            const entry = dispatchLogs.value.find(e => e.id === tempId)
            if (entry) entry.id = savedRow.id
          } else {
            syncManager.enqueue({ action: 'insert', table: 'mes_dispatch_logs', payload })
          }
        }).catch(() => {
          syncManager.enqueue({ action: 'insert', table: 'mes_dispatch_logs', payload })
        })
      } else {
        syncManager.enqueue({ action: 'insert', table: 'mes_dispatch_logs', payload })
      }
      
      // Update local inventory state to reflect the dispatch immediately
      const invItem = inventory.value.find(i => i.divider_type === data.dividerType)
      if (invItem) invItem.available -= data.quantity
      else inventory.value.push({ divider_type: data.dividerType, available: -data.quantity })

      return true
    } catch (err) {
      console.error('[Store] Dispatch failed:', err)
      return false
    }
  }

  const totalDispatched = computed(() =>
    dispatchLogs.value.reduce((s, d) => s + (Number(d.quantity) || 0), 0)
  )

  async function addClient(customerData) {
    try {
      const payload = {
        company_name: customerData.name,
        contact_person: customerData.contact_person || '',
        phone_number: customerData.phone_number || '',
        address: customerData.address || '',
        email: customerData.email || ''
      }
      const { data, error } = await supabase.from('mes_customers').insert(payload).select().single()
      if (error) throw error
      clients.value.push({
        ...data,
        name: data.company_name,
        full_name: data.contact_person,
        avatar: data.company_name.charAt(0).toUpperCase(),
        color: 'bg-emerald-500'
      })
      return true
    } catch (err) {
      console.error('[Store] Add client failed:', err)
      return false
    }
  }

  async function updateClient(id, customerData) {
    try {
      const payload = {
        company_name: customerData.name,
        contact_person: customerData.contact_person || '',
        phone_number: customerData.phone_number || '',
        address: customerData.address || '',
        email: customerData.email || ''
      }
      const { data, error } = await supabase.from('mes_customers').update(payload).eq('id', id).select().single()
      if (error) throw error
      const idx = clients.value.findIndex(c => c.id === id)
      if (idx !== -1) {
        clients.value[idx] = {
          ...data,
          name: data.company_name,
          full_name: data.contact_person,
          avatar: data.company_name.charAt(0).toUpperCase(),
          color: 'bg-emerald-500'
        }
      }
      return true
    } catch (err) {
      console.error('[Store] Update client failed:', err)
      return false
    }
  }

  async function deleteClient(id) {
    try {
      const { error } = await supabase.from('mes_customers').delete().eq('id', id)
      if (error) throw error
      const idx = clients.value.findIndex(c => c.id === id)
      if (idx !== -1) clients.value.splice(idx, 1)
      return true
    } catch (err) {
      console.error('[Store] Delete client failed:', err)
      return false
    }
  }

  // ─── Admin Config — Piece Rates & Thresholds ───────────────────────────────
  const pieceRates = ref(normalizePieceRates(defaultPieceRates))

  function setPieceRate(category, type, size, placement, value) {
    const numVal = (typeof value === 'number' && !isNaN(value)) ? value : (Number(value) || 0)
    
    if (!pieceRates.value) pieceRates.value = JSON.parse(JSON.stringify(defaultPieceRates))
    if (!pieceRates.value[category]) pieceRates.value[category] = {}
    
    if (category === 'MFG') {
      pieceRates.value.MFG[type] = numVal
      return
    }
    
    if (category === 'C') {
      if (!pieceRates.value.C['null']) pieceRates.value.C['null'] = {}
      if (!pieceRates.value.C['null'][size]) pieceRates.value.C['null'][size] = {}
      pieceRates.value.C['null'][size][placement] = numVal
      return
    }

    if (category === 'PP' || category === 'PL') {
      if (!pieceRates.value[category][type]) pieceRates.value[category][type] = {}
      pieceRates.value[category][type][size] = numVal
      return
    }

    if (!pieceRates.value[category][type]) pieceRates.value[category][type] = {}
    if (!pieceRates.value[category][type][size]) pieceRates.value[category][type][size] = {}
    pieceRates.value[category][type][size][placement] = numVal
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
    botToken: '',
    chatId: '',
    payoutDay: 'Friday',
    otherDividerType: {
      enabled: false,
      label: 'Other'
    },
    otherPlacement: {
      enabled: false,
      label: 'Other'
    }
  })

  async function saveSystemConfig(configData) {
    try {
      const cleanRates = normalizePieceRates(configData?.pieceRates ?? pieceRates.value)
      pieceRates.value = cleanRates

      const cleanThresholds = JSON.parse(JSON.stringify(configData?.wasteThresholds ?? wasteThresholds.value))
      const cleanSystemConfig = JSON.parse(JSON.stringify(configData?.systemConfig ?? systemConfig.value))
      const cleanClockingWindows = JSON.parse(JSON.stringify(configData?.clockingWindows ?? useAttendanceStore().clockingWindows ?? {}))

      const fullPayload = {
        pieceRates: cleanRates,
        wasteThresholds: cleanThresholds,
        systemConfig: cleanSystemConfig,
        clockingWindows: cleanClockingWindows
      }

      const notes = JSON.stringify(fullPayload)

      const { data: existing } = await supabase
        .from('mes_financial_ledger')
        .select('id')
        .eq('transaction_type', 'system_config')
        .eq('target_name', 'global')

      if (existing && existing.length > 0) {
        const targetId = existing[existing.length - 1].id
        const { error } = await supabase
          .from('mes_financial_ledger')
          .update({ notes, transaction_date: new Date().toISOString().split('T')[0] })
          .eq('id', targetId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('mes_financial_ledger').insert({
          operator_id: activeOperator.value?.id || null,
          target_name: 'global',
          transaction_type: 'system_config',
          amount: 0,
          transaction_date: new Date().toISOString().split('T')[0],
          notes
        })
        if (error) throw error
      }
      return true
    } catch (e) {
      console.error('[Store] saveSystemConfig failed:', e)
      return false
    }
  }

  // ─── Analytics Computeds ───────────────────────────────────────────────────
  const operatorEfficiency = computed(() => {
    return operators.value.map(op => {
      const entries = ledgerEntries.value.filter(e => 
        (e.operator_id != null && Number(e.operator_id) === Number(op.id)) ||
        (e.operator && e.operator === op.name)
      )
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
    if (activeDowntime.value) return
    try {
      const payload = {
        issue_category: reason,
        operator_id: activeOperator.value ? activeOperator.value.id : null,
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

  // ─── Shift Submissions ─────────────────────────────────────────────────────
  const shiftSubmissions = ref([])

  async function submitShift(operatorId, operatorName) {
    try {
      const today = new Date().toISOString().split('T')[0]
      const opConfig = getOperatorWorkConfig(operatorId)
      const isTimeOnly = opConfig.categories?.includes('TIME') && !opConfig.categories?.some(c => c !== 'TIME')

      // Get today's production entries for this operator (piece-rate workers)
      const myEntries = ledgerEntries.value.filter(e => {
        const d = e.productionDate ? e.productionDate.split('T')[0] : (e.timestamp ? new Date(e.timestamp).toISOString().split('T')[0] : '')
        const matchId = e.operator_id != null && (Number(e.operator_id) === Number(operatorId) || String(e.operator_id) === String(operatorId))
        const matchName = e.operator && e.operator.trim().toLowerCase() === operatorName.trim().toLowerCase()
        return (matchId || matchName) && d === today
      })
      const totalGood  = myEntries.reduce((s,e) => s + (e.workCategory === 'TIME' ? 0 : (Number(e.goodProduction)||0)), 0)
      const totalWaste = myEntries.reduce((s,e) => s + (e.workCategory === 'TIME' ? 0 : (Number(e.wasteMaterial)||0)), 0)

      let totalEarnings = 0
      let hoursWorkedToday = 0
      let clockInTime = null
      let clockOutTime = null

      // ── TIME (hourly) workers: calculate hours from attendance record or logged hours ──
      if (opConfig.categories?.includes('TIME')) {
        const { useAttendanceStore } = await import('./attendanceStore.js')
        const attStore = useAttendanceStore()
        // Find today's attendance record for this operator
        const todayRecord = attStore.clockInLog.find(log => {
          return String(log.operatorId) === String(operatorId) && log.shiftDate === today
        })
        if (todayRecord) {
          clockInTime  = todayRecord.timestamp
          clockOutTime = todayRecord.clockOut
          if (clockInTime && clockOutTime) {
            const diffMs = new Date(clockOutTime) - new Date(clockInTime)
            hoursWorkedToday = Math.round((diffMs / 3600000) * 100) / 100 // hours, 2dp
          } else if (clockInTime && !clockOutTime) {
            // Not clocked out yet — use current time as estimate
            const diffMs = Date.now() - new Date(clockInTime)
            hoursWorkedToday = Math.round((diffMs / 3600000) * 100) / 100
          }
        }
        const hourlyRate = Number(opConfig.hourly_rate) || 0
        totalEarnings += hoursWorkedToday * hourlyRate
      }

      // ── Piece-rate workers: calculate from production entries using calculateEntryEarnings ──
      if (!isTimeOnly) {
        myEntries.forEach(e => {
          if ((e.workCategory || 'MFG') !== 'TIME') {
            totalEarnings += calculateEntryEarnings(e, operatorId)
          }
        })
      }

      const details = {
        entries: myEntries.map(e => ({
          workCategory: e.workCategory || 'MFG',
          dividerType: e.dividerType, placement: e.placement, size: e.size,
          good: e.goodProduction, waste: e.wasteMaterial, time: e.timestamp, hoursWorked: e.hoursWorked
        })),
        // TIME worker attendance summary
        isTimeWorker: opConfig.categories?.includes('TIME'),
        hoursWorkedToday,
        hourlyRate: opConfig.hourly_rate || 0,
        clockIn: clockInTime,
        clockOut: clockOutTime,
        totalGood, totalWaste, totalEarnings: totalEarnings.toFixed(2),
        submittedAt: new Date().toISOString(), week: currentProductionWeek.value
      }
      const payload = {
        operator_id: operatorId,
        target_name: 'pending',
        transaction_type: 'shift_submission',
        amount: totalEarnings,
        transaction_date: today,
        notes: JSON.stringify(details)
      }
      shiftSubmissions.value.push({ id: Date.now(), ...payload, details })

      if (navigator.onLine) {
        supabase.from('mes_financial_ledger').insert(payload).catch(() => {
          syncManager.enqueue({ action: 'insert', table: 'mes_financial_ledger', payload })
        })
      } else {
        syncManager.enqueue({ action: 'insert', table: 'mes_financial_ledger', payload })
      }
      return {
        ok: true, totalGood, totalWaste,
        totalEarnings: totalEarnings.toFixed(2),
        hoursWorkedToday, isTimeWorker: opConfig.categories?.includes('TIME')
      }
    } catch (err) {
      console.error('[Store] Shift submit failed:', err)
      return { ok: false }
    }
  }

  async function approveShift(submissionId, adminPin) {
    // Validate admin pin against operator list or master auth
    const adminRoles = ['admin', 'System Admin', 'manager', 'Supervisor']
    const admin = operators.value.find(o => adminRoles.includes(o.role) && String(o.pin_code) === String(adminPin))
    const sysAuth = useSystemAuthStore()
    const sysAuthCheck = await sysAuth.verifyPin(adminPin, 'admin')

    if (!admin && !sysAuthCheck.success) return { ok: false, reason: 'Invalid Admin PIN' }
    try {
      const { error } = await supabase.from('mes_financial_ledger')
        .update({ target_name: 'approved' })
        .eq('id', submissionId)
      if (error) throw error
      const sub = shiftSubmissions.value.find(s => s.id === submissionId)
      if (sub) sub.target_name = 'approved'
      return { ok: true }
    } catch (err) {
      console.error('[Store] Approve shift failed:', err)
      return { ok: false, reason: 'DB error' }
    }
  }

  async function rejectShift(submissionId, adminPin, reason) {
    const adminRoles = ['admin', 'System Admin', 'manager', 'Supervisor']
    const admin = operators.value.find(o => adminRoles.includes(o.role) && String(o.pin_code) === String(adminPin))
    const sysAuth = useSystemAuthStore()
    const sysAuthCheck = await sysAuth.verifyPin(adminPin, 'admin')

    if (!admin && !sysAuthCheck.success) return { ok: false, reason: 'Invalid Admin PIN' }
    try {
      const currentNotes = JSON.parse(shiftSubmissions.value.find(s => s.id === submissionId)?.notes || '{}')
      const updatedNotes = JSON.stringify({ ...currentNotes, rejectionReason: reason || 'Shift rejected by supervisor' })
      const { error } = await supabase.from('mes_financial_ledger')
        .update({ target_name: 'rejected', notes: updatedNotes })
        .eq('id', submissionId)
      if (error) throw error
      const sub = shiftSubmissions.value.find(s => s.id === submissionId)
      if (sub) { 
        sub.target_name = 'rejected'
        if (sub.details) sub.details.rejectionReason = reason || 'Shift rejected by supervisor'
      }
      return { ok: true }
    } catch (err) {
      console.error('[Store] Reject shift failed:', err)
      return { ok: false, reason: 'DB error' }
    }
  }

  async function setOperatorWorkTypes(operatorId, workTypes) {
    try {
      const op = operators.value.find(o => o.id === operatorId)
      if (op) op.work_types = workTypes

      // Fetch all existing operator_config rows for this operator
      const { data: existing } = await supabase
        .from('mes_financial_ledger')
        .select('id, notes')
        .eq('operator_id', operatorId)
        .eq('transaction_type', 'operator_config')
        .order('id', { ascending: true })

      let existingPayrollConfig = op?.payroll_config || null
      let targetId = null
      const duplicateIds = []

      if (existing && existing.length > 0) {
        const latest = existing[existing.length - 1]
        targetId = latest.id
        for (let i = 0; i < existing.length - 1; i++) {
          duplicateIds.push(existing[i].id)
        }
        try {
          const parsed = JSON.parse(latest.notes)
          if (parsed.payroll_config) existingPayrollConfig = parsed.payroll_config
        } catch {}
      }

      const notesPayload = {
        work_types: workTypes,
        ...(existingPayrollConfig ? { payroll_config: existingPayrollConfig } : {})
      }
      const notes = JSON.stringify(notesPayload)

      if (targetId) {
        const { error: updateErr } = await supabase.from('mes_financial_ledger').update({ notes }).eq('id', targetId)
        if (updateErr) throw updateErr
      } else {
        const { error: insertErr } = await supabase.from('mes_financial_ledger').insert([{
          operator_id: operatorId,
          target_name: 'Config',
          transaction_type: 'operator_config',
          amount: 0,
          transaction_date: new Date().toISOString().split('T')[0],
          notes
        }])
        if (insertErr) throw insertErr
      }

      // Purge any stale duplicate config rows so they can never overwrite on reload
      if (duplicateIds.length > 0) {
        await supabase.from('mes_financial_ledger').delete().in('id', duplicateIds)
      }

      return true
    } catch (err) {
      console.error('[Store] setOperatorWorkTypes failed:', err)
      return false
    }
  }

  /**
   * Returns a normalised work config object for a given operator.
   * Handles both the new structured format and the legacy flat-array format.
   *
   * New format (from ShiftApprovals structured form):
   *   { categories: ['PP','PL'], divider_types: ['50','40'], placements: [], sizes: ['9cm','7cm'], hourly_rate: null }
   *
   * Legacy flat array (old ShiftApprovals):
   *   ['Type 50', 'Placement - ብተና', ...]  → treated as MFG-only, no restrictions
   */
  function getOperatorWorkConfig(operatorId) {
    const op = operators.value.find(o => o.id === operatorId)
    const wt = op?.work_types

    // No config set
    if (!wt) {
      return { categories: ['MFG'], divider_types: [], placements: [], sizes: [], hourly_rate: null }
    }

    // New structured format
    if (!Array.isArray(wt) && typeof wt === 'object') {
      return {
        categories:    wt.categories    || ['MFG'],
        divider_types: wt.divider_types  || [],
        placements:    wt.placements     || [],
        sizes:         wt.sizes          || [],
        hourly_rate:   wt.hourly_rate    || null,
      }
    }

    // Legacy flat array — treat as MFG-only with no type/placement/size restrictions
    return { categories: ['MFG'], divider_types: [], placements: [], sizes: [], hourly_rate: null }
  }

  function calculateEntryEarnings(entry, operatorId) {
    const opConfig = getOperatorWorkConfig(operatorId)
    const cat = entry.workCategory || 'MFG'
    
    if (cat === 'TIME') {
      if (entry.hoursWorked && opConfig.hourly_rate) {
        return Number(entry.hoursWorked) * Number(opConfig.hourly_rate)
      }
      return 0
    }
    
    const rate = getEntryRate(entry)
    const qty = Number(entry.goodProduction || entry.good || 0)
    return rate * qty
  }

  function getEntryRate(entry) {
    const cat = entry.workCategory || 'MFG'
    if (cat === 'TIME') return 0
    
    let rate = 0
    const rates = pieceRates.value || {}
    if (cat === 'MFG') {
      const val = rates?.MFG?.[entry.dividerType]
      rate = typeof val === 'number' ? val : (val?.['9cm']?.['ብተና'] || 0)
    } else if (cat === 'C') {
      rate = rates?.C?.['null']?.[entry.size]?.[entry.placement] ?? rates?.C?.['50']?.[entry.size]?.[entry.placement] ?? 0
    } else if (cat === 'PP' || cat === 'PL') {
      rate = rates?.[cat]?.[entry.dividerType]?.[entry.size] ?? 0
    }
    
    return (typeof rate === 'number' && !isNaN(rate)) ? rate : 0
  }

  // ── Realtime Subscriptions ────────────────────────────────────────────────
  let realtimeChannel = null

  function initRealtime() {
    if (realtimeChannel) return

    realtimeChannel = supabase
      .channel('mes_core_realtime')
      // 1. Production Logs
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mes_production_logs' },
        (payload) => {
          const row = payload.new
          const existing = ledgerEntries.value.find(e => 
            e.id === row.id ||
            (String(e.id).length > 10 && Number(e.operator_id) === Number(row.operator_id) && Number(e.goodProduction) === Number(row.qty_produced) && e.productionDate === (row.production_date || row.created_at?.split('T')[0]))
          )
          if (existing) {
            existing.id = row.id
          } else if (row.production_week === currentProductionWeek.value) {
            ledgerEntries.value.push(mapSupabaseLedgerToLocal(row))
          }
          if (row.divider_type) {
            const invItem = inventory.value.find(i => String(i.divider_type) === String(row.divider_type))
            if (invItem) invItem.available += Number(row.qty_produced) || 0
            else inventory.value.push({ divider_type: String(row.divider_type), available: Number(row.qty_produced) || 0 })
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'mes_production_logs' },
        (payload) => {
          const row = payload.new
          const idx = ledgerEntries.value.findIndex(e => e.id === row.id)
          if (idx !== -1) {
            ledgerEntries.value[idx] = mapSupabaseLedgerToLocal(row)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'mes_production_logs' },
        (payload) => {
          const oldRow = payload.old
          ledgerEntries.value = ledgerEntries.value.filter(e => e.id !== oldRow.id)
        }
      )
      // 2. Dispatch Logs
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mes_dispatch_logs' },
        (payload) => {
          const row = payload.new
          const existing = dispatchLogs.value.find(d => d.id === row.id)
          if (!existing) {
            dispatchLogs.value.unshift(mapSupabaseDispatchToLocal(row))
            if (row.divider_type) {
              const invItem = inventory.value.find(i => String(i.divider_type) === String(row.divider_type))
              if (invItem) invItem.available -= Number(row.quantity) || 0
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'mes_dispatch_logs' },
        (payload) => {
          const row = payload.new
          const idx = dispatchLogs.value.findIndex(d => d.id === row.id)
          if (idx !== -1) {
            dispatchLogs.value[idx] = mapSupabaseDispatchToLocal(row)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'mes_dispatch_logs' },
        (payload) => {
          const oldRow = payload.old
          dispatchLogs.value = dispatchLogs.value.filter(d => d.id !== oldRow.id)
        }
      )
      // 3. Financial Ledger (Cash advances, expenses, shift submissions, configs)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mes_financial_ledger' },
        (payload) => {
          const row = payload.new
          if (row.transaction_type === 'shift_submission') {
            if (!shiftSubmissions.value.some(s => s.id === row.id)) {
              let details = {}
              try { details = JSON.parse(row.notes) } catch {}
              shiftSubmissions.value.push({ ...row, details })
            }
          } else if (row.transaction_type === 'operator_config') {
            try {
              const parsed = JSON.parse(row.notes)
              const op = operators.value.find(o => o.id === row.operator_id)
              if (op) {
                if (parsed.work_types) op.work_types = parsed.work_types
                if (parsed.payroll_config) op.payroll_config = parsed.payroll_config
              }
            } catch {}
          } else if (row.transaction_type === 'system_config' && row.target_name === 'global') {
            try {
              const parsed = JSON.parse(row.notes)
              if (parsed.pieceRates) pieceRates.value = normalizePieceRates(parsed.pieceRates)
              if (parsed.wasteThresholds) wasteThresholds.value = parsed.wasteThresholds
              if (parsed.systemConfig) {
                systemConfig.value = {
                  ...defaultSystemConfig,
                  ...parsed.systemConfig,
                  otherDividerType: {
                    ...defaultSystemConfig.otherDividerType,
                    ...(parsed.systemConfig.otherDividerType || {})
                  },
                  otherPlacement: {
                    ...defaultSystemConfig.otherPlacement,
                    ...(parsed.systemConfig.otherPlacement || {})
                  }
                }
              }
              if (parsed.clockingWindows) {
                useAttendanceStore().clockingWindows = parsed.clockingWindows
              }
            } catch {}
          } else {
            const existing = cashEntries.value.find(c => c.id === row.id)
            if (!existing) {
              cashEntries.value.push(mapSupabaseCashToLocal(row))
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'mes_financial_ledger' },
        (payload) => {
          const row = payload.new
          if (row.transaction_type === 'shift_submission') {
            const s = shiftSubmissions.value.find(sub => sub.id === row.id)
            if (s) {
              s.transaction_type = row.transaction_type
              try { s.details = JSON.parse(row.notes) } catch {}
            }
          } else if (row.transaction_type === 'operator_config') {
            try {
              const parsed = JSON.parse(row.notes)
              const op = operators.value.find(o => o.id === row.operator_id)
              if (op) {
                if (parsed.work_types) op.work_types = parsed.work_types
                if (parsed.payroll_config) op.payroll_config = parsed.payroll_config
              }
            } catch {}
          } else if (row.transaction_type === 'system_config' && row.target_name === 'global') {
            try {
              const parsed = JSON.parse(row.notes)
              if (parsed.pieceRates) pieceRates.value = normalizePieceRates(parsed.pieceRates)
              if (parsed.wasteThresholds) wasteThresholds.value = parsed.wasteThresholds
              if (parsed.systemConfig) {
                systemConfig.value = {
                  ...defaultSystemConfig,
                  ...parsed.systemConfig,
                  otherDividerType: {
                    ...defaultSystemConfig.otherDividerType,
                    ...(parsed.systemConfig.otherDividerType || {})
                  },
                  otherPlacement: {
                    ...defaultSystemConfig.otherPlacement,
                    ...(parsed.systemConfig.otherPlacement || {})
                  }
                }
              }
              if (parsed.clockingWindows) {
                useAttendanceStore().clockingWindows = parsed.clockingWindows
              }
            } catch {}
          } else {
            const entry = cashEntries.value.find(c => c.id === row.id)
            if (entry) {
              entry.type = row.transaction_type
              entry.amount = row.amount
              entry.note = row.notes
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'mes_financial_ledger' },
        (payload) => {
          const oldRow = payload.old
          cashEntries.value = cashEntries.value.filter(c => c.id !== oldRow.id)
          shiftSubmissions.value = shiftSubmissions.value.filter(s => s.id !== oldRow.id)
        }
      )
      // 4. Operators & Customers
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mes_operators' },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload
          if (eventType === 'INSERT') {
            if (newRow.role !== 'customer' && !operators.value.some(o => o.id === newRow.id)) {
              operators.value.push({
                ...newRow,
                color: newRow.color || 'bg-blue-500'
              })
            }
          } else if (eventType === 'UPDATE') {
            const idx = operators.value.findIndex(o => o.id === newRow.id)
            if (idx !== -1) {
              operators.value[idx] = { ...operators.value[idx], ...newRow }
            }
          } else if (eventType === 'DELETE') {
            operators.value = operators.value.filter(o => o.id !== oldRow.id)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mes_customers' },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload
          if (eventType === 'INSERT') {
            if (!clients.value.some(c => c.id === newRow.id)) {
              clients.value.push({
                ...newRow,
                name: newRow.company_name,
                full_name: newRow.contact_person,
                avatar: newRow.company_name?.charAt(0).toUpperCase() || 'C',
                color: 'bg-emerald-500'
              })
            }
          } else if (eventType === 'UPDATE') {
            const idx = clients.value.findIndex(c => c.id === newRow.id)
            if (idx !== -1) {
              clients.value[idx] = {
                ...clients.value[idx],
                ...newRow,
                name: newRow.company_name,
                full_name: newRow.contact_person,
              }
            }
          } else if (eventType === 'DELETE') {
            clients.value = clients.value.filter(c => c.id !== oldRow.id)
          }
        }
      )
      .subscribe()
  }

  return {
    isLoading, fetchInitialData,
    operators, activeOperator, clockedInOperators,
    isOperatorClockedIn, clockIn, clockOut, setOperator,
    currentProductionWeek, setProductionWeek,
    actualCalendarWeek, weekStatus, shiftProductionWeek, resetToCurrentWeek,
    ledgerEntries, submitProductionLog, weeklyAggregation, isWeekendOvertime,
    inventory,
    cashEntries, addCashEntry, approveCashEntry, rejectCashEntry, totalAdvances, totalExpenses,
    dispatchLogs, clients, addClient, updateClient, deleteClient, addDispatch, totalDispatched,
    pieceRates, setPieceRate,
    wasteThresholds, setWasteThreshold,
    systemConfig, updateSystemConfig, saveSystemConfig,
    operatorEfficiency,
    totalGoodAllTime, totalWasteAllTime, overallWastePct,
    hasAdminAccess, grantAdminAccess, revokeAdminAccess,
    downtimeSessions, activeDowntime, startDowntime, resolveDowntime, logDowntime,
    shiftSubmissions, submitShift, approveShift, rejectShift, setOperatorWorkTypes, getOperatorWorkConfig,
    calculateEntryEarnings, getEntryRate,
    initRealtime,
  }
}, {
  persist: {
    key: 'divider-mes-core',
    // Only persist the fields that must survive a power-cut or offline reboot.
    // Computed getters, loading flags, and functions are excluded automatically.
    pick: [
      'ledgerEntries',
      'cashEntries',
      'shiftSubmissions',
      'pieceRates',
      'wasteThresholds',
      'systemConfig',
      'inventory',
      'operators',
      'clockedInOperators',
      'activeOperator'
    ],
  },
})
