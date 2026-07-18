<template>
  <div class="boot-screen">

    <!-- Background grid lines (pure CSS, no deps) -->
    <div class="bg-grid" aria-hidden="true" />

    <!-- ── Branding ─────────────────────────────────────────────────── -->
    <header class="brand-header">
      <div class="brand-badge">
        <span class="material-symbols-rounded brand-icon">precision_manufacturing</span>
      </div>
      <div class="brand-text">
        <p class="brand-eyebrow">SODOFIX MANUFACTURING</p>
        <h1 class="brand-title">SYSTEM BOOT</h1>
        <p class="brand-sub">Authorized Personnel Only — Enter Master Code to Continue</p>
      </div>
    </header>

    <!-- ── PIN Indicator ───────────────────────────────────────────── -->
    <div class="pin-row" :class="{ shake: shaking }" aria-label="PIN entry indicator">
      <span
        v-for="i in PIN_LENGTH"
        :key="i"
        class="pin-circle"
        :class="{
          'pin-circle--filled': i <= pin.length,
          'pin-circle--error':  shaking,
        }"
      />
    </div>

    <!-- ── Status message ─────────────────────────────────────────── -->
    <Transition name="msg-fade">
      <p v-if="errorMsg" class="error-msg" role="alert">
        <span class="material-symbols-rounded" style="font-size:1rem;vertical-align:middle">lock</span>
        {{ errorMsg }}
      </p>
    </Transition>

    <!-- ── Numpad ──────────────────────────────────────────────────── -->
    <div class="numpad-shell">
      <div class="numpad-grid">
        <button
          v-for="key in KEYS"
          :key="key"
          class="num-key"
          :class="{
            'num-key--fn':  key === 'CLR' || key === '⌫',
            'num-key--clr': key === 'CLR',
            'num-key--del': key === '⌫',
          }"
          @click="onKey(key)"
        >
          <span v-if="key === '⌫'" class="material-symbols-rounded" style="font-size:2rem">backspace</span>
          <template v-else>{{ key }}</template>
        </button>
      </div>
    </div>

    <!-- ── Footer ─────────────────────────────────────────────────── -->
    <footer class="boot-footer">
      <span class="footer-clock">{{ clock }}</span>
      <span class="footer-sep">·</span>
      <span>MES v2.0</span>
      <span class="footer-sep">·</span>
      <span>{{ today }}</span>
    </footer>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSystemAuthStore } from '@/store/systemAuthStore.js'

// ── Constants ────────────────────────────────────────────────────────────────
const PIN_LENGTH = 4
const KEYS = ['7','8','9','4','5','6','1','2','3','CLR','0','⌫']

// ── State ────────────────────────────────────────────────────────────────────
const sysAuth = useSystemAuthStore()
const router  = useRouter()
const pin     = ref('')
const errorMsg = ref('')
const shaking  = ref(false)

// ── Live clock ───────────────────────────────────────────────────────────────
const now = ref(new Date())
let clockTimer = null

const pad = (n) => String(n).padStart(2, '0')
const clock = computed(() => {
  const d = now.value
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
})
const today = computed(() =>
  now.value.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
)

onMounted(() => { clockTimer = setInterval(() => { now.value = new Date() }, 1000) })
onUnmounted(() => clearInterval(clockTimer))

// ── Numpad logic ─────────────────────────────────────────────────────────────
function onKey(key) {
  if (shaking.value) return          // ignore input during error animation
  errorMsg.value = ''

  if (key === 'CLR') {
    pin.value = ''
    return
  }
  if (key === '⌫') {
    pin.value = pin.value.slice(0, -1)
    return
  }
  if (pin.value.length >= PIN_LENGTH) return

  pin.value += key

  if (pin.value.length === PIN_LENGTH) {
    attemptUnlock()
  }
}

function attemptUnlock() {
  const result = sysAuth.unlockSystem(pin.value)

  if (result.success) {
    router.push({ name: 'ModuleSelection' })
  } else {
    errorMsg.value = result.message
    triggerShake()
  }
}

function triggerShake() {
  shaking.value = true
  setTimeout(() => {
    shaking.value = false
    pin.value = ''
  }, 620)  // matches CSS animation duration
}
</script>

<style scoped>
/* ── Root layout ─────────────────────────────────────────────────────────── */
.boot-screen {
  width: 100vw;
  height: 100vh;
  background: #020617;          /* slate-950 */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2.25rem;
  overflow: hidden;
  position: relative;
  font-family: 'Inter', sans-serif;
}

/* ── Subtle CSS grid overlay ─────────────────────────────────────────────── */
.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(99,102,241,.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(99,102,241,.06) 1px, transparent 1px);
  background-size: 64px 64px;
  pointer-events: none;
}

/* ── Branding header ─────────────────────────────────────────────────────── */
.brand-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  z-index: 1;
}

.brand-badge {
  width: 5.5rem;
  height: 5.5rem;
  border-radius: 1.25rem;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 40px rgba(99,102,241,.35);
  flex-shrink: 0;
}
.brand-icon { font-size: 2.8rem; color: #fff; }

.brand-text {
  display: flex;
  flex-direction: column;
  gap: .2rem;
}
.brand-eyebrow {
  font-size: .7rem;
  font-weight: 700;
  letter-spacing: .2em;
  color: #6366f1;
  text-transform: uppercase;
  margin: 0;
}
.brand-title {
  font-size: 3rem;
  font-weight: 900;
  color: #f1f5f9;
  letter-spacing: .06em;
  margin: 0;
  line-height: 1;
}
.brand-sub {
  font-size: .8rem;
  color: #475569;
  margin: 0;
}

/* ── PIN indicator ───────────────────────────────────────────────────────── */
.pin-row {
  display: flex;
  gap: 1.25rem;
  z-index: 1;
}
.pin-circle {
  width: 1.4rem;
  height: 1.4rem;
  border-radius: 50%;
  border: 2px solid #334155;
  background: transparent;
  transition: background .15s ease, border-color .15s ease, box-shadow .15s ease;
}
.pin-circle--filled {
  background: #6366f1;
  border-color: #6366f1;
  box-shadow: 0 0 12px rgba(99,102,241,.6);
}
.pin-circle--error {
  background: #ef4444;
  border-color: #ef4444;
  box-shadow: 0 0 12px rgba(239,68,68,.6);
}

/* ── Shake animation ─────────────────────────────────────────────────────── */
@keyframes shake {
  0%,100% { transform: translateX(0); }
  15%      { transform: translateX(-10px); }
  30%      { transform: translateX(10px); }
  45%      { transform: translateX(-8px); }
  60%      { transform: translateX(8px); }
  75%      { transform: translateX(-4px); }
  90%      { transform: translateX(4px); }
}
.shake { animation: shake .62s ease; }

/* ── Error message ───────────────────────────────────────────────────────── */
.error-msg {
  color: #f87171;
  font-size: .82rem;
  font-weight: 600;
  letter-spacing: .04em;
  z-index: 1;
  margin: -.5rem 0;
}
.msg-fade-enter-active, .msg-fade-leave-active { transition: opacity .25s ease; }
.msg-fade-enter-from,  .msg-fade-leave-to      { opacity: 0; }

/* ── Numpad ──────────────────────────────────────────────────────────────── */
.numpad-shell {
  z-index: 1;
}
.numpad-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: .75rem;
  width: 100%;
  max-width: 320px;
}
.num-key {
  height: 5.5rem;
  font-size: 2.25rem;
  font-weight: 700;
  color: #e2e8f0;
  background: #0f172a;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: .9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background .1s ease, transform .08s ease, box-shadow .1s ease;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}
.num-key:hover  { background: #1e293b; }
.num-key:active { transform: scale(.94); background: #334155; }

.num-key--del {
  background: rgba(239,68,68,.1);
  border-color: rgba(239,68,68,.25);
  color: #f87171;
}
.num-key--del:hover  { background: rgba(239,68,68,.2); }
.num-key--del:active { background: rgba(239,68,68,.32); }

.num-key--clr {
  background: rgba(245,158,11,.1);
  border-color: rgba(245,158,11,.25);
  color: #fbbf24;
  font-size: 1rem;
  letter-spacing: .06em;
}
.num-key--clr:hover  { background: rgba(245,158,11,.2); }
.num-key--clr:active { background: rgba(245,158,11,.32); }

/* ── Footer ──────────────────────────────────────────────────────────────── */
.boot-footer {
  position: absolute;
  bottom: 1.5rem;
  display: flex;
  gap: .6rem;
  font-size: .7rem;
  color: #334155;
  letter-spacing: .06em;
  font-variant-numeric: tabular-nums;
}
.footer-clock { color: #475569; font-weight: 600; }
.footer-sep { color: #1e293b; }
</style>
