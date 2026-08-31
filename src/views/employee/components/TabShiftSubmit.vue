<template>
  <div class="tab-content">
    <!-- Today's Summary -->
    <div class="shift-summary-card">
      <h3>
        <span class="material-symbols-rounded">today</span>
        Today's Summary
      </h3>

      <!-- ── TIME worker: clock-based summary card ── -->
      <div v-if="isTimeWorker" style="margin-bottom:1.5rem;">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1rem;">
          <div style="background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.2); border-radius:1rem; padding:1.25rem; display:flex; flex-direction:column; gap:.35rem;">
            <span style="font-size:.7rem; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:.08em;">Clock In</span>
            <span style="font-size:1.4rem; font-weight:900; font-family:monospace; color:#a5b4fc;">
              {{ todayAttendanceRecord ? new Date(todayAttendanceRecord.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'Not yet' }}
            </span>
          </div>
          <div style="background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.2); border-radius:1rem; padding:1.25rem; display:flex; flex-direction:column; gap:.35rem;">
            <span style="font-size:.7rem; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:.08em;">Clock Out</span>
            <span style="font-size:1.4rem; font-weight:900; font-family:monospace;" :style="{ color: todayAttendanceRecord?.clockOut ? '#34d399' : '#f59e0b' }">
              {{ todayAttendanceRecord?.clockOut ? new Date(todayAttendanceRecord.clockOut).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'Still working…' }}
            </span>
          </div>
        </div>

        <div v-if="!todayAttendanceRecord" style="background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.2); border-radius:.75rem; padding:1rem 1.25rem; color:#f87171; font-size:.9rem; font-weight:600; display:flex; align-items:center; gap:.6rem;">
          <span class="material-symbols-rounded">warning</span>
          You have not clocked in today. Please clock in from the Attendance tab first.
        </div>
        <div v-else-if="!todayAttendanceRecord.clockOut" style="background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.2); border-radius:.75rem; padding:1rem 1.25rem; color:#fbbf24; font-size:.9rem; font-weight:600; display:flex; align-items:center; gap:.6rem;">
          <span class="material-symbols-rounded">info</span>
          You haven't clocked out yet — hours will be estimated until you do.
        </div>
      </div>

      <div class="shift-stats">
        <div class="shift-stat" v-if="isTimeWorker">
          <span class="shift-stat-val" style="color:#34d399">{{ todayHours }}h</span>
          <span class="shift-stat-lbl">Hours Worked</span>
        </div>
        <div class="shift-stat" v-if="isTimeWorker && employeePayrollConfig">
          <span class="shift-stat-val" style="color:#a5b4fc">{{ employeePayrollConfig.hourlyRate }} ETB</span>
          <span class="shift-stat-lbl">Rate / Hour</span>
        </div>
        <div class="shift-stat" v-if="isPieceRateWorker">
          <span class="shift-stat-val" style="color:#34d399">{{ todayGood }}</span>
          <span class="shift-stat-lbl">Good Pcs</span>
        </div>
        <div class="shift-stat" v-if="isPieceRateWorker">
          <span class="shift-stat-val" style="color:#f87171">{{ todayWaste }}</span>
          <span class="shift-stat-lbl">Waste Pcs</span>
        </div>
        <div class="shift-stat">
          <span class="shift-stat-val" style="color:#fbbf24">{{ todayEarnings }}</span>
          <span class="shift-stat-lbl">Est. Earnings (ETB)</span>
        </div>
        <div class="shift-stat" v-if="isPieceRateWorker">
          <span class="shift-stat-val" style="color:#a5b4fc">{{ todayEntries.length }}</span>
          <span class="shift-stat-lbl">Log Entries</span>
        </div>
      </div>

      <!-- Piece-rate entry breakdown (hidden for pure TIME workers) -->
      <div v-if="isPieceRateWorker" class="data-table-container" style="margin-top:1.5rem">
        <table class="data-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Type</th>
              <th>Placement</th>
              <th>Size</th>
              <th class="align-right">Qty/Hrs</th>
              <th class="align-right">Waste</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in todayEntries" :key="e.id">
              <td>{{ e.workCategory || 'MFG' }}</td>
              <td>{{ e.dividerType || '—' }}</td>
              <td>{{ e.placement || '—' }}</td>
              <td>{{ e.size || '—' }}</td>
              <td class="align-right" style="color:#34d399">
                {{ e.workCategory === 'TIME' ? (e.hoursWorked || 0) + ' h' : (e.goodProduction || 0) }}
              </td>
              <td class="align-right" style="color:#f87171">
                {{ e.workCategory === 'TIME' ? '—' : (e.wasteMaterial || 0) }}
              </td>
            </tr>
            <tr v-if="!todayEntries.length"><td colspan="6" class="empty-text">No entries logged today.</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Submit button -->
      <div class="submit-area">
        <div v-if="alreadySubmittedToday" class="submitted-banner">
          <span class="material-symbols-rounded">check_circle</span>
          Shift already submitted today.
          <span :class="'status-' + alreadySubmittedToday.target_name">{{ (alreadySubmittedToday.target_name || '').toUpperCase() }}</span>
          <span v-if="alreadySubmittedToday.target_name === 'rejected' && alreadySubmittedToday.details?.rejectionReason" class="reject-reason">
            Reason: {{ alreadySubmittedToday.details.rejectionReason }}
          </span>
        </div>
        <button
          v-else
          class="btn-submit-shift"
          :disabled="!canSubmitShift || isSubmitting"
          @click="$emit('submitTodayShift')"
        >
          <span class="material-symbols-rounded">task_alt</span>
          {{ isSubmitting ? 'Submitting...' : 'SUBMIT SHIFT FOR APPROVAL' }}
        </button>
        <p v-if="!canSubmitShift && !alreadySubmittedToday" style="text-align:center; color:#64748b; font-size:.85rem; margin-top:.75rem;">
          {{ isTimeWorker ? 'Clock in first to enable shift submission.' : 'Log at least one production entry to submit your shift.' }}
        </p>
        <p v-if="submitMessage" class="success-msg">{{ submitMessage }}</p>
      </div>
    </div>

    <!-- Past submissions -->
    <div class="production-list-card" style="margin-top:1.5rem">
      <h3>My Shift Submission History</h3>
      <div class="history-list">
        <div v-for="sub in mySubmissions" :key="sub.id" class="submission-row">
          <div class="sub-date">{{ new Date(sub.transaction_date).toLocaleDateString('en-GB', {weekday:'short', day:'2-digit', month:'short'}) }}</div>
          <div class="sub-stats">
            <span v-if="sub.details?.isTimeWorker">Hours: <strong>{{ sub.details?.hoursWorkedToday ?? '—' }}h</strong></span>
            <span v-else>Good: <strong>{{ sub.details?.totalGood ?? '—' }}</strong></span>
            <span>ETB: <strong>{{ Number(sub.amount).toFixed(2) }}</strong></span>
          </div>
          <div class="sub-status" :class="'sub-status--' + sub.target_name">
            {{ (sub.target_name || '').toUpperCase() }}
          </div>
        </div>
        <p v-if="!mySubmissions.length" class="empty-text">No submissions yet.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
// Developer: Mintesnot Abebe | Brand: dev MinteIO
defineProps({
  isTimeWorker: { type: Boolean, default: false },
  isPieceRateWorker: { type: Boolean, default: true },
  todayAttendanceRecord: { type: Object, default: () => null },
  todayHours: { type: [Number, String], default: 0 },
  todayGood: { type: Number, default: 0 },
  todayWaste: { type: Number, default: 0 },
  todayEarnings: { type: [Number, String], default: '0.00' },
  todayEntries: { type: Array, default: () => [] },
  employeePayrollConfig: { type: Object, default: () => null },
  alreadySubmittedToday: { type: Object, default: () => null },
  canSubmitShift: { type: Boolean, default: false },
  isSubmitting: { type: Boolean, default: false },
  submitMessage: { type: String, default: '' },
  mySubmissions: { type: Array, default: () => [] }
})

defineEmits(['submitTodayShift'])
</script>

<style scoped>
.tab-content {
  animation: fadeIn 0.3s ease;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.shift-summary-card {
  background: #1e293b;
  border: 1px solid rgba(99,102,241,0.2);
  border-radius: 1.5rem;
  padding: 2.5rem;
}
.shift-summary-card h3 {
  display: flex; align-items: center; gap: 0.75rem;
  font-size: 1.4rem; color: #f8fafc; margin: 0 0 1.5rem 0;
}
.shift-stats {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 1rem;
  margin-bottom: 0.5rem;
}
.shift-stat {
  background: rgba(255,255,255,0.03); border-radius: 1rem; padding: 1.25rem;
  display: flex; flex-direction: column; align-items: center; gap: 0.4rem;
  border: 1px solid rgba(255,255,255,0.06);
}
.shift-stat-val { font-size: 1.75rem; font-weight: 900; font-variant-numeric: tabular-nums; }
.shift-stat-lbl { font-size: 0.8rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }

.data-table-container { 
  overflow-x: auto; 
  overflow-y: auto; 
  max-height: 400px; 
  width: 100%; 
  scrollbar-width: none; 
  -ms-overflow-style: none; 
} 
.data-table-container::-webkit-scrollbar { display: none; } 

.data-table {
  width: 100%;
  border-collapse: collapse;
  white-space: nowrap;
}
.data-table th, .data-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.data-table th { color: #64748b; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }
.data-table td { color: #e2e8f0; font-size: 0.95rem; }
.align-right { text-align: right !important; }
.empty-text { text-align: center !important; color: #64748b !important; padding: 2rem !important; }

.submit-area { margin-top: 2rem; }
.btn-submit-shift {
  width: 100%; padding: 1.35rem;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff; border: none; border-radius: 1rem;
  font-size: 1.2rem; font-weight: 800; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 0.75rem;
  transition: all 0.2s; box-shadow: 0 8px 25px rgba(99,102,241,0.3);
}
.btn-submit-shift:disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; }
.btn-submit-shift:not(:disabled):hover { filter: brightness(1.1); }

.submitted-banner {
  display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;
  background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.2);
  color: #34d399; padding: 1.25rem 1.5rem; border-radius: 1rem;
  font-size: 1.1rem; font-weight: 700;
}
.reject-reason { font-size: 0.9rem; color: #fca5a5; width: 100%; margin-top: 0.25rem; }

.status-pending  { color: #f59e0b; font-weight: 800; }
.status-approved { color: #10b981; font-weight: 800; }
.status-rejected { color: #ef4444; font-weight: 800; }

.production-list-card {
  background: #1e293b;
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 1.5rem;
  padding: 2rem;
}
.production-list-card h3 { margin: 0 0 1.5rem 0; font-size: 1.4rem; color: #f8fafc; }

.history-list { 
  display: flex; 
  flex-direction: column; 
  gap: 0.5rem;
  max-height: 400px;
  overflow-y: auto;
  scrollbar-width: none; 
  -ms-overflow-style: none; 
}
.history-list::-webkit-scrollbar { display: none; }

.submission-row {
  display: flex; align-items: center; gap: 1.5rem;
  padding: 0.85rem 1rem; 
  background: rgba(255,255,255,0.02);
  border-radius: 0.75rem;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.sub-date { font-weight: 700; color: #94a3b8; min-width: 7rem; font-size: 0.95rem; }
.sub-stats { flex: 1; display: flex; gap: 1.5rem; font-size: 0.95rem; color: #64748b; }
.sub-stats strong { color: #e2e8f0; }
.sub-status {
  font-size: 0.75rem; font-weight: 800; padding: 0.3rem 0.85rem;
  border-radius: 999px; letter-spacing: 0.08em;
}
.sub-status--pending  { background: rgba(245,158,11,0.12); color: #fbbf24; }
.sub-status--approved { background: rgba(16,185,129,0.12); color: #34d399; }
.sub-status--rejected { background: rgba(239,68,68,0.12); color: #f87171; }

.success-msg { color: #34d399; font-weight: 600; margin-top: 1rem; text-align: center; }

@media (max-width: 768px) {
  .shift-summary-card, .production-list-card { padding: 1.25rem 0.75rem; }
  .shift-stats { grid-template-columns: 1fr 1fr; gap: 0.75rem; }
  .btn-submit-shift { touch-action: pan-y; }
  .data-table-container {
    -webkit-overflow-scrolling: touch;
    width: 100%;
  }
  .data-table {
    min-width: 500px;
  }
  .history-list {
    max-height: none;
    overflow: visible;
  }
  .submission-row { flex-direction: column; align-items: flex-start; gap: 0.5rem; }
  .sub-stats { width: 100%; justify-content: space-between; }
  .sub-status { align-self: flex-start; }
}
</style>
