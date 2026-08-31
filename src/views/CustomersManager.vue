<template>
  <AppLayout>
    <main class="cm-main">
      <header class="cm-header flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 class="title flex items-center gap-2">
            <span class="material-symbols-rounded" style="color: #34d399">group</span>
            Customers & Accounts
          </h1>
          <p class="subtitle">Manage customers, view dispatches, and track balances ({{ store.clients.length }} total accounts)</p>
        </div>

        <div class="flex items-center gap-2.5">
          <button class="sync-btn cursor-pointer" :disabled="isSyncing" @click="manualSync" title="Sync customer data now">
            <span class="material-symbols-rounded" :class="{ 'spin-icon': isSyncing }">sync</span>
            <span>{{ isSyncing ? 'Syncing...' : 'Sync' }}</span>
          </button>

          <button class="add-btn cursor-pointer" @click="openAddModal">
            <span class="material-symbols-rounded">person_add</span>
            Add Customer
          </button>
        </div>
      </header>

      <!-- Search Bar -->
      <div class="mb-6 flex items-center gap-3">
        <div class="relative flex-1 max-w-md">
          <span class="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search customers by company, contact, or phone..."
            class="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white outline-none focus:border-emerald-500"
          />
        </div>
        <span class="text-xs text-slate-400 font-bold">{{ filteredCustomers.length }} results</span>
      </div>

      <div class="cards-grid">
        <div v-for="c in filteredCustomers" :key="c.id" class="customer-card">
          <div class="card-top">
            <OperatorAvatar :avatar="c.avatar" :name="c.name" :color="c.color" size="md" />
            <div class="info flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <h3 class="truncate">{{ c.name }}</h3>
                <button class="text-slate-500 hover:text-rose-400 p-1 cursor-pointer transition-colors" @click="confirmDelete(c)" title="Delete customer">
                  <span class="material-symbols-rounded text-base">delete</span>
                </button>
              </div>
              <p v-if="c.full_name || c.phone_number" class="customer-details">
                <span v-if="c.full_name" class="material-symbols-rounded">person</span> {{ c.full_name }}
                <span v-if="c.phone_number" class="material-symbols-rounded" style="margin-left: 8px;">call</span> {{ c.phone_number }}
              </p>
              <p v-if="c.address || c.email" class="customer-details">
                <span v-if="c.address" class="material-symbols-rounded">location_on</span> {{ c.address }}
                <span v-if="c.email" class="material-symbols-rounded" style="margin-left: 8px;">mail</span> {{ c.email }}
              </p>
              <p class="text-[0.65rem] text-slate-500 mt-1">ID: {{ c.id }}</p>
            </div>
          </div>
          
          <div class="stats-grid">
            <div class="stat-box">
              <span class="stat-lbl">Total Dispatched</span>
              <span class="stat-val" style="color: #fbbf24">{{ c.totalDispatched.toLocaleString() }} <small>pcs</small></span>
            </div>
            <div class="stat-box">
              <span class="stat-lbl">Payments Received</span>
              <span class="stat-val" style="color: #34d399"><small>ETB</small> {{ c.payments.toLocaleString() }}</span>
            </div>
          </div>
          
          <div class="card-footer" style="display: flex; gap: 0.5rem;">
            <button class="btn-log cursor-pointer" @click="openEditModal(c)" style="flex: 1; background: rgba(99,102,241,0.1); color: #6366f1; border-color: rgba(99,102,241,0.2);">
              <span class="material-symbols-rounded">edit</span>
              Edit
            </button>
            <button class="btn-log cursor-pointer" @click="openPaymentModal(c)" style="flex: 2;">
              <span class="material-symbols-rounded">payments</span>
              Log Payment
            </button>
          </div>
        </div>
        
        <div v-if="!filteredCustomers.length" class="empty-state">
          <span class="material-symbols-rounded">group_off</span>
          <h2>{{ searchQuery ? 'No Matching Customers' : 'No Customers Found' }}</h2>
          <p>{{ searchQuery ? 'Try adjusting your search query.' : 'Add a customer to start tracking dispatches and payments.' }}</p>
        </div>
      </div>
      
      <!-- Modals -->
      <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
        <div class="modal-content" style="max-height: 90vh; overflow-y: auto;">
          <h2>{{ isEditing ? 'Edit Customer' : 'Add New Customer' }}</h2>
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
            <button class="btn-cancel cursor-pointer" @click="showAddModal = false">Cancel</button>
            <button class="btn-save cursor-pointer" :disabled="!newCustomer.name.trim() || isSaving" @click="saveCustomer">
              {{ isSaving ? 'Saving...' : (isEditing ? 'Save Changes' : 'Add Customer') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Payment Modal -->
      <div v-if="selectedCustomer" class="modal-overlay" @click.self="selectedCustomer = null">
        <div class="modal-content" style="max-width: 400px; padding: 1.5rem;">
          <h2 style="margin-bottom: 1.25rem;">Log Payment from {{ selectedCustomer.name }}</h2>
          <div class="input-group" style="margin-bottom: 0;">
            <VirtualNumpad v-model="paymentAmount" label="Payment Amount (ETB)" :allowDecimal="true" />
          </div>
          <div class="modal-actions" style="margin-top: 1.25rem;">
            <button class="btn-cancel cursor-pointer" @click="selectedCustomer = null">Cancel</button>
            <button class="btn-save cursor-pointer" :disabled="Number(paymentAmount) <= 0 || isSaving" @click="savePayment">
              {{ isSaving ? 'Saving...' : 'Confirm Payment' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <div v-if="customerToDelete" class="modal-overlay" @click.self="customerToDelete = null">
        <div class="modal-content" style="max-width: 380px; padding: 1.5rem;">
          <h2 class="text-rose-400 flex items-center gap-2 text-base">
            <span class="material-symbols-rounded">warning</span>
            Delete Customer Account?
          </h2>
          <p class="text-xs text-slate-300 my-3">
            Are you sure you want to delete <strong>{{ customerToDelete.name }}</strong>? This will remove the customer record from the directory.
          </p>
          <div class="modal-actions">
            <button class="btn-cancel cursor-pointer" @click="customerToDelete = null">Cancel</button>
            <button class="px-4 py-2 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 cursor-pointer" :disabled="isSaving" @click="executeDelete">
              {{ isSaving ? 'Deleting...' : 'Confirm Delete' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Toast -->
      <Transition name="toast">
        <div v-if="toast.visible" class="cm-toast">
          <span class="material-symbols-rounded">check_circle</span>
          {{ toast.message }}
        </div>
      </Transition>
    </main>
  </AppLayout>
</template>

<script setup>
// Developer: Mintesnot Abebe | Brand: dev MinteIO
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import OperatorAvatar from '@/components/ui/OperatorAvatar.vue'
import VirtualNumpad from '@/components/ui/VirtualNumpad.vue'
import { useMesStore } from '@/store/mesStore.js'

const store = useMesStore()

const searchQuery = ref('')
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

const customersWithStats = computed(() => {
  return store.clients.map(client => {
    const clientName = client.name || client.company_name
    const dispatches = store.dispatchLogs.filter(d => d.client === clientName)
    const totalDispatched = dispatches.reduce((sum, d) => sum + Number(d.quantity || 0), 0)
    
    const payments = store.cashEntries
      .filter(e => e.type === 'client_payment' && e.operator === clientName)
      .reduce((sum, e) => sum + Number(e.amount || 0), 0)

    return {
      ...client,
      name: clientName,
      totalDispatched,
      payments
    }
  })
})

const filteredCustomers = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return customersWithStats.value
  return customersWithStats.value.filter(c => 
    (c.name && c.name.toLowerCase().includes(q)) ||
    (c.full_name && c.full_name.toLowerCase().includes(q)) ||
    (c.phone_number && c.phone_number.includes(q)) ||
    (c.address && c.address.toLowerCase().includes(q))
  )
})

const showAddModal = ref(false)
const isEditing = ref(false)
const editingCustomerId = ref(null)
const customerToDelete = ref(null)

const newCustomer = ref({
  name: '',
  contact_person: '',
  phone_number: '',
  email: '',
  address: ''
})
const isSaving = ref(false)

const toast = reactive({ visible: false, message: '' })
let toastTimer = null
function showToast(msg) {
  toast.message = msg
  toast.visible = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.visible = false }, 3000)
}

function openAddModal() {
  isEditing.value = false
  editingCustomerId.value = null
  newCustomer.value = { name: '', contact_person: '', phone_number: '', email: '', address: '' }
  showAddModal.value = true
}

function openEditModal(c) {
  isEditing.value = true
  editingCustomerId.value = c.id
  newCustomer.value = {
    name: c.name || '',
    contact_person: c.full_name || '',
    phone_number: c.phone_number || '',
    email: c.email || '',
    address: c.address || ''
  }
  showAddModal.value = true
}

async function saveCustomer() {
  if (!newCustomer.value.name.trim()) return
  isSaving.value = true
  let ok = false
  if (isEditing.value) {
    ok = await store.updateClient(editingCustomerId.value, { ...newCustomer.value })
  } else {
    ok = await store.addClient({ ...newCustomer.value })
  }
  isSaving.value = false
  if (ok) {
    showToast(isEditing.value ? "✓ Customer updated successfully" : "✓ Customer added successfully")
    newCustomer.value = { name: '', contact_person: '', phone_number: '', email: '', address: '' }
    showAddModal.value = false
  } else {
    showToast("⚠ Failed to save customer", "error")
  }
}

function confirmDelete(customer) {
  customerToDelete.value = customer
}

async function executeDelete() {
  if (!customerToDelete.value) return
  isSaving.value = true
  const ok = await store.deleteClient(customerToDelete.value.id)
  isSaving.value = false
  if (ok) {
    showToast(`✓ Removed ${customerToDelete.value.name}`)
    customerToDelete.value = null
  } else {
    showToast("⚠ Failed to delete customer", "error")
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
    showToast(`✓ Recorded ETB ${amount.toFixed(2)} payment from ${selectedCustomer.value.name}`)
    selectedCustomer.value = null
  } else {
    showToast("⚠ Failed to save payment", "error")
  }
}
</script>

<style scoped>
.cm-main {
  width: 100%;
  height: 100%;
  padding: 1.5rem 2rem;
  overflow-y: auto;
  background: #0f172a;
}

.cm-header {
  margin-bottom: 1.5rem;
}
.title {
  font-size: 1.4rem; font-weight: 800; color: #f8fafc; margin: 0;
}
.subtitle {
  color: #64748b; font-size: 0.75rem; margin: 0.2rem 0 0;
}

.sync-btn {
  display: flex; align-items: center; gap: 0.35rem;
  background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.3);
  color: #a5b4fc; border-radius: 0.5rem; padding: 0.55rem 0.9rem;
  font-size: 0.75rem; font-weight: 700; transition: all 0.15s ease;
}
.sync-btn:hover { background: rgba(99,102,241,0.22); color: #fff; }
.spin-icon { animation: spin 0.8s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.add-btn {
  display: flex; align-items: center; gap: 0.5rem;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white; border: none; padding: 0.55rem 1.25rem;
  border-radius: 0.75rem; font-size: 0.8rem; font-weight: 700; cursor: pointer;
  box-shadow: 0 4px 15px rgba(16,185,129,0.3);
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.25rem;
}

.customer-card {
  background: #1e293b;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 1rem;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card-top {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
}

.info h3 {
  font-size: 1rem;
  font-weight: 800;
  color: #f1f5f9;
  margin: 0 0 0.25rem 0;
}

.customer-details {
  display: flex;
  align-items: center;
  font-size: 0.72rem;
  color: #94a3b8;
  margin: 0.2rem 0;
}
.customer-details .material-symbols-rounded {
  font-size: 0.85rem;
  color: #6366f1;
  margin-right: 4px;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  background: #0f172a;
  padding: 0.75rem;
  border-radius: 0.6rem;
}

.stat-box {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.stat-lbl {
  font-size: 0.62rem;
  color: #64748b;
  font-weight: 700;
  text-transform: uppercase;
}
.stat-val {
  font-size: 0.95rem;
  font-weight: 900;
  font-family: monospace;
}

.btn-log {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  background: rgba(16,185,129,0.1);
  color: #34d399;
  border: 1px solid rgba(16,185,129,0.2);
  border-radius: 0.5rem;
  padding: 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  transition: all 0.15s;
}
.btn-log:hover {
  background: rgba(16,185,129,0.2);
}

.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  color: #475569;
}
.empty-state .material-symbols-rounded {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}
.empty-state h2 {
  font-size: 1.1rem;
  font-weight: 700;
  color: #cbd5e1;
  margin: 0 0 0.25rem 0;
}
.empty-state p {
  font-size: 0.8rem;
  margin: 0;
}

/* Modals */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: #1e293b;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 1.25rem;
  padding: 1.5rem;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
}
.modal-content h2 {
  font-size: 1.15rem;
  font-weight: 800;
  color: #f8fafc;
  margin: 0 0 1rem 0;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.85rem;
}
.input-group label {
  font-size: 0.7rem;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
}
.input-group input {
  background: #0f172a;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 0.6rem;
  padding: 0.65rem 0.85rem;
  color: white;
  font-size: 0.85rem;
  outline: none;
}
.input-group input:focus {
  border-color: #10b981;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  margin-top: 1rem;
}
.btn-cancel {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.1);
  color: #94a3b8;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
}
.btn-save {
  background: #10b981;
  border: none;
  color: white;
  padding: 0.5rem 1.25rem;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
}
.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cm-toast {
  position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%);
  background: rgba(16,185,129,0.95); color: #fff;
  padding: 0.75rem 1.5rem; border-radius: 0.75rem; font-weight: 700; font-size: 0.85rem;
  display: flex; align-items: center; gap: 0.4rem; box-shadow: 0 10px 25px rgba(0,0,0,0.5); z-index: 100;
}
.toast-enter-active, .toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 1rem); }
</style>
