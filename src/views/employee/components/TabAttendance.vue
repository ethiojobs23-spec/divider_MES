<template>
  <div class="tab-content">
    <div class="split-layout">
      <!-- Left: Current Status -->
      <div class="attendance-card" style="height: fit-content;">
        <h3>Current Shift Status</h3>
        <div class="status-indicator" :class="isClockedIn ? 'status--in' : 'status--out'">
          <span class="status-dot"></span>
          {{ isClockedIn ? 'CLOCKED IN' : 'CLOCKED OUT' }}
        </div>
        <p class="status-desc" v-if="isClockedIn">You are currently on shift. Remember to clock out when you finish!</p>
        <p class="status-desc" v-else>You are currently clocked out. Clock in to start tracking your time and piece-rate.</p>

        <div class="attendance-actions">
          <button v-if="!isClockedIn" class="btn-clock btn-clock--in" @click="$emit('clockIn')">
            <span class="material-symbols-rounded">login</span>
            {{ attStore.validateClockTime('in').allowed ? 'CLOCK IN NOW' : 'ADMIN OVERRIDE: CLOCK IN' }}
          </button>
          <button v-else class="btn-clock btn-clock--out" @click="$emit('clockOut')">
            <span class="material-symbols-rounded">logout</span>
            {{ attStore.validateClockTime('out').allowed ? 'CLOCK OUT NOW' : 'ADMIN OVERRIDE: CLOCK OUT' }}
          </button>
        </div>
        <p v-if="!isClockedIn && !attStore.validateClockTime('in').allowed" class="status-warn">Outside allowed clock-in windows. Admin PIN required.</p>
        <p v-if="isClockedIn && !attStore.validateClockTime('out').allowed" class="status-warn">Outside allowed clock-out windows. Admin PIN required.</p>
      </div>
      
      <!-- Right: Weekly Attendance History -->
      <div class="history-card">
        <div class="week-selector-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem;">
          <div style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap;">
            <h3>Weekly Attendance</h3>
            <div v-if="attendanceScore.stars > 0" style="display:flex; align-items:center; color:#fbbf24; gap:0.2rem;" title="Performance Score">
              <span class="material-symbols-rounded" v-for="s in attendanceScore.stars" :key="s" style="font-size:1.1rem">star</span>
              <span class="material-symbols-rounded" v-for="s in (5 - attendanceScore.stars)" :key="'e'+s" style="font-size:1.1rem; color:rgba(255,255,255,0.1)">star</span>
              <span style="font-size:0.75rem; margin-left:0.35rem; color:#94a3b8; font-weight:700;">{{ attendanceScore.label }}</span>
            </div>
          </div>
          <div class="week-controls" style="display:flex; align-items:center; gap:0.4rem; background:rgba(255,255,255,0.05); padding:0.25rem 0.6rem; border-radius:2rem; border:1px solid rgba(255,255,255,0.1);">
            <button class="icon-btn" @click="shiftWeek(-1)" style="background:transparent; border:none; color:#f8fafc; cursor:pointer; display:flex;" title="Previous week"><span class="material-symbols-rounded">chevron_left</span></button>
            <strong style="color:#818cf8; font-family:monospace; font-size:0.95rem;">{{ viewWeek }}</strong>
            <button class="icon-btn" @click="shiftWeek(1)" style="background:transparent; border:none; color:#f8fafc; cursor:pointer; display:flex;" title="Next week"><span class="material-symbols-rounded">chevron_right</span></button>
          </div>
        </div>
        
        <div class="history-list">
          <div v-for="day in viewWeekDays" :key="day.dateStr" class="history-item" :style="day.status === 'today' ? 'border:1px solid rgba(99,102,241,0.5)' : ''">
            <div class="history-left">
              <div style="text-align:center; min-width:40px;">
                <span style="display:block; font-size:0.75rem; color:#94a3b8; text-transform:uppercase; font-weight:700;">{{ day.dayName }}</span>
                <strong style="color:#e2e8f0; font-size:1.05rem;">{{ day.formatted.split(' ')[1] }}</strong>
              </div>
              <div>
                <span class="reason" v-if="day.status === 'present'">
                  <strong class="status-active">PRESENT</strong>
                  <span style="font-size:0.85rem; color:#94a3b8; display:block; margin-top:0.2rem;" v-if="day.record">
                    In: {{ new Date(day.record.clock_in).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) }} 
                    <span v-if="day.record.clock_out">| Out: {{ new Date(day.record.clock_out).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) }}</span>
                  </span>
                  <span v-if="day.lateMins > 0" style="font-size:0.75rem; color:#ef4444; font-weight:700; display:block; margin-top:0.2rem;">
                    <span class="material-symbols-rounded" style="font-size:0.85rem; vertical-align:middle;">schedule</span>
                    LATE BY {{ Math.floor(day.lateMins / 60) > 0 ? Math.floor(day.lateMins / 60) + 'h ' : '' }}{{ day.lateMins % 60 }}m
                  </span>
                </span>
                <span class="reason" v-else-if="day.status === 'absent'">
                  <strong class="status-rejected">ABSENT</strong>
                </span>
                <span class="reason" v-else-if="day.status === 'today'">
                  <strong style="color:#3b82f6">TODAY</strong>
                </span>
                <span class="reason" v-else>
                  <strong style="color:#64748b">UPCOMING</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Developer: Mintesnot Abebe | Brand: dev MinteIO
import { ref, computed, watch } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { useAttendanceStore } from '@/store/attendanceStore.js'
import { useMesStore } from '@/store/mesStore.js'
import { getShiftedWeekLabel, getWeekDateRange } from '@/utils/dateUtils.js'

const props = defineProps({
  employee: { type: Object, default: () => null },
  isClockedIn: { type: Boolean, default: false }
})

defineEmits(['clockIn', 'clockOut'])

const attStore = useAttendanceStore()
const mesStore = useMesStore()

const viewWeek = ref(mesStore.currentProductionWeek)
const viewWeekAttendance = ref([])

function shiftWeek(delta) {
  viewWeek.value = getShiftedWeekLabel(viewWeek.value, delta)
}

watch(viewWeek, async (newWeek) => {
  if (!props.employee) return
  const { data } = await supabase.from('mes_attendance')
    .select('*')
    .eq('production_week', newWeek)
    .eq('operator_id', props.employee.id)
  if (data) viewWeekAttendance.value = data
  else viewWeekAttendance.value = []
}, { immediate: true })

function parseTimeToMins(timeStr) {
  if (!timeStr) return 0
  const [h,m] = timeStr.split(':')
  return parseInt(h) * 60 + parseInt(m)
}

const viewWeekDays = computed(() => {
  const morningWindow = attStore.clockingWindows.find(w => w.id === 'morning_in')
  const morningEndMin = morningWindow ? parseTimeToMins(morningWindow.end) : 480 // 08:00
  
  const label = viewWeek.value
  const match = label.match(/W(\d+)-(\d+)/)
  if (!match) return []
  const w = Number(match[1])
  const y = Number(match[2])
  
  const jan4 = new Date(Date.UTC(y, 0, 4))
  const jan4Day = jan4.getUTCDay() || 7
  const monWeek1 = new Date(jan4.getTime() - (jan4Day - 1) * 86400000)
  const monday = new Date(monWeek1.getTime() + (w - 1) * 7 * 86400000)
  
  const days = []
  const todayStr = new Date().toISOString().split('T')[0]
  for (let i=0; i<7; i++) {
     const dd = new Date(monday.getTime() + i * 86400000)
     const dateStr = dd.toISOString().split('T')[0]
     
     const record = viewWeekAttendance.value.find(a => a.shift_date === dateStr)
     
     let status = 'upcoming'
     let lateMins = 0
     
     if (record) {
        status = 'present'
        const clockInTime = new Date(record.clock_in)
        const clockedInMins = clockInTime.getHours() * 60 + clockInTime.getMinutes()
        if (clockedInMins > morningEndMin) {
           lateMins = clockedInMins - morningEndMin
        }
     } else if (dateStr < todayStr) {
        status = 'absent'
     } else if (dateStr === todayStr) {
        status = 'today'
     }
     
     days.push({
       dateStr,
       dayName: dd.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
       formatted: dd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
       record,
       status,
       lateMins
     })
  }
  return days
})

const attendanceScore = computed(() => {
  let score = 100
  let pastDaysCount = 0
  
  viewWeekDays.value.forEach(day => {
    if (day.status === 'absent') {
      score -= 20
      pastDaysCount++
    } else if (day.status === 'present') {
      pastDaysCount++
      if (day.lateMins > 0) {
        const penalty = Math.min(15, Math.ceil(day.lateMins / 10) * 2)
        score -= penalty
      }
    }
  })
  
  if (pastDaysCount === 0) return { stars: 0, label: 'N/A', score }
  
  let stars = 5
  if (score < 90) stars = 4
  if (score < 75) stars = 3
  if (score < 60) stars = 2
  if (score < 40) stars = 1
  if (score < 20) stars = 0
  
  let label = 'Excellent'
  if (stars === 4) label = 'Good'
  if (stars === 3) label = 'Average'
  if (stars === 2) label = 'Poor'
  if (stars <= 1) label = 'Critical'
  
  return { stars, label, score }
})
</script>

<style scoped>
.tab-content {
  animation: fadeIn 0.3s ease;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.split-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.attendance-card, .history-card {
  background: #1e293b;
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 1.5rem;
  padding: 2.5rem;
}
.attendance-card {
  text-align: center;
}
.attendance-card h3, .history-card h3 { font-size: 1.4rem; margin: 0 0 1.5rem 0; color: #f8fafc; }

.status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 1.75rem;
  border-radius: 999px;
  font-size: 1.35rem;
  font-weight: 800;
  margin-bottom: 1.5rem;
}
.status-dot { width: 0.9rem; height: 0.9rem; border-radius: 50%; background: currentColor; }
.status--in { background: rgba(16,185,129,0.15); color: #34d399; border: 1px solid rgba(16,185,129,0.3); }
.status--out { background: rgba(100,116,139,0.15); color: #94a3b8; border: 1px solid rgba(100,116,139,0.3); }

.status-desc { font-size: 1.05rem; color: #cbd5e1; margin-bottom: 2rem; line-height: 1.5; }

.attendance-actions { display: flex; justify-content: center; }
.btn-clock {
  padding: 1.25rem 2.5rem;
  font-size: 1.15rem;
  font-weight: 800;
  border: none;
  border-radius: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: all 0.2s;
}
.btn-clock--in { background: linear-gradient(135deg, #10b981, #059669); color: #fff; box-shadow: 0 10px 25px rgba(16,185,129,0.3); }
.btn-clock--in:active { transform: scale(0.95); }
.btn-clock--out { background: linear-gradient(135deg, #f43f5e, #e11d48); color: #fff; box-shadow: 0 10px 25px rgba(244,63,94,0.3); }
.btn-clock--out:active { transform: scale(0.95); }

.status-warn { color: #fca5a5; font-size: 0.85rem; font-weight: 700; margin-top: 1rem; text-align: center; }

.history-list { 
  display: flex; 
  flex-direction: column; 
  gap: 0.75rem;
  max-height: 420px;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.history-list::-webkit-scrollbar {
  display: none;
}
.history-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0.85rem 1rem;
  background: rgba(255,255,255,0.03);
  border-radius: 0.75rem;
}
.history-left { display: flex; align-items: center; gap: 1rem; }
.reason { display: block; font-weight: 600; color: #e2e8f0; font-size: 0.95rem; }
.status-active { color: #10b981; }
.status-rejected { color: #ef4444; }

@media (max-width: 768px) {
  .split-layout { grid-template-columns: 1fr; gap: 1rem; }
  .attendance-card, .history-card { padding: 1.25rem; }
  .btn-clock { width: 100%; justify-content: center; padding: 1rem; font-size: 1rem; touch-action: pan-y; }
  .icon-btn { touch-action: pan-y; }
  .history-list { max-height: none; overflow: visible; }
}
</style>
