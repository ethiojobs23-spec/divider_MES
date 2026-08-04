<template>
  <div :class="[sizeClass, customClass, !hasImage ? (color || 'bg-slate-500') : '']" class="relative overflow-hidden flex items-center justify-center rounded-full shrink-0">
    <img 
      v-if="hasImage" 
      :src="avatar" 
      :alt="name"
      class="w-full h-full object-cover"
      @error="handleError"
    />
    <span v-else class="text-white font-bold leading-none">{{ initial }}</span>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  avatar: { type: String, default: '' },
  name: { type: String, default: 'Unknown' },
  color: { type: String, default: 'bg-slate-500' },
  size: { type: String, default: 'md' }, // sm, md, lg, xl
  customClass: { type: String, default: '' }
})

const imageError = ref(false)

watch(() => props.avatar, () => {
  imageError.value = false
})

const hasImage = computed(() => {
  return props.avatar && props.avatar.length > 5 && !imageError.value
})

const initial = computed(() => {
  if (props.avatar && props.avatar.length === 1) return props.avatar.toUpperCase()
  return props.name ? String(props.name).charAt(0).toUpperCase() : '?'
})

const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm': return 'w-6 h-6 text-xs'
    case 'md': return 'w-10 h-10 text-lg'
    case 'lg': return 'w-16 h-16 text-2xl'
    case 'xl': return 'w-24 h-24 text-4xl'
    default: return 'w-10 h-10 text-lg'
  }
})

function handleError() {
  imageError.value = true
}
</script>
