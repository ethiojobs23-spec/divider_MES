<template>
  <AppLayout>
    <div class="emp-root">

      <!-- ══════════════════════════════════════════════════════════════════
           LEFT SUB-NAV — View tabs (mirrors ExecutiveAnalytics pattern)
           ══════════════════════════════════════════════════════════════════ -->
      <aside class="view-nav">
        <p class="nav-heading">EMPLOYEE VIEWS</p>

        <button
          v-for="tab in TABS"
          :key="tab.id"
          class="nav-tab"
          :class="{ 'nav-tab--active': activeView === tab.id }"
          @click="activeView = tab.id"
        >
          <span class="material-symbols-rounded tab-icon">{{ tab.icon }}</span>
          <div class="tab-labels">
            <span class="tab-title">{{ tab.title }}</span>
            <span class="tab-sub">{{ tab.sub }}</span>
          </div>
          <span v-if="activeView === tab.id" class="tab-indicator" />
        </button>

        <!-- Selected Operator Chip -->
        <div class="selected-op-block" v-if="selectedOp">
          <p class="nav-heading" style="margin-top:1rem">SELECTED OPERATOR</p>
          <div class="selected-op-card">
            <OperatorAvatar :avatar="selectedOp.avatar" :name="selectedOp.name" :color="selectedOp.color" size="sm" />
            <div class="op-info">
              <p class="op-name-sm">{{ selectedOp.name }}</p>
              <p class="op-role-sm">{{ selectedOp.role }}</p>
            </div>
            <div class="op-status-dot" :class="selectedOp.status === 'active' ? 'dot--green' : 'dot--red'" />
          </div>
        </div>

        <!-- Export-style action button at bottom -->
        <button class="action-bottom-btn" @click="handleClockOut">
          <span class="material-symbols-rounded">logout</span>
          Clock Out Operator
        </button>
      </aside>

      <!-- ══════════════════════════════════════════════════════════════════
           MAIN CONTENT AREA
           ══════════════════════════════════════════════════════════════════ -->
      <main class="view-area">

        <!-- ─── VIEW A: Operator Roster & Assignment ──────────────────── -->
        <Transition name="view-fade" mode="out-in">
          <section v-if="activeView === 'roster'" class="view-panel" key="roster">

            <div class="panel-header">
              <h2 class="panel-title">Operator Roster & Shift Status</h2>
              <p class="panel-sub">Select an operator · Manage current shift assignment and real-time status</p>
            </div>

            <div class="employee-layout flex flex-col md:flex-row">

              <!-- Left: operator list -->
              <div class="operator-list w-full md:w-[260px] max-h-64 md:max-h-none">
                <div class="search-wrap">
                  <span class="material-symbols-rounded search-icon">search</span>
                  <input
                    v-model="empSearch"
                    class="search-input"
                    placeholder="Search operator…"
                    type="text"
                  />
                </div>

                <button
                  v-for="op in filteredOperators"
                  :key="op.id"
                  class="op-card"
                  :class="{ 'op-card--active': selectedOp?.id === op.id }"
                  @click="selectedOp = op"
                >
                  <OperatorAvatar :avatar="op.avatar" :name="op.name" :color="op.color" size="sm" />
                  <div class="op-info">
                    <p class="op-name-sm">{{ op.name }}</p>
                    <p class="op-role-sm">{{ op.role }}</p>
                  </div>
                  <div class="op-status-dot" :class="op.status === 'active' ? 'dot--green' : 'dot--red'" />
                </button>

                <p v-if="filteredOperators.length === 0" class="empty-note">No operators found</p>
              </div>

              <!-- Right: detail card -->
              <div class="profile-area">
                <Transition name="profile-fade" mode="out-in">
                  <div v-if="selectedOp" class="profile-card" :key="selectedOp.id">

                    <!-- Profile header -->
                    <div class="profile-hdr">
                      <OperatorAvatar :avatar="selectedOp.avatar" :name="selectedOp.name" :color="selectedOp.color" size="xl" />
                      <div>
                        <h3 class="profile-name">{{ selectedOp.name }}</h3>
                        <p class="profile-role-label">{{ selectedOp.role }}</p>
                      </div>
                      <div class="profile-badge" :class="selectedOp.status === 'active' ? 'badge--ok' : 'badge--critical'">
                        {{ selectedOp.status === 'active' ? 'On Shift' : 'Off Shift' }}
                      </div>
                    </div>

                    <!-- Contact Information -->
                    <div class="metric-section">
                      <p class="section-title">
                        <span class="material-symbols-rounded">contact_mail</span>
                        Contact Information
                      </p>
                      <div class="metric-row">
                        <div class="metric-item">
                          <span class="m-label">Full Name</span>
                          <span class="m-value" style="font-size: 0.9rem; color: #f1f5f9;">{{ selectedOp.full_name || 'N/A' }}</span>
                        </div>
                        <div class="metric-item">
                          <span class="m-label">Phone</span>
                          <span class="m-value" style="font-size: 0.9rem; color: #f1f5f9;">{{ selectedOp.phone_number || 'N/A' }}</span>
                        </div>
                        <div class="metric-item">
                          <span class="m-label">Date of Birth</span>
                          <span class="m-value" style="font-size: 0.9rem; color: #f1f5f9;">{{ selectedOp.dob || 'N/A' }}</span>
                        </div>
                      </div>
                    </div>

                    <!-- Assignment metrics -->
                    <div class="metric-section">
                      <p class="section-title">
                        <span class="material-symbols-rounded">assignment</span>
                        Current Assignment
                      </p>
                      <div class="metric-row">
                        <div class="metric-item">
                          <span class="m-label">Line</span>
                          <span class="m-value m-value--good">{{ selectedOp.line }}</span>
                        </div>
                        <div class="metric-item">
                          <span class="m-label">Station</span>
                          <span class="m-value m-value--good">{{ selectedOp.station }}</span>
                        </div>
                        <div class="metric-item">
                          <span class="m-label">Shift</span>
                          <span class="m-value">{{ selectedOp.shift }}</span>
                        </div>
                        <div class="metric-item">
                          <span class="m-label">Start Time</span>
                          <span class="m-value">{{ selectedOp.startTime }}</span>
                        </div>
                      </div>
                    </div>

                    <!-- Attendance metrics -->
                    <div class="metric-section">
                      <p class="section-title">
                        <span class="material-symbols-rounded">calendar_month</span>
                        Attendance This Week
                      </p>
                      <div class="metric-row">
                        <div class="metric-item">
                          <span class="m-label">Days Attended</span>
                          <span class="m-value m-value--good">{{ selectedOp.daysAttended }}</span>
                        </div>
                        <div class="metric-item">
                          <span class="m-label">Expected Days</span>
                          <span class="m-value">{{ selectedOp.expectedDays }}</span>
                        </div>
                        <div class="metric-item">
                          <span class="m-label">Attendance Rate</span>
                          <span class="m-value" :class="attendanceRate(selectedOp) >= 80 ? 'm-value--good' : 'm-value--bad'">
                            {{ attendanceRate(selectedOp) }}%
                          </span>
                        </div>
                        <div class="metric-item">
                          <span class="m-label">Hours Logged</span>
                          <span class="m-value">{{ selectedOp.hoursLogged }}</span>
                        </div>
                      </div>
                    </div>

                    <!-- Recent Alerts -->
                    <div class="alert-section">
                      <p class="section-title">
                        <span class="material-symbols-rounded">notifications</span>
                        Recent Alerts
                      </p>
                      <div v-for="alert in selectedOp.alerts" :key="alert.id"
                           class="alert-item" :class="'alert-item--' + alert.type">
                        <span class="material-symbols-rounded alert-icon">{{ alert.icon }}</span>
                        <div class="alert-body">
                          <strong>{{ alert.label }}</strong>
                          <p>{{ alert.message }}</p>
                        </div>
                      </div>
                    </div>

                    <!-- Shift Action Buttons -->
                    <div class="shift-actions">
                      <button class="shift-btn shift-btn--break" @click="handleLogBreak(selectedOp)">
                        <span class="material-symbols-rounded">free_breakfast</span>
                        {{ isOperatorOnBreak(selectedOp) ? 'END BREAK' : 'LOG BREAK' }}
                      </button>
                      <button class="shift-btn shift-btn--end" @click="handleEndShift(selectedOp)">
                        <span class="material-symbols-rounded">power_settings_new</span>
                        END SHIFT
                      </button>
                    </div>

                  </div>
                  <!-- Empty state -->
                  <div v-else class="profile-empty" key="empty">
                    <span class="material-symbols-rounded pe-icon">person_search</span>
                    <p>Select an operator from the list to view their profile</p>
                  </div>
                </Transition>
              </div>

            </div>
          </section>
        </Transition>

        <!-- ─── VIEW B: Performance & Production Logs ─────────────────── -->
        <Transition name="view-fade" mode="out-in">
          <section v-if="activeView === 'performance'" class="view-panel" key="performance">

            <div class="panel-header flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <h2 class="panel-title">Operator Performance & Production Logs</h2>
                <p class="panel-sub">Daily KPIs · Units produced · Waste tracking · Efficiency rates · {{ selectedOp?.name ?? 'No operator selected' }}</p>
              </div>

              <!-- Time Range Selector -->
              <div class="flex items-center gap-1 bg-slate-800/80 p-1.5 rounded-xl border border-white/10 shrink-0">
                <button
                  class="px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer"
                  :class="prodTimeRange === 'today' ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-500/40' : 'text-slate-400 hover:text-slate-200'"
                  @click="prodTimeRange = 'today'"
                >
                  Today
                </button>
                <button
                  class="px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer"
                  :class="prodTimeRange === 'week' ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-500/40' : 'text-slate-400 hover:text-slate-200'"
                  @click="prodTimeRange = 'week'"
                >
                  This Week
                </button>
                <button
                  class="px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer"
                  :class="prodTimeRange === 'all' ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-500/40' : 'text-slate-400 hover:text-slate-200'"
                  @click="prodTimeRange = 'all'"
                >
                  All Logs
                </button>
              </div>
            </div>

            <!-- KPI Cards -->
            <div class="kpi-grid grid grid-cols-1 md:grid-cols-3 gap-3 shrink-0">
              <AnalyticsDataCard
                :title="prodTimeRange === 'today' ? 'Good Output (Today)' : (prodTimeRange === 'week' ? 'Good Output (This Week)' : 'Good Output (All Time)')"
                :value="kpiStats.rangeGood + (kpiStats.isHourly ? ' hrs' : ' pcs')"
                icon="inventory_2"
                icon-bg="rgba(99,102,241,.15)"
                icon-color="#a5b4fc"
                :trend="0"
              />
              <AnalyticsDataCard
                :title="prodTimeRange === 'today' ? 'Efficiency % (Today)' : (prodTimeRange === 'week' ? 'Efficiency % (This Week)' : 'Efficiency % (All Time)')"
                :value="kpiStats.rangeEfficiency + '%'"
                icon="trending_up"
                icon-bg="rgba(16,185,129,.15)"
                icon-color="#34d399"
                :trend="0"
              />
              <AnalyticsDataCard
                :title="prodTimeRange === 'today' ? 'Total Waste (Today)' : (prodTimeRange === 'week' ? 'Total Waste (This Week)' : 'Total Waste (All Time)')"
                :value="kpiStats.rangeWaste + ' pcs'"
                icon="delete_sweep"
                icon-bg="rgba(239,68,68,.12)"
                icon-color="#f87171"
                :trend="0"
                :trend-up-is-bad="true"
              />
            </div>

            <!-- Activity Logs Table -->
            <div class="chart-card" style="flex:1;min-height:0">
              <div class="card-hdr flex items-center gap-2">
                <span class="material-symbols-rounded" style="color:#a5b4fc">history</span>
                <div>
                  <p class="card-hdr-title">Production Activity Log</p>
                  <p class="card-hdr-sub">
                    {{ isFetchingLogs ? 'Syncing records from database...' : `Showing ${activityLogs.length} entries for ${selectedOp?.name || 'operator'}` }}
                  </p>
                </div>
                <div class="badge ml-auto">
                  {{ prodTimeRange === 'today' ? 'Today\'s Shift' : (prodTimeRange === 'week' ? 'Week ' + store.currentProductionWeek : 'Full History') }}
                </div>
              </div>

              <div class="table-scroll overflow-x-auto w-full">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>Work Category</th>
                      <th>Size</th>
                      <th>Placement</th>
                      <th class="num">Good Output</th>
                      <th class="num">Waste</th>
                      <th class="num">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="log in activityLogs" :key="log.id"
                        :class="{ 'row-error': log.status === 'SCRAP / WASTE' }">
                      <td class="font-mono text-xs text-slate-300">
                        {{ log.fullDateTime }}
                        <span v-if="log.loggedByAdmin" class="row-badge row-badge--neutral text-[0.6rem] ml-1" title="Systematically registered / Admin Override">ADMIN</span>
                      </td>
                      <td class="val-purple bold text-xs">{{ log.variant }}</td>
                      <td class="val-muted text-xs">{{ log.size }}</td>
                      <td class="val-muted text-xs">{{ log.placement }}</td>
                      <td class="num val-main text-xs" :class="log.qty > 0 ? 'text-emerald-400' : 'text-slate-400'">
                        {{ log.qty > 0 ? log.qty + ' ' + log.unit : '—' }}
                      </td>
                      <td class="num text-xs" :class="log.waste > 0 ? 'text-rose-400 font-bold' : 'text-slate-500'">
                        {{ log.waste > 0 ? log.waste + ' pcs' : '0' }}
                      </td>
                      <td class="num">
                        <span class="row-badge" :class="log.statusClass">
                          {{ log.status }}
                        </span>
                      </td>
                    </tr>
                    <tr v-if="activityLogs.length === 0">
                      <td colspan="7" class="text-center py-8 text-slate-500 text-xs">
                        {{ isFetchingLogs ? 'Loading entries from database...' : 'No production logs found for ' + (selectedOp?.name || 'this operator') + ' in this range.' }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="chart-legend">
                <div class="leg-item"><span class="leg-dot" style="background:#34d399"/> Good Production</div>
                <div class="leg-item"><span class="leg-dot" style="background:#ef4444"/> Waste / Scrap</div>
                <div class="leg-item"><span class="leg-dot" style="background:#fbbf24"/> Overtime (1.5x)</div>
              </div>
            </div>

          </section>
        </Transition>

        <!-- ─── VIEW C: Financial Overview & Compensation ───────────────────── -->
        <Transition name="view-fade" mode="out-in">
          <section v-if="activeView === 'financials'" class="view-panel" key="financials">

            <div class="panel-header flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <div class="flex items-center gap-2">
                  <h2 class="panel-title">Financial Overview & Compensation</h2>
                  <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Week {{ store.currentProductionWeek }}
                  </span>
                </div>
                <p class="panel-sub">
                  Live payroll status · Piece-rate / hourly wages · Active loans & debt schedule · {{ selectedOp?.name ?? 'No operator selected' }}
                </p>
              </div>

              <!-- Operator Quick Selector Chip -->
              <div v-if="selectedOp" class="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-white/10 shrink-0">
                <OperatorAvatar :avatar="selectedOp.avatar" :name="selectedOp.name" :color="selectedOp.color" size="sm" />
                <div class="text-left">
                  <p class="text-xs font-bold text-slate-200 leading-tight">{{ selectedOp.name }}</p>
                  <p class="text-[0.65rem] text-slate-400 leading-tight">
                    {{ workerProfile?.isHourly ? (workerProfile?.isPieceRate ? 'Piece + Hourly' : 'Hourly') : 'Piece-Rate' }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Financial KPIs (4-Col Grid) -->
            <div class="kpi-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
              <AnalyticsDataCard
                title="Est. Gross (This Week)"
                :value="'ETB ' + payoutDetails.grossEarnings.toFixed(2)"
                icon="payments"
                icon-bg="rgba(99,102,241,.15)"
                icon-color="#a5b4fc"
              />
              <AnalyticsDataCard
                title="Weekly Deductions"
                :value="'ETB ' + payoutDetails.totalDeduction.toFixed(2)"
                icon="money_off"
                icon-bg="rgba(245,158,11,.15)"
                icon-color="#fbbf24"
                :trend-up-is-bad="true"
              />
              <AnalyticsDataCard
                title="Est. Net Payout"
                :value="'ETB ' + payoutDetails.netPayout.toFixed(2)"
                icon="account_balance_wallet"
                icon-bg="rgba(16,185,129,.15)"
                icon-color="#34d399"
              />
              <AnalyticsDataCard
                title="Active Loan Debt"
                :value="'ETB ' + totalOutstandingDebt.toFixed(2)"
                icon="credit_score"
                icon-bg="rgba(239,68,68,.12)"
                icon-color="#f87171"
                :trend-up-is-bad="true"
              />
            </div>

            <!-- Main Financial Layout: 2 Columns -->
            <div class="fin-layout flex flex-col lg:flex-row gap-4 h-full min-h-0">

              <!-- Left Side (Flex 2): Pay Configuration, Active Loans & Transaction History -->
              <div class="flex flex-col gap-4 flex-[2] min-h-0 overflow-y-auto pr-1">

                <!-- 1. Compensation & Current Week Settlement Card -->
                <div class="chart-card shrink-0">
                  <div class="card-hdr">
                    <span class="material-symbols-rounded" style="color:#a5b4fc">badge</span>
                    <div>
                      <p class="card-hdr-title">Compensation & Wage Model</p>
                      <p class="card-hdr-sub">Active wage parameters and production week metrics</p>
                    </div>
                    <div class="badge ml-auto" :class="payoutStatus.status === 'approved' ? 'badge--ok' : 'badge--warn'">
                      PAYROLL: {{ payoutStatus.status.toUpperCase() }}
                    </div>
                  </div>

                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    <div class="metric-item bg-slate-900/60 p-2.5 rounded-lg border border-white/5">
                      <span class="m-label">Pay Model</span>
                      <span class="m-value text-sm font-bold text-indigo-300">
                        {{ workerProfile?.isHourly ? (workerProfile?.isPieceRate ? 'Hybrid (Piece+Hr)' : 'Hourly Rate') : 'Piece-Rate' }}
                      </span>
                    </div>

                    <div class="metric-item bg-slate-900/60 p-2.5 rounded-lg border border-white/5">
                      <span class="m-label">{{ workerProfile?.isHourly ? 'Hourly Rate' : 'Week Units' }}</span>
                      <span class="m-value text-sm font-bold text-emerald-400">
                        {{ workerProfile?.isHourly ? workerProfile.hourlyRate + ' ETB/hr' : thisWeekUnits + ' pcs' }}
                      </span>
                    </div>

                    <div class="metric-item bg-slate-900/60 p-2.5 rounded-lg border border-white/5">
                      <span class="m-label">Week Attendance</span>
                      <span class="m-value text-sm font-bold text-slate-200">
                        {{ payoutDetails.daysAttended }} / 6 days
                      </span>
                    </div>

                    <div class="metric-item bg-slate-900/60 p-2.5 rounded-lg border border-white/5">
                      <span class="m-label">Weekly Bonus</span>
                      <span class="m-value text-sm font-bold" :class="payoutDetails.bonus > 0 ? 'text-emerald-400' : 'text-slate-400'">
                        {{ payoutDetails.bonus > 0 ? '+ ' + payoutDetails.bonus.toFixed(2) + ' ETB' : '0.00 ETB' }}
                      </span>
                    </div>
                  </div>

                  <!-- Assigned Work Categories -->
                  <div class="flex items-center gap-2 flex-wrap pt-2 border-t border-white/5">
                    <span class="text-[0.68rem] uppercase font-bold text-slate-400 tracking-wider">Assigned Categories:</span>
                    <template v-if="(selectedOp?.work_types?.categories || selectedOp?.work_types)?.length">
                      <span
                        v-for="wt in (selectedOp?.work_types?.categories || selectedOp?.work_types)"
                        :key="wt"
                        class="px-2 py-0.5 rounded-md text-[0.68rem] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                      >
                        {{ wt === 'TIME' ? 'Hourly (TIME)' : wt }}
                      </span>
                    </template>
                    <span v-else class="text-xs text-slate-500 italic">Standard Piece-Rate Production</span>
                  </div>
                </div>

                <!-- 2. Active Installment Loans & Repayment Schedule -->
                <div class="chart-card shrink-0">
                  <div class="card-hdr">
                    <span class="material-symbols-rounded" style="color:#fbbf24">account_balance</span>
                    <div>
                      <p class="card-hdr-title">Active Installment Loans</p>
                      <p class="card-hdr-sub">Multi-week debt schedules and weekly payroll deductions</p>
                    </div>
                    <span class="text-xs font-mono font-bold text-amber-400 ml-auto">
                      {{ activeLoans.length }} Active
                    </span>
                  </div>

                  <div v-if="activeLoans.length > 0" class="flex flex-col gap-3">
                    <div
                      v-for="loan in activeLoans"
                      :key="loan.id"
                      class="p-3 rounded-xl bg-slate-900/80 border border-white/10 flex flex-col gap-2.5"
                    >
                      <div class="flex items-start justify-between flex-wrap gap-2">
                        <div>
                          <div class="flex items-center gap-2">
                            <span class="text-sm font-bold text-slate-100">
                              Loan #{{ String(loan.id).slice(-4) }}
                            </span>
                            <span class="px-2 py-0.5 rounded text-[0.62rem] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {{ loan.status }}
                            </span>
                            <span class="text-[0.68rem] text-slate-400">
                              Issued: {{ loan.week || new Date(loan.issuedAt).toLocaleDateString() }}
                            </span>
                          </div>
                          <p class="text-xs text-slate-400 mt-0.5">
                            Principal: <strong class="text-slate-200">{{ loan.amount }} ETB</strong> • 
                            Interest: <strong class="text-slate-200">{{ loan.interestRate }}%</strong> • 
                            Total: <strong class="text-amber-400">{{ loan.totalDebt }} ETB</strong>
                          </p>
                        </div>
                        <div class="text-right">
                          <span class="text-[0.65rem] text-slate-400 block uppercase font-bold">Weekly Installment</span>
                          <span class="text-sm font-extrabold text-amber-300 font-mono">
                            {{ loan.weeklyInstallment.toFixed(2) }} ETB/wk
                          </span>
                        </div>
                      </div>

                      <!-- Progress bar -->
                      <div>
                        <div class="flex justify-between text-[0.7rem] text-slate-400 mb-1">
                          <span>Repaid: {{ (loan.totalDebt - loan.remainingBalance).toFixed(2) }} ETB</span>
                          <span class="font-bold text-slate-300">Remaining: {{ loan.remainingBalance.toFixed(2) }} ETB ({{ loan.weeksRemaining }} wks left)</span>
                        </div>
                        <div class="w-full h-2 rounded-full bg-slate-800 overflow-hidden border border-white/5">
                          <div
                            class="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                            :style="{ width: Math.min(100, Math.max(0, ((loan.totalDebt - loan.remainingBalance) / loan.totalDebt) * 100)) + '%' }"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div v-else class="py-6 text-center text-slate-500 flex flex-col items-center justify-center gap-1 bg-slate-900/30 rounded-xl border border-white/5">
                    <span class="material-symbols-rounded text-2xl text-slate-600">check_circle</span>
                    <p class="text-xs">No active installment loans for {{ selectedOp?.name }}.</p>
                  </div>
                </div>

                <!-- 3. Unified Financial History & Settlement Ledger -->
                <div class="chart-card flex-1 min-h-[300px]">
                  <div class="card-hdr">
                    <span class="material-symbols-rounded" style="color:#a5b4fc">receipt_long</span>
                    <div>
                      <p class="card-hdr-title">Financial Ledger & Settlement History</p>
                      <p class="card-hdr-sub">Chronological payouts, advances, and loan events</p>
                    </div>
                    <button class="badge-btn ml-auto cursor-pointer" @click="printFinancialStatement">
                      <span class="material-symbols-rounded" style="font-size:1rem">print</span>
                      Print Statement
                    </button>
                  </div>

                  <div class="table-scroll overflow-x-auto w-full">
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Details / Note</th>
                          <th class="num">Amount (ETB)</th>
                          <th class="num">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="tx in unifiedTransactions" :key="tx.id">
                          <td class="font-mono val-muted text-xs">{{ tx.date }}</td>
                          <td>
                            <div class="flex items-center gap-1.5">
                              <span class="material-symbols-rounded text-sm" :class="tx.colorClass">{{ tx.icon }}</span>
                              <span class="font-bold text-xs" :class="tx.colorClass">{{ tx.type }}</span>
                            </div>
                          </td>
                          <td class="text-xs text-slate-300 max-w-[220px] truncate" :title="tx.note">
                            {{ tx.note }}
                          </td>
                          <td class="num font-bold text-xs" :class="tx.colorClass">{{ tx.amount }}</td>
                          <td class="num">
                            <span class="row-badge" :class="tx.badgeClass">{{ tx.status }}</span>
                          </td>
                        </tr>
                        <tr v-if="unifiedTransactions.length === 0">
                          <td colspan="5" class="text-center py-6 text-slate-500 text-xs">
                            No financial records logged for this operator yet.
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              <!-- Right Side (Flex 1): Actions & Quick Tools -->
              <div class="fin-actions-col flex flex-col gap-3 w-full lg:w-[280px] shrink-0">
                
                <!-- Action 1: Issue Cash Advance -->
                <button
                  class="fin-action-btn fin-action-btn--primary cursor-pointer hover:brightness-110 active:scale-[0.98] transition-all"
                  @click="openAdvanceModal"
                >
                  <span class="material-symbols-rounded">payments</span>
                  ISSUE CASH ADVANCE
                  <span class="text-[0.65rem] opacity-75 font-normal">Single-week payroll deduction</span>
                </button>

                <!-- Action 2: Issue Multi-Week Loan -->
                <button
                  class="fin-action-btn fin-action-btn--secondary cursor-pointer hover:bg-slate-700 active:scale-[0.98] transition-all"
                  @click="openLoanModal"
                >
                  <span class="material-symbols-rounded" style="color:#fbbf24">account_balance</span>
                  ISSUE INSTALLMENT LOAN
                  <span class="text-[0.65rem] opacity-75 font-normal">Multi-week structured repayment</span>
                </button>

                <!-- Financial Summary Card -->
                <div class="chart-card bg-slate-800/60 border border-white/10 mt-auto">
                  <div class="card-hdr">
                    <span class="material-symbols-rounded text-emerald-400">calculate</span>
                    <div>
                      <p class="card-hdr-title">Week Calculation</p>
                      <p class="card-hdr-sub">{{ store.currentProductionWeek }} Net formula</p>
                    </div>
                  </div>

                  <div class="flex flex-col gap-2 text-xs py-1">
                    <div class="flex justify-between text-slate-300">
                      <span>Gross Earnings:</span>
                      <span class="font-mono font-bold text-slate-100">+ {{ payoutDetails.grossEarnings.toFixed(2) }}</span>
                    </div>
                    <div class="flex justify-between text-amber-400">
                      <span>Total Deductions:</span>
                      <span class="font-mono font-bold">− {{ payoutDetails.totalDeduction.toFixed(2) }}</span>
                    </div>
                    <div class="flex justify-between text-emerald-400" v-if="payoutDetails.bonus > 0">
                      <span>Bonus:</span>
                      <span class="font-mono font-bold">+ {{ payoutDetails.bonus.toFixed(2) }}</span>
                    </div>
                    <div class="pt-2 border-t border-white/10 flex justify-between items-center">
                      <span class="font-extrabold text-slate-200">Net Payout:</span>
                      <span class="text-base font-extrabold text-emerald-400 font-mono">
                        {{ payoutDetails.netPayout.toFixed(2) }} ETB
                      </span>
                    </div>
                  </div>

                  <router-link
                    to="/payroll"
                    class="w-full text-center py-2 px-3 rounded-lg text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span class="material-symbols-rounded text-sm">open_in_new</span>
                    Open Weekly Payroll
                  </router-link>
                </div>

              </div>

            </div>
          </section>
        </Transition>

      </main>

      <!-- ══════════════════════════════════════════════════════════════════
           MODAL: Issue Cash Advance
           ══════════════════════════════════════════════════════════════════ -->
      <div v-if="showAdvanceModal" class="modal-overlay" @click.self="showAdvanceModal = false">
        <div class="modal-card">
          <div class="modal-hdr">
            <div class="flex items-center gap-2">
              <span class="material-symbols-rounded text-emerald-400">payments</span>
              <h3 class="modal-title">Issue Cash Advance</h3>
            </div>
            <button class="modal-close" @click="showAdvanceModal = false">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>

          <p class="modal-sub">
            Recording advance for <strong>{{ selectedOp?.name }}</strong> for Week <strong>{{ store.currentProductionWeek }}</strong>.
          </p>

          <div class="form-group mt-3">
            <label class="form-label">Amount (ETB)</label>
            <input
              v-model.number="advanceForm.amount"
              type="number"
              min="1"
              placeholder="e.g. 200"
              class="form-input"
              autofocus
            />
          </div>

          <div class="form-group mt-3">
            <label class="form-label">Reason / Description</label>
            <select v-model="advanceForm.note" class="form-input">
              <option value="Weekly Advance">Weekly Advance</option>
              <option value="Transportation">Transportation</option>
              <option value="Emergency Personal">Emergency Personal</option>
              <option value="Medical">Medical</option>
              <option value="Food & Living">Food & Living</option>
            </select>
          </div>

          <div class="modal-actions mt-5">
            <button class="btn-cancel" @click="showAdvanceModal = false">Cancel</button>
            <button
              class="btn-confirm"
              :disabled="!advanceForm.amount || advanceForm.amount <= 0 || isSubmitting"
              @click="submitAdvance"
            >
              {{ isSubmitting ? 'Saving...' : 'Confirm Advance' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════════════
           MODAL: Issue Multi-Week Installment Loan
           ══════════════════════════════════════════════════════════════════ -->
      <div v-if="showLoanModal" class="modal-overlay" @click.self="showLoanModal = false">
        <div class="modal-card">
          <div class="modal-hdr">
            <div class="flex items-center gap-2">
              <span class="material-symbols-rounded text-amber-400">account_balance</span>
              <h3 class="modal-title">Issue Installment Loan</h3>
            </div>
            <button class="modal-close" @click="showLoanModal = false">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>

          <p class="modal-sub">
            Structured installment loan for <strong>{{ selectedOp?.name }}</strong>.
          </p>

          <div class="grid grid-cols-2 gap-3 mt-3">
            <div class="form-group">
              <label class="form-label">Principal (ETB)</label>
              <input
                v-model.number="loanForm.principal"
                type="number"
                min="1"
                placeholder="e.g. 1000"
                class="form-input"
                autofocus
              />
            </div>
            <div class="form-group">
              <label class="form-label">Interest Rate (%)</label>
              <input
                v-model.number="loanForm.interestRate"
                type="number"
                min="0"
                max="50"
                placeholder="5"
                class="form-input"
              />
            </div>
          </div>

          <div class="form-group mt-3">
            <label class="form-label">Repayment Duration (Weeks)</label>
            <select v-model.number="loanForm.installmentWeeks" class="form-input">
              <option :value="1">1 Week (Single deduction)</option>
              <option :value="2">2 Weeks</option>
              <option :value="3">3 Weeks</option>
              <option :value="4">4 Weeks (1 Month)</option>
              <option :value="6">6 Weeks</option>
              <option :value="8">8 Weeks (2 Months)</option>
              <option :value="12">12 Weeks (3 Months)</option>
            </select>
          </div>

          <!-- Calculated schedule preview -->
          <div v-if="loanForm.principal > 0" class="p-3 rounded-lg bg-slate-900/90 border border-white/10 mt-3 text-xs flex flex-col gap-1.5">
            <div class="flex justify-between text-slate-300">
              <span>Total Debt (with interest):</span>
              <strong class="text-amber-400 font-mono">
                {{ (loanForm.principal + loanForm.principal * (loanForm.interestRate / 100)).toFixed(2) }} ETB
              </strong>
            </div>
            <div class="flex justify-between text-slate-300">
              <span>Weekly Deduction:</span>
              <strong class="text-emerald-400 font-mono">
                {{ ((loanForm.principal + loanForm.principal * (loanForm.interestRate / 100)) / loanForm.installmentWeeks).toFixed(2) }} ETB / wk
              </strong>
            </div>
          </div>

          <div class="modal-actions mt-5">
            <button class="btn-cancel" @click="showLoanModal = false">Cancel</button>
            <button
              class="btn-confirm"
              :disabled="!loanForm.principal || loanForm.principal <= 0 || isSubmitting"
              @click="submitLoan"
            >
              {{ isSubmitting ? 'Issuing Loan...' : 'Issue & Activate Loan' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Toast -->
      <Transition name="toast">
        <div v-if="toastVisible" class="toast-msg">
          <span class="material-symbols-rounded">check_circle</span>
          {{ toastMessage }}
        </div>
      </Transition>

    </div>
  </AppLayout>
</template>

<script setup>
// Developer: Mintesnot Abebe | Brand: dev MinteIO
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import AppLayout from '@/components/layout/AppLayout.vue'
import AnalyticsDataCard from '@/components/ui/AnalyticsDataCard.vue'
import OperatorAvatar from '@/components/ui/OperatorAvatar.vue'
import { useMesStore } from '@/store/mesStore.js'
import { usePayrollStore } from '@/store/payrollStore.js'
import { useAttendanceStore } from '@/store/attendanceStore.js'

const store = useMesStore()
const payrollStore = usePayrollStore()
const attStore = useAttendanceStore()

// ── Tab definitions (identical pattern to ExecutiveAnalytics) ─────────────────
const TABS = [
  { id: 'roster',      icon: 'badge',                  title: 'Operator Roster',    sub: 'Status & assignment'    },
  { id: 'performance', icon: 'precision_manufacturing', title: 'Performance Logs',   sub: 'KPIs & daily output'    },
  { id: 'financials',  icon: 'account_balance_wallet',  title: 'Financial Overview', sub: 'Wages, loans & ledger'  },
]
const activeView = ref('roster')

// ── Operator list (pulls from store + adds extra fields) ─────────────────────
const operators = computed(() =>
  (store.operators || []).map(op => {
    const isClockedIn = store.isOperatorClockedIn(op.id)
    const currentShift = (attStore.clockInLog || []).find(log => Number(log.operatorId) === Number(op.id) && !log.clockOut)
    
    let startTime = '—'
    let hoursLogged = '00:00:00'
    if (currentShift && currentShift.clockIn) {
      const d = new Date(currentShift.clockIn)
      startTime = isNaN(d.getTime()) ? '—' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      const diffMs = Math.max(0, new Date() - d)
      const h = Math.floor(diffMs / 3600000).toString().padStart(2, '0')
      const m = Math.floor((diffMs % 3600000) / 60000).toString().padStart(2, '0')
      hoursLogged = `${h}:${m}`
    }

    const daysAttended = typeof attStore.getDaysAttended === 'function' 
      ? attStore.getDaysAttended(op.id, store.currentProductionWeek) 
      : 0
    
    const alerts = []
    if (isClockedIn) {
      alerts.push({ id: 1, type: 'info', icon: 'info', label: 'SYSTEM MSG', message: 'Clocked in successfully.' })
    }

    return {
      ...op,
      status: isClockedIn ? 'active' : 'inactive',
      line: op.line || '01',
      station: op.station || 'A',
      shift: isClockedIn ? 'Shift A' : 'Off',
      startTime,
      hoursLogged,
      daysAttended,
      expectedDays: 6,
      alerts
    }
  })
)

// Search + selection
const empSearch = ref('')
const filteredOperators = computed(() => {
  const q = empSearch.value.trim().toLowerCase()
  return q ? operators.value.filter(o => (o.name || '').toLowerCase().includes(q)) : operators.value
})

const selectedOp = ref(null)

// ── Operator Dedicated Production Logs State ─────────────────────────────────
const operatorDbLogs = ref([])
const isFetchingLogs = ref(false)
const prodTimeRange = ref('today') // 'today' | 'week' | 'all'
let autoRefreshTimer = null

async function fetchOperatorLogs(opId) {
  if (!opId) return
  isFetchingLogs.value = true
  try {
    const { data, error } = await supabase
      .from('mes_production_logs')
      .select('*')
      .eq('operator_id', opId)
      .order('created_at', { ascending: false })
      .limit(300)
    if (!error && data) {
      operatorDbLogs.value = data.map(store.mapSupabaseLedgerToLocal)
    }
  } catch (err) {
    console.error('Error fetching operator logs from Supabase:', err)
  } finally {
    isFetchingLogs.value = false
  }
}

// Ensure selectedOp is populated when operators load
watch(operators, (newOps) => {
  if (selectedOp.value) {
    const updated = newOps.find(o => Number(o.id) === Number(selectedOp.value.id))
    if (updated) selectedOp.value = updated
  } else if (newOps.length > 0) {
    selectedOp.value = newOps[0]
  }
}, { immediate: true })

watch(selectedOp, (newOp) => {
  if (newOp && newOp.id) {
    fetchOperatorLogs(newOp.id)
  }
})

onMounted(async () => {
  // Ensure store state is freshly fetched
  await store.fetchInitialData()
  if (!selectedOp.value && operators.value.length > 0) {
    selectedOp.value = operators.value[0]
  }
  if (selectedOp.value && selectedOp.value.id) {
    await fetchOperatorLogs(selectedOp.value.id)
  }
  // Initialize loan & bonus data from payroll store
  await payrollStore.fetchLoans()
  if (store.currentProductionWeek) {
    await payrollStore.fetchBonuses(store.currentProductionWeek)
  }

  // Periodic refresh every 30 seconds
  autoRefreshTimer = setInterval(async () => {
    if (selectedOp.value && selectedOp.value.id) {
      await fetchOperatorLogs(selectedOp.value.id)
    }
  }, 30000)
})

onUnmounted(() => {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer)
})

// Refresh when week changes
watch(() => store.currentProductionWeek, (newWeek) => {
  if (newWeek) {
    payrollStore.fetchBonuses(newWeek)
  }
})

const attendanceRate = (op) =>
  op && op.expectedDays > 0 ? Math.round(((op.daysAttended || 0) / op.expectedDays) * 100) : 0

// ── Unified Production Logs Logic (Store + DB) ────────────────────────────────
function parseEntryDate(entry) {
  if (entry.productionDate) {
    if (typeof entry.productionDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(entry.productionDate)) {
      const [y, m, d] = entry.productionDate.split('-').map(Number)
      return new Date(y, m - 1, d)
    }
    const d = new Date(entry.productionDate)
    if (!isNaN(d.getTime())) return d
  }
  if (entry.timestamp) {
    const d = new Date(entry.timestamp)
    if (!isNaN(d.getTime())) return d
  }
  return new Date()
}

function isSameCalendarDay(d1, d2) {
  if (!d1 || !d2) return false
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate()
}

const allOperatorLogs = computed(() => {
  if (!selectedOp.value) return []
  const opId = Number(selectedOp.value.id)
  const opName = selectedOp.value.name

  // Store logs
  const storeLogs = (store.ledgerEntries || []).filter(e =>
    (e.operator_id != null && Number(e.operator_id) === opId) ||
    (e.operator && e.operator === opName)
  )

  // Database logs
  const dbLogs = operatorDbLogs.value

  // Merge by id (deduplicate)
  const map = new Map()
  for (const log of dbLogs) {
    if (log.id) map.set(String(log.id), log)
  }
  for (const log of storeLogs) {
    if (log.id) map.set(String(log.id), log)
  }

  return Array.from(map.values()).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
})

const filteredOperatorLogs = computed(() => {
  const logs = allOperatorLogs.value
  const now = new Date()

  if (prodTimeRange.value === 'today') {
    return logs.filter(e => isSameCalendarDay(parseEntryDate(e), now))
  }
  if (prodTimeRange.value === 'week') {
    return logs.filter(e => e.week === store.currentProductionWeek)
  }
  return logs
})

// ── Activity logs Table Formatter ─────────────────────────────────────────────
const activityLogs = computed(() => {
  return filteredOperatorLogs.value.map(e => {
    const dt = e.timestamp ? new Date(e.timestamp) : parseEntryDate(e)
    const isValidDate = dt && !isNaN(dt.getTime())
    const timeStr = isValidDate ? dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'
    const dateStr = isValidDate ? dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'

    let variantLabel = 'Type ' + (e.dividerType || 'MFG')
    if (e.workCategory === 'TIME') variantLabel = 'Hourly Work (TIME)'
    else if (e.workCategory === 'C') variantLabel = 'Wood Prep (C)'
    else if (e.workCategory === 'PP') variantLabel = 'Partition (PP)'
    else if (e.workCategory === 'PL') variantLabel = 'Pad (PL)'
    else if (e.dividerType === 'Other') variantLabel = 'Custom'

    const isHourly = e.workCategory === 'TIME'
    const qty = isHourly ? (e.hoursWorked || e.goodProduction || 0) : (e.goodProduction || 0)
    const waste = Number(e.wasteMaterial) || 0

    let status = 'OK'
    let statusClass = 'row-badge--green'
    if (e.isOvertime || e.is_overtime) {
      status = 'OVERTIME 1.5x'
      statusClass = 'row-badge--yellow'
    } else if (waste > 0 && (!qty || qty === 0)) {
      status = 'SCRAP / WASTE'
      statusClass = 'row-badge--red'
    } else if (isHourly) {
      status = 'HOURLY'
      statusClass = 'row-badge--neutral'
    }

    return {
      id: e.id,
      time: timeStr,
      date: dateStr,
      fullDateTime: `${dateStr}, ${timeStr}`,
      category: e.workCategory || 'MFG',
      variant: variantLabel,
      size: e.size || (e.size_cm ? e.size_cm + 'cm' : '—'),
      placement: e.placement || '—',
      qty,
      waste,
      unit: isHourly ? 'hrs' : 'pcs',
      status,
      statusClass,
      loggedByAdmin: e.loggedByAdmin || e.logged_by_admin || false
    }
  })
})

// ── Performance KPIs ──────────────────────────────────────────────────────────
const kpiStats = computed(() => {
  if (!selectedOp.value) {
    return {
      todayGood: 0, todayWaste: 0, todayEfficiency: '100.0',
      rangeGood: 0, rangeWaste: 0, rangeEfficiency: '100.0',
      weekGood: 0, weekWaste: 0, isHourly: false
    }
  }

  const isHourly = !!workerProfile.value?.isHourly
  const now = new Date()

  // Today's logs
  const todayLogs = allOperatorLogs.value.filter(e => isSameCalendarDay(parseEntryDate(e), now))
  const todayGood = todayLogs.reduce((s, e) => s + (e.workCategory === 'TIME' ? (Number(e.hoursWorked) || Number(e.goodProduction) || 0) : (Number(e.goodProduction) || 0)), 0)
  const todayWaste = todayLogs.reduce((s, e) => s + (Number(e.wasteMaterial) || 0), 0)
  const todayTotal = todayGood + todayWaste
  const todayEfficiency = todayTotal > 0 ? ((todayGood / todayTotal) * 100).toFixed(1) : '100.0'

  // Selected range logs
  const rangeLogs = filteredOperatorLogs.value
  const rangeGood = rangeLogs.reduce((s, e) => s + (e.workCategory === 'TIME' ? (Number(e.hoursWorked) || Number(e.goodProduction) || 0) : (Number(e.goodProduction) || 0)), 0)
  const rangeWaste = rangeLogs.reduce((s, e) => s + (Number(e.wasteMaterial) || 0), 0)
  const rangeTotal = rangeGood + rangeWaste
  const rangeEfficiency = rangeTotal > 0 ? ((rangeGood / rangeTotal) * 100).toFixed(1) : '100.0'

  // Week's logs
  const weekLogs = allOperatorLogs.value.filter(e => e.week === store.currentProductionWeek)
  const weekGood = weekLogs.reduce((s, e) => s + (Number(e.goodProduction) || 0), 0)
  const weekWaste = weekLogs.reduce((s, e) => s + (Number(e.wasteMaterial) || 0), 0)

  return {
    todayGood,
    todayWaste,
    todayEfficiency,
    rangeGood,
    rangeWaste,
    rangeEfficiency,
    weekGood,
    weekWaste,
    isHourly
  }
})

// ── Financial Engine Computations ─────────────────────────────────────────────
const workerProfile = computed(() => {
  if (!selectedOp.value) return null
  return payrollStore.getWorkerProfile(selectedOp.value.id)
})

const payoutDetails = computed(() => {
  if (!selectedOp.value) {
    return {
      grossPieceRate: 0, grossHourly: 0, attendanceFactor: 0, grossEarnings: 0,
      totalDeduction: 0, loanBreakdown: [], bonus: 0, netPayout: 0, daysAttended: 0
    }
  }
  return payrollStore.calculateFinalPayout(selectedOp.value.id, store.currentProductionWeek)
})

const payoutStatus = computed(() => {
  if (!selectedOp.value) return { status: 'pending', reason: '' }
  return payrollStore.getPayoutStatus(selectedOp.value.id, store.currentProductionWeek)
})

const operatorLoans = computed(() => {
  if (!selectedOp.value) return []
  return (payrollStore.loans || []).filter(l => Number(l.workerId) === Number(selectedOp.value.id))
})

const activeLoans = computed(() => {
  return operatorLoans.value.filter(l => (l.status === 'active' || l.status === 'pending') && Number(l.remainingBalance) > 0)
})

const totalOutstandingDebt = computed(() => {
  return activeLoans.value.reduce((sum, l) => sum + (Number(l.remainingBalance) || 0), 0)
})

const thisWeekUnits = computed(() => {
  if (!selectedOp.value) return 0
  const opId = Number(selectedOp.value.id)
  return allOperatorLogs.value
    .filter(e => Number(e.operator_id) === opId && (e.week === store.currentProductionWeek || (!e.week && e.productionWeek === store.currentProductionWeek)))
    .reduce((sum, e) => sum + (Number(e.goodProduction) || 0), 0)
})

// Unified Financial History Ledger
const unifiedTransactions = computed(() => {
  if (!selectedOp.value) return []
  const list = []
  const opId = Number(selectedOp.value.id)
  const opName = selectedOp.value.name

  // 1. Cash entries (Advances, Payouts, Settlement records)
  const myCash = (store.cashEntries || []).filter(c =>
    (c.operator_id != null && Number(c.operator_id) === opId) ||
    (!c.operator_id && c.operator === opName)
  )

  for (const c of myCash) {
    let type = 'PAYOUT'
    let icon = 'payments'
    let colorClass = 'val-green'
    let badgeClass = 'row-badge--green'
    let amountPrefix = '+'
    let statusText = 'CLEARED'

    if (c.type === 'advance') {
      type = 'CASH ADVANCE'
      icon = 'call_made'
      colorClass = 'val-red'
      badgeClass = c.status === 'pending' ? 'row-badge--yellow' : 'row-badge--red'
      amountPrefix = '−'
      statusText = c.status === 'pending' ? 'PENDING' : 'DEDUCTED'
    } else if (c.type === 'payout') {
      type = 'WEEKLY SETTLEMENT'
      icon = 'account_balance_wallet'
      colorClass = 'val-green'
      badgeClass = 'row-badge--green'
      amountPrefix = '+'
      statusText = 'PAID'
    }

    const dt = c.timestamp ? new Date(c.timestamp) : null
    const dateStr = dt && !isNaN(dt.getTime()) ? dt.toLocaleDateString('en-GB').toUpperCase() : (c.date || '—')

    list.push({
      id: 'cash-' + c.id,
      timestamp: c.timestamp || c.created_at || '2026-01-01',
      date: dateStr,
      type,
      note: c.note || c.notes || 'Weekly Advance Settlement',
      amount: amountPrefix + Number(c.amount || 0).toFixed(2),
      status: statusText,
      icon,
      colorClass,
      badgeClass
    })
  }

  // 2. Installment Loans
  for (const loan of operatorLoans.value) {
    const dt = loan.issuedAt ? new Date(loan.issuedAt) : null
    const dateStr = dt && !isNaN(dt.getTime()) ? dt.toLocaleDateString('en-GB').toUpperCase() : (loan.week || '—')

    list.push({
      id: 'loan-' + loan.id,
      timestamp: loan.issuedAt || '2026-01-01',
      date: dateStr,
      type: 'INSTALLMENT LOAN',
      note: `${loan.totalInstallments} Wks @ ${loan.weeklyInstallment.toFixed(2)} ETB/wk (${loan.interestRate}% Int)`,
      amount: '−' + Number(loan.totalDebt || loan.amount).toFixed(2),
      status: (loan.status || 'ACTIVE').toUpperCase(),
      icon: 'credit_score',
      colorClass: 'val-purple',
      badgeClass: loan.status === 'closed' ? 'row-badge--neutral' : 'row-badge--yellow'
    })
  }

  return list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
})

// ── Modals & Quick Financial Actions ──────────────────────────────────────────
const showAdvanceModal = ref(false)
const showLoanModal = ref(false)
const isSubmitting = ref(false)

const advanceForm = reactive({
  amount: '',
  note: 'Weekly Advance'
})

const loanForm = reactive({
  principal: '',
  interestRate: 5,
  installmentWeeks: 4
})

function openAdvanceModal() {
  advanceForm.amount = ''
  advanceForm.note = 'Weekly Advance'
  showAdvanceModal.value = true
}

function openLoanModal() {
  loanForm.principal = ''
  loanForm.interestRate = workerProfile.value?.baseInterestRate || 5
  loanForm.installmentWeeks = 4
  showLoanModal.value = true
}

async function submitAdvance() {
  if (!selectedOp.value || !advanceForm.amount || advanceForm.amount <= 0) return
  isSubmitting.value = true
  try {
    const success = await store.addCashEntry({
      operator_id: selectedOp.value.id,
      operator: selectedOp.value.name,
      type: 'advance',
      amount: Number(advanceForm.amount),
      note: advanceForm.note || 'Weekly Advance'
    })
    if (success) {
      showToast(`Issued ${advanceForm.amount} ETB advance to ${selectedOp.value.name}`)
      showAdvanceModal.value = false
    } else {
      showToast('Failed to record advance')
    }
  } catch (err) {
    console.error('Advance error:', err)
    showToast('Failed to record advance')
  } finally {
    isSubmitting.value = false
  }
}

async function submitLoan() {
  if (!selectedOp.value || !loanForm.principal || loanForm.principal <= 0) return
  isSubmitting.value = true
  try {
    await payrollStore.requestLoan(
      selectedOp.value.id,
      store.currentProductionWeek,
      loanForm.principal,
      loanForm.interestRate,
      loanForm.installmentWeeks
    )
    showToast(`Issued ${loanForm.principal} ETB loan to ${selectedOp.value.name}`)
    showLoanModal.value = false
  } catch (err) {
    console.error('Loan error:', err)
    showToast('Failed to issue loan')
  } finally {
    isSubmitting.value = false
  }
}

function printFinancialStatement() {
  if (!selectedOp.value) return
  window.print()
}

// ── Toast ─────────────────────────────────────────────────────────────────────
const toastVisible = ref(false)
const toastMessage = ref('')
let toastTimer = null

function showToast(msg) {
  toastMessage.value = msg
  toastVisible.value = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastVisible.value = false }, 2500)
}

function isOperatorOnBreak(op) {
  if (!op) return false
  return (store.downtimeSessions || []).some(d => Number(d.operator_id) === Number(op.id) && d.downtime_reason === 'Break' && !d.end_time)
}

async function handleLogBreak(op) {
  if (!op) return
  const activeBreak = (store.downtimeSessions || []).find(d => Number(d.operator_id) === Number(op.id) && d.downtime_reason === 'Break' && !d.end_time)
  
  try {
    if (activeBreak) {
      const outTime = new Date().toISOString()
      await supabase.from('mes_downtime_logs').update({ end_time: outTime }).eq('id', activeBreak.id)
      activeBreak.end_time = outTime
      showToast(`${op.name}'s break ended!`)
    } else {
      const payload = {
        production_week: store.currentProductionWeek,
        operator_id: op.id,
        downtime_reason: 'Break',
        start_time: new Date().toISOString()
      }
      const { data } = await supabase.from('mes_downtime_logs').insert(payload).select().single()
      if (data) {
        if (!store.downtimeSessions) store.downtimeSessions = []
        store.downtimeSessions.push(data)
      }
      showToast(`${op.name} is now on break!`)
    }
  } catch (err) {
    console.error('Failed to log break:', err)
    showToast('Failed to log break')
  }
}

async function handleEndShift(op) {
  if (!op) return
  store.clockOut(op)
  try {
    const outTime = new Date().toISOString()
    await supabase.from('mes_attendance')
      .update({ clock_out: outTime })
      .eq('operator_id', op.id)
      .is('clock_out', null)
      
    const logEntry = (attStore.clockInLog || []).find(log => Number(log.operatorId) === Number(op.id) && !log.clockOut)
    if (logEntry) {
      logEntry.clockOut = outTime
    }
    showToast(`${op.name}'s shift ended!`)
  } catch (e) {
    console.error('End shift error:', e)
    showToast('Failed to end shift')
  }
}

function handleClockOut() {
  if (selectedOp.value) {
    handleEndShift(selectedOp.value)
  }
}
</script>

<style scoped>
/* ══ Root — same flex pattern as analytics-root ══════════════════════════════ */
.emp-root {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: 'Inter', sans-serif;
}

/* ══ Left sub-nav — EXACT copy of ExecutiveAnalytics .view-nav ═══════════════ */
.view-nav {
  width: 220px;
  flex-shrink: 0;
  background: #1e293b;
  border-right: 1px solid rgba(255,255,255,.06);
  display: flex;
  flex-direction: column;
  padding: 1.25rem 1rem;
  gap: .5rem;
  overflow-y: auto;
}

.nav-heading {
  font-size: .58rem;
  font-weight: 700;
  letter-spacing: .16em;
  color: #334155;
  text-transform: uppercase;
  padding: 0 .5rem;
  margin: 0 0 .25rem;
}

.nav-tab {
  display: flex;
  align-items: center;
  gap: .75rem;
  padding: .85rem .9rem;
  border-radius: .75rem;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: all .15s ease;
  position: relative;
  color: #64748b;
  -webkit-tap-highlight-color: transparent;
}
.nav-tab:hover { background: rgba(255,255,255,.04); color: #94a3b8; }
.nav-tab--active {
  background: rgba(99,102,241,.15);
  border-color: rgba(99,102,241,.3);
  color: #a5b4fc;
}
.tab-icon { font-size: 1.3rem; flex-shrink: 0; }
.tab-labels { display: flex; flex-direction: column; gap: .1rem; }
.tab-title { font-size: .82rem; font-weight: 700; line-height: 1.2; }
.tab-sub   { font-size: .6rem; opacity: .6; }
.tab-indicator {
  position: absolute;
  left: 0; top: 25%; bottom: 25%;
  width: 3px;
  border-radius: 0 2px 2px 0;
  background: #6366f1;
}

/* Selected operator chip in nav */
.selected-op-card {
  display: flex;
  align-items: center;
  gap: .6rem;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.07);
  border-radius: .65rem;
  padding: .6rem .75rem;
}
.op-status-dot {
  width: 8px; height: 8px; border-radius: 50%; margin-left: auto; flex-shrink: 0;
}
.dot--green { background: #10b981; box-shadow: 0 0 6px rgba(16,185,129,.6); }
.dot--red   { background: #ef4444; }

/* Bottom action button */
.action-bottom-btn {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: .5rem;
  padding: .75rem 1rem;
  background: linear-gradient(135deg,#ef4444,#dc2626);
  border: none;
  border-radius: .75rem;
  color: #fff;
  font-size: .8rem;
  font-weight: 800;
  cursor: pointer;
  transition: filter .15s ease, transform .08s ease;
}
.action-bottom-btn:hover  { filter: brightness(1.1); }
.action-bottom-btn:active { transform: scale(.97); }

/* ══ Main view area ══════════════════════════════════════════════════════════ */
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
  height: 100%;
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

.view-fade-enter-active, .view-fade-leave-active { transition: opacity .2s ease, transform .2s ease; }
.view-fade-enter-from { opacity: 0; transform: translateX(12px); }
.view-fade-leave-to   { opacity: 0; transform: translateX(-12px); }

/* ══ KPI Grid ════════════════════════════════════════════════════════════════ */
.kpi-grid {
  display: grid;
  gap: .85rem;
  flex-shrink: 0;
}

/* ══ Chart card ══════════════════════════════════════════════════════════════ */
.chart-card {
  background: #1e293b;
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 1rem;
  padding: 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: .75rem;
  overflow: hidden;
}
.card-hdr { display: flex; align-items: center; gap: .65rem; flex-shrink: 0; }
.card-hdr .material-symbols-rounded { font-size: 1.3rem; }
.card-hdr-title { font-size: .88rem; font-weight: 800; color: #f1f5f9; }
.card-hdr-sub   { font-size: .62rem; color: #64748b; }
.badge {
  background: rgba(99,102,241,.15);
  border: 1px solid rgba(99,102,241,.25);
  color: #a5b4fc;
  font-size: .6rem;
  font-weight: 700;
  padding: .15rem .5rem;
  border-radius: 999px;
}
.badge--ok   { background: rgba(16,185,129,.15); border-color: rgba(16,185,129,.3); color: #34d399; }
.badge--warn { background: rgba(245,158,11,.15); border-color: rgba(245,158,11,.3); color: #fbbf24; }

/* ══ Table ═══════════════════════════════════════════════════════════════════ */
.table-scroll { flex: 1; overflow-y: auto; min-height: 0; }
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: .8rem;
}
.data-table th, .data-table td {
  padding: .65rem .75rem;
  border-bottom: 1px solid rgba(255,255,255,.05);
  text-align: left;
}
.data-table th {
  background: #0f172a;
  color: #64748b;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .06em;
  font-size: .65rem;
  position: sticky; top: 0; z-index: 1;
}
.data-table tbody tr:hover td { background: rgba(255,255,255,.03); }
.row-error td { background: rgba(239,68,68,.06) !important; }

.num       { text-align: right; font-variant-numeric: tabular-nums; }
.bold      { font-weight: 700; }
.font-mono { font-variant-numeric: tabular-nums; }
.val-main   { color: #f1f5f9; font-weight: 700; font-size: .9rem; }
.val-purple { color: #c084fc; }
.val-green  { color: #34d399; }
.val-red    { color: #f87171; }
.val-muted  { color: #94a3b8; }
.icon-inline { font-size: .9rem !important; vertical-align: middle; margin-right: .3rem; }

.row-badge {
  display: inline-block;
  padding: .12rem .5rem;
  border-radius: .3rem;
  font-size: .6rem;
  font-weight: 800;
  text-transform: uppercase;
}
.row-badge--green  { background: rgba(16,185,129,.15);  color: #34d399; }
.row-badge--red    { background: rgba(239,68,68,.15);   color: #f87171; }
.row-badge--yellow { background: rgba(245,158,11,.15);  color: #fbbf24; }
.row-badge--neutral{ background: rgba(100,116,139,.15); color: #94a3b8; }

.chart-legend { display: flex; gap: 1rem; flex-shrink: 0; }
.leg-item { display: flex; align-items: center; gap: .35rem; font-size: .65rem; color: #64748b; }
.leg-dot  { width: .5rem; height: .5rem; border-radius: 50%; flex-shrink: 0; }

/* ══ Roster view ═════════════════════════════════════════════════════════════ */
.employee-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 1rem;
  flex: 1;
  min-height: 0;
}

.operator-list {
  display: flex;
  flex-direction: column;
  gap: .5rem;
  overflow-y: auto;
  background: #1e293b;
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 1rem;
  padding: .85rem .75rem;
}

.search-wrap { position: relative; flex-shrink: 0; margin-bottom: .25rem; }
.search-icon {
  position: absolute; left: .6rem; top: 50%;
  transform: translateY(-50%); font-size: 1rem; color: #475569;
}
.search-input {
  width: 100%; background: #0f172a;
  border: 1px solid rgba(255,255,255,.08); border-radius: .55rem;
  padding: .55rem .75rem .55rem 2.2rem;
  font-size: .8rem; color: #e2e8f0; outline: none; font-family: inherit;
}
.search-input:focus { border-color: rgba(99,102,241,.4); }
.search-input::placeholder { color: #334155; }

.op-card {
  display: flex; align-items: center; gap: .65rem; padding: .65rem;
  border-radius: .65rem; border: 1px solid rgba(255,255,255,.05);
  background: #0f172a; cursor: pointer; text-align: left;
  transition: all .15s ease; -webkit-tap-highlight-color: transparent;
}
.op-card:hover { border-color: rgba(255,255,255,.1); background: rgba(255,255,255,.03); }
.op-card--active { background: rgba(99,102,241,.15); border-color: rgba(99,102,241,.4); }

.op-info { flex: 1; min-width: 0; }
.op-name-sm  { font-size: .82rem; font-weight: 700; color: #f1f5f9; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.op-role-sm  { font-size: .62rem; color: #64748b; margin: 0; }
.empty-note  { font-size: .75rem; color: #334155; text-align: center; padding: 1rem 0; }

.profile-area { flex: 1; min-width: 0; overflow-y: auto; }
.profile-fade-enter-active, .profile-fade-leave-active { transition: opacity .18s ease, transform .18s ease; }
.profile-fade-enter-from { opacity: 0; transform: translateY(8px); }
.profile-fade-leave-to   { opacity: 0; }

.profile-card {
  background: #1e293b; border: 1px solid rgba(255,255,255,.07);
  border-radius: 1rem; padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem;
  min-height: 100%;
}
.profile-hdr { display: flex; align-items: center; gap: .85rem; flex-shrink: 0; }
.profile-name { font-size: 1.2rem; font-weight: 900; color: #f1f5f9; margin: 0; }
.profile-role-label { font-size: .72rem; color: #94a3b8; margin: 0; }
.profile-badge {
  margin-left: auto; padding: .25rem .65rem; border-radius: 999px;
  font-size: .65rem; font-weight: 700;
}

.metric-section {
  background: #0f172a; border: 1px solid rgba(255,255,255,.05);
  border-radius: .75rem; padding: .9rem 1rem;
  display: flex; flex-direction: column; gap: .65rem; flex-shrink: 0;
}
.section-title {
  display: flex; align-items: center; gap: .4rem;
  font-size: .7rem; font-weight: 700; color: #64748b;
  text-transform: uppercase; letter-spacing: .08em; margin: 0;
}
.section-title .material-symbols-rounded { font-size: 1rem; color: #6366f1; }
.metric-row { display: flex; gap: .85rem; }
.metric-item { flex: 1; display: flex; flex-direction: column; gap: .2rem; }
.m-label { font-size: .62rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
.m-value { font-size: 1.1rem; font-weight: 800; color: #f1f5f9; }
.m-value--good { color: #34d399; }
.m-value--bad  { color: #f87171; }

.alert-section { display: flex; flex-direction: column; gap: .5rem; }
.alert-item {
  display: flex; align-items: flex-start; gap: .65rem;
  padding: .65rem .85rem; border-radius: .5rem;
  border-left: 3px solid;
}
.alert-item--info { background: rgba(99,102,241,.08); border-color: #6366f1; }
.alert-item--warn { background: rgba(245,158,11,.08); border-color: #f59e0b; }
.alert-icon { font-size: 1.1rem; margin-top: .05rem; }
.alert-item--info .alert-icon { color: #818cf8; }
.alert-item--warn .alert-icon { color: #fbbf24; }
.alert-body strong { display: block; font-size: .68rem; font-weight: 800; color: #e2e8f0; margin-bottom: .15rem; }
.alert-body p { font-size: .75rem; color: #94a3b8; margin: 0; }

.shift-actions { display: flex; gap: .85rem; margin-top: auto; }
.shift-btn {
  flex: 1; display: flex; align-items: center; justify-content: center;
  gap: .5rem; height: 3.75rem; border-radius: .75rem;
  font-size: .9rem; font-weight: 800; letter-spacing: .04em;
  border: none; cursor: pointer; transition: filter .15s, transform .08s;
  color: #fff;
}
.shift-btn:hover  { filter: brightness(1.1); }
.shift-btn:active { transform: scale(.97); }
.shift-btn--break { background: linear-gradient(135deg,#6366f1,#8b5cf6); }
.shift-btn--end   { background: linear-gradient(135deg,#ef4444,#dc2626); }

.profile-empty {
  height: 100%; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 1rem;
  color: #334155;
}
.pe-icon { font-size: 4rem !important; }
.profile-empty p { font-size: .9rem; }

/* ══ Financials layout ═══════════════════════════════════════════════════════ */
.fin-layout {
  display: flex;
  gap: 1rem;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.fin-actions-col {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: .75rem;
}
.fin-action-btn {
  width: 100%; min-height: 4.5rem; border-radius: .85rem;
  border: none; cursor: pointer;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: .25rem; font-size: .85rem; font-weight: 800; letter-spacing: .03em;
  padding: .75rem 1rem;
  transition: filter .15s, transform .08s;
  color: #fff;
}
.fin-action-btn .material-symbols-rounded { font-size: 1.5rem; }
.fin-action-btn:hover  { filter: brightness(1.1); }
.fin-action-btn:active { transform: scale(.97); }
.fin-action-btn--primary   { background: linear-gradient(135deg,#10b981,#059669); }
.fin-action-btn--secondary { background: #1e293b; border: 1px solid rgba(255,255,255,.1); color: #f1f5f9; }

.badge-btn {
  display: flex; align-items: center; gap: .3rem; margin-left: auto;
  background: rgba(99,102,241,.12); border: 1px solid rgba(99,102,241,.25);
  color: #a5b4fc; font-size: .7rem; font-weight: 700;
  padding: .25rem .65rem; border-radius: .4rem; cursor: pointer;
  transition: background .15s;
}
.badge-btn:hover { background: rgba(99,102,241,.22); }

/* ══ Modal Overlay & Card ═════════════════════════════════════════════════════ */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(15,23,42,0.8);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000; padding: 1rem;
}
.modal-card {
  background: #1e293b;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 1.25rem;
  padding: 1.5rem;
  width: 100%; max-width: 440px;
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);
  animation: modalPop 0.2s ease;
}
@keyframes modalPop {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
.modal-hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.25rem; }
.modal-title { font-size: 1.1rem; font-weight: 800; color: #f8fafc; margin: 0; }
.modal-close { background: transparent; border: none; color: #64748b; cursor: pointer; padding: 0.25rem; }
.modal-close:hover { color: #cbd5e1; }
.modal-sub { font-size: 0.75rem; color: #94a3b8; margin: 0.25rem 0 0.75rem 0; }

.form-label { display: block; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #94a3b8; margin-bottom: 0.35rem; }
.form-input {
  width: 100%; background: #0f172a;
  border: 1px solid rgba(255,255,255,0.1); border-radius: 0.6rem;
  padding: 0.75rem 1rem; font-size: 0.95rem; color: #fff;
  outline: none; font-family: inherit; box-sizing: border-box;
}
.form-input:focus { border-color: #6366f1; }

.modal-actions { display: flex; gap: 0.75rem; justify-content: flex-end; }
.btn-cancel {
  padding: 0.65rem 1.25rem; border-radius: 0.6rem;
  background: transparent; border: 1px solid rgba(255,255,255,0.1);
  color: #94a3b8; font-weight: 700; font-size: 0.85rem; cursor: pointer;
}
.btn-cancel:hover { background: rgba(255,255,255,0.05); color: #e2e8f0; }
.btn-confirm {
  padding: 0.65rem 1.25rem; border-radius: 0.6rem;
  background: #10b981; border: none;
  color: #fff; font-weight: 800; font-size: 0.85rem; cursor: pointer;
  transition: all 0.15s;
}
.btn-confirm:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-confirm:not(:disabled):hover { background: #059669; }

/* ══ Toast ═══════════════════════════════════════════════════════════════════ */
.toast-msg {
  position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%);
  background: rgba(16,185,129,.9); color: #fff;
  border-radius: .65rem; padding: .75rem 1.5rem;
  font-size: .9rem; font-weight: 700;
  display: flex; align-items: center; gap: .4rem;
  backdrop-filter: blur(8px); z-index: 999;
}
.toast-enter-active, .toast-leave-active { transition: all .25s ease; }
.toast-enter-from, .toast-leave-to       { opacity: 0; transform: translate(-50%, 1rem); }

/* ── Mobile Responsive ────────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .emp-root {
    flex-direction: column;
    height: auto;
    min-height: 100%;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-y;
    padding-bottom: 4rem;
  }
  .view-nav {
    width: 100%;
    flex-direction: row;
    overflow-x: auto;
    padding: 0.75rem 1rem;
    border-right: none;
    border-bottom: 1px solid rgba(255,255,255,.06);
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
    gap: 0.5rem;
  }
  .view-nav::-webkit-scrollbar { display: none; }
  .nav-heading { display: none; }
  .nav-tab {
    white-space: nowrap;
    flex-shrink: 0;
    padding: 0.6rem 0.85rem;
    touch-action: pan-y;
  }
  .selected-op-block { display: none; }
  .action-bottom-btn { display: none; }
  .view-area {
    overflow: visible;
    height: auto;
    padding: 1rem;
  }
  .view-panel {
    overflow: visible;
    height: auto;
    padding: 0;
  }
  .operator-list {
    width: 100% !important;
    max-height: 200px !important;
    margin-bottom: 1rem;
  }
  .profile-area {
    width: 100%;
  }
  .shift-actions {
    flex-direction: column;
  }
  .shift-btn, .fin-action-btn, .op-card {
    touch-action: pan-y;
  }
  .fin-actions-col {
    width: 100%;
  }
}
</style>
