import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import App from './App.vue'
import router from './router/index.js'
import './style.css'

// Vite PWA Service Worker Registration
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  onNeedRefresh() {
    console.log('[PWA] New content available, please refresh.')
  },
  onOfflineReady() {
    console.log('[PWA] App is ready to work fully offline.')
  },
})

const pinia = createPinia()
// Automatically persist any store that sets `persist: true`
// Uses localStorage by default — survives power loss, browser restarts, and offline reboots
pinia.use(piniaPluginPersistedstate)

const app = createApp(App)
app.use(pinia)
app.use(router)
app.mount('#app')
