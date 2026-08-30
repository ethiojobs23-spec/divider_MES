// Developer: Mintesnot Abebe | Brand: dev MinteIO
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import App from './App.vue'
import router from './router/index.js'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/inter/800.css'
import '@fontsource/inter/900.css'
import 'material-symbols/rounded.css'
import './style.css'

// Vite PWA Service Worker Registration
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateSW(true)
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
