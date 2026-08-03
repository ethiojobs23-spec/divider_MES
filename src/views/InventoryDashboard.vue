<template>
  <AppLayout>
    <div class="h-full w-full flex flex-col bg-slate-900 text-slate-100 overflow-hidden relative">
      
      <!-- ── Header ── -->
      <header class="flex-shrink-0 flex items-center justify-between p-6 bg-slate-800 border-b border-indigo-500/20">
        <div class="flex items-center gap-4">
          <span class="material-symbols-rounded text-4xl text-indigo-400">inventory_2</span>
          <div>
            <h1 class="text-2xl font-black tracking-wide">Raw Material Inventory</h1>
            <p class="text-sm text-slate-400 font-medium">Monitor stock levels and log incoming shipments</p>
          </div>
        </div>
        <button 
          @click="showReceivePanel = !showReceivePanel"
          class="hidden md:flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all"
          :class="showReceivePanel ? 'bg-slate-700 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'"
        >
          <span class="material-symbols-rounded">{{ showReceivePanel ? 'close' : 'add_box' }}</span>
          {{ showReceivePanel ? 'Close Panel' : 'Receive Shipment' }}
        </button>
      </header>

      <!-- ── Main Content Area ── -->
      <div class="flex flex-1 overflow-hidden relative">
        
        <!-- Stock Levels Grid -->
        <div class="flex-1 overflow-y-auto p-6" :class="{ 'opacity-50 md:opacity-100 transition-opacity': showReceivePanel }">
          
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <div 
              v-for="mat in inventoryStore.materials" 
              :key="mat.id"
              class="relative flex flex-col p-6 rounded-2xl bg-slate-800 border-2 transition-all shadow-xl"
              :class="isLowStock(mat) ? 'border-rose-500 shadow-rose-900/20' : 'border-white/10 hover:border-indigo-500/50'"
            >
              <!-- Low Stock Badge -->
              <div v-if="isLowStock(mat)" class="absolute -top-3 right-4 bg-rose-500 text-white text-xs font-black px-3 py-1 rounded-full shadow-lg flex items-center gap-1 uppercase tracking-widest">
                <span class="material-symbols-rounded text-[1rem]">warning</span>
                Low Stock
              </div>

              <!-- Card Header -->
              <div class="flex items-start justify-between mb-6">
                <div>
                  <h3 class="text-lg font-bold text-white mb-1">{{ mat.name }}</h3>
                  <p class="text-xs text-slate-400 uppercase tracking-widest font-semibold">Material ID: {{ mat.id }}</p>
                </div>
                <div class="h-12 w-12 rounded-xl flex items-center justify-center bg-slate-900 border" :class="isLowStock(mat) ? 'border-rose-500/30 text-rose-400' : 'border-white/10 text-indigo-400'">
                  <span class="material-symbols-rounded text-2xl">category</span>
                </div>
              </div>

              <!-- Stock Values -->
              <div class="flex items-end gap-2 mb-3">
                <span class="text-4xl font-black font-mono" :class="isLowStock(mat) ? 'text-rose-400' : 'text-white'">
                  {{ mat.current_stock.toFixed(2) }}
                </span>
                <span class="text-lg font-bold text-slate-500 mb-1">{{ mat.unit }}</span>
              </div>

              <!-- Capacity Progress Bar -->
              <div class="mt-auto pt-4">
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
          class="absolute inset-y-0 right-0 w-full md:w-[400px] bg-slate-800 border-l border-white/10 shadow-2xl flex flex-col transition-transform duration-300 z-20"
          :class="showReceivePanel ? 'translate-x-0' : 'translate-x-full'"
        >
          <!-- Panel Header -->
          <div class="p-6 border-b border-white/5 flex items-center justify-between">
            <h2 class="text-xl font-black flex items-center gap-2">
              <span class="material-symbols-rounded text-emerald-400">local_shipping</span>
              Log Shipment
            </h2>
            <button @click="showReceivePanel = false" class="p-2 text-slate-400 hover:text-white bg-slate-700/50 rounded-lg md:hidden">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>

          <div class="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
            
            <!-- Material Selection -->
            <div>
              <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Select Material</label>
              <div class="flex flex-col gap-2">
                <button 
                  v-for="mat in inventoryStore.materials" 
                  :key="'sel-'+mat.id"
                  @click="selectedMaterialId = mat.id"
                  class="w-full p-4 rounded-xl border text-left flex items-center justify-between transition-all"
                  :class="selectedMaterialId === mat.id ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-slate-900/50 border-white/5 text-slate-400 hover:border-white/20'"
                >
                  <span class="font-bold">{{ mat.name }}</span>
                  <span v-if="selectedMaterialId === mat.id" class="material-symbols-rounded text-indigo-400">check_circle</span>
                </button>
              </div>
            </div>

            <hr class="border-white/5">

            <!-- Quantity Numpad -->
            <div class="flex-1 flex flex-col">
              <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                Received Quantity <span v-if="selectedMaterial" class="text-indigo-400">({{ selectedMaterial.unit }})</span>
              </label>
              
              <div class="flex-1 flex flex-col items-center justify-center">
                <!-- Virtual Numpad strictly bound to numpadValue string -->
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
          <div class="p-6 bg-slate-900 border-t border-white/5">
            <button 
              @click="submitShipment"
              :disabled="!isValidShipment"
              class="w-full flex items-center justify-center gap-3 p-4 rounded-xl font-black text-lg transition-all"
              :class="isValidShipment ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-900 shadow-lg shadow-emerald-500/20 active:scale-95' : 'bg-slate-800 text-slate-500 cursor-not-allowed'"
            >
              <span class="material-symbols-rounded">inventory</span>
              LOG SHIPMENT
            </button>
          </div>
        </div>

      </div>

      <!-- Mobile FAB -->
      <button 
        v-if="!showReceivePanel"
        @click="showReceivePanel = true" 
        class="md:hidden absolute bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-600/40 flex items-center justify-center active:scale-95 transition-transform z-10"
      >
        <span class="material-symbols-rounded text-3xl">add</span>
      </button>

      <!-- Toast -->
      <Transition name="toast">
        <div v-if="toast.visible" class="absolute bottom-8 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-900 font-bold px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-50">
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
const numpadValue = ref('')

const selectedMaterial = computed(() => {
  return inventoryStore.materials.find(m => m.id === selectedMaterialId.value)
})

const isValidShipment = computed(() => {
  return selectedMaterialId.value && Number(numpadValue.value) > 0
})

const isLowStock = (mat) => {
  return mat.current_stock <= mat.reorder_threshold
}

const toast = ref({ visible: false, message: '' })
let toastTimer = null
function showToast(msg) {
  toast.value = { visible: true, message: msg }
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value.visible = false }, 3000)
}

function submitShipment() {
  if (!isValidShipment.value) return
  
  // Strictly convert string from numpad to Number before dispatching
  const qty = Number(numpadValue.value)
  
  inventoryStore.receiveStock(selectedMaterialId.value, qty)
  
  showToast(`Successfully logged ${qty} ${selectedMaterial.value.unit} of ${selectedMaterial.value.name}`)
  
  // Reset
  numpadValue.value = ''
  selectedMaterialId.value = null
  showReceivePanel.value = false
}
</script>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 20px); }
</style>
