import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useInventoryStore = defineStore('inventoryStore', () => {
  // ── State ──────────────────────────────────────────────────────────────
  const materials = ref([
    { id: 'mat-1', name: 'Standard Sheet Metal', current_stock: 50, reorder_threshold: 15, unit: 'm2', max_capacity: 200 },
    { id: 'mat-2', name: 'Premium Coating Paint', current_stock: 120, reorder_threshold: 40, unit: 'L', max_capacity: 500 },
    { id: 'mat-3', name: 'Industrial Lubricant', current_stock: 10, reorder_threshold: 15, unit: 'gal', max_capacity: 50 }
  ])

  // ── Actions ────────────────────────────────────────────────────────────
  function receiveStock(materialId, amount) {
    const qty = Number(amount)
    if (isNaN(qty) || qty <= 0) return
    const mat = materials.value.find(m => m.id === materialId)
    if (mat) {
      mat.current_stock += qty
    }
  }

  function deductForProduction(dividerType, qtyProduced) {
    const qty = Number(qtyProduced) || 0
    if (qty <= 0) return

    // Mock consumption rate: 
    // 1000 dividers = 5 units of sheet metal and 2 units of paint
    const sheetMetalUsed = (qty / 1000) * 5
    const paintUsed = (qty / 1000) * 2

    const sheet = materials.value.find(m => m.id === 'mat-1')
    if (sheet) sheet.current_stock = Math.max(0, sheet.current_stock - sheetMetalUsed)

    const paint = materials.value.find(m => m.id === 'mat-2')
    if (paint) paint.current_stock = Math.max(0, paint.current_stock - paintUsed)
  }

  // ── Getters ────────────────────────────────────────────────────────────
  const lowStockAlerts = computed(() => {
    return materials.value.filter(m => m.current_stock <= m.reorder_threshold)
  })

  return {
    materials,
    receiveStock,
    deductForProduction,
    lowStockAlerts
  }
})
