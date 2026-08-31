<template>
  <AppLayout>
    <div class="dpl-wrapper">

      <!-- ─── Page Header ──────────────────────────────────────────────── -->
      <header class="dpl-header">
        <div class="header-left">
          <span class="material-symbols-rounded header-icon">edit_note</span>
          <div>
            <h1 class="header-title">የተሰራ ስራ የምመዘግበት</h1>
            <div class="flex items-center gap-2">
              <p class="header-sub">Daily Production Log · {{ currentWeekLabel }}</p>
              <span v-if="store.isWeekendOvertime()" class="overtime-badge">
                <span class="material-symbols-rounded" style="font-size:0.8rem">bolt</span>
                OVERTIME MULTIPLIER ACTIVE (1.5x)
              </span>
            </div>
          </div>
        </div>

        <div v-if="isAdmin" class="toggle-cluster" style="margin-left: auto; border: 1px solid #6366f1; background: rgba(99,102,241,0.1); padding: 0.5rem; border-radius: 0.5rem;">
          <p class="cluster-label" style="color: #818cf8; font-size: 0.7rem;">ADMIN TARGET OPERATOR</p>
          <select v-model="targetOperatorId" class="mega-toggle" style="background: transparent; color: #fff; font-size: 0.9rem; padding: 0.2rem; cursor: pointer; outline: none; border: none;">
             <option value="all" style="color: #000">All Operators (View-Only Total)</option>
             <option v-for="op in store.operators" :value="op.id" :key="op.id" style="color: #000">{{ op.name }} ({{ op.role }})</option>
          </select>
        </div>

        <!-- Category Toggles -->
        <div class="toggle-cluster">
          <p class="cluster-label">Work Category</p>
          <div class="toggle-row">
            <button
              v-for="cat in ['MFG', 'PP', 'PL', 'C', 'TIME']"
              :key="cat"
              class="mega-toggle"
              :class="{ 'mega-toggle--active': activeCategory === cat }"
              @click="activeCategory = cat"
            >{{ cat }}</button>
          </div>
        </div>

        <!-- Placement Toggles -->
        <div class="toggle-cluster" v-if="activeCategory === 'C'">
          <p class="cluster-label">Placement</p>
          <div class="toggle-row">
            <button
              v-for="p in placements"
              :key="p"
              class="mega-toggle"
              :class="{ 'mega-toggle--active': activePlacement === p }"
              @click="activePlacement = p"
            >{{ p === 'Other' ? (store.systemConfig.otherPlacement?.label || 'Other') : p }}</button>
          </div>
        </div>

        <!-- Size Toggles -->
        <div class="toggle-cluster" v-if="activeCategory !== 'TIME' && activeCategory !== 'MFG'">
          <p class="cluster-label">Size</p>
          <div class="toggle-row">
            <button
              v-for="s in sizes"
              :key="s"
              class="mega-toggle mega-toggle--size"
              :class="{ 'mega-toggle--active': activeSize === s }"
              @click="activeSize = s"
            >{{ s }}</button>
          </div>
        </div>
      </header>

      <!-- ─── Main Body: Grid + Numpad ─────────────────────────────────── -->
      <div class="dpl-body flex flex-col lg:flex-row">

        <!-- Data Grid -->
        <div class="grid-container w-full overflow-x-auto">
          <table class="ledger-table">
            <thead>
              <tr>
                <th class="day-col">Day</th>
                <th v-for="col in columns" :key="col" class="type-col">
                  <span class="col-badge">{{ col === 'Other' ? (store.systemConfig.otherDividerType?.label || 'Other') : col }}</span>
                </th>
                <th class="total-col">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="day in days"
                :key="day"
                class="ledger-row"
                :class="{ 'row--active': activeCell?.day === day }"
              >
                <td class="day-cell">{{ day }}</td>
                <td
                  v-for="col in columns"
                  :key="col"
                  class="data-cell"
                  :class="{
                    'cell--active': activeCell?.day === day && activeCell?.col === col,
                    'cell--filled': getCellValue(day, col, activePlacement, activeSize) > 0,
                    'cursor-not-allowed opacity-90': isAdmin && targetOperatorId === 'all'
                  }"
                  @click="openNumpad(day, col)"
                >
                  <span class="cell-value">
                    {{ getCellValue(day, col, activePlacement, activeSize) || '' }}
                  </span>
                  <span v-if="getCellValue(day, col, activePlacement, activeSize) > 0" class="cell-unit">
                    {{ activeCategory === 'TIME' ? 'hrs' : 'pcs' }}
                  </span>
                </td>
                <td class="total-cell">
                  <strong>{{ getRowTotal(day, activePlacement, activeSize) || '—' }}</strong>
                </td>
              </tr>

              <!-- Column Totals Row -->
              <tr class="totals-row">
                <td class="day-cell totals-label">TOTAL</td>
                <td v-for="col in columns" :key="col" class="totals-cell">
                  {{ getColTotal(col, activePlacement, activeSize) || '—' }}
                </td>
                <td class="totals-cell grand-total">
                  {{ getGrandTotal(activePlacement, activeSize) || '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- ─── Numpad Panel ─────────────────────────────────────────── -->
        <div class="numpad-panel lg:h-full lg:w-0 w-full transition-all duration-300" :class="{ 'lg:w-[26rem] h-auto lg:h-full p-4 lg:p-0': !!activeCell, 'h-0 overflow-hidden lg:h-full': !activeCell }">
          <div v-if="activeCell" class="numpad-inner">
            <div class="numpad-context">
              <span v-if="activeCategory === 'C'" class="ctx-badge ctx-placement">{{ activePlacement }}</span>
              <span v-if="activeCategory !== 'TIME' && activeCategory !== 'MFG'" class="ctx-badge ctx-size">{{ activeSize }}</span>
              <span class="ctx-badge ctx-day">{{ activeCell.day }}</span>
              <span class="ctx-badge ctx-col">{{ activeCategory === 'TIME' || activeCategory === 'C' ? activeCell.col : `Type ${activeCell.col}` }}</span>
            </div>

            <VirtualNumpad
              :label="`Day ${activeCell.day} · ${activeCategory === 'TIME' || activeCategory === 'C' ? activeCell.col : `Type ${activeCell.col}`}`"
              v-model="numpadValue"
              :allowDecimal="activeCategory === 'TIME'"
              :maxLen="5"
            />

            <div class="numpad-actions">
              <button class="btn-cancel" @click="cancelNumpad">
                <span class="material-symbols-rounded">close</span>
                Cancel
              </button>
              <button class="btn-confirm" @click="confirmEntry">
                <span class="material-symbols-rounded">check_circle</span>
                CONFIRM
              </button>
            </div>
          </div>

          <!-- Idle state when no cell selected -->
          <div v-else class="numpad-idle">
            <span class="material-symbols-rounded idle-icon">touch_app</span>
            <p v-if="isAdmin && targetOperatorId === 'all'" class="text-amber-300 font-bold text-xs">
              Viewing All Operators (Total). Select a specific operator above to log or edit.
            </p>
            <template v-else>
              <p>Tap any cell in the grid to log quantity</p>
              <p class="idle-sub">{{ activePlacement }} · {{ activeSize }}</p>
            </template>
          </div>
        </div>
      </div>

      <!-- ─── Toast ──────────────────────────────────────────────────── -->
      <Transition name="toast">
        <div v-if="toast.visible" class="dpl-toast">
          <span class="material-symbols-rounded">check_circle</span>
          {{ toast.message }}
        </div>
      </Transition>

    </div>
  </AppLayout>
</template>

<script setup>
// Developer: Mintesnot Abebe | Brand: dev MinteIO
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import AppLayout  from '@/components/layout/AppLayout.vue'
import VirtualNumpad from '@/components/ui/VirtualNumpad.vue'

import { useMesStore } from '@/store/mesStore.js'
import { useSystemAuthStore } from '@/store/systemAuthStore.js'

const store = useMesStore()
const sysAuth = useSystemAuthStore()

let refreshTimer = null
onMounted(() => {
  store.fetchInitialData()
  refreshTimer = setInterval(() => {
    store.fetchInitialData()
  }, 30000) // refresh every 30s
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})

const isAdmin = computed(() => {
  const role = sysAuth.currentRole || store.activeOperator?.role
  return role === 'admin' || role === 'System Admin' || role === 'manager' || role === 'Supervisor'
})
const targetOperatorId = ref('all') // Default to 'all' for admins to see everyone's entries.

// ─── Constants ─────────────────────────────────────────────────────────────
const allDividerTypes = ['50', '40', '30', '16', '12', '45', 'Other']
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const dayIndexMap = { 'Mon': 0, 'Tue': 1, 'Wed': 2, 'Thu': 3, 'Fri': 4, 'Sat': 5, 'Sun': 6 }
const sizes = ['9cm', '7cm']

const placements = computed(() => {
  return store.systemConfig.otherPlacement?.enabled ? ['ብተና', 'ውስጥ', 'የተለየ', 'Other'] : ['ብተና', 'ውስጥ', 'የተለየ']
})

// ─── Active Filters ────────────────────────────────────────────────────────
const activeCategory  = ref('MFG')
const activePlacement = ref('ብተና')
const activeSize      = ref('9cm')

const columns = computed(() => {
  if (activeCategory.value === 'TIME') return ['Hours']
  if (activeCategory.value === 'C') return ['Units']
  return allDividerTypes
})

function parseEntryDate(e) {
  if (e.productionDate) {
    if (typeof e.productionDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.productionDate)) {
      const [y, m, d] = e.productionDate.split('-').map(Number)
      return new Date(y, m - 1, d)
    }
    const d = new Date(e.productionDate)
    if (!isNaN(d.getTime())) return d
  }
  if (e.timestamp) {
    const d = new Date(e.timestamp)
    if (!isNaN(d.getTime())) return d
  }
  return new Date()
}

function getWeekStartDate(weekStr) {
  if (!weekStr) return new Date()
  const parts = weekStr.split('-W')
  if (parts.length !== 2) return new Date()
  const year = parseInt(parts[0], 10)
  const week = parseInt(parts[1], 10)
  const jan4 = new Date(year, 0, 4)
  const jan4Day = (jan4.getDay() + 6) % 7 // Mon = 0
  const monWeek1 = new Date(year, 0, 4 - jan4Day)
  const targetMon = new Date(monWeek1)
  targetMon.setDate(monWeek1.getDate() + (week - 1) * 7)
  return targetMon
}

// ─── Grid Data Store ───────────────────────────────────────────────────────
function getCellValue(dayName, col, placement, size) {
  const targetIndex = dayIndexMap[dayName]
  const filterId = isAdmin.value ? targetOperatorId.value : (sysAuth.currentEmployeeId || store.activeOperator?.id)

  return store.ledgerEntries
    .filter(e => {
       const entryDate = parseEntryDate(e)
       const entryDayIndex = (entryDate.getDay() + 6) % 7 // Mon = 0 ... Sun = 6
       const dayMatch = entryDayIndex === targetIndex
       const opMatch = filterId === 'all' || String(e.operator_id) === String(filterId)
       const catMatch = (e.workCategory || 'MFG') === activeCategory.value
       
       if (activeCategory.value === 'TIME') {
         return dayMatch && opMatch && catMatch
       }
       
       const colMatch = activeCategory.value === 'C' ? true : String(e.dividerType || '').trim() === String(col).trim()
       const placeMatch = activeCategory.value === 'C'
         ? String(e.placement || '').trim() === String(placement).trim() 
         : true
       const sizeMatch = (activeCategory.value !== 'MFG') 
         ? String(e.size || '').trim() === String(size).trim()
         : true
       
       return dayMatch && colMatch && placeMatch && sizeMatch && opMatch && catMatch
    })
    .reduce((sum, e) => {
      if (activeCategory.value === 'TIME') return sum + (Number(e.hoursWorked) || 0)
      return sum + (Number(e.goodProduction) || 0)
    }, 0)
}

// ─── Totals ────────────────────────────────────────────────────────────────
function getRowTotal(day, placement, size) {
  return columns.value.reduce((sum, col) => sum + (getCellValue(day, col, placement, size) || 0), 0)
}
function getColTotal(col, placement, size) {
  return days.reduce((sum, day) => sum + (getCellValue(day, col, placement, size) || 0), 0)
}
function getGrandTotal(placement, size) {
  return days.reduce((sum, day) => sum + getRowTotal(day, placement, size), 0)
}

// ─── Numpad State ──────────────────────────────────────────────────────────
const activeCell   = ref(null) // { day, col }
const numpadValue  = ref('')

function openNumpad(day, col) {
  if (isAdmin.value && targetOperatorId.value === 'all') {
    showToast('Select a specific operator to log entries. "All Operators" is view-only.')
    return
  }
  activeCell.value = { day, col }
  const currentTotal = getCellValue(day, col, activePlacement.value, activeSize.value)
  numpadValue.value = currentTotal > 0 ? String(currentTotal) : ''
}

function cancelNumpad() {
  activeCell.value  = null
  numpadValue.value = ''
}

async function confirmEntry() {
  if (!activeCell.value) return
  const newTotal = Number(numpadValue.value) || 0
  const currentTotal = getCellValue(activeCell.value.day, activeCell.value.col, activePlacement.value, activeSize.value)
  const qtyDiff = newTotal - currentTotal

  if (qtyDiff === 0) {
    cancelNumpad()
    return
  }

  await performSave()
}

async function performSave() {
  const newTotal = Number(numpadValue.value) || 0
  const currentTotal = getCellValue(activeCell.value.day, activeCell.value.col, activePlacement.value, activeSize.value)
  const qtyDiff = newTotal - currentTotal

  // Calculate target date for the cell strictly based on the current production week
  const targetDayOffset = dayIndexMap[activeCell.value.day]
  const weekMon = getWeekStartDate(store.currentProductionWeek)
  const targetDateObj = new Date(weekMon)
  targetDateObj.setDate(weekMon.getDate() + targetDayOffset)
  targetDateObj.setHours(12, 0, 0, 0)
  
  const targetDateStr = targetDateObj.toISOString().split('T')[0]
  const targetTimestamp = targetDateObj.toISOString()

  const currentOpId = sysAuth.currentEmployeeId || store.activeOperator?.id
  const submitOpId = isAdmin.value && targetOperatorId.value !== 'all' ? targetOperatorId.value : currentOpId

  const result = await store.submitProductionLog({
    workCategory:   activeCategory.value,
    dividerType:    (activeCategory.value === 'TIME' || activeCategory.value === 'C') ? null : activeCell.value.col,
    placement:      activeCategory.value === 'C' ? activePlacement.value : null,
    size:           (activeCategory.value === 'MFG' || activeCategory.value === 'TIME') ? null : activeSize.value,
    goodProduction: activeCategory.value === 'TIME' ? 0 : qtyDiff,
    hoursWorked:    activeCategory.value === 'TIME' ? qtyDiff : null,
    wasteMaterial:  0,
    operator_id:    submitOpId,
    production_date: targetDateStr,
    timestamp_override: targetTimestamp,
    loggedByAdmin:  isAdmin.value && submitOpId !== currentOpId
  })
  
  if (result.ok) {
    const colLabel = activeCategory.value === 'TIME' || activeCategory.value === 'C' ? activeCell.value.col : `Type ${activeCell.value.col}`
    showToast(`✓ Updated ${activeCell.value.day} / ${colLabel} to ${newTotal}`)
  } else {
    showToast(`⚠ Saved locally but sync failed`)
  }
  
  cancelNumpad()
}

// ─── Week Label ────────────────────────────────────────────────────────────
const currentWeekLabel = computed(() => store.currentProductionWeek)

// ─── Toast ─────────────────────────────────────────────────────────────────
const toast = reactive({ visible: false, message: '' })
let toastTimer = null
function showToast(msg) {
  toast.message = msg
  toast.visible = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.visible = false }, 2500)
}
</script>

<style scoped>
/* ── Wrapper ─────────────────────────────────────────────────────────────── */
.dpl-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #0f172a;
  position: relative;
}

/* ── Header ──────────────────────────────────────────────────────────────── */
.dpl-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: .9rem 1.5rem;
  background: #1e293b;
  border-bottom: 1px solid rgba(99,102,241,.25);
  flex-shrink: 0;
  
  overflow-x: auto;
  scrollbar-width: thin;
}

.dpl-header::-webkit-scrollbar {
  height: 6px;
}
.dpl-header::-webkit-scrollbar-track {
  background: transparent;
}
.dpl-header::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.1);
  border-radius: 4px;
}
.dpl-header::-webkit-scrollbar-thumb:hover {
  background: rgba(255,255,255,0.2);
}

.header-left {
  display: flex;
  align-items: center;
  gap: .75rem;
  flex-shrink: 0;
  margin-right: 1rem;
}
.header-icon { font-size: 2rem; color: #6366f1; }
.header-title {
  font-size: 1.1rem;
  font-weight: 800;
  color: #f1f5f9;
  letter-spacing: .01em;
  line-height: 1.2;
}
.header-sub { font-size: .65rem; color: #64748b; letter-spacing: .07em; }

.overtime-badge {
  display: flex;
  align-items: center;
  gap: 0.15rem;
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #fbbf24;
  font-size: 0.6rem;
  font-weight: 800;
  padding: 0.15rem 0.4rem;
  border-radius: 999px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

/* ── Toggle Clusters ─────────────────────────────────────────────────────── */
.toggle-cluster {
  display: flex;
  flex-direction: column;
  gap: .3rem;
  flex-shrink: 0;
}
.cluster-label {
  font-size: .6rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: .08em;
}
.toggle-row {
  display: flex;
  gap: .35rem;
}
.mega-toggle {
  padding: .35rem .75rem;
  border-radius: .45rem;
  border: 1px solid rgba(255,255,255,.1);
  background: #0f172a;
  color: #94a3b8;
  font-size: .78rem;
  font-weight: 700;
  cursor: pointer;
  transition: all .15s ease;
}
.mega-toggle:hover {
  border-color: rgba(99,102,241,.4);
  color: #f1f5f9;
}
.mega-toggle--active {
  background: #6366f1 !important;
  border-color: #6366f1 !important;
  color: #fff !important;
}

/* ── Main Body ───────────────────────────────────────────────────────────── */
.dpl-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

.grid-container {
  flex: 1;
  padding: 1.25rem;
  overflow: auto;
}

.ledger-table {
  width: 100%;
  border-collapse: collapse;
  background: #1e293b;
  border-radius: .75rem;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.07);
}

.ledger-table th, .ledger-table td {
  padding: .75rem .6rem;
  text-align: center;
  border-bottom: 1px solid rgba(255,255,255,.05);
  border-right: 1px solid rgba(255,255,255,.05);
}
.ledger-table th {
  background: #0f172a;
  font-size: .7rem;
  font-weight: 800;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: .05em;
}

.day-col, .day-cell {
  width: 65px;
  font-weight: 800;
  color: #a5b4fc !important;
  background: #0f172a;
  font-size: .8rem;
}
.col-badge {
  background: rgba(99,102,241,.1);
  padding: .2rem .4rem;
  border-radius: .3rem;
  color: #a5b4fc;
}

.data-cell {
  cursor: pointer;
  transition: background .12s;
  min-width: 60px;
}
.data-cell:hover { background: rgba(99,102,241,.1); }
.cell--active { background: rgba(99,102,241,.25) !important; outline: 2px solid #6366f1; }
.cell--filled { font-weight: 800; color: #34d399; }

.cell-value { font-size: .95rem; font-family: monospace; }
.cell-unit  { font-size: .6rem; color: #64748b; margin-left: 2px; }

.total-col, .total-cell {
  background: #0f172a;
  color: #f1f5f9;
  font-family: monospace;
  font-size: .9rem;
}
.totals-row td {
  background: #0f172a;
  font-weight: 800;
  color: #f1f5f9;
  border-top: 2px solid rgba(99,102,241,.3);
}
.grand-total {
  color: #34d399 !important;
  font-size: 1.1rem;
}

/* ── Numpad Panel ────────────────────────────────────────────────────────── */
.numpad-panel {
  background: #1e293b;
  border-left: 1px solid rgba(99,102,241,.2);
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.numpad-inner {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
  max-width: 320px;
  margin: 0 auto;
  width: 100%;
}
.numpad-context {
  display: flex;
  gap: .4rem;
  flex-wrap: wrap;
}
.ctx-badge {
  font-size: .65rem;
  font-weight: 800;
  padding: .2rem .5rem;
  border-radius: .4rem;
  text-transform: uppercase;
}
.ctx-placement { background: rgba(245,158,11,.15); color: #fbbf24; }
.ctx-size      { background: rgba(16,185,129,.15); color: #34d399; }
.ctx-day       { background: rgba(99,102,241,.15); color: #a5b4fc; }
.ctx-col       { background: rgba(236,72,153,.15); color: #f472b6; }

.numpad-actions {
  display: flex;
  gap: .75rem;
}
.btn-cancel, .btn-confirm {
  flex: 1;
  height: 3.25rem;
  border-radius: .65rem;
  border: none;
  font-weight: 800;
  font-size: .85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: .3rem;
  cursor: pointer;
  transition: all .15s ease;
}
.btn-cancel  { background: rgba(255,255,255,.06); color: #94a3b8; }
.btn-confirm { background: #10b981; color: #fff; }
.btn-cancel:hover  { background: rgba(255,255,255,.1); }
.btn-confirm:hover { filter: brightness(1.1); }

.numpad-idle {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: .5rem;
  padding: 2rem;
  color: #475569;
  text-align: center;
}
.idle-icon { font-size: 3rem; color: #334155; }
.idle-sub  { font-size: .75rem; color: #64748b; }

/* ── Toast ───────────────────────────────────────────────────────────────── */
.dpl-toast {
  position: absolute;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(16,185,129,.95);
  color: #fff;
  padding: .7rem 1.5rem;
  border-radius: .65rem;
  font-weight: 700;
  font-size: .85rem;
  display: flex;
  align-items: center;
  gap: .4rem;
  backdrop-filter: blur(8px);
  z-index: 100;
  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.4);
}
.toast-enter-active, .toast-leave-active { transition: all .2s ease; }
.toast-enter-from, .toast-leave-to       { opacity: 0; transform: translate(-50%, 1rem); }
</style>
