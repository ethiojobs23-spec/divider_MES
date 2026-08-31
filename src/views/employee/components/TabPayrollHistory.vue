<template>
  <div class="tab-content">
    <div class="production-list-card">
      <h3>My Weekly Payroll Payouts</h3>
      <div class="data-table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date Paid</th>
              <th class="align-right">Amount (ETB)</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in payouts" :key="p.id">
              <td>{{ new Date(p.transaction_date || p.created_at).toLocaleDateString([], {weekday:'short', month:'short', day:'numeric', year:'numeric'}) }}</td>
              <td class="align-right"><strong style="color:#34d399">{{ Number(p.amount).toFixed(2) }} ETB</strong></td>
              <td>{{ p.note || '—' }}</td>
            </tr>
            <tr v-if="!payouts.length"><td colspan="3" class="empty-text">No payroll payouts recorded yet.</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
// Developer: Mintesnot Abebe | Brand: dev MinteIO
defineProps({
  payouts: { type: Array, default: () => [] }
})
</script>

<style scoped>
.tab-content {
  animation: fadeIn 0.3s ease;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.production-list-card {
  background: #1e293b;
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 1.5rem;
  padding: 2rem;
}
.production-list-card h3 { margin: 0 0 1.5rem 0; font-size: 1.4rem; color: #f8fafc; }

.data-table-container { 
  overflow-x: auto; 
  overflow-y: auto; 
  max-height: 500px; 
  width: 100%; 
  scrollbar-width: none; 
  -ms-overflow-style: none; 
} 
.data-table-container::-webkit-scrollbar { display: none; } 

.data-table {
  width: 100%;
  border-collapse: collapse;
  white-space: nowrap;
}
.data-table th, .data-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.data-table th { color: #64748b; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }
.data-table td { color: #e2e8f0; font-size: 0.95rem; }
.align-right { text-align: right !important; }
.empty-text { text-align: center !important; color: #64748b !important; padding: 3rem !important; }

@media (max-width: 768px) {
  .production-list-card { padding: 1.25rem 0.75rem; }
  .data-table-container {
    -webkit-overflow-scrolling: touch;
    width: 100%;
  }
  .data-table {
    min-width: 450px;
  }
}
</style>
