<template>
  <Teleport to="body">
    <div class="pin-overlay" @click.self="$emit('cancel')">
      <div class="pin-modal">
        <!-- Header -->
        <div class="pin-header">
          <span class="material-symbols-rounded pin-icon" :style="{ color: iconColor }">{{ icon }}</span>
          <div>
            <h2 class="pin-title">{{ title }}</h2>
            <p class="pin-sub">{{ subtitle }}</p>
          </div>
        </div>

        <!-- Info slot -->
        <slot name="info" />

        <!-- PIN display -->
        <div class="pin-dots">
          <div
            v-for="i in 4"
            :key="i"
            class="pin-dot"
            :class="{ 'pin-dot--filled': enteredPin.length >= i }"
          />
        </div>

        <p v-if="errorMsg" class="pin-error">
          <span class="material-symbols-rounded" style="font-size:1rem">error</span>
          {{ errorMsg }}
        </p>

        <!-- Numpad -->
        <div class="pin-pad">
          <button
            v-for="key in ['1','2','3','4','5','6','7','8','9','','0','⌫']"
            :key="key"
            class="pad-key"
            :class="{ 'pad-key--empty': key === '', 'pad-key--del': key === '⌫' }"
            :disabled="key === ''"
            @click="pressKey(key)"
          >{{ key }}</button>
        </div>

        <!-- Actions -->
        <div class="pin-actions">
          <button class="btn-pin-cancel" @click="$emit('cancel')">Cancel</button>
          <button
            class="btn-pin-confirm"
            :style="{ background: confirmColor }"
            :disabled="enteredPin.length < 4 || loading"
            @click="confirm"
          >
            <span class="material-symbols-rounded">{{ loading ? 'hourglass_top' : 'lock_open' }}</span>
            {{ loading ? 'Verifying…' : confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  title:        { type: String, default: 'Enter PIN' },
  subtitle:     { type: String, default: 'Enter your 4-digit PIN to continue' },
  icon:         { type: String, default: 'pin' },
  iconColor:    { type: String, default: '#6366f1' },
  confirmLabel: { type: String, default: 'Confirm' },
  confirmColor: { type: String, default: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
  loading:      { type: Boolean, default: false },
  errorMsg:     { type: String, default: '' },
})

const emit = defineEmits(['confirm', 'cancel'])

const enteredPin = ref('')

function pressKey(key) {
  if (key === '⌫') {
    enteredPin.value = enteredPin.value.slice(0, -1)
  } else if (enteredPin.value.length < 4) {
    enteredPin.value += key
  }
}

function confirm() {
  if (enteredPin.value.length === 4 && !props.loading) {
    emit('confirm', enteredPin.value)
  }
}

// Reset when shown
function reset() { enteredPin.value = '' }
defineExpose({ reset })
</script>

<style scoped>
.pin-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.75);
  backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  z-index: 999;
}

.pin-modal {
  background: #1e293b;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 1.5rem;
  padding: 2rem;
  width: min(95vw, 380px);
  box-shadow: 0 30px 80px rgba(0,0,0,0.6);
  display: flex; flex-direction: column; gap: 1.25rem;
}

.pin-header { display: flex; align-items: center; gap: 1rem; }
.pin-icon   { font-size: 2rem; flex-shrink: 0; }
.pin-title  { font-size: 1.2rem; font-weight: 900; color: #f1f5f9; margin: 0; }
.pin-sub    { font-size: 0.8rem; color: #64748b; margin: 0.2rem 0 0 0; }

.pin-dots {
  display: flex; justify-content: center; gap: 1rem;
}
.pin-dot {
  width: 1.1rem; height: 1.1rem; border-radius: 50%;
  border: 2px solid #334155; background: transparent;
  transition: all 0.15s ease;
}
.pin-dot--filled {
  background: #6366f1; border-color: #6366f1;
  box-shadow: 0 0 8px rgba(99,102,241,0.5);
}

.pin-error {
  display: flex; align-items: center; justify-content: center; gap: 0.4rem;
  color: #f87171; font-size: 0.85rem; font-weight: 700;
  background: rgba(239,68,68,0.08); padding: 0.6rem;
  border-radius: 0.6rem; margin: -0.5rem 0;
}

.pin-pad {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.6rem;
}
.pad-key {
  height: 4rem;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 0.75rem;
  color: #f1f5f9;
  font-size: 1.4rem; font-weight: 700;
  cursor: pointer;
  transition: all 0.12s ease;
  -webkit-tap-highlight-color: transparent;
}
.pad-key:hover:not(:disabled)  { background: rgba(255,255,255,0.1); }
.pad-key:active:not(:disabled) { transform: scale(0.94); background: rgba(99,102,241,0.2); }
.pad-key--empty   { background: transparent; border-color: transparent; cursor: default; }
.pad-key--del     { color: #94a3b8; font-size: 1.1rem; }

.pin-actions { display: flex; gap: 0.75rem; }
.btn-pin-cancel, .btn-pin-confirm {
  flex: 1; padding: 0.9rem;
  border-radius: 0.85rem; border: none;
  font-size: 1rem; font-weight: 800; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 0.5rem;
  transition: all 0.15s ease;
}
.btn-pin-cancel {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: #94a3b8;
}
.btn-pin-cancel:hover { background: rgba(255,255,255,0.1); color: #e2e8f0; }
.btn-pin-confirm {
  color: #fff;
}
.btn-pin-confirm:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-pin-confirm:not(:disabled):active { transform: scale(0.97); }
</style>
