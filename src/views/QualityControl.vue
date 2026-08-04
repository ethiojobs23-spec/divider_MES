<template>
  <AppLayout>
    <div class="view-area">
      <!-- ── Header ── -->
      <div class="view-panel" style="flex: none; padding-bottom: 0; min-height: auto;">
        <div class="panel-header flex justify-between items-start">
          <div>
            <h2 class="panel-title">Quality Control & Waste Logging</h2>
            <p class="panel-sub">Categorize defects to identify training and calibration needs</p>
          </div>
        </div>
      </div>

      <!-- ── Main Grid ── -->
      <div class="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 pb-10 pt-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          
        <!-- ── Left Panel: Log Defect ── -->
        <div class="chart-card">
          <h3>Log Defective Output</h3>
          
          <div class="flex flex-col gap-4">
            <!-- Operator Select -->
            <div class="form-group">
              <label>Operator</label>
              <select v-model="formData.operator_id" class="custom-select">
                <option disabled value="">-- Select Operator --</option>
                <option v-for="op in mesStore.operators" :key="op.id" :value="op.id">
                  {{ op.name }}
                </option>
              </select>
            </div>
            
            <!-- Machine Select -->
            <div class="form-group">
              <label>Machine Used</label>
              <select v-model="formData.machine_id" class="custom-select">
                <option disabled value="">-- Select Machine --</option>
                <option v-for="m in downtimeStore.machines" :key="m.id" :value="m.id">
                  {{ m.name }}
                </option>
              </select>
            </div>

            <!-- Divider Type -->
            <div class="form-group">
              <label>Divider Type</label>
              <div class="flex gap-2">
                <button 
                  v-for="type in qcStore.dividerTypes" 
                  :key="type"
                  @click="formData.divider_type = type"
                  class="mega-toggle"
                  :class="{'mega-toggle--active': formData.divider_type === type}"
                >
                  {{ type }}
                </button>
              </div>
            </div>

            <!-- Defect Category -->
            <div class="form-group">
              <label>Defect Type</label>
              <select v-model="formData.category" class="custom-select">
                <option disabled value="">-- Select Flaw --</option>
                <option v-for="cat in qcStore.categories" :key="cat" :value="cat">
                  {{ cat }}
                </option>
              </select>
            </div>

            <!-- Virtual Numpad -->
            <div class="mt-2">
              <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 text-center">Defect Quantity</label>
              <VirtualNumpad 
                v-model="formData.quantity" 
                :maxLen="5" 
              />
            </div>

            <button 
              @click="submitDefect"
              :disabled="!isFormValid"
              class="btn-action"
              :class="isFormValid ? 'btn-action--active' : 'btn-action--disabled'"
            >
              <span class="material-symbols-rounded">delete_forever</span>
              LOG WASTE & DEFECTS
            </button>
          </div>
        </div>

        <!-- ── Right Panel: Analytics & Alerts ── -->
        <div class="flex flex-col gap-4">
          
          <!-- Operator Training Alerts -->
          <div class="chart-card" style="flex: 1;">
            <h3 style="color: #fbbf24; border-bottom-color: rgba(251,191,36,0.2);">Operator Training Alerts</h3>
            <div class="alerts-container">
              <div v-if="qcStore.operatorDefectRates.length === 0" class="empty-state">
                No operator defects logged yet.
              </div>
              <div 
                v-for="rate in qcStore.operatorDefectRates" 
                :key="'op-'+rate.operator_id"
                class="alert-row"
                :class="{'alert-row--danger': rate.training_required}"
              >
                <div class="flex items-center gap-3">
                  <div class="avatar-sm" :class="rate.color || 'bg-slate-600'">
                    {{ rate.avatar || rate.operator_name.charAt(0) }}
                  </div>
                  <div>
                    <p class="font-bold text-white">{{ rate.operator_name }}</p>
                    <p class="text-xs text-slate-400 font-medium">{{ rate.total_defects }} Total Defects</p>
                  </div>
                </div>
                <div v-if="rate.training_required" class="badge-danger">
                  <span class="material-symbols-rounded" style="font-size:1rem">warning</span>
                  Training Req
                </div>
              </div>
            </div>
          </div>

          <!-- Machine Maintenance Alerts -->
          <div class="chart-card" style="flex: 1;">
            <h3 style="color: #38bdf8; border-bottom-color: rgba(56,189,248,0.2);">Machine Calibration Alerts</h3>
            <div class="alerts-container">
              <div v-if="qcStore.machineDefectRates.length === 0" class="empty-state">
                No machine defects logged yet.
              </div>
              <div 
                v-for="rate in qcStore.machineDefectRates" 
                :key="'mac-'+rate.machine_id"
                class="alert-row flex-col items-start gap-2"
                :class="{'alert-row--danger': rate.calibration_needed}"
              >
                <div class="flex justify-between items-start w-full">
                  <div>
                    <h4 class="font-bold text-white m-0">{{ rate.machine_name }}</h4>
                    <p class="text-xs text-slate-400 font-medium m-0">Total Lifetime Defects: {{ rate.total_defects }}</p>
                  </div>
                  <div v-if="rate.calibration_needed" class="badge-warning">
                    <span class="material-symbols-rounded" style="font-size:1rem">handyman</span>
                    Needs Calibration
                  </div>
                </div>
                
                <div class="flex justify-between items-center bg-slate-800/50 px-3 py-2 rounded-lg border border-white/5 w-full mt-1">
                  <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">Bent Edges:</span>
                  <span class="font-mono font-bold" :class="rate.calibration_needed ? 'text-amber-400' : 'text-slate-300'">{{ rate.bent_edge_count }}</span>
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
import { ref, reactive, computed, onMounted } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import VirtualNumpad from '@/components/ui/VirtualNumpad.vue'
import { useMesStore } from '@/store/mesStore'
import { useDowntimeStore } from '@/store/downtimeStore'
import { useQcStore } from '@/store/qcStore'

const mesStore = useMesStore()
const downtimeStore = useDowntimeStore()
const qcStore = useQcStore()

// Initialize dependencies
onMounted(async () => {
  if (mesStore.operators.length === 0) {
    await mesStore.fetchInitialData()
  }
})

const formData = reactive({
  operator_id: '',
  machine_id: '',
  divider_type: '',
  category: '',
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
  
  // Reset Form
  formData.operator_id = ''
  formData.machine_id = ''
  formData.divider_type = ''
  formData.category = ''
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
  font-size: 1.3rem;
  font-weight: 900;
  color: #f1f5f9;
  margin: 0;
}
.panel-sub { font-size: .7rem; color: #64748b; margin: .2rem 0 0; }

/* ══ Chart card ══════════════════════════════════════════════════════════════ */
.chart-card {
  background: #1e293b;
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 1.25rem;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  overflow: visible;
  position: relative;
}
.chart-card h3 {
  color: #94a3b8;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin: 0 0 .5rem 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  padding-bottom: 0.75rem;
}

/* ══ Form elements ═══════════════════════════════════════════════════════════ */
.form-group label {
  display: block;
  font-size: 0.7rem;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.4rem;
}

.custom-select {
  width: 100%;
  background: #0f172a;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  color: #f1f5f9;
  font-weight: 700;
  outline: none;
  appearance: none;
  transition: all 0.2s;
}
.custom-select:focus {
  border-color: #f59e0b;
}

/* ══ Mega Toggle ═════════════════════════════════════════════════════════════ */
.mega-toggle {
  flex: 1;
  background: #0f172a;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 0.5rem;
  color: #94a3b8;
  font-weight: 700;
  padding: 0.75rem 0;
  transition: all 0.2s;
}
.mega-toggle--active {
  background: rgba(99,102,241,0.15);
  border-color: #6366f1;
  color: #a5b4fc;
}

/* ══ Buttons ═════════════════════════════════════════════════════════════════ */
.btn-action {
  width: 100%;
  padding: 1rem;
  border-radius: 0.75rem;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border: none;
  cursor: pointer;
}
.btn-action--disabled {
  background: #334155;
  color: #64748b;
  cursor: not-allowed;
}
.btn-action--active {
  background: #f59e0b;
  color: #1e293b;
}
.btn-action--active:active {
  transform: scale(0.98);
}

/* ══ Alerts ══════════════════════════════════════════════════════════════════ */
.alerts-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow-y: auto;
  max-height: 250px;
}
.alerts-container::-webkit-scrollbar { width: 4px; }
.alerts-container::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
.alerts-container::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

.empty-state {
  text-align: center;
  color: #64748b;
  padding: 2rem 0;
  font-size: 0.85rem;
  font-weight: 500;
}

.alert-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: rgba(15,23,42,0.5);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 0.75rem;
}
.alert-row--danger {
  background: rgba(225,29,72,0.1);
  border-color: rgba(225,29,72,0.3);
}

.avatar-sm {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
}

.badge-danger {
  background: rgba(225,29,72,0.2);
  color: #fb7185;
  padding: 0.25rem 0.5rem;
  border-radius: 1rem;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.badge-warning {
  background: rgba(245,158,11,0.2);
  color: #fbbf24;
  padding: 0.25rem 0.5rem;
  border-radius: 1rem;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

/* ══ Toast ═══════════════════════════════════════════════════════════════════ */
.toast-message {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background: #10b981;
  color: #064e3b;
  font-weight: 800;
  padding: 0.75rem 1.5rem;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
  z-index: 50;
}
.toast-enter-active, .toast-leave-active { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 20px); }
</style>
