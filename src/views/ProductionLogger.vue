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

        <!-- Work Category Selection (Only if they have multiple categories) -->
        <div v-if="opCategories.length > 1" class="sidebar-section">
          <p class="section-title">Work Category</p>
          <div class="toggle-group">
            <button
              v-for="cat in opCategories"
              :key="cat"
              class="toggle-btn toggle-btn--sm"
              :class="{ 'toggle-btn--active': activeCategory === cat }"
              @click="activeCategory = cat"
            >
              <span class="material-symbols-rounded" style="font-size:1rem; margin-right:4px;">{{ getCatIcon(cat) }}</span>
              {{ getCatLabel(cat) }}
            </button>
          </div>
        </div>
        <div v-else-if="opCategories.length === 1" class="sidebar-section">
          <div class="single-cat-badge">
            <span class="material-symbols-rounded" style="font-size: 1.1rem">{{ getCatIcon(activeCategory) }}</span>
            Logging: {{ getCatLabel(activeCategory) }}
          </div>
        </div>

        <!-- Inputs specific to the category -->
        <template v-if="activeCategory !== 'TIME'">
          <div class="sidebar-section" v-if="hasTypes">
            <p class="section-title">Divider Type</p>
            <div class="toggle-group">
              <button
                v-for="t in availableTypes"
                :key="t"
                class="toggle-btn"
                :class="{ 'toggle-btn--active': selections.dividerType === t }"
                @click="selections.dividerType = t"
              >{{ t === 'Other' ? (store.systemConfig.otherDividerType?.label || 'Other') : t }}</button>
            </div>
          </div>

          <div class="sidebar-section" v-if="needsPlacement">
            <p class="section-title">Placement Style</p>
            <div class="toggle-group toggle-group--col">
              <button
                v-for="p in availablePlacements"
                :key="p"
                class="toggle-btn"
                :class="{ 'toggle-btn--active': selections.placement === p }"
                @click="selections.placement = p"
              >{{ p === 'Other' ? (store.systemConfig.otherPlacement?.label || 'Other') : p }}</button>
            </div>
          </div>

          <div class="sidebar-section" v-if="hasSizes">
            <p class="section-title">Size</p>
            <div class="toggle-group">
              <button
                v-for="s in availableSizes"
                :key="s"
                class="toggle-btn"
                :class="{ 'toggle-btn--active': selections.size === s }"
                @click="selections.size = s"
              >{{ s }}</button>
            </div>
          </div>
        </template>

        <!-- Summary Card -->
        <div class="summary-card">
          <template v-if="activeCategory === 'TIME'">
            <p class="summary-row"><span>Type</span><strong>Hourly Work</strong></p>
            <p class="summary-row"><span>Rate</span><strong class="rate-val">ETB {{ (opConfig.hourly_rate || 0).toFixed(2) }}/hr</strong></p>
          </template>
          <template v-else>
            <p class="summary-row"><span>Type</span><strong>{{ selections.dividerType || '—' }}</strong></p>
            <p class="summary-row" v-if="needsPlacement"><span>Place</span><strong>{{ selections.placement || '—' }}</strong></p>
            <p class="summary-row"><span>Size</span><strong>{{ selections.size || '—' }}</strong></p>
            <p class="summary-row"><span>Rate</span><strong class="rate-val">ETB {{ currentRate.toFixed(2) }}/pc</strong></p>
          </template>
          
          <p class="summary-row"><span>Operator</span><strong :class="{'text-red-400': !selectedOperatorId}">{{ selectedOperatorName || '—' }}</strong></p>
          
          <div class="summary-divider" />
          <p class="summary-row"><span>Today's entries</span><strong class="count-val">{{ todayEntries.length }}</strong></p>
          <p class="summary-row"><span>Earnings preview</span><strong class="earn-val">ETB {{ earningsPreview }}</strong></p>
        </div>
      </aside>

      <!-- RIGHT: Main Numpad Area -->
      <main class="prod-main">
        <template v-if="activeCategory === 'TIME'">
          <!-- TIME Form (Hourly) -->
          <div class="time-form">
            <h2>Log Hourly Work</h2>
            <p class="time-rate">Your Rate: <strong class="earn-val">ETB {{ (opConfig.hourly_rate || 0).toFixed(2) }} / hour</strong></p>
            
            <div class="numpad-container" style="max-width: 400px; margin: 2rem auto 0; width: 100%;">
              <VirtualNumpad
                label="Hours Worked"
                v-model="values.hours"
              />
            </div>
          </div>
        </template>
        <template v-else>
          <!-- Tab switcher -->
          <div class="field-tabs">
            <button
              class="field-tab"
              :class="{ 'field-tab--active': activeField === 'good' }"
              @click="activeField = 'good'"
            >
              <span class="material-symbols-rounded">check_circle</span>
              {{ activeCategory === 'PP' ? 'Papers Applied' : activeCategory === 'PL' ? 'Plaster Keys' : activeCategory === 'C' ? 'Units Completed' : 'Good Production' }}
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
              :label="activeField === 'good' ? (activeCategory === 'PP' ? 'Papers Applied (pcs)' : activeCategory === 'PL' ? 'Plaster Keys (pcs)' : activeCategory === 'C' ? 'Units Completed (pcs)' : 'Good Production (pcs)') : 'Waste Material (pcs)'"
              v-model="values[activeField]"
            />
          </div>
        </template>

        <!-- Save Button -->
        <button
          class="save-btn"
          :class="{ 'save-btn--error': toast.isError }"
          :disabled="!canSave || isSaving"
          @click="saveEntry"
        >
          <span class="material-symbols-rounded">{{ isSaving ? 'hourglass_top' : 'save' }}</span>
          {{ isSaving ? 'SAVING…' : 'SAVE TO LEDGER' }}
          <span v-if="(values.good || values.hours) && !isSaving" class="earn-badge">ETB {{ earningsPreview }}</span>
        </button>

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
// Developer: Mintesnot Abebe | Brand: dev MinteIO
import { ref, reactive, computed, watch, watchEffect } from 'vue'
import AppLayout  from '@/components/layout/AppLayout.vue'
import VirtualNumpad from '@/components/ui/VirtualNumpad.vue'

import { useMesStore } from '@/store/mesStore.js'

const store = useMesStore()

// ─── Operator Management ───────────────────────────────────────────────────
const clockedInList = computed(() => store.operators.filter(op => store.isOperatorClockedIn(op.id)))

const selectedOperatorId = ref(Number(localStorage.getItem('mes_pl_op')) || null)

watch(selectedOperatorId, (val) => {
  if (val) localStorage.setItem('mes_pl_op', val)
  else localStorage.removeItem('mes_pl_op')
})

const selectedOperatorName = computed(() => {
  const op = clockedInList.value.find(o => o.id === selectedOperatorId.value)
  return op ? op.name : null
})

// Auto-select operator if invalid or null
watchEffect(() => {
  if (!selectedOperatorId.value && clockedInList.value.length > 0) {
    selectedOperatorId.value = clockedInList.value[0].id
  } else if (selectedOperatorId.value && !clockedInList.value.find(o => o.id === selectedOperatorId.value)) {
    selectedOperatorId.value = clockedInList.value.length ? clockedInList.value[0].id : null
  }
})

// ─── Work Categories ────────────────────────────────────────────────────────
const CAT_INFO = {
  MFG:  { label: 'Mfg', icon: 'precision_manufacturing' },
  PP:   { label: 'Paper', icon: 'description' },
  PL:   { label: 'Plaster', icon: 'build' },
  C:    { label: 'Wood', icon: 'forest' },
  TIME: { label: 'Time', icon: 'schedule' }
}
function getCatLabel(id) { return CAT_INFO[id]?.label || id }
function getCatIcon(id) { return CAT_INFO[id]?.icon || 'work' }

const activeCategory = ref(localStorage.getItem('mes_pl_cat') || 'MFG')

watch(activeCategory, (val) => {
  if (val) localStorage.setItem('mes_pl_cat', val)
})

const opConfig = computed(() => {
  if (!selectedOperatorId.value) return { categories: ['MFG'], divider_types: [], placements: [], sizes: [], hourly_rate: null }
  return store.getOperatorWorkConfig(selectedOperatorId.value)
})
const opCategories = computed(() => opConfig.value.categories && opConfig.value.categories.length > 0 ? opConfig.value.categories : ['MFG'])

// Switch category if operator config changes and makes current category invalid
watchEffect(() => {
  const cats = opCategories.value
  if (cats && cats.length > 0 && !cats.includes(activeCategory.value)) {
    activeCategory.value = cats[0]
  }
})

// ─── Form Options (filtered by admin assignment) ───────────────────────────
const standardTypes = computed(() => store.systemConfig.otherDividerType?.enabled ? ['50', '40', '30', '16', '12', '45', 'Other'] : ['50', '40', '30', '16', '12', '45'])
const standardPlacements = computed(() => store.systemConfig.otherPlacement?.enabled ? ['ብተና', 'ውስጥ', 'የተለየ', 'Other'] : ['ብተና', 'ውስጥ', 'የተለየ'])
const standardSizes = ['9cm', '7cm']

const availableTypes = computed(() => opConfig.value.divider_types?.length > 0 ? opConfig.value.divider_types : standardTypes.value)
const availablePlacements = computed(() => opConfig.value.placements?.length > 0 ? opConfig.value.placements : standardPlacements.value)
const availableSizes = computed(() => opConfig.value.sizes?.length > 0 ? opConfig.value.sizes : standardSizes)

// Visibility
const hasTypes = computed(() => activeCategory.value !== 'TIME')
const hasSizes = computed(() => activeCategory.value !== 'TIME')
const needsPlacement = computed(() => activeCategory.value === 'MFG' || activeCategory.value === 'C')

// ─── Input State ────────────────────────────────────────────────────────────
const selections = reactive({ 
  dividerType: localStorage.getItem('mes_pl_type') || '50', 
  placement: localStorage.getItem('mes_pl_place') || 'ብተና', 
  size: localStorage.getItem('mes_pl_size') || '9cm' 
})

const values     = reactive({ good: '', waste: '', hours: '' })
const activeField = ref('good')
const isSaving   = ref(false)

watch(selections, (s) => {
  localStorage.setItem('mes_pl_type', s.dividerType)
  localStorage.setItem('mes_pl_place', s.placement)
  localStorage.setItem('mes_pl_size', s.size)
}, { deep: true })

// Auto-sync selections if lists update
watchEffect(() => {
  if (availableTypes.value.length > 0 && !availableTypes.value.includes(selections.dividerType)) {
    selections.dividerType = availableTypes.value[0]
  }
  if (availablePlacements.value.length > 0 && !availablePlacements.value.includes(selections.placement)) {
    selections.placement = availablePlacements.value[0]
  }
  if (availableSizes.value.length > 0 && !availableSizes.value.includes(selections.size)) {
    selections.size = availableSizes.value[0]
  }
})

const canSave = computed(() => {
  if (!selectedOperatorId.value) return false
  if (activeCategory.value === 'TIME') return Number(values.hours) > 0
  return values.good !== '' || values.waste !== ''
})

// ─── Ledger & Earnings ──────────────────────────────────────────────────────
const todayEntries = computed(() => {
  const today = new Date().toDateString()
  return store.ledgerEntries
    .filter(e => new Date(e.timestamp).toDateString() === today)
    .slice(-5)
    .reverse()
})

const currentRate = computed(() => {
  if (activeCategory.value === 'TIME') return opConfig.value.hourly_rate || 0
  const cat = activeCategory.value
  const type = selections.dividerType
  const size = selections.size
  const pl = selections.placement
  if (cat === 'PP' || cat === 'PL') return store.pieceRates?.[cat]?.[type]?.[size] ?? 0
  return store.pieceRates?.[cat]?.[type]?.[size]?.[pl] ?? 0
})

const earningsPreview = computed(() => {
  if (activeCategory.value === 'TIME') {
    return (currentRate.value * (Number(values.hours) || 0)).toFixed(2)
  }
  return (currentRate.value * (Number(values.good) || 0)).toFixed(2)
})

// ─── Toast ──────────────────────────────────────────────────────────────────
const toast = reactive({ visible: false, message: '', isError: false })
let toastTimer = null

function showToast(msg, isError = false) {
  toast.message  = msg
  toast.visible  = true
  toast.isError  = isError
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.visible = false }, 2500)
}

// ─── Saving ─────────────────────────────────────────────────────────────────
async function saveEntry() {
  if (!canSave.value || isSaving.value) return
  isSaving.value = true
  
  const payload = {
    operator_id:    selectedOperatorId.value,
    workCategory:   activeCategory.value,
    dividerType:    hasTypes.value ? selections.dividerType : null,
    placement:      needsPlacement.value ? selections.placement : null,
    size:           hasSizes.value ? selections.size : null,
    goodProduction: activeCategory.value !== 'TIME' ? (Number(values.good) || 0) : 0,
    wasteMaterial:  activeCategory.value !== 'TIME' ? (Number(values.waste) || 0) : 0,
    hoursWorked:    activeCategory.value === 'TIME' ? (Number(values.hours) || 0) : null,
  }
  
  const ok = await store.submitProductionLog(payload)
  isSaving.value = false
  if (ok) {
    values.good  = ''
    values.waste = ''
    values.hours = ''
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
  width: 100%;
  max-width: 280px;
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

.single-cat-badge {
  display: flex; align-items: center; justify-content: center; gap: 0.5rem;
  background: rgba(99,102,241,.15);
  border: 1px dashed rgba(99,102,241,.3);
  color: #a5b4fc;
  padding: 0.75rem;
  border-radius: 0.65rem;
  font-weight: 700; font-size: 0.85rem;
}

.toggle-group { display: flex; flex-wrap: wrap; gap: .4rem; }
.toggle-group--col { flex-direction: column; }

.toggle-btn {
  flex: 1 1 calc(33% - .4rem);
  min-height: 2.8rem;
  background: #0f172a;
  border: 1px solid rgba(255,255,255,.1);
  color: #94a3b8;
  border-radius: .5rem;
  font-size: .95rem;
  font-weight: 700;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all .13s ease;
  -webkit-tap-highlight-color: transparent;
}
.toggle-btn--sm { min-height: 2.4rem; font-size: 0.8rem; }
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

.time-form {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 100%; flex: 1; text-align: center;
}
.time-form h2 { color: #f8fafc; font-size: 2rem; font-weight: 900; margin-bottom: 0.5rem; }
.time-rate { color: #94a3b8; font-size: 1.1rem; }

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
  margin-top: auto;
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
