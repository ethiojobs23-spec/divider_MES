<template>
  <div class="bg-background text-on-background h-screen w-screen overflow-hidden flex flex-col font-body-lg">
    <!-- Top App Bar (From Screen 2 & 3) -->
    <header class="bg-surface-container-highest flex justify-between items-center px-gutter w-full h-24 border-b-2 border-surface-border shrink-0 z-20 relative">
      <div class="flex items-center gap-4">
        <span class="material-symbols-outlined text-4xl text-primary">factory</span>
        <h1 class="font-headline-lg text-headline-lg font-bold text-primary tracking-tight">MES PRO-KINETIC</h1>
      </div>
      <div class="flex items-center gap-gutter">
        <button class="w-16 h-16 flex items-center justify-center rounded border-2 border-surface-border text-on-surface-variant hover:bg-surface-bright active:scale-95 transition-transform duration-100">
          <span class="material-symbols-outlined text-3xl">notifications</span>
        </button>
        <button class="w-16 h-16 flex items-center justify-center rounded border-2 border-surface-border text-on-surface-variant hover:bg-surface-bright active:scale-95 transition-transform duration-100">
          <span class="material-symbols-outlined text-3xl">settings</span>
        </button>
        <div class="flex items-center gap-4 border-l-2 border-surface-border pl-gutter ml-4">
          <div class="text-right">
            <p class="font-label-caps text-label-caps text-on-surface-variant">OPERATOR</p>
            <p class="text-sm font-bold text-secondary">SYSTEM OK</p>
          </div>
          <img class="w-16 h-16 rounded-full border-2 border-outline-variant object-cover" 
               src="https://lh3.googleusercontent.com/aida-public/AB6AXuCK9jRTAnAsXmsONqEYzV07onyeDccXBdd0BGjzqjdA3l90e_iOLkyy7YoJE5fuULJdN3bYpQcsfLPsLziauGndutL--7j1Bk-m8mY6WuwnYGeDbxcgjoXLrWqB3v1IimRwkYebE8M0aGCKkTnQNMVVUE5DmRc1fWZa_Sy8ppgUrx94ofY-WK3hkpwuhKuKjO1AxmnSngM_qd_JH1GSnbSdHGPrFSEqfAA3PXXYcg8ul929-QEjM9Bh" />
        </div>
      </div>
    </header>

    <div class="flex flex-1 h-[calc(100vh-6rem)] w-full overflow-hidden relative">
      <!-- Side Navigation (Adaptive based on active Tab) -->
      <aside class="w-sidebar-width bg-surface border-r-2 border-surface-border h-full flex flex-col shrink-0">
        <!-- Sidebar for Dashboard Tab -->
        <template v-if="activeTab === 'dashboard'">
          <div class="p-panel-padding border-b-2 border-surface-border bg-led-display flex flex-col items-center justify-center">
            <div class="font-display-num text-display-num text-secondary w-full text-center tracking-tighter">
              {{ currentTime }}
            </div>
            <div class="font-label-caps text-label-caps text-secondary-fixed mt-2">
              SHIFT A ACTIVE
            </div>
          </div>
          <div class="flex-1 overflow-y-auto px-4 py-6">
            <h3 class="font-label-caps text-label-caps text-outline-variant mb-4 px-2">ACTIVE TEAM MEMBERS</h3>
            <ul class="flex flex-col gap-2">
              <li v-for="member in teamMembers" :key="member.id">
                <button 
                  @click="currentEmployee = member"
                  :class="[
                    'w-full border rounded-lg h-16 flex items-center px-4 justify-between transition-colors duration-150',
                    currentEmployee.id === member.id 
                      ? 'bg-secondary-container text-on-secondary-container border-secondary-fixed-dim border-2' 
                      : 'text-on-surface-variant border-surface-border hover:bg-surface-container-high'
                  ]"
                >
                  <div class="flex items-center gap-3">
                    <img v-if="member.avatar" :src="member.avatar" class="w-10 h-10 rounded border border-secondary-fixed-dim object-cover" />
                    <div v-else class="w-10 h-10 rounded border border-surface-border bg-surface-container-highest flex items-center justify-center font-label-caps text-label-caps">{{ member.initials }}</div>
                    <span class="font-button-text text-button-text">{{ member.name }}</span>
                  </div>
                  <span class="w-3 h-3 rounded-full" :class="member.status === 'active' ? 'bg-secondary' : 'bg-error'"></span>
                </button>
              </li>
            </ul>
          </div>
          <div class="p-4 border-t-2 border-surface-border bg-surface-container-lowest flex flex-col gap-2">
             <button @click="activeTab = 'performance'" class="w-full text-on-surface-variant border border-surface-border rounded-lg h-16 flex items-center px-4 hover:bg-surface-container-high transition-colors duration-150 gap-4">
                <span class="material-symbols-outlined text-2xl">precision_manufacturing</span>
                <span class="font-label-caps text-label-caps">PERFORMANCE (Zelalem View)</span>
             </button>
             <button @click="activeTab = 'financials'" class="w-full text-on-surface-variant border border-surface-border rounded-lg h-16 flex items-center px-4 hover:bg-surface-container-high transition-colors duration-150 gap-4">
                <span class="material-symbols-outlined text-2xl">account_balance_wallet</span>
                <span class="font-label-caps text-label-caps">FINANCIALS (Teme View)</span>
             </button>
          </div>
        </template>

        <!-- Sidebar for Performance Tab -->
        <template v-else-if="activeTab === 'performance'">
          <div class="flex flex-col p-8 h-full">
            <div class="w-full aspect-square border-2 border-surface-border bg-surface-container-high relative mb-6 overflow-hidden">
              <img class="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCFxvNjmd3CoCz0ozRMiM33_60qZ_aLjn2373c3A2iwyZ-kCZQybT70itt2t4NtI4pPYlfy1kOI7G71BbrnsA3YGSkMKOJ32CeLhCbhpIz6DjbOOT2aCNJRvYxAZLkEjqpN17dnD7nwKLazcF4lwshSO-PW5QIajCApdc30vP5Pw5ii_dOnNBgoXdYmhl0m56-CXHaB-H-DaNaoU-0xGXGkZ2iqdHzsfAmvaOpftgSLtf4JGJ3Bnx7b" />
            </div>
            <div class="flex flex-col gap-2 mb-8 border-b-2 border-surface-border pb-8">
              <h1 class="font-headline-lg text-headline-lg text-primary uppercase">Zelalem</h1>
              <div class="flex justify-between items-center">
                <span class="font-label-caps text-label-caps text-on-surface-variant">ID: 8842</span>
                <div class="flex items-center gap-2">
                  <div class="w-3 h-3 rounded-full bg-secondary shadow-[0_0_8px_rgba(78,222,163,0.8)]"></div>
                  <span class="font-label-caps text-label-caps text-secondary">ACTIVE</span>
                </div>
              </div>
              <span class="font-label-caps text-label-caps text-outline mt-2">SHIFT A - LINE 02</span>
            </div>
            <div class="flex flex-col gap-4 flex-1">
              <div class="flex justify-between">
                <span class="font-label-caps text-label-caps text-on-surface-variant">CURRENT ROLE</span>
                <span class="font-body-lg text-body-lg text-on-surface uppercase">Lead Assembler</span>
              </div>
              <div class="flex justify-between">
                <span class="font-label-caps text-label-caps text-on-surface-variant">HOURS LOGGED</span>
                <span class="font-body-lg text-body-lg text-on-surface">06:42:15</span>
              </div>
            </div>
            <button @click="activeTab = 'dashboard'" class="w-full h-16 bg-surface-panel border-2 border-surface-border flex items-center justify-center gap-4 text-on-surface mb-4">
               <span class="material-symbols-outlined">arrow_back</span>
               <span class="font-button-text text-button-text uppercase">Back to Dashboard</span>
            </button>
            <button class="w-full h-touch-xl bg-surface-panel border-2 border-surface-border flex items-center justify-center gap-4 active:bg-error active:border-error-container active:text-on-error transition-colors mt-auto">
              <span class="material-symbols-outlined text-[32px]">logout</span>
              <span class="font-button-text text-button-text uppercase">Clock Out</span>
            </button>
          </div>
        </template>

        <!-- Sidebar for Financials Tab -->
        <template v-else-if="activeTab === 'financials'">
          <div class="p-panel-padding flex flex-col gap-8 h-full">
            <div class="flex flex-col items-center text-center gap-4 border-b-2 border-surface-border pb-8">
              <img class="w-32 h-32 rounded-full border-4 border-surface-container-high object-cover shadow-[0_0_0_2px_#4edea3]" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBYyR52qx60zzTOObb8LNm2yq5X12Ha9mx6Ydt0TIrSGtP00G4oEtQ5OQhM74r7VMFAUEs6d9KQOKt-BVpKWo0LDj2vxjnqQSLLrouupH_QtPLBxskGmZaRkL_XVGd43Sd5gDat_6vm2e2kcSw81F6pWK1FzeqG2N1Me_YKAT-ybpqPLxa5q9RTamqzmf-Xa7JAfXeUEpOLsWLRDkeSSqamvaBG7Pi0ZVHKBecpfN4ox_sNG4cUu8ZA" />
              <div>
                <h2 class="font-headline-lg text-headline-lg text-on-surface uppercase">Teme</h2>
                <p class="font-label-caps text-label-caps text-secondary mt-1">ID: EMP-8942</p>
                <p class="font-label-caps text-label-caps text-on-surface-variant mt-1">SHIFT B - FABRICATION</p>
              </div>
            </div>
            <div class="flex-1 flex flex-col gap-6">
              <div class="bg-surface-container p-6 border-2 border-surface-border rounded-lg">
                <p class="font-label-caps text-label-caps text-on-surface-variant mb-2">CURRENT BALANCE</p>
                <div class="bg-led-display py-4 px-6 rounded border border-surface-border text-center">
                  <span class="font-display-num text-display-num text-secondary">1,240</span>
                  <span class="font-label-caps text-label-caps text-secondary ml-2">BIRR</span>
                </div>
              </div>
              <div class="bg-surface-container p-6 border-2 border-surface-border rounded-lg">
                <p class="font-label-caps text-label-caps text-on-surface-variant mb-2">LAST ADVANCE</p>
                <div class="flex items-end justify-between">
                  <span class="font-headline-lg text-headline-lg text-error">200 BIRR</span>
                  <span class="font-label-caps text-label-caps text-on-surface-variant">OCT 24</span>
                </div>
              </div>
            </div>
            <div class="mt-auto">
              <button @click="activeTab = 'dashboard'" class="w-full min-h-[64px] bg-surface-panel border-2 border-surface-border text-on-surface hover:bg-surface-container-high transition-colors flex items-center justify-center gap-2 rounded">
                <span class="material-symbols-outlined">arrow_back</span>
                <span class="font-button-text text-button-text uppercase">RETURN TO ROSTER</span>
              </button>
            </div>
          </div>
        </template>
      </aside>

      <!-- Main Content Area -->
      <main class="w-main-width bg-surface-container-lowest p-gutter overflow-y-auto flex flex-col gap-gutter relative z-0">
        
        <!-- Dashboard Tab View -->
        <template v-if="activeTab === 'dashboard'">
          <div class="grid grid-cols-12 gap-gutter h-1/2 min-h-[300px]">
            <div class="col-span-5 bg-surface-panel border-2 border-surface-border rounded-xl p-6 flex flex-col items-center justify-center relative">
              <div class="absolute top-4 right-4 bg-secondary-container text-on-secondary-container px-4 py-2 rounded font-label-caps text-label-caps border border-secondary-fixed-dim flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-secondary-fixed-dim animate-pulse"></span> SHIFT ACTIVE
              </div>
              <div class="w-48 h-48 rounded-full border-4 border-surface-border mb-6 overflow-hidden relative bg-surface-container-highest">
                <img class="w-full h-full object-cover grayscale contrast-125" :src="currentEmployee.avatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBNwexln59hj46vrsAqJw4LrfcCL23YuiWxKubgJ5a_Y_n6lWto9iYi_9vlb6sH2rvF8xH_y_CPr8rYxqh-0IDUc0qj38rHZal9qfi14sl-WMMLA0wW7xgJpjTSdWAzLDWq9w2_Ky91rbYDPuoLb9mdbJrAh9MBO-DeY8vlI7x8Fu9KXbdtlzdtzLtiPKCct2vrWveJmzs8ZoqhChuPlpXZq-QRE3u2zOWtw-uu3j2INFXHMb6R9262'" />
              </div>
              <h1 class="font-headline-lg text-headline-lg text-on-surface uppercase mb-2">{{ currentEmployee.name }} C.</h1>
              <p class="font-label-caps text-label-caps text-outline">{{ currentEmployee.level }}</p>
            </div>
            <div class="col-span-7 bg-surface-panel border-2 border-surface-border rounded-xl p-8 flex flex-col">
              <h2 class="font-label-caps text-label-caps text-outline-variant mb-8 border-b-2 border-surface-border pb-4">CURRENT ASSIGNMENT</h2>
              <div class="flex-1 flex flex-col justify-center gap-8">
                <div class="flex items-center justify-between">
                  <span class="font-headline-lg text-headline-lg text-text-muted">LINE</span>
                  <span class="font-display-num text-display-num text-primary">04</span>
                </div>
                <div class="w-full h-px bg-surface-border"></div>
                <div class="flex items-center justify-between">
                  <span class="font-headline-lg text-headline-lg text-text-muted">STATION</span>
                  <span class="font-display-num text-display-num text-inverse-surface">B</span>
                </div>
                <div class="w-full h-px bg-surface-border"></div>
                <div class="flex items-center justify-between">
                  <span class="font-button-text text-button-text text-text-muted">START TIME</span>
                  <span class="font-headline-lg text-headline-lg text-on-surface">06:14 AM</span>
                </div>
              </div>
            </div>
          </div>
          <div class="grid grid-cols-12 gap-gutter h-1/2 min-h-[300px]">
            <div class="col-span-8 flex gap-gutter">
              <button class="flex-1 bg-primary-container text-on-primary-container border-2 border-primary-fixed rounded-xl flex flex-col items-center justify-center gap-4 hover:bg-primary-fixed shadow-[inset_0_0_0_2px_rgba(255,255,255,0.1)]">
                <span class="material-symbols-outlined text-6xl" style="font-variation-settings: 'FILL' 1;">free_breakfast</span>
                <span class="font-display-num text-6xl font-bold tracking-tight">LOG BREAK</span>
              </button>
              <button class="flex-1 bg-error-container text-on-error-container border-2 border-error rounded-xl flex flex-col items-center justify-center gap-4 hover:bg-error active:bg-on-error active:text-error-container shadow-[inset_0_0_0_2px_rgba(255,255,255,0.1)]">
                <span class="material-symbols-outlined text-6xl" style="font-variation-settings: 'FILL' 1;">power_settings_new</span>
                <span class="font-display-num text-6xl font-bold tracking-tight">END SHIFT</span>
              </button>
            </div>
            <div class="col-span-4 bg-surface-container border-2 border-surface-border rounded-xl flex flex-col">
              <div class="p-4 border-b-2 border-surface-border bg-surface-panel rounded-t-xl flex items-center justify-between">
                <span class="font-label-caps text-label-caps text-outline">RECENT ALERTS</span>
                <span class="material-symbols-outlined text-outline-variant">warning</span>
              </div>
              <div class="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
                <div class="p-4 border-l-4 border-secondary bg-surface rounded flex flex-col gap-2">
                  <span class="font-label-caps text-label-caps text-secondary">SAFETY REMINDER - 08:00 AM</span>
                  <p class="font-body-lg text-body-lg text-on-surface">Standard PPE check required before transitioning to Sector 7.</p>
                </div>
                <div class="p-4 border-l-4 border-outline-variant bg-surface rounded flex flex-col gap-2">
                  <span class="font-label-caps text-label-caps text-outline-variant">SYSTEM MSG - 06:15 AM</span>
                  <p class="font-body-lg text-body-lg text-on-surface">Clock-in successful. Daily quota updated.</p>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- Performance Tab View -->
        <template v-else-if="activeTab === 'performance'">
          <header class="flex justify-between items-center h-16 border-b-2 border-surface-border flex-shrink-0 mb-4">
            <h2 class="font-headline-lg text-headline-lg text-on-surface uppercase">Operator Performance: Zelalem</h2>
            <div class="flex gap-4">
              <button class="w-16 h-16 bg-surface-container border-2 border-surface-border flex items-center justify-center text-on-surface-variant hover:bg-inverse-primary hover:text-on-primary-fixed">
                <span class="material-symbols-outlined text-[32px]">refresh</span>
              </button>
            </div>
          </header>
          <div class="grid grid-cols-3 gap-gutter flex-shrink-0">
            <div class="bg-led-display border-2 border-surface-border flex flex-col py-8 px-6 h-[200px] justify-between relative overflow-hidden">
              <span class="font-label-caps text-label-caps text-outline z-10 relative">TOTAL UNITS (TODAY)</span>
              <span class="font-display-num text-display-num text-primary tracking-tighter self-end z-10 relative">1,402</span>
              <div class="absolute inset-0 bg-primary opacity-5 mix-blend-screen pointer-events-none"></div>
            </div>
            <div class="bg-led-display border-2 border-surface-border flex flex-col py-8 px-6 h-[200px] justify-between relative overflow-hidden">
              <span class="font-label-caps text-label-caps text-outline z-10 relative">EFFICIENCY %</span>
              <div class="flex items-end justify-end gap-2 z-10 relative">
                <span class="material-symbols-outlined text-secondary text-[48px] leading-none mb-4">trending_up</span>
                <span class="font-display-num text-display-num text-secondary tracking-tighter">98.4</span>
              </div>
              <div class="absolute inset-0 bg-secondary opacity-5 mix-blend-screen pointer-events-none"></div>
            </div>
            <div class="bg-led-display border-2 border-surface-border flex flex-col py-8 px-6 h-[200px] justify-between relative overflow-hidden">
              <span class="font-label-caps text-label-caps text-outline z-10 relative">TOTAL WASTE</span>
              <span class="font-display-num text-display-num text-error tracking-tighter self-end z-10 relative">07</span>
              <div class="absolute inset-0 bg-error opacity-5 mix-blend-screen pointer-events-none"></div>
            </div>
          </div>
          <div class="flex-1 bg-surface-container border-2 border-surface-border flex flex-col min-h-[300px]">
            <div class="h-16 border-b-2 border-surface-border flex items-center px-6 bg-surface-container-high flex-shrink-0">
              <div class="w-1/4 font-label-caps text-label-caps text-on-surface-variant">TIME</div>
              <div class="w-1/3 font-label-caps text-label-caps text-on-surface-variant">VARIANT</div>
              <div class="w-1/4 font-label-caps text-label-caps text-on-surface-variant text-right">QUANTITY</div>
              <div class="w-1/6 font-label-caps text-label-caps text-on-surface-variant text-right">STATUS</div>
            </div>
            <div class="flex-1 flex flex-col overflow-y-auto">
              <div v-for="(log, idx) in activityLogs" :key="idx" 
                   class="border-b border-surface-border flex items-center px-6 transition-colors min-h-[64px]"
                   :class="log.status === 'REJECT' ? 'bg-error-container/20 hover:bg-error-container/40' : 'bg-surface hover:bg-surface-bright'">
                <div class="w-1/4 font-label-caps text-label-caps" :class="log.status === 'REJECT' ? 'text-error' : 'text-on-surface'">{{ log.time }}</div>
                <div class="w-1/3 font-body-lg text-body-lg uppercase font-bold tracking-wide" :class="log.status === 'REJECT' ? 'text-error' : 'text-on-surface'">{{ log.variant }}</div>
                <div class="w-1/4 font-display-num text-[32px] leading-none text-right tracking-tight" :class="log.status === 'REJECT' ? 'text-error' : 'text-on-surface'">{{ log.qty }}</div>
                <div class="w-1/6 flex justify-end">
                  <span class="font-label-caps text-label-caps px-3 py-1 border"
                        :class="log.status === 'REJECT' ? 'bg-error-container text-on-error-container border-error' : 'bg-secondary-container text-on-secondary-container border-secondary-fixed-dim'">
                    {{ log.status }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <button class="w-full h-touch-xl bg-inverse-primary border-2 border-surface-border flex items-center justify-center gap-4 text-on-primary-fixed hover:bg-primary-container flex-shrink-0 mt-4">
            <span class="font-button-text text-button-text uppercase tracking-widest">View Full Logs</span>
            <span class="material-symbols-outlined text-[32px]">arrow_forward</span>
          </button>
        </template>

        <!-- Financials Tab View -->
        <template v-else-if="activeTab === 'financials'">
          <header class="mb-8 border-b-2 border-surface-border pb-6 flex justify-between items-end">
            <div>
              <p class="font-label-caps text-label-caps text-on-surface-variant mb-2">PROFILE OVERVIEW</p>
              <h2 class="font-headline-lg text-headline-lg text-primary uppercase">FINANCIAL HISTORY & ADVANCES</h2>
            </div>
            <button class="h-touch-min px-8 bg-surface-panel border-2 border-surface-border text-on-surface font-button-text text-button-text flex items-center gap-2 hover:bg-surface-container-high">
              <span class="material-symbols-outlined">print</span>
              PRINT LEDGER
            </button>
          </header>
          <div class="grid grid-cols-12 gap-gutter flex-1 min-h-[400px]">
            <div class="col-span-8 flex flex-col gap-6 h-full">
              <div class="bg-surface-container border-2 border-surface-border rounded-lg flex-1 flex flex-col overflow-hidden">
                <div class="bg-surface-panel p-4 border-b-2 border-surface-border grid grid-cols-4 gap-4 font-label-caps text-label-caps text-on-surface-variant">
                  <div>DATE</div><div>TYPE</div><div class="text-right">AMOUNT</div><div class="text-center">STATUS</div>
                </div>
                <div class="overflow-y-auto flex-1">
                  <div v-for="(tx, idx) in transactions" :key="idx" class="grid grid-cols-4 gap-4 p-4 border-b border-surface-border h-16 items-center hover:bg-surface-bright" :class="{'opacity-50': tx.old}">
                    <div class="font-label-caps text-label-caps text-on-surface">{{ tx.date }}</div>
                    <div class="font-label-caps text-label-caps flex items-center gap-2" :class="tx.color">
                      <span class="material-symbols-outlined text-sm">{{ tx.icon }}</span> {{ tx.type }}
                    </div>
                    <div class="font-headline-lg-mobile text-headline-lg-mobile text-right" :class="tx.color">{{ tx.amount }}</div>
                    <div class="flex justify-center">
                      <div class="flex items-center gap-2 px-3 py-1 rounded-full border" :class="tx.statusClass">
                        <span class="w-2 h-2 rounded-full" :class="tx.dotClass"></span>
                        <span class="font-label-caps text-label-caps text-xs">{{ tx.status }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="bg-surface-panel border-2 border-surface-border rounded-lg p-6 shrink-0">
                <div class="flex justify-between items-center mb-4">
                  <h3 class="font-label-caps text-label-caps text-on-surface-variant">LATEST TRANSACTION VERIFICATION</h3>
                  <span class="text-sm font-bold text-secondary">REF: ADV-8921-X</span>
                </div>
                <div class="bg-surface-dim border border-surface-border h-32 flex items-center justify-center relative overflow-hidden">
                  <img class="absolute inset-0 w-full h-full object-contain opacity-50 mix-blend-screen" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCZdn9BHN3HIYFOc6weuRiIRnFZP6w5u9N9_rV8tKAbKwjWsnlKeIgjB7c3P3W-XCenuM7Y6_4oe-yaLpXzBrpbI3LXZXvVX01NDvyhdxKw7I-mp264uJbl4Tb6XMCYvwjq3Kz1O651dL-z3PSz3LYXoQSLeD6YUkES_XOE5DWmoSXxf1VVP8hhJZQNy7qcCDWySjO9-4SKJJw48eRQ3mO6DFREJ3t7taYedz1VD6hysVPWdFySyB35" />
                  <span class="font-label-caps text-label-caps text-on-surface/50 z-10 bg-surface-dim/80 px-2">DIGITAL SIGNATURE CAPTURE</span>
                </div>
              </div>
            </div>
            <div class="col-span-4 flex flex-col gap-6">
              <button class="w-full h-touch-xl bg-primary-container border-2 border-primary-container text-on-primary-container hover:bg-primary flex flex-col items-center justify-center gap-2 rounded">
                <span class="material-symbols-outlined text-4xl">account_balance_wallet</span>
                <span class="font-button-text text-button-text uppercase">REQUEST ADVANCE</span>
              </button>
              <button class="w-full h-touch-xl bg-surface-panel border-2 border-surface-border text-on-surface hover:bg-surface-bright flex flex-col items-center justify-center gap-2 rounded">
                <span class="material-symbols-outlined text-4xl">receipt_long</span>
                <span class="font-button-text text-button-text uppercase">LOG EXPENSE</span>
              </button>
              <div class="bg-surface-container border-2 border-surface-border rounded-lg p-6 mt-auto">
                <h4 class="font-label-caps text-label-caps text-on-surface-variant border-b border-surface-border pb-2 mb-4">ADVANCE POLICY LIMITS</h4>
                <ul class="space-y-4">
                  <li class="flex justify-between items-center"><span class="font-body-lg text-body-lg text-on-surface">Max Monthly Advance</span><span class="font-label-caps text-label-caps text-on-surface">500 BIRR</span></li>
                  <li class="flex justify-between items-center"><span class="font-body-lg text-body-lg text-on-surface">Remaining This Month</span><span class="font-label-caps text-label-caps text-secondary font-bold">300 BIRR</span></li>
                  <li class="flex justify-between items-center"><span class="font-body-lg text-body-lg text-on-surface">Approval Required Above</span><span class="font-label-caps text-label-caps text-error">150 BIRR</span></li>
                </ul>
                <div class="mt-6 p-4 bg-error-container/20 border border-error-container/50 rounded flex gap-3 items-start">
                  <span class="material-symbols-outlined text-error">warning</span>
                  <p class="font-label-caps text-label-caps text-error text-xs leading-tight">ADVANCE REQUESTS REQUIRE SUPERVISOR OVERRIDE IF EXCEEDING THRESHOLD.</p>
                </div>
              </div>
            </div>
          </div>
        </template>

      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const activeTab = ref('dashboard');
const currentTime = ref('');
let timer = null;

const teamMembers = ref([
  { id: '1', name: 'ABEN', initials: 'AB', status: 'active', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC-a_xAs1sKTE3bRIlJWMFX4rs1nf-42fhZrMR0rv-LFMzKJiGrkRlp6W5k6d8dPWqGCyPIxfmxSDPBDzmyah6-wuJBwADYKVNJhxGudZeubcDmy4soPQ_s4maQWdpqIpCYSOYXrBOL65QHiiQcB9gk3l57c46mryqLs_ebzM9T4gZrQPc9YL94jioVhf1Vw1FGW84o_seeIQBm4skdxVA2yBvcI1elxDhFrX8ntEdOTB7xNkn0nnYN', level: 'OPERATOR LEVEL 3' },
  { id: '2', name: 'SARAH M.', initials: 'SM', status: 'active', avatar: '', level: 'ASSEMBLER 1' },
  { id: '3', name: 'JAMES T.', initials: 'JT', status: 'inactive', avatar: '', level: 'TECHNICIAN' },
]);
const currentEmployee = ref(teamMembers.value[0]);

const activityLogs = ref([
  { time: '14:30:22', variant: 'PT-X99-ALPHA', qty: '250', status: 'OK' },
  { time: '13:45:10', variant: 'PT-X99-BETA', qty: '120', status: 'OK' },
  { time: '12:15:05', variant: 'PT-X99-ALPHA', qty: '500', status: 'OK' },
  { time: '11:02:44', variant: 'PT-X99-GAMMA', qty: '07', status: 'REJECT' },
  { time: '09:30:00', variant: 'PT-X99-ALPHA', qty: '525', status: 'OK' }
]);

const transactions = ref([
  { date: '24 OCT 2023', type: 'ADVANCE', amount: '-200.00', status: 'CLEARED', color: 'text-error', icon: 'call_made', statusClass: 'bg-secondary-container/20 text-secondary border-secondary/30', dotClass: 'bg-secondary' },
  { date: '15 OCT 2023', type: 'TOOL EXPENSE', amount: '45.00', status: 'LOGGED', color: 'text-primary', icon: 'inventory', statusClass: 'bg-surface-variant text-on-surface-variant border-outline', dotClass: 'bg-outline' },
  { date: '01 OCT 2023', type: 'PAYROLL DEP', amount: '+1,400.00', status: 'CLEARED', color: 'text-secondary', icon: 'payments', statusClass: 'bg-secondary-container/20 text-secondary border-secondary/30', dotClass: 'bg-secondary' },
  { date: '12 SEP 2023', type: 'ADVANCE', amount: '-150.00', status: 'CLEARED', color: 'text-error', icon: 'call_made', statusClass: 'bg-secondary-container/20 text-secondary border-secondary/30', dotClass: 'bg-secondary', old: true }
]);

const updateClock = () => {
  const now = new Date();
  currentTime.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

onMounted(() => {
  updateClock();
  timer = setInterval(updateClock, 1000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<style scoped>
.time-colon {
  animation: blink 1s step-start infinite;
}
@keyframes blink {
  50% { opacity: 0; }
}
</style>
