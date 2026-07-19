<template>
  <div class="kpi-card">
    <!-- Icon slot (optional) -->
    <div v-if="icon" class="kpi-icon-wrap" :style="{ background: iconBg }">
      <span class="material-symbols-rounded kpi-icon" :style="{ color: iconColor }">{{ icon }}</span>
    </div>

    <div class="kpi-body">
      <p class="kpi-title">{{ title }}</p>
      <p class="kpi-value">{{ value }}</p>

      <!-- Trend badge -->
      <div v-if="trend !== null && trend !== undefined" class="kpi-trend" :class="trendClass">
        <span class="material-symbols-rounded trend-arrow">
          {{ trendPositive ? 'trending_up' : 'trending_down' }}
        </span>
        <span class="trend-text">{{ Math.abs(trend) }}%</span>
        <span class="trend-label">{{ trendLabel }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  /** Label above the big number */
  title:       { type: String,           required: true },
  /** The big number / value to display */
  value:       { type: [String, Number], required: true },
  /** Trend percentage — positive = up, negative = down, null = hidden */
  trend:       { type: Number,           default: null },
  /** Contextual label next to trend badge (e.g. "vs last week") */
  trendLabel:  { type: String,           default: 'vs last week' },
  /**
   * Override whether trend UP is "good". Default: positive = good (green).
   * Set :trend-up-is-bad="true" for waste-rate metrics where higher = worse.
   */
  trendUpIsBad: { type: Boolean, default: false },
  /** Material Symbol icon name */
  icon:        { type: String,  default: '' },
  /** Icon bg color (CSS value) */
  iconBg:      { type: String,  default: 'rgba(99,102,241,.15)' },
  /** Icon foreground color */
  iconColor:   { type: String,  default: '#a5b4fc' },
})

const trendPositive = computed(() => props.trend > 0)

// "Good" depends on context: for production, up is good; for waste, up is bad
const trendIsGood = computed(() => {
  if (props.trend === 0) return null
  return props.trendUpIsBad ? !trendPositive.value : trendPositive.value
})

const trendClass = computed(() => {
  if (props.trend === 0 || props.trend === null) return 'trend--neutral'
  return trendIsGood.value ? 'trend--good' : 'trend--bad'
})
</script>

<style scoped>
.kpi-card {
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, .07);
  border-radius: 1rem;
  padding: 1.5rem;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  transition: border-color .2s ease, box-shadow .2s ease;
}
.kpi-card:hover {
  border-color: rgba(255,255,255,.14);
  box-shadow: 0 4px 24px rgba(0,0,0,.3);
}

/* ── Icon ──────────────────────────────────────────────────────────────── */
.kpi-icon-wrap {
  width: 3rem;
  height: 3rem;
  border-radius: .75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.kpi-icon { font-size: 1.5rem !important; }

/* ── Body ──────────────────────────────────────────────────────────────── */
.kpi-body {
  display: flex;
  flex-direction: column;
  gap: .3rem;
  min-width: 0;
}

.kpi-title {
  font-size: .65rem;
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: #64748b;
  margin: 0;
}

.kpi-value {
  font-size: 2.75rem;
  font-weight: 900;
  color: #f1f5f9;
  line-height: 1;
  letter-spacing: -.01em;
  font-variant-numeric: tabular-nums;
  margin: 0;
}

/* ── Trend badge ───────────────────────────────────────────────────────── */
.kpi-trend {
  display: inline-flex;
  align-items: center;
  gap: .2rem;
  padding: .18rem .5rem;
  border-radius: 999px;
  font-size: .65rem;
  font-weight: 700;
  margin-top: .15rem;
  width: fit-content;
}

.trend-arrow { font-size: .85rem !important; }
.trend-label { color: inherit; opacity: .7; margin-left: .15rem; }

.trend--good    { background: rgba(16,185,129,.15);  color: #34d399; }
.trend--bad     { background: rgba(239,68,68,.15);   color: #f87171; }
.trend--neutral { background: rgba(100,116,139,.15); color: #94a3b8; }
</style>
