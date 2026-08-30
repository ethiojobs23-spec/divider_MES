<template>
  <div class="tab-content split-layout">
    <!-- ON SHIFT BLOCK -->
    <div v-if="isClockedIn" class="on-shift-block">
      <span class="material-symbols-rounded" style="font-size:3rem; color:#f59e0b">schedule</span>
      <h3>You Are Currently On Shift</h3>
      <p>Payment requests can only be made when you are <strong>not on shift</strong>. Please clock out first.</p>
    </div>
    <template v-else>
      <div class="form-card">
        <h3>Request Payment / Advance</h3>
        <div class="form-group">
          <label>Amount (ETB)</label>
          <VirtualNumpad v-model="amount" label="" />
        </div>
        <div class="form-group">
          <label>Reason</label>
          <select v-model="reason" class="input-field">
            <option>Weekly Advance</option>
            <option>Transport</option>
            <option>Emergency</option>
          </select>
        </div>
        <button class="btn-submit" :disabled="!amount" @click="onRequest">Submit Request</button>
        <p v-if="message" class="success-msg">{{ message }}</p>
      </div>
      
      <div class="history-card">
        <h3>My Recent Payment Requests</h3>
        <div class="history-list">
          <div v-for="adv in advances" :key="adv.id" class="history-item">
            <div class="history-left">
              <span class="material-symbols-rounded history-icon">receipt_long</span>
              <div>
                <span class="reason">{{ adv.note || 'Advance' }} • 
                  <strong :class="'status-' + adv.type">{{ formatAdvanceStatus(adv.type) }}</strong>
                </span>
                <span class="date">{{ new Date(adv.timestamp).toLocaleDateString() }}</span>
              </div>
            </div>
            <span class="amount">{{ adv.amount }} ETB</span>
          </div>
          <p v-if="!advances.length" class="empty-text">No recent payment requests logged.</p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
// Developer: Mintesnot Abebe | Brand: dev MinteIO
import { ref } from 'vue'
import VirtualNumpad from '@/components/ui/VirtualNumpad.vue'

const props = defineProps({
  isClockedIn: { type: Boolean, default: false },
  advances: { type: Array, default: () => [] },
  message: { type: String, default: '' }
})

const emit = defineEmits(['openPinModal'])

const amount = ref('')
const reason = ref('Weekly Advance')

function formatAdvanceStatus(type) {
  if (!type) return 'UNKNOWN'
  if (type === 'pending_advance') return 'PENDING'
  if (type === 'advance') return 'APPROVED'
  if (type === 'rejected_advance') return 'REJECTED'
  return type.toUpperCase()
}

function onRequest() {
  if (!amount.value) return
  emit('openPinModal', { 
    mode: 'payment', 
    amount: amount.value, 
    reason: reason.value,
    resetAmount: () => { amount.value = '' }
  })
}
</script>

<style scoped>
.tab-content {
  animation: fadeIn 0.3s ease;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.split-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.form-card, .history-card {
  background: #1e293b;
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 1.5rem;
  padding: 2.5rem;
}
.form-card h3, .history-card h3 { margin: 0 0 1.5rem 0; font-size: 1.4rem; color: #f8fafc; }

.form-group { margin-bottom: 1.5rem; }
.form-group label { display: block; font-size: 0.9rem; font-weight: 600; color: #cbd5e1; margin-bottom: 0.5rem; }
.input-field {
  width: 100%;
  padding: 1rem;
  background: #0f172a;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 0.75rem;
  color: #f1f5f9;
  font-size: 1.1rem;
  font-family: inherit;
  box-sizing: border-box;
}
.input-field:focus { outline: none; border-color: #6366f1; }

.btn-submit {
  width: 100%;
  padding: 1.25rem;
  background: #10b981;
  color: #fff;
  border: none;
  border-radius: 0.75rem;
  font-size: 1.1rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 1rem;
}
.btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-submit:not(:disabled):hover { background: #059669; }

.success-msg { color: #34d399; font-weight: 600; margin-top: 1rem; text-align: center; }

.history-list { 
  display: flex; 
  flex-direction: column; 
  gap: 1rem;
  max-height: 400px;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.history-list::-webkit-scrollbar {
  display: none;
}
.history-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 1rem;
  background: rgba(255,255,255,0.03);
  border-radius: 0.75rem;
}
.history-left { display: flex; align-items: center; gap: 1rem; }
.history-icon { color: #fbbf24; background: rgba(245,158,11,0.1); padding: 0.5rem; border-radius: 0.5rem; }
.reason { display: block; font-weight: 600; color: #e2e8f0; font-size: 1.05rem; }
.status-pending_advance { color: #f59e0b; }
.status-advance { color: #10b981; }
.status-rejected_advance { color: #ef4444; }
.date { display: block; font-size: 0.85rem; color: #64748b; }
.amount { font-weight: 800; color: #34d399; font-size: 1.1rem; font-family: monospace; }
.empty-text { text-align: center; color: #64748b; padding: 2rem; }

.on-shift-block {
  grid-column: 1 / -1;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; gap: 1rem;
  background: rgba(245,158,11,0.06); border: 2px dashed rgba(245,158,11,0.3);
  border-radius: 1.5rem; padding: 3rem;
}
.on-shift-block h3 { font-size: 1.5rem; color: #fbbf24; margin: 0; }
.on-shift-block p  { font-size: 1.1rem; color: #94a3b8; margin: 0; max-width: 420px; line-height: 1.5; }
.on-shift-block p strong { color: #f59e0b; }

@media (max-width: 768px) {
  .split-layout { grid-template-columns: 1fr; gap: 1rem; }
  .form-card, .history-card { padding: 1.5rem; }
}
</style>
