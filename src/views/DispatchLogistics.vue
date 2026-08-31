<template>
  <AppLayout>
    <main class="dispatch-main">
      <!-- Recent dispatches header -->
      <div class="main-header flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 class="main-title flex items-center gap-2">
            <span class="material-symbols-rounded" style="font-size:1.4rem;color:#fbbf24">local_shipping</span>
            Dispatch Logistics
          </h1>
          <p class="main-sub">{{ store.currentProductionWeek }} &bull; {{ store.dispatchLogs.length }} shipments recorded ({{ store.totalDispatched }} pcs total)</p>
        </div>

        <div class="flex items-center gap-3">
          <!-- Last dispatch chip -->
          <div v-if="lastDispatch" class="last-dispatch hidden sm:flex">
            <span class="material-symbols-rounded" style="font-size:.9rem;color:#64748b">history</span>
            Last: {{ lastDispatch.quantity }} pcs → {{ lastDispatch.client }}
          </div>

          <button class="sync-btn cursor-pointer" :disabled="isSyncing" @click="manualSync" title="Sync dispatch logs now">
            <span class="material-symbols-rounded" :class="{ 'spin-icon': isSyncing }">sync</span>
            <span>{{ isSyncing ? 'Syncing...' : 'Sync Now' }}</span>
          </button>
        </div>
      </div>

      <!-- Input Area -->
      <div class="input-area">
        <!-- Setup / Selectors -->
        <div class="setup-col">
          <p class="log-title">
            <span class="material-symbols-rounded" style="font-size:1rem">inventory_2</span>
            1. Select Divider Type
          </p>
          <div class="type-grid">
            <button
              v-for="t in dividerTypes"
              :key="t"
              class="type-btn"
              :class="{ 'type-btn--active': selections.dividerType === t }"
              @click="selections.dividerType = t"
            >
              {{ t === 'Other' ? (store.systemConfig.otherDividerType?.label || 'Other') : `Type ${t}` }}
            </button>
          </div>

          <p class="log-title" style="margin-top: 1.25rem">
            <span class="material-symbols-rounded" style="font-size:1rem">store</span>
            2. Select Customer
          </p>
          <div class="client-list">
            <button
              v-for="c in store.clients"
              :key="c.id"
              class="client-btn"
              :class="{ 'client-btn--active': selections.client === (c.name || c.company_name) }"
              @click="selections.client = (c.name || c.company_name)"
            >
              <span class="material-symbols-rounded client-icon">store</span>
              <span class="truncate">{{ c.name || c.company_name }}</span>
            </button>
            <div v-if="!store.clients.length" class="empty-hint">No customers found. Add customers in Customers Manager.</div>
          </div>

          <!-- Transport Info (Optional) -->
          <div class="mt-4 pt-4 border-t border-white/5 flex flex-col gap-2">
            <p class="log-title mb-1">
              <span class="material-symbols-rounded" style="font-size:1rem">commute</span>
              3. Transport Details (Optional)
            </p>
            <div class="grid grid-cols-2 gap-2">
              <input
                v-model="driverName"
                type="text"
                placeholder="Driver Name"
                class="bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-400"
              />
              <input
                v-model="vehiclePlate"
                type="text"
                placeholder="Plate No. (e.g. 3-A12345)"
                class="bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-400"
              />
            </div>
            <input
              v-model="dispatchNotes"
              type="text"
              placeholder="Delivery note / Waybill ref"
              class="bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-400"
            />
          </div>
        </div>

        <!-- Numpad -->
        <div class="numpad-col">
          <div v-if="selections.dividerType" class="stock-info" :class="{'stock-low': availableStock < Number(batchQty || 0)}">
            <span class="material-symbols-rounded">inventory</span>
            Available Stock: {{ availableStock.toLocaleString() }} pcs
          </div>
          <VirtualNumpad
            label="Batch Quantity (pcs)"
            v-model="batchQty"
            :maxLen="6"
          />
          <p v-if="selections.dividerType && Number(batchQty) > availableStock" class="error-msg">
            <span class="material-symbols-rounded">error</span>
            Cannot dispatch more than available stock!
          </p>
        </div>

        <!-- Right panel: recent log -->
        <div class="log-panel">
          <p class="log-title">
            <span class="material-symbols-rounded" style="font-size:1rem">receipt_long</span>
            Recent Dispatch Log
          </p>
          <div class="log-list">
            <div
              v-for="d in recentDispatches"
              :key="d.id"
              class="log-item"
            >
              <div class="log-type-chip">{{ d.dividerType }}</div>
              <div class="log-body">
                <p class="log-dest">{{ d.client }}</p>
                <p class="log-by">{{ d.dispatchedBy || 'Logistics' }} &bull; {{ fmtTime(d.timestamp) }}</p>
                <p v-if="d.notes" class="text-[0.65rem] text-slate-400 italic mt-0.5">{{ d.notes }}</p>
              </div>
              <div class="log-qty">{{ (Number(d.quantity) || 0).toLocaleString() }} pcs</div>
            </div>
            <div v-if="!recentDispatches.length" class="log-empty">
              <span class="material-symbols-rounded" style="font-size:2rem;color:#334155">inbox</span>
              <p>No dispatches recorded yet</p>
            </div>
          </div>
        </div>
      </div>

      <!-- CONFIRM DISPATCH Button -->
      <button
        class="dispatch-btn cursor-pointer"
        :disabled="!canDispatch"
        @click="confirmDispatch"
      >
        <span class="material-symbols-rounded">local_shipping</span>
        CONFIRM DISPATCH
        <span v-if="batchQty" class="dispatch-qty-badge">{{ Number(batchQty).toLocaleString() }} PCS</span>
      </button>

      <!-- Toast -->
      <Transition name="toast">
        <div v-if="toast.visible" class="toast">
          <span class="material-symbols-rounded">check_circle</span>
          {{ toast.message }}
        </div>
      </Transition>
    </main>
  </AppLayout>
</template>

<script setup>
// Developer: Mintesnot Abebe | Brand: dev MinteIO
import AppLayout from '@/components/layout/AppLayout.vue'
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import VirtualNumpad from '@/components/ui/VirtualNumpad.vue'
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

const dividerTypes = computed(() => {
  return store.systemConfig?.otherDividerType?.enabled 
    ? ['50', '40', '30', '16', '12', '45', 'Other']
    : ['50', '40', '30', '16', '12', '45']
})

const selections = reactive({
  dividerType: '',
  client: '',
})

const driverName = ref('')
const vehiclePlate = ref('')
const dispatchNotes = ref('')
const batchQty = ref('')

const availableStock = computed(() => {
  if (!selections.dividerType) return 0
  const item = store.inventory.find(i => i.divider_type === selections.dividerType)
  return item ? (item.available || 0) : 0
})

const canDispatch = computed(() =>
  selections.dividerType !== '' &&
  selections.client !== '' &&
  Number(batchQty.value) > 0 &&
  Number(batchQty.value) <= availableStock.value
)

const toast = reactive({ visible: false, message: '' })
let toastTimer = null

function showToast(msg) {
  toast.message = msg
  toast.visible = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.visible = false }, 3000)
}

function confirmDispatch() {
  if (!canDispatch.value) return
  
  const transportMeta = [
    driverName.value ? `Driver: ${driverName.value}` : '',
    vehiclePlate.value ? `Plate: ${vehiclePlate.value}` : '',
    dispatchNotes.value ? dispatchNotes.value : ''
  ].filter(Boolean).join(' | ')

  store.addDispatch({
    dividerType: selections.dividerType,
    client:      selections.client,
    quantity:    Number(batchQty.value),
    notes:       transportMeta
  })
  
  showToast(`✓ ${batchQty.value} pcs of Type ${selections.dividerType} dispatched to ${selections.client}`)
  batchQty.value = ''
  driverName.value = ''
  vehiclePlate.value = ''
  dispatchNotes.value = ''
}

const recentDispatches = computed(() => [...store.dispatchLogs].reverse().slice(0, 10))
const lastDispatch      = computed(() => store.dispatchLogs[store.dispatchLogs.length - 1] ?? null)

function fmtTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return !isNaN(d.getTime()) ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'
}
</script>

<style scoped>
.dispatch-main {
  width: 100%; height: 100%; overflow-y: auto;
  padding: 1.25rem 1.5rem; background: #0f172a;
  display: flex; flex-direction: column; gap: 1rem;
}

.main-header {
  display: flex; justify-content: space-between; align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 0.75rem;
}
.main-title {
  font-size: 1.35rem; font-weight: 900; color: #f1f5f9; margin: 0;
}
.main-sub { font-size: 0.75rem; color: #64748b; margin: 0.2rem 0 0; }

.sync-btn {
  display: flex; align-items: center; gap: 0.35rem;
  background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.3);
  color: #a5b4fc; border-radius: 0.5rem; padding: 0.45rem 0.85rem;
  font-size: 0.75rem; font-weight: 700; transition: all 0.15s ease;
}
.sync-btn:hover { background: rgba(99,102,241,0.22); color: #fff; }
.spin-icon { animation: spin 0.8s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.last-dispatch {
  display: flex; align-items: center; gap: 0.35rem;
  font-size: 0.75rem; color: #94a3b8; background: #1e293b;
  border: 1px solid rgba(255,255,255,0.06); padding: 0.4rem 0.8rem; border-radius: 999px;
}

.input-area {
  display: grid; grid-template-columns: 1fr 1.1fr 1fr; gap: 1.25rem; flex: 1; min-height: 0;
}

.setup-col, .numpad-col, .log-panel {
  background: #1e293b; border: 1px solid rgba(255,255,255,0.06);
  border-radius: 1rem; padding: 1.1rem; display: flex; flex-direction: column;
}

.log-title {
  display: flex; align-items: center; gap: 0.4rem;
  font-size: 0.75rem; font-weight: 800; color: #a5b4fc; text-transform: uppercase;
  letter-spacing: 0.05em; margin: 0 0 0.6rem;
}

.type-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.4rem; }
.type-btn {
  padding: 0.6rem 0.4rem; background: #0f172a;
  border: 1px solid rgba(255,255,255,0.08); color: #94a3b8;
  border-radius: 0.5rem; font-size: 0.8rem; font-weight: 800;
  cursor: pointer; transition: all 0.15s;
}
.type-btn:hover { background: rgba(251,191,36,0.08); color: #f1f5f9; }
.type-btn--active { background: rgba(251,191,36,0.15); border-color: #f59e0b; color: #fbbf24; }

.client-list { display: flex; flex-direction: column; gap: 0.35rem; max-height: 180px; overflow-y: auto; }
.client-btn {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.55rem 0.75rem; background: #0f172a;
  border: 1px solid rgba(255,255,255,0.06); color: #94a3b8;
  border-radius: 0.5rem; font-size: 0.78rem; font-weight: 700;
  cursor: pointer; transition: all 0.15s; text-align: left;
}
.client-btn:hover { background: rgba(251,191,36,0.08); color: #f1f5f9; }
.client-btn--active { background: rgba(251,191,36,0.15); border-color: #f59e0b; color: #fcd34d; }
.client-icon { font-size: 0.9rem !important; }
.empty-hint { font-size: 0.75rem; color: #475569; padding: 0.75rem; text-align: center; border: 1px dashed rgba(255,255,255,0.1); border-radius: 0.5rem; }

.stock-info {
  display: flex; align-items: center; justify-content: center; gap: 0.4rem;
  background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.25);
  color: #34d399; font-size: 0.8rem; font-weight: 800;
  padding: 0.45rem; border-radius: 0.5rem; margin-bottom: 0.75rem;
}
.stock-low {
  background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); color: #f87171;
}

.error-msg {
  display: flex; align-items: center; justify-content: center; gap: 0.35rem;
  color: #f87171; font-size: 0.72rem; font-weight: 700; margin-top: 0.4rem;
}

.log-list { display: flex; flex-direction: column; gap: 0.45rem; overflow-y: auto; flex: 1; }
.log-item {
  display: flex; align-items: center; gap: 0.6rem;
  background: #0f172a; border: 1px solid rgba(255,255,255,0.05);
  border-radius: 0.6rem; padding: 0.6rem 0.75rem;
}
.log-type-chip {
  background: rgba(251,191,36,0.12); color: #fbbf24;
  font-size: 0.7rem; font-weight: 900; padding: 0.25rem 0.45rem; border-radius: 0.35rem;
}
.log-body { flex: 1; min-width: 0; }
.log-dest { font-size: 0.8rem; font-weight: 700; color: #f1f5f9; margin: 0; }
.log-by   { font-size: 0.65rem; color: #64748b; margin: 0; }
.log-qty  { font-size: 0.85rem; font-weight: 900; font-family: monospace; color: #34d399; }
.log-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 0.4rem; padding: 2rem; color: #475569; font-size: 0.78rem;
}

.dispatch-btn {
  width: 100%; height: 3.5rem; background: linear-gradient(135deg, #f59e0b, #d97706);
  border: none; border-radius: 0.85rem; color: #000;
  font-size: 1rem; font-weight: 900; letter-spacing: 0.05em;
  display: flex; align-items: center; justify-content: center; gap: 0.5rem;
  transition: all 0.15s; box-shadow: 0 4px 15px rgba(245,158,11,0.25);
}
.dispatch-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
.dispatch-btn:disabled { background: #334155; color: #64748b; cursor: not-allowed; box-shadow: none; transform: none; }
.dispatch-qty-badge {
  background: rgba(0,0,0,0.2); padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.85rem;
}

.toast {
  position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%);
  background: rgba(16,185,129,0.95); color: #fff;
  padding: 0.75rem 1.5rem; border-radius: 0.75rem; font-weight: 700; font-size: 0.85rem;
  display: flex; align-items: center; gap: 0.4rem; box-shadow: 0 10px 25px rgba(0,0,0,0.5); z-index: 100;
}
.toast-enter-active, .toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 1rem); }

@media (max-width: 1024px) {
  .input-area { grid-template-columns: 1fr; }
}
</style>
