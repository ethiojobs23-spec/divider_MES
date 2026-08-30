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
             <option value="all" style="color: #000">All Operators (Total)</option>
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
                    'cell--filled': getCellValue(day, col, activePlacement, activeSize) > 0
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
            <p>Tap any cell in the grid to log quantity</p>
            <p class="idle-sub">{{ activePlacement }} · {{ activeSize }}</p>
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
const targetOperatorId = ref('all') // Default to 'all' for admins to see everyone's entries. Non-admins will be filtered below.

// ─── Constants ─────────────────────────────────────────────────────────────
const allDividerTypes = ['50', '40', '30', '16', '12', '45', 'Other']
const days      = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const sizes      = ['9cm', '7cm']

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

// ─── Grid Data Store ───────────────────────────────────────────────────────
function getCellValue(dayName, col, placement, size) {
  const dayMap = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 }
  const targetDay = dayMap[dayName]
  
  const filterId = isAdmin.value ? targetOperatorId.value : (sysAuth.currentEmployeeId || store.activeOperator?.id)

  return store.ledgerEntries
    .filter(e => {
       const dayMatch = new Date(e.productionDate || e.timestamp).getDay() === targetDay
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

  // Calculate target date for the cell based on current week
  const dayMap = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 }
  const targetDayIdx = dayMap[activeCell.value.day]
  
  // Find the exact date in the currently selected production week
  const now = new Date()
  const currentDayOfWeek = now.getDay()
  // calculate start of the current week (Sunday)
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - currentDayOfWeek)
  
  const targetDateObj = new Date(startOfWeek)
  targetDateObj.setDate(startOfWeek.getDate() + targetDayIdx)
  // Ensure the time is set to noon to avoid timezone shift when saving ISO date
  targetDateObj.setHours(12, 0, 0, 0)
  const targetDateStr = targetDateObj.toISOString().split('T')[0]
  // We'll pass the exact timestamp for the ledger entries
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
  
  /* Make header horizontally scrollable */
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
  flex-shrink: 0; /* Prevents squeezing, forces horizontal scrolling instead */
}
.cluster-label {
  font-size: .6rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: .1em;
}
.toggle-row { display: flex; gap: .4rem; }
.mega-toggle {
  min-width: 4.5rem;
  height: 2.75rem;
  padding: 0 .85rem;
  background: #0f172a;
  border: 1.5px solid rgba(255,255,255,.1);
  border-radius: .55rem;
  color: #94a3b8;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all .13s ease;
  -webkit-tap-highlight-color: transparent;
  letter-spacing: .01em;
}
.mega-toggle:hover { background: #1e293b; color: #e2e8f0; border-color: rgba(255,255,255,.2); }
.mega-toggle:active { transform: scale(.95); }
.mega-toggle--active {
  background: rgba(99,102,241,.2);
  border-color: #6366f1;
  color: #a5b4fc;
  box-shadow: 0 0 0 2px rgba(99,102,241,.15);
}
.mega-toggle--size { min-width: 3.5rem; }

/* ── Body ────────────────────────────────────────────────────────────────── */
.dpl-body {
  flex: 1;
  display: flex;
  gap: 0;
  overflow: hidden;
}

/* ── Grid Container ──────────────────────────────────────────────────────── */
.grid-container {
  flex: 1;
  overflow: auto;
  padding: 1rem 1.25rem;
}

.ledger-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 3px;
}

/* Header Row */
.ledger-table thead tr {
  position: sticky;
  top: -1rem;
  z-index: 2;
}
.ledger-table th {
  padding: .6rem .4rem;
  background: #1e293b;
  color: #64748b;
  font-size: .65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .08em;
  border-radius: .35rem;
}
.day-col   { width: 4rem; min-width: 4rem; }
.type-col  { min-width: 6rem; }
.total-col { min-width: 5rem; background: rgba(99,102,241,.1); color: #a5b4fc !important; }
.col-badge {
  display: inline-block;
  background: rgba(99,102,241,.15);
  color: #a5b4fc;
  border-radius: .3rem;
  padding: .15rem .45rem;
  font-size: .75rem;
  font-weight: 800;
}

/* Data Rows */
.ledger-row { transition: background .1s ease; }
.ledger-row:hover .day-cell { color: #e2e8f0; }
.row--active .day-cell { color: #a5b4fc; }

.day-cell {
  background: #1e293b;
  color: #94a3b8;
  font-size: .85rem;
  font-weight: 800;
  text-align: center;
  padding: .5rem;
  border-radius: .35rem;
  letter-spacing: .04em;
  transition: color .13s;
}

.data-cell {
  background: rgba(255,255,255,.03);
  border: 1.5px solid rgba(255,255,255,.07);
  border-radius: .45rem;
  text-align: center;
  padding: .55rem .25rem;
  cursor: pointer;
  transition: all .13s ease;
  position: relative;
  min-height: 3.5rem;
  vertical-align: middle;
}
.data-cell:hover {
  background: rgba(99,102,241,.12);
  border-color: rgba(99,102,241,.35);
}
.data-cell:active { transform: scale(.97); }
.cell--active {
  background: rgba(99,102,241,.22) !important;
  border-color: #6366f1 !important;
  box-shadow: 0 0 0 2px rgba(99,102,241,.2);
}
.cell--filled {
  background: rgba(16,185,129,.07);
  border-color: rgba(16,185,129,.25);
}
.cell--filled:hover { background: rgba(16,185,129,.14); border-color: rgba(16,185,129,.4); }
.cell-value {
  display: block;
  font-size: 1.2rem;
  font-weight: 800;
  color: #e2e8f0;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.cell-unit {
  font-size: .55rem;
  color: #64748b;
  letter-spacing: .06em;
  text-transform: uppercase;
}

.total-cell {
  background: rgba(99,102,241,.08);
  border: 1px solid rgba(99,102,241,.15);
  border-radius: .45rem;
  text-align: center;
  padding: .5rem;
  font-variant-numeric: tabular-nums;
}
.total-cell strong { font-size: 1.1rem; font-weight: 800; color: #a5b4fc; }

/* Totals Row */
.totals-row .day-cell.totals-label {
  background: rgba(99,102,241,.12);
  color: #a5b4fc;
  font-size: .7rem;
  letter-spacing: .08em;
}
.totals-cell {
  background: rgba(99,102,241,.1);
  border: 1px solid rgba(99,102,241,.2);
  border-radius: .45rem;
  text-align: center;
  padding: .55rem;
  font-size: 1rem;
  font-weight: 800;
  color: #a5b4fc;
  font-variant-numeric: tabular-nums;
}
.grand-total {
  background: rgba(139,92,246,.2);
  border-color: rgba(139,92,246,.4);
  color: #c4b5fd;
  font-size: 1.1rem;
}

/* ── Numpad Panel ────────────────────────────────────────────────────────── */
.numpad-panel {
  width: 0;
  flex-shrink: 0;
  background: #1e293b;
  border-left: 1px solid rgba(99,102,241,.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: width .25s cubic-bezier(.4,0,.2,1);
}
.numpad-panel.panel--open { width: 26rem; }

.numpad-inner {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
  overflow: hidden;
}

.numpad-context {
  display: flex;
  flex-wrap: wrap;
  gap: .4rem;
}
.ctx-badge {
  padding: .2rem .6rem;
  border-radius: 999px;
  font-size: .65rem;
  font-weight: 700;
  letter-spacing: .06em;
  text-transform: uppercase;
}
.ctx-placement { background: rgba(99,102,241,.2); color: #a5b4fc; }
.ctx-size      { background: rgba(16,185,129,.15); color: #34d399; }
.ctx-day       { background: rgba(245,158,11,.15); color: #fbbf24; }
.ctx-col       { background: rgba(239,68,68,.15); color: #f87171; }

.numpad-actions {
  display: flex;
  gap: .65rem;
  flex-shrink: 0;
}
.btn-cancel, .btn-confirm {
  flex: 1;
  height: 3.5rem;
  border-radius: .65rem;
  font-size: .9rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: .5rem;
  cursor: pointer;
  transition: all .13s ease;
  -webkit-tap-highlight-color: transparent;
}
.btn-cancel {
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.12);
  color: #94a3b8;
}
.btn-cancel:hover { background: rgba(255,255,255,.1); color: #e2e8f0; }
.btn-confirm {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border: none;
  color: #fff;
  letter-spacing: .06em;
}
.btn-confirm:hover  { filter: brightness(1.12); }
.btn-confirm:active { transform: scale(.97); }

/* Idle State */
.numpad-idle {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: .6rem;
  color: #334155;
  font-size: .85rem;
  font-weight: 600;
  text-align: center;
  padding: 1.5rem;
}
.idle-icon { font-size: 3.5rem; color: #334155; display: block; margin-bottom: .25rem; }
.idle-sub  { font-size: .75rem; color: #475569; }

/* ── Toast ───────────────────────────────────────────────────────────────── */
.dpl-toast {
  position: absolute;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(16,185,129,.9);
  color: #fff;
  border-radius: .65rem;
  padding: .75rem 1.5rem;
  font-size: .9rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: .4rem;
  backdrop-filter: blur(8px);
  z-index: 10;
  white-space: nowrap;
}
.toast-enter-active, .toast-leave-active { transition: all .25s ease; }
.toast-enter-from, .toast-leave-to       { opacity: 0; transform: translate(-50%, 1rem); }

/* ── Mobile Responsive ────────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .dpl-wrapper {
    height: auto;
    min-height: 100%;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-y;
    padding-bottom: 3.5rem;
  }
  .dpl-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem;
  }
  .toggle-cluster {
    width: 100%;
    overflow-x: auto;
  }
  .toggle-row {
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .toggle-row::-webkit-scrollbar { display: none; }
  .grid-container {
    padding: 0.75rem 0.5rem;
    overflow-x: auto;
  }
  .numpad-panel.panel--open {
    position: fixed;
    inset: 0;
    width: 100% !important;
    height: 100%;
    z-index: 100;
    border-left: none;
    background: rgba(15, 23, 42, 0.98);
    backdrop-filter: blur(12px);
  }
  .numpad-inner {
    padding: 1.5rem 1rem;
    justify-content: center;
    max-width: 380px;
    margin: 0 auto;
  }
}
</style>
