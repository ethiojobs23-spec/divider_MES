# Divider MES — System Architecture & Documentation

Welcome to the comprehensive documentation for the **Divider Production Manufacturing Execution System (MES)**. This document outlines how the system is constructed, how its modules interact, and how state is synchronized across the application in real-time.

---

## 1. High-Level Architecture
The application is built as a **Single Page Application (SPA)** using modern web technologies:
* **Frontend Framework:** Vue 3 (Composition API) built with Vite for rapid development.
* **State Management:** Pinia (modular, reactive stores).
* **Styling & UI:** TailwindCSS (for utility-first styling) combined with custom CSS for complex layouts, and Google Material Symbols (Rounded) for iconography.
* **Backend & Database:** Supabase (PostgreSQL) handles data persistence, authentication, and real-time syncing.

---

## 2. Global State Synchronization (Pinia)
The nervous system of the MES relies on **Pinia** stores explicitly designed to read from one another reactively. 

### The Reactivity Pipeline
Instead of manually copying or syncing data between stores, the system leverages Vue's `computed()` dependency tracking. 
1. **Data Ingestion:** When an operator logs 1,000 pieces of 9cm dividers in `DailyProductionLog.vue`, the data is immediately pushed to the `mesStore.ledgerEntries` array and backed up to Supabase.
2. **Auto-Trigger:** Because `payrollStore.js` explicitly defines a computed property (`weeklyPayrollSummary`) that iterates over `mesStore.operators` and `mesStore.ledgerEntries`, the act of logging production instantly invalidates the cache.
3. **UI Reflection:** `PayrollDashboard.vue`, which is bound to `weeklyPayrollSummary`, instantly recalculates the gross earnings, net payouts, and even the physical cash requirements without requiring a manual refresh.

### The Stores
* **`systemAuthStore.js`:** Manages role-based access control (Admin, Manager, Employee), PIN verification, shift tracking, and global UI state (like the `isMobileMenuOpen` mobile drawer toggle).
* **`mesStore.js`:** The core operational ledger. Tracks raw production logs, block matrix data, operator profiles, active inventory, and dispatch logs.
* **`payrollStore.js`:** The financial engine. Calculates piece-rates, hourly wages, applies attendance modifiers, and processes complex deductions (like installment loans).
* **`attendanceStore.js`:** Tracks clock-in/clock-out events and computes total days attended per week.

---

## 3. Core Modules & Logic

### 3.1 Production Logging & Overtime (`DailyProductionLog.vue`)
Operators log their daily output through a highly optimized virtual numpad interface.
* **Overtime Multiplier:** Inside `mesStore.js`, the `submitProductionLog` action features an `isWeekendOvertime()` check. If the system detects the log occurs on a Saturday or Sunday, a **1.5× multiplier** is automatically applied to the `qty_produced` before hitting the database. The UI reflects this with an amber bolt badge and a dynamic toast notification.

### 3.2 Block Matrix Aggregation (`ProductionBlockMatrix.vue`)
This module aggregates daily production into standard payment blocks (M&T, W&T, F&S). 
* The **F&S (Friday & Saturday)** column is visually highlighted in amber to remind founders and managers that overtime rates apply to weekend production logs.

### 3.3 Installment Loan Hub (`LoanRequestHub.vue`)
Advances are no longer simple one-time deductions. The MES features an **Installment-Based Debt Management System**:
* Admins can approve a loan (e.g., 1,000 ETB) and spread the repayment over multiple weeks (e.g., 4 weeks @ 250 ETB/week).
* The `payrollStore.js` intelligently intercepts weekly payroll, deducting exactly the installment amount (or the remaining balance, whichever is smaller) until the loan is fully closed.
* Visual progress bars show exactly how much of a loan has been repaid.

### 3.4 Payroll & Cash Logistics (`PayrollDashboard.vue`)
The central financial hub of the MES. It calculates gross earnings from piece-rates and hourly wages, deducts loans, adds performance bonuses, and outputs the final **Net Payout**.
* **Physical Cash Calculator:** When payouts are approved, the system runs a **greedy algorithm** to determine the exact physical ETB denominations (200, 100, 50, 10, 5, 1 notes) required from the bank to fulfill the payroll in cash.
* **Payment Receipts:** Clicking "Approve" captures a strict, static snapshot of the worker's earnings, deductions, and bonuses. This static snapshot is passed to `PaymentReceiptModal.vue` so it can be safely printed without being affected by subsequent state changes.

---

## 4. Security & Role-Based Routing
Routing is strictly controlled via `vue-router` navigation guards (`router/index.js`):
1. **Unauthenticated:** Redirected to the boot screen (`WelcomeAuth.vue`).
2. **Employee Role:** Strictly locked to the `/my-portal` route (Employee Dashboard). Any attempt to access admin or operational routes violently redirects them back.
3. **Manager Role:** Can access standard operational modules, and bypasses the `requiresAdmin` lock, allowing them to perform payroll and inventory duties.
4. **Admin / System Admin:** Full, unrestricted access to the entire MES.

---

## 5. UI/UX & Component Contracts
* **Layout (`AppLayout.vue`):** Features a responsive sidebar that converts into a slide-out drawer on mobile. To prevent UI bugs, the router invokes an `afterEach` hook to aggressively force the drawer closed whenever the user navigates to a new view.
* **Standardized Numpads (`VirtualNumpad.vue`):** All financial and quantitative inputs bypass native keyboards in favor of a touch-optimized numpad. The output strings are strictly parsed using `Number()` at the component boundary to ensure Pinia stores receive clean, mathematically sound data types.
