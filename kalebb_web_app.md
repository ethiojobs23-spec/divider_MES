# UI/UX Design Specification: Factory Floor Tablet Web App

## 1. Project Overview
This application is the frontend for a Manufacturing Execution System (MES). It is designed as a standalone Vue.js web application deployed to tablets physically mounted on the factory floor. 

The primary goal is to provide operators with a distraction-free, high-visibility, and lightning-fast interface for logging production output and attendance without needing to scroll or navigate complex menus.

## 2. Design System & Tablet Layout
*   **Framework:** Vue.js 3 (Composition API) with Tailwind CSS.
*   **Architecture:** Tablet-First (Landscape Orientation).
    *   **Global Layout:** A persistent Left Sidebar (25% width) for navigation and operator context, and a Main Content Area (75% width) for the active task.
*   **Color Palette:** High-contrast, low-glare dark mode (optimized for harsh factory lighting).
    *   **Background:** Deep charcoal (`bg-slate-900`).
    *   **Panels/Cards:** Lighter charcoal (`bg-slate-800`) with distinct borders (`border border-slate-700`).
    *   **Accents:** Bright Emerald (`bg-emerald-500`) for positive actions, Bright Rose (`bg-rose-500`) for stops/waste, and Electric Blue (`bg-blue-500`) for primary submissions.
*   **Typography:** Massive, highly legible sans-serif fonts. Numbers should be the largest elements on the screen.
*   **Interaction Design (Kiosk Mode):**
    *   **No Scrolling:** All core form elements must fit within a single 1080p landscape viewport.
    *   **Oversized Touch Targets:** Minimum button height of `min-h-[64px]` to accommodate workers wearing gloves or moving quickly. 

---

## 3. Core Screen Specifications

### Screen 1: The Kiosk Entry & Attendance (Landscape)
**Purpose:** The default idle screen where operators approach the tablet to start their shift.
**UI Components:**
1.  **Left Sidebar (Status Panel):**
    *   Large digital clock and current date.
    *   "Active Shift" roster showing who is currently clocked in (e.g., Zelalem: Active, Aben: Active).
2.  **Main Content Area (Action Hub):**
    *   **Header:** "Operator Login & Attendance"
    *   **Operator Grid:** A grid of massive square buttons (`w-48 h-48`), each displaying an operator's name and photo/avatar.
    *   **Action Modal (On Click):** Tapping an operator name dims the background and pops up a massive modal with two giant buttons side-by-side: "CLOCK IN" (Green) and "CLOCK OUT" (Red).

### Screen 2: Split-Pane Production Logger
**Purpose:** The core data entry screen for recording the variant matrix. Designed to use the tablet's width to eliminate vertical scrolling.
**UI Components:**
1.  **Left Sidebar (Context & Selectors):**
    *   **Current Operator:** Displays who is actively logging (e.g., "Logging as: Teme").
    *   **Divider Type Grid:** A 2-column grid of large toggle buttons: `[50]`, `[40]`, `[30]`, `[16]`, `[12]`, `[45]`, `[Other]`.
    *   **Placement Style Segment:** A vertical stack of large radio-style buttons: `[ብተና]`, `[ውስጥ]`, `[የተለየ]`.
    *   **Size Toggle:** Massive side-by-side buttons: `[9cm]` and `[7cm]`.
2.  **Main Content Area (Numpad & Submission):**
    *   **Metric Toggles:** Two massive tabs at the top of this pane: "Good Production" and "Waste Material".
    *   **On-Screen Numpad:** A massive 0-9 numeric keypad taking up the center of the screen, completely eliminating the need for the native tablet keyboard to pop up.
    *   **Live Display Screen:** A large, calculator-style LED display screen above the numpad showing the currently typed number.
    *   **Submit Row:** A massive, full-width `h-24` button anchored to the bottom right labeled "SAVE TO LEDGER" spanning the width of the right panel.

### Screen 3: Machine Downtime & Issue Flagging
**Purpose:** Allows an operator to quickly flag an issue on the line without leaving their station.
**UI Components:**
1.  **Left Sidebar (Navigation):**
    *   Standard app navigation to switch back to the Production Logger.
2.  **Main Content Area:**
    *   **Alert Button:** A gigantic, centrally located emergency-style button: "FLAG LINE STOPPAGE".
    *   **Issue Matrix:** If pressed, the screen replaces the button with a 2x2 grid of massive fault categories: "Material Shortage", "Equipment Failure", "Quality Defect", "Other".
    *   **Resolution Timer:** A large stopwatch that begins counting the downtime immediately upon logging the fault, with a green "Resolve Issue" button below it.

---

## 4. Technical Integration Notes for AI Generator
*   **Progressive Web App (PWA):** Generate the necessary `manifest.json` configurations so the Vue application can be saved to the tablet's home screen and run in full-screen kiosk mode, hiding the browser URL bar entirely.
*   **State Management:** Utilize Vuex or Pinia to maintain the state of the selected operator and the active selections (Type, Style, Size) so the operator doesn't have to re-select them between consecutive submissions.
*   **Offline First:** The application must utilize IndexedDB or LocalStorage to queue the SQL JSON payloads if the factory loses its connection to the AWS backend, with an automatic background sync loop when connectivity is restored.