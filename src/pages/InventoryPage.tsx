import { useEffect, useState, Fragment } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, ChevronDown, ChevronUp, ClipboardList, Layers, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { inventoryService } from '../services/inventory.service'
import { Modal } from '../components/Modal'
import { NumberInput } from '../components/NumberInput'
import { SortableTh } from '../components/SortableTh'
import { useSortableTable } from '../hooks/useSortableTable'
import type { InventoryResponse, InventoryAdjustmentRequest, InventoryBatchResponse } from '../types'
import './CrudPage.css'

const rowVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0 },
}

function sortedBatches(batches: InventoryBatchResponse[]): InventoryBatchResponse[] {
  return [...batches].sort((a, b) => a.id - b.id)
}

function batchLabel(index: number): string {
  return `Lote #${index + 1}`
}

export function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [lowStock, setLowStock] = useState<InventoryResponse[]>([])

  const { sortKey, sortDir, toggleSort, sortedData: sortedInventory } = useSortableTable(inventory)

  const [adjustModal, setAdjustModal] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<InventoryBatchResponse | null>(null)
  const [selectedBatchLabel, setSelectedBatchLabel] = useState('')
  const [adjustQty, setAdjustQty] = useState(0)
  const [adjustDirection, setAdjustDirection] = useState<'add' | 'subtract'>('add')

  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const fetchAll = async () => {
    try {
      const inv = await inventoryService.getAll()
      setInventory(inv)

      try {
        const low = await inventoryService.getLowStock()
        setLowStock(low)
      } catch {
        setLowStock([])
      }
    } catch {
      toast.error('Error al cargar inventario')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const openAdjust = (batch: InventoryBatchResponse, label: string) => {
    setSelectedBatch(batch)
    setSelectedBatchLabel(label)
    setAdjustQty(0)
    setAdjustDirection('add')
    setAdjustModal(true)
  }

  const handleAdjust = async () => {
    if (adjustQty <= 0) return
    const adjustment = adjustDirection === 'add' ? adjustQty : -adjustQty
    const reason = adjustDirection === 'add' ? 'Reposición' : 'Merma'
    setSaving(true)
    try {
      await inventoryService.adjustBatch({ inventoryBatchId: selectedBatch!.id, adjustment, reason })
      toast.success('Ajuste aplicado correctamente')
      setAdjustModal(false)
      fetchAll()
    } catch {
      toast.error('Error al aplicar ajuste')
    }
    setSaving(false)
  }

  const toggleExpand = (id: number) => setExpandedId((prev) => (prev === id ? null : id))

  const handleArchive = async (batchId: number) => {
    const toastId = toast.loading('Archivando lote...')
    try {
      await inventoryService.archiveBatch(batchId)
      toast.success('Lote archivado', { id: toastId })
      fetchAll()
    } catch {
      toast.error('Error al archivar lote', { id: toastId })
    }
  }

  if (loading) {
    return (
      <div className="crud-page">
        <div className="crud-header"><h1 className="page-title">Inventario</h1></div>
        <div className="table-wrapper">
          <table className="crud-table">
            <thead><tr><th>Producto</th><th>Stock</th><th>Lotes</th><th>Acciones</th></tr></thead>
            <tbody>
              {[1, 2, 3, 4].map((i) => (
                <tr key={i} className="skeleton-row">
                  {[1, 2, 3, 4].map((j) => <td key={j}><div className="skeleton-cell" /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="crud-page">
      <div className="crud-header">
        <h1 className="page-title">Inventario</h1>
      </div>

      {lowStock.length > 0 && (
        <motion.div
          className="low-stock-banner"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AlertTriangle size={18} />
          <strong>Stock Bajo:</strong> {lowStock.length} producto(s) con stock por debajo del umbral
        </motion.div>
      )}

      <div className="table-wrapper">
        <table className="crud-table">
          <thead>
            <tr>
              <SortableTh label="Producto" sortKey="productName" activeSortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              <SortableTh label="Stock Total" sortKey="totalQuantity" activeSortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              <th>Lotes</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {sortedInventory.map((inv) => {
                const batches = sortedBatches(inv.batches)
                return (
                  <Fragment key={inv.id}>
                    <motion.tr
                      key={inv.id}
                      variants={rowVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      layout
                    >
                      <td data-label="Producto" style={{ fontWeight: 500 }}>{inv.productName}</td>
                      <td data-label="Stock Total">
                        <span className={inv.totalQuantity <= inv.threshold ? 'stock-low' : ''}>
                          {inv.totalQuantity}
                        </span>
                      </td>
                      <td data-label="Lotes">
                        <button className="btn btn-sm btn-ghost" onClick={() => toggleExpand(inv.id)}>
                          {expandedId === inv.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          {batches.length} lote{batches.length !== 1 ? 's' : ''}
                        </button>
                      </td>
                      <td data-label="" className="actions-cell">
                        {batches.slice(0, 3).map((b, idx) => (
                          <button key={b.id} className={`btn btn-sm${b.quantity === 0 ? ' btn-danger' : ''}`} onClick={() => openAdjust(b, batchLabel(idx))}>
                            <Layers size={12} />
                            {batchLabel(idx)}
                          </button>
                        ))}
                        {batches.length > 3 && (
                          <button className="btn btn-sm" onClick={() => toggleExpand(inv.id)} title="Ver más lotes">
                            +{batches.length - 3}
                          </button>
                        )}
                      </td>
                    </motion.tr>

                    <AnimatePresence>
                      {expandedId === inv.id && (
                        <motion.tr
                          key={`detail-${inv.id}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <td colSpan={4} style={{ padding: 0, background: 'var(--bg-alt)', borderBottom: '2px solid var(--border)' }}>
                            <div style={{ padding: '1rem 1.5rem' }}>
                              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)', marginBottom: '0.75rem' }}>
                                Lotes de {inv.productName}
                              </div>
                              <table className="crud-table" style={{ fontSize: '0.85rem' }}>
                                <thead>
                                  <tr>
                                    <th>Lote</th>
                                    <th>Cantidad</th>
                                    <th>Costo Unitario</th>
                                    <th>Fecha de Compra</th>
                                    <th>Acciones</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {batches.map((b, idx) => (
                                    <tr key={b.id}>
                                      <td style={{ fontWeight: 500 }}>{batchLabel(idx)}</td>
                                      <td>{b.quantity}</td>
                                      <td>${b.unitCost.toLocaleString()}</td>
                                      <td>{b.purchaseDate}</td>
                                      <td className="actions-cell">
                                        <button className="btn btn-sm" onClick={() => openAdjust(b, batchLabel(idx))}>Ajustar</button>
                                        {b.quantity === 0 && !b.archived && (
                                          <button className="btn btn-sm btn-danger" onClick={() => handleArchive(b.id)} title="Archivar lote">
                                            <Trash2 size={12} />
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                  {batches.length === 0 && (
                                    <tr><td colSpan={5} className="empty-row" style={{ padding: '1rem' }}>Sin lotes registrados</td></tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                  </Fragment>
                )
              })}
            </AnimatePresence>
            {inventory.length === 0 && (
              <tr>
                <td colSpan={4} className="empty-row">
                  <ClipboardList size={40} style={{ opacity: 0.3, marginBottom: 8 }} /><br />
                  No hay inventario registrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={adjustModal}
        title={`Ajustar ${selectedBatchLabel}`}
        onClose={() => setAdjustModal(false)}
      >
        <div className="modal-form">
          {selectedBatch && (
            <div className="batch-detail" style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border)', marginBottom: '0.5rem' }}>
              <span><strong>{selectedBatch.productName}</strong></span>
              <span>Stock actual: {selectedBatch.quantity}</span>
              <span>Costo: ${selectedBatch.unitCost.toLocaleString()}</span>
            </div>
          )}
          <div className="form-group">
            <label>Acción</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className={`btn${adjustDirection === 'add' ? ' btn-primary' : ''}`}
                style={{ flex: 1 }}
                onClick={() => setAdjustDirection('add')}
              >
                + Agregar
              </button>
              <button
                type="button"
                className={`btn${adjustDirection === 'subtract' ? ' btn-danger' : ''}`}
                style={{ flex: 1 }}
                onClick={() => setAdjustDirection('subtract')}
              >
                − Disminuir
              </button>
            </div>
          </div>
          <div className="form-group">
            <label>Cantidad</label>
            <NumberInput
              value={adjustQty}
              onChange={setAdjustQty}
              placeholder="Cantidad"
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={handleAdjust}
            disabled={saving || adjustQty <= 0}
          >
            {saving ? 'Aplicando...' : 'Aplicar Ajuste'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
