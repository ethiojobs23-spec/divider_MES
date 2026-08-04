<template>
  <AppLayout>
    <main class="cm-main">
      <header class="cm-header">
        <div>
          <h1 class="title">
            <span class="material-symbols-rounded" style="color: #34d399">group</span>
            Customers & Accounts
          </h1>
          <p class="subtitle">Manage customers, view dispatches, and track balances.</p>
        </div>
        <button class="add-btn" @click="showAddModal = true">
          <span class="material-symbols-rounded">person_add</span>
          Add Customer
        </button>
      </header>

      <div class="cards-grid">
        <div v-for="c in customersWithStats" :key="c.id" class="customer-card">
          <div class="card-top">
            <OperatorAvatar :avatar="c.avatar" :name="c.name" :color="c.color" size="md" />
            <div class="info">
              <h3>{{ c.name }}</h3>
              <p v-if="c.full_name || c.phone_number" class="customer-details">
                <span v-if="c.full_name" class="material-symbols-rounded">person</span> {{ c.full_name }}
                <span v-if="c.phone_number" class="material-symbols-rounded" style="margin-left: 8px;">call</span> {{ c.phone_number }}
              </p>
              <p v-if="c.address || c.email" class="customer-details">
                <span v-if="c.address" class="material-symbols-rounded">location_on</span> {{ c.address }}
                <span v-if="c.email" class="material-symbols-rounded" style="margin-left: 8px;">mail</span> {{ c.email }}
              </p>
              <p>Customer ID: {{ c.id }}</p>
            </div>
          </div>
          
          <div class="stats-grid">
            <div class="stat-box">
              <span class="stat-lbl">Total Dispatched</span>
              <span class="stat-val" style="color: #fbbf24">{{ c.totalDispatched }} <small>pcs</small></span>
            </div>
            <div class="stat-box">
              <span class="stat-lbl">Payments Received</span>
              <span class="stat-val" style="color: #34d399"><small>ETB</small> {{ c.payments }}</span>
            </div>
          </div>
          
          <div class="card-footer">
            <button class="btn-log" @click="openPaymentModal(c)">
              <span class="material-symbols-rounded">payments</span>
              Log Payment
            </button>
          </div>
        </div>
        
        <div v-if="!store.clients.length" class="empty-state">
          <span class="material-symbols-rounded">group_off</span>
          <h2>No Customers Found</h2>
          <p>Add a customer to start tracking dispatches and payments.</p>
        </div>
      </div>
      
      <!-- Modals -->
      <div v-if="showAddModal" class="modal-overlay">
        <div class="modal-content" style="max-height: 90vh; overflow-y: auto;">
          <h2>Add New Customer</h2>
          <div class="input-group">
            <label>Customer/Company Name <span style="color:#ef4444">*</span></label>
            <input v-model="newCustomer.name" type="text" placeholder="e.g. Addis Ababa Main Depot" />
          </div>
          <div class="input-group">
            <label>Contact Person</label>
            <input v-model="newCustomer.contact_person" type="text" placeholder="e.g. Abebe Kebede" />
          </div>
          <div class="input-group">
            <label>Phone Number</label>
            <!-- Using VirtualNumpad for phone numbers as requested -->
            <VirtualNumpad v-model="newCustomer.phone_number" label="Phone Number" :maxLen="14" />
          </div>
          <div class="input-group">
            <label>Email Address</label>
            <input v-model="newCustomer.email" type="email" placeholder="contact@company.com" />
          </div>
          <div class="input-group">
            <label>Address / Location</label>
            <input v-model="newCustomer.address" type="text" placeholder="e.g. Piassa, Addis Ababa" />
          </div>
          <div class="modal-actions">
            <button class="btn-cancel" @click="showAddModal = false">Cancel</button>
            <button class="btn-save" :disabled="!newCustomer.name.trim() || isSaving" @click="saveCustomer">
              {{ isSaving ? 'Saving...' : 'Add Customer' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="selectedCustomer" class="modal-overlay">
        <div class="modal-content" style="max-width: 400px; padding: 1.5rem;">
          <h2 style="margin-bottom: 1.5rem;">Log Payment from {{ selectedCustomer.name }}</h2>
          <div class="input-group" style="margin-bottom: 0;">
            <VirtualNumpad v-model="paymentAmount" label="Payment Amount (ETB)" :allowDecimal="true" />
          </div>
          <div class="modal-actions" style="margin-top: 1.5rem;">
            <button class="btn-cancel" @click="selectedCustomer = null">Cancel</button>
            <button class="btn-save" :disabled="Number(paymentAmount) <= 0 || isSaving" @click="savePayment">
              {{ isSaving ? 'Saving...' : 'Confirm Payment' }}
            </button>
          </div>
        </div>
      </div>
    </main>
  </AppLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import OperatorAvatar from '@/components/ui/OperatorAvatar.vue'
import VirtualNumpad from '@/components/ui/VirtualNumpad.vue'
import { useMesStore } from '@/store/mesStore.js'

const store = useMesStore()

const customersWithStats = computed(() => {
  return store.clients.map(client => {
    // Total pieces dispatched to this client
    const dispatches = store.dispatchLogs.filter(d => d.client === client.name)
    const totalDispatched = dispatches.reduce((sum, d) => sum + Number(d.quantity), 0)
    
    // Total payments received from this client (logged as client_payment)
    const payments = store.cashEntries
      .filter(e => e.type === 'client_payment' && e.operator === client.name)
      .reduce((sum, e) => sum + Number(e.amount), 0)

    return {
      ...client,
      totalDispatched,
      payments
    }
  })
})

const showAddModal = ref(false)
const newCustomer = ref({
  name: '',
  contact_person: '',
  phone_number: '',
  email: '',
  address: ''
})
const isSaving = ref(false)

async function saveCustomer() {
  if (!newCustomer.value.name.trim()) return
  isSaving.value = true
  const ok = await store.addClient({ ...newCustomer.value })
  isSaving.value = false
  if (ok) {
    newCustomer.value = { name: '', contact_person: '', phone_number: '', email: '', address: '' }
    showAddModal.value = false
  } else {
    alert("Failed to add customer")
  }
}

const selectedCustomer = ref(null)
const paymentAmount = ref('')

function openPaymentModal(customer) {
  selectedCustomer.value = customer
  paymentAmount.value = ''
}

async function savePayment() {
  const amount = Number(paymentAmount.value)
  if (amount <= 0) return
  isSaving.value = true
  const ok = await store.addCashEntry({
    operator: selectedCustomer.value.name,
    type: 'client_payment',
    amount: amount,
    note: `Payment from ${selectedCustomer.value.name}`
  })
  isSaving.value = false
  if (ok) {
    selectedCustomer.value = null
  } else {
    alert("Failed to save payment")
  }
}
</script>

<style scoped>
.cm-main {
  width: 100%;
  height: 100%;
  padding: 2rem;
  overflow-y: auto;
  background: #0f172a;
}

.cm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}
.title {
  display: flex; align-items: center; gap: 0.75rem;
  font-size: 1.5rem; font-weight: 800; color: #f8fafc;
}
.subtitle {
  color: #64748b; font-size: 0.9rem; margin-top: 0.25rem; margin-left: 2.25rem;
}

.add-btn {
  display: flex; align-items: center; gap: 0.5rem;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white; border: none; padding: 0.75rem 1.5rem;
  border-radius: 0.75rem; font-weight: 700; cursor: pointer;
  box-shadow: 0 4px 15px rgba(16,185,129,0.3);
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.customer-card {
  background: #1e293b;
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 1rem;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.card-top {
  display: flex; align-items: center; gap: 1rem;
}
.avatar {
  width: 3.5rem; height: 3.5rem;
  background: #34d399; color: #064e3b;
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 1.5rem; font-weight: 900;
}
.info h3 { color: #f1f5f9; font-size: 1.2rem; font-weight: 700; margin-bottom: 0.25rem; }
.info p { color: #64748b; font-size: 0.8rem; }
.customer-details {
  font-size: 0.75rem;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
}
.customer-details span {
  font-size: 1rem;
  color: #6366f1;
}

.stats-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;
  background: rgba(255,255,255,0.02); padding: 1rem; border-radius: 0.75rem;
}
.stat-box { display: flex; flex-direction: column; gap: 0.25rem; }
.stat-lbl { color: #94a3b8; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }
.stat-val { font-size: 1.25rem; font-weight: 900; }
.stat-val small { font-size: 0.8rem; font-weight: 600; opacity: 0.8; }

.btn-log {
  width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
  background: rgba(52,211,153,0.1); color: #34d399; border: 1px solid rgba(52,211,153,0.2);
  padding: 0.75rem; border-radius: 0.75rem; font-weight: 700; cursor: pointer; transition: all 0.2s;
}
.btn-log:hover { background: rgba(52,211,153,0.2); }

.empty-state {
  grid-column: 1 / -1;
  display: flex; flex-direction: column; align-items: center; gap: 1rem;
  padding: 4rem; color: #64748b; text-align: center;
}
.empty-state .material-symbols-rounded { font-size: 4rem; opacity: 0.5; }

/* Modals */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.modal-content {
  background: #1e293b; padding: 2rem; border-radius: 1rem; width: 100%; max-width: 400px;
  border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 40px rgba(0,0,0,0.5);
}
.modal-content h2 { color: #f1f5f9; margin-bottom: 1.5rem; font-size: 1.25rem; }
.input-group { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 2rem; }
.input-group label { color: #94a3b8; font-size: 0.85rem; font-weight: 600; }
.input-group input {
  background: #0f172a; border: 1px solid rgba(255,255,255,0.1); color: white;
  padding: 0.75rem; border-radius: 0.5rem; font-size: 1rem;
}
.modal-actions { display: flex; gap: 1rem; }
.btn-cancel, .btn-save {
  flex: 1; padding: 0.75rem; border-radius: 0.5rem; font-weight: 700; cursor: pointer; border: none;
}
.btn-cancel { background: rgba(255,255,255,0.05); color: #94a3b8; }
.btn-save { background: #10b981; color: white; }
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
