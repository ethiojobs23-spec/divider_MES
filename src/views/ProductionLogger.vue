<template>
  <TabletLayout>
    <!-- ─── Sidebar Slot ─────────────────────────────────────────── -->
    <template #default>
      <!-- We override via slot scoping trick — sidebar content is inside TabletLayout -->
    </template>
  </TabletLayout>

  <!-- Custom full-layout override using the same 25/75 split manually -->
  <div class="prod-layout">
    <!-- LEFT: Filter Sidebar -->
    <aside class="prod-sidebar">
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
        <p class="summary-row"><span>Operator</span><strong>{{ store.activeOperator?.name || '—' }}</strong></p>
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
        :disabled="!canSave"
        @click="saveEntry"
      >
        <span class="material-symbols-rounded">save</span>
        SAVE TO LEDGER
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
import TabletLayout  from '@/components/layout/TabletLayout.vue'
import VirtualNumpad from '@/components/ui/VirtualNumpad.vue'
import { useMesStore } from '@/store/mesStore.js'

const store = useMesStore()

const dividerTypes = ['50', '40', '30', '16', '12', '45']
const placements   = ['ብተና', 'ውስጥ', 'የተለየ']
const sizes        = ['9cm', '7cm']

const selections = reactive({ dividerType: '50', placement: 'ብተና', size: '9cm' })
const values     = reactive({ good: '', waste: '' })
const activeField = ref('good')

const canSave = computed(() =>
  (values.good !== '' || values.waste !== '') && store.activeOperator !== null
)

const toast = reactive({ visible: false, message: '' })
let toastTimer = null

function showToast(msg) {
  toast.message  = msg
  toast.visible  = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.visible = false }, 2500)
}

function saveEntry() {
  if (!canSave.value) return
  store.saveProductionEntry({
    dividerType:    selections.dividerType,
    placement:      selections.placement,
    size:           selections.size,
    goodProduction: Number(values.good)  || 0,
    wasteMaterial:  Number(values.waste) || 0,
  })
  values.good  = ''
  values.waste = ''
  showToast('Entry saved to ledger ✓')
}
</script>

<style scoped>
.prod-layout {
  display: flex;
  width: 100vw;
  height: 100vh;
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
