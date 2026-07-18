<template>
  <button class="global-back-btn" @click="handleClick" :title="label">
    <span class="material-symbols-rounded btn-icon">arrow_back</span>
    <span class="btn-label">{{ label }}</span>
  </button>
</template>

<script setup>
import { useRouter } from 'vue-router'

const props = defineProps({
  /**
   * Button label text.
   * @default 'Back to Hub'
   */
  label: { type: String, default: 'Back to Hub' },
  /**
   * When true, navigates explicitly to the ModuleSelection hub instead of
   * calling router.back() — useful when the view was reached via a deep-link
   * or a fresh page load where history may be empty.
   * @default false
   */
  toHub: { type: Boolean, default: false },
})

const router = useRouter()

function handleClick() {
  if (props.toHub) {
    router.push({ name: 'ModuleSelection' })
  } else {
    router.back()
  }
}
</script>

<style scoped>
/* Fixed, floating — always visible above any full-screen view */
.global-back-btn {
  position: fixed;
  top: 1.5rem;
  left: 1.5rem;
  z-index: 50;

  /* Generous touch target */
  width: 12rem;      /* ≈ 192 px */
  height: 4rem;      /* ≈  64 px */

  display: flex;
  align-items: center;
  justify-content: center;
  gap: .65rem;

  /* Appearance */
  background: #1e293b;        /* slate-800 */
  border: 1px solid #475569;  /* slate-600 */
  border-radius: .875rem;
  color: #e2e8f0;
  font-family: 'Inter', sans-serif;
  font-size: .95rem;
  font-weight: 800;
  letter-spacing: .03em;

  /* Depth */
  box-shadow:
    0 8px 32px rgba(0,0,0,.55),
    0 2px 8px  rgba(0,0,0,.4);

  /* Interaction */
  cursor: pointer;
  transition:
    background   .13s ease,
    border-color .13s ease,
    transform    .08s ease,
    box-shadow   .13s ease;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

.global-back-btn:hover {
  background: #334155;        /* slate-700 */
  border-color: #64748b;      /* slate-500 */
  box-shadow:
    0 10px 40px rgba(0,0,0,.6),
    0 2px  10px rgba(0,0,0,.45);
}

.global-back-btn:active {
  transform: scale(.95);
  background: #475569;        /* slate-600 */
}

.btn-icon  { font-size: 1.35rem; flex-shrink: 0; }
.btn-label { font-size: .9rem; font-weight: 800; white-space: nowrap; }
</style>
