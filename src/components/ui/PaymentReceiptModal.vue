<template>
  <Transition
    enter-active-class="transition-opacity duration-200"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-200"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div 
      v-if="isOpen" 
      class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      @click.self="$emit('close')"
    >
      <!-- Receipt Modal Card -->
      <div class="bg-slate-900 border border-white/15 w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        <!-- Header Bar -->
        <div class="bg-slate-800/90 border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <span class="material-symbols-rounded text-lg">receipt_long</span>
            </div>
            <div>
              <h3 class="text-sm font-black uppercase tracking-wider text-slate-100">Payroll Disbursement Slip</h3>
              <p class="text-[0.68rem] text-slate-400 font-mono">{{ receiptData?.receiptNo || 'OFFICIAL RECORD' }}</p>
            </div>
          </div>
          <button 
            @click="$emit('close')"
            class="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all flex items-center justify-center cursor-pointer"
          >
            <span class="material-symbols-rounded text-sm">close</span>
          </button>
        </div>

        <!-- Printable / Viewable Receipt Document -->
        <div class="p-6 overflow-y-auto space-y-5 text-slate-200 text-xs">
          
          <!-- Document Header -->
          <div class="border-b border-white/10 pb-4 flex justify-between items-start">
            <div>
              <h2 class="text-base font-black uppercase text-white tracking-wide">Divider Manufacturing</h2>
              <p class="text-[0.7rem] text-slate-400">Factory MES Enterprise</p>
            </div>
            <div class="text-right">
              <span class="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[0.68rem] font-bold">
                PAID &amp; SETTLED
              </span>
              <p class="text-[0.68rem] text-slate-400 mt-1 font-mono">{{ formattedDate }}</p>
            </div>
          </div>

          <!-- Employee & Period Info Box -->
          <div class="bg-slate-800/60 border border-white/5 rounded-xl p-3.5 grid grid-cols-2 gap-3 font-sans">
            <div>
              <p class="text-[0.65rem] uppercase font-bold text-slate-400">Employee</p>
              <p class="text-sm font-bold text-white">{{ receiptData?.employeeName || 'Unknown' }}</p>
              <p class="text-[0.68rem] text-slate-400 mt-0.5">Role: {{ receiptData?.role || 'Operator' }}</p>
            </div>
            <div class="text-right">
              <p class="text-[0.65rem] uppercase font-bold text-slate-400">Period &amp; Mode</p>
              <p class="text-sm font-bold text-indigo-300 font-mono">{{ receiptData?.productionWeek || 'W--' }}</p>
              <p class="text-[0.68rem] text-slate-400 mt-0.5">{{ receiptData?.paymentMethod || 'Cash' }} &bull; {{ receiptData?.accountInfo || 'N/A' }}</p>
            </div>
          </div>

          <!-- Statement Breakdown -->
          <div class="space-y-2">
            <p class="text-[0.65rem] uppercase font-black tracking-wider text-slate-400">Earnings &amp; Deductions Breakdown</p>
            
            <div class="bg-slate-950/60 border border-white/10 rounded-xl p-3 space-y-2.5 font-mono">
              <!-- Gross Production -->
              <div class="flex justify-between items-center text-xs">
                <span class="text-slate-300">Gross Piece-Rate Pay</span>
                <span class="font-bold text-white">{{ formatCurrency(receiptData?.grossPieceRate || receiptData?.grossPay) }}</span>
              </div>

              <!-- Hourly if any -->
              <div v-if="receiptData?.grossHourly > 0" class="flex justify-between items-center text-xs">
                <span class="text-slate-300">Hourly / Time Pay ({{ receiptData?.daysAttended || 0 }}d)</span>
                <span class="font-bold text-white">{{ formatCurrency(receiptData?.grossHourly) }}</span>
              </div>

              <!-- Cash Advances if any -->
              <div v-if="receiptData?.advanceDeductions > 0" class="flex justify-between items-center text-xs text-red-400">
                <span>Mid-Week Cash Advances</span>
                <span>-{{ formatCurrency(receiptData?.advanceDeductions) }}</span>
              </div>

              <!-- Loans if any -->
              <div v-if="receiptData?.loanDeductions > 0 || (receiptData?.deductions > 0 && !receiptData?.advanceDeductions)" class="flex justify-between items-center text-xs text-red-400">
                <span>Loan Repayments</span>
                <span>-{{ formatCurrency(receiptData?.loanDeductions || receiptData?.deductions) }}</span>
              </div>

              <!-- Bonus if any -->
              <div v-if="receiptData?.bonus > 0" class="flex justify-between items-center text-xs text-amber-400">
                <span>Bonus ({{ receiptData?.bonusReason || 'Excellence' }})</span>
                <span>+{{ formatCurrency(receiptData?.bonus) }}</span>
              </div>
            </div>
          </div>

          <!-- Net Disbursed Box -->
          <div class="bg-gradient-to-r from-emerald-950/60 to-emerald-900/40 border-2 border-emerald-500/50 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span class="text-[0.7rem] uppercase font-black tracking-wider text-emerald-400">Net Disbursed Amount</span>
              <p class="text-[0.65rem] text-slate-400 mt-0.5">Approved &amp; Logged to Financial Ledger</p>
            </div>
            <div class="text-2xl font-black font-mono text-emerald-400">
              {{ formatCurrency(receiptData?.netPayout) }}
            </div>
          </div>

          <!-- Remarks / Note -->
          <div v-if="receiptData?.note" class="bg-white/5 border border-white/10 rounded-lg p-2.5 text-[0.7rem] text-slate-400">
            <span class="font-bold text-slate-300">Note:</span> {{ receiptData.note }}
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="bg-slate-800/80 border-t border-white/10 p-4 flex gap-3">
          <button 
            @click="$emit('close')" 
            class="flex-1 py-3 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-xl transition-colors text-xs uppercase cursor-pointer"
          >
            Close
          </button>
          <button 
            @click="printReceipt" 
            class="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer active:scale-95"
          >
            <span class="material-symbols-rounded text-sm">print</span>
            Print / Save PDF
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
// Developer: Mintesnot Abebe | Brand: dev MinteIO
import { computed } from 'vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  receiptData: {
    type: Object,
    default: () => null
  }
})

defineEmits(['close'])

const formattedDate = computed(() => {
  if (!props.receiptData?.date) return new Date().toLocaleDateString()
  try {
    return new Date(props.receiptData.date).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  } catch {
    return props.receiptData.date
  }
})

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(amount || 0)
}

const printReceipt = () => {
  if (!props.receiptData) return

  const data = props.receiptData
  const receiptNo = data.receiptNo || `REC-${Date.now().toString().slice(-6)}`
  const dateStr = new Date(data.date || Date.now()).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
  
  const pieceRatePay = Number(data.grossPieceRate || data.grossPay || 0).toFixed(2)
  const hourlyPay = Number(data.grossHourly || 0).toFixed(2)
  const advanceDeductions = Number(data.advanceDeductions || 0).toFixed(2)
  const loanDeductions = Number(data.loanDeductions || (data.deductions > 0 && !data.advanceDeductions ? data.deductions : 0)).toFixed(2)
  const bonus = Number(data.bonus || 0).toFixed(2)
  const netPayout = Number(data.netPayout || 0).toFixed(2)

  const printHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Payroll Slip - ${data.employeeName} (${receiptNo})</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm 20mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 13px;
      line-height: 1.5;
    }
    .receipt-container {
      max-width: 720px;
      margin: 0 auto;
      border: 2px solid #0f172a;
      border-radius: 12px;
      padding: 26px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .company-title {
      font-size: 22px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #0f172a;
      margin: 0;
    }
    .company-sub {
      font-size: 11px;
      color: #475569;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 3px;
    }
    .badge-doc {
      display: inline-block;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 4px 10px;
      border-radius: 6px;
      font-weight: 800;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0f172a;
      margin-top: 8px;
    }
    .meta-box {
      text-align: right;
    }
    .meta-item {
      font-size: 12px;
      color: #334155;
      margin-bottom: 3px;
    }
    .meta-item strong {
      color: #0f172a;
      font-weight: 700;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px 16px;
      margin-bottom: 20px;
    }
    .info-col p {
      margin: 4px 0;
      font-size: 12px;
      color: #475569;
    }
    .info-col p strong {
      color: #0f172a;
      font-weight: 700;
    }
    .statement-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .statement-table th {
      background: #0f172a;
      color: #ffffff;
      text-transform: uppercase;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      padding: 10px 12px;
      text-align: left;
    }
    .statement-table th.tar, .statement-table td.tar {
      text-align: right;
    }
    .statement-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 12px;
      color: #1e293b;
    }
    .statement-table tr:nth-child(even) td {
      background: #f8fafc;
    }
    .net-box {
      background: #f0fdf4;
      border: 2px solid #16a34a;
      border-radius: 8px;
      padding: 14px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .net-label {
      font-size: 14px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #166534;
    }
    .net-amount {
      font-size: 24px;
      font-weight: 900;
      font-family: 'Consolas', 'Courier New', monospace;
      color: #15803d;
    }
    .signatures-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
      margin-top: 36px;
      padding-top: 16px;
      border-top: 1px dashed #cbd5e1;
    }
    .sig-block {
      text-align: center;
    }
    .sig-line {
      border-bottom: 1px solid #0f172a;
      height: 35px;
      margin-bottom: 6px;
    }
    .sig-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #475569;
    }
    .footer-note {
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
      margin-top: 24px;
      border-top: 1px solid #f1f5f9;
      padding-top: 8px;
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="header">
      <div>
        <h1 class="company-title">Divider Manufacturing</h1>
        <p class="company-sub">Factory Manufacturing Execution System (MES)</p>
        <span class="badge-doc">Official Payroll Slip</span>
      </div>
      <div class="meta-box">
        <div class="meta-item">Ref No: <strong>${receiptNo}</strong></div>
        <div class="meta-item">Date: <strong>${dateStr}</strong></div>
        <div class="meta-item">Period: <strong>${data.productionWeek || 'Current Week'}</strong></div>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-col">
        <p>Employee Name: <strong>${data.employeeName}</strong></p>
        <p>Employee ID: <strong>#${data.employeeId || '—'}</strong></p>
        <p>Designation: <strong>${data.role || 'Operator'}</strong></p>
      </div>
      <div class="info-col">
        <p>Disbursement Mode: <strong>${data.paymentMethod || 'Cash'}</strong></p>
        <p>Account / Phone: <strong>${data.accountInfo || 'N/A'}</strong></p>
        <p>Days Attended: <strong>${data.daysAttended != null ? data.daysAttended + ' days' : 'N/A'}</strong></p>
      </div>
    </div>

    <table class="statement-table">
      <thead>
        <tr>
          <th>Description</th>
          <th>Type / Breakdown</th>
          <th class="tar">Amount (ETB)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Gross Production Earnings</strong></td>
          <td>Piece-Rate Shift Earnings</td>
          <td class="tar">${pieceRatePay}</td>
        </tr>
        ${Number(hourlyPay) > 0 ? `
        <tr>
          <td><strong>Hourly / Time-Rate Earnings</strong></td>
          <td>Time Logs (${data.daysAttended || 0} days × 8h)</td>
          <td class="tar">${hourlyPay}</td>
        </tr>` : ''}
        ${Number(advanceDeductions) > 0 ? `
        <tr>
          <td><strong style="color:#b91c1c;">Cash Advance Deductions</strong></td>
          <td>Mid-Week Cash Advances</td>
          <td class="tar" style="color:#b91c1c;">-${advanceDeductions}</td>
        </tr>` : ''}
        ${Number(loanDeductions) > 0 ? `
        <tr>
          <td><strong style="color:#b91c1c;">Loan Installment Repayment</strong></td>
          <td>Scheduled Loan Deduction</td>
          <td class="tar" style="color:#b91c1c;">-${loanDeductions}</td>
        </tr>` : ''}
        ${Number(bonus) > 0 ? `
        <tr>
          <td><strong style="color:#b45309;">Performance Bonus</strong></td>
          <td>${data.bonusReason || 'Production Excellence'}</td>
          <td class="tar" style="color:#b45309;">+${bonus}</td>
        </tr>` : ''}
      </tbody>
    </table>

    <div class="net-box">
      <div class="net-label">Net Disbursed Amount</div>
      <div class="net-amount">${netPayout} ETB</div>
    </div>

    ${data.note ? `
    <div style="font-size:11px; color:#475569; margin-bottom:18px; padding:8px 12px; background:#f8fafc; border-left:3px solid #6366f1; border-radius:4px;">
      <strong>Remarks:</strong> ${data.note}
    </div>` : ''}

    <div class="signatures-grid">
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-title">Prepared By (Supervisor)</div>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-title">Authorized Approval</div>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-title">Employee Signature</div>
      </div>
    </div>

    <div class="footer-note">
      This is an official system-generated document issued by Divider MES • Confidential
    </div>
  </div>
  <script>
    window.onload = function() {
      window.focus();
      window.print();
    };
  <\/script>
</body>
</html>`

  const printWindow = window.open('', '_blank', 'width=800,height=900')
  if (printWindow) {
    printWindow.document.open()
    printWindow.document.write(printHtml)
    printWindow.document.close()
  } else {
    window.print()
  }
}
</script>
