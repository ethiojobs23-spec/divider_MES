<template>
  <AppLayout>
    <!-- MAIN: Input Area -->
    <main class="cash-main">
      <nav class="settings-top-nav flex justify-between items-center flex-wrap gap-2">
        <div class="flex items-center gap-2 flex-wrap">
          <button class="snav-item" :class="{'snav-item--active': activeTab === 'new'}" @click="activeTab = 'new'">
            <span class="material-symbols-rounded snav-icon">add_circle</span>
            <span class="snav-label">Log Advance / Expense</span>
          </button>
          <button class="snav-item" :class="{'snav-item--active': activeTab === 'advances'}" @click="activeTab = 'advances'">
            <span class="material-symbols-rounded snav-icon">payments</span>
            <span class="snav-label">Advance History</span>
            <span class="badge badge--info" v-if="liveAdvancesThisWeek.length > 0">{{ liveAdvancesThisWeek.length }}</span>
          </button>
          <button class="snav-item" :class="{'snav-item--active': activeTab === 'loans'}" @click="activeTab = 'loans'">
            <span class="material-symbols-rounded snav-icon">account_balance</span>
            <span class="snav-label">Loan Portfolio</span>
            <span class="badge badge--purple" v-if="payrollStore.loans.length > 0">{{ payrollStore.loans.length }}</span>
          </button>
          <button class="snav-item" :class="{'snav-item--active': activeTab === 'pending'}" @click="activeTab = 'pending'">
            <span class="material-symbols-rounded snav-icon">pending_actions</span>
            <span class="snav-label">Pending Approvals</span>
            <span class="badge" v-if="pendingCount > 0">{{ pendingCount }}</span>
          </button>
        </div>

        <button class="sync-btn cursor-pointer" :disabled="isSyncing" @click="manualSync" title="Sync cash & loans now">
          <span class="material-symbols-rounded" :class="{ 'spin-icon': isSyncing }">sync</span>
          <span>{{ isSyncing ? 'Syncing...' : 'Sync Data' }}</span>
        </button>
      </nav>

      <!-- ─── TAB 1: LOG ADVANCE / EXPENSE + LIVE ADVANCES LOGGER ─── -->
      <div v-if="activeTab === 'new'" class="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full max-w-7xl mx-auto">
        <!-- Input Form -->
        <div class="tab-panel lg:col-span-6 flex flex-col justify-between">
          <div>
            <!-- Entry Type Switcher -->
            <div class="entry-type-row mb-4">
              <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">1. Select Entry Type</label>
              <div class="flex gap-2">
                <button
                  class="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center justify-center gap-2"
                  :class="entryType === 'advance' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-lg shadow-amber-500/10' : 'bg-slate-900 border-white/5 text-slate-400'"
                  @click="entryType = 'advance'"
                >
                  <span class="material-symbols-rounded text-base">payments</span>
                  Operator Advance
                </button>
                <button
                  class="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center justify-center gap-2"
                  :class="entryType === 'expense' ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-lg shadow-rose-500/10' : 'bg-slate-900 border-white/5 text-slate-400'"
                  @click="entryType = 'expense'"
                >
                  <span class="material-symbols-rounded text-base">receipt</span>
                  Company Expense
                </button>
              </div>
            </div>

            <!-- Operator Selection (if Advance) -->
            <div v-if="entryType === 'advance'" class="operator-select-row mb-4">
              <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">2. Select Operator / Beneficiary</label>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-44 overflow-y-auto p-1 bg-slate-900/50 rounded-xl border border-white/5">
                <button
                  v-for="op in store.operators.filter(o => o.role !== 'customer')"
                  :key="op.id"
                  class="flex items-center gap-2 p-2 rounded-lg border text-left cursor-pointer transition-all"
                  :class="selectedOp?.id === op.id ? 'bg-indigo-600/30 border-indigo-500 text-white' : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'"
                  @click="selectedOp = op"
                >
                  <OperatorAvatar :avatar="op.avatar" :name="op.name" :color="op.color" size="sm" />
                  <div class="min-w-0 flex-1">
                    <p class="text-xs font-bold m-0 truncate">{{ op.name }}</p>
                    <p class="text-[0.65rem] text-slate-500 m-0">{{ op.role }}</p>
                  </div>
                </button>
              </div>
            </div>

            <!-- Quick Presets -->
            <div class="presets-row">
              <p class="presets-label">{{ entryType === 'advance' ? '3. Quick Amount' : '2. Quick Amount' }}</p>
              <div class="presets">
                <button
                  v-for="preset in presets"
                  :key="preset"
                  class="preset-btn cursor-pointer"
                  @click="inputAmount = String(preset)"
                >{{ preset }} ETB</button>
              </div>
            </div>

            <!-- Numpad -->
            <div class="cash-numpad">
              <VirtualNumpad
                label="Amount (ETB)"
                v-model="inputAmount"
                :allowDecimal="true"
              />
            </div>

            <!-- Note input -->
            <div class="note-row">
              <p class="note-label">{{ entryType === 'advance' ? '4. Reason / Note' : '3. Expense Description' }}</p>
              <div class="note-chips">
                <button
                  v-for="n in (entryType === 'advance' ? advanceNoteOptions : expenseNoteOptions)"
                  :key="n"
                  class="note-chip cursor-pointer"
                  :class="{ 'note-chip--active': note === n }"
                  @click="note = n"
                >{{ n }}</button>
              </div>
              <input
                v-model="customNote"
                type="text"
                placeholder="Or type custom description..."
                class="w-full mt-2 bg-slate-900 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <!-- Submit -->
          <button
            class="submit-btn cursor-pointer mt-4"
            :disabled="!canSubmit || isSaving"
            @click="submitEntry"
          >
            <span class="material-symbols-rounded">payments</span>
            {{ isSaving ? 'SAVING...' : `LOG ${entryType === 'advance' ? 'ADVANCE' : 'EXPENSE'}` }}
            {{ inputAmount ? `– ${Number(inputAmount).toFixed(2)} ETB` : '' }}
          </button>
        </div>

        <!-- Live Advances Logger Table (This Week) -->
        <div class="tab-panel lg:col-span-6 flex flex-col">
          <div class="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
            <div>
              <h3 class="panel-heading m-0 flex items-center gap-2">
                <span class="material-symbols-rounded text-amber-400 text-lg">receipt_long</span>
                Live Advances Log
              </h3>
              <p class="text-[0.7rem] text-slate-400 m-0">Recent operator advances logged for {{ store.currentProductionWeek }}</p>
            </div>
            <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {{ liveAdvancesThisWeek.length }} logged
            </span>
          </div>

          <div class="overflow-y-auto flex-1 max-h-[540px] pr-1 space-y-2">
            <div
              v-for="adv in liveAdvancesThisWeek"
              :key="adv.id"
              class="p-3 bg-slate-900/80 border border-white/5 rounded-xl flex items-center justify-between gap-3 hover:border-white/10 transition-all"
            >
              <div class="flex items-center gap-3 min-w-0">
                <OperatorAvatar :name="adv.operator" size="sm" />
                <div class="min-w-0">
                  <p class="text-xs font-bold text-white m-0 truncate">{{ adv.operator }}</p>
                  <p class="text-[0.7rem] text-slate-400 m-0 truncate">
                    {{ adv.note || 'Weekly Advance' }} &bull; {{ fmtDate(adv.timestamp || adv.transactionDate) }}
                  </p>
                </div>
              </div>
              <div class="text-right flex-shrink-0">
                <p class="text-sm font-black text-amber-400 m-0 font-mono">{{ Number(adv.amount).toFixed(2) }} ETB</p>
                <span
                  class="text-[0.65rem] font-bold uppercase px-1.5 py-0.2 rounded"
                  :class="adv.type === 'advance' ? 'bg-emerald-500/10 text-emerald-400' : (adv.type === 'pending_advance' ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400')"
                >
                  {{ adv.type.replace('_', ' ') }}
                </span>
              </div>
            </div>

            <div v-if="!liveAdvancesThisWeek.length" class="empty-state py-12">
              <span class="material-symbols-rounded text-3xl text-slate-600 mb-2">payments</span>
              <p class="text-xs text-slate-400">No advances logged yet for this week.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- ─── TAB 2: DEDICATED ADVANCE HISTORY ─── -->
      <div v-if="activeTab === 'advances'" class="tab-panel max-w-6xl">
        <!-- Controls & Filters -->
        <div class="flex items-center justify-between flex-wrap gap-3 pb-4 mb-4 border-b border-white/10">
          <div>
            <h3 class="panel-heading m-0 flex items-center gap-2">
              <span class="material-symbols-rounded text-emerald-400">history_edu</span>
              Advance History & Audit Log
            </h3>
            <p class="text-xs text-slate-400 m-0">Detailed breakdown of operator advances and weekly payouts</p>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <input
              v-model="historySearch"
              type="text"
              placeholder="Search by operator..."
              class="bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-400 w-48"
            />
            <select v-model="historyWeek" class="week-select bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none">
              <option v-for="week in availableWeeks" :key="week" :value="week">{{ week }}</option>
            </select>
          </div>
        </div>

        <!-- KPI Strip for Advances -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <div class="p-3 bg-slate-900/60 border border-white/5 rounded-xl flex items-center gap-3">
            <div class="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <span class="material-symbols-rounded text-xl">payments</span>
            </div>
            <div>
              <p class="text-[0.7rem] text-slate-400 uppercase font-bold m-0">Total Advances ({{ historyWeek }})</p>
              <p class="text-lg font-black text-white m-0 font-mono">{{ totalAdvanceHistoryAmount.toFixed(2) }} ETB</p>
            </div>
          </div>

          <div class="p-3 bg-slate-900/60 border border-white/5 rounded-xl flex items-center gap-3">
            <div class="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <span class="material-symbols-rounded text-xl">group</span>
            </div>
            <div>
              <p class="text-[0.7rem] text-slate-400 uppercase font-bold m-0">Recipients</p>
              <p class="text-lg font-black text-white m-0">{{ uniqueAdvanceRecipients }} workers</p>
            </div>
          </div>

          <div class="p-3 bg-slate-900/60 border border-white/5 rounded-xl flex items-center gap-3">
            <div class="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
              <span class="material-symbols-rounded text-xl">analytics</span>
            </div>
            <div>
              <p class="text-[0.7rem] text-slate-400 uppercase font-bold m-0">Average Advance</p>
              <p class="text-lg font-black text-white m-0 font-mono">{{ averageAdvance.toFixed(2) }} ETB</p>
            </div>
          </div>
        </div>

        <!-- Top Recipients Progress Chart -->
        <div class="chart-container mb-5" v-if="advanceChartData.length">
          <h4 class="text-xs font-bold uppercase tracking-wider text-indigo-300 mb-3">Top Advance Recipients ({{ historyWeek }})</h4>
          <div v-for="item in advanceChartData" :key="item.operator" class="chart-row">
            <div class="flex justify-between text-xs font-bold text-slate-300 mb-1">
              <span>{{ item.operator }}</span>
              <span class="font-mono text-amber-400">{{ item.totalAmount.toFixed(2) }} ETB</span>
            </div>
            <div class="chart-bar-wrap">
              <div class="chart-bar" :style="{ width: item.percentage + '%' }"></div>
            </div>
          </div>
        </div>

        <!-- Advance History Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-white/10 text-[0.7rem] uppercase tracking-wider text-slate-400">
                <th class="py-2.5 px-3">Date & Time</th>
                <th class="py-2.5 px-3">Beneficiary</th>
                <th class="py-2.5 px-3">Reason / Description</th>
                <th class="py-2.5 px-3 text-right">Amount</th>
                <th class="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5 text-xs text-slate-300">
              <tr v-for="adv in advanceHistoryList" :key="adv.id" class="hover:bg-white/[0.02]">
                <td class="py-2.5 px-3 font-mono text-slate-400">{{ fmtDateTime(adv.timestamp || adv.transactionDate) }}</td>
                <td class="py-2.5 px-3">
                  <div class="flex items-center gap-2">
                    <OperatorAvatar :name="adv.operator" size="sm" />
                    <span class="font-bold text-white">{{ adv.operator }}</span>
                  </div>
                </td>
                <td class="py-2.5 px-3 text-slate-300">{{ adv.note || 'Weekly Advance' }}</td>
                <td class="py-2.5 px-3 text-right font-bold text-amber-400 font-mono">{{ Number(adv.amount).toFixed(2) }} ETB</td>
                <td class="py-2.5 px-3 text-center">
                  <span
                    class="text-[0.65rem] font-bold uppercase px-2 py-0.5 rounded-full"
                    :class="adv.type === 'advance' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : (adv.type === 'pending_advance' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20')"
                  >
                    {{ adv.type.replace('_', ' ') }}
                  </span>
                </td>
              </tr>
              <tr v-if="!advanceHistoryList.length">
                <td colspan="5" class="py-8 text-center text-slate-500">No advances found for this period.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ─── TAB 3: DEDICATED LOAN PORTFOLIO ─── -->
      <div v-if="activeTab === 'loans'" class="tab-panel max-w-6xl">
        <!-- Controls & Filters -->
        <div class="flex items-center justify-between flex-wrap gap-3 pb-4 mb-4 border-b border-white/10">
          <div>
            <h3 class="panel-heading m-0 flex items-center gap-2">
              <span class="material-symbols-rounded text-purple-400">account_balance</span>
              Loan Portfolio & Installment Schedules
            </h3>
            <p class="text-xs text-slate-400 m-0">Installment debt balances and weekly repayment tracking</p>
          </div>

          <div class="flex items-center gap-2">
            <select v-model="historyWeek" class="week-select bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none">
              <option v-for="week in availableWeeks" :key="week" :value="week">{{ week }}</option>
            </select>
          </div>
        </div>

        <!-- KPI Strip for Loans -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <div class="p-3 bg-slate-900/60 border border-white/5 rounded-xl flex items-center gap-3">
            <div class="p-2.5 rounded-lg bg-purple-500/10 text-purple-400">
              <span class="material-symbols-rounded text-xl">account_balance_wallet</span>
            </div>
            <div>
              <p class="text-[0.7rem] text-slate-400 uppercase font-bold m-0">Principal Issued</p>
              <p class="text-lg font-black text-white m-0 font-mono">{{ totalLoanPrincipal.toFixed(2) }} ETB</p>
            </div>
          </div>

          <div class="p-3 bg-slate-900/60 border border-white/5 rounded-xl flex items-center gap-3">
            <div class="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
              <span class="material-symbols-rounded text-xl">pending</span>
            </div>
            <div>
              <p class="text-[0.7rem] text-slate-400 uppercase font-bold m-0">Active Outstanding Debt</p>
              <p class="text-lg font-black text-amber-400 m-0 font-mono">{{ totalLoanRemaining.toFixed(2) }} ETB</p>
            </div>
          </div>

          <div class="p-3 bg-slate-900/60 border border-white/5 rounded-xl flex items-center gap-3">
            <div class="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <span class="material-symbols-rounded text-xl">price_check</span>
            </div>
            <div>
              <p class="text-[0.7rem] text-slate-400 uppercase font-bold m-0">Weekly Installments</p>
              <p class="text-lg font-black text-emerald-400 m-0 font-mono">{{ totalWeeklyInstallments.toFixed(2) }} ETB/wk</p>
            </div>
          </div>
        </div>

        <!-- Loans Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-white/10 text-[0.7rem] uppercase tracking-wider text-slate-400">
                <th class="py-2.5 px-3">Issued Date</th>
                <th class="py-2.5 px-3">Borrower</th>
                <th class="py-2.5 px-3 text-right">Principal</th>
                <th class="py-2.5 px-3 text-right">Total Debt</th>
                <th class="py-2.5 px-3 text-right">Weekly Installment</th>
                <th class="py-2.5 px-3 text-right">Remaining Balance</th>
                <th class="py-2.5 px-3 text-center">Weeks Left</th>
                <th class="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5 text-xs text-slate-300">
              <tr v-for="loan in loanHistoryList" :key="loan.id" class="hover:bg-white/[0.02]">
                <td class="py-2.5 px-3 font-mono text-slate-400">{{ fmtDate(loan.issuedAt) }}</td>
                <td class="py-2.5 px-3">
                  <div class="flex items-center gap-2">
                    <OperatorAvatar :name="getOperatorName(loan.workerId)" size="sm" />
                    <span class="font-bold text-white">{{ getOperatorName(loan.workerId) }}</span>
                  </div>
                </td>
                <td class="py-2.5 px-3 text-right font-mono">{{ Number(loan.amount).toFixed(2) }} ETB</td>
                <td class="py-2.5 px-3 text-right font-mono text-slate-300">{{ Number(loan.totalDebt).toFixed(2) }} ETB</td>
                <td class="py-2.5 px-3 text-right font-mono text-indigo-400 font-bold">{{ Number(loan.weeklyInstallment).toFixed(2) }} ETB</td>
                <td class="py-2.5 px-3 text-right font-mono text-amber-400 font-black">{{ Number(loan.remainingBalance).toFixed(2) }} ETB</td>
                <td class="py-2.5 px-3 text-center font-bold">{{ loan.weeksRemaining }} wks</td>
                <td class="py-2.5 px-3 text-center">
                  <span
                    class="text-[0.65rem] font-bold uppercase px-2 py-0.5 rounded-full"
                    :class="loan.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : (loan.status === 'closed' ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20')"
                  >
                    {{ loan.status }}
                  </span>
                </td>
              </tr>
              <tr v-if="!loanHistoryList.length">
                <td colspan="8" class="py-8 text-center text-slate-500">No installment loans recorded.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ─── TAB 4: PENDING APPROVALS TAB ─── -->
      <div v-if="activeTab === 'pending'" class="tab-panel approvals-panel max-w-4xl">
        <div class="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
          <h3 class="panel-heading m-0 flex items-center gap-2">
            <span class="material-symbols-rounded text-amber-400">pending_actions</span>
            Pending Approval Requests ({{ pendingCount }})
          </h3>
        </div>

        <div class="pending-list space-y-3">
          <!-- Pending Payment Requests (Advances) -->
          <div v-for="adv in pendingAdvances" :key="'adv-'+adv.id" class="pending-item">
            <div class="pending-info">
              <span class="material-symbols-rounded icon-adv">payments</span>
              <div>
                <p class="p-title">Payment Request (Advance) • <strong>{{ adv.amount }} ETB</strong></p>
                <p class="p-sub">
                  Requested by: <strong>{{ adv.operator }}</strong> 
                  (Efficiency: <strong :class="getEfficiencyColor(getOperatorEfficiencyByName(adv.operator))">{{ getOperatorEfficiencyByName(adv.operator) }}%</strong>) 
                  | Reason: {{ adv.note || 'Weekly Advance' }}
                </p>
              </div>
            </div>
            <div class="pending-actions">
              <button class="btn-approve cursor-pointer" @click="handleApproveAdvance(adv.id)" title="Approve Request">
                <span class="material-symbols-rounded">check</span>
              </button>
              <button class="btn-reject cursor-pointer" @click="handleRejectAdvance(adv.id)" title="Reject Request">
                <span class="material-symbols-rounded">close</span>
              </button>
            </div>
          </div>

          <!-- Pending Loans -->
          <div v-for="loan in pendingLoans" :key="'loan-'+loan.id" class="pending-item">
            <div class="pending-info">
              <span class="material-symbols-rounded icon-loan">account_balance</span>
              <div>
                <p class="p-title">Installment Loan Request • <strong>{{ loan.amount }} ETB</strong></p>
                <p class="p-sub">
                  Requested by: <strong>{{ getOperatorName(loan.workerId) }}</strong> 
                  (Efficiency: <strong :class="getEfficiencyColor(getOperatorEfficiency(loan.workerId))">{{ getOperatorEfficiency(loan.workerId) }}%</strong>)
                </p>
              </div>
            </div>
            <div class="pending-actions">
              <button class="btn-approve cursor-pointer" @click="handleApproveLoan(loan.id)" title="Approve Loan">
                <span class="material-symbols-rounded">check</span>
              </button>
              <button class="btn-reject cursor-pointer" @click="handleRejectLoan(loan.id)" title="Reject Loan">
                <span class="material-symbols-rounded">close</span>
              </button>
            </div>
          </div>
          
          <div v-if="pendingCount === 0" class="empty-state">
            <span class="material-symbols-rounded text-3xl text-emerald-500 mb-2">check_circle</span>
            <p>No pending approvals right now.</p>
          </div>
        </div>
      </div>
    </main>

    <!-- Admin PIN Modal -->
    <PinModal
      v-if="adminPin.show"
      title="Admin Authorization"
      :subtitle="adminPin.action"
      icon="admin_panel_settings"
      icon-color="#f59e0b"
      confirm-label="Authorize"
      confirm-color="linear-gradient(135deg,#d97706,#f59e0b)"
      :error-msg="adminPin.error"
      :loading="adminPin.loading"
      @confirm="executeAdminAction"
      @cancel="adminPin.show = false"
    />

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toast.visible" class="toast">
        <span class="material-symbols-rounded">check_circle</span>
        {{ toast.message }}
      </div>
    </Transition>
  </AppLayout>
</template>

<script setup>
// Developer: Mintesnot Abebe | Brand: dev MinteIO
import AppLayout from '@/components/layout/AppLayout.vue'
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue'
import VirtualNumpad from '@/components/ui/VirtualNumpad.vue'
import PinModal from '@/components/ui/PinModal.vue'
import OperatorAvatar from '@/components/ui/OperatorAvatar.vue'
import { useMesStore } from '@/store/mesStore.js'
import { usePayrollStore } from '@/store/payrollStore.js'
import { useSystemAuthStore } from '@/store/systemAuthStore.js'

const store = useMesStore()
const payrollStore = usePayrollStore()
const sysAuth = useSystemAuthStore()

const activeTab = ref('new')
const isSyncing = ref(false)
let refreshTimer = null

const entryType   = ref('advance')
const selectedOp  = ref(null)
const inputAmount = ref('')
const note        = ref('Weekly Advance')
const customNote  = ref('')

const presets = [50, 100, 200, 500, 1000]
const advanceNoteOptions = ['Weekly Advance', 'Emergency / Medical', 'Transport', 'Bonus', 'Other']
const expenseNoteOptions = ['Petty Cash', 'Station Materials', 'Equipment Maintenance', 'Transport / Fuel', 'Other']

async function manualSync() {
  isSyncing.value = true
  try {
    await Promise.all([
      store.fetchInitialData(),
      payrollStore.fetchLoans()
    ])
  } finally {
    setTimeout(() => { isSyncing.value = false }, 400)
  }
}

onMounted(async () => {
  await Promise.all([
    store.fetchInitialData(),
    payrollStore.fetchLoans()
  ])

  refreshTimer = setInterval(async () => {
    await Promise.all([
      store.fetchInitialData(),
      payrollStore.fetchLoans()
    ])
  }, 30000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})

const canSubmit = computed(() =>
  inputAmount.value !== '' &&
  Number(inputAmount.value) > 0 &&
  (entryType.value === 'expense' || selectedOp.value !== null)
)

const toast = reactive({ visible: false, message: '' })
let toastTimer = null

function showToast(msg) {
  toast.message = msg
  toast.visible = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.visible = false }, 2500)
}

const isSaving = ref(false)

async function submitEntry() {
  if (!canSubmit.value || isSaving.value) return
  isSaving.value = true
  const finalNote = customNote.value.trim() || note.value
  const opId = entryType.value === 'advance' ? (selectedOp.value?.id ? Number(selectedOp.value.id) : null) : null
  const opName = entryType.value === 'advance' ? (selectedOp.value?.name ?? 'Unknown') : 'Company'

  const ok = await store.addCashEntry({
    type:        entryType.value,
    amount:      Number(inputAmount.value),
    operator:    opName,
    operator_id: opId,
    note:        finalNote,
  })
  isSaving.value = false
  if (ok !== false) {
    showToast(`✓ ${entryType.value === 'advance' ? 'Advance' : 'Expense'} of ${inputAmount.value} ETB logged`)
    inputAmount.value = ''
    customNote.value = ''
  } else {
    showToast('⚠ Failed to save. Check connection.')
  }
}

// ─── Live advances for this week ─────────────────────────────────────────────
const liveAdvancesThisWeek = computed(() => {
  return (store.cashEntries || [])
    .filter(e => {
      const isAdv = e.type === 'advance' || e.type === 'pending_advance' || e.type === 'rejected_advance'
      return isAdv && (!e.week || e.week === store.currentProductionWeek)
    })
    .slice()
    .sort((a, b) => new Date(b.timestamp || b.transactionDate) - new Date(a.timestamp || a.transactionDate))
})

// ─── Pending Approvals ───────────────────────────────────────────────────────
const pendingLoans = computed(() => payrollStore.loans.filter(l => l.status === 'pending'))
const pendingAdvances = computed(() => store.cashEntries.filter(e => e.type === 'pending_advance'))
const pendingCount = computed(() => pendingLoans.value.length + pendingAdvances.value.length)

function getOperatorName(id) {
  return store.operators.find(o => Number(o.id) === Number(id))?.name || 'Unknown'
}

function getOperatorEfficiency(id) {
  const stat = store.operatorEfficiency.find(o => Number(o.id) === Number(id))
  if (!stat) return 0
  return (100 - stat.wastePercent).toFixed(1)
}

function getOperatorEfficiencyByName(name) {
  const stat = store.operatorEfficiency.find(o => o.name === name)
  if (!stat) return 0
  return (100 - stat.wastePercent).toFixed(1)
}

function getEfficiencyColor(eff) {
  const v = Number(eff)
  if (v >= 90) return 'text-green-400'
  if (v >= 80) return 'text-yellow-400'
  return 'text-red-400'
}

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

function fmtDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// ─── Admin PIN Authorization ────────────────────────────────────────────────
const adminPin = reactive({
  show: false, action: '', pendingFn: null,
  error: '', loading: false
})

function requireAdminPin(actionLabel, fn) {
  adminPin.action = actionLabel
  adminPin.pendingFn = fn
  adminPin.error = ''
  adminPin.loading = false
  adminPin.show = true
}

async function executeAdminAction(pin) {
  const adminRoles = ['admin', 'System Admin', 'manager', 'Supervisor']
  const admin = store.operators.find(o => String(o.pin_code) === String(pin) && adminRoles.includes(o.role))
  const sysAuthCheck = await sysAuth.verifyPin(pin, 'admin')

  if (!admin && !sysAuthCheck.success) {
    adminPin.error = 'Invalid Admin PIN. Try again.'
    return
  }
  adminPin.loading = true
  await adminPin.pendingFn()
  adminPin.loading = false
  adminPin.show = false
}

async function handleApproveLoan(id) {
  requireAdminPin('Approve loan request', async () => {
    await payrollStore.approveLoan(id)
    showToast('✓ Loan approved')
  })
}
async function handleRejectLoan(id) {
  requireAdminPin('Reject loan request', async () => {
    await payrollStore.rejectLoan(id)
    showToast('✓ Loan rejected')
  })
}
async function handleApproveAdvance(id) {
  requireAdminPin('Approve payment request', async () => {
    await store.approveCashEntry(id)
    showToast('✓ Payment request approved')
  })
}
async function handleRejectAdvance(id) {
  requireAdminPin('Reject payment request', async () => {
    await store.rejectCashEntry(id)
    showToast('✓ Advance rejected')
  })
}

// ─── History Logic ──────────────────────────────────────────────────────────
const availableWeeks = computed(() => {
  const set = new Set([store.currentProductionWeek])
  store.ledgerEntries.forEach(e => { if (e.week) set.add(e.week) })
  store.cashEntries.forEach(e => { if (e.week) set.add(e.week) })
  payrollStore.loans.forEach(l => { if (l.week) set.add(l.week) })
  return Array.from(set).sort().reverse()
})

const historyWeek = ref(store.currentProductionWeek)
const historySearch = ref('')

// ─── Advance History ────────────────────────────────────────────────────────
const advanceHistoryList = computed(() => {
  return (store.cashEntries || [])
    .filter(e => {
      const isAdv = e.type === 'advance' || e.type === 'pending_advance' || e.type === 'rejected_advance'
      const matchWeek = !historyWeek.value || e.week === historyWeek.value
      const matchSearch = !historySearch.value || (e.operator && e.operator.toLowerCase().includes(historySearch.value.toLowerCase()))
      return isAdv && matchWeek && matchSearch
    })
    .slice()
    .sort((a, b) => new Date(b.timestamp || b.transactionDate) - new Date(a.timestamp || a.transactionDate))
})

const totalAdvanceHistoryAmount = computed(() => {
  return advanceHistoryList.value
    .filter(e => e.type === 'advance')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
})

const uniqueAdvanceRecipients = computed(() => {
  const set = new Set(advanceHistoryList.value.filter(e => e.type === 'advance').map(e => e.operator))
  return set.size
})

const averageAdvance = computed(() => {
  const approved = advanceHistoryList.value.filter(e => e.type === 'advance')
  if (!approved.length) return 0
  return (totalAdvanceHistoryAmount.value / approved.length)
})

const advanceChartData = computed(() => {
  const map = {}
  advanceHistoryList.value.filter(e => e.type === 'advance').forEach(e => {
    map[e.operator] = (map[e.operator] || 0) + Number(e.amount || 0)
  })
  const max = Math.max(0, ...Object.values(map))
  return Object.entries(map)
    .map(([operator, totalAmount]) => ({
      operator,
      totalAmount,
      percentage: max > 0 ? (totalAmount / max) * 100 : 0
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 5)
})

// ─── Loan Portfolio ─────────────────────────────────────────────────────────
const loanHistoryList = computed(() => {
  return (payrollStore.loans || [])
    .filter(l => {
      const matchWeek = !historyWeek.value || l.week === historyWeek.value
      return matchWeek
    })
    .slice()
    .sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt))
})

const totalLoanPrincipal = computed(() => {
  return loanHistoryList.value.reduce((sum, l) => sum + (Number(l.amount) || 0), 0)
})

const totalLoanRemaining = computed(() => {
  return loanHistoryList.value.filter(l => l.status === 'active').reduce((sum, l) => sum + (Number(l.remainingBalance) || 0), 0)
})

const totalWeeklyInstallments = computed(() => {
  return loanHistoryList.value.filter(l => l.status === 'active').reduce((sum, l) => sum + (Number(l.weeklyInstallment) || 0), 0)
})
</script>

<style scoped>
.cash-main {
  width: 100%; height: 100%; overflow-y: auto;
  padding: 1.25rem 1.5rem; background: #0f172a;
  display: flex; flex-direction: column; gap: 1rem;
}

.settings-top-nav {
  border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 0.75rem;
}
.snav-item {
  display: flex; align-items: center; gap: 0.4rem;
  background: #1e293b; border: 1px solid rgba(255,255,255,0.08);
  color: #94a3b8; font-size: 0.75rem; font-weight: 700;
  padding: 0.45rem 0.9rem; border-radius: 0.5rem; cursor: pointer; transition: all 0.15s;
}
.snav-item:hover { color: #f1f5f9; }
.snav-item--active { background: #6366f1; border-color: #6366f1; color: #fff; }
.snav-icon { font-size: 1rem; }
.badge {
  background: #ef4444; color: #fff; font-size: 0.65rem; font-weight: 800;
  padding: 0.1rem 0.4rem; border-radius: 999px; margin-left: 0.2rem;
}
.badge--info { background: rgba(245,158,11,0.2); color: #fbbf24; border: 1px solid rgba(245,158,11,0.3); }
.badge--purple { background: rgba(168,85,247,0.2); color: #c084fc; border: 1px solid rgba(168,85,247,0.3); }

.sync-btn {
  display: flex; align-items: center; gap: 0.35rem;
  background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.3);
  color: #a5b4fc; border-radius: 0.5rem; padding: 0.45rem 0.85rem;
  font-size: 0.75rem; font-weight: 700; transition: all 0.15s ease;
}
.sync-btn:hover { background: rgba(99,102,241,0.22); color: #fff; }
.spin-icon { animation: spin 0.8s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.tab-panel {
  background: #1e293b; border: 1px solid rgba(255,255,255,0.06);
  border-radius: 1rem; padding: 1.25rem; width: 100%; margin: 0 auto;
}

.presets-row { margin-bottom: 1rem; }
.presets-label, .note-label {
  font-size: 0.7rem; font-weight: 700; color: #94a3b8; text-transform: uppercase;
  letter-spacing: 0.05em; margin: 0 0 0.4rem;
}
.presets { display: flex; gap: 0.4rem; flex-wrap: wrap; }
.preset-btn {
  background: #0f172a; border: 1px solid rgba(255,255,255,0.08);
  color: #f1f5f9; font-size: 0.75rem; font-weight: 800; font-family: monospace;
  padding: 0.4rem 0.75rem; border-radius: 0.45rem; transition: all 0.15s;
}
.preset-btn:hover { border-color: #f59e0b; color: #fbbf24; }

.cash-numpad { margin-bottom: 1rem; display: flex; justify-content: center; }

.note-chips { display: flex; gap: 0.35rem; flex-wrap: wrap; }
.note-chip {
  background: #0f172a; border: 1px solid rgba(255,255,255,0.06);
  color: #94a3b8; font-size: 0.7rem; font-weight: 700;
  padding: 0.35rem 0.65rem; border-radius: 0.4rem; transition: all 0.15s;
}
.note-chip:hover { color: #f1f5f9; }
.note-chip--active { background: rgba(99,102,241,0.2); border-color: #6366f1; color: #a5b4fc; }

.submit-btn {
  width: 100%; height: 3.25rem; background: linear-gradient(135deg, #10b981, #059669);
  border: none; border-radius: 0.75rem; color: #fff;
  font-size: 0.95rem; font-weight: 900; letter-spacing: 0.05em;
  display: flex; align-items: center; justify-content: center; gap: 0.4rem;
  transition: all 0.15s; box-shadow: 0 4px 15px rgba(16,185,129,0.25);
}
.submit-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
.submit-btn:disabled { background: #334155; color: #64748b; cursor: not-allowed; box-shadow: none; transform: none; }

.panel-heading { font-size: 1rem; font-weight: 800; color: #f1f5f9; margin: 0 0 1rem; }

.pending-list { display: flex; flex-direction: column; gap: 0.5rem; }
.pending-item {
  display: flex; align-items: center; justify-content: space-between;
  background: #0f172a; border: 1px solid rgba(255,255,255,0.05);
  border-radius: 0.75rem; padding: 0.85rem 1rem;
}
.pending-info { display: flex; align-items: center; gap: 0.75rem; }
.icon-loan { color: #fbbf24; font-size: 1.4rem; }
.icon-adv  { color: #34d399; font-size: 1.4rem; }
.p-title { font-size: 0.82rem; color: #f1f5f9; margin: 0; }
.p-sub   { font-size: 0.68rem; color: #64748b; margin: 0.15rem 0 0; }

.pending-actions { display: flex; gap: 0.4rem; }
.btn-approve, .btn-reject {
  width: 2.25rem; height: 2.25rem; border-radius: 0.5rem; border: none;
  display: flex; align-items: center; justify-content: center; transition: all 0.15s;
}
.btn-approve { background: #10b981; color: #fff; }
.btn-reject  { background: rgba(239,68,68,0.2); border: 1px solid rgba(239,68,68,0.4); color: #f87171; }
.btn-approve:hover { filter: brightness(1.1); }
.btn-reject:hover  { background: rgba(239,68,68,0.35); }

.empty-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 3rem 1rem; color: #64748b; font-size: 0.82rem;
}

.chart-container { background: #0f172a; padding: 1rem; border-radius: 0.75rem; }
.chart-row { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 0.5rem; }
.chart-bar-wrap { height: 8px; background: rgba(255,255,255,0.05); border-radius: 999px; overflow: hidden; }
.chart-bar { height: 100%; background: linear-gradient(90deg, #6366f1, #fbbf24); border-radius: 999px; transition: width 0.4s ease; }

.toast {
  position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%);
  background: rgba(16,185,129,0.95); color: #fff;
  padding: 0.75rem 1.5rem; border-radius: 0.75rem; font-weight: 700; font-size: 0.85rem;
  display: flex; align-items: center; gap: 0.4rem; box-shadow: 0 10px 25px rgba(0,0,0,0.5); z-index: 100;
}
.toast-enter-active, .toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 1rem); }
</style>

