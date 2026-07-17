/**
 * payloadContracts.js
 * 
 * Enforces strict JSON structures before data is sent to the WordPress REST API.
 * Ensures data types match the custom MySQL tables exactly.
 */

/**
 * Formats a production ledger entry for the `mes_production_logs` table.
 * 
 * @param {Object} data 
 * @param {String} operatorName
 * @returns {Object} Validated payload
 */
export function formatProductionPayload(data, operatorName) {
  // Enforce types based on backend schema
  const dividerType = parseInt(data.dividerType, 10);
  const sizeCm = parseInt(data.size.replace('cm', ''), 10);
  
  // Validate constraints
  const validTypes = [50, 40, 30, 16, 12, 45];
  if (!validTypes.includes(dividerType)) {
    throw new Error(`Invalid divider_type: ${dividerType}`);
  }

  return {
    operator_name: String(operatorName).trim().substring(0, 50),
    production_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    divider_type: dividerType,
    placement_style: String(data.placement).trim().substring(0, 50),
    size_cm: sizeCm,
    qty_produced: Math.max(0, parseInt(data.goodProduction, 10) || 0),
    qty_waste: Math.max(0, parseInt(data.wasteMaterial, 10) || 0)
  };
}

/**
 * Formats a financial transaction for the `mes_financial_ledger` table.
 * 
 * @param {Object} data 
 * @param {String} activeOperatorName 
 * @returns {Object} Validated payload
 */
export function formatFinancialPayload(data, activeOperatorName) {
  return {
    target_name: String(activeOperatorName || 'Unknown').trim().substring(0, 50),
    transaction_type: String(data.type).trim(), // 'advance' | 'expense' | 'bonus' | 'payout'
    amount: parseFloat(data.amount).toFixed(2), // decimal 10,2
    transaction_date: new Date().toISOString().split('T')[0],
    notes: String(data.reason || '').trim()
  };
}

/**
 * Formats a new machine downtime flag for the `mes_downtime_logs` table.
 * 
 * @param {Object} data
 * @param {String} operatorName
 * @returns {Object} Validated payload
 */
export function formatDowntimeStartPayload(data, operatorName) {
  return {
    issue_category: String(data.reason).trim().substring(0, 50),
    operator_name: String(operatorName).trim().substring(0, 50),
    start_time: new Date().toISOString()
  };
}

/**
 * Formats a downtime resolution patch payload.
 * 
 * @param {String} notes
 * @returns {Object} Validated payload
 */
export function formatDowntimeResolvePayload(notes) {
  return {
    notes: String(notes || '').trim()
  };
}
