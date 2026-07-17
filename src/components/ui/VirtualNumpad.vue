<template>
  <div class="numpad-wrapper">
    <!-- Display -->
    <div class="numpad-display">
      <span class="display-label">{{ label }}</span>
      <span class="display-value">{{ displayValue || '0' }}</span>
    </div>

    <!-- Grid of keys -->
    <div class="numpad-grid">
      <button
        v-for="key in keys"
        :key="key"
        class="numpad-key"
        :class="{
          'key--action': key === 'CLR' || key === 'DEL',
          'key--zero':   key === '0',
          'key--del':    key === 'DEL',
          'key--clr':    key === 'CLR',
        }"
        @click="handleKey(key)"
      >
        <span v-if="key === 'DEL'" class="material-symbols-rounded" style="font-size:1.8rem">backspace</span>
        <template v-else>{{ key }}</template>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  label:    { type: String,  default: 'Enter Value' },
  maxLen:   { type: Number,  default: 8 },
  modelValue: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'submit'])

const keys = ['7','8','9','4','5','6','1','2','3','CLR','0','DEL']

const displayValue = ref(props.modelValue || '')

watch(() => props.modelValue, (v) => {
  displayValue.value = v
})

function handleKey(key) {
  if (key === 'CLR') {
    displayValue.value = ''
  } else if (key === 'DEL') {
    displayValue.value = displayValue.value.slice(0, -1)
  } else {
    if (displayValue.value.length >= props.maxLen) return
    displayValue.value += key
  }
  emit('update:modelValue', displayValue.value)
}
</script>

<style scoped>
.numpad-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}

.numpad-display {
  background: #0f172a;
  border: 1px solid rgba(99,102,241,.4);
  border-radius: .75rem;
  padding: .75rem 1.25rem;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-height: 5rem;
}
.display-label {
  font-size: .7rem;
  color: #64748b;
  letter-spacing: .08em;
  text-transform: uppercase;
  font-weight: 600;
}
.display-value {
  font-size: 3rem;
  font-weight: 800;
  color: #e2e8f0;
  letter-spacing: .05em;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.numpad-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: .55rem;
}

.numpad-key {
  height: 5.5rem;
  font-size: 2.2rem;
  font-weight: 700;
  color: #e2e8f0;
  background: #1e293b;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: .75rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background .1s ease, transform .08s ease;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}
.numpad-key:hover  { background: #334155; }
.numpad-key:active { transform: scale(.95); background: #475569; }

.key--zero { grid-column: span 1; }

.key--del {
  background: rgba(239,68,68,.12);
  border-color: rgba(239,68,68,.3);
  color: #f87171;
}
.key--del:hover  { background: rgba(239,68,68,.22); }
.key--del:active { background: rgba(239,68,68,.35); }

.key--clr {
  background: rgba(245,158,11,.12);
  border-color: rgba(245,158,11,.3);
  color: #fbbf24;
  font-size: 1.1rem;
  letter-spacing: .05em;
}
.key--clr:hover  { background: rgba(245,158,11,.22); }
.key--clr:active { background: rgba(245,158,11,.35); }
</style>
