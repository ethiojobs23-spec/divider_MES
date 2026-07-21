import { createRouter, createWebHistory } from 'vue-router'
import { getActivePinia } from 'pinia'
import { useMesStore } from '@/store/mesStore.js'
import { useSystemAuthStore } from '@/store/systemAuthStore.js'

// ─── Route Components ──────────────────────────────────────────────────────
import WelcomeAuth      from '@/views/WelcomeAuth.vue'
import ModuleSelection  from '@/views/ModuleSelection.vue'
import KioskLogin       from '@/views/KioskLogin.vue'
import ProductionLogger from '@/views/ProductionLogger.vue'
import DowntimeTracker  from '@/views/DowntimeTracker.vue'
import InventoryManager from '@/views/InventoryManager.vue'
import CashAdvanceHub   from '@/views/CashAdvanceHub.vue'
import PayrollDashboard from '@/views/PayrollDashboard.vue'
import QualityControl   from '@/views/QualityControl.vue'
import DispatchLogistics from '@/views/DispatchLogistics.vue'
import ExecutiveAnalytics from '@/views/ExecutiveAnalytics.vue'
import AdminSettings    from '@/views/AdminSettings.vue'
import PinAuth          from '@/views/PinAuth.vue'
import EmployeeProfileView from '@/views/EmployeeProfileView.vue'
// ─── Route Definitions ─────────────────────────────────────────────────────
const routes = [
  // ── Public boot screen (no auth required) ──────────────────────────────
  {
    path: '/',
    name: 'WelcomeAuth',
    component: WelcomeAuth,
    meta: { title: 'System Boot', requiresSystemAuth: false, nav: false },
  },

  // ── Module hub (requires system unlock) ────────────────────────────────
  {
    path: '/hub',
    name: 'ModuleSelection',
    component: ModuleSelection,
    meta: { title: 'Module Hub', requiresSystemAuth: true, nav: false },
  },

  // ── Operator Kiosk ─────────────────────────────────────────────────────
  {
    path: '/login',
    name: 'KioskLogin',
    component: KioskLogin,
    meta: { title: 'Operator Login', icon: 'person', requiresSystemAuth: true, nav: false },
  },

  // ── Core Modules ───────────────────────────────────────────────────────
  {
    path: '/production',
    name: 'ProductionLogger',
    component: ProductionLogger,
    meta: { title: 'Production Logger', icon: 'factory', requiresSystemAuth: true, nav: true },
  },
  {
    path: '/downtime',
    name: 'DowntimeTracker',
    component: DowntimeTracker,
    meta: { title: 'Downtime Tracker', icon: 'timer_off', requiresSystemAuth: true, nav: true },
  },
  {
    path: '/inventory',
    name: 'InventoryManager',
    component: InventoryManager,
    meta: { title: 'Inventory', icon: 'inventory_2', requiresSystemAuth: true, requiresAdmin: true, nav: true },
  },
  {
    path: '/cash',
    name: 'CashAdvanceHub',
    component: CashAdvanceHub,
    meta: { title: 'Cash & Advances', icon: 'payments', requiresSystemAuth: true, nav: true },
  },
  {
    path: '/payroll',
    name: 'PayrollDashboard',
    component: PayrollDashboard,
    meta: { title: 'Payroll', icon: 'account_balance_wallet', requiresSystemAuth: true, requiresAdmin: true, nav: true },
  },
  {
    path: '/quality',
    name: 'QualityControl',
    component: QualityControl,
    meta: { title: 'Quality Control', icon: 'verified_user', requiresSystemAuth: true, nav: true },
  },
  {
    path: '/dispatch',
    name: 'DispatchLogistics',
    component: DispatchLogistics,
    meta: { title: 'Dispatch', icon: 'local_shipping', requiresSystemAuth: true, nav: true },
  },
  {
    path: '/analytics',
    name: 'ExecutiveAnalytics',
    component: ExecutiveAnalytics,
    meta: { title: 'Analytics', icon: 'analytics', requiresSystemAuth: true, requiresAdmin: true, nav: true },
  },
  {
    path: '/settings',
    name: 'AdminSettings',
    component: AdminSettings,
    meta: { title: 'Settings', icon: 'settings', requiresSystemAuth: true, requiresAdmin: true, nav: true },
  },
  {
    path: '/pin-auth',
    name: 'PinAuth',
    component: PinAuth,
    meta: { title: 'Manager PIN', icon: 'lock', requiresSystemAuth: true, nav: false },
  },
  {
    path: '/profile',
    name: 'EmployeeProfileView',
    component: EmployeeProfileView,
    meta: { title: 'Employee Profile', icon: 'person', requiresSystemAuth: true, nav: true },
  },
]

// ─── Router Instance ───────────────────────────────────────────────────────
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// ─── Global Navigation Guard ───────────────────────────────────────────────
router.beforeEach((to) => {
  // Set document title
  document.title = `${to.meta.title ?? 'MES'} | Divider MES`

  // Pinia may not be mounted on the very first navigation — always allow boot screen
  if (!getActivePinia()) return true

  const sysAuth = useSystemAuthStore()

  // 1. If system is locked and destination requires system auth → bounce to boot
  if (to.meta.requiresSystemAuth && !sysAuth.isSystemUnlocked) {
    return { name: 'WelcomeAuth' }
  }

  // 2. If system is already unlocked and user manually navigates back to boot → push to hub
  if (to.name === 'WelcomeAuth' && sysAuth.isSystemUnlocked) {
    return { name: 'ModuleSelection' }
  }

  // 3. Admin PIN guard — protect requiresAdmin routes
  if (to.meta.requiresAdmin && sysAuth.isSystemUnlocked) {
    const mesStore = useMesStore()
    if (!mesStore.hasAdminAccess) {
      return { name: 'PinAuth', query: { returnTo: to.fullPath } }
    }
  }

  return true
})

export default router
export { routes }
