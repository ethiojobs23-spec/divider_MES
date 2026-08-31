<template>
  <AppLayout>
    <div class="view-area">
      <!-- ── Header ── -->
      <div class="view-panel" style="flex: none; padding-bottom: 0; min-height: auto;">
        <div class="panel-header flex justify-between items-center flex-wrap gap-3">
          <div>
            <h2 class="panel-title flex items-center gap-2">
              <span class="material-symbols-rounded text-rose-400">verified</span>
              Quality Control & Waste Logging
            </h2>
            <p class="panel-sub">Categorize defects, track scrap thresholds, and identify calibration needs</p>
          </div>

          <div class="flex items-center gap-2">
            <button class="sync-btn cursor-pointer" :disabled="isSyncing" @click="manualSync" title="Sync QC logs now">
              <span class="material-symbols-rounded" :class="{ 'spin-icon': isSyncing }">sync</span>
              <span>{{ isSyncing ? 'Syncing...' : 'Sync Now' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- ── KPI Waste Strip ── -->
      <div class="px-4 sm:px-6 md:px-8 pt-4">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="qc-kpi-card border-emerald-500/20 bg-emerald-500/5">
            <span class="material-symbols-rounded text-emerald-400 text-2xl">check_circle</span>
            <div>
              <p class="text-[0.65rem] font-bold text-slate-400 uppercase">Today's Good Production</p>
              <p class="text-xl font-black text-white font-mono">{{ todayGood.toLocaleString() }} <span class="text-xs font-normal text-slate-500">pcs</span></p>
            </div>
          </div>

          <div class="qc-kpi-card border-rose-500/20 bg-rose-500/5">
            <span class="material-symbols-rounded text-rose-400 text-2xl">delete</span>
            <div>
              <p class="text-[0.65rem] font-bold text-slate-400 uppercase">Today's Waste & Scrap</p>
              <p class="text-xl font-black text-rose-400 font-mono">{{ todayWaste.toLocaleString() }} <span class="text-xs font-normal text-slate-500">pcs</span></p>
            </div>
          </div>

          <div class="qc-kpi-card" :class="wasteRateStatus.cardClass">
            <span class="material-symbols-rounded text-2xl" :class="wasteRateStatus.iconClass">{{ wasteRateStatus.icon }}</span>
            <div>
              <p class="text-[0.65rem] font-bold text-slate-400 uppercase">Current Scrap Rate</p>
              <div class="flex items-center gap-2">
                <p class="text-xl font-black font-mono" :class="wasteRateStatus.textClass">{{ scrapRatePct }}%</p>
                <span class="text-[0.65rem] font-bold px-2 py-0.5 rounded-full" :class="wasteRateStatus.badgeClass">{{ wasteRateStatus.label }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Main Grid ── -->
      <div class="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 pb-10 pt-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          
        <!-- ── Left Panel: Log Defect ── -->
        <div class="chart-card">
          <h3 class="flex items-center gap-2">
            <span class="material-symbols-rounded text-rose-400">report_problem</span>
            Log Defective Output
          </h3>
          
          <div class="flex flex-col gap-4">
            <!-- Operator Select -->
            <div class="form-group">
              <label>Responsible Operator</label>
              <select v-model="formData.operator_id" class="custom-select">
                <option disabled value="">-- Select Operator --</option>
                <option v-for="op in mesStore.operators.filter(o => o.role !== 'customer')" :key="op.id" :value="op.id">
                  {{ op.name }} ({{ op.role }})
                </option>
              </select>
            </div>
            
            <!-- Machine Select -->
            <div class="form-group">
              <label>Machine / Station Used</label>
              <select v-model="formData.machine_id" class="custom-select">
                <option disabled value="">-- Select Machine --</option>
                <option v-for="m in downtimeStore.machines" :key="m.id" :value="m.id">
                  {{ m.name }}
                </option>
              </select>
            </div>

            <!-- Divider Type & Size -->
            <div class="form-group">
              <label>Divider Type</label>
              <div class="flex gap-1.5 flex-wrap">
                <button 
                  v-for="type in qcStore.dividerTypes" 
                  :key="type"
                  @click="formData.divider_type = type"
                  class="mega-toggle"
                  :class="{'mega-toggle--active': formData.divider_type === type}"
                >
                  {{ type === 'Other' ? 'Custom' : `Type ${type}` }}
                </button>
              </div>
            </div>

            <!-- Defect Category -->
            <div class="form-group">
              <label>Defect Flaw Category</label>
              <select v-model="formData.category" class="custom-select">
                <option disabled value="">-- Select Flaw Category --</option>
                <option v-for="cat in qcStore.categories" :key="cat" :value="cat">
                  {{ cat }}
                </option>
              </select>
            </div>

            <!-- Virtual Numpad -->
            <div class="mt-2">
              <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 text-center">
                Defect Quantity (Pieces)
              </label>
              <VirtualNumpad 
                v-model="formData.quantity" 
                :maxLen="5" 
              />
            </div>

            <button 
              @click="submitDefect"
              :disabled="!isFormValid"
              class="btn-action cursor-pointer"
              :class="isFormValid ? 'btn-action--active' : 'btn-action--disabled'"
            >
              <span class="material-symbols-rounded">delete_forever</span>
              LOG DEFECT RECORD
            </button>
          </div>
        </div>

        <!-- ── Right Panel: Analytics & Alerts ── -->
        <div class="flex flex-col gap-4">
          
          <!-- Operator Training Alerts -->
          <div class="chart-card" style="flex: 1;">
            <h3 style="color: #fbbf24; border-bottom-color: rgba(251,191,36,0.2);">Operator Defect Summary</h3>
            <div class="alerts-container">
              <div v-if="qcStore.operatorDefectRates.length === 0" class="empty-state">
                No operator defects logged for this period.
              </div>
              <div 
                v-for="rate in qcStore.operatorDefectRates" 
                :key="'op-'+rate.operator_id"
                class="alert-row"
                :class="{'alert-row--danger': rate.training_required}"
              >
                <div class="flex items-center gap-3">
                  <OperatorAvatar :avatar="rate.avatar" :name="rate.operator_name" :color="rate.color" size="sm" />
                  <div>
                    <p class="font-bold text-white text-sm m-0">{{ rate.operator_name }}</p>
                    <p class="text-xs text-slate-400 font-medium m-0">{{ rate.total_defects }} Total Defect Pieces</p>
                  </div>
                </div>
                <div v-if="rate.training_required" class="badge-danger">
                  <span class="material-symbols-rounded" style="font-size:0.9rem">warning</span>
                  Training Req (&gt;50)
                </div>
                <span v-else class="text-xs font-mono font-bold text-slate-400 bg-slate-900 px-2 py-1 rounded">
                  {{ rate.total_defects }} pcs
                </span>
              </div>
            </div>
          </div>

          <!-- Machine Maintenance Alerts -->
          <div class="chart-card" style="flex: 1;">
            <h3 style="color: #38bdf8; border-bottom-color: rgba(56,189,248,0.2);">Machine Calibration Alerts</h3>
            <div class="alerts-container">
              <div v-if="qcStore.machineDefectRates.length === 0" class="empty-state">
                No machine defect history logged.
              </div>
              <div 
                v-for="rate in qcStore.machineDefectRates" 
                :key="'mac-'+rate.machine_id"
                class="alert-row flex-col items-start gap-2"
                :class="{'alert-row--danger': rate.calibration_needed}"
              >
                <div class="flex justify-between items-start w-full">
                  <div>
                    <h4 class="font-bold text-white text-sm m-0">{{ rate.machine_name }}</h4>
                    <p class="text-xs text-slate-400 font-medium m-0">Total Defects: {{ rate.total_defects }}</p>
                  </div>
                  <div v-if="rate.calibration_needed" class="badge-warning">
                    <span class="material-symbols-rounded" style="font-size:0.9rem">handyman</span>
                    Needs Calibration
                  </div>
                </div>
                
                <div class="flex justify-between items-center bg-slate-800/50 px-3 py-1.5 rounded-lg border border-white/5 w-full mt-1">
                  <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">Bent Edges:</span>
                  <span class="font-mono font-bold" :class="rate.calibration_needed ? 'text-amber-400' : 'text-slate-300'">{{ rate.bent_edge_count }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
      
      <!-- Toast -->
      <Transition name="toast">
        <div v-if="toast.visible" class="toast-message">
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
import AppLayout from '@/components/layout/AppLayout.vue'
import VirtualNumpad from '@/components/ui/VirtualNumpad.vue'
import OperatorAvatar from '@/components/ui/OperatorAvatar.vue'
import { useMesStore } from '@/store/mesStore'
import { useDowntimeStore } from '@/store/downtimeStore'
import { useQcStore } from '@/store/qcStore'

const mesStore = useMesStore()
const downtimeStore = useDowntimeStore()
const qcStore = useQcStore()

const isSyncing = ref(false)
let refreshTimer = null

async function manualSync() {
  isSyncing.value = true
  try {
    await Promise.all([
      mesStore.fetchInitialData(),
      downtimeStore.fetchDowntime(),
      qcStore.fetchDefects(mesStore.currentProductionWeek)
    ])
  } finally {
    setTimeout(() => { isSyncing.value = false }, 400)
  }
}

onMounted(async () => {
  await Promise.all([
    mesStore.fetchInitialData(),
    downtimeStore.fetchDowntime(),
    qcStore.fetchDefects(mesStore.currentProductionWeek)
  ])
  qcStore.initRealtime()

  refreshTimer = setInterval(async () => {
    await qcStore.fetchDefects(mesStore.currentProductionWeek)
  }, 30000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})

// ── KPI Waste Computations ──
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

const todayEntries = computed(() => {
  const now = new Date()
  return (mesStore.ledgerEntries || []).filter(e => {
    const d = parseEntryDate(e)
    return d.getFullYear() === now.getFullYear() &&
           d.getMonth() === now.getMonth() &&
           d.getDate() === now.getDate()
  })
})

const todayGood = computed(() => todayEntries.value.reduce((s, e) => s + (Number(e.goodProduction) || 0), 0))
const todayWaste = computed(() => todayEntries.value.reduce((s, e) => s + (Number(e.wasteMaterial) || 0), 0))

const scrapRatePct = computed(() => {
  const total = todayGood.value + todayWaste.value
  if (!total) return '0.0'
  return ((todayWaste.value / total) * 100).toFixed(1)
})

const wasteRateStatus = computed(() => {
  const rate = Number(scrapRatePct.value)
  const warn = mesStore.wasteThresholds?.warn || 8
  const crit = mesStore.wasteThresholds?.critical || 15

  if (rate >= crit) {
    return {
      label: 'CRITICAL',
      icon: 'dangerous',
      cardClass: 'border-rose-500/40 bg-rose-500/10',
      iconClass: 'text-rose-400',
      textClass: 'text-rose-400',
      badgeClass: 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
    }
  }
  if (rate >= warn) {
    return {
      label: 'WARNING',
      icon: 'warning',
      cardClass: 'border-amber-500/40 bg-amber-500/10',
      iconClass: 'text-amber-400',
      textClass: 'text-amber-400',
      badgeClass: 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
    }
  }
  return {
    label: 'OPTIMAL',
    icon: 'task_alt',
    cardClass: 'border-emerald-500/20 bg-emerald-500/5',
    iconClass: 'text-emerald-400',
    textClass: 'text-emerald-400',
    badgeClass: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
  }
})

// ── Form State ──
const formData = reactive({
  operator_id: '',
  machine_id: '',
  divider_type: '50',
  category: 'Bent Edge',
  quantity: ''
})

const isFormValid = computed(() => {
  return formData.operator_id !== '' &&
         formData.machine_id !== '' &&
         formData.divider_type !== '' &&
         formData.category !== '' &&
         Number(formData.quantity) > 0
})

const toast = ref({ visible: false, message: '' })
let toastTimer = null
function showToast(msg) {
  toast.value = { visible: true, message: msg }
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value.visible = false }, 3000)
}

function submitDefect() {
  if (!isFormValid.value) return
  
  qcStore.logDefect({ ...formData })
  showToast(`Successfully logged ${formData.quantity} defective pieces.`)
  
  formData.quantity = ''
}
</script>

<style scoped>
/* ══ Main view area ════════════════════════════════════════════════════════════ */
.view-area {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #0f172a;
}

.view-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: 1.25rem 1.5rem;
  gap: 1rem;
  overflow: hidden;
}

.panel-header { flex-shrink: 0; }
.panel-title {
  font-size: 1.35rem;
  font-weight: 900;
  color: #f1f5f9;
  margin: 0;
}
.panel-sub { font-size: .75rem; color: #64748b; margin: .2rem 0 0; }

.sync-btn {
  display: flex; align-items: center; gap: 0.35rem;
  background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.3);
  color: #a5b4fc; border-radius: 0.5rem; padding: 0.45rem 0.85rem;
  font-size: 0.75rem; font-weight: 700; transition: all 0.15s ease;
}
.sync-btn:hover { background: rgba(99,102,241,0.22); color: #fff; }
.spin-icon { animation: spin 0.8s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.qc-kpi-card {
  display: flex; align-items: center; gap: 0.85rem;
  border: 1px solid; border-radius: 1rem; padding: 0.85rem 1.1rem;
}

/* ══ Cards ── */
.chart-card {
  background: #1e293b;
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 1.25rem;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow: hidden;
}
.chart-card h3 {
  color: #94a3b8;
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
  font-weight: 800;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  padding-bottom: 0.75rem;
}

/* ══ Forms ── */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.form-group label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
  font-weight: 700;
}
.custom-select {
  background: #0f172a;
  border: 1px solid rgba(255,255,255,0.1);
  color: #f8fafc;
  padding: 0.65rem 0.85rem;
  border-radius: 0.75rem;
  font-size: 0.85rem;
  outline: none;
  transition: all 0.2s;
}
.custom-select:focus {
  border-color: #6366f1;
}

.mega-toggle {
  background: #0f172a;
  border: 1px solid rgba(255,255,255,0.1);
  color: #94a3b8;
  padding: 0.35rem 0.65rem;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}
.mega-toggle--active {
  background: #6366f1;
  color: #fff;
  border-color: #6366f1;
}

/* ══ Buttons ── */
.btn-action {
  border: none;
  border-radius: 0.75rem;
  padding: 0.85rem;
  font-weight: 800;
  font-size: 0.85rem;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s;
}
.btn-action--active {
  background: linear-gradient(135deg, #e11d48, #be123c);
  color: #fff;
  box-shadow: 0 4px 15px rgba(225,29,72,0.3);
}
.btn-action--active:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}
.btn-action--disabled {
  background: #334155;
  color: #64748b;
  cursor: not-allowed;
  opacity: 0.5;
}

/* ══ Alerts ── */
.alerts-container {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  max-height: 360px;
  overflow-y: auto;
}
.alert-row {
  background: #0f172a;
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 0.75rem;
  padding: 0.85rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.alert-row--danger {
  border-color: rgba(244,63,94,0.4);
  background: rgba(244,63,94,0.05);
}
.badge-danger {
  background: rgba(225,29,72,0.15);
  border: 1px solid rgba(225,29,72,0.3);
  color: #fb7185;
  font-size: 0.65rem;
  font-weight: 800;
  padding: 0.2rem 0.5rem;
  border-radius: 0.4rem;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.badge-warning {
  background: rgba(245,158,11,0.15);
  border: 1px solid rgba(245,158,11,0.3);
  color: #fbbf24;
  font-size: 0.65rem;
  font-weight: 800;
  padding: 0.2rem 0.5rem;
  border-radius: 0.4rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2.5rem 1rem;
  color: #64748b;
  font-size: 0.8rem;
  font-weight: 600;
}

/* Toast */
.toast-message {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(16,185,129,0.95);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 0.75rem;
  font-weight: 700;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 10px 25px rgba(0,0,0,0.5);
  z-index: 100;
}
.toast-enter-active, .toast-leave-active { transition: all 0.25s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 1rem); }
</style>
