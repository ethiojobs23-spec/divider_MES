<template>
  <AppLayout>
    <div class="pbm-wrapper">

      <!-- ─── Header ─────────────────────────────────────────────────── -->
      <header class="pbm-header">
        <div class="header-left">
          <span class="material-symbols-rounded header-icon">grid_view</span>
          <div>
            <h1 class="header-title">Production Block Matrix</h1>
            <p class="header-sub">Aggregated Payout Ledger · {{ store.currentProductionWeek }}</p>
          </div>
        </div>

        <!-- Legend -->
        <div class="legend">
          <div class="legend-item"><span class="leg-dot leg-pp"></span>PP = Piece Price</div>
          <div class="legend-item"><span class="leg-dot leg-pl"></span>PL = Payout Line</div>
          <div class="legend-item"><span class="leg-dot leg-q"></span>Q = Quantity</div>
          <div class="legend-item"><span class="leg-dot leg-r"></span>R = Revenue</div>
        </div>

        <div class="header-week-nav">
          <button class="week-nav-btn" @click="shiftWeek(-1)">
            <span class="material-symbols-rounded">chevron_left</span>
          </button>
          <span class="week-label">{{ store.currentProductionWeek }}</span>
          <button class="week-nav-btn" @click="shiftWeek(1)">
            <span class="material-symbols-rounded">chevron_right</span>
          </button>
        </div>
      </header>

      <!-- ─── Matrix Table ───────────────────────────────────────────── -->
      <div class="matrix-scroll w-full overflow-x-auto">
        <table class="block-table">
          <thead>
            <tr>
              <th class="type-header">Type</th>
              <th v-for="block in blocks" :key="block.key" class="block-header" :class="{ 'weekend-header': block.key === 'FS' }">
                <div class="block-header-inner">
                  <span class="block-label">
                    {{ block.label }}
                    <span v-if="block.key === 'FS'" class="material-symbols-rounded weekend-icon" title="Weekend Overtime Multiplier (1.5x)">bolt</span>
                  </span>
                  <span class="block-days">{{ block.days }}</span>
                </div>
              </th>
              <th class="total-header">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="type in dividerTypes" :key="type" class="matrix-row">
              <!-- Type Label -->
              <td class="type-cell">
                <span class="type-badge">{{ type }}</span>
              </td>

              <!-- Block Cells -->
              <td
                v-for="block in blocks"
                :key="block.key"
                class="block-cell"
                @click="openEditor(type, block.key)"
                :class="{ 'cell--has-data': hasData(type, block.key), 'weekend-cell': block.key === 'FS' }"
              >
                <div class="cell-fields">
                  <div class="field-row field-pp">
                    <span class="field-key">$PP=</span>
                    <span class="field-val">{{ getField(type, block.key, 'pp') || '—' }}</span>
                  </div>
                  <div class="field-divider"></div>
                  <div class="field-row">
                    <span class="field-key">PL=</span>
                    <span class="field-val">{{ getField(type, block.key, 'pl') || '—' }}</span>
                  </div>
                  <div class="field-row">
                    <span class="field-key">Q=</span>
                    <span class="field-val">{{ getField(type, block.key, 'q') || '—' }}</span>
                  </div>
                  <div class="field-row field-r">
                    <span class="field-key">R=</span>
                    <span class="field-val rev-val">{{ computeRevenue(type, block.key) || '—' }}</span>
                  </div>
                </div>
              </td>

              <!-- Row Total -->
              <td class="block-cell total-col-cell">
                <div class="cell-fields">
                  <div class="field-row">
                    <span class="field-key">Q=</span>
                    <span class="field-val">{{ getRowQTotal(type) }}</span>
                  </div>
                  <div class="field-row field-r">
                    <span class="field-key">R=</span>
                    <span class="field-val rev-val">{{ getRowRTotal(type) }}</span>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>

          <!-- Column Totals Row -->
          <tfoot>
            <tr class="col-totals-row">
              <td class="type-cell totals-label">TOTAL</td>
              <td v-for="block in blocks" :key="block.key" class="block-cell totals-col" :class="{ 'weekend-cell': block.key === 'FS' }">
                <div class="field-row">
                  <span class="field-key">Q=</span>
                  <span class="field-val">{{ getColQTotal(block.key) }}</span>
                </div>
                <div class="field-row field-r">
                  <span class="field-key">R=</span>
                  <span class="field-val rev-val">{{ getColRTotal(block.key) }} Br</span>
                </div>
              </td>
              <td class="block-cell grand-total-cell">
                <div class="field-row">
                  <span class="field-key">Total Q=</span>
                  <span class="field-val">{{ getGrandQTotal() }}</span>
                </div>
                <div class="field-row field-r">
                  <span class="field-key">Total R=</span>
                  <span class="field-val rev-val">{{ getGrandRTotal() }} Br</span>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- ─── Cell Editor Modal ──────────────────────────────────────── -->
      <Transition name="modal">
        <div v-if="editorOpen" class="modal-overlay" @click.self="closeEditor">
          <div class="modal-card">
            <div class="modal-header">
              <div class="modal-title-group">
                <span class="modal-type-badge">Type {{ editTarget.type }}</span>
                <span class="modal-block-badge">{{ getBlockLabel(editTarget.block) }}</span>
              </div>
              <button class="modal-close" @click="closeEditor">
                <span class="material-symbols-rounded">close</span>
              </button>
            </div>

            <div class="modal-fields">
              <div class="edit-field">
                <label class="edit-label">$PP — Piece Price (Birr/pc)</label>
                <VirtualNumpad
                  label="Piece Price"
                  v-model="editValues.pp"
                  :maxLen="8"
                  allowDecimal
                />
              </div>
              <div class="edit-field">
                <label class="edit-label">PL — Payout Line</label>
                <input class="edit-input" v-model="editValues.pl" placeholder="—" />
              </div>
              <div class="edit-field">
                <label class="edit-label">Q — Quantity (pcs)</label>
                <VirtualNumpad
                  label="Quantity"
                  v-model="editValues.q"
                  :maxLen="6"
                />
              </div>

              <!-- Auto-computed Revenue -->
              <div class="revenue-preview" v-if="editValues.pp && editValues.q">
                <span class="rev-label">Revenue (R = $PP × Q)</span>
                <span class="rev-amount">{{ (parseFloat(editValues.pp) * parseInt(editValues.q || 0)).toFixed(2) }} Birr</span>
              </div>
            </div>

            <button class="modal-save-btn" @click="saveCell">
              <span class="material-symbols-rounded">save</span>
              SAVE BLOCK DATA
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </AppLayout>
</template>

<script setup>
// Developer: Mintesnot Abebe | Brand: dev MinteIO
import { ref, reactive } from 'vue'
import AppLayout  from '@/components/layout/AppLayout.vue'
import VirtualNumpad from '@/components/ui/VirtualNumpad.vue'
import { useMesStore } from '@/store/mesStore.js'

const store = useMesStore()

// ─── Constants ─────────────────────────────────────────────────────────────
const dividerTypes = ['50', '40', '30', '16', '12']
const blocks = [
  { key: 'MT', label: 'M & T', days: 'Mon · Tue' },
  { key: 'WT', label: 'W & T', days: 'Wed · Thu' },
  { key: 'FS', label: 'F & S', days: 'Fri · Sat' },
]

// ─── Grid Data ─────────────────────────────────────────────────────────────
// Shape: { [type][blockKey] = { pp, pl, q } }
const matrixData = reactive({})

function ensurePath(type, block) {
  if (!matrixData[type]) matrixData[type] = {}
  if (!matrixData[type][block]) matrixData[type][block] = { pp: '', pl: '', q: '' }
}

function getField(type, block, field) {
  return matrixData[type]?.[block]?.[field] ?? ''
}

function hasData(type, block) {
  const d = matrixData[type]?.[block]
  return d && (d.pp || d.pl || d.q)
}

function computeRevenue(type, block) {
  const pp = parseFloat(getField(type, block, 'pp')) || 0
  const q  = parseInt(getField(type, block, 'q'), 10) || 0
  return pp > 0 && q > 0 ? (pp * q).toFixed(2) : ''
}

// ─── Totals ────────────────────────────────────────────────────────────────
function getRowQTotal(type) {
  return blocks.reduce((sum, b) => sum + (parseInt(getField(type, b.key, 'q'), 10) || 0), 0) || '—'
}
function getRowRTotal(type) {
  const total = blocks.reduce((sum, b) => {
    const pp = parseFloat(getField(type, b.key, 'pp')) || 0
    const q  = parseInt(getField(type, b.key, 'q'), 10) || 0
    return sum + pp * q
  }, 0)
  return total > 0 ? total.toFixed(2) + ' Br' : '—'
}
function getColQTotal(block) {
  return dividerTypes.reduce((sum, t) => sum + (parseInt(getField(t, block, 'q'), 10) || 0), 0) || '—'
}
function getColRTotal(block) {
  const total = dividerTypes.reduce((sum, t) => {
    const pp = parseFloat(getField(t, block, 'pp')) || 0
    const q  = parseInt(getField(t, block, 'q'), 10) || 0
    return sum + pp * q
  }, 0)
  return total > 0 ? total.toFixed(2) : '—'
}
function getGrandQTotal() {
  return dividerTypes.reduce((sum, t) => {
    return sum + blocks.reduce((s, b) => s + (parseInt(getField(t, b.key, 'q'), 10) || 0), 0)
  }, 0) || '—'
}
function getGrandRTotal() {
  const total = dividerTypes.reduce((sum, t) => {
    return sum + blocks.reduce((s, b) => {
      const pp = parseFloat(getField(t, b.key, 'pp')) || 0
      const q  = parseInt(getField(t, b.key, 'q'), 10) || 0
      return s + pp * q
    }, 0)
  }, 0)
  return total > 0 ? total.toFixed(2) : '—'
}

// ─── Week Navigation ───────────────────────────────────────────────────────
function shiftWeek(delta) {
  const match = store.currentProductionWeek.match(/W(\d+)-(\d+)/)
  if (!match) return
  let week = parseInt(match[1]) + delta
  const year = parseInt(match[2])
  if (week < 1) week = 52
  if (week > 52) week = 1
  store.setProductionWeek(`W${String(week).padStart(2,'0')}-${year}`)
}

function getBlockLabel(key) {
  return blocks.find(b => b.key === key)?.label ?? key
}

// ─── Editor State ──────────────────────────────────────────────────────────
const editorOpen  = ref(false)
const editTarget  = reactive({ type: '', block: '' })
const editValues  = reactive({ pp: '', pl: '', q: '' })

function openEditor(type, block) {
  editTarget.type  = type
  editTarget.block = block
  ensurePath(type, block)
  const d = matrixData[type][block]
  editValues.pp = d.pp
  editValues.pl = d.pl
  editValues.q  = d.q
  editorOpen.value = true
}

function closeEditor() {
  editorOpen.value = false
}

function saveCell() {
  const { type, block } = editTarget
  ensurePath(type, block)
  matrixData[type][block].pp = editValues.pp
  matrixData[type][block].pl = editValues.pl
  matrixData[type][block].q  = editValues.q
  closeEditor()
}
</script>

<style scoped>
/* ── Wrapper ─────────────────────────────────────────────────────────────── */
.pbm-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #0f172a;
}

/* ── Header ──────────────────────────────────────────────────────────────── */
.pbm-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: .9rem 1.5rem;
  background: #1e293b;
  border-bottom: 1px solid rgba(99,102,241,.25);
  flex-shrink: 0;
}
.header-left { display: flex; align-items: center; gap: .75rem; flex: 1; }
.header-icon { font-size: 2rem; color: #6366f1; }
.header-title { font-size: 1.05rem; font-weight: 800; color: #f1f5f9; line-height: 1.2; }
.header-sub   { font-size: .65rem; color: #64748b; letter-spacing: .07em; }

.legend { display: flex; gap: .85rem; flex-shrink: 0; }
.legend-item { display: flex; align-items: center; gap: .35rem; font-size: .65rem; font-weight: 600; color: #64748b; }
.leg-dot { width: .6rem; height: .6rem; border-radius: 50%; flex-shrink: 0; }
.leg-pp { background: #6366f1; }
.leg-pl { background: #10b981; }
.leg-q  { background: #f59e0b; }
.leg-r  { background: #ec4899; }

.header-week-nav { display: flex; align-items: center; gap: .5rem; flex-shrink: 0; }
.week-nav-btn {
  width: 2rem; height: 2rem;
  background: rgba(99,102,241,.1);
  border: 1px solid rgba(99,102,241,.25);
  border-radius: .4rem;
  color: #a5b4fc;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all .13s ease;
}
.week-nav-btn:hover { background: rgba(99,102,241,.25); }
.week-label { font-size: .75rem; font-weight: 700; color: #a5b4fc; min-width: 6rem; text-align: center; }

.block-label { font-size: 1rem; font-weight: 800; color: #f1f5f9; display: flex; align-items: center; justify-content: center; gap: 0.2rem; }
.block-days  { font-size: 0.65rem; color: #94a3b8; letter-spacing: 0.05em; }

/* ── Weekend Highlight ── */
.weekend-header { background: rgba(245, 158, 11, 0.1) !important; border-top: 2px solid #fbbf24 !important; }
.weekend-header .block-label { color: #fbbf24; }
.weekend-header .block-days { color: rgba(251, 191, 36, 0.7); }
.weekend-icon { font-size: 1.1rem; color: #fbbf24; }
.weekend-cell { background: rgba(245, 158, 11, 0.03); border-right: 1px solid rgba(245, 158, 11, 0.15) !important; border-left: 1px solid rgba(245, 158, 11, 0.15) !important; }
.weekend-cell:hover { background: rgba(245, 158, 11, 0.08) !important; }

/* ── Rows ────────────────────────────────────────────────────────────────── */
.matrix-scroll {
  flex: 1;
  overflow: auto;
  padding: 1rem 1.5rem;
}

.block-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 4px;
}

/* Header Row */
.type-header {
  background: #1e293b;
  color: #64748b;
  font-size: .65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .08em;
  padding: .6rem;
  border-radius: .4rem;
  width: 5rem;
}
.block-header {
  background: #1e293b;
  padding: .6rem;
  border-radius: .4rem;
  text-align: center;
}
.block-header-inner { display: flex; flex-direction: column; align-items: center; gap: .15rem; }
.block-label  { font-size: .85rem; font-weight: 800; color: #a5b4fc; }
.block-days   { font-size: .6rem; color: #64748b; letter-spacing: .05em; }
.total-header {
  background: rgba(99,102,241,.12);
  color: #a5b4fc;
  font-size: .7rem;
  font-weight: 800;
  padding: .6rem;
  border-radius: .4rem;
  letter-spacing: .08em;
}

/* Type Cell */
.type-cell {
  background: #1e293b;
  border-radius: .5rem;
  text-align: center;
  padding: .5rem;
  vertical-align: middle;
}
.type-badge {
  display: inline-block;
  background: linear-gradient(135deg, rgba(99,102,241,.25), rgba(139,92,246,.2));
  border: 1px solid rgba(99,102,241,.3);
  border-radius: .4rem;
  padding: .3rem .75rem;
  font-size: 1rem;
  font-weight: 900;
  color: #a5b4fc;
  letter-spacing: .04em;
}

/* Block Data Cell */
.block-cell {
  background: rgba(255,255,255,.03);
  border: 1.5px solid rgba(255,255,255,.07);
  border-radius: .55rem;
  padding: .65rem .75rem;
  cursor: pointer;
  transition: all .13s ease;
  vertical-align: top;
  min-width: 9rem;
}
.block-cell:hover  { background: rgba(99,102,241,.1); border-color: rgba(99,102,241,.3); }
.block-cell:active { transform: scale(.98); }
.cell--has-data {
  background: rgba(16,185,129,.05);
  border-color: rgba(16,185,129,.2);
}
.cell--has-data:hover { background: rgba(16,185,129,.12); border-color: rgba(16,185,129,.35); }

.cell-fields { display: flex; flex-direction: column; gap: .28rem; }
.field-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: .5rem;
}
.field-key {
  font-size: .6rem;
  font-weight: 700;
  color: #475569;
  letter-spacing: .05em;
  text-transform: uppercase;
  flex-shrink: 0;
}
.field-val {
  font-size: .85rem;
  font-weight: 700;
  color: #94a3b8;
  font-variant-numeric: tabular-nums;
}
.field-divider {
  height: 1px;
  background: rgba(255,255,255,.07);
  margin: .1rem 0;
}
.field-pp .field-key { color: #6366f1; }
.field-pp .field-val { color: #a5b4fc; }
.field-r  .field-key { color: #ec4899; }
.rev-val { color: #f9a8d4 !important; font-weight: 800 !important; }

/* Total/Grand Total Cells */
.total-col-cell { background: rgba(99,102,241,.06); border-color: rgba(99,102,241,.2); cursor: default; }
.total-col-cell:hover { background: rgba(99,102,241,.1); }
.totals-label { background: rgba(99,102,241,.12); color: #a5b4fc !important; font-size: .7rem; letter-spacing: .08em; }
.totals-col { background: rgba(99,102,241,.08); border-color: rgba(99,102,241,.2); cursor: default; }
.grand-total-cell {
  background: rgba(139,92,246,.15);
  border-color: rgba(139,92,246,.35);
  cursor: default;
}
.grand-total-cell .rev-val { font-size: 1rem; }

/* ── Modal ───────────────────────────────────────────────────────────────── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.65);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.modal-card {
  width: 30rem;
  max-height: 90vh;
  background: #1e293b;
  border: 1px solid rgba(99,102,241,.3);
  border-radius: 1.25rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 25px 60px rgba(0,0,0,.6);
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.1rem 1.25rem;
  border-bottom: 1px solid rgba(255,255,255,.08);
}
.modal-title-group { display: flex; gap: .5rem; align-items: center; }
.modal-type-badge {
  background: rgba(99,102,241,.2);
  color: #a5b4fc;
  border-radius: .4rem;
  padding: .25rem .65rem;
  font-size: .85rem;
  font-weight: 800;
}
.modal-block-badge {
  background: rgba(16,185,129,.15);
  color: #34d399;
  border-radius: .4rem;
  padding: .25rem .65rem;
  font-size: .85rem;
  font-weight: 700;
}
.modal-close {
  width: 2.25rem; height: 2.25rem;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: .5rem;
  color: #94a3b8;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.modal-close:hover { background: rgba(239,68,68,.2); color: #f87171; }

.modal-fields {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
  flex: 1;
}
.edit-field { display: flex; flex-direction: column; gap: .4rem; }
.edit-label { font-size: .7rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .08em; }
.edit-input {
  width: 100%;
  height: 3.25rem;
  background: #0f172a;
  border: 1.5px solid rgba(255,255,255,.1);
  border-radius: .65rem;
  color: #e2e8f0;
  font-size: 1.1rem;
  font-weight: 700;
  padding: 0 1rem;
  outline: none;
  font-family: inherit;
  transition: border-color .13s;
}
.edit-input:focus { border-color: #6366f1; }

.revenue-preview {
  background: rgba(236,72,153,.1);
  border: 1px solid rgba(236,72,153,.25);
  border-radius: .65rem;
  padding: .85rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.rev-label  { font-size: .7rem; font-weight: 600; color: #db2777; }
.rev-amount { font-size: 1.25rem; font-weight: 800; color: #f9a8d4; font-variant-numeric: tabular-nums; }

.modal-save-btn {
  margin: 0 1.25rem 1.25rem;
  height: 4rem;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border: none;
  border-radius: .75rem;
  color: #fff;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: .08em;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: .5rem;
  transition: all .13s ease;
  flex-shrink: 0;
}
.modal-save-btn:hover  { filter: brightness(1.1); }
.modal-save-btn:active { transform: scale(.98); }

/* ── Modal Animation ─────────────────────────────────────────────────────── */
.modal-enter-active, .modal-leave-active { transition: all .2s ease; }
.modal-enter-from, .modal-leave-to       { opacity: 0; transform: scale(.95); }
</style>
