import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { syncManager } from '@/services/syncManager'

export const useInventoryStore = defineStore('inventoryStore', () => {
  const materials = ref([])
  const transactions = ref([])

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
          max_capacity:      Number(row.max_capacity) || 100,
        }))
      } else {
        const seed = [
          { material_name: 'Wire', stock_level: 0, reorder_threshold: 15, unit: 'kg', max_capacity: 100 },
          { material_name: 'Chaf', stock_level: 0, reorder_threshold: 15, unit: 'kg', max_capacity: 100 },
          { material_name: 'Shibo', stock_level: 0, reorder_threshold: 15, unit: 'rolls', max_capacity: 100 },
          { material_name: 'Plaster', stock_level: 0, reorder_threshold: 15, unit: 'bags', max_capacity: 100 },
          { material_name: 'Paper', stock_level: 0, reorder_threshold: 15, unit: 'rolls', max_capacity: 100 },
          { material_name: 'FuseLead', stock_level: 0, reorder_threshold: 15, unit: 'kg', max_capacity: 100 },
          { material_name: 'Cm', stock_level: 0, reorder_threshold: 15, unit: 'kg', max_capacity: 100 },
          { material_name: 'GlueStucko', stock_level: 0, reorder_threshold: 15, unit: 'buckets', max_capacity: 100 },
        ]
        const { data: inserted, error: insertError } = await supabase
          .from('mes_inventory')
          .insert(seed)
          .select()
          
        if (inserted && !insertError) {
           materials.value = inserted.map(row => ({
              id: String(row.id), name: row.material_name, current_stock: row.stock_level,
              reorder_threshold: row.reorder_threshold, unit: row.unit, max_capacity: row.max_capacity
           }))
        }
      }
      
      const { data: txData } = await supabase.from('mes_inventory_logs').select('*').order('transaction_date', { ascending: false }).limit(200)
      if (txData) transactions.value = txData
      
    } catch (err) {
      console.error('[InventoryStore] fetchMaterials failed:', err)
    }
  }

  async function addMaterial(payload) {
     const dbPayload = {
        material_name: payload.name,
        stock_level: payload.current_stock || 0,
        reorder_threshold: payload.reorder_threshold || 15,
        unit: payload.unit || 'units',
        max_capacity: payload.max_capacity || 100
     }
     const { data, error } = await supabase.from('mes_inventory').insert(dbPayload).select().single()
     if (data && !error) {
        materials.value.push({
          id: String(data.id), name: data.material_name, current_stock: data.stock_level,
          reorder_threshold: data.reorder_threshold, unit: data.unit, max_capacity: data.max_capacity
        })
        return true
     }
     return false
  }

  async function logTransaction(materialId, type, qty, notes = '') {
      const dbPayload = {
         material_id: Number(materialId),
         transaction_type: type,
         quantity: qty,
         transaction_date: new Date().toISOString(),
         notes: notes
      }
      transactions.value.unshift({ id: Date.now(), ...dbPayload })
      await supabase.from('mes_inventory_logs').insert(dbPayload).catch(console.error)
  }

  async function receiveStock(materialId, amount, notes = 'Stock Received') {
    const qty = Number(amount)
    if (isNaN(qty) || qty <= 0) return

    const mat = materials.value.find(m => String(m.id) === String(materialId))
    if (!mat) return

    const newLevel = mat.current_stock + qty
    mat.current_stock = newLevel // optimistic

    await logTransaction(mat.id, 'IN', qty, notes)

    const updatePayload = {
      stock_level:  newLevel,
      last_updated: new Date().toISOString(),
    }
    
    if (isNaN(Number(materialId))) return

    supabase.from('mes_inventory').update(updatePayload).eq('id', Number(materialId)).catch(err => {
        syncManager.enqueue({ action: 'update', table: 'mes_inventory', payload: updatePayload, match: { id: Number(materialId) } })
    })
  }

  async function withdrawStock(materialId, amount, notes = 'Manual Withdrawal') {
    const qty = Number(amount)
    if (isNaN(qty) || qty <= 0) return

    const mat = materials.value.find(m => String(m.id) === String(materialId))
    if (!mat) return

    const newLevel = Math.max(0, mat.current_stock - qty)
    mat.current_stock = newLevel

    await logTransaction(mat.id, 'OUT', qty, notes)

    const updatePayload = {
      stock_level:  newLevel,
      last_updated: new Date().toISOString(),
    }
    
    if (isNaN(Number(materialId))) return

    supabase.from('mes_inventory').update(updatePayload).eq('id', Number(materialId)).catch(err => {
        syncManager.enqueue({ action: 'update', table: 'mes_inventory', payload: updatePayload, match: { id: Number(materialId) } })
    })
  }

  async function deductForProduction(dividerType, qtyProduced) {
  }

  const lowStockAlerts = computed(() =>
    materials.value.filter(m => {
       const thresholdValue = (m.max_capacity * 0.15)
       return m.current_stock <= thresholdValue
    })
  )

  // ── Realtime Subscription ──────────────────────────────────────────────
  let realtimeChannel = null

  function initRealtime() {
    if (realtimeChannel) return

    realtimeChannel = supabase
      .channel('mes_inventory_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mes_inventory' },
        (payload) => {
          const row = payload.new
          const existing = materials.value.find(m => String(m.id) === String(row.id) || m.name === row.material_name)
          if (!existing) {
            materials.value.push({
              id:                String(row.id),
              name:              row.material_name,
              current_stock:     Number(row.stock_level) || 0,
              reorder_threshold: Number(row.reorder_threshold) || 15,
              unit:              row.unit || 'units',
              max_capacity:      Number(row.max_capacity) || 100,
            })
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'mes_inventory' },
        (payload) => {
          const row = payload.new
          const mat = materials.value.find(m => String(m.id) === String(row.id) || m.name === row.material_name)
          if (mat) {
            mat.id = String(row.id)
            mat.current_stock = Number(row.stock_level) || 0
            mat.reorder_threshold = Number(row.reorder_threshold) || 15
            mat.unit = row.unit || mat.unit
            mat.max_capacity = Number(row.max_capacity) || mat.max_capacity
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'mes_inventory' },
        (payload) => {
          const oldRow = payload.old
          materials.value = materials.value.filter(m => String(m.id) !== String(oldRow.id))
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mes_inventory_logs' },
        (payload) => {
          const row = payload.new
          if (!transactions.value.some(t => t.id === row.id)) {
            transactions.value.unshift(row)
          }
        }
      )
      .subscribe()
  }

  return {
    materials,
    transactions,
    fetchMaterials,
    addMaterial,
    receiveStock,
    withdrawStock,
    deductForProduction,
    lowStockAlerts,
    initRealtime,
  }
}, {
  persist: {
    key:  'divider-inventory',
    pick: ['materials'],
  },
})
