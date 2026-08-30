<template>
  <AppLayout>
    <div class="view-area relative flex flex-col h-full overflow-hidden">
      
      <!-- ── Header ── -->
      <div class="view-panel" style="flex: none; padding-bottom: 0; min-height: auto;">
        <div class="panel-header flex justify-between items-start">
          <div>
            <h2 class="panel-title">Raw Material Inventory</h2>
            <p class="panel-sub">Monitor stock levels, log incoming shipments, and record withdrawals</p>
          </div>
          <button 
            @click="openActionPanel('add_stock')"
            class="flex items-center gap-1.5 md:gap-2 px-3 md:px-6 py-2 md:py-3 text-xs md:text-sm rounded-xl font-bold transition-all border-none cursor-pointer btn-action-primary shadow-lg shrink-0"
          >
            <span class="material-symbols-rounded text-base md:text-lg">manage_history</span>
            <span>Manage Stock</span>
          </button>
        </div>
      </div>

      <!-- ── Main Grid ── -->
      <div class="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 pb-10 pt-8 flex flex-col gap-10" :class="{ 'opacity-40 md:opacity-100 transition-opacity': showActionPanel }">
        
        <div>
          <h3 class="text-xl font-black text-white mb-6 flex items-center gap-2"><span class="material-symbols-rounded text-indigo-400">category</span> Current Stock Levels</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 sm:gap-8">
            <div 
              v-for="mat in inventoryStore.materials" 
              :key="mat.id"
              class="chart-card inventory-card transition-all duration-300"
              :class="isLowStock(mat) ? 'inventory-card--danger' : 'inventory-card--normal'"
            >
              <!-- Low Stock Badge -->
              <div v-if="isLowStock(mat)" class="absolute -top-3 right-4 badge-danger shadow-lg shadow-rose-900/20 px-3 py-1">
                <span class="material-symbols-rounded text-[1rem]">warning</span>
                < 15% Stock
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
                  {{ (Number(mat.current_stock) || 0).toFixed(1) }}
                </span>
                <span class="text-lg font-bold text-slate-500 mb-1">{{ mat.unit }}</span>
              </div>

              <!-- Capacity Progress Bar -->
              <div class="mt-auto pt-4 border-t border-white/5">
                <div class="flex justify-between text-xs font-bold text-slate-400 mb-2">
                  <span>Capacity</span>
                  <span>{{ Math.min(100, ((mat.current_stock || 0) / (mat.max_capacity || 1)) * 100).toFixed(0) }}%</span>
                </div>
                <div class="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                  <div 
                    class="h-full rounded-full transition-all duration-500"
                    :class="isLowStock(mat) ? 'bg-rose-500' : 'bg-indigo-500'"
                    :style="{ width: Math.min(100, ((mat.current_stock || 0) / (mat.max_capacity || 1)) * 100) + '%' }"
                  ></div>
                </div>
                <p class="text-xs text-slate-500 font-semibold mt-3 flex justify-between">
                  <span>Alert Threshold: < 15%</span>
                  <span>(Max {{ mat.max_capacity }} {{ mat.unit }})</span>
                </p>
              </div>
            </div>
            
            <!-- Add New Material Card -->
            <div 
              @click="openActionPanel('add_material')"
              class="chart-card inventory-card inventory-card--normal flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500/50 hover:bg-slate-800/80 transition-all group min-h-[220px]"
            >
              <div class="h-16 w-16 rounded-full border border-dashed border-emerald-500/30 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-emerald-500/10 transition-all">
                <span class="material-symbols-rounded text-3xl text-emerald-400">add</span>
              </div>
              <h3 class="font-bold text-slate-300">Add New Material</h3>
            </div>
          </div>
        </div>

        <!-- ── Transaction Logs ── -->
        <div>
          <h3 class="text-xl font-black text-white mb-6 flex items-center gap-2"><span class="material-symbols-rounded text-emerald-400">history</span> Withdrawal & Receiving Logs</h3>
          <div class="chart-card p-0 overflow-hidden">
            <div class="overflow-x-auto w-full">
              <table class="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr class="bg-slate-900/50 border-b border-white/5">
                    <th class="p-4 text-xs font-bold text-slate-400 uppercase">Date</th>
                    <th class="p-4 text-xs font-bold text-slate-400 uppercase">Material</th>
                    <th class="p-4 text-xs font-bold text-slate-400 uppercase">Type</th>
                    <th class="p-4 text-xs font-bold text-slate-400 uppercase">Qty / Unit</th>
                    <th class="p-4 text-xs font-bold text-slate-400 uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="log in inventoryStore.transactions" :key="log.id" class="border-b border-white/5 hover:bg-white/[0.02]">
                    <td class="p-4 text-slate-300 text-sm whitespace-nowrap">{{ formatDate(log.transaction_date) }}</td>
                    <td class="p-4 font-bold text-white whitespace-nowrap">{{ getMaterialName(log.material_id) }}</td>
                    <td class="p-4">
                      <span 
                        class="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider"
                        :class="log.transaction_type === 'IN' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'"
                      >
                        {{ log.transaction_type === 'IN' ? 'Received (IN)' : 'Withdrawn (OUT)' }}
                      </span>
                    </td>
                    <td class="p-4 font-mono font-bold whitespace-nowrap" :class="log.transaction_type === 'IN' ? 'text-emerald-400' : 'text-rose-400'">
                      {{ log.transaction_type === 'IN' ? '+' : '-' }}{{ log.quantity }} {{ getMaterialUnit(log.material_id) }}
                    </td>
                    <td class="p-4 text-slate-400 text-sm italic max-w-xs truncate">{{ log.notes || '—' }}</td>
                  </tr>
                  <tr v-if="inventoryStore.transactions.length === 0">
                    <td colspan="5" class="p-8 text-center text-slate-500">No transactions recorded yet.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Action Panel (Slide In) ── -->
      <div 
        class="fixed sm:absolute inset-y-0 right-0 w-full max-w-full sm:max-w-[420px] bg-slate-800 border-l border-white/10 shadow-2xl flex flex-col transition-transform duration-300 z-50"
        :class="showActionPanel ? 'translate-x-0' : 'translate-x-full'"
      >
        <!-- Panel Header -->
        <div class="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/50">
          <h2 class="text-xl font-black flex items-center gap-2 m-0 text-white">
            <span class="material-symbols-rounded text-indigo-400">{{ actionType === 'add_material' ? 'library_add' : 'manage_history' }}</span>
            {{ actionType === 'add_material' ? 'Add Material' : 'Log Transaction' }}
          </h2>
          <button @click="showActionPanel = false" class="p-2 text-slate-400 hover:text-white bg-slate-700/50 rounded-lg cursor-pointer border-none flex items-center justify-center">
            <span class="material-symbols-rounded">close</span>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar">
          
          <!-- Add Material Form -->
          <div v-if="actionType === 'add_material'" class="flex flex-col gap-4">
            <div class="form-group">
              <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Material Name</label>
              <input v-model="newMat.name" type="text" class="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white" placeholder="e.g. Copper Wire">
            </div>
            <div class="form-group">
              <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Unit of Measurement</label>
              <input v-model="newMat.unit" type="text" class="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white" placeholder="e.g. kg, rolls, L">
            </div>
            <div class="form-group">
              <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Max Capacity</label>
              <input v-model="newMat.max_capacity" type="number" class="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white" placeholder="e.g. 500">
            </div>
          </div>

          <!-- Transaction Form -->
          <div v-if="actionType === 'add_stock' || actionType === 'sub_stock'" class="flex flex-col gap-6 h-full">
            
            <div class="flex gap-2 p-1 bg-slate-900 rounded-xl border border-white/5">
               <button 
                 @click="actionType = 'add_stock'"
                 class="flex-1 py-2 rounded-lg text-sm font-bold transition-all border-none cursor-pointer"
                 :class="actionType === 'add_stock' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-transparent text-slate-500'"
               >RECEIVE</button>
               <button 
                 @click="actionType = 'sub_stock'"
                 class="flex-1 py-2 rounded-lg text-sm font-bold transition-all border-none cursor-pointer"
                 :class="actionType === 'sub_stock' ? 'bg-rose-500/20 text-rose-400' : 'bg-transparent text-slate-500'"
               >WITHDRAW</button>
            </div>

            <!-- Material Selection -->
            <div class="form-group">
              <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Select Material</label>
              <select v-model="selectedMaterialId" class="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white font-bold cursor-pointer outline-none">
                 <option value="" disabled selected>-- Choose Material --</option>
                 <option v-for="mat in inventoryStore.materials" :key="mat.id" :value="mat.id">
                    {{ mat.name }} (in {{ mat.unit }})
                 </option>
              </select>
            </div>

            <!-- Notes -->
            <div class="form-group">
              <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Optional Details / Notes</label>
              <input v-model="transactionNotes" type="text" class="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white" placeholder="e.g. Taken by Kaleb for Line A">
            </div>

            <!-- Quantity Numpad -->
            <div class="flex-1 flex flex-col mt-4">
              <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">
                {{ actionType === 'add_stock' ? 'Incoming' : 'Withdrawal' }} Quantity 
                <span v-if="selectedMaterial" class="text-indigo-400">({{ selectedMaterial.unit }})</span>
              </label>
              
              <div class="flex-1 flex flex-col items-center justify-center">
                <VirtualNumpad 
                  label="" 
                  v-model="numpadValue" 
                  :maxLen="6"
                  allowDecimal
                />
              </div>
            </div>
          </div>

        </div>

        <!-- Action Footer -->
        <div class="p-6 bg-slate-900/80 border-t border-white/5 backdrop-blur-md">
          <button 
            v-if="actionType === 'add_material'"
            @click="submitNewMaterial"
            :disabled="!newMat.name || !newMat.unit || !newMat.max_capacity"
            class="btn-action w-full btn-action-primary"
            :class="(!newMat.name || !newMat.unit || !newMat.max_capacity) ? 'opacity-50 cursor-not-allowed' : ''"
          >
            <span class="material-symbols-rounded">add_circle</span>
            CREATE MATERIAL
          </button>
          <button 
            v-else
            @click="submitTransaction"
            :disabled="!isValidTransaction"
            class="btn-action w-full"
            :class="isValidTransaction ? (actionType === 'add_stock' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500') : 'btn-action--disabled'"
          >
            <span class="material-symbols-rounded">{{ actionType === 'add_stock' ? 'inventory' : 'outbox' }}</span>
            {{ actionType === 'add_stock' ? 'LOG SHIPMENT' : 'RECORD WITHDRAWAL' }}
          </button>
        </div>
      </div>
      
      <!-- Toast -->
      <Transition name="toast">
        <div v-if="toast.visible" class="toast-message" :class="toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'">
          {{ toast.message }}
        </div>
      </Transition>
      
    </div>
  </AppLayout>
</template>

<script setup>
// Developer: Mintesnot Abebe | Brand: dev MinteIO
import { ref, computed } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import VirtualNumpad from '@/components/ui/VirtualNumpad.vue'
import { useInventoryStore } from '@/store/inventoryStore'

const inventoryStore = useInventoryStore()

const showActionPanel = ref(false)
const actionType = ref('add_stock') // 'add_stock', 'sub_stock', 'add_material'

// Form states
const selectedMaterialId = ref('')
const numpadValue = ref('') 
const transactionNotes = ref('')
const newMat = ref({ name: '', unit: '', max_capacity: '' })

function openActionPanel(type) {
  actionType.value = type
  showActionPanel.value = true
  numpadValue.value = ''
  transactionNotes.value = ''
  newMat.value = { name: '', unit: '', max_capacity: '' }
}

const selectedMaterial = computed(() => {
  return inventoryStore.materials.find(m => String(m.id) === String(selectedMaterialId.value))
})

// Alert if current stock is <= 15% of max capacity
function isLowStock(mat) {
  if (!mat || !mat.max_capacity) return false
  const threshold = mat.max_capacity * 0.15
  return Number(mat.current_stock) <= threshold
}

const isValidTransaction = computed(() => {
  return selectedMaterialId.value !== '' && numpadValue.value && Number(numpadValue.value) > 0
})

const toast = ref({ visible: false, message: '', type: 'success' })
let toastTimer = null
function showToast(msg, type = 'success') {
  toast.value = { visible: true, message: msg, type }
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value.visible = false }, 3000)
}

function submitTransaction() {
  if (!isValidTransaction.value) return
  
  const qty = Number(numpadValue.value)
  const notes = transactionNotes.value || (actionType.value === 'add_stock' ? 'Stock Received' : 'Manual Withdrawal')

  if (actionType.value === 'add_stock') {
    inventoryStore.receiveStock(selectedMaterialId.value, qty, notes)
    showToast(`Successfully added +${qty} ${selectedMaterial.value.unit} to ${selectedMaterial.value.name}`)
  } else {
    // Check if enough stock
    if (qty > selectedMaterial.value.current_stock) {
        showToast(`Cannot withdraw ${qty}. Only ${selectedMaterial.value.current_stock} remaining!`, 'error')
        return
    }
    inventoryStore.withdrawStock(selectedMaterialId.value, qty, notes)
    showToast(`Successfully withdrew -${qty} ${selectedMaterial.value.unit} from ${selectedMaterial.value.name}`)
  }
  
  // Reset
  numpadValue.value = ''
  transactionNotes.value = ''
  selectedMaterialId.value = ''
  showActionPanel.value = false
}

async function submitNewMaterial() {
   const success = await inventoryStore.addMaterial({
      name: newMat.value.name,
      unit: newMat.value.unit,
      max_capacity: Number(newMat.value.max_capacity),
      current_stock: 0,
      reorder_threshold: 15
   })
   
   if (success) {
      showToast(`Added new material: ${newMat.value.name}`)
      showActionPanel.value = false
   } else {
      showToast('Error adding material', 'error')
   }
}

// Helpers for the table
function getMaterialName(id) {
  const mat = inventoryStore.materials.find(m => String(m.id) === String(id))
  return mat ? mat.name : 'Unknown Material'
}
function getMaterialUnit(id) {
  const mat = inventoryStore.materials.find(m => String(m.id) === String(id))
  return mat ? mat.unit : ''
}
function formatDate(isoStr) {
  if (!isoStr) return '—'
  const date = new Date(isoStr)
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

</script>

<style scoped>
/* ── Main view area ──────────────────────────────────────────────────────── */
.view-area {
  width: 100%;
  height: 100%;
  background: #020617;
}
.view-panel {
  padding: 1.5rem 2rem;
  background: transparent;
}
.panel-header {
  margin-bottom: 0;
}
.panel-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: #f8fafc;
  margin: 0 0 0.5rem 0;
  letter-spacing: -0.02em;
}
.panel-sub {
  color: #94a3b8;
  font-size: 0.95rem;
  margin: 0;
}

/* ── Custom Scrollbar ────────────────────────────────────────────────────── */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(255,255,255,0.1);
  border-radius: 10px;
}

/* ── Cards ───────────────────────────────────────────────────────────────── */
.inventory-card {
  position: relative;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 1.5rem;
  padding: 1.5rem;
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
}
.inventory-card:hover {
  background: rgba(30, 41, 59, 0.9);
  border-color: rgba(255,255,255,0.15);
}
.inventory-card--danger {
  border-color: rgba(225, 29, 72, 0.4);
  background: linear-gradient(145deg, rgba(30, 41, 59, 0.9), rgba(159, 18, 57, 0.15));
}
.inventory-card--normal {
  background: linear-gradient(145deg, rgba(30, 41, 59, 0.7), rgba(2, 6, 23, 0.7));
}

.badge-danger {
  background: #e11d48;
  color: #fff;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

/* ── Form Groups ─────────────────────────────────────────────────────────── */
.form-group label {
  display: block;
}

/* ── Buttons ─────────────────────────────────────────────────────────────── */
.btn-action-primary {
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: #fff;
  box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.4);
}
.btn-action-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 15px 30px -5px rgba(79, 70, 229, 0.5);
}

.btn-action {
  border: none;
  border-radius: 1rem;
  padding: 1.2rem;
  font-size: 1.1rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  color: white;
}
.btn-action--disabled {
  background: #334155;
  color: #64748b;
  cursor: not-allowed;
  box-shadow: none;
}

/* ── Toast ───────────────────────────────────────────────────────────────── */
.toast-message {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  color: #fff;
  padding: 1rem 2rem;
  border-radius: 3rem;
  font-weight: 700;
  font-size: 1rem;
  box-shadow: 0 20px 40px -10px rgba(0,0,0,0.5);
  z-index: 100;
}
.toast-enter-active,
.toast-leave-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px) scale(0.9);
}

/* ── Mobile Responsive ────────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .view-area {
    height: auto;
    min-height: 100%;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-y;
  }
  .view-panel {
    padding: 1rem 1rem 4rem 1rem;
  }
  .panel-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
}
</style>
