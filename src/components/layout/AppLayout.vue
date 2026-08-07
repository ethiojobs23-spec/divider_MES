<template>
  <div class="flex h-screen w-screen overflow-hidden bg-slate-900 text-slate-100 font-sans">
    <!-- Global Network Status Banner -->
    <NetworkBanner />

    <!-- ─── Mobile App Bar ────────────────────────────────────────────── -->
    <div class="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-800 border-b border-indigo-500/30 flex items-center justify-between px-4 z-40">
      <div class="flex items-center gap-3">
        <button @click="isMobileMenuOpen = true" class="p-2 -ml-2 text-indigo-400 hover:bg-slate-700/50 rounded-lg">
          <span class="material-symbols-rounded text-3xl">menu</span>
        </button>
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/30">
            ⚡
          </div>
          <span class="font-bold text-lg leading-tight">Divider MES</span>
        </div>
      </div>
      
      <!-- Mobile Back Button in App Bar -->
      <button @click="goBack" class="flex items-center justify-center w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg active:scale-95 transition-transform">
        <span class="material-symbols-rounded text-xl">arrow_back</span>
      </button>
    </div>

    <!-- ─── Mobile Drawer Overlay ─────────────────────────────────────── -->
    <Transition
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-300"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div 
        v-if="isMobileMenuOpen" 
        @click="isMobileMenuOpen = false"
        class="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
      ></div>
    </Transition>

    <!-- ─── Sidebar (Fixed on Desktop, Drawer on Mobile) ──────────────── -->
    <aside 
      class="fixed md:static inset-y-0 left-0 z-50 w-72 md:w-1/4 md:min-w-[260px] bg-slate-800 flex flex-col p-5 gap-3 border-r border-indigo-500/25 transition-transform duration-300 ease-in-out md:translate-x-0"
      :class="isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <!-- Close button (Mobile only) -->
      <button 
        @click="isMobileMenuOpen = false"
        class="md:hidden absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-700/50 rounded-full"
      >
        <span class="material-symbols-rounded">close</span>
      </button>

      <!-- Logo / Brand (Hidden on mobile since it's in app bar) -->
      <div class="hidden md:flex items-center gap-3 pb-3 border-b border-white/10">
        <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xl text-white">⚡</div>
        <div>
          <p class="font-bold text-base text-slate-100 leading-tight">Divider MES</p>
          <p class="text-[0.65rem] text-slate-400 tracking-wider uppercase">Factory Floor System</p>
        </div>
      </div>

      <!-- Live Clock + Shift Status -->
      <div class="bg-gradient-to-br from-indigo-500/15 to-purple-500/10 border border-indigo-500/30 rounded-xl p-3 text-center mt-6 md:mt-0">
        <p class="text-4xl font-extrabold text-slate-200 tracking-wide leading-none tabular-nums">{{ currentTime }}</p>
        <p class="text-xs text-slate-400 mt-1">{{ currentDate }}</p>
        <p class="inline-block mt-1.5 bg-indigo-500/30 text-indigo-300 text-[0.65rem] font-bold rounded-full px-2.5 py-0.5 tracking-wider">{{ mesStore.currentProductionWeek }}</p>
      </div>

      <!-- Global Auth Context Strip -->
      <div class="flex flex-wrap items-center gap-1.5 p-2 bg-black/25 rounded-lg border border-white/5">
        <div class="flex items-center gap-1 text-[0.65rem] font-bold tracking-wider px-2 py-0.5 rounded-full" :class="syncState.isOnline ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'">
          <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
          <span>{{ syncState.isOnline ? 'ONLINE' : 'OFFLINE' }}</span>
          <span v-if="syncState.pendingCount > 0" class="bg-red-500/30 text-red-300 text-[0.6rem] px-1.5 rounded-full font-extrabold ml-1">{{ syncState.pendingCount }}</span>
        </div>
        <div class="flex items-center gap-1 text-[0.65rem] text-indigo-300" v-if="sysAuth.authorizedManager">
          <span class="material-symbols-rounded text-sm">admin_panel_settings</span>
          <span>{{ sysAuth.authorizedManager }}</span>
        </div>
        <div class="flex items-center gap-1 text-[0.65rem] text-slate-400" v-if="sysAuth.shiftStartedAt">
          <span class="material-symbols-rounded text-sm">timer</span>
          <span>{{ sysAuth.shiftDuration }}</span>
        </div>
      </div>

      <!-- Active Operators List -->
      <div v-if="activeOperatorsList.length > 0" class="flex flex-col gap-2.5 bg-white/5 rounded-xl p-3 border border-white/10">
        <div class="flex justify-between items-center px-1">
           <span class="text-[0.65rem] text-slate-400 font-bold uppercase tracking-wider">Active Operators</span>
           <span class="text-[0.65rem] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-md font-black">{{ activeOperatorsList.length }}</span>
        </div>
        
        <div class="flex gap-2.5 overflow-x-auto pb-1 custom-scrollbar scroll-smooth">
          <button 
            v-for="op in activeOperatorsList" 
            :key="op.id"
            @click="mesStore.setOperator(op)"
            class="relative w-10 h-10 rounded-lg flex items-center justify-center font-extrabold text-white shrink-0 transition-all duration-200 hover:scale-105 active:scale-95"
            :class="[
              op.color || 'bg-slate-600', 
              mesStore.activeOperator?.id === op.id ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-800 shadow-lg shadow-indigo-500/30' : 'opacity-60 hover:opacity-100 grayscale hover:grayscale-0 scale-95'
            ]"
            :title="op.name"
          >
            <OperatorAvatar :avatar="op.avatar" :name="op.name" :color="op.color" size="md" />
          </button>
        </div>

        <div v-if="mesStore.activeOperator" class="mt-1 pt-2 border-t border-white/10 px-1">
          <p class="text-sm font-bold text-slate-100 truncate">{{ mesStore.activeOperator.name }}</p>
          <p class="text-xs text-slate-400 truncate">{{ mesStore.activeOperator.role }}</p>
        </div>
      </div>
      <div v-else class="text-center text-xs text-slate-400 p-3 border border-dashed border-white/10 rounded-lg">
        <span>No Operator Active</span>
      </div>

      <!-- Navigation -->
      <nav class="flex flex-col gap-1 flex-1 overflow-y-auto overflow-x-hidden">
        <router-link
          v-for="route in navRoutes"
          :key="route.path"
          :to="route.path"
          class="flex items-center gap-2.5 p-2.5 rounded-lg text-slate-400 text-sm font-semibold transition-colors duration-150 hover:bg-white/5 hover:text-slate-300 active-nav-item"
          active-class="bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20 hover:text-indigo-300"
          @click="isMobileMenuOpen = false"
        >
          <span class="material-symbols-rounded text-lg shrink-0">{{ route.meta.icon }}</span>
          <span class="flex-1 truncate">{{ route.meta.title }}</span>
          <span v-if="route.meta.requiresAdmin" class="material-symbols-rounded text-xs text-amber-500 opacity-70">lock</span>
        </router-link>
      </nav>

      <!-- Back Navigation (Hidden on mobile since it's in the app bar, wait, keep back to hub on mobile) -->
      <div class="flex gap-2 shrink-0 mt-2">
        <button @click="goBack" class="hidden md:flex items-center justify-center w-16 h-14 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-300 text-xl cursor-pointer transition-all hover:bg-indigo-500/20 hover:border-indigo-500/40 active:scale-95 shrink-0" title="Go back">
          <span class="material-symbols-rounded text-2xl">arrow_back</span>
        </button>
        <button v-if="sysAuth.currentRole === 'Supervisor'" @click="sysAuth.lockSystem(); router.replace('/welcome')" class="flex items-center justify-center gap-2.5 w-full min-h-[3.5rem] bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm font-extrabold tracking-wide cursor-pointer transition-all hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-300 active:scale-95 shrink-0">
          <span class="material-symbols-rounded text-2xl">lock</span>
          <span>Lock System</span>
        </button>
        <button v-else @click="router.push('/'); isMobileMenuOpen = false" class="flex items-center justify-center gap-2.5 w-full min-h-[3.5rem] bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-300 text-sm font-extrabold tracking-wide cursor-pointer transition-all hover:bg-indigo-500/20 hover:border-indigo-500/50 hover:text-indigo-200 active:scale-95 shrink-0">
          <span class="material-symbols-rounded text-2xl">home</span>
          <span>Back to Hub</span>
        </button>
      </div>
    </aside>

    <!-- ─── Main Content ──────────────────────────────────────────── -->
    <main class="flex-1 bg-slate-900 overflow-hidden flex flex-col pt-16 md:pt-0">
      <slot />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { routes } from '@/router/index.js'
import { useMesStore }        from '@/store/mesStore.js'
import { useSystemAuthStore } from '@/store/systemAuthStore.js'
import { syncState }          from '@/services/syncManager.js'
import NetworkBanner          from '@/components/ui/NetworkBanner.vue'
import OperatorAvatar         from '@/components/ui/OperatorAvatar.vue'

const router   = useRouter()
const mesStore = useMesStore()
const sysAuth  = useSystemAuthStore()

const { isMobileMenuOpen } = storeToRefs(sysAuth)

const activeOperatorsList = computed(() => {
  return mesStore.operators.filter(op => mesStore.isOperatorClockedIn(op.id))
})

// ─── Smart Back Navigation (never wipes Pinia state) ─────────────────────
function goBack() {
  if (window.history.length > 2) {
    router.back()
  } else {
    router.push('/hub')
  }
}

// ─── Live Clock ────────────────────────────────────────────────────────────
const now = ref(new Date())
let clockInterval

const pad = (n) => String(n).padStart(2, '0')

const currentTime = computed(() => {
  const d = now.value
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
})

const currentDate = computed(() =>
  now.value.toLocaleDateString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  })
)

onMounted(() => {
  clockInterval = setInterval(() => { now.value = new Date() }, 1000)
})
onUnmounted(() => clearInterval(clockInterval))

// ─── Nav Routes — only routes with meta.nav = true ────────────────────────
const navRoutes = computed(() => {
  return routes.filter(r => {
    if (!r.meta?.nav) return false
    if (sysAuth.currentRole === 'Supervisor') {
      const allowedSupervisorNames = [
        'LiveProductionDashboard',
        'DailyProductionLog',
        'AttendanceViewer',
        'ProductionBlockMatrix',
        'DowntimeTracker',
        'QualityControl',
        'SupervisorProfile'
      ]
      return allowedSupervisorNames.includes(r.name)
    }
    return true
  })
})
</script>

<style scoped>
/* Any required scoped CSS can go here, most UI handles by Tailwind */
.active-nav-item.router-link-exact-active {
  background-color: rgba(99, 102, 241, 0.2);
  color: rgb(165, 180, 252);
}
</style>
