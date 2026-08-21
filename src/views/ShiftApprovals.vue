<template>
  <AppLayout>
    <div class="sa-root">
      <header class="sa-header">
        <div>
          <h1 class="sa-title">
            <span class="material-symbols-rounded" style="color:#fbbf24">task_alt</span>
            Shift Approvals
          </h1>
          <p class="sa-sub">Review and authorize employee shift submissions. Admin PIN required.</p>
        </div>
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
            <div class="card-stat">
              <span class="stat-lbl">Good Pcs</span>
              <span class="stat-val" style="color:#34d399">{{ sub.details?.totalGood ?? '—' }}</span>
            </div>
            <div class="card-stat">
              <span class="stat-lbl">Waste Pcs</span>
              <span class="stat-val" style="color:#f87171">{{ sub.details?.totalWaste ?? '—' }}</span>
            </div>
            <div class="card-stat">
              <span class="stat-lbl">Est. Earnings</span>
              <span class="stat-val" style="color:#fbbf24">ETB {{ Number(sub.amount).toFixed(2) }}</span>
            </div>
            <div class="card-stat">
              <span class="stat-lbl">Entries</span>
              <span class="stat-val" style="color:#a5b4fc">{{ sub.details?.entries?.length ?? '—' }}</span>
            </div>
          </div>

          <!-- Entry breakdown (collapsed by default) -->
          <div v-if="expanded === sub.id" class="entry-table-wrap w-full overflow-x-auto">
            <table class="entry-table">
              <thead><tr><th>Type</th><th>Placement</th><th>Size</th><th>Good</th><th>Waste</th><th>Time</th></tr></thead>
              <tbody>
                <tr v-for="(e, i) in sub.details?.entries" :key="i">
                  <td>{{ e.dividerType }}</td>
                  <td>{{ e.placement }}</td>
                  <td>{{ e.size }}</td>
                  <td style="color:#34d399"><strong>{{ e.good }}</strong></td>
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

      <!-- Work Types Management -->
      <div class="work-types-admin">
        <h2>
          <span class="material-symbols-rounded">manage_accounts</span>
          Operator Work Types
          <span class="admin-note">Only admins can modify</span>
        </h2>
        <div class="operator-cards">
          <div v-for="op in store.operators.filter(o => o.role !== 'admin' && o.role !== 'customer')" :key="op.id" class="op-config-card">
            <div class="op-config-header">
              <OperatorAvatar :avatar="op.avatar" :name="op.name" :color="op.color" size="sm" />
              <div>
                <p class="op-name">{{ op.name }}</p>
                <p class="op-role">{{ op.role }}</p>
              </div>
            </div>
            <div class="wt-chips">
              <div
                v-for="wt in WORK_TYPES"
                :key="wt"
                class="wt-chip"
                :class="{ 'wt-chip--active': (op.work_types || []).includes(wt) }"
                @click="toggleWorkType(op, wt)"
              >
                {{ wt }}
              </div>
            </div>
            <button class="btn-save-wt" :disabled="savingWt === op.id" @click="saveWorkTypes(op)">
              {{ savingWt === op.id ? 'Saving...' : 'Save Work Types' }}
            </button>
          </div>
        </div>
      </div>

      <!-- PIN Auth Modal -->
      <div v-if="actionModal.visible" class="modal-overlay" @click.self="actionModal.visible = false">
        <div class="modal">
          <h2>{{ actionModal.type === 'approve' ? '✓ Approve Shift' : '✗ Reject Shift' }}</h2>
          <p style="color:#94a3b8; margin-bottom: 1.5rem">
            {{ operatorName(actionModal.sub?.operator_id) }} ·
            {{ Number(actionModal.sub?.amount).toFixed(2) }} ETB ·
            {{ actionModal.sub?.details?.totalGood }} pcs
          </p>

          <div v-if="actionModal.type === 'reject'" class="modal-field">
            <label>Rejection Reason</label>
            <input v-model="actionModal.reason" type="text" placeholder="e.g. Numbers not matching station record" />
          </div>

          <div class="modal-field">
            <label>Admin PIN</label>
            <div class="pin-row">
              <input
                v-model="actionModal.pin"
                type="password"
                inputmode="numeric"
                maxlength="4"
                placeholder="• • • •"
                class="pin-input"
              />
            </div>
          </div>

          <p v-if="actionModal.error" class="modal-error">{{ actionModal.error }}</p>

          <div class="modal-actions">
            <button class="btn-cancel" @click="actionModal.visible = false">Cancel</button>
            <button
              class="btn-confirm"
              :class="actionModal.type === 'reject' ? 'btn-confirm--reject' : 'btn-confirm--approve'"
              :disabled="!actionModal.pin || actionModal.loading"
              @click="executeAction"
            >
              {{ actionModal.loading ? 'Processing...' : (actionModal.type === 'approve' ? 'Confirm Approval' : 'Confirm Rejection') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import OperatorAvatar from '@/components/ui/OperatorAvatar.vue'
import { useMesStore } from '@/store/mesStore.js'

const store = useMesStore()

const WORK_TYPES = [
  'Type 50', 'Type 40', 'Type 30', 'Type 16', 'Type 12', 'Type 45',
  'Placement - ብተና', 'Placement - ውስጥ', 'Placement - የተለየ',
  'Size 9cm', 'Size 7cm', 'Quality Control', 'Packaging', 'Loading'
]

const filterStatus = ref('all')
const expanded = ref(null)

const COLORS = ['#6366f1','#f59e0b','#10b981','#3b82f6','#ec4899','#f97316','#8b5cf6','#14b8a6']
function opColor(id) {
  return COLORS[(id - 1) % COLORS.length] || '#334155'
}
function operatorName(id) {
  return store.operators.find(o => o.id === id)?.name ?? `Operator #${id}`
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

// Action modal
const actionModal = reactive({
  visible: false, type: 'approve', sub: null,
  pin: '', reason: '', error: '', loading: false
})

function openAction(sub, type) {
  actionModal.sub = sub
  actionModal.type = type
  actionModal.pin = ''
  actionModal.reason = ''
  actionModal.error = ''
  actionModal.loading = false
  actionModal.visible = true
}

async function executeAction() {
  if (!actionModal.pin) return
  actionModal.loading = true
  actionModal.error = ''

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
  }
}

// Work types management
const savingWt = ref(null)

function toggleWorkType(op, wt) {
  if (!op.work_types) op.work_types = []
  const idx = op.work_types.indexOf(wt)
  if (idx === -1) op.work_types.push(wt)
  else op.work_types.splice(idx, 1)
}

async function saveWorkTypes(op) {
  savingWt.value = op.id
  await store.setOperatorWorkTypes(op.id, [...(op.work_types || [])])
  savingWt.value = null
}
</script>

<style scoped>
.sa-root {
  width: 100%; height: 100%; overflow-y: auto;
  padding: 1.5rem 2rem; background: #0f172a;
  display: flex; flex-direction: column; gap: 1.5rem;
}

.sa-header {
  display: flex; justify-content: space-between; align-items: flex-start;
}
.sa-title {
  display: flex; align-items: center; gap: 0.75rem;
  font-size: 1.4rem; font-weight: 900; color: #f1f5f9; margin: 0;
}
.sa-sub { color: #64748b; font-size: 0.85rem; margin-top: 0.25rem; margin-left: 2.5rem; }

.header-counts { display: flex; gap: 0.75rem; align-items: center; }
.count-chip {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 0.5rem 1rem; border-radius: 999px; font-weight: 700; font-size: 0.82rem;
}
.count-chip--warn  { background: rgba(245,158,11,0.12); color: #fbbf24; border: 1px solid rgba(245,158,11,0.2); }
.count-chip--green { background: rgba(16,185,129,0.10); color: #34d399; border: 1px solid rgba(16,185,129,0.2); }

.filters { display: flex; gap: 0.5rem; }
.filter-btn {
  padding: 0.5rem 1.25rem; border-radius: 0.6rem; cursor: pointer;
  background: #1e293b; border: 1px solid rgba(255,255,255,0.08);
  color: #64748b; font-weight: 700; font-size: 0.85rem;
}
.filter-btn--active { background: rgba(99,102,241,0.15); border-color: #6366f1; color: #a5b4fc; }

.submissions-list { display: flex; flex-direction: column; gap: 1rem; }

.submission-card {
  background: #1e293b; border: 1px solid rgba(255,255,255,0.06);
  border-radius: 1rem; padding: 1.5rem; transition: all 0.2s;
}
.submission-card--pending  { border-left: 4px solid #f59e0b; }
.submission-card--approved { border-left: 4px solid #10b981; }
.submission-card--rejected { border-left: 4px solid #ef4444; opacity: 0.8; }

.card-top { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem; }
.op-avatar {
  width: 2.75rem; height: 2.75rem; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.1rem; font-weight: 900; color: white; flex-shrink: 0;
}
.card-info h3 { color: #f1f5f9; font-size: 1.1rem; margin: 0; }
.card-info p  { color: #64748b; font-size: 0.8rem; margin: 0.15rem 0 0 0; }
.status-badge {
  margin-left: auto; font-size: 0.72rem; font-weight: 800;
  padding: 0.3rem 0.85rem; border-radius: 999px; letter-spacing: 0.08em;
}
.status-badge--pending  { background: rgba(245,158,11,0.12); color: #fbbf24; }
.status-badge--approved { background: rgba(16,185,129,0.12); color: #34d399; }
.status-badge--rejected { background: rgba(239,68,68,0.12); color: #f87171; }

.card-stats {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem;
  margin-bottom: 1rem;
}
.card-stat {
  background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);
  border-radius: 0.65rem; padding: 0.85rem; text-align: center;
}
.stat-lbl { display: block; font-size: 0.65rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; margin-bottom: 0.3rem; }
.stat-val  { display: block; font-size: 1.2rem; font-weight: 800; }

.entry-table-wrap { overflow-x: auto; margin-bottom: 1rem; }
.entry-table {
  width: 100%; border-collapse: collapse; font-size: 0.85rem;
}
.entry-table th { color: #64748b; padding: 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; }
.entry-table td { padding: 0.5rem 0.75rem; color: #e2e8f0; border-bottom: 1px solid rgba(255,255,255,0.04); }

.card-actions {
  display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;
  padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.05);
}
.btn-expand {
  display: flex; align-items: center; gap: 0.35rem;
  background: transparent; border: 1px solid rgba(255,255,255,0.1);
  color: #64748b; padding: 0.5rem 1rem; border-radius: 0.55rem; font-size: 0.82rem; cursor: pointer;
}
.action-btns { margin-left: auto; display: flex; gap: 0.75rem; }
.btn-reject, .btn-approve {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 0.65rem 1.25rem; border-radius: 0.65rem; font-weight: 700; cursor: pointer; border: none;
}
.btn-reject  { background: rgba(239,68,68,0.12); color: #f87171; border: 1px solid rgba(239,68,68,0.25); }
.btn-approve { background: rgba(16,185,129,0.12); color: #34d399; border: 1px solid rgba(16,185,129,0.25); }
.btn-approve:hover { background: #10b981; color: white; }
.btn-reject:hover  { background: #ef4444; color: white; }

.reject-reason-display {
  display: flex; align-items: center; gap: 0.5rem;
  color: #fca5a5; font-size: 0.82rem; margin-left: auto;
}

.empty-state {
  display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
  padding: 3rem; color: #334155; font-size: 0.9rem;
}
.empty-state .material-symbols-rounded { font-size: 3rem; }

/* Work types admin */
.work-types-admin {
  background: #1e293b; border: 1px solid rgba(255,255,255,0.06); border-radius: 1rem; padding: 1.5rem;
}
.work-types-admin h2 {
  display: flex; align-items: center; gap: 0.75rem;
  font-size: 1.1rem; font-weight: 800; color: #94a3b8; margin: 0 0 1.25rem 0;
  text-transform: uppercase; letter-spacing: 0.06em;
}
.admin-note {
  font-size: 0.65rem; font-weight: 800; padding: 0.2rem 0.65rem;
  background: rgba(239,68,68,0.1); color: #fca5a5;
  border: 1px solid rgba(239,68,68,0.2); border-radius: 999px;
}
.operator-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1rem; }
.op-config-card {
  background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 0.85rem; padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem;
}
.op-config-header { display: flex; align-items: center; gap: 0.75rem; }
.op-mini-avatar {
  width: 2.25rem; height: 2.25rem; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-weight: 900; color: white; font-size: 0.85rem;
}
.op-name { font-weight: 700; color: #e2e8f0; margin: 0; }
.op-role { font-size: 0.72rem; color: #64748b; margin: 0; text-transform: capitalize; }
.wt-chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.wt-chip {
  padding: 0.35rem 0.75rem; border-radius: 0.4rem; cursor: pointer;
  background: #0f172a; border: 1px solid rgba(255,255,255,0.08);
  color: #475569; font-size: 0.78rem; font-weight: 700; transition: all 0.15s;
}
.wt-chip--active { background: rgba(99,102,241,0.15); border-color: #6366f1; color: #a5b4fc; }
.btn-save-wt {
  background: #6366f1; color: white; border: none; border-radius: 0.55rem;
  padding: 0.6rem; font-weight: 700; cursor: pointer; font-size: 0.85rem; transition: all 0.2s;
}
.btn-save-wt:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-save-wt:not(:disabled):hover { background: #4f46e5; }

/* Modal */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.modal {
  background: #1e293b; border: 1px solid rgba(255,255,255,0.1);
  border-radius: 1.25rem; padding: 2.5rem; width: 100%; max-width: 460px;
  box-shadow: 0 25px 60px rgba(0,0,0,0.5);
}
.modal h2 { color: #f1f5f9; font-size: 1.4rem; margin: 0 0 0.5rem 0; }
.modal-field { margin-bottom: 1.25rem; }
.modal-field label { display: block; color: #94a3b8; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.5rem; }
.modal-field input {
  width: 100%; background: #0f172a; border: 1px solid rgba(255,255,255,0.1);
  color: white; padding: 0.85rem 1rem; border-radius: 0.65rem; font-size: 1rem;
}
.pin-input { text-align: center; font-size: 1.5rem; letter-spacing: 0.5rem; }
.modal-error { color: #f87171; font-size: 0.9rem; margin-bottom: 0.75rem; font-weight: 700; }
.modal-actions { display: flex; gap: 0.75rem; }
.btn-cancel, .btn-confirm {
  flex: 1; padding: 0.85rem; border-radius: 0.75rem; font-weight: 700; cursor: pointer; border: none; font-size: 1rem;
}
.btn-cancel { background: rgba(255,255,255,0.05); color: #94a3b8; }
.btn-confirm--approve { background: #10b981; color: white; }
.btn-confirm--reject  { background: #ef4444; color: white; }
.btn-confirm:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
