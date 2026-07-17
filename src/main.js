import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router/index.js'
import './style.css'

// Vite PWA Service Worker Registration
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  onNeedRefresh() {
    console.log('New content available, please refresh.')
  },
  onOfflineReady() {
    console.log('App is ready to work offline.')
  },
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
