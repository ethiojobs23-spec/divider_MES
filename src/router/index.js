import { createRouter, createWebHistory } from 'vue-router'
import { getActivePinia } from 'pinia'
import { useMesStore } from '@/store/mesStore.js'
import { useSystemAuthStore } from '@/store/systemAuthStore.js'

// ─── Route Components ──────────────────────────────────────────────────────
import WelcomeAuth           from '@/views/WelcomeAuth.vue'
import ModuleSelection       from '@/views/ModuleSelection.vue'
import KioskLogin            from '@/views/KioskLogin.vue'
import ProductionLogger      from '@/views/ProductionLogger.vue'
import LiveProductionDashboard from '@/views/LiveProductionDashboard.vue'
import DowntimeTracker       from '@/views/DowntimeTracker.vue'
import InventoryDashboard    from '@/views/InventoryDashboard.vue'
import CashAdvanceHub        from '@/views/CashAdvanceHub.vue'
import PayrollDashboard      from '@/views/PayrollDashboard.vue'
import QualityControl        from '@/views/QualityControl.vue'
import DispatchLogistics     from '@/views/DispatchLogistics.vue'
import ExecutiveAnalytics    from '@/views/ExecutiveAnalytics.vue'
import AdminSettings         from '@/views/AdminSettings.vue'
import PinAuth               from '@/views/PinAuth.vue'
import EmployeeProfileView   from '@/views/EmployeeProfileView.vue'
import DailyProductionLog    from '@/views/DailyProductionLog.vue'
import ProductionBlockMatrix from '@/views/ProductionBlockMatrix.vue'
import HourlyWageTracker     from '@/views/HourlyWageTracker.vue'
import CompanyExpenses       from '@/views/CompanyExpenses.vue'
import EmployeeDashboard     from '@/views/employee/EmployeeDashboard.vue'
import AttendanceViewer      from '@/views/AttendanceViewer.vue'
import CustomersManager      from '@/views/CustomersManager.vue'
import ShiftApprovals        from '@/views/ShiftApprovals.vue'

// ─── Route Definitions ─────────────────────────────────────────────────────
const routes = [
  // ── Public boot screen ─────────────────────────────────────────────────
  {
    path: '/',
    name: 'WelcomeAuth',
    component: WelcomeAuth,
    meta: { title: 'System Boot', requiresSystemAuth: false, nav: false },
  },

  // ── Module hub ─────────────────────────────────────────────────────────
  {
    path: '/hub',
    name: 'ModuleSelection',
    component: ModuleSelection,
    meta: { title: 'Module Hub', requiresSystemAuth: true, nav: false },
  },

  // ── Employee Portal ────────────────────────────────────────────────────
  {
    path: '/my-portal',
    name: 'EmployeeDashboard',
    component: EmployeeDashboard,
    meta: { title: 'My Dashboard', requiresSystemAuth: true, nav: false },
  },

  // ── Operator Kiosk / Attendance ────────────────────────────────────────
  {
    path: '/login',
    name: 'KioskLogin',
    component: KioskLogin,
    meta: { title: 'Attendance', icon: 'how_to_reg', requiresSystemAuth: true, nav: true },
  },

  // ── Core Production Modules ────────────────────────────────────────────
  {
    path: '/production',
    name: 'ProductionLogger',
    component: ProductionLogger,
    meta: { title: 'Production', icon: 'factory', requiresSystemAuth: true, nav: true },
  },
  {
    path: '/live-production',
    name: 'LiveProductionDashboard',
    component: LiveProductionDashboard,
    meta: { title: 'Live Production', icon: 'monitoring', requiresSystemAuth: true, nav: true },
  },
  {
    path: '/daily-log',
    name: 'DailyProductionLog',
    component: DailyProductionLog,
    meta: { title: 'Daily Log', icon: 'edit_note', requiresSystemAuth: true, nav: true },
  },
  {
    path: '/block-matrix',
    name: 'ProductionBlockMatrix',
    component: ProductionBlockMatrix,
    meta: { title: 'Block Matrix', icon: 'grid_view', requiresSystemAuth: true, requiresAdmin: true, nav: true },
  },
  {
    path: '/downtime',
    name: 'DowntimeTracker',
    component: DowntimeTracker,
    meta: { title: 'Downtime', icon: 'timer_off', requiresSystemAuth: true, requiresAdmin: true, nav: true },
  },
  {
    path: '/attendance-log',
    name: 'AttendanceViewer',
    component: AttendanceViewer,
    meta: { title: 'Attendance Log', icon: 'recent_patient', requiresSystemAuth: true, nav: true },
  },

  // ── Inventory ──────────────────────────────────────────────────────────
  {
    path: '/inventory',
    name: 'InventoryDashboard',
    component: InventoryDashboard,
    meta: { title: 'Inventory', icon: 'inventory_2', requiresSystemAuth: true, requiresAdmin: true, nav: true },
  },

  // ── Financial ──────────────────────────────────────────────────────────
  {
    path: '/cash',
    name: 'CashAdvanceHub',
    component: CashAdvanceHub,
    meta: { title: 'Cash & Loans', icon: 'payments', requiresSystemAuth: true, nav: true },
  },
  {
    path: '/payroll',
    name: 'PayrollDashboard',
    component: PayrollDashboard,
    meta: { title: 'Payroll', icon: 'account_balance_wallet', requiresSystemAuth: true, requiresAdmin: true, nav: true },
  },
  {
    path: '/hourly-wage',
    name: 'HourlyWageTracker',
    component: HourlyWageTracker,
    meta: { title: 'Hourly Wage', icon: 'schedule', requiresSystemAuth: true, nav: true },
  },
  {
    path: '/expenses',
    name: 'CompanyExpenses',
    component: CompanyExpenses,
    meta: { title: 'Expenses', icon: 'receipt_long', requiresSystemAuth: true, requiresAdmin: true, nav: true },
  },

  // ── Operations ─────────────────────────────────────────────────────────
  {
    path: '/quality-control',
    name: 'QualityControl',
    component: QualityControl,
    meta: { title: 'Quality', icon: 'verified_user', requiresSystemAuth: true, requiresAdmin: true, nav: true },
  },
  {
    path: '/dispatch',
    name: 'DispatchLogistics',
    component: DispatchLogistics,
    meta: { title: 'Dispatch', icon: 'local_shipping', requiresSystemAuth: true, nav: true },
  },
  {
    path: '/customers',
    name: 'CustomersManager',
    component: CustomersManager,
    meta: { title: 'Customers', icon: 'group', requiresSystemAuth: true, requiresAdmin: true, nav: true },
  },

  // ── Analytics & Admin ──────────────────────────────────────────────────
  {
    path: '/shift-approvals',
    name: 'ShiftApprovals',
    component: ShiftApprovals,
    meta: { title: 'Shift Approvals', icon: 'task_alt', requiresSystemAuth: true, requiresAdmin: true, nav: true },
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
    path: '/profile',
    name: 'EmployeeProfileView',
    component: EmployeeProfileView,
    meta: { title: 'Profiles', icon: 'person', requiresSystemAuth: true, nav: true },
  },

  // ── Auth helpers ───────────────────────────────────────────────────────
  {
    path: '/pin-auth',
    name: 'PinAuth',
    component: PinAuth,
    meta: { title: 'Manager PIN', icon: 'lock', requiresSystemAuth: true, nav: false },
  },
]

// ─── Router Instance ───────────────────────────────────────────────────────
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// ─── Global Navigation Guard ───────────────────────────────────────────────
router.beforeEach((to) => {
  document.title = `${to.meta.title ?? 'MES'} | Divider MES`

  if (!getActivePinia()) return true

  const sysAuth = useSystemAuthStore()

  // 1. System locked → boot screen
  if (to.meta.requiresSystemAuth && !sysAuth.isSystemUnlocked) {
    return { name: 'WelcomeAuth' }
  }

  // 2. Already unlocked + navigating to boot → hub
  if (to.name === 'WelcomeAuth' && sysAuth.isSystemUnlocked) {
    if (sysAuth.currentRole === 'employee') {
      return { name: 'EmployeeDashboard' }
    }
    return { name: 'ModuleSelection' }
  }

  // 3. Employee role restrictions
  if (sysAuth.currentRole === 'employee') {
    if (to.path !== '/my-portal') {
      return { path: '/my-portal' }
    }
  }

  // 4. Admin-gated routes → PIN challenge (then return)
  if (to.meta.requiresAdmin && sysAuth.isSystemUnlocked) {
    // If they logged in as Admin initially, automatically grant secondary access
    if (sysAuth.currentRole === 'admin' || sysAuth.currentRole === 'manager') {
      sysAuth.grantAdminAccess()
    }
    
    if (!sysAuth.hasAdminAccess) {
      return { name: 'PinAuth', query: { returnTo: to.fullPath } }
    }
  }

  return true
})
router.afterEach(() => {
  if (getActivePinia()) {
    const sysAuth = useSystemAuthStore()
    if (sysAuth) sysAuth.isMobileMenuOpen = false
  }
})

export default router
export { routes }
