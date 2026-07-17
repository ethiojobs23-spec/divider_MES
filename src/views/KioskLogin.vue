<template>
  <div class="login-page">
    <!-- Header -->
    <div class="login-header">
      <div class="header-logo">⚡</div>
      <div>
        <h1 class="header-title">Divider Manufacturing System</h1>
        <p class="header-sub">Select your operator profile to continue</p>
      </div>
      <div class="header-week">
        <span class="week-label">Production Week</span>
        <span class="week-value">{{ store.currentProductionWeek }}</span>
      </div>
    </div>

    <!-- Operator Grid -->
    <div class="operator-grid">
      <button
        v-for="op in store.operators"
        :key="op.id"
        class="operator-card"
        :class="{ 'operator-card--active': store.isOperatorClockedIn(op.id) }"
        @click="openModal(op)"
      >
        <div class="card-avatar" :class="op.color">{{ op.avatar }}</div>
        <p class="card-name">{{ op.name }}</p>
        <p class="card-role">{{ op.role }}</p>
        <div class="card-status" :class="store.isOperatorClockedIn(op.id) ? 'status--in' : 'status--out'">
          <span class="status-dot" />
          {{ store.isOperatorClockedIn(op.id) ? 'CLOCKED IN' : 'CLOCKED OUT' }}
        </div>
      </button>
    </div>

    <!-- Modal Overlay -->
    <Transition name="fade">
      <div v-if="modal.open" class="modal-overlay" @click.self="closeModal">
        <div class="modal-card">
          <div class="modal-avatar" :class="modal.operator?.color">{{ modal.operator?.avatar }}</div>
          <h2 class="modal-name">{{ modal.operator?.name }}</h2>
          <p class="modal-role">{{ modal.operator?.role }}</p>

          <div class="modal-time">{{ currentTime }}</div>

          <div class="modal-actions">
            <button
              class="modal-btn modal-btn--in"
              :disabled="store.isOperatorClockedIn(modal.operator?.id)"
              @click="handleClockIn"
            >
              <span class="material-symbols-rounded">login</span>
              CLOCK IN
            </button>
            <button
              class="modal-btn modal-btn--out"
              :disabled="!store.isOperatorClockedIn(modal.operator?.id)"
              @click="handleClockOut"
            >
              <span class="material-symbols-rounded">logout</span>
              CLOCK OUT
            </button>
          </div>

          <button class="modal-close" @click="closeModal">
            <span class="material-symbols-rounded">close</span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMesStore } from '@/store/mesStore.js'

const store  = useRouter ? useMesStore() : useMesStore()
const router = useRouter()

// Reuse store directly
const mesStore = useMesStore()

const modal = ref({ open: false, operator: null })

const pad = (n) => String(n).padStart(2, '0')
const currentTime = computed(() => {
  const d = new Date()
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
})

function openModal(op)  { modal.value = { open: true, operator: op } }
function closeModal()   { modal.value = { open: false, operator: null } }

function handleClockIn() {
  mesStore.clockIn(modal.value.operator)
  closeModal()
  router.push('/production')
}

function handleClockOut() {
  mesStore.clockOut(modal.value.operator)
  closeModal()
}
</script>

<style scoped>
.login-page {
  width: 100vw;
  height: 100vh;
  background: #0f172a;
  display: flex;
  flex-direction: column;
  padding: 2rem 2.5rem;
  overflow: hidden;
}

/* Header */
.login-header {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  margin-bottom: 2rem;
}
.header-logo {
  font-size: 2.5rem;
  background: linear-gradient(135deg,#6366f1,#8b5cf6);
  border-radius: .75rem;
  width: 3.5rem;
  height: 3.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.header-title { font-size: 1.5rem; font-weight: 800; color: #f1f5f9; }
.header-sub   { font-size: .8rem;  color: #64748b; margin-top: .2rem; }
.header-week  { margin-left: auto; text-align: right; }
.week-label   { display: block; font-size: .65rem; color: #64748b; letter-spacing: .08em; text-transform: uppercase; }
.week-value   { font-size: 1.1rem; font-weight: 700; color: #a5b4fc; }

/* Operator Grid */
.operator-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
  flex: 1;
}

.operator-card {
  background: #1e293b;
  border: 2px solid rgba(255,255,255,.07);
  border-radius: 1.25rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: .6rem;
  padding: 1.5rem 1rem;
  cursor: pointer;
  transition: all .18s ease;
  -webkit-tap-highlight-color: transparent;
}
.operator-card:hover        { background: #253347; border-color: rgba(99,102,241,.4); transform: translateY(-2px); }
.operator-card:active       { transform: scale(.97); }
.operator-card--active      { border-color: rgba(16,185,129,.5); background: rgba(16,185,129,.07); }

.card-avatar {
  width: 4.5rem;
  height: 4.5rem;
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
  font-weight: 900;
  color: #fff;
}
.card-name   { font-size: 1.25rem; font-weight: 800; color: #f1f5f9; }
.card-role   { font-size: .7rem;   color: #64748b; text-transform: uppercase; letter-spacing: .06em; }
.card-status {
  display: flex;
  align-items: center;
  gap: .3rem;
  font-size: .65rem;
  font-weight: 700;
  letter-spacing: .08em;
  padding: .2rem .65rem;
  border-radius: 999px;
}
.status--in  { background: rgba(16,185,129,.15);  color: #34d399; }
.status--out { background: rgba(100,116,139,.15); color: #64748b; }
.status-dot  { width: .45rem; height: .45rem; border-radius: 50%; background: currentColor; }

/* Modal */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.6);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}
.modal-card {
  background: #1e293b;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 1.5rem;
  padding: 2.5rem 3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  min-width: 360px;
  position: relative;
}
.modal-avatar {
  width: 5rem;
  height: 5rem;
  border-radius: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.25rem;
  font-weight: 900;
  color: #fff;
}
.modal-name { font-size: 1.75rem; font-weight: 800; color: #f1f5f9; }
.modal-role { font-size: .75rem; color: #64748b; text-transform: uppercase; letter-spacing: .08em; }
.modal-time { font-size: 3rem; font-weight: 800; color: #e2e8f0; letter-spacing: .08em; font-variant-numeric: tabular-nums; }

.modal-actions { display: flex; gap: 1rem; margin-top: .5rem; }
.modal-btn {
  height: 4rem;
  min-width: 10rem;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: .08em;
  border: none;
  border-radius: .75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: .5rem;
  cursor: pointer;
  transition: all .15s ease;
}
.modal-btn:disabled { opacity: .3; cursor: not-allowed; }
.modal-btn--in  { background: linear-gradient(135deg,#059669,#10b981); color: #fff; }
.modal-btn--out { background: linear-gradient(135deg,#e11d48,#f43f5e); color: #fff; }
.modal-btn:not(:disabled):hover  { filter: brightness(1.1); transform: translateY(-1px); }
.modal-btn:not(:disabled):active { transform: scale(.97); }

.modal-close {
  position: absolute;
  top: .75rem; right: .75rem;
  background: rgba(255,255,255,.07);
  border: none;
  color: #94a3b8;
  border-radius: .5rem;
  width: 2rem; height: 2rem;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  font-size: .85rem;
}
.modal-close:hover { background: rgba(255,255,255,.12); color: #f1f5f9; }

/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity .2s ease; }
.fade-enter-from,  .fade-leave-to      { opacity: 0; }
</style>
