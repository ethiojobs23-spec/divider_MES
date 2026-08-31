<template>
  <AppLayout>
    <div class="tablet-layout">
      <div class="header flex justify-between items-center flex-wrap gap-3">
        <div class="flex items-center gap-3">
          <span class="material-symbols-rounded header-icon">settings_account_box</span>
          <div>
            <h1 class="header-title">Worker Payout Settings</h1>
            <p class="header-sub">Configure payment methods, CBE/Telebirr accounts, and interest rates</p>
          </div>
        </div>

        <button class="sync-btn cursor-pointer" :disabled="isSyncing" @click="manualSync" title="Sync payout settings now">
          <span class="material-symbols-rounded" :class="{ 'spin-icon': isSyncing }">sync</span>
          <span>{{ isSyncing ? 'Syncing...' : 'Sync' }}</span>
        </button>
      </div>

      <div class="content-area">
        <div class="sidebar">
          <h2 class="sidebar-title">Select Operator ({{ operatorList.length }})</h2>
          <ul class="operator-list">
            <li 
              v-for="op in operatorList" 
              :key="op.id"
              @click="selectOperator(op)"
              :class="['operator-item', { active: activeOperator?.id === op.id }]"
            >
              <OperatorAvatar :avatar="op.avatar" :name="op.name" :color="op.color" size="md" />
              <div class="op-info">
                <span class="op-name">{{ op.name }}</span>
                <span class="op-role">{{ op.role }}</span>
              </div>
            </li>
          </ul>
        </div>

        <div class="main-panel" v-if="activeOperator">
          <h2 class="panel-title">Settings for {{ activeOperator.name }}</h2>
          
          <form @submit.prevent="saveSettings" class="settings-form">
            <div class="form-group">
              <label>Payment Disbursement Method</label>
              <select v-model="formData.paymentMethod" class="massive-input cursor-pointer">
                <option value="Cash">Cash (Physical Birr)</option>
                <option value="Telebirr">Telebirr Wallet</option>
                <option value="CBE Bank Transfer">Commercial Bank of Ethiopia (CBE)</option>
              </select>
            </div>

            <div class="form-group" v-if="formData.paymentMethod !== 'Cash'">
              <label>{{ formData.paymentMethod === 'Telebirr' ? 'Telebirr Phone Number' : 'CBE Account Number' }}</label>
              <input 
                type="text" 
                v-model="formData.accountInfo" 
                class="massive-input" 
                :placeholder="formData.paymentMethod === 'Telebirr' ? 'e.g. 0911234567' : 'e.g. 1000123456789'" 
              />
            </div>

            <div class="form-group">
              <label>Base Loan Interest Rate (%)</label>
              <VirtualNumpad
                label="Interest Rate (%)"
                v-model="formData.baseInterestRate"
                :maxLen="5"
                :allowDecimal="true"
              />
              <p class="hint">Default interest surcharge applied when issuing advances / loans.</p>
            </div>

            <button type="submit" class="btn-save massive-btn cursor-pointer" :disabled="isSaving">
              {{ isSaving ? 'SAVING...' : 'SAVE SETTINGS' }}
            </button>
          </form>
        </div>
        <div class="main-panel empty-state" v-else>
          <span class="material-symbols-rounded empty-icon">person_search</span>
          <p>Select an operator to configure payout settings</p>
        </div>
      </div>

      <!-- Toast -->
      <Transition name="toast">
        <div v-if="toast.visible" class="pos-toast">
          <span class="material-symbols-rounded">check_circle</span>
          {{ toast.message }}
        </div>
      </Transition>
    </div>
  </AppLayout>
</template>

<script setup>
// Developer: Mintesnot Abebe | Brand: dev MinteIO
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import OperatorAvatar from '@/components/ui/OperatorAvatar.vue'
import { useMesStore } from '@/store/mesStore.js'
import { usePayrollStore } from '@/store/payrollStore.js'
import VirtualNumpad from '@/components/ui/VirtualNumpad.vue'

const mesStore = useMesStore()
const payrollStore = usePayrollStore()

const isSyncing = ref(false)
const isSaving = ref(false)
let refreshTimer = null

const operatorList = computed(() => {
  return mesStore.operators.filter(o => o.role !== 'customer')
})

const activeOperator = ref(null)
const formData = ref({
  paymentMethod: 'Cash',
  accountInfo: '',
  baseInterestRate: 5
})

function selectOperator(op) {
  activeOperator.value = op
  const profile = payrollStore.getWorkerProfile(op.id)
  formData.value = {
    paymentMethod: profile.paymentMethod || 'Cash',
    accountInfo: profile.accountInfo || '',
    baseInterestRate: profile.baseInterestRate !== undefined ? profile.baseInterestRate : 5
  }
}

async function manualSync() {
  isSyncing.value = true
  try {
    await mesStore.fetchInitialData()
    if (activeOperator.value) {
      selectOperator(activeOperator.value)
    }
  } finally {
    setTimeout(() => { isSyncing.value = false }, 400)
  }
}

onMounted(async () => {
  await mesStore.fetchInitialData()
  if (mesStore.activeOperator) {
    selectOperator(mesStore.activeOperator)
  } else if (operatorList.value.length > 0) {
    selectOperator(operatorList.value[0])
  }

  refreshTimer = setInterval(async () => {
    await mesStore.fetchInitialData()
  }, 30000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})

const toast = reactive({ visible: false, message: '' })
let toastTimer = null
function showToast(msg) {
  toast.message = msg
  toast.visible = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.visible = false }, 2500)
}

async function saveSettings() {
  if (!activeOperator.value || isSaving.value) return
  isSaving.value = true
  try {
    await payrollStore.setWorkerProfile(activeOperator.value.id, { ...formData.value })
    showToast(`✓ Settings saved for ${activeOperator.value.name}`)
  } catch (err) {
    showToast(`⚠ Failed to save settings`)
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.tablet-layout {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: #0f172a;
  color: #f1f5f9;
  font-family: 'Inter', sans-serif;
  position: relative;
}

.header {
  padding: 1rem 1.5rem;
  background: #1e293b;
  border-bottom: 1px solid rgba(99,102,241,.2);
}

.header-icon { font-size: 2.25rem; color: #a5b4fc; }
.header-title { font-size: 1.25rem; font-weight: 800; margin: 0; }
.header-sub { font-size: 0.72rem; color: #64748b; margin: 0.15rem 0 0; }

.sync-btn {
  display: flex; align-items: center; gap: 0.35rem;
  background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.3);
  color: #a5b4fc; border-radius: 0.5rem; padding: 0.45rem 0.85rem;
  font-size: 0.75rem; font-weight: 700; transition: all 0.15s ease;
}
.sync-btn:hover { background: rgba(99,102,241,0.22); color: #fff; }
.spin-icon { animation: spin 0.8s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.content-area {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 100%;
  max-width: 300px;
  background: #1e293b;
  border-right: 1px solid rgba(255,255,255,0.05);
  display: flex;
  flex-direction: column;
}

.sidebar-title {
  padding: 1rem 1.25rem;
  font-size: 0.85rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  margin: 0;
}

.operator-list {
  list-style: none;
  padding: 0;
  margin: 0;
  overflow-y: auto;
  flex: 1;
}

.operator-item {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.85rem 1.25rem;
  cursor: pointer;
  border-bottom: 1px solid rgba(255,255,255,0.02);
  transition: all 0.15s ease;
}

.operator-item:hover { background: rgba(255,255,255,0.03); }
.operator-item.active { background: rgba(99,102,241,0.15); border-left: 4px solid #6366f1; }

.op-info { display: flex; flex-direction: column; }
.op-name { font-size: 0.95rem; font-weight: 700; color: #f8fafc; }
.op-role { font-size: 0.72rem; color: #64748b; }

.main-panel {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
}

.panel-title {
  font-size: 1.3rem;
  font-weight: 800;
  margin-bottom: 1.5rem;
  color: #e2e8f0;
}

.settings-form {
  max-width: 520px;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group { display: flex; flex-direction: column; gap: 0.5rem; }
.form-group label { font-size: 0.8rem; font-weight: 700; color: #cbd5e1; text-transform: uppercase; }
.hint { font-size: 0.72rem; color: #64748b; margin: 0; }

.massive-input {
  width: 100%;
  padding: 0.85rem 1rem;
  font-size: 0.95rem;
  background: rgba(15,23,42,0.6);
  border: 1px solid rgba(99,102,241,0.3);
  border-radius: 0.6rem;
  color: #fff;
  outline: none;
  transition: border-color 0.2s;
}
.massive-input:focus { border-color: #6366f1; }

.massive-btn {
  margin-top: 0.5rem;
  padding: 1rem;
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: #fff;
  background: linear-gradient(135deg, #4f46e5, #4338ca);
  border: none;
  border-radius: 0.75rem;
  cursor: pointer;
  box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.4);
  transition: transform 0.1s, box-shadow 0.1s;
}
.massive-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
.massive-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #64748b;
  text-align: center;
}
.empty-icon { font-size: 3rem; margin-bottom: 0.5rem; }

.pos-toast {
  position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%);
  background: rgba(16,185,129,0.95); color: #fff;
  padding: 0.75rem 1.5rem; border-radius: 0.75rem; font-weight: 700; font-size: 0.85rem;
  display: flex; align-items: center; gap: 0.4rem; box-shadow: 0 10px 25px rgba(0,0,0,0.5); z-index: 100;
}
.toast-enter-active, .toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 1rem); }
</style>
