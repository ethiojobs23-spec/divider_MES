<template>
  <AppLayout>
    <div class="prod-layout">
      <!-- LEFT: Filter Sidebar -->
      <aside class="prod-sidebar">
        <!-- Operator Selection -->
        <div class="sidebar-section">
          <p class="section-title">Select Operator</p>
          <select v-model="selectedOperatorId" class="operator-select">
            <option v-for="op in clockedInList" :key="op.id" :value="op.id">{{ op.name }}</option>
            <option v-if="clockedInList.length === 0" value="" disabled>No one is clocked in</option>
          </select>
        </div>

        <div class="sidebar-section">
          <p class="section-title">Divider Type</p>
          <div class="toggle-group">
            <button
              v-for="t in dividerTypes"
              :key="t"
              class="toggle-btn"
              :class="{ 'toggle-btn--active': selections.dividerType === t }"
              @click="selections.dividerType = t"
            >{{ t }}</button>
          </div>
        </div>

        <div class="sidebar-section">
          <p class="section-title">Placement Style</p>
          <div class="toggle-group toggle-group--col">
            <button
              v-for="p in placements"
              :key="p"
              class="toggle-btn"
              :class="{ 'toggle-btn--active': selections.placement === p }"
              @click="selections.placement = p"
            >{{ p }}</button>
          </div>
        </div>

        <div class="sidebar-section">
          <p class="section-title">Size</p>
          <div class="toggle-group">
            <button
              v-for="s in sizes"
              :key="s"
              class="toggle-btn"
              :class="{ 'toggle-btn--active': selections.size === s }"
              @click="selections.size = s"
            >{{ s }}</button>
          </div>
        </div>

        <!-- Summary Card -->
        <div class="summary-card">
          <p class="summary-row"><span>Type</span><strong>{{ selections.dividerType || '—' }}</strong></p>
          <p class="summary-row"><span>Place</span><strong>{{ selections.placement || '—' }}</strong></p>
          <p class="summary-row"><span>Size</span><strong>{{ selections.size || '—' }}</strong></p>
          <p class="summary-row"><span>Operator</span><strong :class="{'text-red-400': !selectedOperatorId}">{{ selectedOperatorName || '—' }}</strong></p>
          <p class="summary-row"><span>Rate</span><strong class="rate-val">ETB {{ (store.pieceRates?.[selections.dividerType]?.[selections.size]?.[selections.placement] ?? 0).toFixed(2) }}/pc</strong></p>
          <div class="summary-divider" />
          <p class="summary-row"><span>Today's entries</span><strong class="count-val">{{ todayEntries.length }}</strong></p>
          <p class="summary-row"><span>Earnings preview</span><strong class="earn-val">ETB {{ earningsPreview }}</strong></p>
        </div>
      </aside>

      <!-- RIGHT: Main Numpad Area -->
      <main class="prod-main">
        <!-- Tab switcher -->
        <div class="field-tabs">
          <button
            class="field-tab"
            :class="{ 'field-tab--active': activeField === 'good' }"
            @click="activeField = 'good'"
          >
            <span class="material-symbols-rounded">check_circle</span>
            Good Production
          </button>
          <button
            class="field-tab field-tab--waste"
            :class="{ 'field-tab--active': activeField === 'waste' }"
            @click="activeField = 'waste'"
          >
            <span class="material-symbols-rounded">delete</span>
            Waste Material
          </button>
        </div>

        <!-- Values Summary -->
        <div class="values-row">
          <div class="value-chip value-chip--good">
            <span>Good</span>
            <strong>{{ values.good || '0' }}</strong>
          </div>
          <div class="value-chip value-chip--waste">
            <span>Waste</span>
            <strong>{{ values.waste || '0' }}</strong>
          </div>
        </div>

        <!-- Numpad -->
        <div class="numpad-container">
          <VirtualNumpad
            :label="activeField === 'good' ? 'Good Production (pcs)' : 'Waste Material (pcs)'"
            v-model="values[activeField]"
          />
        </div>

        <!-- Save Button -->
        <button
          class="save-btn"
          :class="{ 'save-btn--error': toast.isError }"
          :disabled="!canSave || isSaving"
          @click="saveEntry"
        >
          <span class="material-symbols-rounded">{{ isSaving ? 'hourglass_top' : 'save' }}</span>
          {{ isSaving ? 'SAVING…' : 'SAVE TO LEDGER' }}
          <span v-if="values.good && !isSaving" class="earn-badge">ETB {{ earningsPreview }}</span>
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
  </AppLayout>
</template>

<script setup>
import { ref, reactive, computed, watchEffect } from 'vue'
import AppLayout  from '@/components/layout/AppLayout.vue'
import VirtualNumpad from '@/components/ui/VirtualNumpad.vue'
import { useMesStore } from '@/store/mesStore.js'

const store = useMesStore()

const clockedInList = computed(() => {
  return store.operators.filter(op => store.isOperatorClockedIn(op.id))
})

const selectedOperatorId = ref(null)
const selectedOperatorName = computed(() => {
  const op = clockedInList.value.find(o => o.id === selectedOperatorId.value)
  return op ? op.name : null
})

watchEffect(() => {
  if (!selectedOperatorId.value && clockedInList.value.length > 0) {
    selectedOperatorId.value = clockedInList.value[0].id
  } else if (selectedOperatorId.value && !clockedInList.value.find(o => o.id === selectedOperatorId.value)) {
    selectedOperatorId.value = clockedInList.value.length ? clockedInList.value[0].id : null
  }
})

const dividerTypes = ['50', '40', '30', '16', '12', '45']
const placements   = ['ብተና', 'ውስጥ', 'የተለየ']
const sizes        = ['9cm', '7cm']

const selections = reactive({ dividerType: '50', placement: 'ብተና', size: '9cm' })
const values     = reactive({ good: '', waste: '' })
const activeField = ref('good')
const isSaving   = ref(false)

const canSave = computed(() =>
  (values.good !== '' || values.waste !== '') && selectedOperatorId.value !== null
)

// Today's entries from the store ledger
const todayEntries = computed(() => {
  const today = new Date().toDateString()
  return store.ledgerEntries
    .filter(e => new Date(e.timestamp).toDateString() === today)
    .slice(-5)
    .reverse()
})

// Piece-rate earnings preview
const earningsPreview = computed(() => {
  const rate = store.pieceRates?.[selections.dividerType]?.[selections.size]?.[selections.placement] ?? 0
  const qty = Number(values.good) || 0
  return (rate * qty).toFixed(2)
})

const toast = reactive({ visible: false, message: '', isError: false })
let toastTimer = null

function showToast(msg, isError = false) {
  toast.message  = msg
  toast.visible  = true
  toast.isError  = isError
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.visible = false }, 2500)
}

async function saveEntry() {
  if (!canSave.value || isSaving.value) return
  isSaving.value = true
  const ok = await store.submitProductionLog({
    operator_id:    selectedOperatorId.value,
    dividerType:    selections.dividerType,
    placement:      selections.placement,
    size:           selections.size,
    goodProduction: Number(values.good)  || 0,
    wasteMaterial:  Number(values.waste) || 0,
  })
  isSaving.value = false
  if (ok) {
    values.good  = ''
    values.waste = ''
    showToast(`✓ Saved — ETB ${earningsPreview.value} earned`)
  } else {
    showToast('⚠ Save failed. Check your connection.', true)
  }
}
</script>


<style scoped>
.prod-layout {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #0f172a;
}

/* Sidebar */
.prod-sidebar {
  width: 25%;
  min-width: 260px;
  background: #1e293b;
  border-right: 1px solid rgba(99,102,241,.2);
  display: flex;
  flex-direction: column;
  padding: 1.25rem 1rem;
  gap: 1.25rem;
  overflow-y: auto;
}

.sidebar-section { display: flex; flex-direction: column; gap: .5rem; }
.section-title {
  font-size: .65rem; font-weight: 700; color: #64748b;
  text-transform: uppercase; letter-spacing: .1em;
  padding-bottom: .3rem; border-bottom: 1px solid rgba(255,255,255,.06);
}

.operator-select {
  background: #0f172a;
  color: #f8fafc;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  font-weight: 700;
  width: 100%;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
  background-repeat: no-repeat;
  background-position: right 1rem top 50%;
  background-size: 0.65rem auto;
}
.operator-select:focus { border-color: #6366f1; outline: none; }

.toggle-group { display: flex; flex-wrap: wrap; gap: .4rem; }
.toggle-group--col { flex-direction: column; }

.toggle-btn {
  flex: 1 1 calc(33% - .4rem);
  min-height: 3rem;
  background: #0f172a;
  border: 1px solid rgba(255,255,255,.1);
  color: #94a3b8;
  border-radius: .5rem;
  font-size: .95rem;
  font-weight: 700;
  cursor: pointer;
  transition: all .13s ease;
  -webkit-tap-highlight-color: transparent;
}
.toggle-btn:hover       { background: #1e293b; color: #e2e8f0; }
.toggle-btn:active      { transform: scale(.96); }
.toggle-btn--active {
  background: rgba(99,102,241,.25);
  border-color: #6366f1;
  color: #a5b4fc;
}

.summary-card {
  margin-top: auto;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.07);
  border-radius: .75rem;
  padding: .85rem;
  display: flex;
  flex-direction: column;
  gap: .4rem;
}
.summary-row {
  display: flex;
  justify-content: space-between;
  font-size: .75rem;
  color: #64748b;
}
.summary-row strong { color: #e2e8f0; }
.rate-val   { color: #a5b4fc !important; }
.earn-val   { color: #34d399 !important; font-size: .9rem; }
.count-val  { color: #fbbf24 !important; }
.summary-divider { height: 1px; background: rgba(255,255,255,.07); margin: .2rem 0; }
.earn-badge {
  background: rgba(16,185,129,.2);
  color: #34d399;
  font-size: .8rem;
  font-weight: 900;
  padding: .15rem .55rem;
  border-radius: 999px;
  margin-left: .25rem;
}

/* Main */
.prod-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1.5rem 2rem;
  gap: 1rem;
  position: relative;
  overflow: hidden;
}

.field-tabs {
  display: flex;
  gap: .5rem;
}
.field-tab {
  flex: 1;
  height: 3.25rem;
  background: #1e293b;
  border: 1px solid rgba(255,255,255,.08);
  color: #64748b;
  border-radius: .65rem;
  font-size: .95rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: .5rem;
  transition: all .13s ease;
}
.field-tab--active        { background: rgba(99,102,241,.2); border-color: #6366f1; color: #a5b4fc; }
.field-tab--waste.field-tab--active { background: rgba(239,68,68,.15); border-color: #ef4444; color: #fca5a5; }

.values-row { display: flex; gap: 1rem; }
.value-chip {
  flex: 1;
  background: #1e293b;
  border-radius: .65rem;
  padding: .5rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid rgba(255,255,255,.07);
}
.value-chip span   { font-size: .7rem; color: #64748b; text-transform: uppercase; letter-spacing: .06em; }
.value-chip strong { font-size: 1.5rem; font-weight: 800; font-variant-numeric: tabular-nums; }
.value-chip--good  strong { color: #34d399; }
.value-chip--waste strong { color: #f87171; }

.numpad-container { flex: 1; display: flex; align-items: flex-start; }

.save-btn {
  height: 5rem;
  background: linear-gradient(135deg,#6366f1,#8b5cf6);
  border: none;
  border-radius: .85rem;
  color: #fff;
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: .1em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: .6rem;
  cursor: pointer;
  transition: all .15s ease;
}
.save-btn:disabled { opacity: .35; cursor: not-allowed; }
.save-btn:not(:disabled):hover  { filter: brightness(1.1); }
.save-btn:not(:disabled):active { transform: scale(.98); }
.save-btn--error { background: linear-gradient(135deg,#dc2626,#ef4444) !important; }

.toast {
  position: absolute;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(16,185,129,.9);
  color: #fff;
  border-radius: .65rem;
  padding: .75rem 1.5rem;
  font-size: .9rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: .4rem;
  backdrop-filter: blur(8px);
}
.toast-enter-active, .toast-leave-active { transition: all .25s ease; }
.toast-enter-from, .toast-leave-to       { opacity: 0; transform: translate(-50%, 1rem); }
</style>
