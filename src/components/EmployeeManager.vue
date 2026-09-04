<template>
  <div class="employee-manager">
    <div class="panel-header">
      <span class="material-symbols-rounded panel-icon" style="color:#3b82f6">badge</span>
      <div>
        <h2 class="panel-title">Employee Management</h2>
        <p class="panel-sub">Create, edit, and manage employee accounts and PIN codes.</p>
      </div>
      <button class="btn-create" @click="openCreateModal">
        <span class="material-symbols-rounded">person_add</span>
        New Employee
      </button>
    </div>

    <div class="employee-list">
      <div v-for="emp in mesStore.operators" :key="emp.id" class="employee-card" :class="{ 'is-inactive': !emp.is_active }">
        <OperatorAvatar :avatar="emp.avatar" :name="emp.name" :color="emp.color" size="md" />
        <div class="emp-details">
          <h3 class="emp-name">{{ emp.name }}</h3>
          <p class="emp-role">{{ emp.role }}</p>
        </div>
        <div class="emp-pin">
          <span class="pin-label">PIN</span>
          <span class="pin-val">{{ emp.pin_code }}</span>
        </div>
        <div class="emp-actions">
          <button class="btn-action edit" @click="openEditModal(emp)">
            <span class="material-symbols-rounded">edit</span>
          </button>
          <button class="btn-action toggle" :class="emp.is_active ? 'deactivate' : 'activate'" @click="toggleActive(emp)">
            <span class="material-symbols-rounded">{{ emp.is_active ? 'person_off' : 'how_to_reg' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Edit/Create Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal-content">
        <h3>{{ editingId ? 'Edit Employee' : 'Create Employee' }}</h3>
        <div class="form-group">
          <label>Full Name</label>
          <input v-model="formData.name" type="text" placeholder="e.g. Zelalem" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Role</label>
            <select v-model="formData.role">
              <option value="Operator">Operator</option>
              <option value="Supervisor">Supervisor</option>
              <option value="Mechanic">Mechanic</option>
              <option value="System Admin">System Admin</option>
            </select>
          </div>
          <div class="form-group">
            <label>4-Digit PIN</label>
            <input v-model="formData.pin_code" type="text" maxlength="4" placeholder="e.g. 1111" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Profile Picture URL</label>
            <input v-model="formData.avatar" type="text" placeholder="https://... or initial" />
          </div>
          <div class="form-group">
            <label>Color Theme</label>
            <select v-model="formData.color">
              <option value="bg-blue-500">Blue</option>
              <option value="bg-green-500">Green</option>
              <option value="bg-purple-500">Purple</option>
              <option value="bg-orange-500">Orange</option>
              <option value="bg-rose-500">Rose</option>
            </select>
          </div>
        </div>
        
        <hr class="form-divider" />
        <h4 class="section-heading">Payroll Configuration</h4>
        <div class="form-row">
          <label class="toggle-label">
            <input type="checkbox" v-model="formData.payroll_config.isPieceRate" />
            Pay by Piece-Rate (Per Unit Produced)
          </label>
        </div>
        <div class="form-row">
          <label class="toggle-label">
            <input type="checkbox" v-model="formData.payroll_config.isHourly" />
            Pay Hourly
          </label>
        </div>
        <div class="form-row" v-if="formData.payroll_config.isHourly">
          <div class="form-group">
            <label>Hourly Rate (ETB)</label>
            <input v-model="formData.payroll_config.hourlyRate" type="number" min="0" placeholder="e.g. 15" />
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn-cancel" @click="showModal = false">Cancel</button>
          <button class="btn-save" @click="saveEmployee" :disabled="isSaving">
            {{ isSaving ? 'Saving...' : 'Save Employee' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { useMesStore } from '@/store/mesStore'
import OperatorAvatar from '@/components/ui/OperatorAvatar.vue'

const mesStore = useMesStore()

const showModal = ref(false)
const isSaving = ref(false)
const editingId = ref(null)
const formData = ref({
  name: '', role: 'Operator', pin_code: '', avatar: '', color: 'bg-blue-500',
  payroll_config: { isPieceRate: true, isHourly: false, hourlyRate: 15 }
})

function openCreateModal() {
  editingId.value = null
  formData.value = { 
    name: '', role: 'Operator', pin_code: '', avatar: '', color: 'bg-blue-500',
    payroll_config: { isPieceRate: true, isHourly: false, hourlyRate: 15 }
  }
  showModal.value = true
}

function openEditModal(emp) {
  editingId.value = emp.id
  const pc = emp.payroll_config || { isPieceRate: true, isHourly: false, hourlyRate: 15 }
  formData.value = { ...emp, payroll_config: { ...pc } }
  showModal.value = true
}

async function saveEmployee() {
  if (!formData.value.name || !formData.value.pin_code) return
  isSaving.value = true
  try {
    let empId = editingId.value
    if (editingId.value) {
      const { error } = await supabase.from('mes_operators').update({
        name: formData.value.name,
        role: formData.value.role,
        pin_code: formData.value.pin_code,
        avatar: formData.value.avatar,
        color: formData.value.color
      }).eq('id', editingId.value)
      if (error) throw error
    } else {
      const { data, error } = await supabase.from('mes_operators').insert([{
        name: formData.value.name,
        role: formData.value.role,
        pin_code: formData.value.pin_code,
        avatar: formData.value.avatar,
        color: formData.value.color,
        is_active: true
      }]).select().single()
      if (error) throw error
      empId = data.id
    }

    // Save Payroll Config while preserving work_types
    const existingOp = mesStore.operators.find(o => o.id === empId)
    const { data: existingConfigs } = await supabase.from('mes_financial_ledger')
      .select('id, notes')
      .eq('operator_id', empId)
      .eq('transaction_type', 'operator_config')
      .order('id', { ascending: false })

    let mergedNotes = {
      payroll_config: formData.value.payroll_config,
      ...(existingOp?.work_types ? { work_types: existingOp.work_types } : {})
    }

    if (existingConfigs && existingConfigs.length > 0) {
      try {
        const prev = JSON.parse(existingConfigs[0].notes || '{}')
        mergedNotes = {
          ...prev,
          payroll_config: formData.value.payroll_config,
          work_types: existingOp?.work_types || prev.work_types || { categories: ['MFG'], divider_types: [], placements: [], sizes: [], hourly_rate: null }
        }
      } catch {}

      await supabase.from('mes_financial_ledger').update({
        notes: JSON.stringify(mergedNotes),
        transaction_date: new Date().toISOString().split('T')[0]
      }).eq('id', existingConfigs[0].id)

      if (existingConfigs.length > 1) {
        const extraIds = existingConfigs.slice(1).map(r => r.id)
        await supabase.from('mes_financial_ledger').delete().in('id', extraIds)
      }
    } else {
      await supabase.from('mes_financial_ledger').insert([{
        operator_id: empId,
        target_name: 'Config',
        transaction_type: 'operator_config',
        amount: 0,
        transaction_date: new Date().toISOString().split('T')[0],
        notes: JSON.stringify(mergedNotes)
      }])
    }

    await mesStore.fetchInitialData() // refresh operators
    showModal.value = false
  } catch (err) {
    alert('Failed to save employee: ' + err.message)
  } finally {
    isSaving.value = false
  }
}

async function toggleActive(emp) {
  try {
    const { error } = await supabase.from('mes_operators').update({ is_active: !emp.is_active }).eq('id', emp.id)
    if (error) throw error
    await mesStore.fetchInitialData()
  } catch (err) {
    alert('Failed to update status')
  }
}
</script>

<style scoped>
.employee-manager { display: flex; flex-direction: column; gap: 1.5rem; }
.panel-header { display: flex; align-items: center; gap: .85rem; padding-bottom: .9rem; border-bottom: 1px solid rgba(255,255,255,.07); }
.panel-header > div { flex: 1; }
.panel-icon  { font-size: 1.6rem !important; }
.panel-title { font-size: 1.1rem; font-weight: 800; color: #f1f5f9; }
.panel-sub   { font-size: .72rem; color: #64748b; margin-top: .15rem; }

.btn-create {
  background: #3b82f6; color: #fff; padding: 0.6rem 1.2rem; border-radius: 0.5rem;
  font-weight: 700; border: none; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;
}

.employee-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
.employee-card {
  background: #1e293b; border: 1px solid rgba(255,255,255,.07); border-radius: 0.85rem;
  padding: 1rem; display: flex; align-items: center; gap: 1rem;
}
.employee-card.is-inactive { opacity: 0.5; filter: grayscale(1); }
.emp-avatar {
  width: 3rem; height: 3rem; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center;
  font-size: 1.2rem; font-weight: 800; color: #fff;
}
.bg-blue-500 { background: #3b82f6; }
.bg-green-500 { background: #10b981; }
.bg-purple-500 { background: #8b5cf6; }
.bg-orange-500 { background: #f97316; }
.bg-rose-500 { background: #f43f5e; }

.emp-details { flex: 1; }
.emp-name { font-size: 1rem; font-weight: 700; color: #f1f5f9; margin: 0; }
.emp-role { font-size: 0.75rem; color: #94a3b8; margin: 0; }

.emp-pin { text-align: center; background: rgba(0,0,0,0.2); padding: 0.3rem 0.6rem; border-radius: 0.4rem; }
.pin-label { display: block; font-size: 0.6rem; color: #64748b; }
.pin-val { font-size: 0.9rem; font-weight: 800; color: #e2e8f0; font-family: monospace; }

.emp-actions { display: flex; gap: 0.4rem; }
.btn-action {
  width: 2.2rem; height: 2.2rem; border-radius: 0.4rem; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.edit { background: rgba(255,255,255,0.1); color: #cbd5e1; }
.deactivate { background: rgba(239,68,68,0.15); color: #f87171; }
.activate { background: rgba(16,185,129,0.15); color: #34d399; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { background: #1e293b; padding: 2rem; border-radius: 1rem; width: 90%; max-width: 450px; border: 1px solid rgba(255,255,255,0.1); }
.modal-content h3 { margin: 0 0 1.5rem 0; color: #f8fafc; font-size: 1.25rem; }
.form-group { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem; flex: 1; }
.form-row { display: flex; gap: 1rem; }
.form-group label { font-size: 0.8rem; font-weight: 600; color: #94a3b8; }
.form-group input, .form-group select {
  background: #0f172a; border: 1px solid rgba(255,255,255,0.1); color: #f1f5f9; padding: 0.75rem; border-radius: 0.5rem; font-size: 0.9rem;
}
.modal-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem; }
.modal-actions button { padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: 700; cursor: pointer; border: none; }
.btn-cancel { background: transparent; border: 1px solid rgba(255,255,255,0.1) !important; color: #94a3b8; }
.btn-save { background: #3b82f6; color: #fff; }

.form-divider { border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 1.5rem 0 1rem; }
.section-heading { margin: 0 0 1rem; color: #cbd5e1; font-size: 0.95rem; font-weight: 700; }
.toggle-label { display: flex; align-items: center; gap: 0.75rem; color: #f8fafc; font-size: 0.9rem; font-weight: 600; cursor: pointer; user-select: none; }
.toggle-label input[type="checkbox"] { width: 1.25rem; height: 1.25rem; accent-color: #3b82f6; cursor: pointer; }
</style>
