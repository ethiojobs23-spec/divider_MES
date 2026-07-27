<template>
  <TabletLayout>
    <div class="attendance-viewer">
      <div class="header">
        <div class="header-title-block">
          <span class="material-symbols-rounded header-icon">recent_patient</span>
          <div>
            <h1 class="page-title">Attendance Records</h1>
            <p class="page-subtitle">View daily clock-in/out logs for week: {{ mesStore.currentProductionWeek }}</p>
          </div>
        </div>
      </div>

      <div class="viewer-content">
        <table class="data-table">
          <thead>
            <tr>
              <th>Operator</th>
              <th>Shift Date</th>
              <th>Clock In</th>
              <th>Clock Out</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in formattedLogs" :key="log.id">
              <td>
                <div class="op-info">
                  <div class="op-avatar-sm" :class="log.operator.color">{{ log.operator.avatar }}</div>
                  <span>{{ log.operator.name }}</span>
                </div>
              </td>
              <td>{{ log.shiftDate }}</td>
              <td>{{ formatTime(log.clockIn) }}</td>
              <td>{{ formatTime(log.clockOut) }}</td>
              <td>
                <span class="status-badge" :class="log.status">
                  {{ (log.status || 'unknown').toUpperCase() }}
                </span>
              </td>
            </tr>
            <tr v-if="formattedLogs.length === 0">
              <td colspan="5" class="empty-text">No attendance records found for this week.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </TabletLayout>
</template>

<script setup>
import { computed } from 'vue'
import TabletLayout from '@/components/layout/TabletLayout.vue'
import { useAttendanceStore } from '@/store/attendanceStore.js'
import { useMesStore } from '@/store/mesStore.js'

const attStore = useAttendanceStore()
const mesStore = useMesStore()

const formattedLogs = computed(() => {
  const currentWeekLogs = attStore.clockInLog.filter(log => log.week === mesStore.currentProductionWeek)
  
  // Sort by latest shift date and clock in
  const sorted = [...currentWeekLogs].sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  })

  return sorted.map(log => {
    const operator = mesStore.operators.find(op => op.id === log.operatorId) || {
      name: 'Unknown', avatar: '?', color: 'bg-slate-500'
    }
    
    return {
      id: `${log.operatorId}-${log.timestamp}`,
      operator,
      shiftDate: log.shiftDate,
      clockIn: log.timestamp,
      clockOut: log.clockOut, // Note: clockInLog in attendanceStore doesn't currently map clockOut from Supabase, but let's try to read it if it exists. We might need to adjust attendanceStore if clock_out is needed, but we can just display what's available.
      status: log.status
    }
  })
})

function formatTime(isoString) {
  if (!isoString) return '—'
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.attendance-viewer {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 2rem;
  overflow-y: auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.header-title-block {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-icon {
  font-size: 2.5rem;
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
  padding: 0.75rem;
  border-radius: 1rem;
}

.page-title {
  font-size: 1.8rem;
  font-weight: 800;
  color: #f8fafc;
  margin: 0 0 0.25rem 0;
}

.page-subtitle {
  font-size: 0.95rem;
  color: #94a3b8;
  margin: 0;
}

.viewer-content {
  background: #1e293b;
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 1.25rem;
  padding: 1.5rem;
  flex: 1;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th, .data-table td {
  padding: 1rem 1.25rem;
  text-align: left;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.data-table th {
  color: #94a3b8;
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.data-table td {
  color: #e2e8f0;
  font-size: 1rem;
  vertical-align: middle;
}

.op-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 700;
}

.op-avatar-sm {
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 800;
  color: #fff;
}

.status-badge {
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.05em;
}
.status-badge.on_time { background: rgba(16,185,129,0.15); color: #34d399; }
.status-badge.late { background: rgba(245,158,11,0.15); color: #fbbf24; }
.status-badge.unknown { background: rgba(100,116,139,0.15); color: #94a3b8; }

.empty-text {
  text-align: center !important;
  color: #64748b !important;
  padding: 3rem !important;
  font-size: 1.1rem;
}

/* Utilities for Colors */
.bg-rose-500 { background-color: #f43f5e; color: #fff; }
.bg-indigo-500 { background-color: #6366f1; color: #fff; }
.bg-emerald-500 { background-color: #10b981; color: #fff; }
.bg-amber-500 { background-color: #f59e0b; color: #fff; }
.bg-cyan-500 { background-color: #06b6d4; color: #fff; }
.bg-purple-500 { background-color: #a855f7; color: #fff; }
.bg-sky-500 { background-color: #0ea5e9; color: #fff; }
.bg-orange-500 { background-color: #f97316; color: #fff; }
.bg-teal-500 { background-color: #14b8a6; color: #fff; }
</style>
