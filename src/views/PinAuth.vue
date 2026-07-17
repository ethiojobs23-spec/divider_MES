<template>
  <div class="pin-layout">
    <!-- Background geometric pattern -->
    <div class="bg-grid" aria-hidden="true" />

    <!-- Lock Icon + Title -->
    <div class="pin-header">
      <div class="lock-badge" :class="{ 'lock-badge--error': shaking, 'lock-badge--success': unlocked }">
        <span class="material-symbols-rounded lock-icon">
          {{ unlocked ? 'lock_open' : 'lock' }}
        </span>
      </div>
      <h1 class="pin-title">Manager Access Required</h1>
      <p class="pin-sub">Enter your 4-digit security PIN to continue</p>
      <div class="target-route-chip" v-if="targetRoute">
        <span class="material-symbols-rounded" style="font-size:.85rem">shield</span>
        Accessing: {{ targetRoute }}
      </div>
    </div>

    <!-- 4-Dot PIN Indicator ────────────────────────────────────────── -->
    <div class="pin-dots" :class="{ 'shake': shaking }">
      <div
        v-for="i in 4"
        :key="i"
        class="pin-dot"
        :class="{
          'pin-dot--filled':   i <= pin.length,
          'pin-dot--success':  unlocked,
          'pin-dot--error':    shaking,
          'pin-dot--entering': i === pin.length + 1 && !shaking,
        }"
      >
        <!-- Show filled circle or asterisk character -->
        <span v-if="i <= pin.length" class="dot-fill">
          <span class="material-symbols-rounded dot-icon">circle</span>
        </span>
        <span v-else class="dot-empty" />
      </div>
    </div>

    <!-- Error / Hint Message -->
    <Transition name="msg-fade">
      <p v-if="errorMessage" class="pin-error" key="error">
        <span class="material-symbols-rounded" style="font-size:.95rem">error</span>
        {{ errorMessage }}
      </p>
      <p v-else-if="unlocked" class="pin-success" key="success">
        <span class="material-symbols-rounded" style="font-size:.95rem">check_circle</span>
        Access Granted — Redirecting…
      </p>
    </Transition>

    <!-- Attempts remaining warning -->
    <div v-if="attemptsLeft < 3 && attemptsLeft > 0" class="attempts-warning">
      <span class="material-symbols-rounded" style="font-size:.85rem">warning</span>
      {{ attemptsLeft }} attempt{{ attemptsLeft !== 1 ? 's' : '' }} remaining
    </div>
    <div v-if="locked" class="locked-warning">
      <span class="material-symbols-rounded">block</span>
      PIN locked for {{ lockdownRemaining }}s. Contact supervisor.
    </div>

    <!-- Virtual Numpad ─────────────────────────────────────────────── -->
    <div class="pin-numpad" :class="{ 'numpad--locked': locked || unlocked }">
      <!-- Custom numpad for PIN (no display) -->
      <div class="pin-grid">
        <button
          v-for="key in pinKeys"
          :key="key"
          class="pin-key"
          :class="{
            'pin-key--action': key === '⌫' || key === '✕',
            'pin-key--del':    key === '⌫',
            'pin-key--clr':    key === '✕',
            'pin-key--disabled': locked || unlocked,
          }"
          :disabled="locked || unlocked"
          @click="handleKey(key)"
        >
          <span v-if="key === '⌫'" class="material-symbols-rounded" style="font-size:1.6rem">backspace</span>
          <template v-else>{{ key }}</template>
        </button>
      </div>
    </div>

    <!-- Back navigation -->
    <button class="back-btn" @click="goBack">
      <span class="material-symbols-rounded">arrow_back</span>
      Go Back
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMesStore } from '@/store/mesStore.js'

const router = useRouter()
const route  = useRoute()
const store  = useMesStore()

// ─── PIN State ──────────────────────────────────────────────────────────────
const pin          = ref('')
const shaking      = ref(false)
const unlocked     = ref(false)
const errorMessage = ref('')
const attemptsLeft = ref(5)
const locked       = ref(false)
const lockdownRemaining = ref(30)
let lockdownTimer  = null

const MAX_ATTEMPTS = 5
const LOCKDOWN_SECONDS = 30

// The correct PIN is read from the store (defaults to '1234' if not set)
// In production, this is verified server-side via authAPI.verifyPin()
const CORRECT_PIN = computed(() => store.adminPin ?? '1234')

const pinKeys = ['7','8','9','4','5','6','1','2','3','✕','0','⌫']

// Which protected route triggered this screen
const targetRoute = computed(() => {
  const returnTo = route.query.returnTo
  const routeNames = {
    '/payroll':   'Payroll Dashboard',
    '/settings':  'Admin Settings',
    '/inventory': 'Inventory Manager',
    '/analytics': 'Executive Analytics',
  }
  return routeNames[returnTo] ?? returnTo ?? 'Protected Area'
})

// ─── Key handler ────────────────────────────────────────────────────────────
function handleKey(key) {
  if (locked.value || unlocked.value) return

  // Clear error on any keypress
  errorMessage.value = ''

  if (key === '✕') {
    pin.value = ''
    return
  }

  if (key === '⌫') {
    pin.value = pin.value.slice(0, -1)
    return
  }

  if (pin.value.length >= 4) return

  pin.value += key

  // Auto-submit when 4 digits are entered
  if (pin.value.length === 4) {
    validatePin()
  }
}

// ─── Validation ─────────────────────────────────────────────────────────────
async function validatePin() {
  const entered = pin.value

  // Option A: Local validation (fast, for offline mode)
  const isCorrect = entered === CORRECT_PIN.value

  // Option B: Server-side validation (uncomment for production)
  // try {
  //   const { data } = await authAPI.verifyPin(entered)
  //   isCorrect = data.valid === true
  // } catch (err) {
  //   // Network error → fall back to local validation
  //   isCorrect = entered === CORRECT_PIN.value
  // }

  if (isCorrect) {
    unlocked.value = true
    store.grantAdminAccess()

    // Redirect back to the originally requested route
    const returnTo = route.query.returnTo ?? '/settings'
    setTimeout(() => {
      router.replace(returnTo)
    }, 900)
  } else {
    triggerError()
  }
}

function triggerError() {
  attemptsLeft.value -= 1
  shaking.value = true
  pin.value     = ''

  if (attemptsLeft.value <= 0) {
    // Lock the pad
    locked.value = true
    lockdownRemaining.value = LOCKDOWN_SECONDS
    errorMessage.value = ''

    lockdownTimer = setInterval(() => {
      lockdownRemaining.value -= 1
      if (lockdownRemaining.value <= 0) {
        clearInterval(lockdownTimer)
        locked.value       = false
        attemptsLeft.value = MAX_ATTEMPTS
      }
    }, 1000)
  } else {
    errorMessage.value =
      attemptsLeft.value === 1
        ? 'Incorrect PIN. Last attempt before lockout!'
        : `Incorrect PIN. ${attemptsLeft.value} attempts remaining.`
  }

  // Remove shake class after animation
  setTimeout(() => { shaking.value = false }, 600)
}

function goBack() {
  router.back()
}

onUnmounted(() => {
  if (lockdownTimer) clearInterval(lockdownTimer)
})
</script>

<style scoped>
/* ── Layout ──────────────────────────────────────────────────────────────── */
.pin-layout {
  width: 100vw;
  height: 100vh;
  background: #0f172a;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  position: relative;
  overflow: hidden;
}

/* Subtle geometric background grid */
.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(99,102,241,.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(99,102,241,.04) 1px, transparent 1px);
  background-size: 48px 48px;
  pointer-events: none;
}

/* ── Header ──────────────────────────────────────────────────────────────── */
.pin-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: .6rem;
  text-align: center;
}

.lock-badge {
  width: 5rem;
  height: 5rem;
  border-radius: 1.25rem;
  background: rgba(99,102,241,.15);
  border: 2px solid rgba(99,102,241,.4);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all .3s ease;
}
.lock-badge--error   { background: rgba(239,68,68,.15); border-color: rgba(239,68,68,.5); }
.lock-badge--success { background: rgba(16,185,129,.15); border-color: rgba(16,185,129,.5); }
.lock-icon {
  font-size: 2.25rem !important;
  color: #a5b4fc;
  transition: color .3s ease;
}
.lock-badge--error   .lock-icon { color: #f87171; }
.lock-badge--success .lock-icon { color: #34d399; }

.pin-title { font-size: 1.4rem; font-weight: 900; color: #f1f5f9; letter-spacing: .02em; }
.pin-sub   { font-size: .8rem;  color: #64748b; }

.target-route-chip {
  display: flex; align-items: center; gap: .35rem;
  background: rgba(99,102,241,.12);
  border: 1px solid rgba(99,102,241,.3);
  color: #a5b4fc;
  font-size: .7rem; font-weight: 700;
  padding: .25rem .75rem;
  border-radius: 999px;
  letter-spacing: .04em;
}

/* ── PIN Dots ──────────────────────────────────────────────────────────────── */
.pin-dots {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: center;
}

.pin-dot {
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,.15);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all .2s ease;
  position: relative;
}
.pin-dot--filled {
  border-color: #6366f1;
  background: rgba(99,102,241,.15);
  transform: scale(1.15);
}
.pin-dot--entering {
  border-color: rgba(99,102,241,.5);
  animation: pulse-ring .4s ease;
}
.pin-dot--success {
  border-color: #10b981;
  background: rgba(16,185,129,.2);
}
.pin-dot--error {
  border-color: #ef4444;
  background: rgba(239,68,68,.2);
}
.dot-fill {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
}
.dot-icon { font-size: .7rem !important; color: #a5b4fc; }
.pin-dot--success .dot-icon { color: #34d399; }
.pin-dot--error   .dot-icon { color: #f87171; }
.dot-empty {
  width: .45rem; height: .45rem;
  border-radius: 50%;
  background: rgba(255,255,255,.12);
}

/* Shake animation */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 50%, 90% { transform: translateX(-6px); }
  30%, 70% { transform: translateX(6px); }
}
.shake { animation: shake .55s cubic-bezier(.36,.07,.19,.97) both; }

/* ── Messages ────────────────────────────────────────────────────────────── */
.pin-error {
  display: flex; align-items: center; gap: .35rem;
  color: #f87171;
  font-size: .8rem; font-weight: 700;
  background: rgba(239,68,68,.1);
  border: 1px solid rgba(239,68,68,.25);
  border-radius: .5rem;
  padding: .4rem 1rem;
}
.pin-success {
  display: flex; align-items: center; gap: .35rem;
  color: #34d399;
  font-size: .8rem; font-weight: 700;
  background: rgba(16,185,129,.1);
  border: 1px solid rgba(16,185,129,.25);
  border-radius: .5rem;
  padding: .4rem 1rem;
}
.attempts-warning {
  display: flex; align-items: center; gap: .3rem;
  color: #fbbf24;
  font-size: .72rem; font-weight: 700;
  background: rgba(245,158,11,.1);
  border: 1px solid rgba(245,158,11,.2);
  border-radius: .45rem;
  padding: .3rem .85rem;
}
.locked-warning {
  display: flex; align-items: center; gap: .4rem;
  color: #f87171;
  font-size: .85rem; font-weight: 800;
  background: rgba(239,68,68,.12);
  border: 1px solid rgba(239,68,68,.3);
  border-radius: .5rem;
  padding: .5rem 1.25rem;
  animation: pulse-opacity 1.5s ease infinite;
}

/* ── PIN Numpad Grid ──────────────────────────────────────────────────────── */
.pin-numpad {
  transition: opacity .3s ease;
}
.numpad--locked { opacity: .35; pointer-events: none; }

.pin-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: .6rem;
}

.pin-key {
  width: 6.5rem;
  height: 5.5rem;
  font-size: 2rem;
  font-weight: 800;
  color: #e2e8f0;
  background: #1e293b;
  border: 1px solid rgba(255,255,255,.09);
  border-radius: .85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all .1s ease;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}
.pin-key:hover  { background: #2d3f55; border-color: rgba(99,102,241,.3); }
.pin-key:active { transform: scale(.92); background: #374151; }
.pin-key--disabled { pointer-events: none; opacity: .4; }

.pin-key--del {
  background: rgba(239,68,68,.1);
  border-color: rgba(239,68,68,.25);
  color: #f87171;
}
.pin-key--del:hover { background: rgba(239,68,68,.2); }

.pin-key--clr {
  background: rgba(245,158,11,.1);
  border-color: rgba(245,158,11,.25);
  color: #fbbf24;
  font-size: 1.1rem;
  letter-spacing: .04em;
}
.pin-key--clr:hover { background: rgba(245,158,11,.2); }

/* ── Back Button ─────────────────────────────────────────────────────────── */
.back-btn {
  display: flex; align-items: center; gap: .35rem;
  background: transparent;
  border: 1px solid rgba(255,255,255,.1);
  color: #475569;
  font-size: .8rem; font-weight: 600;
  padding: .5rem 1.2rem;
  border-radius: .5rem;
  cursor: pointer;
  transition: all .15s ease;
  margin-top: .5rem;
}
.back-btn:hover { border-color: rgba(255,255,255,.2); color: #94a3b8; }

/* ── Animations ──────────────────────────────────────────────────────────── */
@keyframes pulse-ring {
  0%   { box-shadow: 0 0 0 0 rgba(99,102,241,.5); }
  100% { box-shadow: 0 0 0 8px rgba(99,102,241,0); }
}
@keyframes pulse-opacity {
  0%, 100% { opacity: 1; }
  50%       { opacity: .6; }
}

.msg-fade-enter-active { transition: all .25s ease; }
.msg-fade-leave-active { transition: all .15s ease; }
.msg-fade-enter-from, .msg-fade-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
