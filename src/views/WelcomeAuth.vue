<template>
  <div class="boot-screen">

    <!-- Background grid -->
    <div class="bg-grid" aria-hidden="true" />
    <!-- Ambient purple glow left -->
    <div class="glow glow--left"  aria-hidden="true" />
    <!-- Ambient blue glow right -->
    <div class="glow glow--right" aria-hidden="true" />

    <!-- ════════════════════════════════════════════════════════════ -->
    <!--  LEFT PANEL — Branding + PIN display                        -->
    <!-- ════════════════════════════════════════════════════════════ -->
    <aside class="left-panel">

      <!-- Logo badge -->
      <div class="brand-badge">
        <span class="material-symbols-rounded brand-icon">precision_manufacturing</span>
      </div>

      <!-- Title block -->
      <div class="brand-block">
        <p class="brand-eyebrow">SODOFIX MANUFACTURING</p>
        <h1 class="brand-title">SYSTEM<br>BOOT</h1>
        <p class="brand-sub">Authorized Personnel Only</p>
      </div>

      <!-- PIN dots -->
      <div class="pin-section" :class="{ shake: shaking }" aria-label="PIN entry indicator">
        <p class="pin-label">ENTER MASTER CODE</p>
        <div class="pin-dots">
          <span
            v-for="i in PIN_LENGTH"
            :key="i"
            class="pin-dot"
            :class="{
              'pin-dot--filled': i <= pin.length,
              'pin-dot--error':  shaking,
            }"
          />
        </div>
        <!-- Error message -->
        <Transition name="msg-fade">
          <p v-if="errorMsg" class="error-msg" role="alert">
            <span class="material-symbols-rounded" style="font-size:.95rem;vertical-align:-3px">lock</span>
            {{ errorMsg }}
          </p>
          <p v-else class="error-placeholder">&nbsp;</p>
        </Transition>
      </div>

      <!-- Footer clock -->
      <footer class="left-footer">
        <span class="clock">{{ clock }}</span>
        <span class="date">{{ today }}</span>
      </footer>

    </aside>

    <!-- ════════════════════════════════════════════════════════════ -->
    <!--  RIGHT PANEL — Numpad                                        -->
    <!-- ════════════════════════════════════════════════════════════ -->
    <main class="right-panel">
      <div class="numpad">
        <button
          v-for="key in KEYS"
          :key="key"
          class="num-key"
          :class="{
            'num-key--clr': key === 'CLR',
            'num-key--del': key === '⌫',
          }"
          @click="onKey(key)"
        >
          <span
            v-if="key === '⌫'"
            class="material-symbols-rounded"
            style="font-size: clamp(1.6rem, 3.5vh, 2.6rem)"
          >backspace</span>
          <template v-else>{{ key }}</template>
        </button>
      </div>
    </main>

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
const sysAuth  = useSystemAuthStore()
const router   = useRouter()
const pin      = ref('')
const errorMsg = ref('')
const shaking  = ref(false)

// ── Live clock ───────────────────────────────────────────────────────────────
const now = ref(new Date())
let clockTimer = null

const pad   = (n) => String(n).padStart(2, '0')
const clock = computed(() => {
  const d = now.value
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
})
const today = computed(() =>
  now.value.toLocaleDateString('en-GB', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })
)

onMounted(()  => { clockTimer = setInterval(() => { now.value = new Date() }, 1000) })
onUnmounted(() => clearInterval(clockTimer))

// ── Numpad logic ─────────────────────────────────────────────────────────────
function onKey(key) {
  if (shaking.value) return
  errorMsg.value = ''

  if (key === 'CLR') { pin.value = ''; return }
  if (key === '⌫')  { pin.value = pin.value.slice(0, -1); return }
  if (pin.value.length >= PIN_LENGTH) return

  pin.value += key
  if (pin.value.length === PIN_LENGTH) attemptUnlock()
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
  setTimeout(() => { shaking.value = false; pin.value = '' }, 640)
}
</script>

<style scoped>
/* ── Root: full-screen split landscape ───────────────────────────────────── */
.boot-screen {
  width: 100vw;
  height: 100vh;
  background: #020617;
  display: flex;
  flex-direction: row;           /* ← landscape split */
  overflow: hidden;
  position: relative;
  font-family: 'Inter', sans-serif;
}

/* ── Background grid ─────────────────────────────────────────────────────── */
.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(99,102,241,.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(99,102,241,.05) 1px, transparent 1px);
  background-size: 72px 72px;
  pointer-events: none;
}

/* ── Ambient glows ───────────────────────────────────────────────────────── */
.glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  pointer-events: none;
}
.glow--left  { width: 520px; height: 520px; background: #6366f1; opacity: .12; top: -160px; left: -160px; }
.glow--right { width: 420px; height: 420px; background: #2563eb; opacity: .1;  bottom: -100px; right: -80px; }

/* ════════════════════════════════════════════════════════════════════════════
   LEFT PANEL
   ════════════════════════════════════════════════════════════════════════════ */
.left-panel {
  width: 42%;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 3rem 4rem;
  gap: 2.5rem;
  z-index: 1;
  border-right: 1px solid rgba(255,255,255,.05);
}

/* Logo badge */
.brand-badge {
  width: 5rem;
  height: 5rem;
  border-radius: 1.25rem;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 48px rgba(99,102,241,.4);
  flex-shrink: 0;
}
.brand-icon { font-size: 2.6rem; color: #fff; }

/* Title */
.brand-block { display: flex; flex-direction: column; gap: .4rem; }
.brand-eyebrow {
  font-size: .65rem;
  font-weight: 700;
  letter-spacing: .22em;
  color: #6366f1;
  text-transform: uppercase;
  margin: 0;
}
.brand-title {
  font-size: clamp(2.6rem, 5vw, 4rem);
  font-weight: 900;
  color: #f1f5f9;
  letter-spacing: .04em;
  line-height: 1.05;
  margin: 0;
}
.brand-sub {
  font-size: .8rem;
  color: #475569;
  margin: 0;
}

/* PIN dots section */
.pin-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.pin-label {
  font-size: .62rem;
  font-weight: 700;
  letter-spacing: .18em;
  color: #475569;
  text-transform: uppercase;
  margin: 0;
}
.pin-dots {
  display: flex;
  gap: 1.2rem;
}
.pin-dot {
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 50%;
  border: 2px solid #1e293b;
  background: transparent;
  transition: background .15s ease, border-color .15s ease, box-shadow .15s ease;
}
.pin-dot--filled {
  background: #6366f1;
  border-color: #6366f1;
  box-shadow: 0 0 16px rgba(99,102,241,.65);
}
.pin-dot--error {
  background: #ef4444;
  border-color: #ef4444;
  box-shadow: 0 0 14px rgba(239,68,68,.6);
}

/* Shake */
@keyframes shake {
  0%,100% { transform: translateX(0); }
  14%     { transform: translateX(-12px); }
  28%     { transform: translateX(12px); }
  43%     { transform: translateX(-8px); }
  57%     { transform: translateX(8px); }
  72%     { transform: translateX(-4px); }
  86%     { transform: translateX(4px); }
}
.shake { animation: shake .64s cubic-bezier(.36,.07,.19,.97); }

/* Error / placeholder */
.error-msg {
  color: #f87171;
  font-size: .78rem;
  font-weight: 600;
  letter-spacing: .04em;
  margin: 0;
}
.error-placeholder { color: transparent; font-size: .78rem; margin: 0; }
.msg-fade-enter-active, .msg-fade-leave-active { transition: opacity .2s ease; }
.msg-fade-enter-from,   .msg-fade-leave-to     { opacity: 0; }

/* Clock / date */
.left-footer {
  display: flex;
  flex-direction: column;
  gap: .2rem;
  margin-top: auto;
}
.clock {
  font-size: 2.2rem;
  font-weight: 800;
  color: #1e293b;
  font-variant-numeric: tabular-nums;
  letter-spacing: .06em;
}
.date {
  font-size: .7rem;
  color: #1e293b;
  letter-spacing: .06em;
}

/* ════════════════════════════════════════════════════════════════════════════
   RIGHT PANEL — Numpad
   ════════════════════════════════════════════════════════════════════════════ */
.right-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 3rem;
  z-index: 1;
}

/* Numpad grid — keys fill the available height with vh units */
.numpad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(4, 1fr);   /* 4 rows forced equal */
  gap: clamp(.6rem, 1.4vh, 1.25rem);
  width: 100%;
  max-width: 560px;
  height: 100%;
  max-height: calc(100vh - 4rem);
}

/* Individual key */
.num-key {
  /* height controlled by grid row, not fixed px */
  width: 100%;
  font-size: clamp(1.75rem, 4vh, 3rem);
  font-weight: 700;
  color: #e2e8f0;
  background: #0c1425;
  border: 1px solid rgba(255,255,255,.07);
  border-radius: clamp(.75rem, 1.5vh, 1.25rem);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background .1s ease, transform .08s ease, border-color .12s ease;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  letter-spacing: .02em;
}
.num-key:hover {
  background: #1a2540;
  border-color: rgba(99,102,241,.3);
}
.num-key:active {
  transform: scale(.93);
  background: #1e2d50;
}

/* CLR key */
.num-key--clr {
  background: rgba(245,158,11,.08);
  border-color: rgba(245,158,11,.2);
  color: #fbbf24;
  font-size: clamp(1rem, 2.2vh, 1.4rem);
  font-weight: 800;
  letter-spacing: .12em;
}
.num-key--clr:hover  { background: rgba(245,158,11,.17); border-color: rgba(245,158,11,.4); }
.num-key--clr:active { background: rgba(245,158,11,.28); }

/* DEL key */
.num-key--del {
  background: rgba(239,68,68,.08);
  border-color: rgba(239,68,68,.2);
  color: #f87171;
}
.num-key--del:hover  { background: rgba(239,68,68,.17); border-color: rgba(239,68,68,.4); }
.num-key--del:active { background: rgba(239,68,68,.28); }
</style>
