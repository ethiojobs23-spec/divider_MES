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

      if (error) {
        console.warn('[InventoryStore] Error fetching mes_inventory:', error.message)
      } else if (data && data.length > 0) {
        materials.value = data.map(row => ({
          id:                String(row.id),
          name:              row.material_name,
          current_stock:     Number(row.stock_level) || 0,
          reorder_threshold: Number(row.reorder_threshold) || 15,
          unit:              row.unit || 'units',
          max_capacity:      Number(row.max_capacity) || 100,
        }))
      } else if (materials.value.length === 0) {
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
              id: String(row.id), name: row.material_name, current_stock: Number(row.stock_level) || 0,
              reorder_threshold: Number(row.reorder_threshold) || 15, unit: row.unit, max_capacity: Number(row.max_capacity) || 100
           }))
        }
      }
      
      const { data: txData, error: txError } = await supabase
        .from('mes_inventory_logs')
        .select('*')
        .order('transaction_date', { ascending: false })
        .limit(200)

      if (txError) {
        console.warn('[InventoryStore] Error fetching mes_inventory_logs:', txError.message)
      } else if (txData) {
        if (txData.length > 0) {
          transactions.value = txData
        }
      }
      
    } catch (err) {
      console.error('[InventoryStore] fetchMaterials failed:', err)
    }
  }

  async function addMaterial(payload) {
     const dbPayload = {
        material_name: payload.name,
        stock_level: Number(payload.current_stock) || 0,
        reorder_threshold: Number(payload.reorder_threshold) || 15,
        unit: payload.unit || 'units',
        max_capacity: Number(payload.max_capacity) || 100
     }
     try {
       const { data, error } = await supabase.from('mes_inventory').insert(dbPayload).select().single()
       if (data && !error) {
          materials.value.push({
            id: String(data.id), name: data.material_name, current_stock: Number(data.stock_level) || 0,
            reorder_threshold: Number(data.reorder_threshold) || 15, unit: data.unit, max_capacity: Number(data.max_capacity) || 100
          })
          return true
       } else {
          const localMat = {
            id: String(Date.now()),
            name: dbPayload.material_name,
            current_stock: dbPayload.stock_level,
            reorder_threshold: dbPayload.reorder_threshold,
            unit: dbPayload.unit,
            max_capacity: dbPayload.max_capacity
          }
          materials.value.push(localMat)
          syncManager.enqueue({ action: 'insert', table: 'mes_inventory', payload: dbPayload })
          return true
       }
     } catch (err) {
       console.warn('[InventoryStore] addMaterial fallback:', err)
       const localMat = {
         id: String(Date.now()),
         name: dbPayload.material_name,
         current_stock: dbPayload.stock_level,
         reorder_threshold: dbPayload.reorder_threshold,
         unit: dbPayload.unit,
         max_capacity: dbPayload.max_capacity
       }
       materials.value.push(localMat)
       syncManager.enqueue({ action: 'insert', table: 'mes_inventory', payload: dbPayload })
       return true
     }
  }

  async function updateMaterial(materialId, payload) {
    const mat = materials.value.find(m => String(m.id) === String(materialId))
    if (!mat) return false

    if (payload.name !== undefined) mat.name = payload.name
    if (payload.unit !== undefined) mat.unit = payload.unit
    if (payload.max_capacity !== undefined) mat.max_capacity = Number(payload.max_capacity) || 100
    if (payload.reorder_threshold !== undefined) mat.reorder_threshold = Number(payload.reorder_threshold) || 15
    if (payload.current_stock !== undefined) mat.current_stock = Number(payload.current_stock) || 0

    const dbPayload = {
      material_name: mat.name,
      unit: mat.unit,
      max_capacity: mat.max_capacity,
      reorder_threshold: mat.reorder_threshold,
      stock_level: mat.current_stock,
      last_updated: new Date().toISOString()
    }

    if (isNaN(Number(materialId))) return true

    try {
      const { error } = await supabase
        .from('mes_inventory')
        .update(dbPayload)
        .eq('id', Number(materialId))

      if (error) {
        console.warn('[InventoryStore] Supabase updateMaterial error:', error.message)
        syncManager.enqueue({ action: 'update', table: 'mes_inventory', payload: dbPayload, match: { id: Number(materialId) } })
      }
      return true
    } catch (err) {
      console.warn('[InventoryStore] Exception updating material:', err)
      syncManager.enqueue({ action: 'update', table: 'mes_inventory', payload: dbPayload, match: { id: Number(materialId) } })
      return true
    }
  }

  async function logTransaction(materialId, type, qty, notes = '') {
      const dbPayload = {
         material_id: Number(materialId),
         transaction_type: type,
         quantity: Number(qty),
         transaction_date: new Date().toISOString(),
         notes: notes || (type === 'IN' ? 'Stock Received' : 'Manual Withdrawal')
      }
      const localId = Date.now()
      const localTx = { id: localId, ...dbPayload }
      transactions.value.unshift(localTx)

      try {
        const { data, error } = await supabase.from('mes_inventory_logs').insert(dbPayload).select()
        if (error) {
          console.warn('[InventoryStore] Log insert failed, enqueuing sync:', error.message)
          syncManager.enqueue({ action: 'insert', table: 'mes_inventory_logs', payload: dbPayload })
        } else if (data && data.length > 0) {
          const idx = transactions.value.findIndex(t => t.id === localId)
          if (idx !== -1) {
            transactions.value[idx] = { ...data[0] }
          }
        }
      } catch (err) {
        console.warn('[InventoryStore] Exception logging transaction:', err)
        syncManager.enqueue({ action: 'insert', table: 'mes_inventory_logs', payload: dbPayload })
      }
  }

  async function receiveStock(materialId, amount, notes = 'Stock Received') {
    const qty = Number(amount)
    if (isNaN(qty) || qty <= 0) return { ok: false }

    const mat = materials.value.find(m => String(m.id) === String(materialId))
    if (!mat) return { ok: false }

    const newLevel = Number((Number(mat.current_stock || 0) + qty).toFixed(2))
    mat.current_stock = newLevel // optimistic

    await logTransaction(mat.id, 'IN', qty, notes)

    const updatePayload = {
      stock_level:  newLevel,
      last_updated: new Date().toISOString(),
    }
    
    if (isNaN(Number(materialId))) return { ok: true, newStock: newLevel }

    try {
      const { error } = await supabase.from('mes_inventory').update(updatePayload).eq('id', Number(materialId))
      if (error) {
        console.warn('[InventoryStore] Supabase receiveStock update error:', error.message)
        syncManager.enqueue({ action: 'update', table: 'mes_inventory', payload: updatePayload, match: { id: Number(materialId) } })
      }
    } catch (err) {
      console.warn('[InventoryStore] Exception updating receiveStock:', err)
      syncManager.enqueue({ action: 'update', table: 'mes_inventory', payload: updatePayload, match: { id: Number(materialId) } })
    }

    return { ok: true, newStock: newLevel }
  }

  async function withdrawStock(materialId, amount, notes = 'Manual Withdrawal') {
    const qty = Number(amount)
    if (isNaN(qty) || qty <= 0) return { ok: false }

    const mat = materials.value.find(m => String(m.id) === String(materialId))
    if (!mat) return { ok: false }

    const newLevel = Math.max(0, Number((Number(mat.current_stock || 0) - qty).toFixed(2)))
    mat.current_stock = newLevel

    await logTransaction(mat.id, 'OUT', qty, notes)

    const updatePayload = {
      stock_level:  newLevel,
      last_updated: new Date().toISOString(),
    }
    
    if (isNaN(Number(materialId))) return { ok: true, newStock: newLevel }

    try {
      const { error } = await supabase.from('mes_inventory').update(updatePayload).eq('id', Number(materialId))
      if (error) {
        console.warn('[InventoryStore] Supabase withdrawStock update error:', error.message)
        syncManager.enqueue({ action: 'update', table: 'mes_inventory', payload: updatePayload, match: { id: Number(materialId) } })
      }
    } catch (err) {
      console.warn('[InventoryStore] Exception updating withdrawStock:', err)
      syncManager.enqueue({ action: 'update', table: 'mes_inventory', payload: updatePayload, match: { id: Number(materialId) } })
    }

    return { ok: true, newStock: newLevel }
  }

  async function deductForProduction(dividerType, qtyProduced) {
  }

  const lowStockAlerts = computed(() =>
    materials.value.filter(m => {
       const thresholdValue = Number(m.reorder_threshold) > 0 ? Number(m.reorder_threshold) : (Number(m.max_capacity || 100) * 0.15)
       return Number(m.current_stock || 0) <= thresholdValue
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
    fetchInventory: fetchMaterials,
    addMaterial,
    updateMaterial,
    receiveStock,
    withdrawStock,
    deductForProduction,
    lowStockAlerts,
    initRealtime,
  }
}, {
  persist: {
    key:  'divider-inventory',
    pick: ['materials', 'transactions'],
  },
})
