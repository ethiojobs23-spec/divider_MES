<template>
  <AppLayout>
    <div class="view-area">
      <!-- ── Header ── -->
      <div class="view-panel" style="flex: none; padding-bottom: 0; min-height: auto;">
        <div class="panel-header flex justify-between items-center flex-wrap gap-3">
          <div>
            <h2 class="panel-title flex items-center gap-2">
              <span class="material-symbols-rounded" style="color:#fb7185">timer_off</span>
              Machine Downtime & Maintenance
            </h2>
            <p class="panel-sub">Log equipment failures, track stoppage stopwatch, and calculate downtime financial impact</p>
          </div>

          <div class="flex items-center gap-2">
            <button class="sync-btn cursor-pointer" :disabled="isSyncing" @click="manualSync" title="Sync downtime logs now">
              <span class="material-symbols-rounded" :class="{ 'spin-icon': isSyncing }">sync</span>
              <span>{{ isSyncing ? 'Syncing...' : 'Sync Now' }}</span>
            </button>
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
                class="btn-action mt-2 cursor-pointer"
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
                    <div class="flex items-center gap-1.5 text-slate-300">
                      <span class="material-symbols-rounded text-lg text-amber-400 animate-spin" style="animation-duration: 3s;">timer</span>
                      <span class="font-mono font-bold text-amber-300 text-sm">{{ getElapsedTime(issue.start_time) }}</span>
                    </div>
                  </div>

                  <button 
                    @click="openResolveModal(issue)"
                    class="btn-action btn-action--success w-full cursor-pointer"
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
            <h3 style="color: #fbbf24; border-bottom-color: rgba(251,191,36,0.2);">Estimated Lost Revenue</h3>
            <div class="flex items-end gap-3 my-2">
              <span class="text-5xl font-black font-mono text-amber-400">{{ formatCurrency(downtimeStore.weeklyLostRevenue) }}</span>
              <span class="text-xl font-bold text-slate-500 mb-1">ETB</span>
            </div>
            <p class="text-xs text-slate-500 font-medium mt-2 max-w-sm m-0 line-height-tight">
              Calculated dynamically based on machine capacities, total downtime minutes, and standard piece rates.
            </p>
          </div>

          <!-- Resolved History -->
          <div class="chart-card flex-1">
            <h3 style="color: #94a3b8; border-bottom-color: rgba(255,255,255,0.05);">
              Maintenance History (Resolved)
            </h3>
            
            <div class="alerts-container">
              <div v-if="downtimeStore.resolvedIssues.length === 0" class="empty-state">
                No resolved maintenance logs for this period.
              </div>
              
              <div v-else class="flex flex-col gap-3">
                <div 
                  v-for="log in downtimeStore.resolvedIssues" 
                  :key="log.id"
                  class="alert-row-standard"
                >
                  <div class="flex justify-between items-start mb-2">
                    <div>
                      <h4 class="font-bold text-emerald-400 m-0">{{ getMachineName(log.machine_id) }}</h4>
                      <p v-if="log.resolution_notes" class="text-xs text-slate-300 mt-0.5 italic">
                        "{{ log.resolution_notes }}"
                      </p>
                    </div>
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

      <!-- ── Modal: Resolve Downtime with Notes ── -->
      <div v-if="showResolveModal" class="modal-overlay" @click.self="showResolveModal = false">
        <div class="modal-card">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-base font-bold text-emerald-400 m-0 flex items-center gap-1.5">
              <span class="material-symbols-rounded">build_circle</span>
              Resolve Machine Stoppage
            </h3>
            <button class="text-slate-400 hover:text-white" @click="showResolveModal = false">
              <span class="material-symbols-rounded text-lg">close</span>
            </button>
          </div>

          <p class="text-xs text-slate-400 mb-3">
            Marking <strong>{{ getMachineName(activeResolveIssue?.machine_id) }}</strong> as operational.
          </p>

          <div class="mb-4">
            <label class="block text-xs font-bold text-slate-400 mb-1">Maintenance / Resolution Notes</label>
            <input
              v-model="resolutionNote"
              type="text"
              placeholder="e.g. Replaced cutting blade, cleared jammed paper"
              class="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-white outline-none focus:border-emerald-500"
              autofocus
            />
          </div>

          <div class="flex gap-2 justify-end">
            <button class="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 bg-transparent border border-white/10 cursor-pointer hover:bg-slate-800" @click="showResolveModal = false">
              Cancel
            </button>
            <button class="px-4 py-1.5 rounded-lg text-xs font-bold text-slate-900 bg-emerald-400 hover:bg-emerald-300 cursor-pointer transition-all" @click="confirmResolve">
              Confirm & Resume
            </button>
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
const isSyncing = ref(false)

// Resolution Modal State
const showResolveModal = ref(false)
const activeResolveIssue = ref(null)
const resolutionNote = ref('')

// Reactive trigger for live elapsed time updates
const now = ref(Date.now())
let timerInterval = null

async function manualSync() {
  isSyncing.value = true
  try {
    await downtimeStore.fetchDowntime()
  } finally {
    setTimeout(() => { isSyncing.value = false }, 400)
  }
}

onMounted(async () => {
  await downtimeStore.fetchDowntime()
  downtimeStore.initRealtime()

  // Update live elapsed stopwatch ticker every second
  timerInterval = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})

function submitReport() {
  if (selectedMachine.value && selectedCategory.value) {
    downtimeStore.reportDowntime(selectedMachine.value, selectedCategory.value)
    selectedMachine.value = ''
    selectedCategory.value = ''
  }
}

function openResolveModal(issue) {
  activeResolveIssue.value = issue
  resolutionNote.value = ''
  showResolveModal.value = true
}

function confirmResolve() {
  if (activeResolveIssue.value) {
    downtimeStore.resolveDowntime(activeResolveIssue.value.id, resolutionNote.value)
    showResolveModal.value = false
    activeResolveIssue.value = null
    resolutionNote.value = ''
  }
}

function getMachineName(id) {
  const m = downtimeStore.machines.find(m => m.id === id)
  return m ? m.name : 'Unknown Machine'
}

function getElapsedTime(isoStart) {
  const _trigger = now.value // Force reactivity every second
  const start = new Date(isoStart).getTime()
  const diffSeconds = Math.max(0, Math.floor((Date.now() - start) / 1000))
  
  if (diffSeconds < 60) return `${diffSeconds}s`
  
  const m = Math.floor(diffSeconds / 60)
  const s = diffSeconds % 60
  if (m < 60) return `${m}m ${s}s`
  
  const h = Math.floor(m / 60)
  const remM = m % 60
  return `${h}h ${remM}m`
}

function calculateTotalDuration(isoStart, isoEnd) {
  if (!isoStart || !isoEnd) return '—'
  const start = new Date(isoStart).getTime()
  const end = new Date(isoEnd).getTime()
  const diffMinutes = Math.floor((end - start) / 60000)
  
  if (diffMinutes < 60) return `${diffMinutes} minutes`
  const h = Math.floor(diffMinutes / 60)
  const m = diffMinutes % 60
  return `${h}h ${m}m`
}

function formatEastAfricaTime(isoString) {
  if (!isoString) return '—'
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
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0)
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

.sync-btn {
  display: flex; align-items: center; gap: 0.35rem;
  background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.3);
  color: #a5b4fc; border-radius: 0.5rem; padding: 0.45rem 0.85rem;
  font-size: 0.75rem; font-weight: 700; transition: all 0.15s ease;
}
.sync-btn:hover { background: rgba(99,102,241,0.22); color: #fff; }
.spin-icon { animation: spin 0.8s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

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
  letter-spacing: 0.05em;
  margin: 0;
  font-weight: 800;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  padding-bottom: 0.75rem;
}

/* ══ Forms ── */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.form-group label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
  font-weight: 700;
}
.custom-select {
  background: #0f172a;
  border: 1px solid rgba(255,255,255,0.1);
  color: #f8fafc;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  font-size: 0.95rem;
  outline: none;
  transition: all 0.2s;
}
.custom-select:focus {
  border-color: #f43f5e;
}

/* ══ Buttons ── */
.btn-action {
  border: none;
  border-radius: 0.75rem;
  padding: 1rem;
  font-weight: 800;
  font-size: 0.95rem;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s;
}
.btn-action--danger {
  background: linear-gradient(135deg, #e11d48, #be123c);
  color: #fff;
  box-shadow: 0 4px 15px rgba(225,29,72,0.3);
}
.btn-action--danger:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}
.btn-action--success {
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff;
  box-shadow: 0 4px 15px rgba(16,185,129,0.2);
}
.btn-action--success:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}
.btn-action--disabled {
  background: #334155;
  color: #64748b;
  cursor: not-allowed;
  opacity: 0.5;
}

/* ══ Alerts ── */
.alerts-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 400px;
  overflow-y: auto;
}
.alert-row-large {
  background: #0f172a;
  border: 1px solid rgba(244,63,94,0.3);
  border-radius: 1rem;
  padding: 1.25rem;
  position: relative;
  overflow: hidden;
}
.alert-row-standard {
  background: #0f172a;
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 0.75rem;
  padding: 1rem;
}
.badge-danger {
  background: rgba(225,29,72,0.15);
  border: 1px solid rgba(225,29,72,0.3);
  color: #fb7185;
  font-size: 0.7rem;
  font-weight: 800;
  padding: 0.2rem 0.5rem;
  border-radius: 0.4rem;
  letter-spacing: 0.05em;
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  color: #64748b;
  font-size: 0.9rem;
  font-weight: 600;
}

/* Modal */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.7);
  backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 1000;
  padding: 1rem;
}
.modal-card {
  background: #1e293b; border: 1px solid rgba(255,255,255,0.1);
  border-radius: 1.25rem; padding: 1.5rem; max-width: 400px; width: 100%;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.6);
}
</style>
