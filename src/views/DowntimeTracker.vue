<template>
  <AppLayout>
    <div class="h-full w-full flex flex-col bg-slate-900 text-slate-100 overflow-hidden relative">
      
      <!-- ── Header ── -->
      <header class="flex-shrink-0 flex items-center gap-4 p-6 bg-slate-800 border-b border-rose-500/20">
        <span class="material-symbols-rounded text-4xl text-rose-500">engineering</span>
        <div>
          <h1 class="text-2xl font-black tracking-wide">Machine Downtime & Maintenance</h1>
          <p class="text-sm text-slate-400 font-medium">Log equipment failures and calculate financial impact in real-time</p>
        </div>
      </header>

      <!-- ── Main Grid ── -->
      <div class="flex-1 overflow-y-auto p-6">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          
          <!-- ── Left Panel: Active Issues & Reporting ── -->
          <div class="flex flex-col gap-6">
            
            <!-- Report Form -->
            <div class="bg-slate-800 rounded-2xl p-6 border border-white/5 shadow-xl">
              <h2 class="text-lg font-black uppercase tracking-widest text-slate-300 mb-6 flex items-center gap-2">
                <span class="material-symbols-rounded text-rose-400">report</span>
                Report Machine Fault
              </h2>
              
              <div class="flex flex-col gap-5">
                <!-- Machine Select -->
                <div>
                  <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Select Machine</label>
                  <select v-model="selectedMachine" class="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-white font-bold appearance-none outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all">
                    <option disabled value="">-- Choose Equipment --</option>
                    <option v-for="m in downtimeStore.machines" :key="m.id" :value="m.id">
                      {{ m.name }} (Cap: {{ m.hourly_capacity }}/hr)
                    </option>
                  </select>
                </div>
                
                <!-- Category Select -->
                <div>
                  <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Fault Category</label>
                  <select v-model="selectedCategory" class="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-white font-bold appearance-none outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all">
                    <option disabled value="">-- Choose Category --</option>
                    <option v-for="cat in downtimeStore.categories" :key="cat" :value="cat">
                      {{ cat }}
                    </option>
                  </select>
                </div>

                <button 
                  @click="submitReport"
                  :disabled="!selectedMachine || !selectedCategory"
                  class="mt-2 w-full flex items-center justify-center gap-3 p-5 rounded-xl font-black text-lg transition-all"
                  :class="(selectedMachine && selectedCategory) ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 active:scale-95' : 'bg-slate-700 text-slate-500 cursor-not-allowed'"
                >
                  <span class="material-symbols-rounded">warning</span>
                  REPORT MACHINE DOWN
                </button>
              </div>
            </div>

            <!-- Active Alerts -->
            <div>
              <h2 class="text-sm font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                Active Critical Alerts ({{ downtimeStore.activeIssues.length }})
              </h2>
              
              <div v-if="downtimeStore.activeIssues.length === 0" class="bg-slate-800/50 rounded-2xl p-8 border border-dashed border-white/10 flex flex-col items-center justify-center text-center">
                <span class="material-symbols-rounded text-4xl text-emerald-500 mb-2">check_circle</span>
                <p class="text-slate-400 font-bold">All machines operational</p>
              </div>
              
              <div v-else class="flex flex-col gap-4">
                <div 
                  v-for="issue in downtimeStore.activeIssues" 
                  :key="issue.id"
                  class="bg-rose-950/30 border border-rose-500/50 rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden"
                >
                  <div class="absolute top-0 left-0 w-1 h-full bg-rose-500 animate-pulse"></div>
                  
                  <div class="flex justify-between items-start">
                    <div>
                      <h3 class="font-bold text-white text-lg">{{ getMachineName(issue.machine_id) }}</h3>
                      <p class="text-rose-400 font-semibold text-sm">{{ issue.category }}</p>
                    </div>
                    <div class="bg-rose-500/20 text-rose-300 px-3 py-1 rounded-full text-xs font-black tracking-widest flex items-center gap-2">
                      <span class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                      DOWN
                    </div>
                  </div>
                  
                  <div class="flex items-center gap-2 text-slate-300 bg-slate-900/50 px-3 py-2 rounded-lg">
                    <span class="material-symbols-rounded text-lg text-slate-400">timer</span>
                    <span class="font-mono font-bold">{{ getElapsedTime(issue.start_time) }}</span>
                  </div>

                  <button 
                    @click="resolveIssue(issue.id)"
                    class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                  >
                    <span class="material-symbols-rounded">build_circle</span>
                    MARK RESOLVED
                  </button>
                </div>
              </div>
            </div>

          </div>

          <!-- ── Right Panel: Analytics & History ── -->
          <div class="flex flex-col gap-6">
            
            <!-- Revenue Impact Card -->
            <div class="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-white/5 shadow-2xl relative overflow-hidden">
              <div class="absolute -right-10 -bottom-10 opacity-5">
                <span class="material-symbols-rounded" style="font-size: 15rem;">monitoring</span>
              </div>
              <h2 class="text-sm font-black uppercase tracking-widest text-slate-400 mb-2">Estimated Lost Revenue (Week)</h2>
              <div class="flex items-end gap-3 mt-4">
                <span class="text-5xl font-black font-mono text-amber-400">{{ formatCurrency(downtimeStore.weeklyLostRevenue) }}</span>
                <span class="text-xl font-bold text-slate-500 mb-1">ETB</span>
              </div>
              <p class="text-xs text-slate-500 mt-4 max-w-sm">
                Calculated dynamically based on machine hourly capacities, total downtime minutes, and the standard average piece-rate.
              </p>
            </div>

            <!-- Resolved History -->
            <div class="bg-slate-800 rounded-2xl p-6 border border-white/5 flex-1 flex flex-col min-h-[400px]">
              <h2 class="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 border-b border-white/5 pb-4">
                Maintenance History (Resolved)
              </h2>
              
              <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <div v-if="downtimeStore.resolvedIssues.length === 0" class="text-center text-slate-500 font-medium py-10">
                  No resolved maintenance logs for this week.
                </div>
                
                <div v-else class="flex flex-col gap-4">
                  <div 
                    v-for="log in downtimeStore.resolvedIssues" 
                    :key="log.id"
                    class="flex flex-col gap-2 p-4 rounded-xl bg-slate-900/50 border border-white/5 hover:border-white/10 transition-colors"
                  >
                    <div class="flex justify-between items-start">
                      <h3 class="font-bold text-emerald-400">{{ getMachineName(log.machine_id) }}</h3>
                      <span class="text-xs font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded">{{ log.category }}</span>
                    </div>
                    
                    <div class="flex flex-col gap-1 mt-2">
                      <div class="flex items-center gap-2 text-xs text-slate-400">
                        <span class="material-symbols-rounded text-[1rem]">calendar_clock</span>
                        <span>{{ formatEastAfricaTime(log.start_time) }} &nbsp;&mdash;&nbsp; {{ formatEastAfricaTime(log.end_time) }}</span>
                      </div>
                      <div class="flex items-center gap-2 text-xs text-slate-400">
                        <span class="material-symbols-rounded text-[1rem]">schedule</span>
                        <span class="font-bold text-slate-300">Total Duration: {{ calculateTotalDuration(log.start_time, log.end_time) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
          
        </div>
      </div>
      
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import { useDowntimeStore } from '@/store/downtimeStore'

const downtimeStore = useDowntimeStore()

const selectedMachine = ref('')
const selectedCategory = ref('')

// Reactive trigger for live elapsed time updates
const now = ref(Date.now())
let timerInterval = null

onMounted(() => {
  timerInterval = setInterval(() => {
    now.value = Date.now()
  }, 60000) // Update every minute
})

onUnmounted(() => {
  clearInterval(timerInterval)
})

function submitReport() {
  if (selectedMachine.value && selectedCategory.value) {
    downtimeStore.reportDowntime(selectedMachine.value, selectedCategory.value)
    // Reset form
    selectedMachine.value = ''
    selectedCategory.value = ''
  }
}

function resolveIssue(logId) {
  downtimeStore.resolveDowntime(logId)
}

function getMachineName(id) {
  const m = downtimeStore.machines.find(m => m.id === id)
  return m ? m.name : 'Unknown Machine'
}

function getElapsedTime(isoStart) {
  const _trigger = now.value // Force reactivity
  const start = new Date(isoStart).getTime()
  const diffMinutes = Math.floor((Date.now() - start) / 60000)
  
  if (diffMinutes < 60) return `Down for ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`
  
  const h = Math.floor(diffMinutes / 60)
  const m = diffMinutes % 60
  return `Down for ${h}h ${m}m`
}

function calculateTotalDuration(isoStart, isoEnd) {
  const start = new Date(isoStart).getTime()
  const end = new Date(isoEnd).getTime()
  const diffMinutes = Math.floor((end - start) / 60000)
  
  if (diffMinutes < 60) return `${diffMinutes} minutes`
  const h = Math.floor(diffMinutes / 60)
  const m = diffMinutes % 60
  return `${h}h ${m}m`
}

function formatEastAfricaTime(isoString) {
  if (!isoString) return ''
  const date = new Date(isoString)
  return new Intl.DateTimeFormat('en-ET', {
    timeZone: 'Africa/Addis_Ababa',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date)
}

function formatCurrency(val) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.02);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
