<template>
  <AppLayout>
    <div class="h-full w-full flex flex-col bg-slate-900 text-slate-100 overflow-hidden relative">
      
      <!-- ── Header ── -->
      <header class="flex-shrink-0 flex items-center justify-between p-6 bg-slate-800 border-b border-amber-500/20">
        <div class="flex items-center gap-4">
          <span class="material-symbols-rounded text-4xl text-amber-500">verified_user</span>
          <div>
            <h1 class="text-2xl font-black tracking-wide">Quality Control & Waste Logging</h1>
            <p class="text-sm text-slate-400 font-medium">Categorize defects to identify training and calibration needs</p>
          </div>
        </div>
      </header>

      <!-- ── Main Content Area ── -->
      <div class="flex-1 overflow-y-auto p-6">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto h-full">
          
          <!-- ── Left Panel: Log Defect ── -->
          <div class="flex flex-col gap-6">
            <div class="bg-slate-800 rounded-2xl p-6 border border-white/5 shadow-xl flex flex-col h-full">
              <h2 class="text-lg font-black uppercase tracking-widest text-slate-300 mb-6 flex items-center gap-2">
                <span class="material-symbols-rounded text-amber-500">assignment_late</span>
                Log Defective Output
              </h2>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <!-- Operator Select -->
                <div>
                  <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Operator</label>
                  <select v-model="formData.operator_id" class="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-white font-bold appearance-none outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all">
                    <option disabled value="">-- Select Operator --</option>
                    <option v-for="op in mesStore.operators" :key="op.id" :value="op.id">
                      {{ op.name }}
                    </option>
                  </select>
                </div>
                
                <!-- Machine Select -->
                <div>
                  <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Machine Used</label>
                  <select v-model="formData.machine_id" class="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-white font-bold appearance-none outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all">
                    <option disabled value="">-- Select Machine --</option>
                    <option v-for="m in downtimeStore.machines" :key="m.id" :value="m.id">
                      {{ m.name }}
                    </option>
                  </select>
                </div>

                <!-- Divider Type -->
                <div>
                  <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Divider Type</label>
                  <div class="flex gap-2">
                    <button 
                      v-for="type in qcStore.dividerTypes" 
                      :key="type"
                      @click="formData.divider_type = type"
                      class="flex-1 py-3 px-4 rounded-xl border font-bold transition-all"
                      :class="formData.divider_type === type ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-slate-900 border-white/10 text-slate-400'"
                    >
                      {{ type }}
                    </button>
                  </div>
                </div>

                <!-- Defect Category -->
                <div>
                  <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Defect Type</label>
                  <select v-model="formData.category" class="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-white font-bold appearance-none outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all">
                    <option disabled value="">-- Select Flaw --</option>
                    <option v-for="cat in qcStore.categories" :key="cat" :value="cat">
                      {{ cat }}
                    </option>
                  </select>
                </div>
              </div>

              <!-- Virtual Numpad for Quantity -->
              <div class="flex-1 flex flex-col justify-center items-center mt-2 border-t border-white/5 pt-6">
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 w-full text-center">
                  Quantity of Defective Pieces
                </label>
                <VirtualNumpad 
                  label="Defect Quantity"
                  v-model="formData.quantity" 
                  :maxLen="5" 
                />
              </div>

              <!-- Action Button -->
              <button 
                @click="submitDefect"
                :disabled="!isFormValid"
                class="mt-6 w-full flex items-center justify-center gap-3 p-5 rounded-xl font-black text-lg transition-all"
                :class="isFormValid ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/30 active:scale-95' : 'bg-slate-700 text-slate-500 cursor-not-allowed'"
              >
                <span class="material-symbols-rounded">delete_forever</span>
                LOG WASTE & DEFECTS
              </button>
            </div>
          </div>

          <!-- ── Right Panel: Analytics & Alerts ── -->
          <div class="flex flex-col gap-6">
            
            <!-- Operator Training Alerts -->
            <div class="bg-slate-800 rounded-2xl border border-white/5 shadow-xl flex flex-col overflow-hidden">
              <div class="p-6 border-b border-white/5 bg-slate-900/50">
                <h2 class="text-sm font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
                  <span class="material-symbols-rounded text-rose-400">group_off</span>
                  Operator Training Alerts
                </h2>
                <p class="text-xs text-slate-500 font-medium mt-1">Total defects by operator across all machines.</p>
              </div>
              <div class="p-4 flex flex-col gap-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                <div v-if="qcStore.operatorDefectRates.length === 0" class="text-center text-slate-500 py-6">
                  No operator defects logged yet.
                </div>
                <div 
                  v-for="rate in qcStore.operatorDefectRates" 
                  :key="'op-'+rate.operator_id"
                  class="flex items-center justify-between p-4 rounded-xl bg-slate-900/80 border border-white/5"
                  :class="{ 'border-rose-500/50 bg-rose-950/20': rate.training_required }"
                >
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-inner" :class="rate.color || 'bg-slate-600'">
                      {{ rate.avatar || rate.operator_name.charAt(0) }}
                    </div>
                    <div>
                      <p class="font-bold text-white">{{ rate.operator_name }}</p>
                      <p class="text-xs text-slate-400 font-medium">{{ rate.total_defects }} Total Defects</p>
                    </div>
                  </div>
                  <div v-if="rate.training_required" class="bg-rose-500/20 border border-rose-500/30 text-rose-400 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                    <span class="material-symbols-rounded text-[1rem]">warning</span>
                    Training Req
                  </div>
                </div>
              </div>
            </div>

            <!-- Machine Maintenance Alerts -->
            <div class="bg-slate-800 rounded-2xl border border-white/5 shadow-xl flex flex-col overflow-hidden flex-1">
              <div class="p-6 border-b border-white/5 bg-slate-900/50">
                <h2 class="text-sm font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
                  <span class="material-symbols-rounded text-amber-500">build_circle</span>
                  Machine Calibration Alerts
                </h2>
                <p class="text-xs text-slate-500 font-medium mt-1">Highlights equipment producing excessive 'Bent Edge' flaws.</p>
              </div>
              <div class="p-4 flex flex-col gap-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                <div v-if="qcStore.machineDefectRates.length === 0" class="text-center text-slate-500 py-6">
                  No machine defects logged yet.
                </div>
                <div 
                  v-for="rate in qcStore.machineDefectRates" 
                  :key="'mac-'+rate.machine_id"
                  class="flex flex-col gap-3 p-4 rounded-xl bg-slate-900/80 border border-white/5 relative overflow-hidden"
                  :class="{ 'border-amber-500/50 bg-amber-950/20': rate.calibration_needed }"
                >
                  <div v-if="rate.calibration_needed" class="absolute top-0 left-0 w-1 h-full bg-amber-500 animate-pulse"></div>
                  
                  <div class="flex justify-between items-start">
                    <div>
                      <h3 class="font-bold text-white">{{ rate.machine_name }}</h3>
                      <p class="text-xs text-slate-400 font-medium">Total Lifetime Defects: {{ rate.total_defects }}</p>
                    </div>
                    <div v-if="rate.calibration_needed" class="bg-amber-500/20 border border-amber-500/30 text-amber-400 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                      <span class="material-symbols-rounded text-[1rem]">handyman</span>
                      Needs Calibration
                    </div>
                  </div>
                  
                  <div class="flex justify-between items-center bg-slate-800/50 px-3 py-2 rounded-lg border border-white/5 mt-1">
                    <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">Bent Edges Created:</span>
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
        <div v-if="toast.visible" class="absolute bottom-8 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-900 font-bold px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-50">
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
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.02);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

.toast-enter-active, .toast-leave-active { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 20px); }
</style>
