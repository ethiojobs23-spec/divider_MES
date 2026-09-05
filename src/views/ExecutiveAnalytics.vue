<template>
  <AppLayout>
    <div class="analytics-root">

      <!-- ── LEFT NAV ── -->
      <aside class="view-nav">
        <p class="nav-heading">ANALYTICS</p>

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

        <button class="nav-tab sync-tab cursor-pointer" :disabled="isSyncing" @click="manualSync" title="Sync factory analytics now">
          <span class="material-symbols-rounded tab-icon" :class="{ 'spin-icon': isSyncing }">sync</span>
          <div class="tab-labels">
            <span class="tab-title">{{ isSyncing ? 'Syncing...' : 'Sync Factory' }}</span>
            <span class="tab-sub">Real-time refresh</span>
          </div>
        </button>

        <button class="export-btn" @click="exportTelegram">
          <span class="material-symbols-rounded">send</span>
          Export to Frezer
        </button>
      </aside>

      <!-- ── MAIN AREA ── -->
      <main class="view-area">

        <!-- ══════ VIEW A: Global Factory Overview ════════════════════════ -->
        <Transition name="view-fade" mode="out-in">
        <section v-if="activeView === 'global'" class="view-panel" key="global">

          <div class="panel-header flex justify-between items-start flex-wrap gap-2">
            <div>
              <div class="flex items-center gap-2">
                <h2 class="panel-title">Global Factory Overview</h2>
                <span 
                  class="text-[0.65rem] font-black uppercase px-2 py-0.5 rounded-full"
                  :style="{
                    background: store.weekStatus?.isCurrent ? 'rgba(16,185,129,0.15)' : store.weekStatus?.isPast ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.15)',
                    color: store.weekStatus?.isCurrent ? '#34d399' : store.weekStatus?.isPast ? '#fbbf24' : '#a5b4fc',
                    border: '1px solid ' + (store.weekStatus?.isCurrent ? 'rgba(16,185,129,0.3)' : store.weekStatus?.isPast ? 'rgba(245,158,11,0.3)' : 'rgba(99,102,241,0.3)')
                  }"
                >
                  ● {{ store.weekStatus?.label }}
                </span>
              </div>
              <p class="panel-sub">{{ store.currentProductionWeek }} ({{ store.weekStatus?.dateRange }}) · All operators · All variants</p>
            </div>
            <div class="flex items-center gap-1.5 bg-slate-800/80 p-1.5 rounded-xl border border-white/10">
              <button 
                @click="store.shiftProductionWeek(-1)"
                class="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 flex items-center justify-center cursor-pointer transition-all active:scale-95"
                title="Previous Week"
              >
                <span class="material-symbols-rounded text-sm">chevron_left</span>
              </button>
              <span class="text-xs font-mono font-bold text-slate-200 px-2">{{ store.currentProductionWeek }}</span>
              <button 
                @click="store.shiftProductionWeek(1)"
                class="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 flex items-center justify-center cursor-pointer transition-all active:scale-95"
                title="Next Week"
              >
                <span class="material-symbols-rounded text-sm">chevron_right</span>
              </button>
              <button 
                v-if="!store.weekStatus?.isCurrent"
                @click="store.resetToCurrentWeek()"
                class="px-2.5 py-1 rounded-lg text-[0.7rem] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 transition-all flex items-center gap-1 cursor-pointer active:scale-95 ml-1"
                title="Return to current active calendar week"
              >
                <span class="material-symbols-rounded text-xs">restart_alt</span>
                Live Week
              </button>

              <button class="sync-btn cursor-pointer ml-1" :disabled="isSyncing" @click="manualSync" title="Sync factory analytics now">
                <span class="material-symbols-rounded text-xs" :class="{ 'spin-icon': isSyncing }">sync</span>
                <span>{{ isSyncing ? 'Syncing...' : 'Sync' }}</span>
              </button>
            </div>
          </div>

          <!-- KPI Row -->
          <div class="kpi-grid">
            <AnalyticsDataCard
              title="Total Dividers Produced"
              :value="(store.totalGoodAllTime || 0).toLocaleString()"
              icon="factory"
              icon-bg="rgba(99,102,241,.15)"
              icon-color="#a5b4fc"
              :trend="null"
            />
            <AnalyticsDataCard
              title="Total Waste Units"
              :value="(store.totalWasteAllTime || 0).toLocaleString()"
              icon="delete_sweep"
              icon-bg="rgba(239,68,68,.12)"
              icon-color="#f87171"
              :trend="null"
              :trend-up-is-bad="true"
            />
            <AnalyticsDataCard
              title="Overall Waste Rate"
              :value="(store.overallWastePct || 0) + '%'"
              icon="percent"
              icon-bg="rgba(245,158,11,.12)"
              icon-color="#fbbf24"
              :trend="null"
              :trend-up-is-bad="true"
            />
            <AnalyticsDataCard
              title="Total Dispatched"
              :value="(store.totalDispatched || 0).toLocaleString() + ' units'"
              icon="local_shipping"
              icon-bg="rgba(16,185,129,.12)"
              icon-color="#34d399"
              :trend="null"
            />
            <AnalyticsDataCard
              title="Downtime Sessions"
              :value="(store.downtimeSessions?.length || 0) + ' sessions'"
              icon="timer_off"
              icon-bg="rgba(239,68,68,.12)"
              icon-color="#f87171"
              :trend="null"
              :trend-up-is-bad="true"
            />
            <AnalyticsDataCard
              title="Total Advances Issued"
              :value="'ETB ' + (store.totalAdvances || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })"
              icon="payments"
              icon-bg="rgba(139,92,246,.15)"
              icon-color="#c084fc"
              :trend="null"
            />
            <AnalyticsDataCard
              title="Total Payroll Liability"
              :value="'ETB ' + (totalPayrollLiability || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })"
              icon="account_balance_wallet"
              icon-bg="rgba(245,158,11,.12)"
              icon-color="#fbbf24"
              :trend="null"
            />
            <AnalyticsDataCard
              title="Active Operators"
              :value="(store.operators || []).filter(o => o.role !== 'customer').length + ' people'"
              icon="groups"
              icon-bg="rgba(99,102,241,.15)"
              icon-color="#a5b4fc"
              :trend="null"
            />
          </div>

          <!-- 7-Day Production Bar Chart -->
          <div class="chart-card" style="flex:1; min-height:0">
            <div class="card-hdr">
              <span class="material-symbols-rounded" style="color:#6366f1">trending_up</span>
              <div>
                <p class="card-hdr-title">7-Day Production Trend</p>
                <p class="card-hdr-sub">Good output (indigo) vs. waste (red) – current week</p>
              </div>
              <div class="badge">{{ store.currentProductionWeek }}</div>
            </div>
            <div class="bar-chart" v-if="sevenDayTrend.length > 0">
              <div v-for="day in sevenDayTrend" :key="day.label" class="bar-col">
                <div class="bar-col-inner">
                  <div class="bar-seg bar-seg--waste" :style="{ height: barH(day.waste) + '%' }" :title="`Waste: ${day.waste}`" />
                  <div class="bar-seg bar-seg--good"  :style="{ height: barH(day.good)  + '%' }" :title="`Good: ${day.good}`" />
                </div>
                <div class="bar-values">
                  <span class="bv-good">{{ day.good }}</span>
                  <span class="bv-waste">{{ day.waste }}</span>
                </div>
                <p class="bar-label">{{ day.label }}</p>
              </div>
            </div>
            <div v-else class="empty-chart">
              <span class="material-symbols-rounded" style="font-size:2.5rem; color:#334155;">bar_chart</span>
              <p>No production data yet for this week.</p>
            </div>
            <div class="chart-legend">
              <div class="leg-item"><span class="leg-dot" style="background:#6366f1"/>Good Production</div>
              <div class="leg-item"><span class="leg-dot" style="background:#ef4444"/>Waste Material</div>
            </div>
          </div>

        </section>
        </Transition>

        <!-- ══════ VIEW B: Employee Performance & Pay ═════════════════════ -->
        <Transition name="view-fade" mode="out-in">
        <section v-if="activeView === 'employee'" class="view-panel" key="employee">

          <div class="panel-header">
            <h2 class="panel-title">Employee Performance & Pay</h2>
            <p class="panel-sub">Real-time · from attendance + production data · {{ store.currentProductionWeek }}</p>
          </div>

          <div class="employee-layout flex flex-col md:flex-row" style="flex:1; overflow:hidden; gap:1rem;">

            <!-- Left: operator list -->
            <div class="operator-list" style="width:260px; flex-shrink:0; overflow-y:auto;">
              <div class="search-wrap">
                <span class="material-symbols-rounded search-icon">search</span>
                <input v-model="empSearch" class="search-input" placeholder="Search operator…" type="text" />
              </div>

              <button
                v-for="op in filteredOperators"
                :key="op.id"
                class="op-card"
                :class="{ 'op-card--active': selectedOpId === op.id }"
                @click="selectedOpId = op.id"
              >
                <OperatorAvatar :avatar="op.avatar" :name="op.name" :color="op.color" size="sm" />
                <div class="op-info">
                  <p class="op-name">{{ op.name }}</p>
                  <p class="op-role">{{ op.role }}</p>
                </div>
                <div class="op-quick">
                  <span class="quick-val">{{ op.good }}</span>
                  <span class="quick-lbl">units</span>
                </div>
              </button>

              <p v-if="filteredOperators.length === 0" class="empty-note">No operators found</p>
            </div>

            <!-- Right: detail profile -->
            <div class="profile-area" style="flex:1; overflow-y:auto;">
              <Transition name="profile-fade" mode="out-in">
                <div v-if="selectedProfile" class="profile-card" :key="selectedProfile.id">

                  <!-- Header -->
                  <div class="profile-hdr">
                    <OperatorAvatar :avatar="selectedProfile.avatar" :name="selectedProfile.name" :color="selectedProfile.color" size="xl" />
                    <div style="flex:1">
                      <h3 class="profile-name">{{ selectedProfile.name }}</h3>
                      <p class="profile-role">{{ selectedProfile.role }}</p>
                      <!-- Work Type Badges -->
                      <div style="display:flex; gap:.4rem; flex-wrap:wrap; margin-top:.4rem;">
                        <span
                          v-for="cat in (selectedProfile.work_types?.categories || ['MFG'])"
                          :key="cat"
                          style="font-size:.65rem; font-weight:800; padding:.2rem .5rem; border-radius:.4rem; text-transform:uppercase; background:rgba(99,102,241,.2); color:#a5b4fc; border:1px solid rgba(99,102,241,.4);"
                        >{{ cat }}</span>
                      </div>
                    </div>
                    <div
                      class="profile-badge"
                      :class="selectedProfile.wastePercent >= 15 ? 'badge--critical' : selectedProfile.wastePercent >= 8 ? 'badge--warn' : 'badge--ok'"
                    >
                      {{ selectedProfile.wastePercent }}% Waste
                    </div>
                  </div>

                  <!-- Stars & Attendance -->
                  <div class="metric-section" style="margin-top:1rem;">
                    <p class="section-title"><span class="material-symbols-rounded">star</span> Attendance Performance</p>
                    <div style="display:flex; align-items:center; gap:.75rem; flex-wrap:wrap;">
                      <div style="display:flex; gap:.2rem;">
                        <span v-for="s in 5" :key="s" class="material-symbols-rounded" style="font-size:1.4rem;" :style="{ color: s <= attScore(selectedProfile.id) ? '#f59e0b' : '#334155' }">star</span>
                      </div>
                      <span style="font-size:.8rem; color:#94a3b8;">{{ attLabel(attScore(selectedProfile.id)) }}</span>
                      <span style="font-size:.75rem; font-weight:700; color:#64748b;">· {{ attDays(selectedProfile.id) }}/{{ expectedDays }} days attended</span>
                    </div>
                  </div>

                  <!-- Metric blocks -->
                  <div class="metric-grid">

                    <!-- Production -->
                    <div class="metric-section">
                      <p class="section-title"><span class="material-symbols-rounded">factory</span> Production</p>
                      <div class="metric-row">
                        <div class="metric-item">
                          <span class="m-label">Units Produced</span>
                          <span class="m-value m-value--good">{{ selectedProfile.good.toLocaleString() }}</span>
                        </div>
                        <div class="metric-item">
                          <span class="m-label">Waste Units</span>
                          <span class="m-value m-value--bad">{{ selectedProfile.waste.toLocaleString() }}</span>
                        </div>
                        <div class="metric-item">
                          <span class="m-label">Waste %</span>
                          <span class="m-value">{{ selectedProfile.wastePercent }}%</span>
                        </div>
                      </div>
                      <div class="waste-bar-track">
                        <div
                          class="waste-bar-fill"
                          :class="selectedProfile.wastePercent >= 15 ? 'fill--critical' : selectedProfile.wastePercent >= 8 ? 'fill--warn' : 'fill--ok'"
                          :style="{ width: Math.min(100, selectedProfile.wastePercent) + '%' }"
                        />
                      </div>
                    </div>

                    <!-- Financials -->
                    <div class="metric-section metric-section--financial">
                      <p class="section-title"><span class="material-symbols-rounded">account_balance_wallet</span> Financials ({{ store.currentProductionWeek }})</p>
                      <div class="financial-rows">
                        <div class="fin-row">
                          <span class="fin-label">Gross Earnings</span>
                          <span class="fin-value">ETB {{ opEarnings(selectedProfile.id).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                        </div>
                        <div class="fin-row fin-row--deduct">
                          <span class="fin-label">Cash Advances</span>
                          <span class="fin-value fin-value--red">− ETB {{ opAdvances(selectedProfile.id).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                        </div>
                        <div class="fin-divider" />
                        <div class="fin-row fin-row--net">
                          <span class="fin-label-net">NET PAYOUT</span>
                          <span class="fin-value-net">ETB {{ Math.max(0, opEarnings(selectedProfile.id) - opAdvances(selectedProfile.id)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                        </div>
                      </div>
                    </div>

                  </div><!-- /metric-grid -->

                  <!-- Per-variant breakdown -->
                  <div class="variant-section">
                    <p class="section-title"><span class="material-symbols-rounded">category</span> Production by Variant</p>
                    <div class="variant-table">
                      <div class="vt-header">
                        <span>Variant</span><span>Size</span><span>Placement</span><span>Good</span><span>Waste</span><span>Rate (ETB)</span>
                      </div>
                      <div v-for="row in opVariantBreakdown(selectedProfile)" :key="row.key" class="vt-row">
                        <span class="vt-badge">{{ row.dividerType }}</span>
                        <span>{{ row.size }}</span>
                        <span>{{ row.placement }}</span>
                        <span class="vt-good">{{ row.good }}</span>
                        <span class="vt-waste">{{ row.waste }}</span>
                        <span class="vt-rate">ETB {{ row.rate.toFixed(2) }}</span>
                      </div>
                      <div v-if="!opVariantBreakdown(selectedProfile).length" class="vt-empty">No production entries this week</div>
                    </div>
                  </div>

                </div>
                <div v-else class="profile-empty" key="empty">
                  <span class="material-symbols-rounded pe-icon">person_search</span>
                  <p>Select an operator to view their profile</p>
                </div>
              </Transition>
            </div>

          </div><!-- /employee-layout -->
        </section>
        </Transition>

        <!-- ══════ VIEW C: Payroll Cost Analysis ══════════════════════════ -->
        <Transition name="view-fade" mode="out-in">
        <section v-if="activeView === 'payroll'" class="view-panel" key="payroll">

          <div class="panel-header">
            <h2 class="panel-title">Payroll Cost Analysis</h2>
            <p class="panel-sub">Labor cost per unit · Work-type breakdown · {{ store.currentProductionWeek }}</p>
          </div>

          <!-- Cost KPIs -->
          <div class="cpu-kpi-row flex flex-col md:flex-row gap-3 flex-shrink-0">
            <div class="cpu-kpi">
              <p class="cpu-label">Total Payroll Liability</p>
              <p class="cpu-value">ETB {{ totalPayrollLiability.toFixed(2) }}</p>
            </div>
            <div class="cpu-kpi">
              <p class="cpu-label">Total Good Production</p>
              <p class="cpu-value">{{ store.totalGoodAllTime.toLocaleString() }} units</p>
            </div>
            <div class="cpu-kpi cpu-kpi--highlight">
              <p class="cpu-label">Avg. Cost per Unit</p>
              <p class="cpu-value">
                ETB {{ store.totalGoodAllTime > 0
                  ? (totalPayrollLiability / store.totalGoodAllTime).toFixed(4)
                  : '—' }}
              </p>
            </div>
            <div class="cpu-kpi">
              <p class="cpu-label">Total Advances Issued</p>
              <p class="cpu-value" style="color:#f87171">ETB {{ store.totalAdvances.toFixed(2) }}</p>
            </div>
          </div>

          <!-- Per-operator cost table -->
          <div class="chart-card" style="flex:1; min-height:0; overflow:hidden; display:flex; flex-direction:column;">
            <div class="card-hdr">
              <span class="material-symbols-rounded" style="color:#c084fc">bar_chart</span>
              <div>
                <p class="card-hdr-title">Cost per Unit by Operator</p>
                <p class="card-hdr-sub">Gross Earnings ÷ Units Produced · Real data</p>
              </div>
            </div>

            <div class="cost-table-wrap overflow-x-auto" style="flex:1; overflow-y:auto;">
              <table class="cost-table">
                <thead>
                  <tr>
                    <th>Operator</th>
                    <th>Work Types</th>
                    <th>Units Produced</th>
                    <th>Gross (ETB)</th>
                    <th>Advances (ETB)</th>
                    <th>Net Payout (ETB)</th>
                    <th>Cost / Unit (ETB)</th>
                    <th>Bar</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in costAnalysisRows" :key="row.id">
                    <td>
                      <div class="op-cell">
                        <OperatorAvatar :avatar="row.avatar" :name="row.name" :color="row.color" size="sm" />
                        <span>{{ row.name }}</span>
                      </div>
                    </td>
                    <td>
                      <div style="display:flex; gap:.25rem; flex-wrap:wrap;">
                        <span
                          v-for="cat in (row.work_types?.categories || ['MFG'])"
                          :key="cat"
                          style="font-size:.6rem; font-weight:800; padding:.15rem .4rem; border-radius:.3rem; background:rgba(99,102,241,.15); color:#a5b4fc; border:1px solid rgba(99,102,241,.3);"
                        >{{ cat }}</span>
                      </div>
                    </td>
                    <td class="num">{{ row.good.toLocaleString() }}</td>
                    <td class="num">{{ row.gross.toFixed(2) }}</td>
                    <td class="num red">{{ row.advances.toFixed(2) }}</td>
                    <td class="num green">{{ row.net.toFixed(2) }}</td>
                    <td class="num purple">{{ row.good > 0 ? row.costPerUnit.toFixed(4) : '—' }}</td>
                    <td class="bar-cell">
                      <div class="cost-bar-track">
                        <div
                          class="cost-bar-fill"
                          :style="{ width: row.good > 0 ? Math.min(100, (row.costPerUnit / maxCostPerUnit) * 100) + '%' : '0%' }"
                        />
                      </div>
                    </td>
                  </tr>
                  <tr v-if="costAnalysisRows.length === 0">
                    <td colspan="8" class="empty-td">No payroll data — no production logged yet.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Weekly Period Breakdown -->
            <div class="week-breakdown">
              <p class="section-title" style="margin-bottom:.75rem">
                <span class="material-symbols-rounded">date_range</span> Weekly Period Breakdown
              </p>
              <div class="period-bars">
                <div v-for="(val, key) in store.weeklyAggregation" :key="key" class="period-item">
                  <div class="period-bar-wrap">
                    <div
                      class="period-bar"
                      :style="{ height: weekAggMax > 0 ? Math.max(6, (val / weekAggMax) * 100) + '%' : '6%' }"
                    />
                  </div>
                  <span class="period-val">{{ val }}</span>
                  <span class="period-label">{{ key }}</span>
                </div>
              </div>
            </div>

          </div>
        </section>
        </Transition>

        <!-- ══════ VIEW D: Inventory Status ══════════════════════════════ -->
        <Transition name="view-fade" mode="out-in">
        <section v-if="activeView === 'inventory'" class="view-panel" key="inventory">

          <div class="panel-header">
            <h2 class="panel-title">Inventory Health</h2>
            <p class="panel-sub">Raw materials · stock levels · alerts for items below 15%</p>
          </div>

          <div class="kpi-grid" style="grid-template-columns: repeat(4, 1fr);">
            <AnalyticsDataCard
              title="Total Materials Tracked"
              :value="inventoryStore.materials.length + ' items'"
              icon="category"
              icon-bg="rgba(99,102,241,.15)"
              icon-color="#a5b4fc"
              :trend="null"
            />
            <AnalyticsDataCard
              title="Low Stock Alerts"
              :value="inventoryStore.lowStockAlerts.length + ' items'"
              icon="warning"
              icon-bg="rgba(239,68,68,.12)"
              icon-color="#f87171"
              :trend="null"
              :trend-up-is-bad="true"
            />
            <AnalyticsDataCard
              title="Total Withdrawals"
              :value="inventoryStore.transactions.filter(t => t.transaction_type === 'OUT').length + ' logs'"
              icon="outbox"
              icon-bg="rgba(245,158,11,.12)"
              icon-color="#fbbf24"
              :trend="null"
            />
            <AnalyticsDataCard
              title="Total Receipts"
              :value="inventoryStore.transactions.filter(t => t.transaction_type === 'IN').length + ' logs'"
              icon="inventory"
              icon-bg="rgba(16,185,129,.12)"
              icon-color="#34d399"
              :trend="null"
            />
          </div>

          <div class="chart-card" style="flex:1; min-height:0; overflow-y:auto;">
            <div class="card-hdr">
              <span class="material-symbols-rounded" style="color:#a5b4fc">inventory_2</span>
              <div>
                <p class="card-hdr-title">Material Stock Levels</p>
                <p class="card-hdr-sub">Items below 15% capacity are highlighted in red</p>
              </div>
            </div>
            <div style="display:flex; flex-direction:column; gap:.75rem; overflow-y:auto;">
              <div v-for="mat in inventoryStore.materials" :key="mat.id" class="inv-row" :class="isLowStock(mat) ? 'inv-row--danger' : ''">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:.4rem;">
                  <div style="display:flex; align-items:center; gap:.6rem;">
                    <span class="material-symbols-rounded" style="font-size:1.1rem;" :style="{ color: isLowStock(mat) ? '#f87171' : '#6366f1' }">category</span>
                    <span style="font-weight:700; color:#f8fafc;">{{ mat.name }}</span>
                    <span v-if="isLowStock(mat)" style="font-size:.6rem; font-weight:800; background:#e11d48; color:#fff; padding:.15rem .4rem; border-radius:.3rem; text-transform:uppercase;">⚠ Low Stock</span>
                  </div>
                  <span style="font-size:.9rem; font-weight:700; font-family:monospace;" :style="{ color: isLowStock(mat) ? '#f87171' : '#f8fafc' }">
                    {{ (Number(mat.current_stock) || 0).toFixed(1) }} / {{ mat.max_capacity }} {{ mat.unit }}
                  </span>
                </div>
                <div class="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full"
                    :class="isLowStock(mat) ? 'bg-rose-500' : 'bg-indigo-500'"
                    :style="{ width: Math.min(100, ((mat.current_stock || 0) / (mat.max_capacity || 1)) * 100) + '%', height:'6px', transition:'width 0.5s ease' }"
                  ></div>
                </div>
                <p style="font-size:.65rem; color:#64748b; margin-top:.25rem; font-weight:600;">
                  {{ Math.min(100, ((mat.current_stock || 0) / (mat.max_capacity || 1)) * 100).toFixed(0) }}% remaining · Alert threshold: 15%
                </p>
              </div>
              <div v-if="inventoryStore.materials.length === 0" class="empty-chart">
                <span class="material-symbols-rounded" style="font-size:2.5rem; color:#334155;">inventory_2</span>
                <p>No materials tracked yet.</p>
              </div>
            </div>
          </div>

        </section>
        </Transition>

        <!-- ══════ VIEW E: Dispatch & Customers ══════════════════════════ -->
        <Transition name="view-fade" mode="out-in">
        <section v-if="activeView === 'dispatch'" class="view-panel" key="dispatch">

          <div class="panel-header">
            <h2 class="panel-title">Dispatch & Customers</h2>
            <p class="panel-sub">Total dispatched per customer · logistics overview</p>
          </div>

          <div class="kpi-grid" style="grid-template-columns: repeat(4, 1fr);">
            <AnalyticsDataCard
              title="Total Dispatched"
              :value="store.totalDispatched.toLocaleString() + ' units'"
              icon="local_shipping"
              icon-bg="rgba(16,185,129,.12)"
              icon-color="#34d399"
              :trend="null"
            />
            <AnalyticsDataCard
              title="Total Customers"
              :value="store.clients.length + ' clients'"
              icon="group"
              icon-bg="rgba(99,102,241,.15)"
              icon-color="#a5b4fc"
              :trend="null"
            />
            <AnalyticsDataCard
              title="Dispatch Entries"
              :value="store.dispatchLogs.length + ' logs'"
              icon="receipt_long"
              icon-bg="rgba(245,158,11,.12)"
              icon-color="#fbbf24"
              :trend="null"
            />
            <AnalyticsDataCard
              title="Total Expenses"
              :value="'ETB ' + store.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })"
              icon="receipt"
              icon-bg="rgba(239,68,68,.12)"
              icon-color="#f87171"
              :trend="null"
            />
          </div>

          <div class="chart-card" style="flex:1; min-height:0; overflow:hidden; display:flex; flex-direction:column;">
            <div class="card-hdr">
              <span class="material-symbols-rounded" style="color:#34d399">local_shipping</span>
              <div>
                <p class="card-hdr-title">Dispatch by Customer</p>
                <p class="card-hdr-sub">Units dispatched per client</p>
              </div>
            </div>
            <div style="flex:1; overflow-y:auto;">
              <div v-if="dispatchByCustomer.length > 0" style="display:flex; flex-direction:column; gap:.5rem;">
                <div v-for="cust in dispatchByCustomer" :key="cust.id" class="inv-row">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:.4rem;">
                    <span style="font-weight:700; color:#f8fafc;">{{ cust.name }}</span>
                    <span style="font-size:.9rem; font-weight:700; font-family:monospace; color:#34d399;">{{ cust.total.toLocaleString() }} units</span>
                  </div>
                  <div class="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div
                      style="height:6px; background:#10b981; border-radius:9999px; transition:width 0.5s ease;"
                      :style="{ width: maxDispatch > 0 ? Math.min(100, (cust.total / maxDispatch) * 100) + '%' : '0%' }"
                    ></div>
                  </div>
                </div>
              </div>
              <div v-else class="empty-chart">
                <span class="material-symbols-rounded" style="font-size:2.5rem; color:#334155;">local_shipping</span>
                <p>No dispatch records yet.</p>
              </div>
            </div>
          </div>

        </section>
        </Transition>

        <!-- ══════ VIEW F: Attendance Leaderboard ═════════════════════════ -->
        <Transition name="view-fade" mode="out-in">
        <section v-if="activeView === 'attendance'" class="view-panel" key="attendance">

          <div class="panel-header">
            <h2 class="panel-title">Attendance Performance</h2>
            <p class="panel-sub">Stars, lateness, and attendance rates · {{ store.currentProductionWeek }}</p>
          </div>

          <div class="chart-card" style="flex:1; min-height:0; overflow:hidden; display:flex; flex-direction:column;">
            <div class="card-hdr">
              <span class="material-symbols-rounded" style="color:#f59e0b">military_tech</span>
              <div>
                <p class="card-hdr-title">Attendance Leaderboard</p>
                <p class="card-hdr-sub">Ranked by performance stars · current week</p>
              </div>
            </div>
            <div style="flex:1; overflow-y:auto;">
              <table class="cost-table" style="width:100%;">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Operator</th>
                    <th>Days Attended</th>
                    <th>Performance Stars</th>
                    <th>Rating</th>
                    <th>Lateness</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, idx) in attendanceLeaderboard" :key="row.id">
                    <td>
                      <span v-if="idx === 0" style="font-size:1.2rem;">🥇</span>
                      <span v-else-if="idx === 1" style="font-size:1.2rem;">🥈</span>
                      <span v-else-if="idx === 2" style="font-size:1.2rem;">🥉</span>
                      <span v-else style="font-size:.9rem; color:#64748b; font-weight:700;">#{{ idx + 1 }}</span>
                    </td>
                    <td>
                      <div class="op-cell">
                        <OperatorAvatar :avatar="row.avatar" :name="row.name" :color="row.color" size="sm" />
                        <span>{{ row.name }}</span>
                      </div>
                    </td>
                    <td class="num">{{ row.days }} / {{ expectedDays }}</td>
                    <td>
                      <div style="display:flex; gap:.2rem;">
                        <span v-for="s in 5" :key="s" class="material-symbols-rounded" style="font-size:1.1rem;" :style="{ color: s <= row.stars ? '#f59e0b' : '#334155' }">star</span>
                      </div>
                    </td>
                    <td>
                      <span :style="{
                        fontSize:'.7rem', fontWeight:'800', padding:'.15rem .5rem', borderRadius:'.4rem',
                        background: row.stars >= 4 ? 'rgba(16,185,129,.2)' : row.stars >= 3 ? 'rgba(245,158,11,.2)' : 'rgba(239,68,68,.2)',
                        color: row.stars >= 4 ? '#34d399' : row.stars >= 3 ? '#fbbf24' : '#f87171'
                      }">{{ attLabel(row.stars) }}</span>
                    </td>
                    <td>
                      <span v-if="row.totalLateMins > 0" style="color:#f87171; font-size:.75rem; font-weight:700;">
                        Late {{ row.totalLateMins >= 60 ? Math.floor(row.totalLateMins/60) + 'h ' + (row.totalLateMins%60) + 'm' : row.totalLateMins + 'm' }}
                      </span>
                      <span v-else style="color:#34d399; font-size:.75rem; font-weight:700;">✓ On time</span>
                    </td>
                  </tr>
                  <tr v-if="attendanceLeaderboard.length === 0">
                    <td colspan="6" class="empty-td">No attendance data for this week.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </section>
        </Transition>

      </main><!-- /view-area -->

    </div><!-- /analytics-root -->

    <!-- Export toast -->
    <Transition name="toast">
      <div v-if="exportToast" class="export-toast">
        <span class="material-symbols-rounded">send</span>
        Report compiled & forwarded to Frezer
      </div>
    </Transition>
  </AppLayout>
</template>

<script setup>
// Developer: Mintesnot Abebe | Brand: dev MinteIO
import { ref, computed, onMounted, onUnmounted } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import AnalyticsDataCard from '@/components/ui/AnalyticsDataCard.vue'
import OperatorAvatar from '@/components/ui/OperatorAvatar.vue'
import { useMesStore } from '@/store/mesStore.js'
import { useAttendanceStore } from '@/store/attendanceStore.js'
import { useInventoryStore } from '@/store/inventoryStore.js'

const store = useMesStore()
const attStore = useAttendanceStore()
const inventoryStore = useInventoryStore()

const isSyncing = ref(false)
let refreshTimer = null

async function manualSync() {
  isSyncing.value = true
  try {
    await Promise.all([
      store.fetchInitialData(),
      attStore.loadAttendanceLogs(),
      inventoryStore.fetchMaterials()
    ])
  } catch (err) {
    console.error('[Analytics] Sync error:', err)
  } finally {
    setTimeout(() => { isSyncing.value = false }, 400)
  }
}

onMounted(async () => {
  try {
    await Promise.all([
      store.fetchInitialData(),
      attStore.loadAttendanceLogs(),
      inventoryStore.fetchMaterials()
    ])
  } catch (err) {
    console.error('[Analytics] Initial load error:', err)
  }

  refreshTimer = setInterval(async () => {
    try {
      await Promise.all([
        store.fetchInitialData(),
        attStore.loadAttendanceLogs(),
        inventoryStore.fetchMaterials()
      ])
    } catch (err) {
      console.error('[Analytics] Polling error:', err)
    }
  }, 30000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})

// ── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'global',     icon: 'dashboard',       title: 'Global Overview',       sub: 'KPIs & production trend'    },
  { id: 'employee',   icon: 'badge',            title: 'Employee Performance',  sub: 'Per-operator output & pay'  },
  { id: 'payroll',    icon: 'payments',         title: 'Payroll Cost Analysis', sub: 'Cost per unit & liability'  },
  { id: 'inventory',  icon: 'inventory_2',      title: 'Inventory Health',      sub: 'Stock levels & alerts'      },
  { id: 'dispatch',   icon: 'local_shipping',   title: 'Dispatch & Customers',  sub: 'Logistics by client'        },
  { id: 'attendance', icon: 'military_tech',    title: 'Attendance Board',      sub: 'Stars & lateness rankings'  },
]
const activeView = ref('global')

// ── 7-Day Trend built from real ledger data ──────────────────────────────────
const sevenDayTrend = computed(() => {
  const now = new Date()
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const label = d.toLocaleDateString('en-US', { weekday: 'short' })
    const dateStr = d.toISOString().split('T')[0]
    const entries = (store.ledgerEntries || []).filter(e => {
      if (!e) return false
      const rawDate = e.productionDate || e.timestamp || ''
      return String(rawDate).startsWith(dateStr)
    })
    days.push({
      label,
      good:  entries.reduce((s, e) => s + (Number(e.goodProduction) || 0), 0),
      waste: entries.reduce((s, e) => s + (Number(e.wasteMaterial)  || 0), 0),
    })
  }
  return days
})

const maxTrend = computed(() => {
  const totals = (sevenDayTrend.value || []).map(d => (Number(d.good) || 0) + (Number(d.waste) || 0))
  return totals.length > 0 ? Math.max(...totals, 1) : 1
})
const barH = (val) => maxTrend.value > 0 ? Math.max(2, ((Number(val) || 0) / maxTrend.value) * 100) : 2

// ── Attendance helpers ───────────────────────────────────────────────────────
const expectedDays = 6

function parseTimeToMins(timeStr) {
  if (!timeStr) return 0
  const parts = String(timeStr).split(':')
  if (parts.length < 2) return 0
  return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0)
}

const morningEndMin = computed(() => {
  const w = (attStore.clockingWindows || []).find(w => w.id === 'morning_in')
  return w ? parseTimeToMins(w.end) : 480 // default 08:00
})

const currentWeekLogs = computed(() =>
  (attStore.clockInLog || []).filter(log => log && log.week === store.currentProductionWeek)
)

function attDays(opId) {
  const logs = currentWeekLogs.value.filter(l => Number(l.operatorId) === Number(opId) || l.operatorId === opId)
  return new Set(logs.map(l => l.shiftDate)).size
}

function attScore(opId) {
  let score = 100
  const logs = currentWeekLogs.value.filter(l => Number(l.operatorId) === Number(opId) || l.operatorId === opId)
  // Penalise absences
  const daysPresent = new Set(logs.map(l => l.shiftDate)).size
  score -= Math.max(0, (expectedDays - daysPresent)) * 10
  // Penalise lateness
  logs.forEach(log => {
    if (!log.timestamp) return
    try {
      const t = new Date(log.timestamp)
      if (isNaN(t.getTime())) return
      const mins = t.getHours() * 60 + t.getMinutes()
      if (mins > morningEndMin.value) {
        score -= Math.min(15, Math.ceil((mins - morningEndMin.value) / 10) * 2)
      }
    } catch {}
  })
  let stars = 5
  if (score < 90) stars = 4
  if (score < 75) stars = 3
  if (score < 60) stars = 2
  if (score < 40) stars = 1
  if (score < 20) stars = 0
  return stars
}

function attLabel(stars) {
  return ['Poor', 'Below Avg', 'Average', 'Good', 'Excellent', 'Excellent'][stars] ?? 'N/A'
}

function totalLateMins(opId) {
  let total = 0
  currentWeekLogs.value.filter(l => Number(l.operatorId) === Number(opId) || l.operatorId === opId).forEach(log => {
    if (!log.timestamp) return
    try {
      const t = new Date(log.timestamp)
      if (isNaN(t.getTime())) return
      const mins = t.getHours() * 60 + t.getMinutes()
      if (mins > morningEndMin.value) total += mins - morningEndMin.value
    } catch {}
  })
  return total
}

// ── Leaderboard ──────────────────────────────────────────────────────────────
const attendanceLeaderboard = computed(() => {
  return (store.operators || [])
    .filter(op => op && op.role !== 'customer')
    .map(op => ({
      ...op,
      days: attDays(op.id),
      stars: attScore(op.id),
      totalLateMins: totalLateMins(op.id),
    }))
    .sort((a, b) => b.stars - a.stars || b.days - a.days)
})

// ── Employee view helpers ────────────────────────────────────────────────────
const empSearch    = ref('')
const selectedOpId = ref(null)

const enrichedOperators = computed(() =>
  (store.operatorEfficiency || []).map(op => ({ ...op }))
)

const filteredOperators = computed(() => {
  const q = empSearch.value.trim().toLowerCase()
  return q ? enrichedOperators.value.filter(o => (o.name || '').toLowerCase().includes(q)) : enrichedOperators.value
})

const selectedProfile = computed(() =>
  enrichedOperators.value.find(o => o.id === selectedOpId.value) ?? null
)

function opEarnings(opId) {
  return (store.cashEntries || [])
    .filter(e => (Number(e.operator_id) === Number(opId) || Number(e.operatorId) === Number(opId) || String(e.operator?.id) === String(opId)) && (e.type === 'shift_submission' || e.type === 'payout'))
    .reduce((s, e) => s + Number(e.amount || 0), 0)
}

function opAdvances(opId) {
  return (store.cashEntries || [])
    .filter(e => (Number(e.operator_id) === Number(opId) || Number(e.operatorId) === Number(opId) || String(e.operator?.id) === String(opId)) && e.type === 'advance')
    .reduce((s, e) => s + Number(e.amount || 0), 0)
}

function opVariantBreakdown(op) {
  if (!op) return []
  const entries = (store.ledgerEntries || []).filter(e => 
    (e.operator_id != null && Number(e.operator_id) === Number(op.id)) ||
    (e.operator && e.operator === op.name)
  )
  const groups = {}
  entries.forEach(e => {
    const key = `${e.dividerType || '50'}-${e.size || ''}-${e.placement || ''}`
    if (!groups[key]) groups[key] = { 
      key, 
      dividerType: e.dividerType || '—', 
      size: e.size || '—', 
      placement: e.placement || '—', 
      good: 0, 
      waste: 0, 
      rate: store.getEntryRate ? store.getEntryRate(e) : 0 
    }
    groups[key].good  += Number(e.goodProduction) || 0
    groups[key].waste += Number(e.wasteMaterial)  || 0
  })
  return Object.values(groups)
}

// ── Total payroll liability (from actual earnings) ───────────────────────────
const totalPayrollLiability = computed(() =>
  (store.operatorEfficiency || []).reduce((sum, op) => sum + opEarnings(op.id), 0)
)

// ── Cost analysis rows ───────────────────────────────────────────────────────
const costAnalysisRows = computed(() =>
  (store.operatorEfficiency || []).map(op => {
    const gross = opEarnings(op.id)
    const advances = opAdvances(op.id)
    const good = Number(op.good) || 0
    return {
      ...op,
      good,
      gross,
      advances,
      net: Math.max(0, gross - advances),
      costPerUnit: good > 0 ? gross / good : 0,
    }
  })
)

const maxCostPerUnit = computed(() => {
  const values = costAnalysisRows.value.map(r => r.costPerUnit).filter(v => typeof v === 'number' && !isNaN(v))
  return values.length > 0 ? Math.max(...values, 0.01) : 0.01
})

const weekAggMax = computed(() => {
  const vals = Object.values(store.weeklyAggregation ?? {}).map(Number).filter(v => !isNaN(v))
  return vals.length > 0 ? Math.max(...vals, 1) : 1
})

// ── Inventory helpers ────────────────────────────────────────────────────────
function isLowStock(mat) {
  if (!mat) return false
  const threshold = Number(mat.reorder_threshold) > 0 ? Number(mat.reorder_threshold) : (Number(mat.max_capacity || 100) * 0.15)
  return Number(mat.current_stock || 0) <= threshold
}

// ── Dispatch by customer ─────────────────────────────────────────────────────
const dispatchByCustomer = computed(() => {
  const map = {}
  ;(store.dispatchLogs || []).forEach(d => {
    const key = d.customerId || d.client || d.customerName || 'Unknown'
    const name = d.client || d.customerName || (store.clients || []).find(c => c.id === d.customerId)?.name || 'Unknown'
    if (!map[key]) map[key] = { id: key, name, total: 0 }
    map[key].total += Number(d.quantity) || 0
  })
  return Object.values(map).sort((a, b) => b.total - a.total)
})

const maxDispatch = computed(() => {
  const totals = dispatchByCustomer.value.map(c => c.total).filter(t => typeof t === 'number' && !isNaN(t))
  return totals.length > 0 ? Math.max(...totals, 1) : 1
})

// ── Export ───────────────────────────────────────────────────────────────────
const exportToast = ref(false)
let exportTimer = null
function exportTelegram() {
  exportToast.value = true
  clearTimeout(exportTimer)
  exportTimer = setTimeout(() => { exportToast.value = false }, 3500)
}
</script>

<style scoped>
/* ══ Root layout ════════════════════════════════════════════════════════════ */
.analytics-root {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: 'Inter', sans-serif;
}

/* ══ Left view-nav ══════════════════════════════════════════════════════════ */
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
  padding: .75rem .9rem;
  border-radius: .75rem;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: all .15s ease;
  position: relative;
  color: #64748b;
}
.nav-tab:hover { background: rgba(255,255,255,.04); color: #94a3b8; }
.nav-tab--active {
  background: rgba(99,102,241,.15);
  border-color: rgba(99,102,241,.3);
  color: #a5b4fc;
}

.tab-icon { font-size: 1.3rem; flex-shrink: 0; }
.tab-labels { display: flex; flex-direction: column; gap: .1rem; }
.tab-title { font-size: .8rem; font-weight: 700; line-height: 1.2; }
.tab-sub   { font-size: .58rem; opacity: .6; }

.tab-indicator {
  position: absolute;
  left: 0; top: 25%; bottom: 25%;
  width: 3px;
  border-radius: 0 2px 2px 0;
  background: #6366f1;
}

.export-btn {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: .5rem;
  padding: .75rem 1rem;
  background: linear-gradient(135deg,#2563eb,#3b82f6);
  border: none;
  border-radius: .75rem;
  color: #fff;
  font-size: .8rem;
  font-weight: 800;
  cursor: pointer;
  transition: filter .15s ease;
}
.export-btn:hover { filter: brightness(1.1); }

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
.panel-sub {
  font-size: .7rem;
  color: #64748b;
  margin: .2rem 0 0;
}

/* View transitions */
.view-fade-enter-active, .view-fade-leave-active { transition: opacity .2s ease, transform .2s ease; }
.view-fade-enter-from { opacity: 0; transform: translateX(12px); }
.view-fade-leave-to   { opacity: 0; transform: translateX(-12px); }

/* ══ KPI Grid ════════════════════════════════════════════════════════════════ */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: .85rem;
  flex-shrink: 0;
}
@media (max-width: 900px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px) { .kpi-grid { grid-template-columns: 1fr; } }

/* ══ Chart card (shared) ══════════════════════════════════════════════════════ */
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
.card-hdr {
  display: flex;
  align-items: center;
  gap: .65rem;
  flex-shrink: 0;
}
.card-hdr-title { font-weight: 700; color: #f1f5f9; font-size: .9rem; margin: 0; }
.card-hdr-sub   { font-size: .65rem; color: #64748b; margin: .1rem 0 0; }
.badge {
  margin-left: auto;
  background: rgba(99,102,241,.2);
  color: #a5b4fc;
  font-size: .65rem;
  font-weight: 800;
  letter-spacing: .1em;
  padding: .2rem .6rem;
  border-radius: 2rem;
}

/* ══ 7-Day Bar Chart ══════════════════════════════════════════════════════════ */
.bar-chart {
  display: flex;
  align-items: flex-end;
  gap: .5rem;
  flex: 1;
  min-height: 0;
  padding: .5rem 0;
}
.bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: .25rem;
  min-width: 0;
}
.bar-col-inner {
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 1px;
}
.bar-seg {
  width: 100%;
  border-radius: .25rem .25rem 0 0;
  min-height: 2px;
  transition: height .4s ease;
}
.bar-seg--good  { background: #6366f1; }
.bar-seg--waste { background: #ef4444; }
.bar-values { display: flex; flex-direction: column; align-items: center; gap: .05rem; }
.bv-good  { font-size: .6rem; font-weight: 700; color: #a5b4fc; }
.bv-waste { font-size: .6rem; font-weight: 700; color: #f87171; }
.bar-label { font-size: .62rem; font-weight: 600; color: #475569; }
.chart-legend { display: flex; gap: 1rem; flex-shrink: 0; padding-top: .25rem; }
.leg-item { display: flex; align-items: center; gap: .35rem; font-size: .65rem; color: #94a3b8; font-weight: 600; }
.leg-dot  { width: .6rem; height: .6rem; border-radius: 50%; flex-shrink: 0; }

.empty-chart {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: .75rem;
  color: #64748b;
  font-size: .85rem;
}

/* ══ Employee Performance ════════════════════════════════════════════════════ */
.operator-list {
  display: flex;
  flex-direction: column;
  gap: .35rem;
  overflow-y: auto;
  flex-shrink: 0;
}
.search-wrap {
  position: relative;
  margin-bottom: .5rem;
}
.search-icon {
  position: absolute;
  left: .6rem;
  top: 50%;
  transform: translateY(-50%);
  color: #475569;
  font-size: 1.1rem;
}
.search-input {
  width: 100%;
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.08);
  border-radius: .6rem;
  padding: .55rem .75rem .55rem 2rem;
  color: #f1f5f9;
  font-size: .8rem;
  outline: none;
  box-sizing: border-box;
}
.search-input:focus { border-color: rgba(99,102,241,.5); }

.op-card {
  display: flex;
  align-items: center;
  gap: .65rem;
  padding: .65rem .8rem;
  border-radius: .7rem;
  border: 1px solid transparent;
  background: rgba(255,255,255,.03);
  cursor: pointer;
  text-align: left;
  transition: all .15s ease;
  width: 100%;
}
.op-card:hover { background: rgba(255,255,255,.07); }
.op-card--active {
  background: rgba(99,102,241,.15);
  border-color: rgba(99,102,241,.35);
}
.op-info { flex: 1; min-width: 0; }
.op-name { font-size: .82rem; font-weight: 700; color: #f1f5f9; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.op-role { font-size: .65rem; color: #64748b; margin: 0; }
.op-quick { text-align: right; }
.quick-val { display: block; font-size: .85rem; font-weight: 800; color: #a5b4fc; font-family: monospace; }
.quick-lbl { font-size: .6rem; color: #475569; }

.profile-area { flex: 1; overflow-y: auto; }
.profile-card {
  background: rgba(255,255,255,.02);
  border: 1px solid rgba(255,255,255,.06);
  border-radius: 1rem;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.profile-hdr {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}
.profile-name { font-size: 1.1rem; font-weight: 900; color: #f8fafc; margin: 0; }
.profile-role { font-size: .75rem; color: #64748b; margin: .15rem 0 0; }
.profile-badge {
  margin-left: auto;
  padding: .35rem .8rem;
  border-radius: 2rem;
  font-size: .75rem;
  font-weight: 800;
}
.badge--ok       { background: rgba(16,185,129,.15); color: #34d399; }
.badge--warn     { background: rgba(245,158,11,.15); color: #fbbf24; }
.badge--critical { background: rgba(239,68,68,.15);  color: #f87171; }

.metric-grid { display: flex; flex-direction: column; gap: .85rem; }
.metric-section {
  background: rgba(255,255,255,.03);
  border: 1px solid rgba(255,255,255,.06);
  border-radius: .75rem;
  padding: 1rem 1.1rem;
}
.metric-section--financial { border-color: rgba(139,92,246,.2); }
.section-title {
  display: flex;
  align-items: center;
  gap: .4rem;
  font-size: .72rem;
  font-weight: 800;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: #64748b;
  margin: 0 0 .75rem;
}
.section-title .material-symbols-rounded { font-size: 1rem; }
.metric-row { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: .75rem; }
.metric-item { display: flex; flex-direction: column; gap: .2rem; }
.m-label { font-size: .65rem; color: #64748b; font-weight: 600; }
.m-value { font-size: 1.2rem; font-weight: 900; color: #f8fafc; font-family: monospace; }
.m-value--good { color: #a5b4fc; }
.m-value--bad  { color: #f87171; }

.waste-bar-track { height: .4rem; background: #0f172a; border-radius: 9999px; overflow: hidden; }
.waste-bar-fill  { height: 100%; border-radius: 9999px; transition: width .5s ease; }
.fill--ok       { background: #10b981; }
.fill--warn     { background: #f59e0b; }
.fill--critical { background: #ef4444; }

.financial-rows { display: flex; flex-direction: column; gap: .6rem; }
.fin-row { display: flex; justify-content: space-between; align-items: center; font-size: .85rem; color: #94a3b8; }
.fin-row--deduct { color: #64748b; }
.fin-label { font-weight: 600; }
.fin-value { font-weight: 700; font-family: monospace; }
.fin-value--red { color: #f87171; }
.fin-divider { height: 1px; background: rgba(255,255,255,.05); margin: .25rem 0; }
.fin-row--net .fin-label-net { font-size: .9rem; font-weight: 800; color: #f8fafc; text-transform: uppercase; letter-spacing: .05em; }
.fin-value-net { font-size: 1rem; font-weight: 900; color: #34d399; font-family: monospace; }

.variant-section {
  background: rgba(255,255,255,.03);
  border: 1px solid rgba(255,255,255,.06);
  border-radius: .75rem;
  padding: 1rem 1.1rem;
}
.variant-table { font-size: .78rem; }
.vt-header {
  display: grid;
  grid-template-columns: 2fr 1fr 1.5fr 1fr 1fr 1.5fr;
  gap: .5rem;
  padding: .4rem .5rem;
  font-size: .62rem;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: #475569;
}
.vt-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1.5fr 1fr 1fr 1.5fr;
  gap: .5rem;
  padding: .5rem;
  border-radius: .4rem;
  color: #94a3b8;
  font-weight: 600;
}
.vt-row:hover { background: rgba(255,255,255,.03); }
.vt-badge  { background: rgba(99,102,241,.15); color: #a5b4fc; padding: .15rem .4rem; border-radius: .3rem; font-weight: 800; font-size: .7rem; }
.vt-good   { color: #34d399; font-weight: 700; }
.vt-waste  { color: #f87171; font-weight: 700; }
.vt-rate   { color: #fbbf24; font-weight: 700; }
.vt-empty  { padding: 1rem; text-align: center; color: #475569; }

.profile-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: .75rem;
  color: #334155;
}
.pe-icon { font-size: 3.5rem; }
.empty-note { text-align: center; font-size: .8rem; color: #475569; padding: 1rem; }

/* ══ Payroll Cost Analysis ════════════════════════════════════════════════════ */
.cpu-kpi-row { flex-shrink: 0; }
.cpu-kpi {
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.07);
  border-radius: .75rem;
  padding: .85rem 1.1rem;
  flex: 1;
}
.cpu-kpi--highlight { border-color: rgba(99,102,241,.3); background: rgba(99,102,241,.08); }
.cpu-label { font-size: .65rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .08em; margin: 0 0 .35rem; }
.cpu-value { font-size: 1.1rem; font-weight: 900; color: #f8fafc; margin: 0; font-family: monospace; }

.cost-table-wrap { overflow-x: auto; }
.cost-table {
  width: 100%;
  border-collapse: collapse;
  font-size: .78rem;
}
.cost-table th {
  padding: .6rem .8rem;
  text-align: left;
  font-size: .6rem;
  font-weight: 800;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: #475569;
  background: rgba(0,0,0,.2);
  white-space: nowrap;
}
.cost-table td { padding: .65rem .8rem; border-bottom: 1px solid rgba(255,255,255,.04); color: #94a3b8; }
.cost-table tr:hover td { background: rgba(255,255,255,.02); }
.op-cell { display: flex; align-items: center; gap: .5rem; white-space: nowrap; }
td.num { font-family: monospace; font-weight: 700; color: #f8fafc; text-align: right; }
td.red { color: #f87171; }
td.green { color: #34d399; }
td.purple { color: #c084fc; }
td.bar-cell { width: 80px; }
.cost-bar-track { height: .4rem; background: #0f172a; border-radius: 9999px; overflow: hidden; }
.cost-bar-fill  { height: 100%; background: #6366f1; border-radius: 9999px; transition: width .5s ease; }
.empty-td { padding: 2rem; text-align: center; color: #475569; }

.week-breakdown {
  border-top: 1px solid rgba(255,255,255,.05);
  padding-top: .75rem;
  flex-shrink: 0;
}
.period-bars { display: flex; align-items: flex-end; gap: 1rem; height: 60px; }
.period-item { display: flex; flex-direction: column; align-items: center; gap: .2rem; flex: 1; }
.period-bar-wrap { flex: 1; display: flex; align-items: flex-end; width: 100%; }
.period-bar { width: 100%; background: linear-gradient(to top, #6366f1, #818cf8); border-radius: .25rem .25rem 0 0; min-height: 4px; transition: height .4s ease; }
.period-val   { font-size: .72rem; font-weight: 800; color: #a5b4fc; }
.period-label { font-size: .6rem; font-weight: 600; color: #475569; }

/* ══ Inventory row ═══════════════════════════════════════════════════════════ */
.inv-row {
  background: rgba(255,255,255,.03);
  border: 1px solid rgba(255,255,255,.06);
  border-radius: .6rem;
  padding: .75rem 1rem;
}
.inv-row--danger { border-color: rgba(239,68,68,.3); background: rgba(239,68,68,.05); }

/* ══ Toast ═══════════════════════════════════════════════════════════════════ */
.export-toast {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background: #2563eb;
  color: #fff;
  padding: .85rem 1.75rem;
  border-radius: 3rem;
  font-weight: 700;
  font-size: .9rem;
  display: flex;
  align-items: center;
  gap: .5rem;
  box-shadow: 0 20px 40px -10px rgba(37,99,235,.6);
  z-index: 100;
}
.toast-enter-active, .toast-leave-active { transition: all .4s cubic-bezier(0.34, 1.56, 0.64, 1); }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 20px) scale(.9); }

.sync-btn {
  display: flex; align-items: center; gap: 0.35rem;
  background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.3);
  color: #a5b4fc; border-radius: 0.5rem; padding: 0.45rem 0.85rem;
  font-size: 0.75rem; font-weight: 700; transition: all 0.15s ease;
}
.sync-btn:hover { background: rgba(99,102,241,0.22); color: #fff; }
.spin-icon { animation: spin 0.8s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* ══ Profile Transition ══════════════════════════════════════════════════════ */
.profile-fade-enter-active, .profile-fade-leave-active { transition: all .2s ease; }
.profile-fade-enter-from { opacity: 0; transform: translateY(8px); }
.profile-fade-leave-to   { opacity: 0; }

/* ══ Mobile Responsiveness ══════════════════════════════════════════════════ */
@media (max-width: 768px) {
  .analytics-root {
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
    border-bottom: 1px solid rgba(255,255,255,.08);
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .view-nav::-webkit-scrollbar { display: none; }
  .nav-heading { display: none; }
  .nav-tab {
    white-space: nowrap;
    padding: 0.5rem 0.85rem;
    border-radius: 0.5rem;
    flex-shrink: 0;
    touch-action: pan-y;
  }
  .tab-sub { display: none; }
  .export-btn {
    white-space: nowrap;
    padding: 0.5rem 0.85rem;
    font-size: 0.75rem;
    flex-shrink: 0;
  }
  .view-area {
    padding: 1rem 1rem 3rem 1rem;
    overflow-y: visible;
  }
  .view-panel {
    gap: 1rem;
  }
  .employee-layout {
    flex-direction: column !important;
    gap: 1rem;
  }
  .operator-list {
    width: 100% !important;
    max-height: 160px !important;
  }
  .profile-grid {
    grid-template-columns: 1fr !important;
  }
  .cpu-kpi-row {
    flex-direction: column;
    gap: 0.75rem;
  }
  .panel-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
}
</style>
