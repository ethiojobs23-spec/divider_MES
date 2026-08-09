<template>
  <AppLayout>
    <div class="view-area relative">
      
      <!-- ── Header ── -->
      <div class="view-panel" style="flex: none; padding-bottom: 0; min-height: auto;">
        <div class="panel-header flex justify-between items-start">
          <div>
            <h2 class="panel-title">Raw Material Inventory</h2>
            <p class="panel-sub">Monitor stock levels and log incoming shipments</p>
          </div>
          <button 
            @click="showReceivePanel = !showReceivePanel"
            class="hidden md:flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all border-none cursor-pointer"
            :class="showReceivePanel ? 'bg-slate-700 text-white hover:bg-slate-600' : 'btn-action-primary shadow-lg'"
          >
            <span class="material-symbols-rounded">{{ showReceivePanel ? 'close' : 'add_box' }}</span>
            {{ showReceivePanel ? 'Close Panel' : 'Receive Shipment' }}
          </button>
        </div>
      </div>

      <!-- ── Main Grid ── -->
      <div class="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 pb-10 pt-8" :class="{ 'opacity-40 md:opacity-100 transition-opacity': showReceivePanel }">
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8">
          <div 
            v-for="mat in inventoryStore.materials" 
            :key="mat.id"
            class="chart-card inventory-card transition-all duration-300"
            :class="isLowStock(mat) ? 'inventory-card--danger' : 'inventory-card--normal'"
          >
            <!-- Low Stock Badge -->
            <div v-if="isLowStock(mat)" class="absolute -top-3 right-4 badge-danger shadow-lg shadow-rose-900/20 px-3 py-1">
              <span class="material-symbols-rounded text-[1rem]">warning</span>
              Low Stock
            </div>

            <!-- Card Header -->
            <div class="flex items-start justify-between mb-4 mt-2">
              <div>
                <h3 class="text-lg font-bold text-white mb-1" style="border: none; margin: 0; padding: 0; color: #f8fafc; font-size: 1.1rem; text-transform: none; letter-spacing: normal;">
                  {{ mat.name }}
                </h3>
                <p class="text-xs text-slate-400 uppercase tracking-widest font-semibold mt-1">Material ID: {{ mat.id }}</p>
              </div>
              <div class="h-12 w-12 rounded-xl flex items-center justify-center bg-slate-900 border" :class="isLowStock(mat) ? 'border-rose-500/30 text-rose-400' : 'border-white/10 text-indigo-400'">
                <span class="material-symbols-rounded text-2xl">category</span>
              </div>
            </div>

            <!-- Stock Values -->
            <div class="flex items-end gap-2 mb-2">
              <span class="text-4xl font-black font-mono" :class="isLowStock(mat) ? 'text-rose-400' : 'text-white'">
                {{ mat.current_stock.toFixed(2) }}
              </span>
              <span class="text-lg font-bold text-slate-500 mb-1">{{ mat.unit }}</span>
            </div>

            <!-- Capacity Progress Bar -->
            <div class="mt-auto pt-4 border-t border-white/5">
              <div class="flex justify-between text-xs font-bold text-slate-400 mb-2">
                <span>Capacity</span>
                <span>{{ Math.min(100, (mat.current_stock / mat.max_capacity) * 100).toFixed(0) }}%</span>
              </div>
              <div class="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                <div 
                  class="h-full rounded-full transition-all duration-500"
                  :class="isLowStock(mat) ? 'bg-rose-500' : 'bg-indigo-500'"
                  :style="{ width: Math.min(100, (mat.current_stock / mat.max_capacity) * 100) + '%' }"
                ></div>
              </div>
              <p class="text-xs text-slate-500 font-semibold mt-3">Reorder Threshold: {{ mat.reorder_threshold }} {{ mat.unit }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Receiving Panel (Slide In) ── -->
      <div 
        class="absolute inset-y-0 right-0 w-full md:w-full max-w-[420px] bg-slate-800 border-l border-white/10 shadow-2xl flex flex-col transition-transform duration-300 z-20"
        :class="showReceivePanel ? 'translate-x-0' : 'translate-x-full'"
      >
        <!-- Panel Header -->
        <div class="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/50">
          <h2 class="text-xl font-black flex items-center gap-2 m-0 text-white">
            <span class="material-symbols-rounded text-emerald-400">local_shipping</span>
            Log Shipment
          </h2>
          <button @click="showReceivePanel = false" class="p-2 text-slate-400 hover:text-white bg-slate-700/50 rounded-lg cursor-pointer border-none flex md:hidden items-center justify-center">
            <span class="material-symbols-rounded">close</span>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar">
          
          <!-- Material Selection -->
          <div class="form-group">
            <label>Select Material</label>
            <div class="flex flex-col gap-2">
              <button 
                v-for="mat in inventoryStore.materials" 
                :key="'sel-'+mat.id"
                @click="selectedMaterialId = mat.id"
                class="mega-toggle flex justify-between items-center"
                :class="{'mega-toggle--active': selectedMaterialId === mat.id}"
                style="padding: 1rem;"
              >
                <span class="font-bold">{{ mat.name }}</span>
                <span v-if="selectedMaterialId === mat.id" class="material-symbols-rounded text-indigo-400">check_circle</span>
              </button>
            </div>
          </div>

          <hr class="border-white/5 my-2">

          <!-- Quantity Numpad -->
          <div class="flex-1 flex flex-col">
            <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">
              Received Quantity <span v-if="selectedMaterial" class="text-indigo-400">({{ selectedMaterial.unit }})</span>
            </label>
            
            <div class="flex-1 flex flex-col items-center justify-center">
              <VirtualNumpad 
                label="Incoming Quantity" 
                v-model="numpadValue" 
                :maxLen="6"
                allowDecimal
              />
            </div>
          </div>

        </div>

        <!-- Action Footer -->
        <div class="p-6 bg-slate-900/80 border-t border-white/5 backdrop-blur-md">
          <button 
            @click="submitShipment"
            :disabled="!isValidShipment"
            class="btn-action w-full"
            :class="isValidShipment ? 'btn-action--success' : 'btn-action--disabled'"
          >
            <span class="material-symbols-rounded">inventory</span>
            LOG SHIPMENT
          </button>
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
import { ref, computed } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import VirtualNumpad from '@/components/ui/VirtualNumpad.vue'
import { useInventoryStore } from '@/store/inventoryStore'

const inventoryStore = useInventoryStore()

const showReceivePanel = ref(false)
const selectedMaterialId = ref(null)
const numpadValue = ref('') // string bound to virtual numpad

const selectedMaterial = computed(() => {
  return inventoryStore.materials.find(m => m.id === selectedMaterialId.value)
})

function isLowStock(mat) {
  return mat.current_stock <= mat.reorder_threshold
}

const isValidShipment = computed(() => {
  return selectedMaterialId.value && numpadValue.value && Number(numpadValue.value) > 0
})

const toast = ref({ visible: false, message: '' })
let toastTimer = null
function showToast(msg) {
  toast.value = { visible: true, message: msg }
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value.visible = false }, 3000)
}

function submitShipment() {
  if (!isValidShipment.value) return
  
  const qty = Number(numpadValue.value)
  inventoryStore.receiveStock(selectedMaterialId.value, qty)
  
  showToast(`Successfully received ${qty} ${selectedMaterial.value.unit} of ${selectedMaterial.value.name}`)
  
  // Reset
  numpadValue.value = ''
  selectedMaterialId.value = null
  showReceivePanel.value = false
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
  gap: 1rem;
  overflow: visible;
  position: relative;
}

.inventory-card:hover {
  border-color: rgba(99,102,241,0.5);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.inventory-card--danger {
  border-color: rgba(225,29,72,0.6);
  background: linear-gradient(180deg, rgba(30,41,59,1) 0%, rgba(225,29,72,0.05) 100%);
}
.inventory-card--danger:hover {
  border-color: #f43f5e;
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

/* ══ Mega Toggle ═════════════════════════════════════════════════════════════ */
.mega-toggle {
  width: 100%;
  background: #0f172a;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 0.5rem;
  color: #94a3b8;
  font-weight: 700;
  padding: 0.75rem 0;
  transition: all 0.2s;
  cursor: pointer;
  text-align: left;
}
.mega-toggle--active {
  background: rgba(99,102,241,0.15);
  border-color: #6366f1;
  color: #a5b4fc;
}

/* ══ Buttons ═════════════════════════════════════════════════════════════════ */
.btn-action-primary {
  background: #4f46e5;
  color: white;
  border: none;
  cursor: pointer;
}
.btn-action-primary:hover {
  background: #6366f1;
}

.btn-action {
  width: 100%;
  padding: 1.1rem;
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
.btn-action--success {
  background: #10b981;
  color: #064e3b;
}
.btn-action--success:active {
  transform: scale(0.98);
}

/* ══ Badges ══════════════════════════════════════════════════════════════════ */
.badge-danger {
  background: #e11d48;
  color: white;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 900;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  letter-spacing: 0.05em;
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

/* Scrollbar */
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
</style>
