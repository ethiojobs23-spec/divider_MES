<template>
  <AppLayout>
    <!-- Header Bar -->
    <div class="view-area">
      <!-- Header / KPI Row -->
      <div class="view-panel" style="flex: none; padding-bottom: 0; min-height: auto;">
        <div class="panel-header flex justify-between items-start flex-wrap gap-2">
          <div>
            <div class="flex items-center gap-2">
              <h2 class="panel-title">Weekly Payroll Dashboard</h2>
              <span 
                class="text-[0.65rem] font-black uppercase px-2 py-0.5 rounded-full"
                :style="{
                  background: mesStore.weekStatus?.isCurrent ? 'rgba(16,185,129,0.15)' : mesStore.weekStatus?.isPast ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.15)',
                  color: mesStore.weekStatus?.isCurrent ? '#34d399' : mesStore.weekStatus?.isPast ? '#fbbf24' : '#a5b4fc',
                  border: '1px solid ' + (mesStore.weekStatus?.isCurrent ? 'rgba(16,185,129,0.3)' : mesStore.weekStatus?.isPast ? 'rgba(245,158,11,0.3)' : 'rgba(99,102,241,0.3)')
                }"
              >
                ● {{ mesStore.weekStatus?.label }}
              </span>
            </div>
            <p class="panel-sub">{{ currentWeek }} ({{ mesStore.weekStatus?.dateRange }}) &bull; Auto-aggregated from production & HR ledger</p>
          </div>
          <div class="flex items-center gap-1.5 bg-slate-800/80 p-1.5 rounded-xl border border-white/10">
            <button 
              @click="mesStore.shiftProductionWeek(-1)"
              class="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 flex items-center justify-center cursor-pointer transition-all active:scale-95"
              title="Previous Week"
            >
              <span class="material-symbols-rounded text-sm">chevron_left</span>
            </button>
            <span class="text-xs font-mono font-bold text-slate-200 px-2">{{ currentWeek }}</span>
            <button 
              @click="mesStore.shiftProductionWeek(1)"
              class="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 flex items-center justify-center cursor-pointer transition-all active:scale-95"
              title="Next Week"
            >
              <span class="material-symbols-rounded text-sm">chevron_right</span>
            </button>
            <button 
              v-if="!mesStore.weekStatus?.isCurrent"
              @click="mesStore.resetToCurrentWeek()"
              class="px-2.5 py-1 rounded-lg text-[0.7rem] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 transition-all flex items-center gap-1 cursor-pointer active:scale-95 ml-1"
              title="Return to current active calendar week"
            >
              <span class="material-symbols-rounded text-xs">restart_alt</span>
              Live Week
            </button>

            <button class="sync-btn cursor-pointer ml-1" :disabled="isSyncing" @click="manualSync" title="Sync payroll data now">
              <span class="material-symbols-rounded" :class="{ 'spin-icon': isSyncing }">sync</span>
              <span>{{ isSyncing ? 'Syncing...' : 'Sync' }}</span>
            </button>
          </div>
        </div>

        <div class="kpi-grid grid grid-cols-1 md:grid-cols-3 gap-3 shrink-0">
          <AnalyticsDataCard
            title="Total Production"
            :value="mesStore.weeklyAggregation.TOTAL + ' pcs'"
            icon="inventory_2"
            icon-bg="rgba(99,102,241,.15)"
            icon-color="#a5b4fc"
          />
          <AnalyticsDataCard
            title="Total Deductions"
            :value="totalAllDeductions.toFixed(2) + ' ETB'"
            icon="money_off"
            icon-bg="rgba(245,158,11,.15)"
            icon-color="#fbbf24"
            :trend-up-is-bad="true"
          />
          <AnalyticsDataCard
            title="Total Net Payouts"
            :value="totalNetPayouts.toFixed(2) + ' ETB'"
            icon="account_balance_wallet"
            icon-bg="rgba(16,185,129,.15)"
            icon-color="#34d399"
          />
        </div>
      </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 md:px-8 pb-4">
      <!-- ── Physical Cash Requirements ─────────────────────────────────── -->
      <div class="cash-denom-card" v-if="cashDenominations.totalCash > 0" style="margin: 0; height: 100%;">
        <div class="cash-denom-header">
          <div class="cash-denom-title">
            <span class="material-symbols-rounded" style="color:#fbbf24;font-size:1.2rem">payments</span>
            Physical Cash Requirements
            <span class="cash-week-badge">{{ currentWeek }}</span>
          </div>
          <div class="cash-denom-meta">
            <span class="cash-total-label">Total to Withdraw:</span>
            <span class="cash-total-value">{{ cashDenominations.totalCash.toFixed(2) }} ETB</span>
            <button class="btn-bank-slip" @click="printBankSlip">
              <span class="material-symbols-rounded" style="font-size:1rem">print</span>
              Print Bank Slip
            </button>
          </div>
        </div>
        <div class="denom-table-wrap w-full overflow-x-auto">
          <table class="denom-table w-full min-w-[600px]">
            <thead>
              <tr>
                <th>Note</th>
                <th>Count</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in cashDenominations.breakdown"
                :key="row.denom"
                class="denom-row"
                :class="row.count > 0 ? 'denom-row--active' : 'denom-row--zero'"
              >
                <td class="denom-note"><span class="note-chip">{{ row.denom }} ETB</span></td>
                <td class="denom-count">× {{ row.count }}</td>
                <td class="denom-subtotal">{{ (row.denom * row.count).toFixed(2) }} ETB</td>
              </tr>
            </tbody>
          </table>
          <div class="approved-workers-note">
            <span class="material-symbols-rounded" style="font-size:.9rem;color:#34d399">group</span>
            {{ cashDenominations.approvedCount }} approved payout{{ cashDenominations.approvedCount !== 1 ? 's' : '' }} this week
          </div>
        </div>
      </div>

      <!-- ── Digital Disbursements ──────────────────────────────────────── -->
      <div class="chart-card digital-disbursements-card" v-if="digitalDisbursementsCount > 0" style="margin: 0; height: 100%;">
        <div class="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
          <div class="flex items-center gap-2">
            <span class="material-symbols-rounded text-blue-400 text-xl">account_balance</span>
            <span class="text-lg font-bold text-white">Digital Disbursements</span>
          </div>
          <span class="bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-xs font-bold">{{ currentWeek }}</span>
        </div>
        <div class="flex flex-col flex-1 justify-center">
          <div class="text-center mb-6">
            <p class="text-slate-300 font-medium text-sm">{{ digitalSummaryText }}</p>
          </div>
          <div class="mt-auto">
            <button class="bg-blue-600 hover:bg-blue-500 text-white font-black py-4 px-6 rounded-xl flex items-center justify-center gap-3 w-full shadow-lg shadow-blue-600/30 transition-all active:scale-95 uppercase tracking-widest text-sm" @click="generateDigitalPayrollCSV">
              <span class="material-symbols-rounded">download</span>
              EXPORT CBE/TELEBIRR CSV
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex items-center gap-4 sm:gap-6 px-4 sm:px-8 py-3 bg-slate-800 border-b border-indigo-500/20 overflow-x-auto">
      <button 
        @click="activeTab = 'pending'" 
        class="pb-1 text-sm font-bold tracking-wide uppercase transition-colors duration-200 border-b-2 whitespace-nowrap flex-shrink-0"
        :class="activeTab === 'pending' ? 'text-indigo-400 border-indigo-400' : 'text-slate-400 border-transparent hover:text-slate-300'"
      >
        Pending Payroll
      </button>
      <button 
        @click="activeTab = 'history'" 
        class="pb-1 text-sm font-bold tracking-wide uppercase transition-colors duration-200 border-b-2 whitespace-nowrap flex-shrink-0"
        :class="activeTab === 'history' ? 'text-indigo-400 border-indigo-400' : 'text-slate-400 border-transparent hover:text-slate-300'"
      >
        Payment History
      </button>
    </div>

    <section class="view-panel" v-show="activeTab === 'pending'">
      <div class="employee-layout">
        <!-- Left: Worker List -->
        <div class="operator-list max-h-64 md:max-h-none">
           <div 
              v-for="worker in payrollStore.weeklyPayrollSummary" 
              :key="worker.id" 
              class="op-card" 
              :class="{ 'op-card--active': selectedWorkerId === worker.id }"
              @click="selectedWorkerId = worker.id"
           >
              <OperatorAvatar :avatar="worker.avatar" :name="worker.name" :color="worker.color" size="sm" />
              <div class="op-info">
                <p class="op-name-sm">{{ worker.name }}</p>
                <p class="op-role-sm">{{ worker.role }}</p>
              </div>
              <div class="worker-status-amount">
                <p class="worker-amount">{{ worker.netPayout.toFixed(2) }} ETB</p>
                <span class="row-badge" :class="worker.payoutStatus.status === 'approved' ? 'row-badge--green' : (worker.payoutStatus.status === 'held' ? 'row-badge--red' : 'row-badge--yellow')">
                  {{ worker.payoutStatus.status.toUpperCase() }}
                </span>
              </div>
           </div>
        </div>

        <!-- Right: Detailed Breakdown -->
        <div class="profile-area" v-if="selectedWorker">
           <div class="detail-header">
             <div>
               <h2 class="panel-title">{{ selectedWorker.name }} - Payroll Breakdown</h2>
               <p v-if="selectedWorker.payoutStatus.reason" class="hold-reason-text">Reason: {{ selectedWorker.payoutStatus.reason }}</p>
             </div>
             <span class="status-stamp" :class="selectedWorker.payoutStatus.status">
               {{ selectedWorker.payoutStatus.status === 'approved' ? 'PAID ✓' : (selectedWorker.payoutStatus.status === 'held' ? 'HELD ✋' : 'PENDING ⏳') }}
             </span>
           </div>
           
           <div class="breakdown-content" :class="{ 'is-locked': selectedWorker.payoutStatus.status === 'approved' }">

            <!-- Shift Submissions Breakdown -->
              <div class="chart-card" v-if="selectedWorkerProfile?.isPieceRate">
              <h3>Shift Submissions & Piece-Rate</h3>
              <div v-if="shiftBreakdown.length" class="shift-rows">
                <div
                  v-for="shift in shiftBreakdown"
                  :key="shift.date"
                  class="shift-row"
                  :class="'shift-row--' + shift.status"
                >
                  <div class="shift-row-header" @click="toggleShift(shift.date)">
                    <div class="shift-date">
                      <span class="material-symbols-rounded" style="font-size:1rem">calendar_today</span>
                      {{ new Date(shift.date).toLocaleDateString('en-GB', { weekday:'short', day:'2-digit', month:'short'}) }}
                    </div>
                    <div class="shift-summary-pills">
                      <span class="pill pill--green">{{ shift.shiftGood }} pcs good</span>
                      <span v-if="shift.shiftWaste" class="pill pill--red">{{ shift.shiftWaste }} waste</span>
                      <span class="pill pill--yellow">ETB {{ shift.shiftEarnings.toFixed(2) }}</span>
                    </div>
                    <span class="shift-status-badge" :class="'ssb--' + shift.status">
                      {{ shift.status === 'raw-ledger' ? 'RAW LOGS' : shift.status.toUpperCase() }}
                    </span>
                    <span class="material-symbols-rounded" style="font-size:1rem; color:#64748b">
                      {{ expandedShift === shift.date ? 'expand_less' : 'expand_more' }}
                    </span>
                  </div>
                  <!-- Entry detail rows -->
                  <div v-if="expandedShift === shift.date" class="shift-entries">
                    <!-- overflow-x-auto so wide table scrolls only inside, never breaks layout -->
                    <div class="w-full overflow-x-auto">
                    <table class="entry-mini-table">
                      <thead><tr><th>Type</th><th>Placement</th><th>Size</th><th>Good Pcs</th><th>Rate</th><th class="tar">Earnings</th></tr></thead>
                      <tbody>
                        <tr v-for="(e, i) in shift.entries" :key="i">
                          <td>
                            <span v-if="e.workCategory === 'TIME'" class="font-bold text-slate-300">HOURLY</span>
                            <span v-else-if="e.workCategory === 'C'" class="font-bold text-emerald-400">WOOD PREP</span>
                            <span v-else class="font-bold">{{ e.dividerType === 'Other' ? 'Custom' : e.dividerType }}</span>
                          </td>
                          <td>
                            <span v-if="e.workCategory === 'MFG' || e.workCategory === 'TIME'" class="text-slate-500">—</span>
                            <span v-else>{{ e.placement || '—' }}</span>
                          </td>
                          <td>
                            <span v-if="e.workCategory === 'MFG' || e.workCategory === 'TIME'" class="text-slate-500">—</span>
                            <span v-else>{{ e.size || '—' }}</span>
                          </td>
                          <td style="color:#34d399"><strong>{{ e.workCategory === 'TIME' ? (e.hoursWorked || 0) + ' hrs' : (e.good || e.goodProduction || 0) }}</strong></td>
                          <td style="color:#94a3b8">{{ e.rate }} {{ e.workCategory === 'TIME' ? 'ETB/hr' : 'ETB/pc' }}</td>
                          <td class="tar" style="color:#fbbf24"><strong>{{ (e.earnings || 0).toFixed(2) }}</strong></td>
                        </tr>
                      </tbody>
                    </table>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="no-shifts-note">
                <span class="material-symbols-rounded">info</span>
                No shift submissions found. Piece-rate calculated from raw production ledger.
              </div>

              <div class="calc-row math-result" style="margin-top:1rem">
                <span>Total Piece-Rate Earnings</span>
                <span>{{ selectedWorker.grossPieceRate.toFixed(2) }} ETB</span>
              </div>
            </div>

            <!-- Attendance & Hourly -->
              <div class="chart-card" v-if="selectedWorkerProfile?.isHourly">
              <h3>Attendance &amp; Hourly Pay</h3>
              <div class="calc-row">
                <span>Days Attended</span>
                <span><strong style="color:#fbbf24">{{ selectedWorker.daysAttended }}</strong> / 6 days</span>
              </div>
              <div class="calc-row">
                <span>Attendance Factor</span>
                <span>{{ (selectedWorker.attendanceFactor * 100).toFixed(0) }}%</span>
              </div>
              <div class="calc-row">
                <span>Hourly Rate</span>
                <span>ETB {{ payrollStore.getWorkerProfile(selectedWorker.id).hourlyRate }}/hr × {{ selectedWorker.daysAttended * 8 }}h</span>
              </div>
              <div class="calc-row math-result">
                <span>Gross Hourly Pay</span>
                <span>{{ selectedWorker.grossHourly.toFixed(2) }} ETB</span>
              </div>
            </div>

            <!-- Summary -->
              <div class="chart-card">
              <h3>Earnings Summary</h3>
              <div class="calc-row" v-if="selectedWorkerProfile?.isPieceRate">
                <span>Piece-Rate Subtotal</span>
                <span>{{ selectedWorker.grossPieceRate.toFixed(2) }} ETB</span>
              </div>
              <div class="calc-row" v-if="selectedWorkerProfile?.isHourly">
                <span>Hourly Subtotal</span>
                <span>{{ selectedWorker.grossHourly.toFixed(2) }} ETB</span>
              </div>
              <div class="calc-row math-result">
                <span>Gross Earnings</span>
                <span>{{ selectedWorker.grossEarnings.toFixed(2) }} ETB</span>
              </div>
            </div>

              <div class="chart-card deductions">
              <h3>
                <span class="material-symbols-rounded" style="font-size:.9rem;vertical-align:middle;margin-right:.3rem;color:#f87171">account_balance</span>
                Loan Installments
              </h3>

              <!-- Per-loan progress lines -->
              <template v-if="selectedWorker.loanBreakdown && selectedWorker.loanBreakdown.length">
                <div v-for="lb in selectedWorker.loanBreakdown" :key="lb.loanId" class="loan-progress-block">
                  <div class="lp-header">
                    <span class="lp-label">
                      Payment {{ lb.totalInstallments - lb.weeksRemaining + 1 }} of {{ lb.totalInstallments }}
                    </span>
                    <span class="lp-installment deduction-val">
                      - {{ lb.deduction.toFixed(2) }} ETB / week
                    </span>
                  </div>
                  <div class="lp-track">
                    <div
                      class="lp-fill"
                      :style="{ width: (((lb.totalDebt - lb.remaining) / lb.totalDebt) * 100).toFixed(1) + '%' }"
                      :class="lb.remaining <= lb.deduction ? 'lp-fill--done' : ''"
                    ></div>
                  </div>
                  <div class="lp-footer">
                    <span class="lp-repaid">{{ (lb.totalDebt - lb.remaining).toFixed(2) }} ETB repaid</span>
                    <span class="lp-remaining">{{ lb.remaining.toFixed(2) }} ETB left</span>
                  </div>
                </div>
              </template>
              <div v-else class="calc-row" style="color:#64748b;font-size:.78rem;">
                No active installment loans this week
              </div>

              <div class="calc-divider-thin"></div>
              <div class="calc-row" style="font-weight:700;">
                <span>Total This-Week Deduction</span>
                <span class="deduction-val">- {{ selectedWorker.totalDeduction.toFixed(2) }} ETB</span>
              </div>
            </div>

            <!-- ── Bonus Row (card + keypad side-by-side) ─────────────── -->
            <div class="bonus-row" :class="{ 'bonus-locked': selectedWorker.payoutStatus.status === 'approved' }">

              <!-- Left: Bonus Card -->
              <div class="chart-card bonus-card">
                <h3>
                  <span class="material-symbols-rounded" style="font-size:1rem;vertical-align:middle;color:#fbbf24;margin-right:.35rem">workspace_premium</span>
                  Performance Bonus
                </h3>
                <div class="bonus-body">
                  <div class="bonus-input-row">
                    <label class="bonus-label">Bonus Amount (ETB)</label>
                    <div class="bonus-input-wrap">
                      <span class="bonus-prefix">+ ETB</span>
                      <input
                        class="bonus-input"
                        type="number"
                        min="0"
                        step="10"
                        placeholder="0.00"
                        :disabled="selectedWorker.payoutStatus.status === 'approved' || !isPayoutDayAllowed"
                        :value="bonusInputDisplay"
                        @input="onBonusAmountInput($event)"
                        @focus="bonusInputActive = true"
                        @blur="bonusInputActive = false"
                      />
                    </div>
                  </div>
                  <div class="bonus-input-row">
                    <label class="bonus-label">Reason / Note</label>
                    <input
                      class="bonus-reason-input"
                      type="text"
                      placeholder="e.g. Perfect attendance, hit 5,000 pcs target…"
                      :disabled="selectedWorker.payoutStatus.status === 'approved' || !isPayoutDayAllowed"
                      :value="currentBonus.reason || ''"
                      @input="onBonusReasonInput($event)"
                    />
                  </div>
                  <p v-if="currentBonus.amount > 0" class="bonus-preview">
                    🏆 <strong>+{{ Number(currentBonus.amount).toFixed(2) }} ETB</strong> bonus will be added to net payout
                  </p>
                </div>
              </div>

              <!-- Right: Numeric Keypad -->
              <div class="bonus-keypad">
                <div class="keypad-display">
                  <span class="keypad-prefix">ETB</span>
                  <span class="keypad-value">{{ bonusInputDisplay || '0' }}</span>
                </div>
                <div class="keypad-grid">
                  <button v-for="k in ['7','8','9','4','5','6','1','2','3']" :key="k"
                    class="kp-btn" @click="keypadPress(k)">{{ k }}</button>
                  <button class="kp-btn kp-btn--wide" @click="keypadPress('0')">0</button>
                  <button class="kp-btn kp-btn--dot" @click="keypadPress('.')">.</button>
                  <button class="kp-btn kp-btn--back" @click="keypadBackspace()">
                    <span class="material-symbols-rounded" style="font-size:1.1rem">backspace</span>
                  </button>
                  <button class="kp-btn kp-btn--clear" @click="keypadClear()">CLR</button>
                  <button class="kp-btn kp-btn--apply" @click="keypadApply()">
                    <span class="material-symbols-rounded" style="font-size:1.1rem">check</span>
                    SET
                  </button>
                </div>
              </div>

            </div>


              <div class="chart-card net-payout">
              <h3>Net Payout</h3>
              <div class="net-amount">{{ (selectedWorker.netPayout + (currentBonus.amount || 0)).toFixed(2) }} ETB</div>
              <p v-if="currentBonus.amount > 0" class="net-bonus-note">
                Includes {{ Number(currentBonus.amount).toFixed(2) }} ETB bonus
              </p>
              
              <div class="payment-method-info" style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1); font-size: 0.95rem;">
                <p style="margin: 0; color: #cbd5e1; display: flex; justify-content: space-between;">
                  <span>Payment Method:</span>
                  <strong style="color: #fff">{{ selectedWorkerProfile?.paymentMethod || 'Cash' }}</strong>
                </p>
                <p v-if="selectedWorkerProfile?.paymentMethod !== 'Cash'" style="margin: 0.5rem 0 0; color: #cbd5e1; display: flex; justify-content: space-between;">
                  <span>Account:</span>
                  <strong style="color: #6366f1">{{ selectedWorkerProfile?.accountInfo || 'N/A' }}</strong>
                </p>
              </div>
            </div>
         </div>

         <!-- Actions -->
         <div class="action-buttons">
            <button 
              class="btn-massive btn-approve w-full md:w-auto"
              style="min-height: 3.5rem;"
              :disabled="selectedWorker.payoutStatus.status === 'approved' || !isPayoutDayAllowed"
              @click="confirmApprove(selectedWorker)"
            >
              {{ selectedWorker.payoutStatus.status === 'approved' ? 'PAID \u2714' : (isPayoutDayAllowed ? 'APPROVE & LOG PAYMENT' : "NOT PAYOUT DAY") }}
            </button>
            <button 
              class="btn-massive btn-hold w-full md:w-auto"
              style="min-height: 3.5rem;"
              :disabled="selectedWorker.payoutStatus.status === 'approved' || !isPayoutDayAllowed"
              @click="openHoldMenu(selectedWorker)"
            >
              HOLD / DISPUTE
            </button>
         </div>
      </div>
      <div v-else class="empty-state">
         <span class="material-symbols-rounded empty-icon">touch_app</span>
         <p>Select a worker to view breakdown</p>
      </div>
      </div>
    </section>

    <!-- Payment History View -->
    <div class="history-view w-full flex-1 min-h-0 overflow-y-auto p-4 md:p-8 bg-slate-900" v-show="activeTab === 'history'">
      <div class="max-w-6xl mx-auto space-y-6">
        <!-- Header Bar with Multi-Filters -->
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 class="text-2xl font-black text-slate-100 tracking-tight">Past Payroll Settlements</h2>
            <p class="text-xs text-slate-400 mt-1">Audit log of all payouts: who was paid, amount, purpose breakdown, and payment method (Cash / Telebirr / CBE)</p>
          </div>
          
          <div class="flex flex-wrap items-center gap-2.5">
            <!-- Search Worker / Purpose -->
            <div class="relative min-w-[170px]">
              <span class="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
              <input
                v-model="historySearchQuery"
                type="text"
                placeholder="Search name, account..."
                class="w-full bg-slate-800 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 placeholder-slate-500"
              />
            </div>
            
            <!-- Week Filter -->
            <select
              v-model="historyWeekFilter"
              class="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Weeks</option>
              <option v-for="w in availableHistoryWeeks" :key="w" :value="w">{{ w }}</option>
            </select>

            <!-- Payment Method Filter -->
            <select
              v-model="historyMethodFilter"
              class="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Payment Methods</option>
              <option value="Cash">💵 Cash</option>
              <option value="Telebirr">📱 Telebirr</option>
              <option value="CBE">🏦 CBE Bank</option>
            </select>

            <!-- Export CSV -->
            <button
              @click="exportHistoryCSV"
              :disabled="filteredPaymentHistory.length === 0"
              class="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export Payment History to CSV"
            >
              <span class="material-symbols-rounded text-sm">download</span>
              Export CSV
            </button>
          </div>
        </div>

        <!-- KPI Summary Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div class="bg-slate-800/80 border border-white/10 rounded-xl p-3.5 flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <span class="material-symbols-rounded text-xl">payments</span>
            </div>
            <div>
              <p class="text-[0.65rem] uppercase font-bold text-slate-400">Total Settled</p>
              <p class="text-base font-black text-emerald-400 font-mono">{{ totalHistoryPaid.toFixed(2) }} ETB</p>
            </div>
          </div>
          <div class="bg-slate-800/80 border border-white/10 rounded-xl p-3.5 flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <span class="material-symbols-rounded text-xl">payments</span>
            </div>
            <div>
              <p class="text-[0.65rem] uppercase font-bold text-slate-400">Cash Payouts</p>
              <p class="text-base font-black text-amber-300 font-mono">{{ totalCashHistoryPaid.toFixed(2) }} ETB</p>
            </div>
          </div>
          <div class="bg-slate-800/80 border border-white/10 rounded-xl p-3.5 flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
              <span class="material-symbols-rounded text-xl">smartphone</span>
            </div>
            <div>
              <p class="text-[0.65rem] uppercase font-bold text-slate-400">Digital (Telebirr/CBE)</p>
              <p class="text-base font-black text-cyan-300 font-mono">{{ totalDigitalHistoryPaid.toFixed(2) }} ETB</p>
            </div>
          </div>
          <div class="bg-slate-800/80 border border-white/10 rounded-xl p-3.5 flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
              <span class="material-symbols-rounded text-xl">group</span>
            </div>
            <div>
              <p class="text-[0.65rem] uppercase font-bold text-slate-400">Unique Payees</p>
              <p class="text-base font-black text-purple-300 font-mono">{{ uniqueHistoryPayeesCount }}</p>
            </div>
          </div>
        </div>

        <!-- Enhanced History Table -->
        <div class="bg-slate-800 border border-white/10 rounded-xl overflow-hidden shadow-xl">
          <div class="overflow-x-auto w-full">
            <table class="w-full text-left border-collapse min-w-full">
              <thead class="bg-slate-900/90 border-b border-white/10">
                <tr>
                  <th class="p-3.5 text-xs font-bold tracking-wider text-slate-400 uppercase">Date &amp; Period</th>
                  <th class="p-3.5 text-xs font-bold tracking-wider text-slate-400 uppercase">Employee Name</th>
                  <th class="p-3.5 text-xs font-bold tracking-wider text-slate-400 uppercase">How We Paid</th>
                  <th class="p-3.5 text-xs font-bold tracking-wider text-slate-400 uppercase">What We Paid For</th>
                  <th class="p-3.5 text-xs font-bold tracking-wider text-slate-400 uppercase text-right">How Much Paid</th>
                  <th class="p-3.5 text-xs font-bold tracking-wider text-slate-400 uppercase text-center">Slip / Receipt</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5 text-slate-200">
                <tr v-for="entry in filteredPaymentHistory" :key="entry.id" class="hover:bg-white/5 transition-colors">
                  <!-- Date & Period -->
                  <td class="p-3.5 text-xs text-slate-300">
                    <p class="font-mono font-bold">{{ (entry.timestamp || entry.transaction_date || '').split('T')[0] || '—' }}</p>
                    <span class="inline-block mt-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.2 rounded text-[0.65rem] font-mono font-bold">
                      {{ entry.week || 'W--' }}
                    </span>
                  </td>

                  <!-- Employee Name -->
                  <td class="p-3.5 text-sm font-bold text-slate-100">
                    <div class="flex items-center gap-2.5">
                      <OperatorAvatar 
                        :name="entry.workerName" 
                        :avatar="entry.operatorObj?.avatar" 
                        :color="entry.operatorObj?.color" 
                        size="sm" 
                      />
                      <div>
                        <p class="font-bold text-white">{{ entry.workerName }}</p>
                        <p class="text-[0.68rem] text-slate-400 font-normal">{{ entry.operatorObj?.role || 'Operator' }} &bull; #{{ entry.operator_id || '—' }}</p>
                      </div>
                    </div>
                  </td>

                  <!-- How We Paid (Method / Channel) -->
                  <td class="p-3.5 text-xs">
                    <!-- Cash Badge -->
                    <div v-if="entry.paymentMethod === 'Cash'" class="inline-flex items-center gap-1.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg font-bold">
                      <span class="material-symbols-rounded text-sm text-emerald-400">payments</span>
                      <span>Cash In-Hand</span>
                    </div>
                    <!-- Telebirr Badge -->
                    <div v-else-if="entry.paymentMethod === 'Telebirr'" class="inline-flex flex-col bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 px-2.5 py-1 rounded-lg">
                      <div class="flex items-center gap-1.5 font-bold">
                        <span class="material-symbols-rounded text-sm text-cyan-400">smartphone</span>
                        <span>Telebirr</span>
                      </div>
                      <span v-if="entry.accountInfo" class="text-[0.65rem] font-mono text-cyan-200/80 mt-0.5">{{ entry.accountInfo }}</span>
                    </div>
                    <!-- CBE Bank Badge -->
                    <div v-else-if="entry.paymentMethod === 'CBE'" class="inline-flex flex-col bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-2.5 py-1 rounded-lg">
                      <div class="flex items-center gap-1.5 font-bold">
                        <span class="material-symbols-rounded text-sm text-indigo-400">account_balance</span>
                        <span>CBE Bank</span>
                      </div>
                      <span v-if="entry.accountInfo" class="text-[0.65rem] font-mono text-indigo-200/80 mt-0.5">{{ entry.accountInfo }}</span>
                    </div>
                    <!-- Other / Fallback -->
                    <div v-else class="inline-flex items-center gap-1.5 bg-slate-700/50 text-slate-300 border border-white/10 px-2.5 py-1 rounded-lg font-bold">
                      <span class="material-symbols-rounded text-sm">wallet</span>
                      <span>{{ entry.paymentMethod || 'Cash' }}</span>
                    </div>
                  </td>

                  <!-- What We Paid For (Breakdown / Purpose) -->
                  <td class="p-3.5 text-xs">
                    <p class="font-bold text-slate-200">{{ entry.purpose }}</p>
                    <!-- Financial pills if available -->
                    <div class="flex flex-wrap items-center gap-1.5 mt-1 font-mono text-[0.68rem]">
                      <span v-if="entry.gross > 0 && entry.gross !== entry.netAmount" class="bg-slate-700/60 text-slate-300 px-2 py-0.5 rounded">
                        Gross: {{ entry.gross.toFixed(2) }} ETB
                      </span>
                      <span v-if="entry.deductions > 0" class="bg-red-500/15 text-red-300 border border-red-500/20 px-2 py-0.5 rounded">
                        Deductions: -{{ entry.deductions.toFixed(2) }} ETB
                      </span>
                      <span v-if="entry.bonus > 0" class="bg-amber-500/15 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded">
                        Bonus: +{{ entry.bonus.toFixed(2) }} ETB {{ entry.bonusReason ? `(${entry.bonusReason})` : '' }}
                      </span>
                    </div>
                  </td>

                  <!-- How Much Paid (Net Amount) -->
                  <td class="p-3.5 text-right font-mono">
                    <p class="text-sm font-black text-emerald-400">{{ entry.netAmount.toFixed(2) }} ETB</p>
                    <span class="text-[0.65rem] text-slate-400">Net Disbursed</span>
                  </td>

                  <!-- Slip / Receipt -->
                  <td class="p-3.5 text-center">
                    <button
                      @click="viewHistoricalReceipt(entry)"
                      class="px-2.5 py-1 rounded-lg text-xs font-bold bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 transition-all flex items-center gap-1 mx-auto cursor-pointer"
                      title="View & Print Official Receipt"
                    >
                      <span class="material-symbols-rounded text-sm text-indigo-400">receipt</span>
                      Slip
                    </button>
                  </td>
                </tr>
                <tr v-if="!filteredPaymentHistory.length">
                  <td colspan="6" class="p-12 text-center text-slate-400">
                    <span class="material-symbols-rounded text-4xl mb-2 text-slate-500 block">receipt_long</span>
                    <p class="font-bold text-slate-300">No payment history found</p>
                    <p class="text-xs text-slate-500 mt-1">No settled payouts match your current filter.</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals: bottom-sheet on mobile, centered on sm+ -->
    <div v-if="showConfirmModal" class="modal-overlay" @click.self="showConfirmModal = false">
      <div class="modal-content confirm-modal">
        <h3>Confirm Payment</h3>
        <p>Are you sure you want to approve the payment of <strong>{{ selectedWorker.netPayout.toFixed(2) }} ETB</strong> for <strong>{{ selectedWorker.name }}</strong>?</p>
        <div class="modal-actions">
          <button class="btn-cancel w-full sm:w-auto" @click="showConfirmModal = false">CANCEL</button>
          <button class="btn-confirm w-full sm:w-auto" @click="executeApprove">YES, APPROVE</button>
        </div>
      </div>
    </div>

    <div v-if="showHoldModal" class="modal-overlay" @click.self="showHoldModal = false">
      <div class="modal-content hold-modal">
        <h3>Hold / Dispute Payment</h3>
        <p>Select reason for holding payment for <strong>{{ selectedWorker.name }}</strong>:</p>
        <div class="hold-reasons">
          <button v-for="reason in holdReasons" :key="reason" class="reason-btn w-full" @click="executeHold(reason)">
            {{ reason }}
          </button>
        </div>
        <div class="modal-actions">
          <button class="btn-cancel w-full sm:w-auto" @click="showHoldModal = false">CANCEL</button>
        </div>
      </div>
    </div>

    <!-- Receipt Modal -->
    <PaymentReceiptModal 
      :isOpen="isReceiptModalOpen" 
      :receiptData="currentReceiptData" 
      @close="isReceiptModalOpen = false" 
    />
    </div>
  </AppLayout>
</template>

<script setup>
// Developer: Mintesnot Abebe | Brand: dev MinteIO
import AppLayout from '@/components/layout/AppLayout.vue'
import AnalyticsDataCard from '@/components/ui/AnalyticsDataCard.vue'
import PaymentReceiptModal from '@/components/ui/PaymentReceiptModal.vue'
import OperatorAvatar from '@/components/ui/OperatorAvatar.vue'
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useMesStore } from '@/store/mesStore.js'
import { usePayrollStore } from '@/store/payrollStore.js'

const mesStore = useMesStore()
const payrollStore = usePayrollStore()

const activeTab = ref('pending')
const isSyncing = ref(false)
let refreshTimer = null

const isPayoutDayAllowed = computed(() => {
  return true // Authorized supervisors and admins can review and approve payroll
})

const currentWeek = computed(() => mesStore.currentProductionWeek)

async function manualSync() {
  isSyncing.value = true
  try {
    await Promise.all([
      mesStore.fetchInitialData(),
      payrollStore.fetchLoans(),
      payrollStore.fetchBonuses(currentWeek.value)
    ])
  } finally {
    setTimeout(() => { isSyncing.value = false }, 400)
  }
}

onMounted(async () => {
  await Promise.all([
    mesStore.fetchInitialData(),
    payrollStore.fetchLoans(),
    payrollStore.fetchBonuses(currentWeek.value)
  ])

  refreshTimer = setInterval(async () => {
    await Promise.all([
      mesStore.fetchInitialData(),
      payrollStore.fetchLoans(),
      payrollStore.fetchBonuses(currentWeek.value)
    ])
  }, 30000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})

// Re-fetch bonuses if the week changes
watch(currentWeek, async (newWeek) => {
  await payrollStore.fetchBonuses(newWeek)
})

const selectedWorkerId = ref(null)
const selectedWorker = computed(() => {
  return payrollStore.weeklyPayrollSummary.find(w => w.id === selectedWorkerId.value)
})

const selectedWorkerProfile = computed(() => {
  return selectedWorkerId.value ? payrollStore.getWorkerProfile(selectedWorkerId.value) : null
})

// Shift breakdown for selected worker
const expandedShift = ref(null)
function toggleShift(date) {
  expandedShift.value = expandedShift.value === date ? null : date
}
const shiftBreakdown = computed(() => {
  if (!selectedWorker.value) return []
  return payrollStore.getShiftBreakdown(selectedWorker.value.id, currentWeek.value)
})

const totalAllDeductions = computed(() => {
  return payrollStore.weeklyPayrollSummary.reduce((sum, w) => sum + w.totalDeduction, 0)
})
const totalNetPayouts = computed(() => {
  return payrollStore.weeklyPayrollSummary.reduce((sum, w) => sum + w.netPayout, 0)
})

// ── Bonus ──────────────────────────────────────────────────────────────────
const currentBonus = computed(() => {
  if (!selectedWorkerId.value) return { amount: 0, reason: '' }
  return payrollStore.getBonus(selectedWorkerId.value, currentWeek.value)
})

// Keypad state — string buffer so we can build "250.50" digit by digit
const keypadBuffer = ref('')
const bonusInputActive = ref(false)

// What the input field shows: keypad buffer if non-empty, else the stored amount
const bonusInputDisplay = computed(() =>
  keypadBuffer.value !== '' ? keypadBuffer.value : (currentBonus.value.amount || '')
)

// Reset keypad buffer whenever the selected worker changes
watch(selectedWorkerId, () => { keypadBuffer.value = '' })

function keypadPress(key) {
  if (!selectedWorkerId.value) return
  if (key === '.') {
    if (keypadBuffer.value.includes('.')) return  // only one decimal
    if (keypadBuffer.value === '') keypadBuffer.value = '0'
  }
  keypadBuffer.value += key
}

function keypadBackspace() {
  keypadBuffer.value = keypadBuffer.value.slice(0, -1)
}

function keypadClear() {
  keypadBuffer.value = ''
  if (!selectedWorkerId.value) return
  payrollStore.setBonusForWorker(selectedWorkerId.value, currentWeek.value, 0, currentBonus.value.reason || '')
}

function keypadApply() {
  if (!selectedWorkerId.value) return
  const amount = Number(keypadBuffer.value) || 0
  payrollStore.setBonusForWorker(selectedWorkerId.value, currentWeek.value, amount, currentBonus.value.reason || '')
  keypadBuffer.value = ''
}

function onBonusAmountInput(event) {
  if (!selectedWorkerId.value) return
  keypadBuffer.value = event.target.value
  const amount = Number(event.target.value) || 0
  const reason = currentBonus.value.reason || ''
  payrollStore.setBonusForWorker(selectedWorkerId.value, currentWeek.value, amount, reason)
}

function onBonusReasonInput(event) {
  if (!selectedWorkerId.value) return
  const reason = event.target.value || ''
  const amount = currentBonus.value.amount || 0
  payrollStore.setBonusForWorker(selectedWorkerId.value, currentWeek.value, amount, reason)
}

// ── Payment History ────────────────────────────────────────────────────────
const historySearchQuery = ref('')
const historyWeekFilter = ref('all')
const historyMethodFilter = ref('all')

const paymentHistory = computed(() => {
  return mesStore.cashEntries
    .filter(e => e.type === 'payout')
    .sort((a, b) => new Date(b.timestamp || b.transaction_date || 0) - new Date(a.timestamp || a.transaction_date || 0))
})

const availableHistoryWeeks = computed(() => {
  const weeks = new Set()
  paymentHistory.value.forEach(e => {
    let week = e.week
    if (e.note && typeof e.note === 'string' && e.note.trim().startsWith('{')) {
      try { week = JSON.parse(e.note).week || week } catch {}
    }
    if (week) weeks.add(week)
  })
  return Array.from(weeks).sort().reverse()
})

function getOperatorObj(entry) {
  return mesStore.operators.find(o => 
    (entry.operator_id != null && Number(o.id) === Number(entry.operator_id)) || 
    (entry.operator && o.name === entry.operator)
  )
}

function formatPaymentDetails(entry) {
  const op = getOperatorObj(entry)
  const profile = op ? payrollStore.getWorkerProfile(op.id) : null
  
  let parsed = null
  if (entry.note && typeof entry.note === 'string' && entry.note.trim().startsWith('{')) {
    try { parsed = JSON.parse(entry.note) } catch {}
  }

  const method = parsed?.paymentMethod || profile?.paymentMethod || 'Cash'
  const account = parsed?.accountInfo || profile?.accountInfo || ''
  const week = parsed?.week || entry.week || 'W--'
  const purpose = parsed?.purpose || (entry.note && !entry.note.startsWith('{') ? entry.note : `Weekly Settlement for ${week}`)
  const gross = parsed?.grossEarnings != null ? Number(parsed.grossEarnings) : (parsed?.grossPieceRate != null ? Number(parsed.grossPieceRate) : Number(entry.amount || 0))
  const grossPieceRate = parsed?.grossPieceRate != null ? Number(parsed.grossPieceRate) : gross
  const grossHourly = parsed?.grossHourly != null ? Number(parsed.grossHourly) : 0
  const deductions = parsed?.totalDeduction != null ? Number(parsed.totalDeduction) : 0
  const bonus = parsed?.bonus != null ? Number(parsed.bonus) : 0
  const bonusReason = parsed?.bonusReason || ''

  return {
    ...entry,
    workerName: entry.operator || op?.name || 'Unknown',
    operatorObj: op,
    paymentMethod: method,
    accountInfo: account,
    week,
    purpose,
    gross,
    grossPieceRate,
    grossHourly,
    deductions,
    bonus,
    bonusReason,
    netAmount: Number(entry.amount) || 0,
    rawParsed: parsed
  }
}

const enrichedPaymentHistory = computed(() => {
  return paymentHistory.value.map(formatPaymentDetails)
})

const filteredPaymentHistory = computed(() => {
  return enrichedPaymentHistory.value.filter(entry => {
    // Week filter
    if (historyWeekFilter.value !== 'all' && entry.week !== historyWeekFilter.value) {
      return false
    }
    // Payment Method filter
    if (historyMethodFilter.value !== 'all' && entry.paymentMethod !== historyMethodFilter.value) {
      return false
    }
    // Search query
    if (historySearchQuery.value.trim()) {
      const q = historySearchQuery.value.toLowerCase()
      const opMatch = (entry.workerName || '').toLowerCase().includes(q)
      const purposeMatch = (entry.purpose || '').toLowerCase().includes(q)
      const methodMatch = (entry.paymentMethod || '').toLowerCase().includes(q)
      const accountMatch = (entry.accountInfo || '').toLowerCase().includes(q)
      if (!opMatch && !purposeMatch && !methodMatch && !accountMatch) return false
    }
    return true
  })
})

const totalHistoryPaid = computed(() => {
  return filteredPaymentHistory.value.reduce((sum, e) => sum + e.netAmount, 0)
})

const totalCashHistoryPaid = computed(() => {
  return filteredPaymentHistory.value
    .filter(e => e.paymentMethod === 'Cash')
    .reduce((sum, e) => sum + e.netAmount, 0)
})

const totalDigitalHistoryPaid = computed(() => {
  return filteredPaymentHistory.value
    .filter(e => e.paymentMethod !== 'Cash')
    .reduce((sum, e) => sum + e.netAmount, 0)
})

const uniqueHistoryPayeesCount = computed(() => {
  const payees = new Set(filteredPaymentHistory.value.map(e => e.operator_id || e.workerName))
  return payees.size
})

function viewHistoricalReceipt(entry) {
  const op = getOperatorObj(entry)
  const profile = op ? payrollStore.getWorkerProfile(op.id) : null
  const weekLabel = entry.week || 'W--'
  const receiptId = String(entry.id || '').padStart(4, '0')
  const opId = String(entry.operator_id || op?.id || '0').padStart(3, '0')

  currentReceiptData.value = {
    receiptNo: `REC-${weekLabel}-${opId}-${receiptId}`,
    employeeName: entry.workerName || entry.operator || op?.name || 'Unknown',
    employeeId: entry.operator_id || op?.id || '—',
    role: op?.role || 'Operator',
    productionWeek: entry.week || 'Historical',
    paymentMethod: entry.paymentMethod || profile?.paymentMethod || 'Cash',
    accountInfo: entry.accountInfo || profile?.accountInfo || 'N/A',
    date: entry.timestamp || entry.transaction_date || new Date().toISOString(),
    grossPay: entry.gross || Number(entry.amount) || 0,
    grossPieceRate: entry.grossPieceRate || entry.gross || Number(entry.amount) || 0,
    grossHourly: entry.grossHourly || 0,
    advanceDeductions: 0,
    loanDeductions: entry.deductions || 0,
    deductions: entry.deductions || 0,
    totalDeductions: entry.deductions || 0,
    bonus: entry.bonus || 0,
    bonusReason: entry.bonusReason || '',
    netPayout: entry.netAmount || Number(entry.amount) || 0,
    note: entry.purpose || entry.note || '',
    authorizedBy: 'Divider MES Admin'
  }
  isReceiptModalOpen.value = true
}

function exportHistoryCSV() {
  if (filteredPaymentHistory.value.length === 0) return

  let csvContent = "Date,Employee_Name,Role,Payment_Method,Account_Info,Week,What_We_Paid_For,Gross_ETB,Deductions_ETB,Bonus_ETB,Net_Paid_ETB\n"
  filteredPaymentHistory.value.forEach(entry => {
    const date = (entry.timestamp || entry.transaction_date || '').split('T')[0]
    const name = `"${(entry.workerName || 'Unknown').replace(/"/g, '""')}"`
    const role = `"${(entry.operatorObj?.role || 'Operator').replace(/"/g, '""')}"`
    const method = `"${entry.paymentMethod || 'Cash'}"`
    const account = `"${(entry.accountInfo || 'N/A').replace(/"/g, '""')}"`
    const week = `"${entry.week || ''}"`
    const purpose = `"${(entry.purpose || '').replace(/"/g, '""')}"`
    const gross = (entry.gross || 0).toFixed(2)
    const deductions = (entry.deductions || 0).toFixed(2)
    const bonus = (entry.bonus || 0).toFixed(2)
    const net = (entry.netAmount || 0).toFixed(2)
    
    csvContent += `${date},${name},${role},${method},${account},${week},${purpose},${gross},${deductions},${bonus},${net}\n`
  })

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", `payroll_payment_history_${historyWeekFilter.value}_${historyMethodFilter.value}_${Date.now()}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// ── Cash Denomination Calculator ─────────────────────────────────────────────
// Ethiopian Birr physical note denominations (greedy algorithm — largest first)
const DENOMINATIONS = [200, 100, 50, 10, 5, 1]

/**
 * Returns an object { denom: count } for breaking down an ETB amount
 * into the minimum number of physical notes/coins using a greedy approach.
 */
function denominateAmount(amountEtb) {
  // Round to nearest whole birr (no physical fractional notes)
  let remaining = Math.round(amountEtb)
  const counts = {}
  for (const denom of DENOMINATIONS) {
    counts[denom] = Math.floor(remaining / denom)
    remaining = remaining % denom
  }
  return counts
}

const cashDenominations = computed(() => {
  const approvedWorkers = payrollStore.weeklyPayrollSummary.filter(
    w => w.payoutStatus.status === 'approved' && w.netPayout > 0 && (!w.paymentMethod || w.paymentMethod === 'Cash')
  )

  if (approvedWorkers.length === 0) {
    return {
      totalCash: 0,
      approvedCount: 0,
      breakdown: DENOMINATIONS.map(d => ({ denom: d, count: 0 })),
    }
  }

  const totalCash = approvedWorkers.reduce((sum, w) => sum + w.netPayout, 0)

  // Accumulate denomination counts across every approved worker's payout
  const totalCounts = Object.fromEntries(DENOMINATIONS.map(d => [d, 0]))
  for (const worker of approvedWorkers) {
    const workerCounts = denominateAmount(worker.netPayout)
    for (const denom of DENOMINATIONS) {
      totalCounts[denom] += workerCounts[denom] || 0
    }
  }

  return {
    totalCash,
    approvedCount: approvedWorkers.length,
    breakdown: DENOMINATIONS.map(d => ({ denom: d, count: totalCounts[d] })),
  }
})

function printBankSlip() {
  const { totalCash, approvedCount, breakdown } = cashDenominations.value
  const week = currentWeek.value

  const rows = breakdown
    .filter(r => r.count > 0)
    .map(r =>
      `  ${String(r.denom).padStart(3)} ETB notes : ${String(r.count).padStart(5)}   =  ${(r.denom * r.count).toFixed(2)} ETB`
    ).join('\n')

  const slip = [
    '╔═══════════════════════════════════════════════╗',
    '║         DIVIDER MES — BANK CASH SLIP          ║',
    '╚═══════════════════════════════════════════════╝',
    `  Production Week : ${week}`,
    `  Approved Payees : ${approvedCount} worker${approvedCount !== 1 ? 's' : ''}`,
    `  Total Cash      : ${totalCash.toFixed(2)} ETB`,
    '─────────────────────────────────────────────────',
    '  DENOMINATION BREAKDOWN',
    '─────────────────────────────────────────────────',
    rows,
    '─────────────────────────────────────────────────',
    `  Printed by      : Divider MES Admin`,
    `  Date / Time     : ${new Date().toLocaleString()}`,
    '  Authorized by   : ___________________________',
    '',
  ].join('\n')

  const win = window.open('', '_blank', 'width=520,height=640')
  if (!win) return
  win.document.write(
    '<html><head><title>Bank Cash Slip – ' + week + '</title></head>' +
    '<body style="margin:0;background:#fff">' +
    '<pre style="font-family:Courier New,monospace;font-size:13px;' +
    'padding:2rem;color:#000;white-space:pre">' + slip + '</pre></body></html>'
  )
  win.document.close()
  win.print()
}

// ── Digital CSV Export ─────────────────────────────────────────────────────
const digitalWorkers = computed(() => {
  return payrollStore.weeklyPayrollSummary.filter(
    w => w.payoutStatus.status === 'approved' && w.netPayout > 0 && w.paymentMethod && w.paymentMethod !== 'Cash'
  )
})

const digitalDisbursementsCount = computed(() => digitalWorkers.value.length)

const digitalSummaryText = computed(() => {
  const cbe = digitalWorkers.value.filter(w => (w.paymentMethod === 'CBE' || w.payment_preference === 'CBE')).length
  const telebirr = digitalWorkers.value.filter(w => (w.paymentMethod === 'Telebirr' || w.payment_preference === 'Telebirr')).length
  return `${cbe} Workers via CBE  |  ${telebirr} Workers via Telebirr`
})

function generateDigitalPayrollCSV() {
  if (digitalWorkers.value.length === 0) return

  let csvContent = "Beneficiary_Name,Account_Number,Amount,Bank_Type\n"
  
  digitalWorkers.value.forEach(worker => {
    const name = worker.name || 'Unknown'
    const account = worker.account_number || 'MISSING_ACCOUNT'
    const amount = worker.netPayout.toFixed(2)
    const bank = worker.payment_preference
    csvContent += `"${name}","${account}","${amount}","${bank}"\n`
  })

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", `payroll_digital_export_${currentWeek.value.replace(/[^a-zA-Z0-9]/g, '_')}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Modals
const showConfirmModal = ref(false)
const showHoldModal = ref(false)
const isReceiptModalOpen = ref(false)
const currentReceiptData = ref(null)
const holdReasons = ['Missing Tools', 'Attendance Dispute', 'Loan Discrepancy', 'Quality Penalty']

function confirmApprove(worker) {
  if (worker.payoutStatus.status === 'approved') return
  showConfirmModal.value = true
}

async function executeApprove() {
  if (selectedWorker.value) {
    const bonus = payrollStore.getBonus(selectedWorker.value.id, currentWeek.value)
    const profile = payrollStore.getWorkerProfile(selectedWorker.value.id)
    const worker = selectedWorker.value
    const weekLabel = currentWeek.value || 'W--'
    const opId = String(worker.id || '0').padStart(3, '0')
    const timeCode = Date.now().toString().slice(-4)

    const loanDeductionAmt = (worker.loanBreakdown || []).reduce((s, l) => s + (Number(l.deduction) || 0), 0)
    const advanceDeductionAmt = Math.max(0, (Number(worker.totalDeduction) || 0) - loanDeductionAmt)

    currentReceiptData.value = {
      receiptNo: `REC-${weekLabel}-${opId}-${timeCode}`,
      employeeName: worker.name,
      employeeId: worker.id,
      role: worker.role || 'Operator',
      productionWeek: weekLabel,
      paymentMethod: profile.paymentMethod || worker.paymentMethod || 'Cash',
      accountInfo: profile.accountInfo || worker.accountInfo || 'N/A',
      date: new Date().toISOString(),
      grossPieceRate: worker.grossPieceRate || worker.grossEarnings || 0,
      grossHourly: worker.grossHourly || 0,
      grossPay: worker.grossEarnings || 0,
      daysAttended: worker.daysAttended,
      advanceDeductions: advanceDeductionAmt,
      loanDeductions: loanDeductionAmt,
      deductions: worker.totalDeduction || 0,
      totalDeductions: worker.totalDeduction || 0,
      bonus: bonus.amount || 0,
      bonusReason: bonus.reason || '',
      netPayout: worker.netPayout || 0,
      note: bonus.amount > 0 ? `Bonus: ${bonus.amount} ETB (${bonus.reason || 'Performance'})` : '',
      authorizedBy: mesStore.activeOperator?.name || 'Divider MES Admin'
    }
    
    await payrollStore.approvePayout(selectedWorker.value.id, currentWeek.value)
    
    // Open receipt modal
    isReceiptModalOpen.value = true
  }
  showConfirmModal.value = false
}

function openHoldMenu(worker) {
  if (worker.payoutStatus.status === 'approved') return
  showHoldModal.value = true
}

function executeHold(reason) {
  if (selectedWorker.value) {
    payrollStore.holdPayout(selectedWorker.value.id, currentWeek.value, reason)
  }
  showHoldModal.value = false
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

/* ══ KPI Grid ════════════════════════════════════════════════════════════════ */
.kpi-grid {
  display: grid;
  gap: .85rem;
  flex-shrink: 0;
}

/* ══ Chart card (shared) ═════════════════════════════════════════════════════ */
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
.chart-card h3 {
  color: #94a3b8;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin: 0 0 1.5rem 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  padding-bottom: 0.75rem;
}

/* ══ Employee layout ═════════════════════════════════════════════════════════ */
.employee-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 1rem;
  flex: 1;
  min-height: 0;
}
@media (max-width: 768px) {
  .employee-layout {
    display: flex;
    flex-direction: column;
  }
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

.op-card {
  display: flex; align-items: center; gap: .65rem; padding: .65rem;
  border-radius: .65rem; border: 1px solid rgba(255,255,255,.05);
  background: #0f172a; cursor: pointer; text-align: left;
  transition: all .15s ease; -webkit-tap-highlight-color: transparent;
}
.op-card:hover { border-color: rgba(255,255,255,.1); background: rgba(255,255,255,.03); }
.op-card--active { background: rgba(99,102,241,.15); border-color: rgba(99,102,241,.4); }

.op-avatar-sm {
  width: 2.25rem; height: 2.25rem; border-radius: .5rem;
  display: flex; align-items: center; justify-content: center;
  font-size: .85rem; font-weight: 800; color: #fff; flex-shrink: 0;
}
.op-info { flex: 1; min-width: 0; }
.op-name-sm  { font-size: .82rem; font-weight: 700; color: #f1f5f9; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.op-role-sm  { font-size: .62rem; color: #64748b; margin: 0; }

.worker-status-amount {
  text-align: right;
}
.worker-amount {
  font-size: .85rem;
  font-weight: 800;
  color: #10b981;
  margin: 0 0 0.3rem 0;
}

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

/* Profile area */
.profile-area { flex: 1; min-width: 0; overflow-y: auto; padding-right: 0.5rem; }

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}
.hold-reason-text {
  color: #f87171;
  font-size: 0.9rem;
  margin: 0;
  font-weight: 600;
}
.status-stamp {
  font-size: 1.5rem;
  font-weight: 900;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  border: 2px solid transparent;
}
.status-stamp.pending { color: #fbbf24; border-color: #fbbf24; }
.status-stamp.approved { color: #10b981; border-color: #10b981; }
.status-stamp.held { color: #ef4444; border-color: #ef4444; }

.breakdown-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 3rem;
  transition: opacity 0.3s;
}
.breakdown-content.is-locked {
  opacity: 0.6;
  pointer-events: none;
}

.calc-row {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 0;
  font-size: 1.1rem;
  color: #e2e8f0;
}
.calc-row.math-op {
  border-top: 1px dashed rgba(255,255,255,0.1);
  margin-top: 0.5rem;
  padding-top: 1rem;
  font-weight: 600;
}
.calc-row.math-result {
  border-top: 2px solid rgba(255,255,255,0.1);
  margin-top: 0.5rem;
  padding-top: 1rem;
  font-weight: 800;
  font-size: 1.2rem;
  color: #f8fafc;
}

.deduction-val {
  color: #f87171;
}

.net-payout .net-amount {
  font-size: 3rem;
  font-weight: 900;
  color: #10b981;
  text-align: right;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: 1.5rem;
  margin-top: auto;
}
.btn-massive {
  flex: 1;
  padding: 1.5rem;
  font-size: 1.3rem;
  font-weight: 800;
  border-radius: 1rem;
  border: none;
  cursor: pointer;
  transition: transform 0.1s, opacity 0.2s;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.btn-massive:active:not(:disabled) {
  transform: scale(0.98);
}
.btn-massive:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
.btn-approve {
  background: #10b981;
  color: #fff;
  box-shadow: 0 8px 20px rgba(16,185,129,0.3);
}
.btn-hold {
  background: #ef4444;
  color: #fff;
  box-shadow: 0 8px 20px rgba(239,68,68,0.3);
}

/* Empty State */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #64748b;
}
.empty-icon {
  font-size: 5rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}
.empty-state p {
  font-size: 1.2rem;
  font-weight: 600;
}

/* Modals */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.modal-content {
  background: #1e293b;
  border-radius: 1rem;
  padding: 2rem;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
  border: 1px solid rgba(255,255,255,0.1);
}
.modal-content h3 {
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
  color: #f8fafc;
}
.modal-content p {
  color: #cbd5e1;
  font-size: 1.1rem;
  line-height: 1.5;
  margin-bottom: 2rem;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}
.modal-actions button {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 700;
  border-radius: 0.5rem;
  cursor: pointer;
  border: none;
}
.btn-cancel {
  background: transparent;
  color: #94a3b8;
  border: 1px solid #475569 !important;
}
.btn-confirm {
  background: #10b981;
  color: #fff;
}

.hold-reasons {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 2rem;
}
.reason-btn {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  padding: 1rem;
  border-radius: 0.5rem;
  color: #e2e8f0;
  font-size: 1.1rem;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s;
}
.reason-btn:hover {
  background: rgba(239,68,68,0.2);
  border-color: #ef4444;
}

/* Shift breakdown rows */
.shift-rows { display: flex; flex-direction: column; gap: 0.5rem; }
.shift-row {
  border-radius: 0.65rem; overflow: hidden;
  border: 1px solid rgba(255,255,255,0.07);
}
.shift-row--pending  { border-color: rgba(245,158,11,0.2); }
.shift-row--approved { border-color: rgba(16,185,129,0.2); }
.shift-row--rejected { border-color: rgba(239,68,68,0.2); opacity: 0.7; }
.shift-row--raw-ledger { border-color: rgba(99,102,241,0.2); }

.shift-row-header {
  display: flex; align-items: center; gap: 0.75rem;
  padding: 0.75rem 1rem; cursor: pointer;
  background: rgba(255,255,255,0.02);
}
.shift-row-header:hover { background: rgba(255,255,255,0.04); }

.shift-date {
  display: flex; align-items: center; gap: 0.4rem;
  font-weight: 700; color: #e2e8f0; font-size: 0.9rem;
  min-width: 7rem;
}
.shift-summary-pills { display: flex; gap: 0.35rem; flex: 1; flex-wrap: wrap; }
.pill {
  font-size: 0.7rem; font-weight: 700; padding: 0.2rem 0.6rem; border-radius: 999px;
}
.pill--green  { background: rgba(52,211,153,0.12); color: #34d399; }
.pill--red    { background: rgba(248,113,113,0.12); color: #f87171; }
.pill--yellow { background: rgba(251,191,36,0.12); color: #fbbf24; }

.shift-status-badge {
  font-size: 0.65rem; font-weight: 800; padding: 0.2rem 0.6rem; border-radius: 999px; letter-spacing: 0.08em;
}
.ssb--pending  { background: rgba(245,158,11,0.12); color: #fbbf24; }
.ssb--approved { background: rgba(16,185,129,0.12); color: #34d399; }
.ssb--rejected { background: rgba(239,68,68,0.12); color: #f87171; }
.ssb--raw-ledger { background: rgba(99,102,241,0.12); color: #818cf8; }

.shift-entries { padding: 0.75rem 1rem; background: rgba(0,0,0,0.2); }
.entry-mini-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.entry-mini-table th {
  color: #64748b; padding: 0.4rem 0.6rem; text-align: left;
  border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 0.7rem;
  text-transform: uppercase; letter-spacing: 0.05em;
}
.entry-mini-table td { padding: 0.4rem 0.6rem; color: #e2e8f0; }
.tar { text-align: right !important; }

/* ══ Loan Installment Progress Blocks ═══════════════════════════════════════ */
.loan-progress-block {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.65rem 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.loan-progress-block:last-of-type { border-bottom: none; }

.lp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.lp-label       { font-size: 0.72rem; font-weight: 700; color: #94a3b8; }
.lp-installment { font-size: 0.78rem; font-weight: 800; }

.lp-track {
  height: 5px;
  background: rgba(255,255,255,0.05);
  border-radius: 999px;
  overflow: hidden;
}
.lp-fill {
  height: 100%;
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  border-radius: 999px;
  transition: width 0.5s ease;
}
.lp-fill--done { background: linear-gradient(90deg, #10b981, #34d399); }

.lp-footer {
  display: flex;
  justify-content: space-between;
}
.lp-repaid    { font-size: 0.62rem; color: #475569; }
.lp-remaining { font-size: 0.62rem; font-weight: 700; color: #f87171; }

.calc-divider-thin {
  height: 1px;
  background: rgba(255,255,255,0.06);
  margin: 0.5rem 0;
}

.no-shifts-note {
  display: flex; align-items: center; gap: 0.5rem;
  color: #475569; font-size: 0.85rem; padding: 0.75rem;
  background: rgba(255,255,255,0.02); border-radius: 0.5rem;
}

/* ══ Bonus Card ══════════════════════════════════════════════════════════════ */
.bonus-card {
  border-color: rgba(251, 191, 36, 0.2) !important;
  background: linear-gradient(135deg, #1e293b 70%, rgba(251,191,36,0.04)) !important;
  transition: border-color 0.2s;
}
.bonus-card h3 {
  border-bottom-color: rgba(251, 191, 36, 0.15) !important;
  margin-bottom: 1rem !important;
}
.bonus-locked {
  opacity: 0.55;
  pointer-events: none;
}

.bonus-body {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.bonus-input-row {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.bonus-label {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #64748b;
}

.bonus-input-wrap {
  display: flex;
  align-items: center;
  background: #0f172a;
  border: 1px solid rgba(251,191,36,0.3);
  border-radius: 0.6rem;
  overflow: hidden;
  transition: border-color 0.15s;
}
.bonus-input-wrap:focus-within {
  border-color: #fbbf24;
  box-shadow: 0 0 0 2px rgba(251,191,36,0.12);
}

.bonus-prefix {
  padding: 0.65rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 800;
  color: #fbbf24;
  background: rgba(251,191,36,0.08);
  border-right: 1px solid rgba(251,191,36,0.2);
  white-space: nowrap;
}

.bonus-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #f1f5f9;
  font-size: 1.1rem;
  font-weight: 800;
  padding: 0.65rem 0.75rem;
  font-family: inherit;
  width: 100%;
}
.bonus-input::placeholder { color: #334155; }
.bonus-input::-webkit-inner-spin-button,
.bonus-input::-webkit-outer-spin-button { opacity: 0.4; }

.bonus-reason-input {
  width: 100%;
  background: #0f172a;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 0.6rem;
  padding: 0.6rem 0.75rem;
  color: #e2e8f0;
  font-size: 0.82rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
}
.bonus-reason-input:focus { border-color: rgba(251,191,36,0.4); }
.bonus-reason-input::placeholder { color: #334155; }

.bonus-preview {
  background: rgba(251,191,36,0.08);
  border: 1px solid rgba(251,191,36,0.2);
  border-radius: 0.5rem;
  padding: 0.55rem 0.85rem;
  font-size: 0.82rem;
  color: #fbbf24;
  margin: 0;
  animation: bonusPulse 0.3s ease-out;
}
@keyframes bonusPulse {
  from { transform: scale(0.97); opacity: 0; }
  to   { transform: scale(1);    opacity: 1; }
}

.net-bonus-note {
  font-size: 0.72rem;
  color: #fbbf24;
  text-align: right;
  margin: 0;
  padding-top: 0.25rem;
  font-weight: 600;
}

/* ══ Cash Denomination Card ═════════════════════════════════════════════════ */
.cash-denom-card {
  background: linear-gradient(135deg, #1e293b 60%, rgba(251,191,36,0.05));
  border-bottom: 1px solid rgba(251,191,36,0.18);
  padding: 0.8rem 1.5rem;
  flex-shrink: 0;
}

.cash-denom-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.65rem;
}

.cash-denom-title {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.78rem;
  font-weight: 800;
  color: #e2e8f0;
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

.cash-week-badge {
  background: rgba(251,191,36,0.12);
  border: 1px solid rgba(251,191,36,0.28);
  color: #fbbf24;
  font-size: 0.6rem;
  font-weight: 700;
  padding: 0.12rem 0.45rem;
  border-radius: 999px;
  letter-spacing: 0.06em;
}

.cash-denom-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.cash-total-label {
  font-size: 0.68rem;
  color: #64748b;
  font-weight: 600;
}

.cash-total-value {
  font-size: 1rem;
  font-weight: 900;
  color: #fbbf24;
  font-variant-numeric: tabular-nums;
}

.btn-bank-slip {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  background: rgba(251,191,36,0.1);
  border: 1px solid rgba(251,191,36,0.3);
  border-radius: 0.45rem;
  color: #fbbf24;
  font-size: 0.68rem;
  font-weight: 800;
  padding: 0.35rem 0.75rem;
  cursor: pointer;
  letter-spacing: 0.05em;
  transition: background 0.14s;
  font-family: inherit;
}
.btn-bank-slip:hover  { background: rgba(251,191,36,0.2); }
.btn-bank-slip:active { transform: scale(0.95); }

.denom-table-wrap {
  display: flex;
  align-items: flex-start;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.denom-table {
  border-collapse: collapse;
  font-size: 0.75rem;
}

.denom-table th {
  text-align: left;
  padding: 0.25rem 0.75rem;
  color: #475569;
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.denom-row td      { padding: 0.25rem 0.75rem; }
.denom-row--zero   { opacity: 0.2; }

.denom-note   { width: 100px; }

.note-chip {
  background: #0f172a;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 0.3rem;
  padding: 0.12rem 0.4rem;
  font-weight: 800;
  color: #e2e8f0;
  font-variant-numeric: tabular-nums;
  font-size: 0.75rem;
}

.denom-count {
  color: #94a3b8;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  width: 55px;
}

.denom-subtotal {
  color: #fbbf24;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.approved-workers-note {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.65rem;
  color: #475569;
  align-self: flex-end;
  padding-bottom: 0.2rem;
}

/* ══ Bonus Row — card + keypad side-by-side ══════════════════════════════════ */
.bonus-row {
  display: flex;
  gap: 0.85rem;
  align-items: stretch;
}
.bonus-row.bonus-locked {
  opacity: 0.55;
  pointer-events: none;
}
.bonus-row .bonus-card {
  flex: 1;
  min-width: 0;
}
@media (max-width: 640px) {
  .bonus-row { flex-direction: column; }
}

/* ══ Numeric Keypad ══════════════════════════════════════════════════════════ */
.bonus-keypad {
  width: 220px;
  flex-shrink: 0;
  background: #1e293b;
  border: 1px solid rgba(251,191,36,0.2);
  border-radius: 1rem;
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.keypad-display {
  background: #0f172a;
  border: 1px solid rgba(251,191,36,0.25);
  border-radius: 0.6rem;
  padding: 0.55rem 0.75rem;
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  justify-content: flex-end;
}
.keypad-prefix {
  font-size: 0.65rem;
  font-weight: 800;
  color: #fbbf24;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.keypad-value {
  font-size: 1.4rem;
  font-weight: 900;
  color: #f1f5f9;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}

.keypad-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.4rem;
}

.kp-btn {
  height: 2.6rem;
  border-radius: 0.55rem;
  border: 1px solid rgba(255,255,255,0.07);
  background: #0f172a;
  color: #e2e8f0;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.1s, transform 0.07s, border-color 0.1s;
  -webkit-tap-highlight-color: transparent;
  font-family: inherit;
}
.kp-btn:hover  { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.14); }
.kp-btn:active { transform: scale(0.93); background: rgba(255,255,255,0.1); }

/* 0 spans 1 col, dot and backspace share the row */
.kp-btn--dot  { color: #94a3b8; }
.kp-btn--back {
  background: rgba(239,68,68,0.08);
  border-color: rgba(239,68,68,0.18);
  color: #f87171;
}
.kp-btn--back:hover { background: rgba(239,68,68,0.15); }

/* CLR and SET span full row below */
.kp-btn--clear {
  grid-column: span 1;
  background: rgba(239,68,68,0.1);
  border-color: rgba(239,68,68,0.2);
  color: #f87171;
  font-size: 0.75rem;
  letter-spacing: 0.06em;
}
.kp-btn--clear:hover { background: rgba(239,68,68,0.2); }

.kp-btn--apply {
  grid-column: span 2;
  gap: 0.3rem;
  background: linear-gradient(135deg, rgba(251,191,36,0.2), rgba(251,191,36,0.1));
  border-color: rgba(251,191,36,0.35);
  color: #fbbf24;
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.06em;
}
.kp-btn--apply:hover  { background: linear-gradient(135deg, rgba(251,191,36,0.3), rgba(251,191,36,0.18)); border-color: #fbbf24; }
.kp-btn--apply:active { transform: scale(0.95); }

/* ── Mobile Responsive ────────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .view-area {
    height: auto;
    min-height: 100%;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-y;
    padding-bottom: 4rem;
  }
  .view-panel {
    overflow: visible;
    height: auto;
    padding: 1rem;
  }
  .btn-massive, .kp-btn, .btn-bank-slip {
    touch-action: pan-y;
  }
  .cash-denom-card {
    padding: 0.8rem 1rem;
  }
  .action-buttons {
    flex-direction: column;
    gap: 0.75rem;
  }
}
</style>

