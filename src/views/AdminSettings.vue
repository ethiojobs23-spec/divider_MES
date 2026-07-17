<template>
  <div class="admin-layout">
    <!-- ─── LEFT: Settings Nav Sidebar ─────────────────────────────── -->
    <aside class="admin-sidebar">
      <div class="sidebar-brand">
        <span class="material-symbols-rounded brand-icon">settings</span>
        <div>
          <p class="brand-title">Admin Settings</p>
          <p class="brand-sub">Configuration Panel</p>
        </div>
      </div>

      <nav class="settings-nav">
        <button
          class="snav-item"
          :class="{ 'snav-item--active': activeTab === 'rates' }"
          @click="activeTab = 'rates'"
        >
          <span class="material-symbols-rounded snav-icon">price_change</span>
          <div class="snav-text">
            <span class="snav-label">Piece-Rate (ብር/pcs)</span>
            <span class="snav-sub">ETB per unit by variant</span>
          </div>
          <span class="material-symbols-rounded snav-arrow">chevron_right</span>
        </button>

        <button
          class="snav-item"
          :class="{ 'snav-item--active': activeTab === 'thresholds' }"
          @click="activeTab = 'thresholds'"
        >
          <span class="material-symbols-rounded snav-icon">warning</span>
          <div class="snav-text">
            <span class="snav-label">Waste Thresholds</span>
            <span class="snav-sub">Alert trigger percentages</span>
          </div>
          <span class="material-symbols-rounded snav-arrow">chevron_right</span>
        </button>

        <button
          class="snav-item"
          :class="{ 'snav-item--active': activeTab === 'system' }"
          @click="activeTab = 'system'"
        >
          <span class="material-symbols-rounded snav-icon">tune</span>
          <div class="snav-text">
            <span class="snav-label">System Config</span>
            <span class="snav-sub">Flags &amp; integrations</span>
          </div>
          <span class="material-symbols-rounded snav-arrow">chevron_right</span>
        </button>
      </nav>

      <!-- Apply Button (sticky at bottom of sidebar) -->
      <button class="apply-btn" @click="applyChanges">
        <span class="material-symbols-rounded">check_circle</span>
        Apply Global Changes
      </button>

      <!-- Confirmation Toast -->
      <Transition name="toast">
        <div v-if="saved" class="saved-toast">
          <span class="material-symbols-rounded">done_all</span>
          Changes Applied
        </div>
      </Transition>
    </aside>

    <!-- ─── RIGHT: Settings Main Area ──────────────────────────────── -->
    <main class="admin-main">

      <!-- ══════════════════════════════════════════════════════════════
           TAB 1: PIECE RATES
      ══════════════════════════════════════════════════════════════ -->
      <div v-if="activeTab === 'rates'" class="tab-panel">
        <div class="panel-header">
          <span class="material-symbols-rounded panel-icon" style="color:#6366f1">price_change</span>
          <div>
            <h2 class="panel-title">Piece-Rate Configuration</h2>
            <p class="panel-sub">Use + / − steppers to set ETB per piece for each variant combination</p>
          </div>
        </div>

        <!-- Divider Type tabs -->
        <div class="type-tabs">
          <button
            v-for="t in dividerTypes"
            :key="t"
            class="type-tab"
            :class="{ 'type-tab--active': selectedType === t }"
            @click="selectedType = t"
          >{{ t }}</button>
        </div>

        <!-- Rate Matrix for selected type -->
        <div class="rate-grid">
          <div
            v-for="size in sizes"
            :key="size"
            class="rate-group"
          >
            <p class="rate-group-title">
              <span class="material-symbols-rounded" style="font-size:.9rem;color:#6366f1">straighten</span>
              {{ size }}
            </p>
            <div class="rate-rows">
              <div
                v-for="placement in placements"
                :key="placement"
                class="rate-row"
              >
                <div class="rate-meta">
                  <span class="placement-badge">{{ placement }}</span>
                  <span class="rate-key">Type {{ selectedType }} &bull; {{ size }}</span>
                </div>

                <!-- Stepper -->
                <div class="stepper">
                  <button
                    class="step-btn step-btn--minus"
                    @click="adjustRate(selectedType, size, placement, -0.25)"
                  >
                    <span class="material-symbols-rounded">remove</span>
                  </button>
                  <div class="step-display">
                    <span class="step-currency">ETB</span>
                    <span class="step-val">{{ getRate(selectedType, size, placement).toFixed(2) }}</span>
                  </div>
                  <button
                    class="step-btn step-btn--plus"
                    @click="adjustRate(selectedType, size, placement, +0.25)"
                  >
                    <span class="material-symbols-rounded">add</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════════
           TAB 2: WASTE THRESHOLDS
      ══════════════════════════════════════════════════════════════ -->
      <div v-if="activeTab === 'thresholds'" class="tab-panel">
        <div class="panel-header">
          <span class="material-symbols-rounded panel-icon" style="color:#f59e0b">warning</span>
          <div>
            <h2 class="panel-title">Waste Alert Thresholds</h2>
            <p class="panel-sub">Define the waste % values that trigger system alerts on Quality Control</p>
          </div>
        </div>

        <div class="threshold-cards">
          <!-- Warning Threshold -->
          <div class="threshold-card threshold-card--warn">
            <div class="tc-header">
              <span class="material-symbols-rounded" style="color:#f59e0b;font-size:1.6rem">warning_amber</span>
              <div>
                <p class="tc-title">Warning Level</p>
                <p class="tc-sub">Amber alert — operator review needed</p>
              </div>
            </div>

            <div class="slider-area">
              <div class="slider-val-row">
                <span class="slider-val warn">{{ store.wasteThresholds.warn }}%</span>
                <span class="slider-hint">of total batch</span>
              </div>
              <div class="slider-with-steppers">
                <button class="step-btn step-btn--minus" @click="store.setWasteThreshold('warn', store.wasteThresholds.warn - 1)">
                  <span class="material-symbols-rounded">remove</span>
                </button>
                <div class="slider-track-wrap">
                  <input
                    type="range"
                    min="1" max="30"
                    :value="store.wasteThresholds.warn"
                    @input="store.setWasteThreshold('warn', $event.target.value)"
                    class="mes-slider mes-slider--warn"
                  />
                  <div
                    class="slider-fill slider-fill--warn"
                    :style="{ width: (store.wasteThresholds.warn / 30 * 100) + '%' }"
                  />
                </div>
                <button class="step-btn step-btn--plus" @click="store.setWasteThreshold('warn', store.wasteThresholds.warn + 1)">
                  <span class="material-symbols-rounded">add</span>
                </button>
              </div>
              <div class="slider-scale">
                <span>1%</span><span>15%</span><span>30%</span>
              </div>
            </div>
          </div>

          <!-- Critical Threshold -->
          <div class="threshold-card threshold-card--critical">
            <div class="tc-header">
              <span class="material-symbols-rounded" style="color:#ef4444;font-size:1.6rem">crisis_alert</span>
              <div>
                <p class="tc-title">Critical Level</p>
                <p class="tc-sub">Red alert — line supervisor intervention</p>
              </div>
            </div>

            <div class="slider-area">
              <div class="slider-val-row">
                <span class="slider-val critical">{{ store.wasteThresholds.critical }}%</span>
                <span class="slider-hint">of total batch</span>
              </div>
              <div class="slider-with-steppers">
                <button class="step-btn step-btn--minus" @click="store.setWasteThreshold('critical', store.wasteThresholds.critical - 1)">
                  <span class="material-symbols-rounded">remove</span>
                </button>
                <div class="slider-track-wrap">
                  <input
                    type="range"
                    min="5" max="50"
                    :value="store.wasteThresholds.critical"
                    @input="store.setWasteThreshold('critical', $event.target.value)"
                    class="mes-slider mes-slider--critical"
                  />
                  <div
                    class="slider-fill slider-fill--critical"
                    :style="{ width: ((store.wasteThresholds.critical - 5) / 45 * 100) + '%' }"
                  />
                </div>
                <button class="step-btn step-btn--plus" @click="store.setWasteThreshold('critical', store.wasteThresholds.critical + 1)">
                  <span class="material-symbols-rounded">add</span>
                </button>
              </div>
              <div class="slider-scale">
                <span>5%</span><span>25%</span><span>50%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Visual preview of alert bands -->
        <div class="alert-preview">
          <p class="preview-title">Alert Band Preview</p>
          <div class="preview-bar-track">
            <div class="preview-ok"   :style="{ width: store.wasteThresholds.warn + '%' }">
              <span>SAFE</span>
            </div>
            <div class="preview-warn" :style="{ width: (store.wasteThresholds.critical - store.wasteThresholds.warn) + '%' }">
              <span>WARN</span>
            </div>
            <div class="preview-critical" style="flex:1">
              <span>CRITICAL</span>
            </div>
          </div>
          <div class="preview-labels">
            <span>0%</span>
            <span :style="{ marginLeft: store.wasteThresholds.warn + '%' }">{{ store.wasteThresholds.warn }}%</span>
            <span :style="{ marginLeft: (store.wasteThresholds.critical - store.wasteThresholds.warn) + '%' }">{{ store.wasteThresholds.critical }}%</span>
            <span style="margin-left:auto">100%</span>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════════
           TAB 3: SYSTEM CONFIG
      ══════════════════════════════════════════════════════════════ -->
      <div v-if="activeTab === 'system'" class="tab-panel">
        <div class="panel-header">
          <span class="material-symbols-rounded panel-icon" style="color:#10b981">tune</span>
          <div>
            <h2 class="panel-title">System Configuration</h2>
            <p class="panel-sub">Global flags, integrations, and operator rules</p>
          </div>
        </div>

        <div class="config-list">
          <!-- Toggle Items -->
          <div
            v-for="flag in boolFlags"
            :key="flag.key"
            class="config-item"
          >
            <div class="config-info">
              <span class="material-symbols-rounded config-icon" :style="{ color: flag.color }">{{ flag.icon }}</span>
              <div>
                <p class="config-label">{{ flag.label }}</p>
                <p class="config-desc">{{ flag.desc }}</p>
              </div>
            </div>
            <button
              class="toggle-switch"
              :class="{ 'toggle-switch--on': store.systemConfig[flag.key] }"
              @click="store.updateSystemConfig(flag.key, !store.systemConfig[flag.key])"
            >
              <span class="toggle-thumb" />
            </button>
          </div>

          <!-- Text Config: Export Recipient -->
          <div class="config-item config-item--text">
            <div class="config-info">
              <span class="material-symbols-rounded config-icon" style="color:#3b82f6">send</span>
              <div>
                <p class="config-label">Export Recipient Name</p>
                <p class="config-desc">Display name shown on the analytics "Export &amp; Forward" button</p>
              </div>
            </div>
            <div class="recipient-pills">
              <button
                v-for="name in recipientOptions"
                :key="name"
                class="recipient-pill"
                :class="{ 'recipient-pill--active': store.systemConfig.exportRecipient === name }"
                @click="store.updateSystemConfig('exportRecipient', name)"
              >{{ name }}</button>
            </div>
          </div>

          <!-- Production Week Override -->
          <div class="config-item config-item--text">
            <div class="config-info">
              <span class="material-symbols-rounded config-icon" style="color:#8b5cf6">calendar_month</span>
              <div>
                <p class="config-label">Production Week</p>
                <p class="config-desc">Current: {{ store.currentProductionWeek }}</p>
              </div>
            </div>
            <div class="week-steppers">
              <button class="step-btn step-btn--minus" @click="shiftWeek(-1)">
                <span class="material-symbols-rounded">chevron_left</span>
              </button>
              <span class="week-display">{{ store.currentProductionWeek }}</span>
              <button class="step-btn step-btn--plus" @click="shiftWeek(+1)">
                <span class="material-symbols-rounded">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </div>

    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useMesStore } from '@/store/mesStore.js'

const store = useMesStore()

// ─── Nav state ──────────────────────────────────────────────────────────────
const activeTab    = ref('rates')
const selectedType = ref('50')

// ─── Rate config ────────────────────────────────────────────────────────────
const dividerTypes = ['50', '40', '30', '16', '12', '45']
const sizes        = ['9cm', '7cm']
const placements   = ['ብተና', 'ውስጥ', 'የተለየ']

function getRate(type, size, placement) {
  return store.pieceRates?.[type]?.[size]?.[placement] ?? 0
}

function adjustRate(type, size, placement, delta) {
  const current = getRate(type, size, placement)
  store.setPieceRate(type, size, placement, Math.max(0, +(current + delta).toFixed(2)))
}

// ─── System flags ───────────────────────────────────────────────────────────
const boolFlags = [
  { key: 'autoPauseOnDowntime',     label: 'Auto-Pause on Downtime',       desc: 'Disable production entry when a downtime session is active', icon: 'pause_circle',  color: '#f59e0b' },
  { key: 'requireOperatorForEntry', label: 'Require Operator for Entry',    desc: 'Block production saves unless an operator is clocked in',   icon: 'badge',         color: '#6366f1' },
  { key: 'telegramBotEnabled',      label: 'Telegram Bot Integration',      desc: 'Enable automated report forwarding via Telegram',           icon: 'send',          color: '#3b82f6' },
]
const recipientOptions = ['Frezer', 'Manager', 'Owner', 'Selam']

// ─── Week stepper ───────────────────────────────────────────────────────────
function shiftWeek(delta) {
  const current = store.currentProductionWeek // e.g. "W29-2026"
  const match = current.match(/W(\d+)-(\d+)/)
  if (!match) return
  let week = Number(match[1]) + delta
  let year = Number(match[2])
  if (week < 1)  { year--; week = 52 }
  if (week > 52) { year++; week = 1 }
  store.setProductionWeek(`W${String(week).padStart(2,'0')}-${year}`)
}

// ─── Apply confirmation ─────────────────────────────────────────────────────
const saved = ref(false)
let savedTimer = null
function applyChanges() {
  saved.value = true
  clearTimeout(savedTimer)
  savedTimer = setTimeout(() => { saved.value = false }, 2500)
}
</script>

<style scoped>
.admin-layout {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #0f172a;
}

/* ── Sidebar ───────────────────────────────────────────────────────────── */
.admin-sidebar {
  width: 25%;
  min-width: 260px;
  background: #1e293b;
  border-right: 1px solid rgba(16,185,129,.2);
  display: flex;
  flex-direction: column;
  padding: 1.25rem 1rem;
  gap: 1rem;
  overflow: hidden;
}

.sidebar-brand { display: flex; align-items: center; gap: .7rem; padding-bottom: .75rem; border-bottom: 1px solid rgba(255,255,255,.07); }
.brand-icon    { font-size: 1.5rem !important; color: #10b981; }
.brand-title   { font-size: .95rem; font-weight: 800; color: #f1f5f9; }
.brand-sub     { font-size: .62rem; color: #64748b; text-transform: uppercase; letter-spacing: .06em; }

.settings-nav { display: flex; flex-direction: column; gap: .4rem; flex: 1; }
.snav-item {
  display: flex; align-items: center; gap: .7rem;
  padding: .85rem .9rem;
  background: transparent;
  border: 1px solid rgba(255,255,255,.07);
  border-radius: .7rem;
  color: #64748b;
  cursor: pointer;
  transition: all .15s ease;
  text-align: left;
  -webkit-tap-highlight-color: transparent;
}
.snav-item:hover        { background: rgba(255,255,255,.05); color: #cbd5e1; }
.snav-item--active      { background: rgba(16,185,129,.12); border-color: #10b981; color: #34d399; }
.snav-icon              { font-size: 1.25rem !important; flex-shrink: 0; }
.snav-text              { flex: 1; }
.snav-label             { font-size: .85rem; font-weight: 700; display: block; }
.snav-sub               { font-size: .62rem; color: #475569; display: block; margin-top: .05rem; }
.snav-item--active .snav-sub { color: rgba(52,211,153,.6); }
.snav-arrow             { font-size: 1rem !important; opacity: .4; }

.apply-btn {
  height: 4.5rem;
  background: linear-gradient(135deg,#059669,#10b981);
  border: none;
  border-radius: .85rem;
  color: #fff;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: .07em;
  display: flex; align-items: center; justify-content: center; gap: .5rem;
  cursor: pointer;
  transition: all .15s ease;
  flex-shrink: 0;
}
.apply-btn:hover  { filter: brightness(1.1); }
.apply-btn:active { transform: scale(.97); }

.saved-toast {
  background: rgba(16,185,129,.9);
  color: #fff;
  border-radius: .55rem;
  padding: .5rem .9rem;
  font-size: .8rem; font-weight: 700;
  display: flex; align-items: center; gap: .35rem;
  text-align: center; justify-content: center;
}
.toast-enter-active, .toast-leave-active { transition: all .2s ease; }
.toast-enter-from, .toast-leave-to       { opacity: 0; }

/* ── Main Panel ────────────────────────────────────────────────────────── */
.admin-main {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem 2rem;
}

.tab-panel { display: flex; flex-direction: column; gap: 1.25rem; }

.panel-header {
  display: flex; align-items: center; gap: .85rem;
  padding-bottom: .9rem;
  border-bottom: 1px solid rgba(255,255,255,.07);
}
.panel-icon  { font-size: 1.6rem !important; }
.panel-title { font-size: 1.1rem; font-weight: 800; color: #f1f5f9; }
.panel-sub   { font-size: .72rem; color: #64748b; margin-top: .15rem; }

/* ── Type Tabs ─────────────────────────────────────────────────────────── */
.type-tabs {
  display: flex; gap: .5rem;
}
.type-tab {
  flex: 1;
  height: 3rem;
  background: #1e293b;
  border: 1px solid rgba(255,255,255,.09);
  color: #64748b;
  border-radius: .6rem;
  font-size: 1rem; font-weight: 800;
  cursor: pointer;
  transition: all .13s ease;
}
.type-tab:hover      { background: #253347; color: #e2e8f0; }
.type-tab--active    { background: rgba(99,102,241,.2); border-color: #6366f1; color: #a5b4fc; }

/* ── Rate Grid ─────────────────────────────────────────────────────────── */
.rate-grid { display: flex; flex-direction: column; gap: 1rem; }
.rate-group {
  background: #1e293b;
  border: 1px solid rgba(255,255,255,.07);
  border-radius: .85rem;
  overflow: hidden;
}
.rate-group-title {
  display: flex; align-items: center; gap: .4rem;
  padding: .6rem 1rem;
  background: rgba(99,102,241,.08);
  border-bottom: 1px solid rgba(255,255,255,.07);
  font-size: .72rem; font-weight: 800; color: #a5b4fc;
  letter-spacing: .08em; text-transform: uppercase;
}
.rate-rows { display: flex; flex-direction: column; }
.rate-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: .85rem 1rem;
  border-bottom: 1px solid rgba(255,255,255,.05);
  gap: 1rem;
}
.rate-row:last-child { border-bottom: none; }
.rate-meta { display: flex; align-items: center; gap: .6rem; }
.placement-badge {
  background: rgba(99,102,241,.12);
  border: 1px solid rgba(99,102,241,.25);
  color: #a5b4fc;
  padding: .2rem .6rem;
  border-radius: .35rem;
  font-size: .8rem; font-weight: 700;
}
.rate-key { font-size: .7rem; color: #475569; }

/* ── Stepper ───────────────────────────────────────────────────────────── */
.stepper {
  display: flex; align-items: center; gap: .5rem;
}
.step-btn {
  width: 3rem; height: 3rem;
  border-radius: .6rem;
  border: 1px solid rgba(255,255,255,.1);
  background: #0f172a;
  color: #e2e8f0;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: all .13s ease;
  -webkit-tap-highlight-color: transparent;
}
.step-btn:hover { background: #1a2636; }
.step-btn:active { transform: scale(.92); }
.step-btn--plus  { border-color: rgba(99,102,241,.3); color: #a5b4fc; }
.step-btn--minus { border-color: rgba(239,68,68,.25);  color: #f87171; }
.step-btn .material-symbols-rounded { font-size: 1.2rem !important; }

.step-display {
  min-width: 7rem;
  text-align: center;
  background: #0f172a;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: .6rem;
  padding: .45rem .75rem;
  display: flex; align-items: center; justify-content: center; gap: .3rem;
}
.step-currency { font-size: .7rem; color: #64748b; font-weight: 600; }
.step-val      { font-size: 1.25rem; font-weight: 900; color: #f1f5f9; font-variant-numeric: tabular-nums; }

/* ── Threshold Cards ────────────────────────────────────────────────────── */
.threshold-cards { display: flex; flex-direction: column; gap: 1rem; }
.threshold-card {
  background: #1e293b;
  border: 1px solid rgba(255,255,255,.07);
  border-radius: .85rem;
  padding: 1.25rem;
  display: flex; flex-direction: column; gap: 1rem;
}
.threshold-card--warn     { border-left: 3px solid #f59e0b; }
.threshold-card--critical { border-left: 3px solid #ef4444; }

.tc-header { display: flex; align-items: flex-start; gap: .85rem; }
.tc-title  { font-size: .95rem; font-weight: 800; color: #f1f5f9; }
.tc-sub    { font-size: .7rem; color: #64748b; margin-top: .1rem; }

.slider-area { display: flex; flex-direction: column; gap: .6rem; }
.slider-val-row { display: flex; align-items: baseline; gap: .5rem; }
.slider-val   { font-size: 2rem; font-weight: 900; font-variant-numeric: tabular-nums; line-height: 1; }
.slider-val.warn     { color: #fbbf24; }
.slider-val.critical { color: #f87171; }
.slider-hint  { font-size: .75rem; color: #64748b; }

.slider-with-steppers { display: flex; align-items: center; gap: .75rem; }
.slider-track-wrap {
  position: relative; flex: 1; height: 2.5rem;
  display: flex; align-items: center;
}
.mes-slider {
  width: 100%;
  height: 2.5rem;
  background: transparent;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
  position: relative;
  z-index: 2;
}
.mes-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 2rem; height: 2rem;
  border-radius: 50%;
  cursor: pointer;
}
.mes-slider--warn::-webkit-slider-thumb     { background: #f59e0b; box-shadow: 0 0 10px rgba(245,158,11,.5); }
.mes-slider--critical::-webkit-slider-thumb { background: #ef4444; box-shadow: 0 0 10px rgba(239,68,68,.5); }
.mes-slider::-webkit-slider-runnable-track {
  height: .5rem; border-radius: 999px; background: rgba(255,255,255,.08);
}
.slider-fill {
  position: absolute;
  left: 0; height: .5rem;
  border-radius: 999px;
  pointer-events: none;
  z-index: 1;
  top: 50%; transform: translateY(-50%);
  transition: width .2s ease;
}
.slider-fill--warn     { background: linear-gradient(90deg, #10b981, #f59e0b); }
.slider-fill--critical { background: linear-gradient(90deg, #f59e0b, #ef4444); }

.slider-scale {
  display: flex; justify-content: space-between;
  font-size: .62rem; color: #334155;
}

/* Alert Preview Bar */
.alert-preview { margin-top: .5rem; }
.preview-title { font-size: .7rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .08em; margin-bottom: .5rem; }
.preview-bar-track {
  display: flex;
  height: 2.5rem;
  border-radius: .5rem;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.07);
}
.preview-ok, .preview-warn, .preview-critical {
  display: flex; align-items: center; justify-content: center;
  font-size: .65rem; font-weight: 800; letter-spacing: .07em;
  min-width: 40px;
  transition: width .3s ease;
}
.preview-ok       { background: rgba(16,185,129,.25); color: #34d399; }
.preview-warn     { background: rgba(245,158,11,.25); color: #fbbf24; }
.preview-critical { background: rgba(239,68,68,.25);  color: #f87171; }
.preview-labels {
  display: flex; align-items: center;
  font-size: .62rem; color: #475569; margin-top: .35rem;
}

/* ── System Config ──────────────────────────────────────────────────────── */
.config-list { display: flex; flex-direction: column; gap: .6rem; }
.config-item {
  display: flex; align-items: center; justify-content: space-between;
  background: #1e293b;
  border: 1px solid rgba(255,255,255,.07);
  border-radius: .85rem;
  padding: 1.1rem 1.25rem;
  gap: 1rem;
  min-height: 4.5rem;
}
.config-item--text { flex-wrap: wrap; }
.config-info  { display: flex; align-items: center; gap: .85rem; flex: 1; }
.config-icon  { font-size: 1.4rem !important; flex-shrink: 0; }
.config-label { font-size: .9rem; font-weight: 700; color: #f1f5f9; }
.config-desc  { font-size: .7rem; color: #64748b; margin-top: .1rem; }

/* Toggle Switch */
.toggle-switch {
  width: 3.5rem; height: 1.85rem;
  background: rgba(255,255,255,.1);
  border: 1px solid rgba(255,255,255,.15);
  border-radius: 999px;
  position: relative;
  cursor: pointer;
  transition: background .2s ease;
  flex-shrink: 0;
}
.toggle-switch--on { background: #10b981; border-color: #059669; }
.toggle-thumb {
  position: absolute;
  top: .17rem; left: .17rem;
  width: 1.4rem; height: 1.4rem;
  background: #fff;
  border-radius: 50%;
  transition: left .2s ease;
  box-shadow: 0 1px 4px rgba(0,0,0,.3);
}
.toggle-switch--on .toggle-thumb { left: calc(100% - 1.57rem); }

/* Recipient Pills */
.recipient-pills { display: flex; gap: .4rem; flex-wrap: wrap; }
.recipient-pill {
  padding: .45rem 1rem;
  background: #0f172a;
  border: 1px solid rgba(255,255,255,.09);
  color: #64748b;
  border-radius: 999px;
  font-size: .82rem; font-weight: 700;
  cursor: pointer;
  transition: all .13s ease;
  min-height: 2.5rem;
}
.recipient-pill--active { background: rgba(59,130,246,.2); border-color: #3b82f6; color: #93c5fd; }

/* Week Steppers */
.week-steppers { display: flex; align-items: center; gap: .5rem; }
.week-display  { font-size: 1rem; font-weight: 800; color: #a5b4fc; min-width: 7rem; text-align: center; }
</style>
