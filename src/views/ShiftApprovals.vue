<template>
  <AppLayout>
    <div class="sa-root">
      <header class="sa-header">
        <div>
          <h1 class="sa-title">
            <span class="material-symbols-rounded" style="color:#fbbf24">task_alt</span>
            Shift Approvals
          </h1>
          <p class="sa-sub">Review and authorize employee shift submissions. Supervisor / Admin PIN required.</p>
        </div>

        <div class="header-right flex items-center gap-3">
          <button class="sync-btn cursor-pointer" :disabled="isSyncing" @click="manualSync" title="Sync submissions now">
            <span class="material-symbols-rounded" :class="{ 'spin-icon': isSyncing }">sync</span>
            <span>{{ isSyncing ? 'Syncing...' : 'Sync' }}</span>
          </button>

          <div class="header-counts">
            <div class="count-chip count-chip--warn">
              <span class="material-symbols-rounded">pending</span>
              {{ pendingSubmissions.length }} Pending
            </div>
            <div class="count-chip count-chip--green">
              <span class="material-symbols-rounded">check_circle</span>
              {{ approvedToday }} Approved Today
            </div>
          </div>
        </div>
      </header>

      <!-- Filters -->
      <div class="filters">
        <button
          v-for="f in ['all','pending','approved','rejected']"
          :key="f"
          class="filter-btn"
          :class="{ 'filter-btn--active': filterStatus === f }"
          @click="filterStatus = f"
        >{{ f.charAt(0).toUpperCase() + f.slice(1) }}</button>
      </div>

      <!-- Submissions list -->
      <div class="submissions-list">
        <div
          v-for="sub in filteredSubmissions"
          :key="sub.id"
          class="submission-card"
          :class="'submission-card--' + sub.target_name"
        >
          <!-- Top row: operator + date + status -->
          <div class="card-top">
            <OperatorAvatar :name="operatorName(sub.operator_id)" size="sm" />
            <div class="card-info">
              <h3>{{ operatorName(sub.operator_id) }}</h3>
              <p>{{ new Date(sub.transaction_date).toLocaleDateString('en-GB', { weekday:'long', day:'2-digit', month:'long' }) }}</p>
            </div>
            <div class="status-badge" :class="'status-badge--' + sub.target_name">
              {{ sub.target_name?.toUpperCase() }}
            </div>
          </div>

          <!-- Stats -->
          <div class="card-stats">
            <!-- TIME worker stats -->
            <template v-if="sub.details?.isTimeWorker">
              <div class="card-stat">
                <span class="stat-lbl">Hours Worked</span>
                <span class="stat-val" style="color:#34d399">{{ sub.details?.hoursWorkedToday ?? '—' }}h</span>
              </div>
              <div class="card-stat">
                <span class="stat-lbl">Hourly Rate</span>
                <span class="stat-val" style="color:#a5b4fc">ETB {{ sub.details?.hourlyRate ?? '—' }}/hr</span>
              </div>
              <div class="card-stat">
                <span class="stat-lbl">Clock In</span>
                <span class="stat-val" style="color:#94a3b8; font-size:.85rem;">
                  {{ sub.details?.clockIn ? new Date(sub.details.clockIn).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '—' }}
                </span>
              </div>
              <div class="card-stat">
                <span class="stat-lbl">Clock Out</span>
                <span class="stat-val" style="font-size:.85rem;" :style="{ color: sub.details?.clockOut ? '#34d399' : '#f59e0b' }">
                  {{ sub.details?.clockOut ? new Date(sub.details.clockOut).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'Not clocked out' }}
                </span>
              </div>
            </template>
            <!-- Piece-rate worker stats -->
            <template v-else>
              <div class="card-stat">
                <span class="stat-lbl">Good Pcs</span>
                <span class="stat-val" style="color:#34d399">{{ sub.details?.totalGood ?? '—' }}</span>
              </div>
              <div class="card-stat">
                <span class="stat-lbl">Waste Pcs</span>
                <span class="stat-val" style="color:#f87171">{{ sub.details?.totalWaste ?? '—' }}</span>
              </div>
              <div class="card-stat">
                <span class="stat-lbl">Entries</span>
                <span class="stat-val" style="color:#a5b4fc">{{ sub.details?.entries?.length ?? '—' }}</span>
              </div>
            </template>
            <!-- Always show earnings -->
            <div class="card-stat">
              <span class="stat-lbl">Est. Earnings</span>
              <span class="stat-val" style="color:#fbbf24">ETB {{ Number(sub.amount).toFixed(2) }}</span>
            </div>
          </div>

          <!-- TIME worker breakdown -->
          <div v-if="expanded === sub.id && sub.details?.isTimeWorker" class="entry-table-wrap" style="background:rgba(99,102,241,0.05); border:1px solid rgba(99,102,241,0.15); border-radius:.75rem; padding:1.25rem; display:flex; flex-direction:column; gap:.75rem;">
            <p style="font-size:.75rem; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:.08em; margin:0;">Hourly Work Summary</p>
            <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:1rem;">
              <div>
                <p style="font-size:.65rem; color:#64748b; font-weight:700; margin:0 0 .25rem;">Clock In</p>
                <p style="font-size:1.1rem; font-weight:900; font-family:monospace; color:#a5b4fc; margin:0;">
                  {{ sub.details?.clockIn ? new Date(sub.details.clockIn).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '—' }}
                </p>
              </div>
              <div>
                <p style="font-size:.65rem; color:#64748b; font-weight:700; margin:0 0 .25rem;">Clock Out</p>
                <p style="font-size:1.1rem; font-weight:900; font-family:monospace; margin:0;" :style="{ color: sub.details?.clockOut ? '#34d399' : '#f59e0b' }">
                  {{ sub.details?.clockOut ? new Date(sub.details.clockOut).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'Not out yet' }}
                </p>
              </div>
              <div>
                <p style="font-size:.65rem; color:#64748b; font-weight:700; margin:0 0 .25rem;">Total Hours</p>
                <p style="font-size:1.1rem; font-weight:900; font-family:monospace; color:#34d399; margin:0;">{{ sub.details?.hoursWorkedToday ?? 0 }}h</p>
              </div>
            </div>
            <div style="border-top:1px solid rgba(255,255,255,.05); padding-top:.75rem; display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:.85rem; color:#94a3b8;">{{ sub.details?.hoursWorkedToday ?? 0 }} hrs × ETB {{ sub.details?.hourlyRate ?? 0 }}/hr</span>
              <span style="font-size:1rem; font-weight:900; color:#fbbf24;">= ETB {{ Number(sub.amount).toFixed(2) }}</span>
            </div>
          </div>

          <!-- Piece-rate entry breakdown (collapsed by default) -->
          <div v-if="expanded === sub.id && !sub.details?.isTimeWorker" class="entry-table-wrap w-full overflow-x-auto">
            <table class="entry-table">
              <thead><tr><th>Cat.</th><th>Type</th><th>Placement</th><th>Size</th><th>Good</th><th>Waste</th><th>Time</th></tr></thead>
              <tbody>
                <tr v-for="(e, i) in sub.details?.entries" :key="i">
                  <td><span class="cat-pill" :style="{ background: CAT_COLORS[e.workCategory || 'MFG'] + '22', color: CAT_COLORS[e.workCategory || 'MFG'] }">{{ e.workCategory || 'MFG' }}</span></td>
                  <td>
                    <span v-if="e.workCategory === 'TIME'" class="text-slate-500">—</span>
                    <span v-else-if="e.workCategory === 'C'" class="text-emerald-400 font-bold">WOOD</span>
                    <span v-else>{{ e.dividerType === 'Other' ? 'Custom' : (e.dividerType ? `Type ${e.dividerType}` : 'MFG') }}</span>
                  </td>
                  <td>
                    <span v-if="e.workCategory === 'MFG' || e.workCategory === 'TIME'" class="text-slate-500">—</span>
                    <span v-else>{{ e.placement || '—' }}</span>
                  </td>
                  <td>
                    <span v-if="e.workCategory === 'MFG' || e.workCategory === 'TIME'" class="text-slate-500">—</span>
                    <span v-else>{{ e.size || '—' }}</span>
                  </td>
                  <td style="color:#34d399"><strong>{{ e.workCategory === 'TIME' ? (e.hoursWorked || 0) + 'h' : e.good }}</strong></td>
                  <td style="color:#f87171"><strong>{{ e.waste || 0 }}</strong></td>
                  <td style="color:#64748b">{{ new Date(e.time).toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'}) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Action row -->
          <div class="card-actions">
            <button class="btn-expand" @click="expanded = expanded === sub.id ? null : sub.id">
              <span class="material-symbols-rounded">{{ expanded === sub.id ? 'expand_less' : 'expand_more' }}</span>
              {{ expanded === sub.id ? 'Hide Details' : 'View Details' }}
            </button>

            <div v-if="sub.target_name === 'pending'" class="action-btns">
              <button class="btn-reject" @click="openAction(sub, 'reject')">
                <span class="material-symbols-rounded">cancel</span>
                Reject
              </button>
              <button class="btn-approve" @click="openAction(sub, 'approve')">
                <span class="material-symbols-rounded">verified</span>
                Approve
              </button>
            </div>
            <div v-else-if="sub.target_name === 'rejected' && sub.details?.rejectionReason" class="reject-reason-display">
              <span class="material-symbols-rounded">info</span>
              {{ sub.details.rejectionReason }}
            </div>
          </div>
        </div>

        <div v-if="!filteredSubmissions.length" class="empty-state">
          <span class="material-symbols-rounded">inbox</span>
          <p>No {{ filterStatus === 'all' ? '' : filterStatus }} submissions found.</p>
        </div>
      </div>

      <!-- ═══════════════════════════════════════════════════════════════
           OPERATOR WORK ASSIGNMENT — Structured 5-Category Config
           ═══════════════════════════════════════════════════════════════ -->
      <div class="work-types-admin">
        <h2>
          <span class="material-symbols-rounded">manage_accounts</span>
          Operator Work Assignment
          <span class="admin-note">Only admins can modify</span>
        </h2>

        <div class="operator-cards">
          <div
            v-for="op in store.operators.filter(o => o.role !== 'admin' && o.role !== 'customer')"
            :key="op.id"
            class="op-config-card"
          >
            <!-- Card header: avatar + name + current category badges -->
            <div class="op-config-header">
              <OperatorAvatar :avatar="op.avatar" :name="op.name" :color="op.color" size="sm" />
              <div class="op-header-text">
                <p class="op-name">{{ op.name }}</p>
                <p class="op-role">{{ op.role }}</p>
              </div>
              <div class="op-cat-badges">
                <span
                  v-for="cat in getOpConfig(op).categories"
                  :key="cat"
                  class="cat-badge"
                  :style="{ background: CAT_COLORS[cat] + '22', color: CAT_COLORS[cat], borderColor: CAT_COLORS[cat] + '55' }"
                >{{ cat }}</span>
              </div>
            </div>

            <!-- ① Job Categories -->
            <div class="config-section">
              <p class="config-section-label">
                <span class="material-symbols-rounded">work</span>
                Job Categories
              </p>
              <div class="chip-row">
                <button
                  v-for="cat in CATEGORIES"
                  :key="cat.id"
                  class="cfg-chip"
                  :class="{ 'cfg-chip--active': getOpConfig(op).categories.includes(cat.id) }"
                  :style="getOpConfig(op).categories.includes(cat.id)
                    ? { background: CAT_COLORS[cat.id] + '22', borderColor: CAT_COLORS[cat.id], color: CAT_COLORS[cat.id] }
                    : {}"
                  @click="toggleCategory(op, cat.id)"
                >
                  <span class="material-symbols-rounded" style="font-size:0.9rem">{{ cat.icon }}</span>
                  {{ cat.label }}
                </button>
              </div>
            </div>

            <!-- ② Divider Types (hidden for TIME-only workers) -->
            <div class="config-section" v-if="!isTimeOnly(op)">
              <p class="config-section-label">
                <span class="material-symbols-rounded">category</span>
                Divider Types
              </p>
              <div class="chip-row">
                <button
                  v-for="t in DIVIDER_TYPES"
                  :key="t"
                  class="cfg-chip"
                  :class="{ 'cfg-chip--active': getOpConfig(op).divider_types?.includes(t) }"
                  @click="toggleField(op, 'divider_types', t)"
                >Type {{ t }}</button>
              </div>
            </div>

            <!-- ③ Placement Styles (C only) -->
            <div class="config-section" v-if="getOpConfig(op).categories?.includes('C')">
              <p class="config-section-label">
                <span class="material-symbols-rounded">layers</span>
                Placement Styles (Wood Prep)
              </p>
              <div class="chip-row">
                <button
                  v-for="p in PLACEMENTS"
                  :key="p"
                  class="cfg-chip"
                  :class="{ 'cfg-chip--active': getOpConfig(op).placements?.includes(p) }"
                  @click="toggleField(op, 'placements', p)"
                >{{ p }}</button>
              </div>
            </div>

            <!-- ④ Sizes (PP / PL / C) -->
            <div class="config-section" v-if="hasMfgOrC(op) || getOpConfig(op).categories?.includes('PP') || getOpConfig(op).categories?.includes('PL')">
              <p class="config-section-label">
                <span class="material-symbols-rounded">straighten</span>
                Sizes
              </p>
              <div class="chip-row">
                <button
                  v-for="s in SIZES"
                  :key="s"
                  class="cfg-chip"
                  :class="{ 'cfg-chip--active': getOpConfig(op).sizes?.includes(s) }"
                  @click="toggleField(op, 'sizes', s)"
                >{{ s }}</button>
              </div>
            </div>

            <!-- ⑤ Hourly Rate (for TIME category) -->
            <div class="config-section" v-if="getOpConfig(op).categories?.includes('TIME')">
              <p class="config-section-label">
                <span class="material-symbols-rounded">payments</span>
                Hourly Rate (ETB/hour)
              </p>
              <div class="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  :value="getOpConfig(op).hourly_rate"
                  placeholder="e.g. 45.00"
                  class="bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white font-mono w-32 focus:border-indigo-500 outline-none"
                  @input="setHourlyRate(op, $event.target.value)"
                />
                <span class="text-xs text-slate-400">ETB per hour</span>
              </div>
            </div>

            <!-- Save Button -->
            <button
              class="cfg-save-btn cursor-pointer"
              :disabled="savingWt === op.id"
              @click="saveWorkConfig(op)"
            >
              <span class="material-symbols-rounded" style="font-size:1rem">
                {{ savingWt === op.id ? 'hourglass_top' : 'save' }}
              </span>
              {{ savingWt === op.id ? 'Saving...' : 'Save Work Config' }}
            </button>
          </div>
        </div>
      </div>

      <!-- PIN Auth Modal -->
      <div v-if="actionModal.visible" class="modal-overlay" @click.self="actionModal.visible = false">
        <div class="modal max-w-sm w-full">
          <div class="flex items-center justify-between mb-1">
            <h2 class="text-base font-bold m-0" :class="actionModal.type === 'approve' ? 'text-emerald-400' : 'text-rose-400'">
              {{ actionModal.type === 'approve' ? '✓ Approve Shift' : '✗ Reject Shift' }}
            </h2>
            <button class="text-slate-400 hover:text-white" @click="actionModal.visible = false">
              <span class="material-symbols-rounded text-lg">close</span>
            </button>
          </div>

          <p class="text-xs text-slate-400 mb-3">
            {{ operatorName(actionModal.sub?.operator_id) }} ·
            {{ Number(actionModal.sub?.amount).toFixed(2) }} ETB
          </p>

          <div v-if="actionModal.type === 'reject'" class="modal-field mb-3">
            <label class="block text-xs font-bold text-slate-400 mb-1">Rejection Reason</label>
            <input v-model="actionModal.reason" type="text" placeholder="e.g. Discrepancy in unit count" class="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-xs text-white outline-none" />
          </div>

          <!-- Touch Virtual Numpad for Admin PIN -->
          <div class="modal-field flex flex-col items-center">
            <label class="block text-xs font-bold text-slate-400 mb-2">Supervisor / Admin PIN</label>
            
            <div class="pin-dots flex gap-3 mb-3">
              <span v-for="i in 4" :key="i" class="w-3 h-3 rounded-full border-2 border-slate-600 transition-all" :class="{ 'bg-indigo-500 border-indigo-400': i <= actionModal.pin.length }"></span>
            </div>

            <div class="grid grid-cols-3 gap-2 w-full max-w-[200px] mb-3">
              <button v-for="n in [1,2,3,4,5,6,7,8,9]" :key="n" class="p-2.5 rounded-lg bg-slate-800 text-white font-bold text-sm hover:bg-slate-700 active:scale-95 transition-all cursor-pointer" @click="appendModalNum(n)">{{ n }}</button>
              <button class="p-2.5 rounded-lg bg-rose-500/10 text-rose-400 font-bold text-sm hover:bg-rose-500/20 active:scale-95 transition-all cursor-pointer" @click="actionModal.pin = ''">C</button>
              <button class="p-2.5 rounded-lg bg-slate-800 text-white font-bold text-sm hover:bg-slate-700 active:scale-95 transition-all cursor-pointer" @click="appendModalNum(0)">0</button>
              <button class="p-2.5 rounded-lg bg-slate-800 text-white font-bold text-sm hover:bg-slate-700 active:scale-95 transition-all flex items-center justify-center cursor-pointer" @click="actionModal.pin = actionModal.pin.slice(0, -1)">
                <span class="material-symbols-rounded text-base">backspace</span>
              </button>
            </div>
          </div>

          <p v-if="actionModal.error" class="modal-error text-rose-400 text-xs font-bold text-center mb-2">{{ actionModal.error }}</p>

          <div class="modal-actions flex gap-2 justify-end mt-2">
            <button class="btn-cancel px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 bg-transparent border border-white/10 cursor-pointer hover:bg-slate-800" @click="actionModal.visible = false">Cancel</button>
            <button
              class="btn-confirm px-4 py-1.5 rounded-lg text-xs font-bold text-white cursor-pointer transition-all"
              :class="actionModal.type === 'reject' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'"
              :disabled="actionModal.pin.length < 4 || actionModal.loading"
              @click="executeAction"
            >
              {{ actionModal.loading ? 'Processing...' : (actionModal.type === 'approve' ? 'Authorize Approval' : 'Authorize Rejection') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
// Developer: Mintesnot Abebe | Brand: dev MinteIO
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import OperatorAvatar from '@/components/ui/OperatorAvatar.vue'
import { useMesStore } from '@/store/mesStore.js'

const store = useMesStore()

const isSyncing = ref(false)
let refreshTimer = null

async function manualSync() {
  isSyncing.value = true
  try {
    await store.fetchInitialData()
  } finally {
    setTimeout(() => { isSyncing.value = false }, 400)
  }
}

onMounted(async () => {
  await store.fetchInitialData()
  refreshTimer = setInterval(async () => {
    await store.fetchInitialData()
  }, 30000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})

// ─── Work Assignment Constants ──────────────────────────────────────────────
const CATEGORIES = [
  { id: 'MFG',  label: 'Manufacturing',    icon: 'precision_manufacturing' },
  { id: 'PP',   label: 'Paper Placement',  icon: 'description'             },
  { id: 'PL',   label: 'Plaster Placement',icon: 'build'                   },
  { id: 'C',    label: 'Wood Preparation', icon: 'forest'                  },
  { id: 'TIME', label: 'Hourly Work',      icon: 'schedule'                },
]

const CAT_COLORS = {
  MFG:  '#6366f1',
  PP:   '#10b981',
  PL:   '#f59e0b',
  C:    '#8b5cf6',
  TIME: '#3b82f6',
}

const DIVIDER_TYPES = ['50', '40', '30', '16', '12', '45']
const PLACEMENTS    = ['ብተና', 'ውስጥ', 'other']
const SIZES         = ['9cm', '7cm']

// ─── Per-operator config helpers ────────────────────────────────────────────
function getOpConfig(op) {
  const wt = op.work_types
  if (wt && !Array.isArray(wt) && typeof wt === 'object') return wt
  return {
    categories:   ['MFG'],
    divider_types:[],
    placements:   [],
    sizes:        [],
    hourly_rate:  null,
  }
}

function isTimeOnly(op) {
  const cats = getOpConfig(op).categories
  return cats.length > 0 && cats.every(c => c === 'TIME')
}

function hasMfgOrC(op) {
  const cats = getOpConfig(op).categories
  return cats.includes('MFG') || cats.includes('C')
}

function toggleCategory(op, catId) {
  const cfg = ensureStructuredConfig(op)
  const idx = cfg.categories.indexOf(catId)
  if (idx === -1) cfg.categories.push(catId)
  else cfg.categories.splice(idx, 1)
}

function toggleField(op, field, value) {
  const cfg = ensureStructuredConfig(op)
  const idx = cfg[field].indexOf(value)
  if (idx === -1) cfg[field].push(value)
  else cfg[field].splice(idx, 1)
}

function setHourlyRate(op, val) {
  const cfg = ensureStructuredConfig(op)
  cfg.hourly_rate = val ? Number(val) : null
}

function ensureStructuredConfig(op) {
  if (!op.work_types || Array.isArray(op.work_types) || typeof op.work_types !== 'object') {
    op.work_types = {
      categories:   [],
      divider_types:[],
      placements:   [],
      sizes:        [],
      hourly_rate:  null,
    }
  }
  return op.work_types
}

// ─── Save work config ────────────────────────────────────────────────────────
const savingWt = ref(null)

async function saveWorkConfig(op) {
  savingWt.value = op.id
  const cfg = getOpConfig(op)
  await store.setOperatorWorkTypes(op.id, cfg)
  savingWt.value = null
}

// ─── Shift submissions ───────────────────────────────────────────────────────
const filterStatus = ref('all')
const expanded = ref(null)

function operatorName(id) {
  return store.operators.find(o => Number(o.id) === Number(id))?.name ?? `Operator #${id}`
}

const allSubmissions = computed(() =>
  [...store.shiftSubmissions].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
)
const pendingSubmissions = computed(() => allSubmissions.value.filter(s => s.target_name === 'pending'))
const approvedToday = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return allSubmissions.value.filter(s => s.target_name === 'approved' && s.transaction_date === today).length
})
const filteredSubmissions = computed(() => {
  if (filterStatus.value === 'all') return allSubmissions.value
  return allSubmissions.value.filter(s => s.target_name === filterStatus.value)
})

// ─── PIN Action modal ────────────────────────────────────────────────────────
const actionModal = reactive({
  visible: false, type: 'approve', sub: null,
  pin: '', reason: '', error: '', loading: false
})

function openAction(sub, type) {
  actionModal.sub     = sub
  actionModal.type    = type
  actionModal.pin     = ''
  actionModal.reason  = ''
  actionModal.error   = ''
  actionModal.loading = false
  actionModal.visible = true
}

function appendModalNum(n) {
  if (actionModal.pin.length < 4) {
    actionModal.pin += String(n)
  }
}

async function executeAction() {
  if (!actionModal.pin || actionModal.pin.length < 4) return
  actionModal.loading = true
  actionModal.error   = ''

  let result
  if (actionModal.type === 'approve') {
    result = await store.approveShift(actionModal.sub.id, actionModal.pin)
  } else {
    result = await store.rejectShift(actionModal.sub.id, actionModal.pin, actionModal.reason)
  }

  actionModal.loading = false
  if (result.ok) {
    actionModal.visible = false
  } else {
    actionModal.error = result.reason || 'Action failed'
    actionModal.pin = ''
  }
}
</script>

<style scoped>
.sa-root {
  width: 100%; height: 100%; overflow-y: auto;
  padding: 1.5rem 2rem; background: #0f172a;
  display: flex; flex-direction: column; gap: 1.5rem;
}

.sa-header {
  display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;
}
.sa-title {
  display: flex; align-items: center; gap: 0.75rem;
  font-size: 1.4rem; font-weight: 900; color: #f1f5f9; margin: 0;
}
.sa-sub { font-size: 0.75rem; color: #64748b; margin: 0.25rem 0 0; }

.sync-btn {
  display: flex; align-items: center; gap: 0.35rem;
  background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.3);
  color: #a5b4fc; border-radius: 0.5rem; padding: 0.45rem 0.85rem;
  font-size: 0.75rem; font-weight: 700; transition: all 0.15s ease;
}
.sync-btn:hover { background: rgba(99,102,241,0.22); color: #fff; }
.spin-icon { animation: spin 0.8s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.header-counts { display: flex; gap: 0.75rem; }
.count-chip {
  display: flex; align-items: center; gap: 0.4rem;
  font-size: 0.75rem; font-weight: 700; padding: 0.45rem 0.85rem; border-radius: 999px;
}
.count-chip--warn  { background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.3); color: #fbbf24; }
.count-chip--green { background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.3); color: #34d399; }

.filters { display: flex; gap: 0.5rem; }
.filter-btn {
  background: #1e293b; border: 1px solid rgba(255,255,255,0.08);
  color: #64748b; font-size: 0.75rem; font-weight: 700;
  padding: 0.4rem 0.9rem; border-radius: 0.5rem; cursor: pointer; transition: all 0.15s;
}
.filter-btn:hover { color: #f1f5f9; }
.filter-btn--active { background: #6366f1; border-color: #6366f1; color: #fff; }

.submissions-list { display: flex; flex-direction: column; gap: 0.75rem; }
.submission-card {
  background: #1e293b; border: 1px solid rgba(255,255,255,0.06);
  border-radius: 1rem; padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem;
}
.submission-card--pending  { border-left: 4px solid #f59e0b; }
.submission-card--approved { border-left: 4px solid #10b981; }
.submission-card--rejected { border-left: 4px solid #ef4444; }

.card-top { display: flex; align-items: center; gap: 0.75rem; }
.card-info { flex: 1; min-width: 0; }
.card-info h3 { font-size: 0.95rem; font-weight: 800; color: #f1f5f9; margin: 0; }
.card-info p  { font-size: 0.7rem; color: #64748b; margin: 0; }

.status-badge {
  font-size: 0.65rem; font-weight: 800; padding: 0.2rem 0.65rem; border-radius: 999px; letter-spacing: 0.05em;
}
.status-badge--pending  { background: rgba(245,158,11,0.15); color: #fbbf24; }
.status-badge--approved { background: rgba(16,185,129,0.15); color: #34d399; }
.status-badge--rejected { background: rgba(239,68,68,0.15); color: #f87171; }

.card-stats {
  display: flex; gap: 1.5rem; flex-wrap: wrap;
  background: #0f172a; border-radius: 0.6rem; padding: 0.75rem 1rem;
}
.card-stat { display: flex; flex-direction: column; gap: 0.15rem; }
.stat-lbl { font-size: 0.62rem; color: #64748b; font-weight: 700; text-transform: uppercase; }
.stat-val { font-size: 1rem; font-weight: 900; font-family: monospace; }

.entry-table-wrap { overflow-x: auto; }
.entry-table { width: 100%; border-collapse: collapse; font-size: 0.75rem; }
.entry-table th { text-align: left; color: #64748b; font-size: 0.65rem; padding: 0.4rem 0.6rem; }
.entry-table td { padding: 0.4rem 0.6rem; border-top: 1px solid rgba(255,255,255,0.04); }
.cat-pill { font-size: 0.62rem; font-weight: 800; padding: 0.1rem 0.4rem; border-radius: 0.3rem; }

.card-actions { display: flex; justify-content: space-between; align-items: center; }
.btn-expand {
  background: transparent; border: none; color: #6366f1;
  font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; gap: 0.2rem; cursor: pointer;
}
.action-btns { display: flex; gap: 0.5rem; }
.btn-approve, .btn-reject {
  display: flex; align-items: center; gap: 0.3rem;
  padding: 0.45rem 0.9rem; border-radius: 0.5rem; border: none;
  font-size: 0.75rem; font-weight: 800; cursor: pointer; transition: all 0.15s;
}
.btn-approve { background: #10b981; color: #fff; }
.btn-reject  { background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3); color: #f87171; }
.btn-approve:hover { filter: brightness(1.1); }
.btn-reject:hover  { background: rgba(239,68,68,0.25); }

.reject-reason-display {
  display: flex; align-items: center; gap: 0.3rem;
  color: #f87171; font-size: 0.75rem; background: rgba(239,68,68,0.08);
  padding: 0.35rem 0.75rem; border-radius: 0.5rem;
}

.empty-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 0.5rem; padding: 3rem; color: #334155;
}

/* ── Work Types Admin ────────────────────────────────────────────── */
.work-types-admin {
  background: #1e293b; border: 1px solid rgba(255,255,255,0.07);
  border-radius: 1rem; padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem;
}
.work-types-admin h2 {
  font-size: 1rem; font-weight: 800; color: #f1f5f9; margin: 0;
  display: flex; align-items: center; gap: 0.5rem;
}
.admin-note { font-size: 0.65rem; color: #64748b; font-weight: 400; margin-left: auto; }

.operator-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
.op-config-card {
  background: #0f172a; border: 1px solid rgba(255,255,255,0.06);
  border-radius: 0.75rem; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem;
}
.op-config-header { display: flex; align-items: center; gap: 0.6rem; }
.op-header-text { flex: 1; }
.op-name { font-size: 0.85rem; font-weight: 800; color: #f1f5f9; margin: 0; }
.op-role { font-size: 0.65rem; color: #64748b; margin: 0; }
.op-cat-badges { display: flex; gap: 0.25rem; }
.cat-badge { font-size: 0.6rem; font-weight: 800; padding: 0.1rem 0.35rem; border-radius: 0.25rem; border: 1px solid; }

.config-section { display: flex; flex-direction: column; gap: 0.35rem; }
.config-section-label {
  font-size: 0.62rem; font-weight: 700; color: #64748b; text-transform: uppercase;
  display: flex; align-items: center; gap: 0.25rem; margin: 0;
}
.config-section-label .material-symbols-rounded { font-size: 0.85rem; }
.chip-row { display: flex; gap: 0.3rem; flex-wrap: wrap; }
.cfg-chip {
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  color: #64748b; font-size: 0.68rem; font-weight: 700;
  padding: 0.25rem 0.55rem; border-radius: 0.35rem; cursor: pointer; transition: all 0.15s;
  display: flex; align-items: center; gap: 0.2rem;
}
.cfg-chip--active { border-color: currentColor; }
.cfg-save-btn {
  margin-top: auto; display: flex; align-items: center; justify-content: center; gap: 0.3rem;
  background: #6366f1; border: none; color: #fff; font-size: 0.75rem; font-weight: 800;
  padding: 0.5rem; border-radius: 0.5rem; cursor: pointer; transition: filter 0.15s;
}
.cfg-save-btn:hover { filter: brightness(1.1); }
.cfg-save-btn:disabled { opacity: 0.4; }

/* ── Modal ───────────────────────────────────────────────────────── */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.7);
  backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 1000;
}
.modal {
  background: #1e293b; border: 1px solid rgba(255,255,255,0.1);
  border-radius: 1.25rem; padding: 1.5rem; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.6);
}
</style>
