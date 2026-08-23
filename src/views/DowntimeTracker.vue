<template>
  <AppLayout>
    <div class="view-area">
      <!-- ── Header ── -->
      <div class="view-panel" style="flex: none; padding-bottom: 0; min-height: auto;">
        <div class="panel-header flex justify-between items-start">
          <div>
            <h2 class="panel-title">Machine Downtime & Maintenance</h2>
            <p class="panel-sub">Log equipment failures and calculate financial impact in real-time</p>
          </div>
        </div>
      </div>

      <!-- ── Main Grid ── -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 px-4 sm:px-6 md:px-8 pb-10 pt-6" style="overflow-y: auto;">
        
        <!-- ── Left Panel: Active Issues & Reporting ── -->
        <div class="flex flex-col gap-4">
          
          <!-- Report Form -->
          <div class="chart-card">
            <h3 style="color: #fb7185; border-bottom-color: rgba(225,29,72,0.2);">Report Machine Fault</h3>
            
            <div class="flex flex-col gap-4">
              <!-- Machine Select -->
              <div class="form-group">
                <label>Select Machine</label>
                <select v-model="selectedMachine" class="custom-select">
                  <option disabled value="">-- Choose Equipment --</option>
                  <option v-for="m in downtimeStore.machines" :key="m.id" :value="m.id">
                    {{ m.name }} (Cap: {{ m.hourly_capacity }}/hr)
                  </option>
                </select>
              </div>
              
              <!-- Category Select -->
              <div class="form-group">
                <label>Fault Category</label>
                <select v-model="selectedCategory" class="custom-select">
                  <option disabled value="">-- Choose Category --</option>
                  <option v-for="cat in downtimeStore.categories" :key="cat" :value="cat">
                    {{ cat }}
                  </option>
                </select>
              </div>

              <button 
                @click="submitReport"
                :disabled="!selectedMachine || !selectedCategory"
                class="btn-action mt-2"
                :class="(selectedMachine && selectedCategory) ? 'btn-action--danger' : 'btn-action--disabled'"
              >
                <span class="material-symbols-rounded">warning</span>
                REPORT MACHINE DOWN
              </button>
            </div>
          </div>

          <!-- Active Alerts -->
          <div class="chart-card" style="flex: 1;">
            <h3 style="color: #f87171; border-bottom-color: rgba(248,113,113,0.2);">
              Active Critical Alerts ({{ downtimeStore.activeIssues.length }})
            </h3>
            
            <div class="alerts-container">
              <div v-if="downtimeStore.activeIssues.length === 0" class="empty-state">
                <span class="material-symbols-rounded text-3xl text-emerald-500 mb-2">check_circle</span>
                <p>All machines operational</p>
              </div>
              
              <div v-else class="flex flex-col gap-3">
                <div 
                  v-for="issue in downtimeStore.activeIssues" 
                  :key="issue.id"
                  class="alert-row-large"
                >
                  <div class="absolute top-0 left-0 w-1 h-full bg-rose-500 animate-pulse"></div>
                  
                  <div class="flex justify-between items-start mb-3">
                    <div>
                      <h4 class="font-bold text-white text-lg m-0">{{ getMachineName(issue.machine_id) }}</h4>
                      <p class="text-rose-400 font-semibold text-sm m-0 mt-1">{{ issue.category }}</p>
                    </div>
                    <div class="badge-danger animate-pulse">
                      DOWN
                    </div>
                  </div>
                  
                  <div class="flex items-center justify-between gap-2 mb-3 bg-slate-900/50 px-3 py-2 rounded-lg border border-white/5">
                    <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">Elapsed Time</span>
                    <div class="flex items-center gap-1 text-slate-300">
                      <span class="material-symbols-rounded text-lg text-slate-400">timer</span>
                      <span class="font-mono font-bold">{{ getElapsedTime(issue.start_time) }}</span>
                    </div>
                  </div>

                  <button 
                    @click="resolveIssue(issue.id)"
                    class="btn-action btn-action--success w-full"
                    style="padding: 0.75rem;"
                  >
                    <span class="material-symbols-rounded">build_circle</span>
                    MARK RESOLVED
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Right Panel: Analytics & History ── -->
        <div class="flex flex-col gap-4">
          
          <!-- Revenue Impact Card -->
          <div class="chart-card overflow-hidden relative" style="background: linear-gradient(135deg, rgba(30,41,59,1) 0%, rgba(251,191,36,0.05) 100%); border-color: rgba(251,191,36,0.2);">
            <div class="absolute -right-10 -bottom-10 opacity-5 pointer-events-none">
              <span class="material-symbols-rounded" style="font-size: 15rem;">monitoring</span>
            </div>
            <h3 style="color: #fbbf24; border-bottom-color: rgba(251,191,36,0.2);">Estimated Lost Revenue (Week)</h3>
            <div class="flex items-end gap-3 my-2">
              <span class="text-5xl font-black font-mono text-amber-400">{{ formatCurrency(downtimeStore.weeklyLostRevenue) }}</span>
              <span class="text-xl font-bold text-slate-500 mb-1">ETB</span>
            </div>
            <p class="text-xs text-slate-500 font-medium mt-2 max-w-sm m-0 line-height-tight">
              Calculated dynamically based on machine capacities, total downtime minutes, and the standard average piece-rate.
            </p>
          </div>

          <!-- Resolved History -->
          <div class="chart-card flex-1">
            <h3 style="color: #94a3b8; border-bottom-color: rgba(255,255,255,0.05);">
              Maintenance History (Resolved)
            </h3>
            
            <div class="alerts-container">
              <div v-if="downtimeStore.resolvedIssues.length === 0" class="empty-state">
                No resolved maintenance logs for this week.
              </div>
              
              <div v-else class="flex flex-col gap-3">
                <div 
                  v-for="log in downtimeStore.resolvedIssues" 
                  :key="log.id"
                  class="alert-row-standard"
                >
                  <div class="flex justify-between items-start mb-2">
                    <h4 class="font-bold text-emerald-400 m-0">{{ getMachineName(log.machine_id) }}</h4>
                    <span class="text-xs font-bold text-slate-400 bg-slate-900 px-2 py-1 rounded">{{ log.category }}</span>
                  </div>
                  
                  <div class="flex flex-col gap-1 mt-1">
                    <div class="flex justify-between items-center text-xs text-slate-400 bg-slate-900/40 px-2 py-1 rounded border border-white/5">
                      <span class="uppercase tracking-widest font-bold text-[0.65rem]">Period</span>
                      <span>{{ formatEastAfricaTime(log.start_time) }} &mdash; {{ formatEastAfricaTime(log.end_time) }}</span>
                    </div>
                    <div class="flex justify-between items-center text-xs text-slate-400 bg-slate-900/40 px-2 py-1 rounded border border-white/5 mt-1">
                      <span class="uppercase tracking-widest font-bold text-[0.65rem]">Duration</span>
                      <span class="font-bold text-slate-300">{{ calculateTotalDuration(log.start_time, log.end_time) }}</span>
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
// Developer: Mintesnot Abebe | Brand: dev MinteIO
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
  
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`
  
  const h = Math.floor(diffMinutes / 60)
  const m = diffMinutes % 60
  return `${h}h ${m}m`
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
/* ══ Main view area ════════════════════════════════════════════════════════════ */
.view-area {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #0f172a;
}

.view-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: 1.25rem 1.5rem;
  gap: 1rem;
  overflow: hidden;
}

.panel-header { flex-shrink: 0; }
.panel-title {
  font-size: 1.3rem;
  font-weight: 900;
  color: #f1f5f9;
  margin: 0;
}
.panel-sub { font-size: .7rem; color: #64748b; margin: .2rem 0 0; }

/* ══ Cards ── */
.chart-card {
  background: #1e293b;
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 1.25rem;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  overflow: hidden;
}
.chart-card h3 {
  color: #94a3b8;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin: 0 0 .5rem 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  padding-bottom: 0.75rem;
}

/* ══ Form elements ═══════════════════════════════════════════════════════════ */
.form-group label {
  display: block;
  font-size: 0.7rem;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.4rem;
}

.custom-select {
  width: 100%;
  background: #0f172a;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  color: #f1f5f9;
  font-weight: 700;
  outline: none;
  appearance: none;
  transition: all 0.2s;
}
.custom-select:focus {
  border-color: #f43f5e;
}

/* ══ Buttons ═════════════════════════════════════════════════════════════════ */
.btn-action {
  width: 100%;
  padding: 1rem;
  border-radius: 0.75rem;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border: none;
  cursor: pointer;
}
.btn-action--disabled {
  background: #334155;
  color: #64748b;
  cursor: not-allowed;
}
.btn-action--danger {
  background: #e11d48;
  color: white;
}
.btn-action--danger:active {
  transform: scale(0.98);
}
.btn-action--success {
  background: #10b981;
  color: #064e3b;
}
.btn-action--success:active {
  transform: scale(0.98);
}

/* ══ Alerts ══════════════════════════════════════════════════════════════════ */
.alerts-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow-y: auto;
  max-height: 400px;
}
.alerts-container::-webkit-scrollbar { width: 4px; }
.alerts-container::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
.alerts-container::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

.empty-state {
  text-align: center;
  color: #64748b;
  padding: 2rem 0;
  font-size: 0.85rem;
  font-weight: 500;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.alert-row-large {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  background: rgba(225,29,72,0.1);
  border: 1px solid rgba(225,29,72,0.3);
  border-radius: 0.75rem;
  position: relative;
  overflow: hidden;
}

.alert-row-standard {
  display: flex;
  flex-direction: column;
  padding: 0.75rem;
  background: rgba(15,23,42,0.5);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 0.75rem;
  transition: border-color 0.2s;
}
.alert-row-standard:hover {
  border-color: rgba(255,255,255,0.15);
}

.badge-danger {
  background: rgba(225,29,72,0.2);
  color: #fb7185;
  padding: 0.25rem 0.5rem;
  border-radius: 1rem;
  font-size: 0.7rem;
  font-weight: 900;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  border: 1px solid rgba(225,29,72,0.3);
}

/* Helpers */
.line-height-tight {
  line-height: 1.4;
}
</style>
