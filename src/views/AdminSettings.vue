<template>
  <AppLayout>
    <main class="admin-main">
      <!-- ─── TOP: Settings Nav Bar ─────────────────────────────── -->
      <nav class="settings-top-nav flex justify-between items-center flex-wrap gap-2">
        <div class="flex items-center gap-1.5 flex-wrap">
          <button class="snav-item" :class="{'snav-item--active': activeTab === 'employees'}" @click="activeTab = 'employees'">
            <span class="material-symbols-rounded snav-icon">group</span>
            <span class="snav-label">Employees</span>
          </button>
          <button class="snav-item" :class="{'snav-item--active': activeTab === 'rates'}" @click="activeTab = 'rates'">
            <span class="material-symbols-rounded snav-icon">price_change</span>
            <span class="snav-label">Piece Rates</span>
          </button>
          <button class="snav-item" :class="{'snav-item--active': activeTab === 'thresholds'}" @click="activeTab = 'thresholds'">
            <span class="material-symbols-rounded snav-icon">warning</span>
            <span class="snav-label">Thresholds</span>
          </button>
          <button class="snav-item" :class="{'snav-item--active': activeTab === 'system'}" @click="activeTab = 'system'">
            <span class="material-symbols-rounded snav-icon">tune</span>
            <span class="snav-label">System</span>
          </button>
          <button class="snav-item" :class="{'snav-item--active': activeTab === 'profile'}" @click="activeTab = 'profile'">
            <span class="material-symbols-rounded snav-icon">person</span>
            <span class="snav-label">My Profile</span>
          </button>
        </div>

        <div class="flex items-center gap-2">
          <button 
            v-if="['rates', 'thresholds', 'system'].includes(activeTab)"
            class="px-4 py-2 rounded-lg text-sm font-bold bg-emerald-600/90 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            @click="applyChanges"
            title="Save configuration changes to database"
          >
            <span class="material-symbols-rounded text-base">save</span>
            <span>{{ saved ? 'Saved!' : 'Save Settings' }}</span>
          </button>
          <button class="sync-btn cursor-pointer" :disabled="isSyncing" @click="manualSync" title="Sync settings now">
            <span class="material-symbols-rounded" :class="{ 'spin-icon': isSyncing }">sync</span>
            <span>{{ isSyncing ? 'Syncing...' : 'Sync Now' }}</span>
          </button>
        </div>
      </nav>


      <!-- ══════════════════════════════════════════════════════════════
           TAB 0: EMPLOYEES
      ══════════════════════════════════════════════════════════════ -->
      <div v-if="activeTab === 'employees'" class="tab-panel">
        <EmployeeManager />
      </div>

      <!-- ══════════════════════════════════════════════════════════════
           TAB 1: PIECE RATES
      ══════════════════════════════════════════════════════════════ -->
      <div v-if="activeTab === 'rates'" class="tab-panel">
        <div class="panel-header">
          <span class="material-symbols-rounded panel-icon" style="color:#6366f1">price_change</span>
          <div>
            <h2 class="panel-title">Piece-Rate Configuration</h2>
            <p class="panel-sub">Configure rates and custom labels for each work category</p>
          </div>
        </div>

        <!-- Custom 'Other' Label Settings -->
        <div class="other-config-panel" v-if="store.systemConfig?.otherDividerType && store.systemConfig?.otherPlacement">
          <p class="config-panel-title"><span class="material-symbols-rounded">settings</span> Custom Labels</p>
          <div class="other-config-row">
            <div class="other-config-item">
              <label><input type="checkbox" v-model="store.systemConfig.otherDividerType.enabled" /> Enable Custom Divider Type</label>
              <input type="text" v-model="store.systemConfig.otherDividerType.label" placeholder="Custom label (e.g. Special Type)" :disabled="!store.systemConfig.otherDividerType.enabled" class="mes-input" />
            </div>
            <div class="other-config-item">
              <label><input type="checkbox" v-model="store.systemConfig.otherPlacement.enabled" /> Enable Custom Placement</label>
              <input type="text" v-model="store.systemConfig.otherPlacement.label" placeholder="Custom label (e.g. Special Place)" :disabled="!store.systemConfig.otherPlacement.enabled" class="mes-input" />
            </div>
          </div>
        </div>

        <!-- Category Sub-tabs -->
        <div class="cat-tabs">
          <button v-for="cat in ['MFG', 'C', 'PP', 'PL']" :key="cat" class="cat-tab" :class="{'cat-tab--active': activeRateCat === cat}" @click="activeRateCat = cat">
            {{ cat === 'MFG' ? 'Manufacturing' : cat === 'C' ? 'Wood Prep' : cat === 'PP' ? 'Paper Place' : 'Plaster Place' }}
          </button>
        </div>

        <!-- Divider Type tabs (Hidden for C) -->
        <div class="type-tabs" v-if="activeRateCat !== 'C'">
          <button
            v-for="t in allDividerTypesForRates"
            :key="t"
            class="type-tab"
            :class="{ 'type-tab--active': selectedType === t }"
            @click="selectedType = t"
          >{{ t === 'Other' ? (store.systemConfig?.otherDividerType?.label || 'Other') : t }}</button>
        </div>

        <!-- Rate Matrix for selected type -->
        <div class="rate-grid">
          
          <!-- If category ONLY uses Types (MFG) -->
          <template v-if="activeRateCat === 'MFG'">
            <div class="rate-row" style="background: rgba(255,255,255,0.02); padding: 1.5rem; border-radius: 0.75rem; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 1rem;">
              <div class="rate-meta">
                <span class="placement-badge" style="background: rgba(99,102,241,.15); color: #818cf8;">Flat Rate</span>
                <span class="rate-key">Type {{ selectedType === 'Other' ? (store.systemConfig?.otherDividerType?.label || 'Custom') : selectedType }}</span>
              </div>
              <div class="stepper">
                <button class="step-btn step-btn--minus" @click="adjustRate(activeRateCat, selectedType, null, null, -0.25)">
                  <span class="material-symbols-rounded">remove</span>
                </button>
                <div class="step-display">
                  <span class="step-currency">ETB</span>
                  <span class="step-val">{{ getRate(activeRateCat, selectedType, null, null).toFixed(2) }}</span>
                </div>
                <button class="step-btn step-btn--plus" @click="adjustRate(activeRateCat, selectedType, null, null, +0.25)">
                  <span class="material-symbols-rounded">add</span>
                </button>
              </div>
            </div>
          </template>

          <!-- Categories with Sizes (C, PP, PL) -->
          <template v-else>
            <div
              v-for="size in sizes"
              :key="size"
              class="rate-group"
            >
              <p class="rate-group-title">
                <span class="material-symbols-rounded" style="font-size:.9rem;color:#6366f1">straighten</span>
                {{ size }}
              </p>
              <div class="rate-rows">
                <!-- If category uses placements (C) -->
                <template v-if="activeRateCat === 'C'">
                  <div
                    v-for="placement in allPlacementsForRates"
                    :key="placement"
                    class="rate-row"
                  >
                    <div class="rate-meta">
                      <span class="placement-badge">{{ placement === 'Other' ? (store.systemConfig?.otherPlacement?.label || 'Other') : placement }}</span>
                      <span class="rate-key">{{ size }}</span>
                    </div>

                    <!-- Stepper -->
                    <div class="stepper">
                      <button class="step-btn step-btn--minus" @click="adjustRate(activeRateCat, null, size, placement, -0.25)">
                        <span class="material-symbols-rounded">remove</span>
                      </button>
                      <div class="step-display">
                        <span class="step-currency">ETB</span>
                        <span class="step-val">{{ getRate(activeRateCat, null, size, placement).toFixed(2) }}</span>
                      </div>
                      <button class="step-btn step-btn--plus" @click="adjustRate(activeRateCat, null, size, placement, +0.25)">
                        <span class="material-symbols-rounded">add</span>
                      </button>
                    </div>
                  </div>
                </template>

                <!-- If category does NOT use placements (PP, PL) -->
                <template v-else>
                  <div class="rate-row">
                    <div class="rate-meta">
                      <span class="placement-badge" style="background: rgba(16,185,129,.15); color: #10b981;">No Placement Used</span>
                      <span class="rate-key">Type {{ selectedType === 'Other' ? (store.systemConfig?.otherDividerType?.label || 'Custom') : selectedType }} &bull; {{ size }}</span>
                    </div>

                    <!-- Stepper -->
                    <div class="stepper">
                      <button class="step-btn step-btn--minus" @click="adjustRate(activeRateCat, selectedType, size, null, -0.25)">
                        <span class="material-symbols-rounded">remove</span>
                      </button>
                      <div class="step-display">
                        <span class="step-currency">ETB</span>
                        <span class="step-val">{{ getRate(activeRateCat, selectedType, size, null).toFixed(2) }}</span>
                      </div>
                      <button class="step-btn step-btn--plus" @click="adjustRate(activeRateCat, selectedType, size, null, +0.25)">
                        <span class="material-symbols-rounded">add</span>
                      </button>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════════
           TAB 2: WASTE THRESHOLDS
      ══════════════════════════════════════════════════════════════ -->
      <div v-if="activeTab === 'thresholds'" class="tab-panel">
        <div class="panel-header">
          <span class="material-symbols-rounded panel-icon" style="color:#f59e0b">warning</span>
          <div>
            <h2 class="panel-title">Waste Alert Thresholds</h2>
            <p class="panel-sub">Define the waste % values that trigger system alerts on Quality Control</p>
          </div>
        </div>

        <div class="threshold-cards">
          <!-- Warning Threshold -->
          <div class="threshold-card threshold-card--warn">
            <div class="tc-header">
              <span class="material-symbols-rounded" style="color:#f59e0b;font-size:1.6rem">warning_amber</span>
              <div>
                <p class="tc-title">Warning Level</p>
                <p class="tc-sub">Amber alert — operator review needed</p>
              </div>
            </div>

            <div class="slider-area">
              <div class="slider-val-row">
                <span class="slider-val warn">{{ store.wasteThresholds.warn }}%</span>
                <span class="slider-hint">of total batch</span>
              </div>
              <div class="slider-with-steppers">
                <button class="step-btn step-btn--minus" @click="store.setWasteThreshold('warn', store.wasteThresholds.warn - 1)">
                  <span class="material-symbols-rounded">remove</span>
                </button>
                <div class="slider-track-wrap">
                  <input
                    type="range"
                    min="1" max="30"
                    :value="store.wasteThresholds.warn"
                    @input="store.setWasteThreshold('warn', $event.target.value)"
                    class="mes-slider mes-slider--warn"
                  />
                  <div
                    class="slider-fill slider-fill--warn"
                    :style="{ width: (store.wasteThresholds.warn / 30 * 100) + '%' }"
                  />
                </div>
                <button class="step-btn step-btn--plus" @click="store.setWasteThreshold('warn', store.wasteThresholds.warn + 1)">
                  <span class="material-symbols-rounded">add</span>
                </button>
              </div>
              <div class="slider-scale">
                <span>1%</span><span>15%</span><span>30%</span>
              </div>
            </div>
          </div>

          <!-- Critical Threshold -->
          <div class="threshold-card threshold-card--critical">
            <div class="tc-header">
              <span class="material-symbols-rounded" style="color:#ef4444;font-size:1.6rem">crisis_alert</span>
              <div>
                <p class="tc-title">Critical Level</p>
                <p class="tc-sub">Red alert — line supervisor intervention</p>
              </div>
            </div>

            <div class="slider-area">
              <div class="slider-val-row">
                <span class="slider-val critical">{{ store.wasteThresholds.critical }}%</span>
                <span class="slider-hint">of total batch</span>
              </div>
              <div class="slider-with-steppers">
                <button class="step-btn step-btn--minus" @click="store.setWasteThreshold('critical', store.wasteThresholds.critical - 1)">
                  <span class="material-symbols-rounded">remove</span>
                </button>
                <div class="slider-track-wrap">
                  <input
                    type="range"
                    min="5" max="50"
                    :value="store.wasteThresholds.critical"
                    @input="store.setWasteThreshold('critical', $event.target.value)"
                    class="mes-slider mes-slider--critical"
                  />
                  <div
                    class="slider-fill slider-fill--critical"
                    :style="{ width: ((store.wasteThresholds.critical - 5) / 45 * 100) + '%' }"
                  />
                </div>
                <button class="step-btn step-btn--plus" @click="store.setWasteThreshold('critical', store.wasteThresholds.critical + 1)">
                  <span class="material-symbols-rounded">add</span>
                </button>
              </div>
              <div class="slider-scale">
                <span>5%</span><span>25%</span><span>50%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Visual preview of alert bands -->
        <div class="alert-preview">
          <p class="preview-title">Alert Band Preview</p>
          <div class="preview-bar-track">
            <div class="preview-ok"   :style="{ width: store.wasteThresholds.warn + '%' }">
              <span>SAFE</span>
            </div>
            <div class="preview-warn" :style="{ width: (store.wasteThresholds.critical - store.wasteThresholds.warn) + '%' }">
              <span>WARN</span>
            </div>
            <div class="preview-critical" style="flex:1">
              <span>CRITICAL</span>
            </div>
          </div>
          <div class="preview-labels">
            <span>0%</span>
            <span :style="{ marginLeft: store.wasteThresholds.warn + '%' }">{{ store.wasteThresholds.warn }}%</span>
            <span :style="{ marginLeft: (store.wasteThresholds.critical - store.wasteThresholds.warn) + '%' }">{{ store.wasteThresholds.critical }}%</span>
            <span style="margin-left:auto">100%</span>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════════
           TAB 3: SYSTEM CONFIG
      ══════════════════════════════════════════════════════════════ -->
      <div v-if="activeTab === 'system'" class="tab-panel">
        <div class="panel-header">
          <span class="material-symbols-rounded panel-icon" style="color:#10b981">tune</span>
          <div>
            <h2 class="panel-title">System Configuration</h2>
            <p class="panel-sub">Global flags, integrations, and operator rules</p>
          </div>
        </div>

        <div class="config-list">
          <!-- Toggle Items -->
          <div
            v-for="flag in boolFlags"
            :key="flag.key"
            class="config-item"
          >
            <div class="config-info">
              <span class="material-symbols-rounded config-icon" :style="{ color: flag.color }">{{ flag.icon }}</span>
              <div>
                <p class="config-label">{{ flag.label }}</p>
                <p class="config-desc">{{ flag.desc }}</p>
              </div>
            </div>
            <button
              class="toggle-switch"
              :class="{ 'toggle-switch--on': store.systemConfig[flag.key] }"
              @click="store.updateSystemConfig(flag.key, !store.systemConfig[flag.key])"
            >
              <span class="toggle-thumb" />
            </button>
          </div>

          <!-- Text Config: Export Recipient -->
          <div class="config-item config-item--text">
            <div class="config-info">
              <span class="material-symbols-rounded config-icon" style="color:#3b82f6">send</span>
              <div>
                <p class="config-label">Export Recipient Name</p>
                <p class="config-desc">Display name shown on the analytics "Export &amp; Forward" button</p>
              </div>
            </div>
            <div class="recipient-pills">
              <button
                v-for="name in recipientOptions"
                :key="name"
                class="recipient-pill"
                :class="{ 'recipient-pill--active': store.systemConfig.exportRecipient === name }"
                @click="store.updateSystemConfig('exportRecipient', name)"
              >{{ name }}</button>
            </div>
          </div>

          <!-- Payout Day -->
          <div class="config-item config-item--text">
            <div class="config-info">
              <span class="material-symbols-rounded config-icon" style="color:#10b981">payments</span>
              <div>
                <p class="config-label">Weekly Payout Day</p>
                <p class="config-desc">The specific day of the week when "Approve & Pay" is allowed.</p>
              </div>
            </div>
            <div class="recipient-pills">
              <button
                v-for="day in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']"
                :key="day"
                class="recipient-pill"
                :class="{ 'recipient-pill--active': store.systemConfig.payoutDay === day }"
                @click="store.updateSystemConfig('payoutDay', day)"
              >{{ day.substring(0,3) }}</button>
            </div>
          </div>

          <!-- Attendance Clocking Windows -->
          <div class="config-item config-item--text clocking-windows-config">
            <div class="config-info">
              <span class="material-symbols-rounded config-icon" style="color:#f59e0b">schedule</span>
              <div>
                <p class="config-label">Allowed Clocking Windows</p>
                <p class="config-desc">Employees can only clock in/out between these times. Outside these times, Admin PIN override is required.</p>
              </div>
            </div>
            <div class="windows-list">
              <div v-for="w in attStore.clockingWindows" :key="w.id" class="window-row">
                <span class="window-name">{{ w.name }} ({{ w.type.toUpperCase() }})</span>
                <div class="time-inputs">
                  <input type="time" v-model="w.start" class="time-input" @change="attStore.updateWindow(w.id, w.start, w.end)" />
                  <span class="time-to">to</span>
                  <input type="time" v-model="w.end" class="time-input" @change="attStore.updateWindow(w.id, w.start, w.end)" />
                </div>
              </div>
            </div>
          </div>

          <!-- Production Week Override -->
          <div class="config-item config-item--text">
            <div class="config-info">
              <span class="material-symbols-rounded config-icon" :style="{ color: store.weekStatus?.isCurrent ? '#10b981' : store.weekStatus?.isPast ? '#f59e0b' : '#6366f1' }">
                {{ store.weekStatus?.isCurrent ? 'event_available' : store.weekStatus?.isPast ? 'history' : 'event' }}
              </span>
              <div>
                <div class="flex items-center gap-2">
                  <p class="config-label">Production Week</p>
                  <span 
                    class="text-[0.65rem] font-extrabold uppercase px-2 py-0.5 rounded-full"
                    :style="{
                      background: store.weekStatus?.isCurrent ? 'rgba(16,185,129,0.15)' : store.weekStatus?.isPast ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.15)',
                      color: store.weekStatus?.isCurrent ? '#34d399' : store.weekStatus?.isPast ? '#fbbf24' : '#a5b4fc',
                      border: '1px solid ' + (store.weekStatus?.isCurrent ? 'rgba(16,185,129,0.3)' : store.weekStatus?.isPast ? 'rgba(245,158,11,0.3)' : 'rgba(99,102,241,0.3)')
                    }"
                  >
                    ● {{ store.weekStatus?.label }}
                  </span>
                </div>
                <p class="config-desc">{{ store.weekStatus?.dateRange }} · {{ store.weekStatus?.description }}</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <div class="week-steppers">
                <button class="step-btn step-btn--minus" @click="store.shiftProductionWeek(-1)">
                  <span class="material-symbols-rounded">chevron_left</span>
                </button>
                <span class="week-display font-mono">{{ store.currentProductionWeek }}</span>
                <button class="step-btn step-btn--plus" @click="store.shiftProductionWeek(1)">
                  <span class="material-symbols-rounded">chevron_right</span>
                </button>
              </div>
              <button 
                v-if="!store.weekStatus?.isCurrent"
                @click="store.resetToCurrentWeek()"
                class="px-3 py-2 rounded-xl text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 transition-all flex items-center gap-1 cursor-pointer"
                title="Reset to current calendar week"
              >
                <span class="material-symbols-rounded text-sm">restart_alt</span>
                Reset to Current ({{ store.actualCalendarWeek }})
              </button>
            </div>
          </div>

          <!-- Save System Config Button -->
          <div class="flex justify-end pt-4 border-t border-white/5 mt-4">
            <button 
              @click="applyChanges" 
              class="px-6 py-3 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-900/20"
            >
              <span class="material-symbols-rounded">save</span>
              {{ saved ? '✓ Saved!' : 'Save System Settings' }}
            </button>
          </div>
        </div>
      </div>
      
      <!-- ══════════════════════════════════════════════════════════════
           TAB 4: MY PROFILE
      ══════════════════════════════════════════════════════════════ -->
      <div v-if="activeTab === 'profile'" class="tab-panel" style="max-width: 600px; margin: 0 auto;">
        <div class="panel-header" style="justify-content: center; text-align: center; margin-bottom: 2rem;">
          <h2 class="panel-title">Admin Profile</h2>
        </div>
        
        <div v-if="adminOperator" class="production-list-card">
          <!-- Avatar Preview & Upload -->
          <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem; margin-bottom: 2rem;">
            <OperatorAvatar :avatar="profileForm.avatar" :name="adminOperator.name" :color="adminOperator.color" size="xl" />
            
            <div style="position: relative;">
              <input type="file" accept="image/*" @change="handleAvatarSelected" style="position: absolute; opacity: 0; width: 100%; height: 100%; cursor: pointer;" :disabled="isUploadingAvatar" />
              <button class="nav-btn" style="pointer-events: none; justify-content: center; background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.3); color: white; padding: 0.5rem 1rem; border-radius: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                <span class="material-symbols-rounded">{{ isUploadingAvatar ? 'hourglass_empty' : 'upload' }}</span>
                {{ isUploadingAvatar ? 'Uploading...' : 'Change Picture' }}
              </button>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <div style="display: flex; flex-direction: column; gap: 0.25rem;">
              <label style="color: #94a3b8; font-size: 0.85rem; font-weight: 600;">Full Name</label>
              <input v-model="profileForm.full_name" type="text" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 0.75rem; border-radius: 0.5rem; width: 100%;" placeholder="Enter full name" />
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 0.25rem;">
              <label style="color: #94a3b8; font-size: 0.85rem; font-weight: 600;">Phone Number</label>
              <input v-model="profileForm.phone_number" type="tel" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 0.75rem; border-radius: 0.5rem; width: 100%;" placeholder="09..." />
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 0.25rem;">
              <label style="color: #94a3b8; font-size: 0.85rem; font-weight: 600;">Date of Birth</label>
              <input v-model="profileForm.dob" type="date" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 0.75rem; border-radius: 0.5rem; width: 100%;" />
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 0.25rem; margin-top: 1rem;">
              <label style="color: #94a3b8; font-size: 0.85rem; font-weight: 600;">Confirm PIN to Save</label>
              <input v-model="profileForm.pinConfirm" type="password" maxlength="4" inputmode="numeric" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 0.75rem; border-radius: 0.5rem; width: 100%;" placeholder="Enter your 4-digit PIN" />
            </div>
          </div>

          <div style="margin-top: 2rem;">
            <button style="width: 100%; background: #6366f1; color: white; padding: 1rem; border-radius: 0.5rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 0.5rem;" @click="saveProfile" :disabled="isSavingProfile || !profileForm.pinConfirm">
              <span class="material-symbols-rounded">save</span>
              {{ isSavingProfile ? 'Saving...' : 'Save Profile' }}
            </button>
            <p v-if="profileMessage" style="text-align: center; margin-top: 1rem; font-size: 0.85rem;" :style="{ color: profileMessage.includes('Error') || profileMessage.includes('Incorrect') ? '#ef4444' : '#10b981' }">{{ profileMessage }}</p>
          </div>
        </div>
        <div v-else style="text-align: center; padding: 3rem; color: #94a3b8;">
          Cannot load admin profile. Please login again.
        </div>
      </div>

      <!-- Toast -->
      <Transition name="toast">
        <div v-if="toast.visible" class="set-toast">
          <span class="material-symbols-rounded">check_circle</span>
          {{ toast.message }}
        </div>
      </Transition>
    </main>
  </AppLayout>
</template>

<script setup>
// Developer: Mintesnot Abebe | Brand: dev MinteIO
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { useMesStore } from '@/store/mesStore.js'
import { useAttendanceStore } from '@/store/attendanceStore.js'
import { useSystemAuthStore } from '@/store/systemAuthStore.js'
import AppLayout from '@/components/layout/AppLayout.vue'
import EmployeeManager from '@/components/EmployeeManager.vue'
import OperatorAvatar from '@/components/ui/OperatorAvatar.vue'

const store = useMesStore()
const attStore = useAttendanceStore()
const sysAuth = useSystemAuthStore()

const isSyncing = ref(false)
let refreshTimer = null

const toast = reactive({ visible: false, message: '' })
let toastTimer = null
function showToast(msg) {
  toast.message = msg
  toast.visible = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.visible = false }, 2500)
}

function ensureSystemConfigIntegrity() {
  if (!store.systemConfig) {
    store.systemConfig = {}
  }
  if (!store.systemConfig.otherDividerType) {
    store.systemConfig.otherDividerType = { enabled: false, label: 'Other' }
  }
  if (!store.systemConfig.otherPlacement) {
    store.systemConfig.otherPlacement = { enabled: false, label: 'Other' }
  }
  if (!store.systemConfig.payoutDay) {
    store.systemConfig.payoutDay = 'Friday'
  }
  if (!store.systemConfig.exportRecipient) {
    store.systemConfig.exportRecipient = 'Frezer'
  }
  if (!store.wasteThresholds) {
    store.wasteThresholds = { warn: 8, critical: 15 }
  }
}

async function manualSync() {
  isSyncing.value = true
  try {
    ensureSystemConfigIntegrity()
    await Promise.all([
      store.fetchInitialData(),
      attStore.loadAttendanceLogs()
    ])
    ensureSystemConfigIntegrity()
    loadProfileData()
    showToast('✓ Settings & profiles synced')
  } finally {
    setTimeout(() => { isSyncing.value = false }, 400)
  }
}

onMounted(async () => {
  ensureSystemConfigIntegrity()
  await Promise.all([
    store.fetchInitialData(),
    attStore.loadAttendanceLogs()
  ])
  ensureSystemConfigIntegrity()
  loadProfileData()

  refreshTimer = setInterval(async () => {
    await store.fetchInitialData()
    ensureSystemConfigIntegrity()
  }, 30000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})

// ─── Nav state ──────────────────────────────────────────────────────────────
const activeTab    = ref('employees')
const activeRateCat = ref('MFG')
const selectedType = ref('50')

// ─── Rate config ────────────────────────────────────────────────────────────
const dividerTypes = ['50', '40', '30', '16', '12', '45']
const sizes        = ['9cm', '7cm']
const placements   = ['ብተና', 'ውስጥ', 'የተለየ']

const allDividerTypesForRates = computed(() => {
  return store.systemConfig?.otherDividerType?.enabled ? [...dividerTypes, 'Other'] : dividerTypes
})

const allPlacementsForRates = computed(() => {
  return store.systemConfig?.otherPlacement?.enabled ? [...placements, 'Other'] : placements
})

  function getRate(category, type, size, placement) {
    let rate = 0
    if (category === 'MFG') {
      const val = store.pieceRates?.['MFG']?.[type]
      rate = typeof val === 'number' ? val : (val?.['9cm']?.['ብተና'] || 0)
    } else if (category === 'C') {
      rate = store.pieceRates?.['C']?.['null']?.[size]?.[placement] ?? store.pieceRates?.['C']?.['50']?.[size]?.[placement]
    } else if (category === 'PP' || category === 'PL') {
      rate = store.pieceRates?.[category]?.[type]?.[size]
    } else {
      rate = store.pieceRates?.[category]?.[type]?.[size]?.[placement]
    }
    return (typeof rate === 'number' && !isNaN(rate)) ? rate : 0
  }

function adjustRate(category, type, size, placement, delta) {
  const current = getRate(category, type, size, placement)
  store.setPieceRate(category, type, size, placement, Math.max(0, +(current + delta).toFixed(2)))
}

// ─── System flags ───────────────────────────────────────────────────────────
const boolFlags = [
  { key: 'autoPauseOnDowntime',     label: 'Auto-Pause on Downtime',       desc: 'Disable production entry when a downtime session is active', icon: 'pause_circle',  color: '#f59e0b' },
  { key: 'requireOperatorForEntry', label: 'Require Operator for Entry',    desc: 'Block production saves unless an operator is clocked in',   icon: 'badge',         color: '#6366f1' },
  { key: 'telegramBotEnabled',      label: 'Telegram Bot Integration',      desc: 'Enable automated report forwarding via Telegram',           icon: 'send',          color: '#3b82f6' },
]
const recipientOptions = ['Frezer', 'Manager', 'Owner', 'Selam']

// ─── Week stepper ───────────────────────────────────────────────────────────
function shiftWeek(delta) {
  const current = store.currentProductionWeek // e.g. "W29-2026"
  const match = current.match(/W(\d+)-(\d+)/)
  if (!match) return
  let week = Number(match[1]) + delta
  let year = Number(match[2])
  if (week < 1)  { year--; week = 52 }
  if (week > 52) { year++; week = 1 }
  store.setProductionWeek(`W${String(week).padStart(2,'0')}-${year}`)
}

// ─── Apply confirmation ─────────────────────────────────────────────────────
const saved = ref(false)
let savedTimer = null
async function applyChanges() {
  const ok = await store.saveSystemConfig({
    pieceRates: store.pieceRates,
    wasteThresholds: store.wasteThresholds,
    systemConfig: store.systemConfig,
    clockingWindows: attStore.clockingWindows,
  })
  if (ok) {
    saved.value = true
    showToast('✓ System configuration saved successfully')
    clearTimeout(savedTimer)
    savedTimer = setTimeout(() => { saved.value = false }, 2500)
  } else {
    showToast('⚠ Failed to save settings')
  }
}

// ─── Profile Logic ──────────────────────────────────────────────────────────
const adminOperator = computed(() => {
  if (sysAuth.currentEmployeeId) {
    const found = (store.operators || []).find(o => o.id === sysAuth.currentEmployeeId)
    if (found) return found
  }
  return (store.operators || []).find(o => ['admin', 'System Admin', 'manager', 'Supervisor'].includes(o.role)) || (store.operators || [])[0] || null
})

const profileForm = ref({ full_name: '', phone_number: '', dob: '', avatar: '', pinConfirm: '' })
const isUploadingAvatar = ref(false)
const isSavingProfile = ref(false)
const profileMessage = ref('')

function loadProfileData() {
  if (adminOperator.value) {
    profileForm.value.full_name = adminOperator.value.full_name || adminOperator.value.name
    profileForm.value.phone_number = adminOperator.value.phone_number || ''
    profileForm.value.dob = adminOperator.value.dob || ''
    profileForm.value.avatar = adminOperator.value.avatar || ''
  }
}

watch(adminOperator, () => loadProfileData())

async function handleAvatarSelected(event) {
  const file = event.target.files[0]
  if (!file) return
  isUploadingAvatar.value = true
  profileMessage.value = ''
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${adminOperator.value.id}_${Date.now()}.${fileExt}`
    const filePath = `public/${fileName}`
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
  if (!adminOperator.value) return
  if (String(profileForm.value.pinConfirm) !== String(adminOperator.value.pin_code)) {
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

    const { error } = await supabase.from('mes_operators').update(payload).eq('id', adminOperator.value.id)
    if (error) throw error
    profileMessage.value = 'Profile updated successfully!'
    profileForm.value.pinConfirm = ''
    store.fetchInitialData()
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


/* ── Sidebar ───────────────────────────────────────────────────────────── */


.sidebar-brand { display: flex; align-items: center; gap: .7rem; padding-bottom: .75rem; border-bottom: 1px solid rgba(255,255,255,.07); }
.brand-icon    { font-size: 1.5rem !important; color: #10b981; }
.brand-title   { font-size: .95rem; font-weight: 800; color: #f1f5f9; }
.brand-sub     { font-size: .62rem; color: #64748b; text-transform: uppercase; letter-spacing: .06em; }

.settings-top-nav {
  display: flex; gap: 0.5rem;
  padding: 1rem 1.5rem;
  background: #1e293b;
  border-bottom: 1px solid rgba(255,255,255,.07);
}
.snav-item {
  display: flex; align-items: center; gap: .5rem;
  padding: .6rem 1rem;
  background: transparent;
  border: 1px solid rgba(255,255,255,.07);
  border-radius: .5rem;
  color: #64748b;
  cursor: pointer;
  transition: all .15s ease;
}
.snav-item:hover        { background: rgba(255,255,255,.05); color: #cbd5e1; }
.snav-item--active      { background: rgba(16,185,129,.12); border-color: #10b981; color: #34d399; }
.snav-icon              { font-size: 1.1rem !important; }
.snav-label             { font-size: .85rem; font-weight: 700; }

.apply-btn {
  height: 4.5rem;
  background: linear-gradient(135deg,#059669,#10b981);
  border: none;
  border-radius: .85rem;
  color: #fff;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: .07em;
  display: flex; align-items: center; justify-content: center; gap: .5rem;
  cursor: pointer;
  transition: all .15s ease;
  flex-shrink: 0;
}
.apply-btn:hover  { filter: brightness(1.1); }
.apply-btn:active { transform: scale(.97); }

.saved-toast {
  background: rgba(16,185,129,.9);
  color: #fff;
  border-radius: .55rem;
  padding: .5rem .9rem;
  font-size: .8rem; font-weight: 700;
  display: flex; align-items: center; gap: .35rem;
  text-align: center; justify-content: center;
}
.toast-enter-active, .toast-leave-active { transition: all .2s ease; }
.toast-enter-from, .toast-leave-to       { opacity: 0; }

/* ── Main Panel ────────────────────────────────────────────────────────── */
.admin-main {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  position: relative;
}

.tab-panel { display: flex; flex-direction: column; gap: 1.25rem; padding: 1.5rem; }

.panel-header {
  display: flex; align-items: center; gap: .85rem;
  padding-bottom: .9rem;
  border-bottom: 1px solid rgba(255,255,255,.07);
}
.panel-icon  { font-size: 1.6rem !important; }
.panel-title { font-size: 1.1rem; font-weight: 800; color: #f1f5f9; }
.panel-sub   { font-size: .72rem; color: #64748b; margin-top: .15rem; }

/* ── Type Tabs ─────────────────────────────────────────────────────────── */
.type-tabs {
  display: flex; gap: .5rem;
}
.type-tab {
  flex: 1;
  height: 3rem;
  background: #1e293b;
  border: 1px solid rgba(255,255,255,.09);
  color: #64748b;
  border-radius: .6rem;
  font-size: 1rem; font-weight: 800;
  cursor: pointer;
  transition: all .13s ease;
}
.type-tab:hover      { background: #253347; color: #e2e8f0; }
.type-tab--active    { background: rgba(99,102,241,.2); border-color: #6366f1; color: #a5b4fc; }

/* ── Rate Grid ─────────────────────────────────────────────────────────── */
.rate-grid { display: flex; flex-direction: column; gap: 1rem; }
.rate-group {
  background: #1e293b;
  border: 1px solid rgba(255,255,255,.07);
  border-radius: .85rem;
  overflow: hidden;
}
.rate-group-title {
  display: flex; align-items: center; gap: .4rem;
  padding: .6rem 1rem;
  background: rgba(99,102,241,.08);
  border-bottom: 1px solid rgba(255,255,255,.07);
  font-size: .72rem; font-weight: 800; color: #a5b4fc;
  letter-spacing: .08em; text-transform: uppercase;
}
.rate-rows { display: flex; flex-direction: column; }
.rate-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: .85rem 1rem;
  border-bottom: 1px solid rgba(255,255,255,.05);
  gap: 1rem;
}
.rate-row:last-child { border-bottom: none; }
.rate-meta { display: flex; align-items: center; gap: .6rem; }
.placement-badge {
  background: rgba(99,102,241,.12);
  border: 1px solid rgba(99,102,241,.25);
  color: #a5b4fc;
  padding: .2rem .6rem;
  border-radius: .35rem;
  font-size: .8rem; font-weight: 700;
}
.rate-key { font-size: .7rem; color: #475569; }

/* ── Stepper ───────────────────────────────────────────────────────────── */
.stepper {
  display: flex; align-items: center; gap: .5rem;
}
.step-btn {
  width: 3rem; height: 3rem;
  border-radius: .6rem;
  border: 1px solid rgba(255,255,255,.1);
  background: #0f172a;
  color: #e2e8f0;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: all .13s ease;
  -webkit-tap-highlight-color: transparent;
}
.step-btn:hover { background: #1a2636; }
.step-btn:active { transform: scale(.92); }
.step-btn--plus  { border-color: rgba(99,102,241,.3); color: #a5b4fc; }
.step-btn--minus { border-color: rgba(239,68,68,.25);  color: #f87171; }
.step-btn .material-symbols-rounded { font-size: 1.2rem !important; }

.step-display {
  min-width: 7rem;
  text-align: center;
  background: #0f172a;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: .6rem;
  padding: .45rem .75rem;
  display: flex; align-items: center; justify-content: center; gap: .3rem;
}
.step-currency { font-size: .7rem; color: #64748b; font-weight: 600; }
.step-val      { font-size: 1.25rem; font-weight: 900; color: #f1f5f9; font-variant-numeric: tabular-nums; }

/* ── Threshold Cards ────────────────────────────────────────────────────── */
.threshold-cards { display: flex; flex-direction: column; gap: 1rem; }
.threshold-card {
  background: #1e293b;
  border: 1px solid rgba(255,255,255,.07);
  border-radius: .85rem;
  padding: 1.25rem;
  display: flex; flex-direction: column; gap: 1rem;
}
.threshold-card--warn     { border-left: 3px solid #f59e0b; }
.threshold-card--critical { border-left: 3px solid #ef4444; }

.tc-header { display: flex; align-items: flex-start; gap: .85rem; }
.tc-title  { font-size: .95rem; font-weight: 800; color: #f1f5f9; }
.tc-sub    { font-size: .7rem; color: #64748b; margin-top: .1rem; }

.slider-area { display: flex; flex-direction: column; gap: .6rem; }
.slider-val-row { display: flex; align-items: baseline; gap: .5rem; }
.slider-val   { font-size: 2rem; font-weight: 900; font-variant-numeric: tabular-nums; line-height: 1; }
.slider-val.warn     { color: #fbbf24; }
.slider-val.critical { color: #f87171; }
.slider-hint  { font-size: .75rem; color: #64748b; }

.slider-with-steppers { display: flex; align-items: center; gap: .75rem; }
.slider-track-wrap {
  position: relative; flex: 1; height: 2.5rem;
  display: flex; align-items: center;
}
.mes-slider {
  width: 100%;
  height: 2.5rem;
  background: transparent;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
  position: relative;
  z-index: 2;
}
.mes-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 2rem; height: 2rem;
  border-radius: 50%;
  cursor: pointer;
}
.mes-slider--warn::-webkit-slider-thumb     { background: #f59e0b; box-shadow: 0 0 10px rgba(245,158,11,.5); }
.mes-slider--critical::-webkit-slider-thumb { background: #ef4444; box-shadow: 0 0 10px rgba(239,68,68,.5); }
.mes-slider::-webkit-slider-runnable-track {
  height: .5rem; border-radius: 999px; background: rgba(255,255,255,.08);
}
.slider-fill {
  position: absolute;
  left: 0; height: .5rem;
  border-radius: 999px;
  pointer-events: none;
  z-index: 1;
  top: 50%; transform: translateY(-50%);
  transition: width .2s ease;
}
.slider-fill--warn     { background: linear-gradient(90deg, #10b981, #f59e0b); }
.slider-fill--critical { background: linear-gradient(90deg, #f59e0b, #ef4444); }

.slider-scale {
  display: flex; justify-content: space-between;
  font-size: .62rem; color: #334155;
}

/* Alert Preview Bar */
.alert-preview { margin-top: .5rem; }
.preview-title { font-size: .7rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .08em; margin-bottom: .5rem; }
.preview-bar-track {
  display: flex;
  height: 2.5rem;
  border-radius: .5rem;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.07);
}
.preview-ok, .preview-warn, .preview-critical {
  display: flex; align-items: center; justify-content: center;
  font-size: .65rem; font-weight: 800; letter-spacing: .07em;
  min-width: 40px;
  transition: width .3s ease;
}
.preview-ok       { background: rgba(16,185,129,.25); color: #34d399; }
.preview-warn     { background: rgba(245,158,11,.25); color: #fbbf24; }
.preview-critical { background: rgba(239,68,68,.25);  color: #f87171; }
.preview-labels {
  display: flex; align-items: center;
  font-size: .62rem; color: #475569; margin-top: .35rem;
}

/* ── System Config ──────────────────────────────────────────────────────── */
.config-list { display: flex; flex-direction: column; gap: .6rem; }
.config-item {
  display: flex; align-items: center; justify-content: space-between;
  background: #1e293b;
  border: 1px solid rgba(255,255,255,.07);
  border-radius: .85rem;
  padding: 1.1rem 1.25rem;
  gap: 1rem;
  min-height: 4.5rem;
}
.config-item--text { flex-wrap: wrap; }
.config-info  { display: flex; align-items: center; gap: .85rem; flex: 1; }
.config-icon  { font-size: 1.4rem !important; flex-shrink: 0; }
.config-label { font-size: .9rem; font-weight: 700; color: #f1f5f9; }
.config-desc  { font-size: .7rem; color: #64748b; margin-top: .1rem; }

/* Toggle Switch */
.toggle-switch {
  width: 3.5rem; height: 1.85rem;
  background: rgba(255,255,255,.1);
  border: 1px solid rgba(255,255,255,.15);
  border-radius: 999px;
  position: relative;
  cursor: pointer;
  transition: background .2s ease;
  flex-shrink: 0;
}
.toggle-switch--on { background: #10b981; border-color: #059669; }
.toggle-thumb {
  position: absolute;
  top: .17rem; left: .17rem;
  width: 1.4rem; height: 1.4rem;
  background: #fff;
  border-radius: 50%;
  transition: left .2s ease;
  box-shadow: 0 1px 4px rgba(0,0,0,.3);
}
.toggle-switch--on .toggle-thumb { left: calc(100% - 1.57rem); }

/* Clocking Windows */
.clocking-windows-config { align-items: flex-start !important; flex-direction: column; gap: 1rem; }
.windows-list { display: flex; flex-direction: column; gap: 0.75rem; width: 100%; background: rgba(0,0,0,0.15); padding: 1rem; border-radius: 1rem; border: 1px solid rgba(255,255,255,0.05); }
.window-row { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.75rem; }
.window-row:last-child { border-bottom: none; padding-bottom: 0; }
.window-name { font-weight: 700; color: #cbd5e1; font-size: 0.95rem; }

/* Recipient Pills */
.recipient-pills { display: flex; gap: .4rem; flex-wrap: wrap; }
.recipient-pill {
  padding: .45rem 1rem;
  background: #0f172a;
  border: 1px solid rgba(255,255,255,.09);
  color: #64748b;
  border-radius: 999px;
  font-size: .82rem; font-weight: 700;
  cursor: pointer;
  transition: all .13s ease;
  min-height: 2.5rem;
}
.recipient-pill--active { background: rgba(59,130,246,.2); border-color: #3b82f6; color: #93c5fd; }

/* Week Steppers */
.week-steppers { display: flex; align-items: center; gap: .5rem; }
.week-display  { font-size: 1rem; font-weight: 800; color: #a5b4fc; min-width: 7rem; text-align: center; }

/* Time Inputs */
.time-inputs { display: flex; align-items: center; gap: 0.5rem; }
.time-input {
  background: #0f172a;
  border: 1px solid rgba(255,255,255,0.09);
  color: #f1f5f9;
  border-radius: 0.5rem;
  padding: 0.5rem;
  font-family: inherit;
  font-size: 1rem;
}
.time-to { color: #64748b; font-size: 0.85rem; font-weight: 600; }

/* New Rates Tab Styles */
.cat-tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
.cat-tab { flex: 1; padding: 0.85rem; background: #0f172a; border: 1px solid rgba(255,255,255,0.1); color: #94a3b8; border-radius: 0.6rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
.cat-tab--active { background: rgba(99,102,241,0.2); border-color: #6366f1; color: #a5b4fc; }
.other-config-panel { background: #1e293b; border: 1px solid rgba(255,255,255,0.1); border-radius: 0.75rem; padding: 1.25rem; margin-bottom: 1.5rem; }
.config-panel-title { display: flex; align-items: center; gap: 0.5rem; font-weight: 800; font-size: 0.95rem; color: #cbd5e1; margin-bottom: 1rem; }
.other-config-row { display: flex; gap: 1.5rem; flex-wrap: wrap; }
.other-config-item { display: flex; flex-direction: column; gap: 0.5rem; flex: 1; min-width: 250px; }
.other-config-item label { display: flex; align-items: center; gap: 0.5rem; color: #94a3b8; font-size: 0.85rem; font-weight: 700; cursor: pointer; }
.mes-input { background: #0f172a; border: 1px solid rgba(255,255,255,0.15); color: #fff; padding: 0.75rem 1rem; border-radius: 0.5rem; outline: none; }
.mes-input:disabled { opacity: 0.5; cursor: not-allowed; }
.mes-input:focus { border-color: #6366f1; }

/* ── Mobile Responsive ────────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .admin-main {
    height: auto;
    min-height: 100%;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-y;
    padding-bottom: 4rem;
  }
  .settings-top-nav {
    overflow-x: auto;
    padding: 0.75rem 1rem;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }
  .settings-top-nav::-webkit-scrollbar { display: none; }
  .snav-item {
    white-space: nowrap;
    flex-shrink: 0;
    touch-action: pan-y;
  }
  .tab-panel {
    padding: 1rem 1rem 4rem 1rem;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-y;
  }
  .cat-tabs {
    overflow-x: auto;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }
  .cat-tabs::-webkit-scrollbar { display: none; }
  .cat-tab {
    white-space: nowrap;
    flex-shrink: 0;
    touch-action: pan-y;
  }
  .type-tabs {
    overflow-x: auto;
    scrollbar-width: none;
    flex-wrap: nowrap;
    -webkit-overflow-scrolling: touch;
  }
  .type-tabs::-webkit-scrollbar { display: none; }
  .type-tab {
    white-space: nowrap;
    flex-shrink: 0;
    touch-action: pan-y;
  }
  .step-btn, .recipient-pill {
    touch-action: pan-y;
  }
  .config-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  .window-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  .other-config-row {
    flex-direction: column;
  }
}

.sync-btn {
  display: flex; align-items: center; gap: 0.35rem;
  background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.3);
  color: #a5b4fc; border-radius: 0.5rem; padding: 0.45rem 0.85rem;
  font-size: 0.75rem; font-weight: 700; transition: all 0.15s ease;
}
.sync-btn:hover { background: rgba(99,102,241,0.22); color: #fff; }
.spin-icon { animation: spin 0.8s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.set-toast {
  position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%);
  background: rgba(16,185,129,0.95); color: #fff;
  padding: 0.75rem 1.5rem; border-radius: 0.75rem; font-weight: 700; font-size: 0.85rem;
  display: flex; align-items: center; gap: 0.4rem; box-shadow: 0 10px 25px rgba(0,0,0,0.5); z-index: 100;
}
.toast-enter-active, .toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 1rem); }
</style>
