/**
 * payloadContracts.js
 *
 * Strict JSON serialisation contracts for all MES API endpoints.
 *
 * Rules enforced here:
 *  1. Amharic placement keys ('ብተና' | 'ውስጥ' | 'የተሰየ') are sent as-is to the
 *     database — they are NOT translated to English. The backend schema stores
 *     the Amharic literal in `placement_style VARCHAR(20)`.
 *  2. All numeric fields use integer arithmetic or the toDecimal2() helper to
 *     prevent IEEE-754 drift in stored values.
 *  3. Every formatter validates its critical fields and throws on invalid input
 *     so the caller (api.js / mesStore) can catch and queue appropriately.
 *  4. Date strings are always UTC ISO 8601 (YYYY-MM-DD or full ISO) —
 *     never locale-formatted strings that vary by tablet OS.
 */

import { toDecimal2 } from '@/store/payrollStore.js'

// ─── Canonical Amharic placement keys ──────────────────────────────────────
// These must match mesStore.pieceRates keys and the DB column values exactly.
export const VALID_PLACEMENTS = /** @type {const} */ (['ብተና', 'ውስጥ', 'የተሰየ'])
export const VALID_SIZES      = /** @type {const} */ (['7cm', '9cm'])
export const VALID_TYPES      = /** @type {const} */ ([12, 16, 30, 40, 45, 50])

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Today's date in YYYY-MM-DD (UTC, tablet-locale-independent) */
function utcDateString() {
  return new Date().toISOString().split('T')[0]
}

/** Trim + truncate a string field for VARCHAR columns */
function safeStr(value, maxLen = 50) {
  return String(value ?? '').trim().substring(0, maxLen)
}

// ─── Production Ledger ─────────────────────────────────────────────────────
/**
 * Format a production log entry for the `mes_production_logs` table.
 *
 * @param {Object} data
 *   @param {string|number} data.dividerType   - e.g. "50" or 50
 *   @param {string}        data.placement     - Amharic: 'ብተና'|'ውስጥ'|'የተሰየ'
 *   @param {string}        data.size          - '9cm' or '7cm'
 *   @param {number|string} data.goodProduction
 *   @param {number|string} data.wasteMaterial
 * @param {string} operatorName
 * @returns {Object} API-ready payload
 * @throws {Error} on constraint violation
 */
export function formatProductionPayload(data, operatorName) {
  const dividerType = parseInt(data.dividerType, 10)
  const sizeCm      = parseInt(String(data.size).replace('cm', ''), 10)
  const placement   = safeStr(data.placement, 20)

  // ── Hard validation ────────────────────────────────────────────────────
  if (!VALID_TYPES.includes(dividerType)) {
    throw new Error(`formatProductionPayload: invalid divider_type "${data.dividerType}"`)
  }
  if (!VALID_PLACEMENTS.includes(placement)) {
    throw new Error(
      `formatProductionPayload: invalid placement_style "${placement}" ` +
      `— must be one of ${VALID_PLACEMENTS.join(', ')}`,
    )
  }
  if (!VALID_SIZES.includes(`${sizeCm}cm`)) {
    throw new Error(`formatProductionPayload: invalid size "${data.size}"`)
  }

  const qtyProduced = Math.max(0, parseInt(data.goodProduction, 10) || 0)
  const qtyWaste    = Math.max(0, parseInt(data.wasteMaterial,  10) || 0)

  return {
    operator_name:   safeStr(operatorName),
    production_date: utcDateString(),         // YYYY-MM-DD UTC — never locale string
    divider_type:    dividerType,             // INT
    // Stored as Amharic literal — do NOT translate to English
    placement_style: placement,               // 'ብተና' | 'ውስጥ' | 'የተሰየ'
    size_cm:         sizeCm,                  // INT: 7 or 9
    qty_produced:    qtyProduced,             // INT ≥ 0
    qty_waste:       qtyWaste,                // INT ≥ 0
  }
}

// ─── Block Matrix Payout ────────────────────────────────────────────────────
/**
 * Format a block-matrix payout record for the `mes_block_payouts` table.
 * Each block represents a 2-day sub-period (M&T, W&T, F&S).
 *
 * @param {Object} data
 *   @param {string}        data.week          - "W30-2026"
 *   @param {string|number} data.dividerType   - "50" | "40" | "30" | "16" | "12"
 *   @param {string}        data.block         - "MT" | "WT" | "FS"
 *   @param {number}        data.pp            - piece price (Birr/pc)
 *   @param {string}        data.pl            - payout line label
 *   @param {number|string} data.quantity      - pieces produced in block
 * @param {string} operatorName
 * @returns {Object}
 */
export function formatBlockPayoutPayload(data, operatorName) {
  const VALID_BLOCKS = ['MT', 'WT', 'FS']
  const block = safeStr(data.block, 5)

  if (!VALID_BLOCKS.includes(block)) {
    throw new Error(`formatBlockPayoutPayload: invalid block "${block}"`)
  }

  const pp       = toDecimal2(Math.max(0, parseFloat(data.pp) || 0))
  const quantity = Math.max(0, parseInt(data.quantity, 10) || 0)
  const revenue  = toDecimal2(pp * quantity)

  return {
    operator_name:  safeStr(operatorName),
    week:           safeStr(data.week, 10),
    divider_type:   parseInt(data.dividerType, 10),
    block_period:   block,                     // "MT" | "WT" | "FS"
    piece_price:    pp,                        // DECIMAL 10,4
    payout_line:    safeStr(data.pl, 50),
    quantity:       quantity,                  // INT
    revenue:        revenue,                   // DECIMAL 10,2
    recorded_at:    new Date().toISOString(),
  }
}

// ─── Hourly Wage ────────────────────────────────────────────────────────────
/**
 * Format an hourly wage entry for the `mes_financial_ledger` table
 * (stored as type='hourly_wage').
 *
 * @param {Object} data
 *   @param {number} data.hours       - hours worked
 *   @param {number} data.hourlyRate  - Birr/hr in [15, 30]
 *   @param {string} data.date        - YYYY-MM-DD
 * @param {string} operatorName
 * @returns {Object}
 */
export function formatHourlyWagePayload(data, operatorName) {
  const hours      = Math.max(0, parseFloat(data.hours) || 0)
  const hourlyRate = Math.min(30, Math.max(15, parseFloat(data.hourlyRate) || 15))
  const gross      = toDecimal2(hours * hourlyRate)

  return {
    target_name:      safeStr(operatorName),
    transaction_type: 'hourly_wage',           // matches cashEntries type literal
    hours_worked:     toDecimal2(hours),        // DECIMAL 6,2
    hourly_rate:      toDecimal2(hourlyRate),   // DECIMAL 6,2 — always [15,30]
    amount:           gross,                    // DECIMAL 10,2
    transaction_date: safeStr(data.date || utcDateString(), 10),
    notes:            `${hours}h × ${hourlyRate}Br/hr`,
  }
}

// ─── Company Expense ────────────────────────────────────────────────────────
/**
 * Format a general company expense for the `mes_financial_ledger` table.
 *
 * @param {Object} data
 *   @param {string} data.date
 *   @param {string} data.employeeName
 *   @param {string} data.description
 *   @param {number} data.amount
 * @returns {Object}
 */
export function formatExpensePayload(data) {
  return {
    target_name:      safeStr(data.employeeName),
    transaction_type: 'expense',
    amount:           toDecimal2(Math.max(0, parseFloat(data.amount) || 0)),
    transaction_date: safeStr(data.date || utcDateString(), 10),
    notes:            safeStr(data.description, 255),
  }
}

// ─── Generic Financial ──────────────────────────────────────────────────────
/**
 * Format a financial transaction (advance, bonus, payout, expense).
 *
 * @param {Object} data
 *   @param {'advance'|'expense'|'bonus'|'payout'|'hourly_wage'} data.type
 *   @param {number|string} data.amount
 *   @param {string} data.reason
 * @param {string} activeOperatorName
 * @returns {Object}
 */
export function formatFinancialPayload(data, activeOperatorName) {
  const VALID_TYPES = ['advance', 'expense', 'bonus', 'payout', 'hourly_wage']
  const txType = safeStr(data.type, 20)

  if (!VALID_TYPES.includes(txType)) {
    throw new Error(`formatFinancialPayload: invalid transaction_type "${txType}"`)
  }

  return {
    target_name:      safeStr(activeOperatorName),
    transaction_type: txType,
    amount:           toDecimal2(Math.max(0, parseFloat(data.amount) || 0)),
    transaction_date: utcDateString(),
    notes:            safeStr(data.reason, 255),
  }
}

// ─── Downtime ───────────────────────────────────────────────────────────────
export function formatDowntimeStartPayload(data, operatorName) {
  return {
    issue_category: safeStr(data.reason),
    operator_name:  safeStr(operatorName),
    start_time:     new Date().toISOString(),
  }
}

export function formatDowntimeResolvePayload(notes) {
  return {
    notes:       safeStr(notes, 255),
    resolved_at: new Date().toISOString(),
  }
}
