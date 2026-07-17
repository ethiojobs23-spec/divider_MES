<template>
  <div class="tablet-layout">
    <div class="header">
      <span class="material-symbols-rounded header-icon">settings_account_box</span>
      <div>
        <h1 class="header-title">Worker Payout Settings</h1>
        <p class="header-sub">Configure payment methods and interest rates</p>
      </div>
    </div>

    <div class="content-area">
      <div class="sidebar">
        <h2 class="sidebar-title">Select Operator</h2>
        <ul class="operator-list">
          <li 
            v-for="op in mesStore.operators" 
            :key="op.id"
            @click="selectOperator(op)"
            :class="['operator-item', { active: activeOperator?.id === op.id }]"
          >
            <div class="op-avatar" :class="op.color">{{ op.avatar }}</div>
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
            <label>Payment Method</label>
            <select v-model="formData.paymentMethod" class="massive-input">
              <option value="Cash">Cash</option>
              <option value="Telebirr">Telebirr</option>
              <option value="CBE Bank Transfer">CBE Bank Transfer</option>
            </select>
          </div>

          <div class="form-group" v-if="formData.paymentMethod !== 'Cash'">
            <label>Account Number / Telebirr Phone Number</label>
            <input 
              type="text" 
              v-model="formData.accountInfo" 
              class="massive-input" 
              placeholder="e.g. 0911..." 
            />
          </div>

          <div class="form-group">
            <label>Base Interest Rate (%)</label>
            <div class="input-with-icon">
              <input 
                type="number" 
                step="0.1" 
                v-model="formData.baseInterestRate" 
                class="massive-input" 
              />
              <span class="icon">%</span>
            </div>
            <p class="hint">Applied automatically when requesting a loan.</p>
          </div>

          <button type="submit" class="btn-save massive-btn">
            SAVE SETTINGS
          </button>
        </form>
      </div>
      <div class="main-panel empty-state" v-else>
        <span class="material-symbols-rounded empty-icon">person_search</span>
        <p>Select an operator to configure payout settings</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useMesStore } from '@/store/mesStore'
import { usePayrollStore } from '@/store/payrollStore'

const mesStore = useMesStore()
const payrollStore = usePayrollStore()

const activeOperator = ref(null)
const formData = ref({
  paymentMethod: 'Cash',
  accountInfo: '',
  baseInterestRate: 5
})

function selectOperator(op) {
  activeOperator.value = op
  const profile = payrollStore.getWorkerProfile(op.id)
  formData.value = { ...profile }
}

function saveSettings() {
  if (activeOperator.value) {
    payrollStore.setWorkerProfile(activeOperator.value.id, { ...formData.value })
    alert(`Settings saved for ${activeOperator.value.name}`)
  }
}
</script>

<style scoped>
.tablet-layout {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  background: #0f172a;
  color: #f1f5f9;
  font-family: 'Inter', sans-serif;
}

.header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem 2rem;
  background: #1e293b;
  border-bottom: 1px solid rgba(99,102,241,.2);
}

.header-icon { font-size: 2.5rem; color: #a5b4fc; }
.header-title { font-size: 1.5rem; font-weight: 800; margin: 0; }
.header-sub { font-size: 0.9rem; color: #64748b; margin: 0; }

.content-area {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 350px;
  background: #1e293b;
  border-right: 1px solid rgba(255,255,255,0.05);
  display: flex;
  flex-direction: column;
}

.sidebar-title {
  padding: 1.5rem;
  font-size: 1.1rem;
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
  gap: 1rem;
  padding: 1.2rem 1.5rem;
  cursor: pointer;
  border-bottom: 1px solid rgba(255,255,255,0.02);
  transition: all 0.2s ease;
}

.operator-item:hover { background: rgba(255,255,255,0.03); }
.operator-item.active { background: rgba(99,102,241,0.15); border-left: 4px solid #6366f1; }

.op-avatar {
  width: 3rem; height: 3rem;
  border-radius: 0.5rem;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.2rem; font-weight: 800; color: #fff;
}

.op-info { display: flex; flex-direction: column; }
.op-name { font-size: 1.1rem; font-weight: 700; }
.op-role { font-size: 0.8rem; color: #64748b; }

.main-panel {
  flex: 1;
  padding: 3rem;
  overflow-y: auto;
}

.panel-title {
  font-size: 1.8rem;
  margin-bottom: 2.5rem;
  color: #e2e8f0;
}

.settings-form {
  max-width: 600px;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.form-group { display: flex; flex-direction: column; gap: 0.8rem; }
.form-group label { font-size: 1.1rem; font-weight: 600; color: #cbd5e1; }
.hint { font-size: 0.85rem; color: #64748b; margin: 0; }

.massive-input {
  width: 100%;
  padding: 1.2rem;
  font-size: 1.3rem;
  background: rgba(15,23,42,0.6);
  border: 2px solid rgba(99,102,241,0.3);
  border-radius: 0.75rem;
  color: #fff;
  outline: none;
  transition: border-color 0.2s;
}
.massive-input:focus { border-color: #6366f1; }

.input-with-icon { position: relative; }
.input-with-icon .icon {
  position: absolute;
  right: 1.2rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.3rem;
  color: #64748b;
}

.massive-btn {
  margin-top: 1rem;
  padding: 1.5rem;
  font-size: 1.2rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: #fff;
  background: linear-gradient(135deg, #4f46e5, #4338ca);
  border: none;
  border-radius: 0.75rem;
  cursor: pointer;
  box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.4);
  transition: transform 0.1s, box-shadow 0.1s;
}
.massive-btn:active { transform: scale(0.98); box-shadow: 0 5px 15px -5px rgba(79, 70, 229, 0.4); }

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #64748b;
}
.empty-icon { font-size: 5rem; margin-bottom: 1rem; opacity: 0.5; }
.empty-state p { font-size: 1.2rem; }
</style>
