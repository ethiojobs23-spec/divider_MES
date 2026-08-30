<template>
  <div class="employee-portal">
    <!-- Sidebar -->
    <aside class="employee-sidebar">
      <div class="profile-section">
        <OperatorAvatar :avatar="employee?.avatar" :name="employee?.name" :color="employee?.color" size="xl" />
        <h2 class="op-name mt-4">{{ employee?.name }}</h2>
        <p class="op-role">{{ employee?.role }}</p>
      </div>

      <nav class="portal-nav">
        <button class="nav-btn" :class="{ active: activeTab === 'profile-settings' }" @click="activeTab = 'profile-settings'">
          <span class="material-symbols-rounded">manage_accounts</span> Profile Settings
        </button>
        <button class="nav-btn" :class="{ active: activeTab === 'overview' }" @click="activeTab = 'overview'">
          <span class="material-symbols-rounded">dashboard</span> My Dashboard
        </button>
        <button class="nav-btn" :class="{ active: activeTab === 'cash-loan' }" @click="activeTab = 'cash-loan'">
          <span class="material-symbols-rounded">account_balance_wallet</span> Cash Loan
        </button>
        <button class="nav-btn" :class="{ active: activeTab === 'payment-request' }" @click="activeTab = 'payment-request'">
          <span class="material-symbols-rounded">payments</span> Payment Request
        </button>
        <button class="nav-btn" :class="{ active: activeTab === 'payroll-history' }" @click="activeTab = 'payroll-history'">
          <span class="material-symbols-rounded">history</span> Payroll History
        </button>
        <button class="nav-btn" :class="{ active: activeTab === 'attendance' }" @click="activeTab = 'attendance'">
          <span class="material-symbols-rounded">how_to_reg</span> Attendance & Shift
        </button>
        <button class="nav-btn" :class="{ active: activeTab === 'production' }" @click="activeTab = 'production'">
          <span class="material-symbols-rounded">precision_manufacturing</span> Production Log
        </button>
        <button class="nav-btn" :class="{ active: activeTab === 'shift-submit' }" @click="activeTab = 'shift-submit'">
          <span class="material-symbols-rounded">task_alt</span> Submit Shift
          <span v-if="pendingSubmission" class="nav-badge">!</span>
        </button>
      </nav>

      <div class="sidebar-actions">
        <button class="btn-logout" @click="logout">
          <span class="material-symbols-rounded">logout</span>
          LOG OUT
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="portal-main">
      <header class="portal-header">
        <h1>{{ tabTitles[activeTab] }}</h1>
        <p>Production Week: {{ currentWeek }}</p>
      </header>

      <!-- Profile Settings Tab -->
      <div v-if="activeTab === 'profile-settings'" class="tab-content">
        <div class="production-list-card" style="max-width: 600px; margin: 0 auto;">
          <h3 style="margin-bottom: 1.5rem; border-bottom: 1px solid rgba(99,102,241,0.2); padding-bottom: 0.75rem;">Edit Profile</h3>
          
          <!-- Avatar Preview & Upload -->
          <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem; margin-bottom: 2rem;">
            <OperatorAvatar :avatar="profileForm.avatar" :name="employee?.name" :color="employee?.color" size="xl" />
            
            <div style="position: relative;">
              <input type="file" accept="image/*" @change="handleAvatarSelected" style="position: absolute; opacity: 0; width: 100%; height: 100%; cursor: pointer;" :disabled="isUploadingAvatar" />
              <button class="nav-btn" style="pointer-events: none; justify-content: center; background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.3);">
                <span class="material-symbols-rounded">{{ isUploadingAvatar ? 'hourglass_empty' : 'upload' }}</span>
                {{ isUploadingAvatar ? 'Uploading...' : 'Change Picture' }}
              </button>
            </div>
          </div>

          <div class="request-grid" style="grid-template-columns: 1fr;">
            <div class="input-group">
              <label>Full Name</label>
              <input v-model="profileForm.full_name" type="text" class="input-field" placeholder="Enter full name" />
            </div>
            
            <div class="input-group">
              <label>Phone Number</label>
              <input v-model="profileForm.phone_number" type="tel" class="input-field" placeholder="09..." />
            </div>
            
            <div class="input-group">
              <label>Date of Birth</label>
              <input v-model="profileForm.dob" type="date" class="input-field" />
            </div>
            
            <div class="input-group">
              <label>Confirm PIN to Save</label>
              <input v-model="profileForm.pinConfirm" type="password" maxlength="4" inputmode="numeric" class="input-field" placeholder="Enter 4-digit PIN" />
            </div>
          </div>

          <div style="margin-top: 2rem;">
            <button class="btn-submit-shift" style="width: 100%" @click="saveProfile" :disabled="isSavingProfile || !profileForm.pinConfirm">
              <span class="material-symbols-rounded">save</span>
              {{ isSavingProfile ? 'Saving...' : 'Save Profile' }}
            </button>
            <p v-if="profileMessage" class="success-msg" style="text-align: center; margin-top: 1rem;" :class="{'error-text': profileMessage.includes('Error') || profileMessage.includes('Incorrect')}">{{ profileMessage }}</p>
          </div>
        </div>
      </div>

      <!-- Overview Tab -->
      <div v-if="activeTab === 'overview'" class="tab-content">
        <div class="dashboard-grid">
          <!-- Card 1: My Production / My Hours -->
          <div class="stat-card">
            <div class="card-icon production">
              <span class="material-symbols-rounded">precision_manufacturing</span>
            </div>
            <div class="card-content">
              <h3>My Production</h3>
              
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
            My Work Types
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

      <!-- Cash Loan Tab -->
      <div v-if="activeTab === 'cash-loan'" class="tab-content split-layout">
         <!-- ON SHIFT BLOCK -->
         <div v-if="isClockedIn" class="on-shift-block">
           <span class="material-symbols-rounded" style="font-size:3rem; color:#f59e0b">schedule</span>
           <h3>You Are Currently On Shift</h3>
           <p>Cash loan requests can only be made when you are <strong>not on shift</strong>. Please clock out first.</p>
         </div>
         <template v-else>
           <div class="form-card">
             <h3>Request Cash Loan</h3>
             <div class="form-group">
               <label>Amount (ETB)</label>
               <VirtualNumpad v-model="cashLoanAmount" label="" />
             </div>
             <button class="btn-submit" :disabled="!cashLoanAmount" @click="openLoanPin">Submit Request</button>
             <p v-if="cashLoanMessage" class="success-msg">{{ cashLoanMessage }}</p>
           </div>
           
           <div class="history-card">
             <h3>My Recent Loans</h3>
             <div class="history-list">
               <div v-for="loan in myLoans" :key="loan.id" class="history-item">
                 <div class="history-left">
                   <span class="material-symbols-rounded history-icon">account_balance</span>
                   <div>
                     <span class="reason">Interest: {{ loan.interestRate }}% • 
                       <strong :class="'status-' + loan.status">{{ loan.status.toUpperCase() }}</strong>
                     </span>
                     <span class="date">{{ new Date(loan.issuedAt).toLocaleDateString() }}</span>
                   </div>
                 </div>
                 <span class="amount">{{ loan.amount }} ETB</span>
               </div>
               <p v-if="!myLoans.length" class="empty-text">No recent loans logged.</p>
             </div>
           </div>
         </template>
       </div>

      <!-- Payment Request Tab -->
      <div v-if="activeTab === 'payment-request'" class="tab-content split-layout">
         <!-- ON SHIFT BLOCK -->
         <div v-if="isClockedIn" class="on-shift-block">
           <span class="material-symbols-rounded" style="font-size:3rem; color:#f59e0b">schedule</span>
           <h3>You Are Currently On Shift</h3>
           <p>Payment requests can only be made when you are <strong>not on shift</strong>. Please clock out first.</p>
         </div>
         <template v-else>
           <div class="form-card">
             <h3>Request Payment / Advance</h3>
             <div class="form-group">
               <label>Amount (ETB)</label>
               <VirtualNumpad v-model="paymentAmount" label="" />
             </div>
             <div class="form-group">
               <label>Reason</label>
               <select v-model="paymentReason" class="input-field">
                 <option>Weekly Advance</option>
                 <option>Transport</option>
                 <option>Emergency</option>
               </select>
             </div>
             <button class="btn-submit" :disabled="!paymentAmount" @click="openPaymentPin">Submit Request</button>
             <p v-if="paymentMessage" class="success-msg">{{ paymentMessage }}</p>
           </div>
           
           <div class="history-card">
             <h3>My Recent Payment Requests</h3>
             <div class="history-list">
               <div v-for="adv in myAdvances" :key="adv.id" class="history-item">
                 <div class="history-left">
                   <span class="material-symbols-rounded history-icon">receipt_long</span>
                   <div>
                     <span class="reason">{{ adv.note || 'Advance' }} • 
                       <strong :class="'status-' + adv.type">{{ formatAdvanceStatus(adv.type) }}</strong>
                     </span>
                     <span class="date">{{ new Date(adv.timestamp).toLocaleDateString() }}</span>
                   </div>
                 </div>
                 <span class="amount">{{ adv.amount }} ETB</span>
               </div>
               <p v-if="!myAdvances.length" class="empty-text">No recent payment requests logged.</p>
             </div>
           </div>
         </template>
       </div>

      <!-- Attendance & Shift Tab -->
      <div v-if="activeTab === 'attendance'" class="tab-content">
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
              <button v-if="!isClockedIn" class="btn-clock btn-clock--in" @click="clockIn">
                <span class="material-symbols-rounded">login</span>
                {{ attStore.validateClockTime('in').allowed ? 'CLOCK IN NOW' : 'ADMIN OVERRIDE: CLOCK IN' }}
              </button>
              <button v-else class="btn-clock btn-clock--out" @click="clockOut">
                <span class="material-symbols-rounded">logout</span>
                {{ attStore.validateClockTime('out').allowed ? 'CLOCK OUT NOW' : 'ADMIN OVERRIDE: CLOCK OUT' }}
              </button>
            </div>
            <p v-if="!isClockedIn && !attStore.validateClockTime('in').allowed" class="status-warn">Outside allowed clock-in windows. Admin PIN required.</p>
            <p v-if="isClockedIn && !attStore.validateClockTime('out').allowed" class="status-warn">Outside allowed clock-out windows. Admin PIN required.</p>
          </div>
          
          <!-- Right: Weekly Attendance History -->
          <div class="history-card">
            <div class="week-selector-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
              <div style="display:flex; align-items:center; gap:1rem;">
                <h3>Weekly Attendance</h3>
                <div v-if="attendanceScore.stars > 0" style="display:flex; align-items:center; color:#fbbf24; gap:0.25rem;" title="Performance Score">
                  <span class="material-symbols-rounded" v-for="s in attendanceScore.stars" :key="s" style="font-size:1.2rem">star</span>
                  <span class="material-symbols-rounded" v-for="s in (5 - attendanceScore.stars)" :key="'e'+s" style="font-size:1.2rem; color:rgba(255,255,255,0.1)">star</span>
                  <span style="font-size:0.8rem; margin-left:0.5rem; color:#94a3b8; font-weight:600;">{{ attendanceScore.label }}</span>
                </div>
              </div>
              <div class="week-controls" style="display:flex; align-items:center; gap:0.5rem; background:rgba(255,255,255,0.05); padding:0.25rem; border-radius:2rem;">
                <button class="icon-btn" @click="shiftWeek(-1)" style="background:transparent; border:none; color:#f8fafc; cursor:pointer; display:flex;"><span class="material-symbols-rounded">chevron_left</span></button>
                <strong style="color:#818cf8">{{ viewWeek }}</strong>
                <button class="icon-btn" @click="shiftWeek(1)" style="background:transparent; border:none; color:#f8fafc; cursor:pointer; display:flex;"><span class="material-symbols-rounded">chevron_right</span></button>
              </div>
            </div>
            
            <div class="history-list">
              <div v-for="day in viewWeekDays" :key="day.dateStr" class="history-item" :style="day.status === 'today' ? 'border:1px solid rgba(99,102,241,0.5)' : ''">
                <div class="history-left">
                  <div style="text-align:center; min-width:40px;">
                    <span style="display:block; font-size:0.8rem; color:#94a3b8; text-transform:uppercase;">{{ day.dayName }}</span>
                    <strong style="color:#e2e8f0;">{{ day.formatted.split(' ')[1] }}</strong>
                  </div>
                  <div>
                    <span class="reason" v-if="day.status === 'present'">
                      <strong class="status-active">PRESENT</strong>
                      <span style="font-size:0.85rem; color:#94a3b8; display:block; margin-top:0.2rem;" v-if="day.record">
                        In: {{ new Date(day.record.clock_in).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) }} 
                        <span v-if="day.record.clock_out">| Out: {{ new Date(day.record.clock_out).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) }}</span>
                      </span>
                      <span v-if="day.lateMins > 0" style="font-size:0.75rem; color:#ef4444; font-weight:700; display:block; margin-top:0.2rem;">
                        <span class="material-symbols-rounded" style="font-size:0.9rem; vertical-align:middle;">schedule</span>
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

      <!-- Production Log Tab -->
      <div v-if="activeTab === 'production'" class="tab-content">
        <div class="production-list-card">
          <h3>My Production Entries ({{ currentWeek }})</h3>
          <div class="data-table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Placement</th>
                  <th class="align-right">Qty/Hrs</th>
                  <th class="align-right">Waste</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="entry in myProduction" :key="entry.id">
                  <td>{{ new Date(entry.timestamp).toLocaleString([], {weekday: 'short', hour: '2-digit', minute:'2-digit'}) }}</td>
                  <td>{{ entry.workCategory || 'MFG' }}</td>
                  <td>{{ entry.dividerType || '—' }}</td>
                  <td>{{ entry.size || '—' }}</td>
                  <td>{{ entry.placement || '—' }}</td>
                  <td class="align-right"><strong style="color:#34d399">{{ entry.workCategory === 'TIME' ? entry.hoursWorked + ' h' : entry.goodProduction }}</strong></td>
                  <td class="align-right"><strong style="color:#f87171">{{ entry.workCategory === 'TIME' ? '—' : (entry.wasteMaterial || 0) }}</strong></td>
                </tr>
                <tr v-if="!myProduction.length"><td colspan="6" class="empty-text">No production logged yet.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Shift Submit Tab -->
      <div v-if="activeTab === 'shift-submit'" class="tab-content">
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
              <thead><tr><th>Category</th><th>Type</th><th>Placement</th><th>Size</th><th class="align-right">Qty/Hrs</th><th class="align-right">Waste</th></tr></thead>
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
              <span :class="'status-' + alreadySubmittedToday.target_name">{{ alreadySubmittedToday.target_name?.toUpperCase() }}</span>
              <span v-if="alreadySubmittedToday.target_name === 'rejected' && alreadySubmittedToday.details?.rejectionReason" class="reject-reason">
                Reason: {{ alreadySubmittedToday.details.rejectionReason }}
              </span>
            </div>
            <button
              v-else
              class="btn-submit-shift"
              :disabled="!canSubmitShift || isSubmitting"
              @click="submitTodayShift"
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
                {{ sub.target_name?.toUpperCase() }}
              </div>
            </div>
            <p v-if="!mySubmissions.length" class="empty-text">No submissions yet.</p>
          </div>
        </div>
      </div>
      <!-- Payroll History Tab -->
      <div v-if="activeTab === 'payroll-history'" class="tab-content">
        <div class="production-list-card">
          <h3>My Weekly Payroll Payouts</h3>
          <div class="data-table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Date Paid</th>
                  <th>Amount (ETB)</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in myPayouts" :key="p.id">
                  <td>{{ new Date(p.transaction_date || p.created_at).toLocaleDateString([], {weekday:'short', month:'short', day:'numeric', year:'numeric'}) }}</td>
                  <td class="align-right"><strong style="color:#34d399">{{ Number(p.amount).toFixed(2) }} ETB</strong></td>
                  <td>{{ p.note }}</td>
                </tr>
                <tr v-if="!myPayouts.length"><td colspan="3" class="empty-text">No payroll payouts recorded yet.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>

    <!-- Employee PIN Modal -->
    <PinModal
      v-if="pinModal.show"
      :title="pinModal.mode === 'loan' ? 'Confirm Loan Request' : 'Confirm Payment Request'"
      :subtitle="`Enter your PIN to request ${pinModal.mode === 'loan' ? cashLoanAmount + ' ETB loan' : paymentAmount + ' ETB payment'}`"
      icon="lock"
      icon-color="#6366f1"
      confirm-label="Submit Request"
      :error-msg="pinModal.error"
      :loading="pinModal.loading"
      @confirm="handlePinConfirm"
      @cancel="pinModal.show = false"
    />
    <!-- Admin Override PIN Modal -->
    <PinModal
      v-if="adminOverrideModal.show"
      title="Admin Authorization"
      :subtitle="adminOverrideModal.action === 'clockIn' ? 'Override required for late/early Clock In' : 'Override required for late/early Clock Out'"
      icon="admin_panel_settings"
      icon-color="#f59e0b"
      confirm-label="Authorize"
      confirm-color="linear-gradient(135deg,#d97706,#f59e0b)"
      :error-msg="adminOverrideModal.error"
      :loading="adminOverrideModal.loading"
      @confirm="handleAdminOverride"
      @cancel="adminOverrideModal.show = false"
    />
  </div>
</template>

<script setup>
// Developer: Mintesnot Abebe | Brand: dev MinteIO
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabaseClient'
import { useSystemAuthStore } from '@/store/systemAuthStore.js'
import { useMesStore } from '@/store/mesStore.js'
import { usePayrollStore } from '@/store/payrollStore.js'
import { useAttendanceStore } from '@/store/attendanceStore.js'
import OperatorAvatar from '@/components/ui/OperatorAvatar.vue'
import VirtualNumpad from '@/components/ui/VirtualNumpad.vue'
import PinModal from '@/components/ui/PinModal.vue'

const router = useRouter()
const sysAuth = useSystemAuthStore()
const mesStore = useMesStore()
const payrollStore = usePayrollStore()
const attStore = useAttendanceStore()

const currentWeek = computed(() => mesStore.currentProductionWeek)
const activeTab = ref('overview')

const tabTitles = {
  overview: 'My Dashboard',
  'cash-loan': 'Cash Loan',
  'payment-request': 'Payment Request',
  'payroll-history': 'My Payroll History',
  attendance: 'Attendance & Shift Management',
  production: 'My Production Log',
  'shift-submit': 'Submit My Shift',
  'profile-settings': 'Profile Settings'
}

// Get employee info
const employee = computed(() => {
  return mesStore.operators.find(op => op.id === sysAuth.currentEmployeeId)
})

const employeePayrollConfig = computed(() => {
  if (!employee.value) return null
  return payrollStore.getWorkerProfile(employee.value.id)
})

// ── Overview ──
const totalProduction = computed(() => {
  if (!employee.value) return 0
  return mesStore.ledgerEntries
    .filter(e => e.operator === employee.value.name && e.week === currentWeek.value)
    .reduce((sum, e) => sum + (Number(e.goodProduction) || 0), 0)
})

const totalHours = computed(() => {
  if (!employee.value) return 0
  return mesStore.ledgerEntries
    .filter(e => e.operator === employee.value.name && e.week === currentWeek.value)
    .reduce((sum, e) => sum + (Number(e.hoursWorked) || 0), 0)
})

const daysAttended = computed(() => {
  if (!sysAuth.currentEmployeeId) return 0
  return payrollStore.getDaysAttended(sysAuth.currentEmployeeId, currentWeek.value)
})

const grossPiece = computed(() => {
  if (!sysAuth.currentEmployeeId) return 0
  return payrollStore.getGrossEarnings(sysAuth.currentEmployeeId, currentWeek.value)
})

const grossHourly = computed(() => {
  if (!sysAuth.currentEmployeeId) return 0
  return payrollStore.getHourlyEarnings(sysAuth.currentEmployeeId, currentWeek.value)
})

const estimatedEarnings = computed(() => {
  return Number(grossPiece.value) + Number(grossHourly.value)
})

// ── Cash Loan ──
const cashLoanAmount = ref('')
const cashLoanMessage = ref('')

const myLoans = computed(() => {
  if (!employee.value) return []
  return payrollStore.loans.filter(l => l.workerId === employee.value.id).reverse()
})

// PIN modal state
const pinModal = ref({ show: false, mode: '', error: '', loading: false })

function openLoanPin() {
  if (!cashLoanAmount.value || !employee.value) return
  pinModal.value = { show: true, mode: 'loan', error: '', loading: false }
}
function openPaymentPin() {
  if (!paymentAmount.value || !employee.value) return
  pinModal.value = { show: true, mode: 'payment', error: '', loading: false }
}

async function handlePinConfirm(pin) {
  const op = employee.value
  if (!op) return
  // Verify employee's own PIN
  if (String(op.pin_code) !== String(pin)) {
    pinModal.value.error = 'Incorrect PIN. Please try again.'
    return
  }
  pinModal.value.loading = true
  if (pinModal.value.mode === 'loan') {
    payrollStore.requestLoan(op.id, currentWeek.value, Number(cashLoanAmount.value))
    cashLoanMessage.value = `Cash loan of ${cashLoanAmount.value} ETB requested successfully!`
    cashLoanAmount.value = ''
    setTimeout(() => { cashLoanMessage.value = '' }, 3000)
  } else if (pinModal.value.mode === 'payment') {
    mesStore.addCashEntry({
      type: 'pending_advance',
      amount: Number(paymentAmount.value),
      operator: op.name,
      note: paymentReason.value,
    })
    paymentMessage.value = `Payment request of ${paymentAmount.value} ETB submitted!`
    paymentAmount.value = ''
    setTimeout(() => { paymentMessage.value = '' }, 3000)
  }
  pinModal.value = { show: false, mode: '', error: '', loading: false }
}

// ── Payment Request ──
const paymentAmount = ref('')
const paymentReason = ref('Weekly Advance')
const paymentMessage = ref('')

const myAdvances = computed(() => {
  if (!employee.value) return []
  return mesStore.cashEntries
    .filter(e => (e.type === 'advance' || e.type === 'pending_advance' || e.type === 'rejected_advance') && e.operator === employee.value.name)
    .reverse()
})

const myPayouts = computed(() => {
  if (!employee.value) return []
  return mesStore.cashEntries
    .filter(e => e.type === 'payout' && (e.operator_id === employee.value.id || e.operator === employee.value.name))
    .reverse()
})

function formatAdvanceStatus(type) {
  if (!type) return 'UNKNOWN'
  if (type === 'pending_advance') return 'PENDING'
  if (type === 'advance') return 'APPROVED'
  if (type === 'rejected_advance') return 'REJECTED'
  return type.toUpperCase()
}

function submitPaymentRequest() {
  if (!paymentAmount.value || !employee.value) return
  mesStore.addCashEntry({
    type: 'pending_advance',
    amount: Number(paymentAmount.value),
    operator: employee.value.name,
    note: paymentReason.value,
  })
  paymentMessage.value = `Payment request of ${paymentAmount.value} ETB logged successfully!`
  paymentAmount.value = ''
  setTimeout(() => { paymentMessage.value = '' }, 3000)
}

// ── Attendance ──
const isClockedIn = computed(() => {
  if (!employee.value) return false
  return mesStore.isOperatorClockedIn(employee.value.id)
})

const viewWeek = ref(mesStore.currentProductionWeek)
const viewWeekAttendance = ref([])

function shiftWeek(delta) {
  const match = viewWeek.value.match(/W(\d+)-(\d+)/)
  if (!match) return
  let w = Number(match[1]) + delta
  let y = Number(match[2])
  if (w < 1) { y--; w = 52 }
  if (w > 52) { y++; w = 1 }
  viewWeek.value = `W${String(w).padStart(2,'0')}-${y}`
}

watch(viewWeek, async (newWeek) => {
  if (!employee.value) return
  const { data } = await supabase.from('mes_attendance')
    .select('*')
    .eq('production_week', newWeek)
    .eq('operator_id', employee.value.id)
  if (data) viewWeekAttendance.value = data
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
  
  let d = new Date(y, 0, 1)
  let sanity = 0
  while(sanity < 365) {
     const startOfYear = new Date(d.getFullYear(), 0, 1)
     const weekNum = Math.ceil(((d - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7)
     if (weekNum === w) break
     d.setDate(d.getDate() + 1)
     sanity++
  }
  
  const dayOfWeek = d.getDay() || 7
  const monday = new Date(d)
  monday.setDate(d.getDate() - dayOfWeek + 1)
  
  const days = []
  const todayStr = new Date().toISOString().split('T')[0]
  for (let i=0; i<7; i++) {
     const dd = new Date(monday)
     dd.setDate(monday.getDate() + i)
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
       dayName: dd.toLocaleDateString('en-US', { weekday: 'short' }),
       formatted: dd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
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

const adminOverrideModal = ref({ show: false, action: '', error: '', loading: false })

async function clockIn() {
  if (!employee.value) return
  const val = attStore.validateClockTime('in')
  if (!val.allowed) {
    adminOverrideModal.value = { show: true, action: 'clockIn', error: '', loading: false }
    return
  }
  await executeClockIn(false)
}

async function clockOut() {
  if (!employee.value) return
  const val = attStore.validateClockTime('out')
  if (!val.allowed) {
    adminOverrideModal.value = { show: true, action: 'clockOut', error: '', loading: false }
    return
  }
  await executeClockOut(false)
}

async function handleAdminOverride(pin) {
  const adminRoles = ['admin', 'System Admin', 'manager', 'Supervisor']
  const admin = mesStore.operators.find(o => String(o.pin_code) === String(pin) && adminRoles.includes(o.role))
  if (!admin) {
    adminOverrideModal.value.error = 'Invalid Admin/Supervisor PIN. Try again.'
    return
  }
  
  adminOverrideModal.value.loading = true
  if (adminOverrideModal.value.action === 'clockIn') {
    await executeClockIn(true)
  } else {
    await executeClockOut(true)
  }
  adminOverrideModal.value.loading = false
  adminOverrideModal.value.show = false
}

async function executeClockIn(adminOverride = false) {
  if (employee.value) {
    mesStore.clockIn(employee.value)
    try {
      await attStore.recordClockIn(employee.value, adminOverride)
    } catch (e) {
      console.error('Clock in error:', e)
    }
  }
}

async function executeClockOut(adminOverride = false) {
  if (employee.value) {
    mesStore.clockOut(employee.value)
    try {
      const outTime = new Date().toISOString()
      await supabase.from('mes_attendance')
        .update({ clock_out: outTime })
        .eq('operator_id', employee.value.id)
        .is('clock_out', null)
        
      // Update local attendance store state
      const logEntry = attStore.clockInLog.find(log => log.operatorId === employee.value.id && !log.clockOut)
      if (logEntry) {
        logEntry.clockOut = outTime
      }
    } catch (e) { /* ignore */ }
  }
}

// ── Production ──
const myProduction = computed(() => {
  if (!employee.value) return []
  return mesStore.ledgerEntries
    .filter(e => e.operator === employee.value.name && e.week === currentWeek.value)
    .reverse()
})

// ── Today's entries for shift submission ──
const todayEntries = computed(() => {
  if (!employee.value) return []
  const today = new Date().toISOString().split('T')[0]
  return mesStore.ledgerEntries.filter(e => {
    return e.operator === employee.value.name &&
      new Date(e.timestamp).toISOString().split('T')[0] === today
  })
})

// ── Today's attendance record (for TIME workers) ──
const todayAttendanceRecord = computed(() => {
  if (!employee.value) return null
  const today = new Date().toISOString().split('T')[0]
  return attStore.clockInLog.find(log =>
    String(log.operatorId) === String(employee.value.id) && log.shiftDate === today
  ) || null
})

// Hours worked today derived from clock-in/out (for TIME workers)
const todayHoursFromClock = computed(() => {
  const rec = todayAttendanceRecord.value
  if (!rec || !rec.timestamp) return 0
  const end = rec.clockOut ? new Date(rec.clockOut) : new Date()
  const diffMs = end - new Date(rec.timestamp)
  return Math.max(0, Math.round((diffMs / 3600000) * 100) / 100)
})

const isTimeWorker = computed(() => {
  const cats = employee.value?.work_types?.categories || []
  return cats.includes('TIME')
})
const isPieceRateWorker = computed(() => {
  const cats = employee.value?.work_types?.categories || []
  return cats.some(c => c !== 'TIME') || cats.length === 0
})

const todayGood = computed(() => todayEntries.value.reduce((s,e) => s + (Number(e.goodProduction)||0), 0))
// For display: use clock-derived hours for TIME workers
const todayHours = computed(() => isTimeWorker.value ? todayHoursFromClock.value : todayEntries.value.reduce((s,e) => s + (Number(e.hoursWorked)||0), 0))
const todayWaste = computed(() => todayEntries.value.reduce((s,e) => s + (Number(e.wasteMaterial)||0), 0))
const todayEarnings = computed(() => {
  let total = 0
  if (isTimeWorker.value) {
    const rate = Number(employee.value?.work_types?.hourly_rate || employeePayrollConfig.value?.hourlyRate || 0)
    total += todayHoursFromClock.value * rate
  }
  if (isPieceRateWorker.value) {
    todayEntries.value.forEach(e => {
      if ((e.workCategory || 'MFG') !== 'TIME') {
        total += mesStore.calculateEntryEarnings(e, employee.value.id)
      }
    })
  }
  return total.toFixed(2)
})

// Can submit if: TIME worker has clocked in today OR piece-rate worker has entries
const canSubmitShift = computed(() => {
  if (isTimeWorker.value && todayAttendanceRecord.value) return true
  if (isPieceRateWorker.value && todayEntries.value.length > 0) return true
  return false
})

// ── Shift submissions ──
const mySubmissions = computed(() => {
  if (!employee.value) return []
  return mesStore.shiftSubmissions
    .filter(s => s.operator_id === employee.value.id)
    .sort((a,b) => new Date(b.transaction_date) - new Date(a.transaction_date))
})

const alreadySubmittedToday = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return mySubmissions.value.find(s => s.transaction_date === today) || null
})

const pendingSubmission = computed(() => alreadySubmittedToday.value?.target_name === 'pending')

const isSubmitting = ref(false)
const submitMessage = ref('')

async function submitTodayShift() {
  if (!employee.value || isSubmitting.value) return
  isSubmitting.value = true
  const result = await mesStore.submitShift(employee.value.id, employee.value.name)
  isSubmitting.value = false
  if (result.ok) {
    if (result.isTimeWorker) {
      submitMessage.value = `✓ Shift submitted! ${result.hoursWorkedToday}h worked · ETB ${result.totalEarnings} est. earnings. Awaiting admin approval.`
    } else {
      submitMessage.value = `✓ Shift submitted! ${result.totalGood} pcs good · ETB ${result.totalEarnings} est. earnings. Awaiting admin approval.`
    }
    setTimeout(() => { submitMessage.value = '' }, 5000)
  } else {
    submitMessage.value = '⚠ Submission failed. Please try again.'
    setTimeout(() => { submitMessage.value = '' }, 3000)
  }
}

// ── Logout ──
function logout() {
  sysAuth.lockSystem()
  router.push({ name: 'WelcomeAuth' })
}

// ── Profile Settings ──
const profileForm = ref({ full_name: '', phone_number: '', dob: '', avatar: '', pinConfirm: '' })
const isUploadingAvatar = ref(false)
const isSavingProfile = ref(false)
const profileMessage = ref('')

onMounted(() => {
  if (employee.value) {
    profileForm.value.full_name = employee.value.full_name || employee.value.name
    profileForm.value.phone_number = employee.value.phone_number || ''
    profileForm.value.dob = employee.value.dob || ''
    profileForm.value.avatar = employee.value.avatar || ''
  }
})

async function handleAvatarSelected(event) {
  const file = event.target.files[0]
  if (!file) return
  isUploadingAvatar.value = true
  profileMessage.value = ''
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${employee.value.id}_${Date.now()}.${fileExt}`
    const filePath = `${fileName}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file)
    if (uploadError) throw uploadError
    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
    profileForm.value.avatar = data.publicUrl
    profileMessage.value = 'Avatar uploaded successfully! Click Save Profile to apply.'
  } catch (error) {
    console.error('Avatar upload failed:', error)
    profileMessage.value = 'Error uploading avatar: ' + error.message
  } finally {
    isUploadingAvatar.value = false
  }
}

async function saveProfile() {
  if (!employee.value) return
  if (String(profileForm.value.pinConfirm) !== String(employee.value.pin_code)) {
    profileMessage.value = 'Incorrect PIN. Profile not saved.'
    setTimeout(() => { profileMessage.value = '' }, 3000)
    return
  }
  isSavingProfile.value = true
  profileMessage.value = ''
  try {
const payload = {
      full_name: profileForm.value.full_name,
      phone_number: profileForm.value.phone_number,
      dob: profileForm.value.dob || null,
      avatar: profileForm.value.avatar
    }

    const { error } = await supabase.from('mes_operators').update(payload).eq('id', employee.value.id)
    if (error) throw error
    profileMessage.value = 'Profile updated successfully!'
    profileForm.value.pinConfirm = ''
    mesStore.fetchInitialData()
  } catch (error) {
    console.error('Profile save failed:', error)
    profileMessage.value = 'Error saving profile: ' + error.message
  } finally {
    isSavingProfile.value = false
    setTimeout(() => { profileMessage.value = '' }, 3000)
  }
}
</script>

<style scoped>
.employee-portal {
  display: flex;
  width: 100vw;
  height: 100vh;
  background: #0f172a;
  color: #f1f5f9;
  font-family: 'Inter', sans-serif;
}

/* Sidebar */
.employee-sidebar {
  width: 100%;

  max-width: 340px;
  background: #1e293b;
  border-right: 1px solid rgba(255,255,255,0.1);
  display: flex;
  flex-direction: column;
  padding: 3rem 2rem;
}

.profile-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 3rem;
}

.op-avatar {
  width: 100px;
  height: 100px;
  border-radius: 24px;
  font-size: 3rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
  box-shadow: 0 10px 25px rgba(0,0,0,0.3);
}

.op-name { font-size: 1.8rem; font-weight: 800; margin: 0 0 0.5rem 0; }
.op-role { font-size: 1rem; color: #94a3b8; margin: 0; }

.portal-nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: transparent;
  color: #94a3b8;
  border: 1px solid transparent;
  border-radius: 1rem;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}
.nav-btn span { font-size: 1.5rem; }
.nav-btn:hover {
  background: rgba(255,255,255,0.05);
  color: #e2e8f0;
}
.nav-btn.active {
  background: rgba(99,102,241,0.15);
  border-color: rgba(99,102,241,0.3);
  color: #818cf8;
}

.sidebar-actions { margin-top: auto; }

.btn-logout {
  width: 100%;
  padding: 1.25rem;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 2px solid #ef4444;
  border-radius: 1rem;
  font-size: 1.1rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}
.btn-logout:hover { background: #ef4444; color: #fff; }

/* Main Content */
.portal-main {
  flex: 1;
  padding: 3rem 4rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.portal-header { margin-bottom: 3rem; }
.portal-header h1 { font-size: 2.5rem; font-weight: 900; margin: 0 0 0.5rem 0; color: #f8fafc; }
.portal-header p { font-size: 1.1rem; color: #94a3b8; margin: 0; }

.tab-content {
  animation: fadeIn 0.3s ease;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Dashboard Grid */
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
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

.card-content h3 { font-size: 1rem; color: #94a3b8; margin: 0 0 0.5rem 0; text-transform: uppercase; letter-spacing: 0.05em; }
.stat-value { font-size: 2.2rem; font-weight: 800; color: #f8fafc; margin-bottom: 0.25rem; }
.stat-value span { font-size: 1rem; color: #64748b; font-weight: 600; }
.stat-subtext { font-size: 0.85rem; color: #64748b; margin: 0; }

/* Split Layout (Loans) */
.split-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}
.form-card, .history-card {
  background: #1e293b;
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 1.5rem;
  padding: 2.5rem;
}
.form-card h3, .history-card h3 { margin: 0 0 1.5rem 0; font-size: 1.4rem; color: #f8fafc; }

.form-group { margin-bottom: 1.5rem; }
.form-group label { display: block; font-size: 0.9rem; font-weight: 600; color: #cbd5e1; margin-bottom: 0.5rem; }
.input-field {
  width: 100%;
  padding: 1rem;
  background: #0f172a;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 0.75rem;
  color: #f1f5f9;
  font-size: 1.1rem;
  font-family: inherit;
}
.input-field:focus { outline: none; border-color: #6366f1; }

.btn-submit {
  width: 100%;
  padding: 1.25rem;
  background: #10b981;
  color: #fff;
  border: none;
  border-radius: 0.75rem;
  font-size: 1.1rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 1rem;
}
.btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-submit:not(:disabled):hover { background: #059669; }

.success-msg { color: #34d399; font-weight: 600; margin-top: 1rem; text-align: center; }

.history-list { 
  display: flex; 
  flex-direction: column; 
  gap: 1rem;
  max-height: 400px;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.history-list::-webkit-scrollbar {
  display: none;
}
.history-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 1rem;
  background: rgba(255,255,255,0.03);
  border-radius: 0.75rem;
}
.history-left { display: flex; align-items: center; gap: 1rem; }
.history-icon { color: #fbbf24; background: rgba(245,158,11,0.1); padding: 0.5rem; border-radius: 0.5rem; }
.reason { display: block; font-weight: 600; color: #e2e8f0; font-size: 1.05rem; }
.status-pending, .status-pending_advance { color: #f59e0b; }
.status-active, .status-advance { color: #10b981; }
.status-rejected, .status-rejected_advance { color: #ef4444; }
.date { display: block; font-size: 0.85rem; color: #64748b; }
.amount { font-weight: 800; color: #34d399; font-size: 1.1rem; }

/* Attendance Centered Content */
.centered-content {
  display: flex;
  justify-content: center;
}
.attendance-card {
  background: #1e293b;
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 1.5rem;
  padding: 4rem;
  text-align: center;
  width: 100%;
  max-width: 600px;
}
.attendance-card h3 { font-size: 1.5rem; margin: 0 0 2rem 0; color: #f8fafc; }

.status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 2rem;
  border-radius: 999px;
  font-size: 1.5rem;
  font-weight: 800;
  margin-bottom: 2rem;
}
.status-dot { width: 1rem; height: 1rem; border-radius: 50%; background: currentColor; }
.status--in { background: rgba(16,185,129,0.15); color: #34d399; border: 1px solid rgba(16,185,129,0.3); }
.status--out { background: rgba(100,116,139,0.15); color: #94a3b8; border: 1px solid rgba(100,116,139,0.3); }

.status-desc { font-size: 1.2rem; color: #cbd5e1; margin-bottom: 3rem; line-height: 1.5; }

.attendance-actions { display: flex; justify-content: center; }
.btn-clock {
  padding: 1.5rem 3rem;
  font-size: 1.25rem;
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

/* Production Log Table */
.production-list-card {
  background: #1e293b;
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 1.5rem;
  padding: 2rem;
}
.production-list-card h3 { margin: 0 0 1.5rem 0; font-size: 1.4rem; color: #f8fafc; }
.data-table-container { overflow-x: auto; overflow-y: auto; max-height: 400px; width: 100%; scrollbar-width: none; -ms-overflow-style: none; } .data-table-container::-webkit-scrollbar { display: none; } .data-table {
  width: 100%;
  border-collapse: collapse;
}
.data-table th, .data-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.data-table th { color: #64748b; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em; }
.data-table td { color: #e2e8f0; font-size: 1.05rem; }
.align-right { text-align: right !important; }
.empty-text { text-align: center !important; color: #64748b !important; padding: 3rem !important; }

/* On-shift block */
.on-shift-block {
  grid-column: 1 / -1;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; gap: 1rem;
  background: rgba(245,158,11,0.06); border: 2px dashed rgba(245,158,11,0.3);
  border-radius: 1.5rem; padding: 3rem;
}
.on-shift-block h3 { font-size: 1.5rem; color: #fbbf24; margin: 0; }
.on-shift-block p  { font-size: 1.1rem; color: #94a3b8; margin: 0; max-width: 420px; line-height: 1.5; }
.on-shift-block p strong { color: #f59e0b; }

.status-warn { color: #fca5a5; font-size: 0.85rem; font-weight: 700; margin-top: 1rem; text-align: center; }

.bg-rose-500 { background-color: #f43f5e; color: #fff; }
.bg-indigo-500 { background-color: #6366f1; color: #fff; }
.bg-emerald-500 { background-color: #10b981; color: #fff; }
.bg-amber-500 { background-color: #f59e0b; color: #fff; }
.bg-cyan-500 { background-color: #06b6d4; color: #fff; }
.bg-purple-500 { background-color: #a855f7; color: #fff; }
.bg-sky-500 { background-color: #0ea5e9; color: #fff; }
.bg-orange-500 { background-color: #f97316; color: #fff; }
.bg-teal-500 { background-color: #14b8a6; color: #fff; }

/* Work Types */
.work-types-section {
  margin-top: 2rem;
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
.inactive-chip {
  background: rgba(100,116,139,0.1) !important;
  border-color: rgba(100,116,139,0.2) !important;
  color: #64748b !important;
}
.work-types-empty {
  display: flex; align-items: center; gap: 0.75rem;
  color: #475569; font-size: 1rem; padding: 1rem;
  background: rgba(255,255,255,0.02); border-radius: 0.75rem;
}

/* Nav badge */
.nav-badge {
  background: #f59e0b; color: #1c1917;
  font-size: 0.7rem; font-weight: 900;
  width: 1.2rem; height: 1.2rem; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  margin-left: auto;
}

/* Shift Summary Card */
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
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem;
  margin-bottom: 0.5rem;
}
.shift-stat {
  background: rgba(255,255,255,0.03); border-radius: 1rem; padding: 1.25rem;
  display: flex; flex-direction: column; align-items: center; gap: 0.4rem;
  border: 1px solid rgba(255,255,255,0.06);
}
.shift-stat-val { font-size: 1.75rem; font-weight: 900; font-variant-numeric: tabular-nums; }
.shift-stat-lbl { font-size: 0.8rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }

.submit-area { margin-top: 2rem; }
.btn-submit-shift {
  width: 100%; padding: 1.5rem;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff; border: none; border-radius: 1rem;
  font-size: 1.25rem; font-weight: 800; cursor: pointer;
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
.reject-reason { font-size: 0.9rem; color: #fca5a5; }

/* Submission row */
.submission-row {
  display: flex; align-items: center; gap: 1.5rem;
  padding: 1rem 0; border-bottom: 1px solid rgba(255,255,255,0.05);
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

.status-pending  { color: #f59e0b; font-weight: 800; }
.status-approved { color: #10b981; font-weight: 800; }
.status-rejected { color: #ef4444; font-weight: 800; }

/* Responsive Mobile Styles */
@media (max-width: 768px) {
  .employee-portal {
    flex-direction: column;
    height: auto;
    min-height: 100vh;
    overflow-x: hidden;
  }
  
  .employee-sidebar {
    max-width: 100%;
    padding: 1.5rem 1rem;
    border-right: none;
    border-bottom: 1px solid rgba(255,255,255,0.1);
  }
  
  .profile-section {
    flex-direction: row;
    text-align: left;
    margin-bottom: 1rem;
    gap: 1rem;
    justify-content: flex-start;
  }
  
  .op-avatar {
    width: 60px;
    height: 60px;
    font-size: 2rem;
    margin-bottom: 0;
  }
  
  .op-name { font-size: 1.4rem; margin: 0; }
  .op-role { font-size: 0.9rem; }
  
  .portal-nav {
    flex-direction: row;
    overflow-x: auto;
    padding-bottom: 0.5rem;
    gap: 0.5rem;
    /* Hide scrollbar for cleaner look but keep scrollable */
    scrollbar-width: none; 
    -ms-overflow-style: none;
  }
  .portal-nav::-webkit-scrollbar { display: none; }
  
  .nav-btn {
    white-space: nowrap;
    padding: 0.75rem 1rem;
    font-size: 0.95rem;
  }
  
  .sidebar-actions { margin-top: 1rem; }
  .btn-logout { padding: 1rem; font-size: 1rem; }
  
  .portal-main {
    padding: 1.5rem 1rem;
    overflow-y: visible; /* Let the body scroll */
  }
  
  .portal-header { margin-bottom: 1.5rem; }
  .portal-header h1 { font-size: 1.75rem; }
  
  .dashboard-grid, .split-layout { grid-template-columns: 1fr; gap: 1rem; }
  
  .stat-card, .form-card, .history-card, .attendance-card, .production-list-card, .shift-summary-card {
    padding: 1.5rem;
  }
  
  .shift-stats { grid-template-columns: 1fr 1fr; gap: 0.75rem; }
  
  .btn-clock { width: 100%; justify-content: center; padding: 1.25rem 1rem; font-size: 1rem; }
  
  .status-indicator { padding: 0.75rem 1.5rem; font-size: 1.2rem; }
  
  /* Make tables scrollable horizontally */
  .data-table-container {
    overflow-x: auto;
    width: 100%;
  }
  
  .data-table-container { overflow-x: auto; overflow-y: auto; max-height: 400px; width: 100%; scrollbar-width: none; -ms-overflow-style: none; } .data-table-container::-webkit-scrollbar { display: none; } .data-table {
    white-space: nowrap;
  }
  
  .submission-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .sub-stats { width: 100%; justify-content: space-between; }
  .sub-status { align-self: flex-start; }
}
</style>

