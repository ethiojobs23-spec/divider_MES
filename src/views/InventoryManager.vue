<template>
  <div class="inv-layout">
    <!-- LEFT Sidebar: Material List -->
    <aside class="inv-sidebar">
      <div class="sidebar-header">
        <span class="material-symbols-rounded" style="font-size:1.4rem;color:#6366f1">inventory_2</span>
        <p class="sidebar-title">Raw Materials</p>
      </div>

      <div class="material-list">
        <button
          v-for="item in store.inventory"
          :key="item.id"
          class="material-btn"
          :class="{ 'material-btn--active': selectedItem?.id === item.id }"
          @click="selectItem(item)"
        >
          <div class="mat-info">
            <span class="mat-name">{{ item.name }}</span>
            <span class="mat-unit">{{ item.unit }}</span>
          </div>
          <div class="mat-qty" :class="{ 'qty--low': item.qty < 10 }">
            {{ item.qty }}
          </div>
        </button>
      </div>
    </aside>

    <!-- MAIN: Numpad Adjustment -->
    <main class="inv-main">
      <div v-if="selectedItem" class="inv-content">
        <!-- Selected Material Header -->
        <div class="material-header">
          <div class="mat-icon-large">
            <span class="material-symbols-rounded">category</span>
          </div>
          <div>
            <h2 class="mat-header-name">{{ selectedItem.name }}</h2>
            <p class="mat-header-sub">Current Stock: <strong class="qty-highlight">{{ selectedItem.qty }} {{ selectedItem.unit }}</strong></p>
          </div>
        </div>

        <!-- Operation Mode Selector -->
        <div class="op-tabs">
          <button
            class="op-tab op-tab--add"
            :class="{ 'op-tab--active': mode === 'add' }"
            @click="mode = 'add'"
          >
            <span class="material-symbols-rounded">add_circle</span>
            ADD STOCK
          </button>
          <button
            class="op-tab op-tab--sub"
            :class="{ 'op-tab--active': mode === 'sub' }"
            @click="mode = 'sub'"
          >
            <span class="material-symbols-rounded">remove_circle</span>
            USE STOCK
          </button>
        </div>

        <!-- Numpad -->
        <div class="inv-numpad">
          <VirtualNumpad
            :label="`Quantity to ${mode === 'add' ? 'Add' : 'Subtract'} (${selectedItem.unit})`"
            v-model="inputValue"
          />
        </div>

        <!-- Confirm Button -->
        <button
          class="confirm-btn"
          :class="mode === 'add' ? 'confirm-btn--add' : 'confirm-btn--sub'"
          :disabled="!inputValue"
          @click="applyAdjustment"
        >
          <span class="material-symbols-rounded">{{ mode === 'add' ? 'add_circle' : 'remove_circle' }}</span>
          {{ mode === 'add' ? `ADD ${inputValue || '0'} ${selectedItem.unit}` : `REMOVE ${inputValue || '0'} ${selectedItem.unit}` }}
        </button>
      </div>

      <!-- Empty State -->
      <div v-else class="empty-state">
        <span class="material-symbols-rounded empty-icon">touch_app</span>
        <p>Select a raw material from the sidebar</p>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import VirtualNumpad from '@/components/ui/VirtualNumpad.vue'
import { useMesStore } from '@/store/mesStore.js'

const store = useMesStore()

const selectedItem = ref(null)
const mode         = ref('add')
const inputValue   = ref('')

function selectItem(item) {
  selectedItem.value = item
  inputValue.value   = ''
}

function applyAdjustment() {
  if (!inputValue.value || !selectedItem.value) return
  const delta = mode.value === 'add' ? Number(inputValue.value) : -Number(inputValue.value)
  store.adjustInventory(selectedItem.value.id, delta)
  inputValue.value = ''
}
</script>

<style scoped>
.inv-layout {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #0f172a;
}

/* Sidebar */
.inv-sidebar {
  width: 25%;
  min-width: 260px;
  background: #1e293b;
  border-right: 1px solid rgba(99,102,241,.2);
  display: flex;
  flex-direction: column;
  padding: 1.25rem 1rem;
  gap: 1rem;
  overflow: hidden;
}

.sidebar-header {
  display: flex; align-items: center; gap: .6rem;
  padding-bottom: .75rem;
  border-bottom: 1px solid rgba(255,255,255,.07);
}
.sidebar-title { font-size: 1rem; font-weight: 700; color: #f1f5f9; }

.material-list { display: flex; flex-direction: column; gap: .4rem; overflow-y: auto; flex: 1; }
.material-btn {
  display: flex; align-items: center; justify-content: space-between;
  padding: .9rem 1rem;
  background: #0f172a;
  border: 1px solid rgba(255,255,255,.08);
  color: #cbd5e1;
  border-radius: .65rem;
  cursor: pointer;
  transition: all .13s ease;
  -webkit-tap-highlight-color: transparent;
}
.material-btn:hover      { background: #1a2636; }
.material-btn--active    { background: rgba(99,102,241,.2); border-color: #6366f1; }

.mat-info   { display: flex; flex-direction: column; align-items: flex-start; }
.mat-name   { font-size: .9rem; font-weight: 700; color: #e2e8f0; }
.mat-unit   { font-size: .65rem; color: #64748b; }
.mat-qty    { font-size: 1.4rem; font-weight: 800; color: #a5b4fc; font-variant-numeric: tabular-nums; }
.qty--low   { color: #f87171; }

/* Main */
.inv-main {
  flex: 1;
  display: flex;
  align-items: stretch;
  padding: 1.5rem 2rem;
  overflow: hidden;
}

.inv-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}

.material-header {
  display: flex; align-items: center; gap: 1rem;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.07);
  border-radius: .85rem;
  padding: 1rem 1.25rem;
}
.mat-icon-large {
  width: 3.5rem; height: 3.5rem;
  background: rgba(99,102,241,.2);
  border-radius: .75rem;
  display: flex; align-items: center; justify-content: center;
  color: #a5b4fc;
  font-size: 1.75rem;
}
.mat-header-name { font-size: 1.4rem; font-weight: 800; color: #f1f5f9; }
.mat-header-sub  { font-size: .8rem; color: #64748b; margin-top: .15rem; }
.qty-highlight   { color: #34d399; }

.op-tabs { display: flex; gap: .6rem; }
.op-tab {
  flex: 1;
  height: 3rem;
  border: 1px solid rgba(255,255,255,.08);
  background: #1e293b;
  border-radius: .65rem;
  color: #64748b;
  font-size: .9rem;
  font-weight: 700;
  display: flex; align-items: center; justify-content: center; gap: .4rem;
  cursor: pointer;
  transition: all .13s ease;
}
.op-tab--add.op-tab--active { background: rgba(16,185,129,.15); border-color: #10b981; color: #34d399; }
.op-tab--sub.op-tab--active { background: rgba(239,68,68,.15); border-color: #ef4444; color: #fca5a5; }

.inv-numpad { flex: 1; display: flex; align-items: flex-start; }

.confirm-btn {
  height: 4.5rem;
  border: none;
  border-radius: .85rem;
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: .08em;
  color: #fff;
  display: flex; align-items: center; justify-content: center; gap: .6rem;
  cursor: pointer;
  transition: all .15s ease;
}
.confirm-btn:disabled        { opacity: .3; cursor: not-allowed; }
.confirm-btn--add            { background: linear-gradient(135deg,#059669,#10b981); }
.confirm-btn--sub            { background: linear-gradient(135deg,#dc2626,#ef4444); }
.confirm-btn:not(:disabled):hover  { filter: brightness(1.1); }
.confirm-btn:not(:disabled):active { transform: scale(.98); }

.empty-state {
  flex: 1;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 1rem;
  color: #334155;
  font-size: .9rem;
}
.empty-icon { font-size: 4rem; }
</style>
