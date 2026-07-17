<template>
  <div class="dispatch-layout">
    <!-- ─── LEFT: Dispatch Config Sidebar ──────────────────────────── -->
    <aside class="dispatch-sidebar">
      <!-- Divider Type -->
      <div class="sidebar-section">
        <p class="section-title">
          <span class="material-symbols-rounded section-icon">category</span>
          Divider Type
        </p>
        <div class="type-grid">
          <button
            v-for="t in dividerTypes"
            :key="t"
            class="type-btn"
            :class="{ 'type-btn--active': selections.dividerType === t }"
            @click="selections.dividerType = t"
          >{{ t }}</button>
        </div>
      </div>

      <!-- Destination / Client -->
      <div class="sidebar-section">
        <p class="section-title">
          <span class="material-symbols-rounded section-icon">location_on</span>
          Destination
        </p>
        <div class="client-list">
          <button
            v-for="client in store.clients"
            :key="client"
            class="client-btn"
            :class="{ 'client-btn--active': selections.client === client }"
            @click="selections.client = client"
          >
            <span class="material-symbols-rounded client-icon">warehouse</span>
            {{ client }}
          </button>
        </div>
      </div>

      <!-- Selection Summary -->
      <div class="summary-card">
        <div class="sum-row">
          <span class="sum-label">Type</span>
          <span class="sum-val">{{ selections.dividerType || '—' }}</span>
        </div>
        <div class="sum-row">
          <span class="sum-label">To</span>
          <span class="sum-val sum-val--dest">{{ selections.client || '—' }}</span>
        </div>
        <div class="sum-row">
          <span class="sum-label">Qty</span>
          <span class="sum-val sum-val--qty">{{ batchQty || '0' }} pcs</span>
        </div>
      </div>

      <!-- Total Dispatched Counter -->
      <div class="total-counter">
        <span class="material-symbols-rounded" style="color:#6366f1">local_shipping</span>
        <div>
          <p class="counter-val">{{ store.totalDispatched.toLocaleString() }}</p>
          <p class="counter-lbl">Total Dispatched This Week</p>
        </div>
      </div>
    </aside>

    <!-- ─── RIGHT: Numpad + Dispatch Log ──────────────────────────── -->
    <main class="dispatch-main">
      <!-- Recent dispatches header -->
      <div class="main-header">
        <div>
          <h1 class="main-title">
            <span class="material-symbols-rounded" style="font-size:1.4rem;color:#fbbf24">local_shipping</span>
            Dispatch Logistics
          </h1>
          <p class="main-sub">{{ store.currentProductionWeek }} &bull; {{ store.dispatchLogs.length }} shipments recorded</p>
        </div>
        <!-- Last dispatch chip -->
        <div v-if="store.dispatchLogs.length" class="last-dispatch">
          <span class="material-symbols-rounded" style="font-size:.9rem;color:#64748b">history</span>
          Last: {{ lastDispatch.quantity }} pcs → {{ lastDispatch.client }}
        </div>
      </div>

      <!-- Input Area -->
      <div class="input-area">
        <!-- Numpad -->
        <div class="numpad-col">
          <VirtualNumpad
            label="Batch Quantity (pcs)"
            v-model="batchQty"
          />
        </div>

        <!-- Right panel: recent log -->
        <div class="log-panel">
          <p class="log-title">
            <span class="material-symbols-rounded" style="font-size:1rem">receipt_long</span>
            Dispatch Log
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
                <p class="log-by">{{ d.dispatchedBy }} &bull; {{ fmtTime(d.timestamp) }}</p>
              </div>
              <div class="log-qty">{{ d.quantity }} pcs</div>
            </div>
            <div v-if="!recentDispatches.length" class="log-empty">
              <span class="material-symbols-rounded" style="font-size:2rem;color:#334155">inbox</span>
              <p>No dispatches yet</p>
            </div>
          </div>
        </div>
      </div>

      <!-- CONFIRM DISPATCH Button -->
      <button
        class="dispatch-btn"
        :disabled="!canDispatch"
        @click="confirmDispatch"
      >
        <span class="material-symbols-rounded">local_shipping</span>
        CONFIRM DISPATCH
        <span v-if="batchQty" class="dispatch-qty-badge">{{ batchQty }} PCS</span>
      </button>

      <!-- Toast -->
      <Transition name="toast">
        <div v-if="toast.visible" class="toast">
          <span class="material-symbols-rounded">check_circle</span>
          {{ toast.message }}
        </div>
      </Transition>
    </main>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import VirtualNumpad from '@/components/ui/VirtualNumpad.vue'
import { useMesStore } from '@/store/mesStore.js'

const store = useMesStore()

const dividerTypes = ['50', '40', '30', '16', '12', '45']

const selections = reactive({
  dividerType: '',
  client: '',
})

const batchQty = ref('')

const canDispatch = computed(() =>
  selections.dividerType !== '' &&
  selections.client !== '' &&
  Number(batchQty.value) > 0
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
  store.addDispatch({
    dividerType: selections.dividerType,
    client:      selections.client,
    quantity:    Number(batchQty.value),
  })
  showToast(`✓ ${batchQty.value} pcs of Type ${selections.dividerType} dispatched to ${selections.client}`)
  batchQty.value = ''
}

const recentDispatches = computed(() => [...store.dispatchLogs].reverse().slice(0, 8))
const lastDispatch      = computed(() => store.dispatchLogs[store.dispatchLogs.length - 1] ?? null)

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.dispatch-layout {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #0f172a;
}

/* ── Sidebar ───────────────────────────────────────────────────────────── */
.dispatch-sidebar {
  width: 25%;
  min-width: 260px;
  background: #1e293b;
  border-right: 1px solid rgba(251,191,36,.2);
  display: flex;
  flex-direction: column;
  padding: 1.25rem 1rem;
  gap: 1rem;
  overflow-y: auto;
  overflow-x: hidden;
}

.sidebar-section { display: flex; flex-direction: column; gap: .5rem; }
.section-title {
  display: flex; align-items: center; gap: .4rem;
  font-size: .65rem; font-weight: 700; color: #64748b;
  text-transform: uppercase; letter-spacing: .1em;
  padding-bottom: .3rem; border-bottom: 1px solid rgba(255,255,255,.06);
}
.section-icon { font-size: .9rem !important; color: #6366f1; }

.type-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: .4rem; }
.type-btn {
  min-height: 3.25rem;
  background: #0f172a;
  border: 1px solid rgba(255,255,255,.09);
  color: #94a3b8;
  border-radius: .55rem;
  font-size: 1rem; font-weight: 800;
  cursor: pointer;
  transition: all .13s ease;
  -webkit-tap-highlight-color: transparent;
}
.type-btn:hover      { background: #1a2636; color: #e2e8f0; }
.type-btn:active     { transform: scale(.95); }
.type-btn--active    { background: rgba(251,191,36,.15); border-color: #f59e0b; color: #fbbf24; }

.client-list { display: flex; flex-direction: column; gap: .4rem; }
.client-btn {
  display: flex; align-items: center; gap: .6rem;
  padding: .75rem .85rem;
  background: #0f172a;
  border: 1px solid rgba(255,255,255,.08);
  color: #94a3b8;
  border-radius: .6rem;
  font-size: .85rem; font-weight: 600;
  cursor: pointer;
  transition: all .13s ease;
  text-align: left;
}
.client-btn:hover       { background: #1a2636; color: #e2e8f0; }
.client-btn:active      { transform: scale(.98); }
.client-btn--active     { background: rgba(251,191,36,.12); border-color: #f59e0b; color: #fcd34d; }
.client-icon            { font-size: 1rem !important; }

.summary-card {
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.07);
  border-radius: .75rem;
  padding: .85rem;
  display: flex; flex-direction: column; gap: .4rem;
}
.sum-row       { display: flex; justify-content: space-between; align-items: center; }
.sum-label     { font-size: .7rem; color: #64748b; }
.sum-val       { font-size: .9rem; font-weight: 700; color: #e2e8f0; }
.sum-val--dest { color: #a5b4fc; }
.sum-val--qty  { color: #fbbf24; font-size: 1.1rem; }

.total-counter {
  display: flex; align-items: center; gap: .75rem;
  background: rgba(99,102,241,.08);
  border: 1px solid rgba(99,102,241,.2);
  border-radius: .75rem;
  padding: .8rem;
}
.counter-val { font-size: 1.5rem; font-weight: 900; color: #f1f5f9; font-variant-numeric: tabular-nums; }
.counter-lbl { font-size: .62rem; color: #64748b; letter-spacing: .05em; }

/* ── Main ──────────────────────────────────────────────────────────────── */
.dispatch-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1.25rem 1.75rem;
  gap: 1rem;
  position: relative;
  overflow: hidden;
}

.main-header { display: flex; align-items: center; justify-content: space-between; }
.main-title  { display: flex; align-items: center; gap: .5rem; font-size: 1.1rem; font-weight: 800; color: #f1f5f9; }
.main-sub    { font-size: .72rem; color: #64748b; margin-top: .15rem; margin-left: 1.9rem; }
.last-dispatch {
  display: flex; align-items: center; gap: .35rem;
  font-size: .75rem; color: #64748b;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.07);
  border-radius: .5rem;
  padding: .4rem .75rem;
}

.input-area {
  display: flex;
  gap: 1.25rem;
  flex: 1;
  min-height: 0;
}

.numpad-col { flex: 1.1; display: flex; flex-direction: column; }

/* Log Panel */
.log-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: .65rem;
  overflow: hidden;
}
.log-title {
  display: flex; align-items: center; gap: .35rem;
  font-size: .7rem; font-weight: 700; color: #64748b;
  text-transform: uppercase; letter-spacing: .08em;
}
.log-list { display: flex; flex-direction: column; gap: .4rem; overflow-y: auto; flex: 1; }
.log-item {
  display: flex; align-items: center; gap: .7rem;
  background: #1e293b;
  border: 1px solid rgba(255,255,255,.07);
  border-radius: .6rem;
  padding: .6rem .85rem;
}
.log-type-chip {
  width: 2.2rem; height: 2.2rem;
  background: rgba(251,191,36,.15);
  border: 1px solid rgba(251,191,36,.3);
  color: #fbbf24;
  border-radius: .4rem;
  display: flex; align-items: center; justify-content: center;
  font-weight: 900; font-size: .9rem;
  flex-shrink: 0;
}
.log-body  { flex: 1; min-width: 0; }
.log-dest  { font-size: .82rem; font-weight: 700; color: #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.log-by    { font-size: .62rem; color: #475569; margin-top: .1rem; }
.log-qty   { font-size: .95rem; font-weight: 800; color: #34d399; flex-shrink: 0; }
.log-empty { display: flex; flex-direction: column; align-items: center; gap: .5rem; color: #334155; font-size: .8rem; padding: 2rem 0; }

/* Dispatch Button */
.dispatch-btn {
  height: 5.5rem;
  background: linear-gradient(135deg, #d97706, #f59e0b, #fbbf24);
  border: none;
  border-radius: 1rem;
  color: #1c1917;
  font-size: 1.4rem;
  font-weight: 900;
  letter-spacing: .1em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: .75rem;
  cursor: pointer;
  transition: all .15s ease;
  box-shadow: 0 4px 24px rgba(251,191,36,.3);
  flex-shrink: 0;
}
.dispatch-btn:disabled        { opacity: .3; cursor: not-allowed; box-shadow: none; }
.dispatch-btn:not(:disabled):hover  { filter: brightness(1.08); box-shadow: 0 6px 32px rgba(251,191,36,.5); }
.dispatch-btn:not(:disabled):active { transform: scale(.98); }
.dispatch-btn .material-symbols-rounded { font-size: 1.75rem; }

.dispatch-qty-badge {
  background: rgba(0,0,0,.2);
  padding: .2rem .65rem;
  border-radius: 999px;
  font-size: .85rem;
  font-weight: 900;
}

/* Toast */
.toast {
  position: absolute;
  bottom: 1.25rem; left: 50%; transform: translateX(-50%);
  background: rgba(16,185,129,.92);
  color: #fff;
  border-radius: .65rem;
  padding: .75rem 1.5rem;
  font-size: .9rem; font-weight: 700;
  display: flex; align-items: center; gap: .4rem;
  backdrop-filter: blur(8px);
  white-space: nowrap;
  z-index: 10;
}
.toast-enter-active, .toast-leave-active { transition: all .25s ease; }
.toast-enter-from, .toast-leave-to       { opacity: 0; transform: translate(-50%, 1rem); }
</style>
