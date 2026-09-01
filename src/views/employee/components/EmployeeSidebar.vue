<template>
  <aside class="employee-sidebar">
    <div class="profile-section">
      <OperatorAvatar :avatar="employee?.avatar" :name="employee?.name" :color="employee?.color" size="xl" />
      <h2 class="op-name mt-4">{{ employee?.name }}</h2>
      <p class="op-role">{{ employee?.role }}</p>
    </div>

    <nav class="portal-nav">
      <button 
        v-for="item in navItems" 
        :key="item.id"
        class="nav-btn" 
        :class="{ active: activeTab === item.id }" 
        @click="$emit('update:activeTab', item.id)"
      >
        <span class="material-symbols-rounded">{{ item.icon }}</span>
        <span>{{ item.label }}</span>
        <span v-if="item.id === 'shift-submit' && pendingSubmission" class="nav-badge">!</span>
      </button>
    </nav>
    <div class="sidebar-actions">
      <button class="btn-logout" @click="$emit('logout')">
        <span class="material-symbols-rounded">logout</span>
        LOG OUT
      </button>
    </div>
  </aside>
</template>

<script setup>
// Developer: Mintesnot Abebe | Brand: dev MinteIO
import OperatorAvatar from '@/components/ui/OperatorAvatar.vue'

defineProps({
  employee: { type: Object, default: () => null },
  activeTab: { type: String, required: true },
  pendingSubmission: { type: Boolean, default: false }
})

defineEmits(['update:activeTab', 'logout'])

const navItems = [
  { id: 'profile-settings', label: 'Profile Settings', icon: 'manage_accounts' },
  { id: 'overview',         label: 'My Dashboard',     icon: 'dashboard' },
  { id: 'cash-loan',        label: 'Cash Loan',        icon: 'account_balance_wallet' },
  { id: 'payment-request',  label: 'Payment Request',  icon: 'payments' },
  { id: 'payroll-history',  label: 'Payroll History',  icon: 'history' },
  { id: 'attendance',       label: 'Attendance & Shift', icon: 'how_to_reg' },
  { id: 'production',       label: 'Production Log',   icon: 'precision_manufacturing' },
  { id: 'shift-submit',     label: 'Submit Shift',     icon: 'task_alt' }
]
</script>

<style scoped>
.employee-sidebar {
  width: 100%;
  max-width: 340px;
  background: #1e293b;
  border-right: 1px solid rgba(255,255,255,0.1);
  display: flex;
  flex-direction: column;
  padding: 3rem 2rem;
  flex-shrink: 0;
}

.profile-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 2.5rem;
}

.op-name { 
  font-size: 1.6rem; 
  font-weight: 800; 
  margin: 0 0 0.25rem 0; 
  color: #f8fafc;
}
.op-role { 
  font-size: 0.95rem; 
  color: #94a3b8; 
  margin: 0; 
  text-transform: capitalize;
}

.portal-nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.9rem 1.1rem;
  background: transparent;
  color: #94a3b8;
  border: 1px solid transparent;
  border-radius: 1rem;
  font-size: 1.05rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  position: relative;
}
.nav-btn span.material-symbols-rounded { font-size: 1.4rem; }
.nav-btn:hover {
  background: rgba(255,255,255,0.05);
  color: #e2e8f0;
}
.nav-btn.active {
  background: rgba(99,102,241,0.15);
  border-color: rgba(99,102,241,0.3);
  color: #818cf8;
}

.nav-badge {
  background: #f59e0b; 
  color: #1c1917;
  font-size: 0.7rem; 
  font-weight: 900;
  width: 1.2rem; 
  height: 1.2rem; 
  border-radius: 50%;
  display: flex; 
  align-items: center; 
  justify-content: center;
  margin-left: auto;
}

.sidebar-actions { margin-top: auto; padding-top: 1.5rem; }

.btn-logout {
  width: 100%;
  padding: 1.1rem;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 2px solid #ef4444;
  border-radius: 1rem;
  font-size: 1.05rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}
.btn-logout:hover { background: #ef4444; color: #fff; }

@media (max-width: 768px) {
  .employee-sidebar {
    max-width: 100%;
    padding: 1.5rem 1rem;
    border-right: none;
    border-bottom: 1px solid rgba(255,255,255,0.1);
  }
  
  .profile-section {
    flex-direction: row;
    text-align: left;
    margin-bottom: 1rem;
    gap: 1rem;
    justify-content: flex-start;
  }
  
  .op-name { font-size: 1.3rem; margin: 0; }
  .op-role { font-size: 0.85rem; }
  
  .portal-nav {
    flex-direction: row;
    overflow-x: auto;
    padding-bottom: 0.5rem;
    gap: 0.5rem;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
    -ms-overflow-style: none;
  }
  .portal-nav::-webkit-scrollbar { display: none; }
  
  .nav-btn {
    white-space: nowrap;
    padding: 0.75rem 1rem;
    font-size: 0.95rem;
    touch-action: pan-y;
  }
  
  .sidebar-actions { margin-top: 1rem; padding-top: 0; }
  .btn-logout {
    padding: 0.85rem;
    font-size: 0.95rem;
    touch-action: pan-y;
  }
}
</style>
