<template>
  <Transition
    enter-active-class="transition-opacity duration-300"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-300"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="isOpen" class="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 print:bg-transparent print:p-0 print:block">
      <!-- Receipt Card -->
      <div class="bg-slate-50 w-full max-w-md rounded-xl shadow-2xl overflow-hidden print:shadow-none print:rounded-none print:max-w-none print:w-full print:bg-white">
        
        <!-- Receipt Content -->
        <div class="p-6 md:p-8 text-slate-900 print:text-black print:p-0">
          <!-- Header -->
          <div class="text-center border-b-2 border-slate-300 border-dashed pb-4 mb-4 print:border-black">
            <h2 class="text-xl font-bold uppercase tracking-widest text-slate-800 print:text-black">Divider Production</h2>
            <p class="text-sm text-slate-500 font-semibold tracking-wide uppercase mt-1 print:text-black">Official Payout Receipt</p>
          </div>

          <!-- Body -->
          <div v-if="receiptData" class="space-y-4">
            <div class="flex justify-between items-center text-sm">
              <span class="text-slate-500 font-semibold uppercase print:text-black">Employee</span>
              <span class="font-bold text-lg">{{ receiptData.employeeName }}</span>
            </div>
            
            <div class="flex justify-between items-center text-sm">
              <span class="text-slate-500 font-semibold uppercase print:text-black">Date</span>
              <span class="font-bold">{{ formattedDate }}</span>
            </div>

            <!-- Line Items -->
            <div class="pt-4 border-t border-slate-200 border-dashed space-y-2 font-mono print:border-black">
              <div class="flex justify-between items-center">
                <span class="text-slate-600 print:text-black">Production Earnings</span>
                <span>{{ formatCurrency(receiptData.grossPay) }}</span>
              </div>
              
              <div v-if="receiptData.deductions > 0" class="flex justify-between items-center text-red-600 print:text-black">
                <span>Loan Deductions</span>
                <span>-{{ formatCurrency(receiptData.deductions) }}</span>
              </div>
            </div>

            <!-- Net Total -->
            <div class="pt-4 border-t-2 border-slate-800 border-solid flex justify-between items-end print:border-black">
              <span class="text-sm font-bold uppercase tracking-wide">Net Paid</span>
              <span class="text-2xl font-black font-mono">{{ formatCurrency(receiptData.netPayout) }}</span>
            </div>
          </div>

          <!-- Footer -->
          <div class="mt-8 pt-4 text-center border-t-2 border-slate-300 border-dashed print:border-black">
            <p class="text-xs text-slate-400 font-semibold uppercase tracking-widest print:text-black">Approved by System Admin</p>
          </div>
        </div>

        <!-- Actions (Hidden on Print) -->
        <div class="bg-slate-200 p-4 flex gap-3 print:hidden">
          <button 
            @click="$emit('close')" 
            class="flex-1 py-3 bg-slate-300 hover:bg-slate-400 text-slate-700 font-bold rounded-lg transition-colors"
          >
            Close
          </button>
          <button 
            @click="printReceipt" 
            class="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
          >
            <span class="material-symbols-rounded">print</span>
            Print Receipt
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
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
  if (!props.receiptData?.date) return new Date().toLocaleString()
  return new Date(props.receiptData.date).toLocaleString()
})

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(amount || 0)
}

const printReceipt = () => {
  window.print()
}
</script>
