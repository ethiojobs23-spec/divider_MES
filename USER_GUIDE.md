# 📘 Divider MES — Complete User Guide

> **Manufacturing Execution System** for Divider Production Operations
> _Covers every role, every screen, and every workflow in the application._

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [User Roles & Access Levels](#2-user-roles--access-levels)
3. [Getting Started — Login & Authentication](#3-getting-started--login--authentication)
   - 3.1 [Admin / Manager Login](#31-admin--manager-login)
   - 3.2 [Operator Kiosk Login](#32-operator-kiosk-login)
   - 3.3 [PIN Authentication](#33-pin-authentication)
4. [Module Selection Hub](#4-module-selection-hub)
5. [Production Modules](#5-production-modules)
   - 5.1 [Production Logger](#51-production-logger)
   - 5.2 [Live Production Dashboard](#52-live-production-dashboard)
   - 5.3 [Daily Production Log](#53-daily-production-log)
   - 5.4 [Production Block Matrix](#54-production-block-matrix)
6. [Quality Control (QC)](#6-quality-control-qc)
7. [Shift & Attendance](#7-shift--attendance)
   - 7.1 [Shift Approvals](#71-shift-approvals)
   - 7.2 [Attendance Viewer](#72-attendance-viewer)
8. [Downtime Tracker](#8-downtime-tracker)
9. [Payroll & Finance](#9-payroll--finance)
   - 9.1 [Payroll Dashboard](#91-payroll-dashboard)
   - 9.2 [Payout Settings](#92-payout-settings)
   - 9.3 [Cash Advance Hub](#93-cash-advance-hub)
   - 9.4 [Loan Request Hub](#94-loan-request-hub)
   - 9.5 [Hourly Wage Tracker](#95-hourly-wage-tracker)
10. [Inventory](#10-inventory)
    - 10.1 [Inventory Dashboard](#101-inventory-dashboard)
    - 10.2 [Inventory Manager](#102-inventory-manager)
11. [Company Expenses](#11-company-expenses)
12. [Dispatch & Logistics](#12-dispatch--logistics)
13. [Customers Manager](#13-customers-manager)
14. [Executive Analytics](#14-executive-analytics)
15. [Employee Profiles](#15-employee-profiles)
16. [Admin Settings](#16-admin-settings)
    - 16.1 [Employee Management](#161-employee-management)
    - 16.2 [Piece-Rate Configuration](#162-piece-rate-configuration)
    - 16.3 [Waste Thresholds](#163-waste-thresholds)
    - 16.4 [System Configuration](#164-system-configuration)
    - 16.5 [My Profile](#165-my-profile)
17. [Frequently Asked Questions](#17-frequently-asked-questions)
18. [Glossary](#18-glossary)

---

## 1. System Overview

**Divider MES** is a full-featured, real-time Manufacturing Execution System built for divider production factories. It digitalises and connects every layer of the factory floor — from the moment an operator clocks in to the moment payroll is approved and dispatched goods are recorded.

**Key capabilities at a glance:**

| Area | What it covers |
|---|---|
| 🏭 Production | Log units produced per operator, shift, divider type, size, placement |
| 📊 Analytics | Real-time dashboards, executive KPIs, weekly/monthly trend charts |
| ✅ Quality Control | Waste tracking, rejection rates, alert thresholds |
| ⏱ Attendance | Clock-in/out, shift logs, approval workflow |
| ⏸ Downtime | Record and reason downtime events by machine/line |
| 💰 Payroll | Piece-rate and hourly pay calculation, weekly payout approval |
| 💳 Finance | Cash advances, loan requests, company expense tracking |
| 📦 Inventory | Raw material stock, deductions per production batch |
| 🚚 Dispatch | Customer orders, dispatch records, delivery tracking |
| ⚙️ Settings | Employee management, rate configs, system flags |

---

## 2. User Roles & Access Levels

The system has three primary roles. Each role sees a different subset of modules on the Module Selection Hub.

| Role | Description | Typical Modules Available |
|---|---|---|
| **Operator** | Factory floor worker. Logs production, checks attendance. | Production Logger, Kiosk Clock-In |
| **Supervisor** | Line lead. Reviews logs, approves shifts, monitors QC. | Production Logger, Daily Log, QC, Shift Approvals, Attendance |
| **System Admin / Manager** | Full access. Manages employees, payroll, settings, analytics. | All modules |

> **Note:** Access is controlled by the employee`s `role` field set in **Admin Settings → Employee Management**.

---

## 3. Getting Started — Login & Authentication

### 3.1 Admin / Manager Login

**Route:** `/` (WelcomeAuth)

This is the main entry point for Admins and Managers.

**How to log in:**
1. Open the app URL in your browser.
2. You will see the **Welcome / Login** screen with the company logo.
3. Enter your **4-digit PIN** using the on-screen numpad or your keyboard.
4. Press **Login** (or the ✓ button).
5. On success, you are taken to the **Module Selection Hub**.

**Forgot your PIN?**
- Contact another System Admin to reset it in **Settings → Employee Management → Edit**.

**Tips:**
- The login screen shows a visual PIN dot indicator — dots fill as you type.
- Wrong PIN attempts show an error shake animation. After several failures the input resets.
- Admins can also access a **Kiosk Mode** button on this screen to switch the device to operator mode.

---

### 3.2 Operator Kiosk Login

**Route:** `/kiosk`

This is the dedicated **kiosk screen** designed for shared factory floor tablets/terminals. Operators clock in and access production tools without needing full admin access.

**How to use:**
1. The screen shows all registered, active employees with avatar photos/initials and colored badges.
2. Tap your **name/avatar tile** to select yourself.
3. A PIN pad appears — enter your **4-digit PIN**.
4. On success, you are taken to the operator`s **Module Selection** view.

**What operators can do from the kiosk:**
- Log production units (ProductionLogger)
- View their own attendance
- Clock in / Clock out

**Clock-In / Clock-Out:**
- After selecting your name and entering your PIN, a **Clock In** or **Clock Out** button appears at the top of the screen depending on your current status.
- The system checks **Clocking Windows** configured by the Admin (e.g., 06:00–08:00 for morning shift). Outside those windows, clocking requires an **Admin PIN override**.

---

### 3.3 PIN Authentication

**Route:** `/pin-auth`

A secondary authentication screen used for sensitive operations (e.g., approving payroll, overriding clocking windows). The user must re-enter their PIN to proceed.

---

## 4. Module Selection Hub

**Route:** `/modules`

After login, all users land on the **Module Selection Hub** — a card-based dashboard showing all modules the logged-in user has access to.

**Layout:**
- Cards are grouped by category: Production, Finance, Operations, Management.
- Each card shows an icon, module name, and a short description.
- Clicking a card navigates to that module.

**Top bar contains:**
- Logged-in user`s name and avatar.
- **Sync** button — refreshes all data from the server.
- **Logout** button — clears session and returns to the login screen.

**Module cards visible to each role:**

| Module | Operator | Supervisor | Admin |
|---|:---:|:---:|:---:|
| Production Logger | ✅ | ✅ | ✅ |
| Live Dashboard | — | ✅ | ✅ |
| Daily Production Log | — | ✅ | ✅ |
| Quality Control | — | ✅ | ✅ |
| Shift Approvals | — | ✅ | ✅ |
| Attendance Viewer | ✅ | ✅ | ✅ |
| Downtime Tracker | — | ✅ | ✅ |
| Payroll Dashboard | — | — | ✅ |
| Cash Advance | — | — | ✅ |
| Loan Hub | — | — | ✅ |
| Hourly Wages | — | — | ✅ |
| Inventory | — | ✅ | ✅ |
| Expenses | — | — | ✅ |
| Analytics | — | — | ✅ |
| Dispatch | — | ✅ | ✅ |
| Customers | — | — | ✅ |
| Settings | — | — | ✅ |

---

## 5. Production Modules

### 5.1 Production Logger

**Route:** `/production-logger`
**Who uses it:** Operators, Supervisors, Admins

The Production Logger is the **primary data entry screen** where operators record the number of divider units they produce during a shift.

#### Step-by-step: Logging Production

1. **Select Operator** — Your name is pre-selected if you logged in via kiosk. Otherwise, choose from the dropdown.
2. **Select Work Category** — Choose the type of work being done:
   - **MFG** — Manufacturing (full divider assembly)
   - **Wood Prep (C)** — Cutting and preparing wood
   - **Paper Place (PP)** — Paper placement on dividers
   - **Plaster Place (PL)** — Plaster/coating placement
   - **Plug Fitting (PLUG)** — Fitting end plugs
3. **Select Divider Type** — e.g., Type 50, 40, 30, 16, 12, 45 (not required for all categories).
4. **Select Size** — 9cm or 7cm (where applicable).
5. **Select Placement** — ብተና, ውስጥ, or የተለየ (for Wood Prep category).
6. **Enter Quantity** — Type or use the ＋/－ stepper buttons to set the number of units.
7. **Click "Log Production"** — The entry is saved to the database in real time.

#### Important rules:
- If **"Require Operator for Entry"** is enabled, you must be clocked in before saving an entry.
- If **"Auto-Pause on Downtime"** is enabled, production logging is blocked when a downtime session is active.
- The logger shows a running **today`s total** counter at the top.
- Each entry records: operator, date, shift week, category, type, size, placement, quantity, and timestamp.

#### Editing / Deleting entries:
- Supervisors and Admins can view the log list and **delete incorrect entries** using the trash icon.
- Operators can only delete entries they made within the current session (before navigating away).

---

### 5.2 Live Production Dashboard

**Route:** `/live-dashboard`
**Who uses it:** Supervisors, Admins

A **real-time monitoring dashboard** showing current production activity across all operators and lines.

**What you see:**
- **Live counters** — total units logged today, broken down by category.
- **Per-operator rows** — each active operator`s name, avatar, current shift total, and last log time.
- **Activity indicator** — green pulse dot next to operators who logged in the last 15 minutes.
- **Downtime banner** — appears at the top if a downtime event is currently active.
- **Week total vs. target** — progress bar showing the current week`s production against the configured target.

**Auto-refresh:** Data refreshes automatically every 30 seconds.

---

### 5.3 Daily Production Log

**Route:** `/daily-log`
**Who uses it:** Supervisors, Admins

A **detailed table view** of all production entries for a selected date or date range.

**Features:**
- **Date picker** — select any past date to view logs for that day.
- **Filter by operator** — narrow down to a specific employee.
- **Filter by category** — show only MFG, C, PP, PL, or PLUG entries.
- **Export** — download the log as CSV for offline reporting.
- **Column data:** Operator, Time, Category, Type, Size, Placement, Qty, Calculated Earnings (ETB).

---

### 5.4 Production Block Matrix

**Route:** `/production-block-matrix`
**Who uses it:** Admins, Supervisors

A visual **grid/matrix view** showing production output across operators vs. divider types/sizes for the selected week.

---

## 6. Quality Control (QC)

**Route:** `/qc`
**Who uses it:** Supervisors, Admins

The QC module tracks **waste and rejection rates** per production batch or shift.

#### How to log a QC entry:

1. Select the **operator** or **batch**.
2. Enter **total units produced** for that batch.
3. Enter **wasted/rejected units** found during inspection.
4. The system auto-calculates the **waste percentage**.
5. Click **Submit QC Record**.

#### Alert system:

| Level | Colour | Meaning |
|---|---|---|
| ✅ Safe | Green | Waste % is below the Warning threshold |
| ⚠️ Warning | Amber | Waste % exceeds Warning threshold — operator review needed |
| 🚨 Critical | Red | Waste % exceeds Critical threshold — supervisor intervention required |

- Historical QC records are shown in a table below the entry form.

---

## 7. Shift & Attendance

### 7.1 Shift Approvals

**Route:** `/shift-approvals`
**Who uses it:** Supervisors, Admins

The Shift Approvals screen is where supervisors **review and approve or reject** operator shift records before they feed into payroll calculations.

#### Workflow:

1. At the end of each shift/day, shift records appear in the **Pending** list.
2. Each row shows: Operator name, Clock-in time, Clock-out time, Total hours, Logged production units.
3. Supervisor actions:
   - ✅ **Approve** — marks the shift as approved; included in payroll.
   - ❌ **Reject** — marks the shift as rejected; will NOT be paid.
   - ✏️ **Edit** — correct clock-in/out times if there was a mistake.
4. Approved shifts move to the **Approved** tab. Rejected to the **Rejected** tab.

> **Important:** Payroll only includes **approved shifts**. Always review before the weekly payout day.

---

### 7.2 Attendance Viewer

**Route:** `/attendance`
**Who uses it:** Operators (own data), Supervisors, Admins (all data)

Shows a **calendar/list view** of clock-in and clock-out records.

**For Operators:**
- Shows only their own attendance history.
- Color-coded: ✅ Green = full shift, ⚠️ Amber = short shift, 🔴 Red = absent.

**For Admins/Supervisors:**
- Can view any employee`s attendance.
- Can **manually correct** clock times.
- Shows monthly summary: total days present, total hours, late arrivals.

---

## 8. Downtime Tracker

**Route:** `/downtime`
**Who uses it:** Supervisors, Admins

Records **unplanned or planned stoppages** of production lines.

#### Starting a Downtime Session:

1. Click **"Start Downtime"**.
2. Select the **reason**: Machine Breakdown / Power Failure / Material Shortage / Maintenance / Other.
3. Add an optional **note**.
4. Click **Confirm**.

While downtime is active, a **red banner** appears on the Live Dashboard and Production Logger. If "Auto-Pause on Downtime" is ON, production logging is blocked.

#### Stopping a Downtime Session:
Click **"End Downtime"**. The session is recorded with start time, end time, duration, and reason.

---

## 9. Payroll & Finance

### 9.1 Payroll Dashboard

**Route:** `/payroll`
**Who uses it:** Admins only

The central hub for calculating and approving **weekly employee earnings**.

#### How payroll is calculated:

```
Total Earnings = (Piece-Rate Units × Rate) + (Hours Worked × Hourly Rate)
               − Cash Advances
               − Loan Installments
```

#### Weekly Payroll Workflow:

1. **Select the production week** using the week stepper.
2. Review the **earnings table** — one row per employee.
3. Check: production qty, piece-rate earnings, hourly hours & earnings, advances deducted, loan deductions, and **Net Payable**.
4. Click **"Approve & Pay"** — only available on the configured **Payout Day**.
5. Confirm in the dialog. Approved payroll is locked.

---

### 9.2 Payout Settings

**Route:** `/payout-settings`
**Who uses it:** Admins

Configure individual payout preferences (piece-rate vs. hourly vs. hybrid) and payment method details per employee.

---

### 9.3 Cash Advance Hub

**Route:** `/cash-advance`
**Who uses it:** Admins

Manages **cash advance requests** — money given to employees before their payday.

#### Creating a Cash Advance:
1. Click **"New Advance"** → Select employee → Enter amount, date, and optional reason → **Save**.
2. Advances are automatically **deducted from the employee`s net pay** on the Payroll Dashboard.

---

### 9.4 Loan Request Hub

**Route:** `/loans`
**Who uses it:** Admins

Manages **multi-installment loans** for employees.

- Enter loan amount and number of installments. The system calculates the **per-week deduction**.
- Each active loan`s weekly installment is automatically deducted from payroll.
- Loans show a progress bar and mark as **Settled** when fully repaid.

---

### 9.5 Hourly Wage Tracker

**Route:** `/hourly-wages`
**Who uses it:** Admins

For hourly employees — shows total hours worked per week, hourly rate, and calculated gross hourly earnings. Used to verify time-based wages before payroll is finalised.

---

## 10. Inventory

### 10.1 Inventory Dashboard

**Route:** `/inventory`
**Who uses it:** Supervisors, Admins

Monitors **raw material stock levels** in real time.

**What you see:**
- **Stock cards** for each material with quantity and unit.
- **Low-stock alerts** — red badge when stock falls below the configured minimum.
- **Consumption chart** — material usage over the past 7/30 days.

#### Stock Adjustment:
Click **"Adjust Stock"** → choose **Add** (restocking) or **Deduct** (correction) → enter quantity and reason → **Save**.

---

### 10.2 Inventory Manager

**Route:** `/inventory-manager`
**Who uses it:** Admins

Admin-level tool for **adding new material types, setting thresholds, and managing BOM (Bill of Materials) deduction rules**.

- Add new material with name, unit, initial qty, minimum threshold.
- Set deduction rules: how much of each material is consumed per unit produced per category.

---

## 11. Company Expenses

**Route:** `/expenses`
**Who uses it:** Admins

Records **non-payroll business expenses** — utilities, supplies, maintenance, etc.

#### Adding an Expense:
Click **"Add Expense"** → Select category (Utilities / Maintenance / Supplies / Transport / Other) → Enter amount, date, description → **Save**.

- Filter by category and date range.
- Monthly total shown at the bottom.
- **Export to CSV** for accounting.

---

## 12. Dispatch & Logistics

**Route:** `/dispatch`
**Who uses it:** Supervisors, Admins

Records **outgoing dispatch events** when finished products are sent to customers.

#### Creating a Dispatch Record:
Click **"New Dispatch"** → Select customer → Enter items (type, quantity, size) → Set dispatch date → Add truck/driver note → **Save**.

**Dispatch Status options:** Pending → Dispatched → Delivered → Returned (update by clicking the status badge).

---

## 13. Customers Manager

**Route:** `/customers`
**Who uses it:** Admins

Manages the **customer database**.

#### Adding a Customer:
Click **"New Customer"** → Enter name, phone, address, notes → **Save**.

- Search by name or phone.
- Click a customer to see their full order/dispatch history.
- Edit or archive customers from the action buttons.

---

## 14. Executive Analytics

**Route:** `/analytics`
**Who uses it:** Admins, Managers

A full **business intelligence dashboard** with charts, KPIs, and exportable reports.

#### KPI Cards (top row):

| KPI | Description |
|---|---|
| Total Units This Week | Sum of all logged production for the active production week |
| Total Earnings (ETB) | Gross payroll cost for the week |
| Avg. Units/Operator | Mean productivity per active employee |
| QC Waste % | Average waste rate across all QC entries this week |
| Downtime Hours | Total downtime recorded this week |

#### Charts:
- **Weekly Production Trend** — daily output this week vs. previous week.
- **Production by Category** — donut chart (MFG / C / PP / PL / PLUG breakdown).
- **Per-Operator Performance** — horizontal bar chart comparing weekly output.
- **Waste Trend** — daily QC waste % over the past 30 days.
- **Inventory Consumption** — area chart of raw material usage.

#### Date Range: This Week | Last Week | This Month | Custom Range

#### Export & Forward:
Click **"Export & Forward"** to generate a formatted summary report. If **Telegram Bot** is enabled in System Config, the report is also sent automatically via Telegram.

---

## 15. Employee Profiles

**Route:** `/employee/:id`
**Who uses it:** Admins (full), Supervisors (read-only), Operators (own profile only)

A detailed personal profile page for each employee.

#### Sections:

| Section | Contents |
|---|---|
| **Profile Info** | Name, role, phone, date of birth, avatar, color badge |
| **Work Configuration** | Assigned categories, divider types, pay type, hourly rate |
| **Production History** | Weekly output chart (12 weeks) + recent log entries table |
| **Attendance History** | Monthly calendar heatmap, total days, hours, late arrivals |
| **Payroll Summary** | Last 4 weeks of earnings, outstanding advances and loans |

**Admin-only actions:** Edit profile, Change PIN, Deactivate/Reactivate account.

---

## 16. Admin Settings

**Route:** `/settings`
**Who uses it:** System Admins only

Five tabs covering all system configuration.

---

### 16.1 Employee Management

**Tab: Employees**

The complete employee roster with tools to create, edit, hide, and delete employees.

#### Employee Card shows:
- Avatar photo or color-initial badge
- Full name and role
- 4-digit PIN code

#### Action Buttons per employee:

| Button | Icon | Action |
|---|---|---|
| **Edit** | ✏️ | Opens the edit modal |
| **Hide / Show** | 👤 | Toggles `is_active` — inactive employees are greyed out and cannot log in |
| **Delete** | 🗑️ | Opens a confirmation dialog; permanently removes the employee |

#### Creating a New Employee:
1. Click **"New Employee"** (top right of the panel).
2. Fill in the form:
   - **Full Name** (required)
   - **Role**: Operator / Supervisor / Mechanic / System Admin
   - **4-Digit PIN** (required)
   - **Profile Picture URL** (optional)
   - **Color Theme**: Blue / Green / Purple / Orange / Rose
3. **Payroll Configuration:**
   - ☑️ Pay by Piece-Rate
   - ☑️ Pay Hourly (enter Hourly Rate in ETB if checked)
4. Click **"Save Employee"**.

#### Hiding an Employee:
- Click 👤 **Hide** (person_off) to deactivate. Employee cannot log in.
- Click ✅ **Activate** (how_to_reg) to restore.

#### Deleting an Employee:
- Click 🗑️ **Delete** → confirmation dialog shows the employee`s name.
- ⚠️ **Permanent and cannot be undone.** Also deletes their ledger config.
- Click **"Delete"** to confirm or **"Cancel"** to abort.

---

### 16.2 Piece-Rate Configuration

**Tab: Piece Rates**

Configure ETB earnings per unit for every combination of category, type, size, and placement.

**Navigation:**
- **Category tabs:** MFG | Wood Prep | Paper Place | Plaster Place | Plug Fitting
- **Type tabs:** 50 | 40 | 30 | 16 | 12 | 45 (where applicable)

**Rate Steppers:** Use **−** / **+** buttons to adjust by 0.25 ETB (or 0.05 ETB for Plug Fitting).

> Rates are NOT auto-saved. Always click **"Save Settings"** in the top bar after making changes.

---

### 16.3 Waste Thresholds

**Tab: Thresholds**

| Setting | Default | Description |
|---|---|---|
| Warning Level | 8% | Amber alert — flags QC entry for review |
| Critical Level | 15% | Red alert — triggers urgent supervisor notification |

Use sliders or − / + steppers to adjust. The **Alert Band Preview** bar updates live. Click **"Save Settings"** to persist.

---

### 16.4 System Configuration

**Tab: System**

| Setting | Description |
|---|---|
| **Auto-Pause on Downtime** | Blocks production logging when a downtime session is active |
| **Require Operator for Entry** | Operator must be clocked in before a production entry can be saved |
| **Telegram Bot Integration** | Enables automated report forwarding via Telegram |
| **Export Recipient Name** | Name on the "Export & Forward" button (Frezer / Manager / Owner / Selam) |
| **Weekly Payout Day** | Day when "Approve & Pay" is unlocked on Payroll Dashboard |
| **Allowed Clocking Windows** | Time ranges when operators can clock in/out without Admin override |
| **Production Week** | Override the active production week; use ◀ ▶ steppers or "Reset to Current" |

---

### 16.5 My Profile

**Tab: My Profile**

Update your own personal information as the logged-in Admin.

**Fields:** Full Name, Phone Number, Date of Birth, Profile Picture (upload from device).

**To save:** Enter your current **4-digit PIN** in "Confirm PIN to Save" → Click **"Save Profile"**. Incorrect PIN blocks the save.

---

## 17. Frequently Asked Questions

**Q: An operator cannot clock in — what do I do?**
A: Check if the current time falls within the configured **Clocking Windows** (Settings → System). If outside the window, use your Admin PIN on the kiosk to override.

**Q: Production logging is blocked — why?**
A: Two possible reasons: (1) **Auto-Pause on Downtime** is ON and there is an active downtime session — end it first. (2) **Require Operator for Entry** is ON and the operator is not clocked in.

**Q: The "Approve & Pay" button is greyed out on Payroll.**
A: Payroll can only be approved on the configured **Payout Day** (Settings → System → Weekly Payout Day).

**Q: How do I reset an employee`s PIN?**
A: Go to **Settings → Employees** → ✏️ **Edit** on the employee → change the PIN field → **Save Employee**.

**Q: Can I recover a deleted employee?**
A: No. Deletion is permanent. Use the **Hide** button to temporarily deactivate instead of deleting.

**Q: My production entry was saved with the wrong quantity. Can I fix it?**
A: Go to **Daily Production Log**, find the entry, delete it using the trash icon, then re-log the correct quantity in Production Logger.

**Q: How do I change the piece rates?**
A: Go to **Settings → Piece Rates**, adjust the rate steppers, then click **"Save Settings"** in the top bar.

**Q: An employee`s payroll shows incorrect earnings.**
A: Check that all their shift records are **Approved** in Shift Approvals, their production entries are correct in Daily Log, and their pay type is configured correctly in Settings → Employees → Edit.

**Q: How do I add a new customer?**
A: Go to **Customers Manager** → **"New Customer"** → fill in name and contact info → Save.

**Q: The analytics show last week`s data — how do I fix?**
A: Check **Settings → System → Production Week**. If it was manually overridden, click **"Reset to Current"**.

---

## 18. Glossary

| Term | Definition |
|---|---|
| **MES** | Manufacturing Execution System — software that connects, monitors, and controls factory operations |
| **Piece-Rate** | A pay model where earnings are calculated per unit produced |
| **Production Week** | The system`s active tracking period, e.g., W36-2026 |
| **Kiosk Mode** | A restricted tablet interface for operator clock-in and production logging |
| **PIN** | A 4-digit personal identification number used for all logins and confirmations |
| **Clocking Window** | A time range during which operators can clock in/out without an admin override |
| **Downtime** | A period during which production stops due to machine failure, material shortage, etc. |
| **QC** | Quality Control — inspecting finished units and recording waste/rejection data |
| **Waste %** | The percentage of produced units wasted or rejected: (waste ÷ total) × 100 |
| **Cash Advance** | A partial early payment to an employee, deducted from their next payroll cycle |
| **Loan** | A larger amount given to an employee, repaid in installments across multiple payroll weeks |
| **BOM** | Bill of Materials — raw materials and quantities consumed per unit produced |
| **Approved Shift** | A shift record confirmed by a Supervisor; feeds into payroll calculations |
| **is_active** | Employee flag. `false` = employee is hidden and cannot log in |
| **ETB** | Ethiopian Birr — the currency used for all financial values in this system |
| **Export Recipient** | The named person to whom the analytics report is forwarded |

---

> _This guide was prepared for internal use. For technical support, contact the System Administrator._
> **App Version:** Divider MES v2.0 | Built by dev MinteIO
