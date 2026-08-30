<template>
  <div class="tab-content">
    <div class="dashboard-grid">
      <!-- Card 1: My Production / My Hours -->
      <div class="stat-card">
        <div class="card-icon production">
          <span class="material-symbols-rounded">precision_manufacturing</span>
        </div>
        <div class="card-content">
          <h3>{{ employeePayrollConfig?.isHourly ? 'My Logged Hours' : 'My Production' }}</h3>
          
          <div class="stat-value" v-if="employeePayrollConfig?.isPieceRate">
            {{ totalProduction }} <span>pcs</span>
          </div>
          <div class="stat-value" v-if="employeePayrollConfig?.isHourly">
            {{ totalHours }} <span>hrs</span>
          </div>
          
          <p class="stat-subtext">Total output this week</p>
        </div>
      </div>

      <!-- Card 2: My Attendance -->
      <div class="stat-card">
        <div class="card-icon attendance">
          <span class="material-symbols-rounded">how_to_reg</span>
        </div>
        <div class="card-content">
          <h3>My Attendance</h3>
          <div class="stat-value">{{ daysAttended }} <span>/ 6 days</span></div>
          <p class="stat-subtext">Clocked in this week</p>
        </div>
      </div>

      <!-- Card 3: Financials -->
      <div class="stat-card">
        <div class="card-icon financial">
          <span class="material-symbols-rounded">payments</span>
        </div>
        <div class="card-content">
          <h3>Est. Earnings</h3>
          <div class="stat-value">{{ estimatedEarnings.toFixed(2) }} <span>ETB</span></div>
          <p class="stat-subtext">Estimated gross before deductions</p>
        </div>
      </div>
    </div>

    <!-- Work Types Section -->
    <div class="work-types-section">
      <h3 class="section-label">
        <span class="material-symbols-rounded">build</span>
        My Assigned Work Types
        <span class="admin-only-badge">Admin-Managed</span>
      </h3>
      <div v-if="(employee?.work_types?.categories || employee?.work_types)?.length" class="work-types-grid">
        <div v-for="wt in (employee?.work_types?.categories || employee?.work_types)" :key="wt" class="work-type-chip">
          <span class="material-symbols-rounded" style="font-size:1rem">check_circle</span>
          {{ wt === 'TIME' ? 'Hourly (TIME)' : wt }}
        </div>
      </div>
      <div v-else class="work-types-empty">
        <span class="material-symbols-rounded">info</span>
        No work types assigned yet. Contact admin.
      </div>
    </div>

    <!-- Payroll Config Section -->
    <div class="work-types-section">
      <h3 class="section-label">
        <span class="material-symbols-rounded">account_balance_wallet</span>
        My Payroll Configuration
        <span class="admin-only-badge">Admin-Managed</span>
      </h3>
      <div class="work-types-grid" v-if="employeePayrollConfig">
        <div class="work-type-chip" v-if="employeePayrollConfig.isPieceRate">
          <span class="material-symbols-rounded" style="font-size:1rem">check_circle</span>
          Piece-Rate Pay
        </div>
        <div class="work-type-chip" v-if="employeePayrollConfig.isHourly">
          <span class="material-symbols-rounded" style="font-size:1rem">check_circle</span>
          Hourly Pay
        </div>
        <div class="work-type-chip" v-if="employeePayrollConfig.isHourly">
          <span class="material-symbols-rounded" style="font-size:1rem">payments</span>
          {{ employeePayrollConfig.hourlyRate }} ETB / hr
        </div>
      </div>
      <div v-else class="work-types-empty">
        <span class="material-symbols-rounded">info</span>
        No payroll configuration set.
      </div>
    </div>
  </div>
</template>

<script setup>
// Developer: Mintesnot Abebe | Brand: dev MinteIO
defineProps({
  employee: { type: Object, default: () => null },
  employeePayrollConfig: { type: Object, default: () => null },
  totalProduction: { type: Number, default: 0 },
  totalHours: { type: Number, default: 0 },
  daysAttended: { type: Number, default: 0 },
  estimatedEarnings: { type: Number, default: 0 }
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

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}
.stat-card {
  background: #1e293b;
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 1.5rem;
  padding: 2rem;
  display: flex;
  gap: 1.5rem;
  align-items: center;
}
.card-icon {
  width: 4rem; height: 4rem;
  border-radius: 1rem;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.card-icon span { font-size: 2rem; }
.card-icon.production { background: rgba(99,102,241,0.1); color: #818cf8; }
.card-icon.attendance { background: rgba(16,185,129,0.1); color: #34d399; }
.card-icon.financial { background: rgba(245,158,11,0.1); color: #fbbf24; }

.card-content h3 { font-size: 0.95rem; color: #94a3b8; margin: 0 0 0.5rem 0; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }
.stat-value { font-size: 2.2rem; font-weight: 800; color: #f8fafc; margin-bottom: 0.25rem; font-variant-numeric: tabular-nums; }
.stat-value span { font-size: 1rem; color: #64748b; font-weight: 600; }
.stat-subtext { font-size: 0.85rem; color: #64748b; margin: 0; }

.work-types-section {
  margin-top: 1.5rem;
  background: #1e293b;
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 1.5rem;
  padding: 2rem;
}
.section-label {
  display: flex; align-items: center; gap: 0.75rem;
  font-size: 1rem; font-weight: 700; color: #94a3b8;
  text-transform: uppercase; letter-spacing: 0.05em;
  margin: 0 0 1.25rem 0;
}
.admin-only-badge {
  font-size: 0.65rem; font-weight: 800; padding: 0.2rem 0.65rem;
  background: rgba(239,68,68,0.1); color: #fca5a5;
  border: 1px solid rgba(239,68,68,0.2); border-radius: 999px;
  letter-spacing: 0.05em;
}
.work-types-grid { display: flex; flex-wrap: wrap; gap: 0.75rem; }
.work-type-chip {
  display: flex; align-items: center; gap: 0.5rem;
  background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.25);
  color: #a5b4fc; padding: 0.6rem 1rem; border-radius: 0.75rem;
  font-weight: 700; font-size: 1rem;
}
.work-types-empty {
  display: flex; align-items: center; gap: 0.75rem;
  color: #475569; font-size: 1rem; padding: 1rem;
  background: rgba(255,255,255,0.02); border-radius: 0.75rem;
}
</style>
