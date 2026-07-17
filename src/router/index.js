import { createRouter, createWebHistory } from 'vue-router'
import KioskLogin       from '@/views/KioskLogin.vue'
import ProductionLogger from '@/views/ProductionLogger.vue'
import DowntimeTracker  from '@/views/DowntimeTracker.vue'
import InventoryManager from '@/views/InventoryManager.vue'
import CashAdvanceHub   from '@/views/CashAdvanceHub.vue'
import PayrollDashboard from '@/views/PayrollDashboard.vue'
import QualityControl    from '@/views/QualityControl.vue'
import DispatchLogistics from '@/views/DispatchLogistics.vue'
import ExecutiveAnalytics from '@/views/ExecutiveAnalytics.vue'
import AdminSettings      from '@/views/AdminSettings.vue'

const routes = [
  {
    path: '/',
    redirect: '/login',
  },
  {
    path: '/login',
    name: 'KioskLogin',
    component: KioskLogin,
    meta: { title: 'Operator Login', icon: 'person', nav: false },
  },
  {
    path: '/production',
    name: 'ProductionLogger',
    component: ProductionLogger,
    meta: { title: 'Production Logger', icon: 'factory', nav: true },
  },
  {
    path: '/downtime',
    name: 'DowntimeTracker',
    component: DowntimeTracker,
    meta: { title: 'Downtime Tracker', icon: 'timer_off', nav: true },
  },
  {
    path: '/inventory',
    name: 'InventoryManager',
    component: InventoryManager,
    meta: { title: 'Inventory', icon: 'inventory_2', nav: true },
  },
  {
    path: '/cash',
    name: 'CashAdvanceHub',
    component: CashAdvanceHub,
    meta: { title: 'Cash & Advances', icon: 'payments', nav: true },
  },
  {
    path: '/payroll',
    name: 'PayrollDashboard',
    component: PayrollDashboard,
    meta: { title: 'Payroll', icon: 'account_balance_wallet', nav: true },
  },
  {
    path: '/quality',
    name: 'QualityControl',
    component: QualityControl,
    meta: { title: 'Quality Control', icon: 'verified_user', nav: true },
  },
  {
    path: '/dispatch',
    name: 'DispatchLogistics',
    component: DispatchLogistics,
    meta: { title: 'Dispatch', icon: 'local_shipping', nav: true },
  },
  {
    path: '/analytics',
    name: 'ExecutiveAnalytics',
    component: ExecutiveAnalytics,
    meta: { title: 'Analytics', icon: 'analytics', nav: true },
  },
  {
    path: '/settings',
    name: 'AdminSettings',
    component: AdminSettings,
    meta: { title: 'Settings', icon: 'settings', nav: true },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// Navigation guard – set document title
router.beforeEach((to) => {
  document.title = `${to.meta.title ?? 'MES'} | Divider MES`
})

export default router
export { routes }
