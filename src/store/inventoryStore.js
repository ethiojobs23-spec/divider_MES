/**
 * inventoryStore.js — Raw Materials Inventory
 * Fully wired to Supabase with optimistic UI and offline sync.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { syncManager } from '@/services/syncManager'

export const useInventoryStore = defineStore('inventoryStore', () => {
  // ── State ──────────────────────────────────────────────────────────────
  const materials = ref([
    { id: 'mat-1', name: 'Standard Sheet Metal',   current_stock: 50,  reorder_threshold: 15, unit: 'm2',  max_capacity: 200 },
    { id: 'mat-2', name: 'Premium Coating Paint',   current_stock: 120, reorder_threshold: 40, unit: 'L',   max_capacity: 500 },
    { id: 'mat-3', name: 'Industrial Lubricant',    current_stock: 10,  reorder_threshold: 15, unit: 'gal', max_capacity: 50  },
  ])

  // ── Fetch from Supabase ────────────────────────────────────────────────
  async function fetchMaterials() {
    try {
      const { data, error } = await supabase
        .from('mes_inventory')
        .select('*')
        .order('id', { ascending: true })

      if (error) throw error
      if (data && data.length > 0) {
        materials.value = data.map(row => ({
          id:                String(row.id),
          name:              row.material_name,
          current_stock:     Number(row.stock_level) || 0,
          reorder_threshold: Number(row.reorder_threshold) || 15,
          unit:              row.unit || 'units',
          max_capacity:      Number(row.max_capacity) || 200,
        }))
      }
      // If DB is empty, seed with defaults (on first run)
    } catch (err) {
      console.error('[InventoryStore] fetchMaterials failed — using local cache:', err)
    }
  }

  // ── Receive Stock ──────────────────────────────────────────────────────
  async function receiveStock(materialId, amount) {
    const qty = Number(amount)
    if (isNaN(qty) || qty <= 0) return

    const mat = materials.value.find(m => String(m.id) === String(materialId))
    if (!mat) return

    const newLevel = mat.current_stock + qty
    mat.current_stock = newLevel // optimistic

    const updatePayload = {
      stock_level:  newLevel,
      last_updated: new Date().toISOString(),
    }

    // Don't try to update temp string IDs like 'mat-1' in DB
    if (isNaN(Number(materialId))) return

    if (navigator.onLine) {
      try {
        const { error } = await supabase
          .from('mes_inventory')
          .update(updatePayload)
          .eq('id', Number(materialId))

        if (error) throw error
      } catch (err) {
        console.error('[InventoryStore] receiveStock update failed:', err)
        syncManager.enqueue({
          action:  'update',
          table:   'mes_inventory',
          payload: updatePayload,
          match:   { id: Number(materialId) },
        })
      }
    } else {
      syncManager.enqueue({
        action:  'update',
        table:   'mes_inventory',
        payload: updatePayload,
        match:   { id: Number(materialId) },
      })
    }
  }

  // ── Deduct for Production ──────────────────────────────────────────────
  async function deductForProduction(dividerType, qtyProduced) {
    const qty = Number(qtyProduced) || 0
    if (qty <= 0) return

    // Consumption rates: 1000 dividers = 5 m2 sheet metal + 2L paint
    const sheetMetalUsed = (qty / 1000) * 5
    const paintUsed      = (qty / 1000) * 2

    for (const [nameFragment, deduction] of [
      ['Sheet Metal', sheetMetalUsed],
      ['Coating Paint', paintUsed],
    ]) {
      const mat = materials.value.find(m => m.name.includes(nameFragment))
      if (!mat) continue

      const newLevel = Math.max(0, mat.current_stock - deduction)
      mat.current_stock = newLevel // optimistic

      if (isNaN(Number(mat.id))) continue

      const updatePayload = {
        stock_level:  newLevel,
        last_updated: new Date().toISOString(),
      }

      if (navigator.onLine) {
        try {
          const { error } = await supabase
            .from('mes_inventory')
            .update(updatePayload)
            .eq('id', Number(mat.id))

          if (error) throw error
        } catch (err) {
          console.error('[InventoryStore] deductForProduction update failed:', err)
          syncManager.enqueue({
            action:  'update',
            table:   'mes_inventory',
            payload: updatePayload,
            match:   { id: Number(mat.id) },
          })
        }
      } else {
        syncManager.enqueue({
          action:  'update',
          table:   'mes_inventory',
          payload: updatePayload,
          match:   { id: Number(mat.id) },
        })
      }
    }
  }

  // ── Getters ────────────────────────────────────────────────────────────
  const lowStockAlerts = computed(() =>
    materials.value.filter(m => m.current_stock <= m.reorder_threshold)
  )

  return {
    materials,
    fetchMaterials,
    receiveStock,
    deductForProduction,
    lowStockAlerts,
  }
}, {
  persist: {
    key:  'divider-inventory',
    pick: ['materials'],
  },
})
