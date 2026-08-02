<template>
  <div class="min-h-screen bg-gray-50 text-slate-800">
    <!-- Desktop Sidebar (md+) -->
    <aside
      class="hidden md:fixed md:inset-y-0 md:left-0 md:w-64 md:flex md:flex-col md:overflow-y-auto md:bg-white md:border-r md:shadow-sm z-10"
      aria-label="Sidebar navigation"
    >
      <div class="flex items-center gap-3 px-4 py-4 border-b">
        <!-- Back button adapts into sidebar on md+ -->
        <button
          @click="handleBack"
          class="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900 focus:outline-none"
          aria-label="Back"
        >
          <svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M7.707 14.707a1 1 0 01-1.414 0L2.586 11l3.707-3.707a1 1 0 011.414 1.414L5.414 11l2.293 2.293a1 1 0 010 1.414z" clip-rule="evenodd"/>
            <path d="M13 11a1 1 0 100-2H8a1 1 0 100 2h5z"/>
          </svg>
          Back
        </button>
      </div>

      <nav class="flex-1 px-2 py-4 space-y-1">
        <!-- Example navigation items (replace/extend as needed) -->
        <a href="#/daily" class="group flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-100">
          <svg class="w-5 h-5 mr-3 text-slate-500 group-hover:text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 7h18M3 12h18M3 17h18"/></svg>
          Daily Production
        </a>

        <a href="#/payroll" class="group flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-100">
          <svg class="w-5 h-5 mr-3 text-slate-500 group-hover:text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 8v8M8 12h8"/></svg>
          Payroll
        </a>

        <a href="#/employees" class="group flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-100">
          <svg class="w-5 h-5 mr-3 text-slate-500 group-hover:text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 12a5 5 0 100-10 5 5 0 000 10z"/><path d="M21 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2"/></svg>
          Employees
        </a>

        <a href="#/analytics" class="group flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-100">
          <svg class="w-5 h-5 mr-3 text-slate-500 group-hover:text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 3v18h18"/></svg>
          Executive Analytics
        </a>

        <!-- Add more nav items here -->
      </nav>

      <div class="px-4 py-4 border-t">
        <button class="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-md bg-sky-600 text-white hover:bg-sky-700">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 12h14"/></svg>
          CLOCK IN
        </button>
      </div>
    </aside>

    <!-- Mobile Top App Bar -->
    <header class="fixed inset-x-0 top-0 z-30 flex items-center h-14 bg-white border-b md:hidden px-3">
      <div class="flex items-center gap-2 w-full">
        <!-- Hamburger -->
        <button
          @click="openDrawer"
          class="p-2 rounded-md text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
          aria-label="Open menu"
        >
          <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>

        <!-- Back button integrated into app-bar -->
        <button
          @click="handleBack"
          class="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900 focus:outline-none"
          aria-label="Back"
        >
          <span class="sr-only">Back</span>
          <svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M7.707 14.707a1 1 0 01-1.414 0L2.586 11l3.707-3.707a1 1 0 011.414 1.414L5.414 11l2.293 2.293a1 1 0 010 1.414z" clip-rule="evenodd"/>
            <path d="M13 11a1 1 0 100-2H8a1 1 0 100 2h5z"/>
          </svg>
        </button>

        <!-- Title slot or default title -->
        <div class="flex-1 px-2">
          <slot name="title">
            <h1 class="text-sm font-semibold truncate">Divider MES</h1>
          </slot>
        </div>

        <!-- Optional actions on the right -->
        <div class="flex items-center gap-2">
          <slot name="actions">
            <button class="p-2 rounded-md text-slate-700 hover:bg-slate-100 focus:outline-none" aria-label="Notifications">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5"/></svg>
            </button>
          </slot>
        </div>
      </div>
    </header>

    <!-- Mobile Drawer + Backdrop -->
    <div
      class="md:hidden"
      aria-hidden="!drawerOpen"
    >
      <!-- Backdrop -->
      <div
        class="fixed inset-0 z-40 transition-opacity duration-300"
        :class="drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'"
        @click="closeDrawer"
        aria-hidden="true"
      >
        <div class="absolute inset-0 bg-black/50"></div>
      </div>

      <!-- Drawer panel -->
      <nav
        class="fixed inset-y-0 left-0 z-50 w-64 max-w-full bg-white border-r transform transition-transform duration-300 ease-in-out"
        :class="drawerOpen ? 'translate-x-0' : '-translate-x-full'"
        role="dialog"
        aria-label="Mobile menu"
      >
        <div class="flex items-center gap-3 px-4 py-4 border-b">
          <button
            @click="closeDrawer"
            class="p-2 rounded-md text-slate-700 hover:bg-slate-100 focus:outline-none"
            aria-label="Close menu"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
          <div class="flex-1">
            <h2 class="text-sm font-semibold">Menu</h2>
          </div>
        </div>

        <div class="px-2 py-4 space-y-1">
          <a @click="closeDrawer" href="#/daily" class="group flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-100">
            <svg class="w-5 h-5 mr-3 text-slate-500 group-hover:text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 7h18M3 12h18M3 17h18"/></svg>
            Daily Production
          </a>

          <a @click="closeDrawer" href="#/payroll" class="group flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-100">
            <svg class="w-5 h-5 mr-3 text-slate-500 group-hover:text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 8v8M8 12h8"/></svg>
            Payroll
          </a>

          <a @click="closeDrawer" href="#/employees" class="group flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-100">
            <svg class="w-5 h-5 mr-3 text-slate-500 group-hover:text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 12a5 5 0 100-10 5 5 0 000 10z"/><path d="M21 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2"/></svg>
            Employees
          </a>

          <a @click="closeDrawer" href="#/analytics" class="group flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-100">
            <svg class="w-5 h-5 mr-3 text-slate-500 group-hover:text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 3v18h18"/></svg>
            Executive Analytics
          </a>
        </div>

        <div class="px-4 py-4 border-t">
          <button @click="closeDrawer" class="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-md bg-sky-600 text-white hover:bg-sky-700">
            CLOCK IN
          </button>
        </div>
      </nav>
    </div>

    <!-- Main content -->
    <main
      class="flex-1 min-h-screen pt-14 md:pt-0 md:pl-0"
      :class="{'md:pl-64': true}"
    >
      <div class="max-w-screen-xl mx-auto px-4 py-6">
        <slot />
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
let router
try {
  // In most apps vue-router is available; this is optional and non-fatal if unavailable.
  // If your app uses a router, uncomment the next line and ensure vue-router is installed.
  // import { useRouter } from 'vue-router'
  // router = useRouter()
} catch (e) {
  router = null
}

const drawerOpen = ref(false)

function openDrawer() {
  drawerOpen.value = true
}

function closeDrawer() {
  drawerOpen.value = false
}

function handleBack() {
  // Prefer router.back if available, fallback to window.history.back()
  if (router && typeof router.back === 'function') {
    router.back()
  } else if (window && window.history && window.history.length > 1) {
    window.history.back()
  } else {
    // as a fallback, emit a custom event so parent/layout consumers can handle navigation
    const ev = new CustomEvent('layout-back', { bubbles: true })
    window.dispatchEvent(ev)
  }
}

// Prevent background scrolling while the mobile drawer is open
watch(drawerOpen, (open) => {
  if (open) {
    document.documentElement.classList.add('overflow-hidden')
    document.body.classList.add('overflow-hidden', 'touch-none')
  } else {
    document.documentElement.classList.remove('overflow-hidden')
    document.body.classList.remove('overflow-hidden', 'touch-none')
  }
})

// Close on Escape key
function onKeyDown(e) {
  if (e.key === 'Escape' && drawerOpen.value) {
    closeDrawer()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  document.documentElement.classList.remove('overflow-hidden')
  document.body.classList.remove('overflow-hidden', 'touch-none')
})
</script>

<!-- No component-scoped CSS required; Tailwind handles styling. -->
