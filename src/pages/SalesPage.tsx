import { useEffect, useRef, useState, Fragment } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, DollarSign, X, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { salesService } from '../services/sales.service'
import { inventoryService } from '../services/inventory.service'
import { Modal } from '../components/Modal'
import { NumberInput } from '../components/NumberInput'
import { SearchableSelect } from '../components/SearchableSelect'
import { SortableTh } from '../components/SortableTh'
import { useSortableTable } from '../hooks/useSortableTable'
import { DatePickerField } from '../components/DatePickerField'
import type { SaleResponse, SaleCreateRequest, SaleItemRequest, InventoryBatchResponse } from '../types'
import './CrudPage.css'

const rowVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0 },
}

function todayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const emptyForm: SaleCreateRequest = {
  clientName: '',
  saleDate: todayLocal(),
  description: '',
  items: [{ inventoryBatchId: 0, quantity: 1, price: 0 }],
}

export function SalesPage() {
  const [sales, setSales] = useState<SaleResponse[]>([])
  const [loading, setLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<SaleCreateRequest>(emptyForm)
  const [total, setTotal] = useState(0)
  const [saving, setSaving] = useState(false)
  const [availableBatches, setAvailableBatches] = useState<InventoryBatchResponse[]>([])
  const [batchLabels, setBatchLabels] = useState<Record<number, string>>({})

  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [priceModes, setPriceModes] = useState<Record<number, 'unit' | 'total'>>({})
  const [itemTotals, setItemTotals] = useState<Record<number, number>>({})
  const [paymentType, setPaymentType] = useState<'full' | 'credit'>('full')
  const [downPaymentAmount, setDownPaymentAmount] = useState(0)

  const { sortKey, sortDir, toggleSort, sortedData: sortedSales } = useSortableTable(sales)

  const [filterClient, setFilterClient] = useState('')
  const [filterProduct, setFilterProduct] = useState('')
  const [filterDesde, setFilterDesde] = useState('')
  const [filterHasta, setFilterHasta] = useState('')

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const fetchSales = (client?: string, product?: string, desde?: string, hasta?: string) => {
    const params: { clientName?: string; productName?: string; desde?: string; hasta?: string } = {}
    if (client) params.clientName = client
    if (product) params.productName = product
    if (desde) params.desde = desde
    if (hasta) params.hasta = hasta
    salesService.getAll(params).then(setSales).catch(() => toast.error('Error al cargar ventas'))
  }

  useEffect(() => {
    salesService.getAll()
      .then(setSales)
      .catch(() => toast.error('Error al cargar ventas'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchSales(filterClient, filterProduct, filterDesde, filterHasta)
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [filterClient, filterProduct, filterDesde, filterHasta])

  useEffect(() => {
    setTotal(form.items.reduce((acc, item) => acc + item.quantity * item.price, 0))
  }, [form.items])

  useEffect(() => {
    inventoryService.getAll().then((inv) => {
      const labels: Record<number, string> = {}
      const all: InventoryBatchResponse[] = []
      for (const item of inv) {
        const sorted = [...item.batches].sort((a, b) => a.id - b.id)
        sorted.forEach((b, idx) => {
          labels[b.id] = `Lote #${idx + 1}`
          if (b.quantity > 0) all.push(b)
        })
      }
      setBatchLabels(labels)
      setAvailableBatches(all)
    }).catch(() => toast.error('Error al cargar lotes'))
  }, [])

  const openCreate = () => {
    setForm(emptyForm)
    setPriceModes({})
    setItemTotals({})
    setPaymentType('full')
    setDownPaymentAmount(0)
    setModalOpen(true)
  }

  const toggleExpand = (id: number) => setExpandedId((prev) => (prev === id ? null : id))

  const addItem = () => setForm((prev) => ({ ...prev, items: [...prev.items, { inventoryBatchId: 0, quantity: 1, price: 0 }] }))

  const removeItem = (idx: number) => {
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }))
    setPriceModes((prev) => {
      const next: Record<number, 'unit' | 'total'> = {}
      Object.entries(prev).forEach(([k, v]) => {
        const i = Number(k)
        if (i < idx) next[i] = v
        else if (i > idx) next[i - 1] = v
      })
      return next
    })
    setItemTotals((prev) => {
      const next: Record<number, number> = {}
      Object.entries(prev).forEach(([k, v]) => {
        const i = Number(k)
        if (i < idx) next[i] = v
        else if (i > idx) next[i - 1] = v
      })
      return next
    })
  }

  const togglePriceMode = (idx: number) => {
    const currentMode = priceModes[idx] ?? 'unit'
    if (currentMode === 'unit') {
      const item = form.items[idx]
      const total = item.quantity * item.price
      setItemTotals((prev) => ({ ...prev, [idx]: total }))
      setPriceModes((prev) => ({ ...prev, [idx]: 'total' }))
    } else {
      setPriceModes((prev) => ({ ...prev, [idx]: 'unit' }))
    }
  }

  const handleQuantityChange = (idx: number, value: number) => {
    const mode = priceModes[idx] ?? 'unit'
    if (mode === 'total') {
      const currentTotal = itemTotals[idx] ?? 0
      const newPrice = value > 0 ? Math.round((currentTotal / value) * 100) / 100 : 0
      setForm((prev) => ({
        ...prev,
        items: prev.items.map((item, i) => i === idx ? { ...item, quantity: value, price: newPrice } : item),
      }))
    } else {
      setForm((prev) => ({
        ...prev,
        items: prev.items.map((item, i) => i === idx ? { ...item, quantity: value } : item),
      }))
    }
  }

  const handlePriceChange = (idx: number, value: number) => {
    const mode = priceModes[idx] ?? 'unit'
    if (mode === 'unit') {
      setForm((prev) => ({
        ...prev,
        items: prev.items.map((item, i) => i === idx ? { ...item, price: value } : item),
      }))
      setItemTotals((prev) => ({ ...prev, [idx]: value * form.items[idx].quantity }))
    } else {
      setItemTotals((prev) => ({ ...prev, [idx]: value }))
      const qty = form.items[idx].quantity
      const newPrice = qty > 0 ? Math.round((value / qty) * 100) / 100 : 0
      setForm((prev) => ({
        ...prev,
        items: prev.items.map((item, i) => i === idx ? { ...item, price: newPrice } : item),
      }))
    }
  }

  const updateItem = (idx: number, field: keyof SaleItemRequest, value: number) =>
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i !== idx) return item
        const updated = { ...item, [field]: value }
        if (field === 'inventoryBatchId') {
          const batch = availableBatches.find((b) => b.id === value)
          if (batch) {
            updated.price = batch.sellingPrice
            const mode = priceModes[idx] ?? 'unit'
            if (mode === 'total') {
              setItemTotals((prev) => ({ ...prev, [idx]: batch.sellingPrice * item.quantity }))
            }
          }
        }
        return updated
      }),
    }))

  const handleSave = async () => {
    if (form.items.some((i) => !i.inventoryBatchId)) { toast.error('Selecciona un lote para cada item'); return }
    if (paymentType === 'credit' && downPaymentAmount >= total) { toast.error('El abono debe ser menor al total'); return }
    setSaving(true)
    const toastId = toast.loading('Registrando venta...')
    try {
      const payload = paymentType === 'credit'
        ? { ...form, downPayment: downPaymentAmount }
        : form
      const created = await salesService.create(payload)
      setSales((prev) => [created, ...prev])
      toast.success(paymentType === 'credit' ? 'Venta a crédito registrada' : 'Venta registrada', { id: toastId })
      setModalOpen(false)
    } catch {
      toast.error('Error al registrar venta', { id: toastId })
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="crud-page">
        <div className="crud-header"><h1 className="page-title">Ventas</h1></div>
        <div className="table-wrapper">
          <table className="crud-table">
            <thead><tr><th>Cliente</th><th>Fecha</th><th>Items</th><th>Total</th></tr></thead>
            <tbody>{[1, 2, 3].map((i) => <tr key={i} className="skeleton-row"><td colSpan={4}><div className="skeleton-cell" /></td></tr>)}</tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="crud-page">
      <div className="crud-header">
        <h1 className="page-title">Ventas</h1>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={18} /> Nueva Venta
        </button>
      </div>

      <div className="filter-bar">
        <div className="form-group">
          <label>Cliente</label>
          <input value={filterClient} onChange={(e) => setFilterClient(e.target.value)} placeholder="Nombre del cliente" />
        </div>
        <div className="form-group">
          <label>Producto</label>
          <input value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)} placeholder="Buscar producto" />
        </div>
        <div className="form-group">
          <label>Desde</label>
          <DatePickerField value={filterDesde} onChange={setFilterDesde} />
        </div>
        <div className="form-group">
          <label>Hasta</label>
          <DatePickerField value={filterHasta} onChange={setFilterHasta} />
        </div>
      </div>

      <div className="table-wrapper">
        <table className="crud-table">
          <thead><tr>
            <SortableTh label="Cliente" sortKey="clientName" activeSortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
            <SortableTh label="Fecha" sortKey="saleDate" activeSortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
            <SortableTh label="Descripción" sortKey="description" activeSortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
            <th>Items</th>
            <SortableTh label="Total" sortKey="total" activeSortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
          </tr></thead>
          <tbody>
            <AnimatePresence>
              {sortedSales.map((s) => (
                <Fragment key={s.id}>
                  <motion.tr key={s.id} variants={rowVariants} initial="hidden" animate="visible" exit="hidden" layout>
                    <td data-label="Cliente" style={{ fontWeight: 500 }}>{s.clientName}</td>
                    <td data-label="Fecha">{s.saleDate}</td>
                    <td data-label="Descripción">{s.description || '—'}</td>
                    <td data-label="Items">
                      <button className="btn btn-sm btn-ghost" onClick={() => toggleExpand(s.id)}>
                        {expandedId === s.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {s.items.length} producto{s.items.length !== 1 ? 's' : ''}
                      </button>
                    </td>
                    <td data-label="Total" style={{ fontWeight: 600 }}>${s.total.toLocaleString()}</td>
                  </motion.tr>

                  <AnimatePresence>
                    {expandedId === s.id && (
                      <motion.tr
                        key={`detail-${s.id}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <td colSpan={5} style={{ padding: 0, background: 'var(--bg-alt)', borderBottom: '2px solid var(--border)' }}>
                          <div style={{ padding: '1rem 1.5rem' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)', marginBottom: '0.75rem' }}>
                              Productos de la venta #{s.id}
                            </div>
                            <table className="crud-table" style={{ fontSize: '0.85rem' }}>
                              <thead>
                                <tr>
                                  <th>Producto</th>
                                  <th>Cantidad</th>
                                  <th>Precio Unit.</th>
                                  <th>Subtotal</th>
                                </tr>
                              </thead>
                              <tbody>
                                {s.items.map((item) => (
                                  <tr key={item.id}>
                                    <td style={{ fontWeight: 500 }}>{item.productName}</td>
                                    <td>{item.quantity}</td>
                                    <td>${item.price.toLocaleString()}</td>
                                    <td>${item.total.toLocaleString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </Fragment>
              ))}
            </AnimatePresence>
            {sales.length === 0 && <tr><td colSpan={5} className="empty-row"><DollarSign size={40} style={{ opacity: 0.3, marginBottom: 8 }} /><br />No hay ventas registradas</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} title="Nueva Venta" onClose={() => setModalOpen(false)}>
        <div className="modal-form">
          <div className="form-group">
            <label>Cliente</label>
            <input value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} placeholder="Nombre del cliente" />
          </div>
          <div className="form-group">
            <label>Fecha</label>
            <DatePickerField value={form.saleDate} onChange={(v) => setForm({ ...form, saleDate: v })} />
          </div>

          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Productos (lotes disponibles)</label>
          {form.items.map((item, idx) => {
            const mode = priceModes[idx] ?? 'unit'
            return (
              <div key={idx} className="item-row">
                <SearchableSelect
                  options={availableBatches.map((b) => ({
                    value: b.id,
                    label: `${batchLabels[b.id] ?? `Lote #${b.id}`} (Stock: ${b.quantity})`,
                    group: b.productName,
                  }))}
                  value={item.inventoryBatchId}
                  onChange={(v) => updateItem(idx, 'inventoryBatchId', v)}
                  placeholder="Seleccione lote"
                />
                <NumberInput placeholder="Cant" value={item.quantity} min={1} onChange={(v) => handleQuantityChange(idx, v)} />
                {mode === 'unit' ? (
                  <NumberInput step="0.01" placeholder="Precio" value={item.price} onChange={(v) => handlePriceChange(idx, v)} />
                ) : (
                  <NumberInput step="0.01" placeholder="Total" value={itemTotals[idx] ?? 0} onChange={(v) => handlePriceChange(idx, v)} />
                )}
                <div className="price-mode-toggle">
                  <button type="button" className={`price-mode-btn${mode === 'unit' ? ' active' : ''}`} onClick={() => { if (mode !== 'unit') togglePriceMode(idx) }}>Unit</button>
                  <button type="button" className={`price-mode-btn${mode === 'total' ? ' active' : ''}`} onClick={() => { if (mode !== 'total') togglePriceMode(idx) }}>Total</button>
                </div>
                <span>
                  {mode === 'unit'
                    ? `$${(item.quantity * item.price).toLocaleString()}`
                    : `P.U.: $${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </span>
                {form.items.length > 1 && (
                  <button className="btn btn-sm btn-ghost" onClick={() => removeItem(idx)}><X size={14} /></button>
                )}
              </div>
            )
          })}
          <button className="btn btn-sm add-item-btn" onClick={addItem}>+ Agregar Producto</button>

          <div className="form-group">
            <label>Descripción</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Opcional" />
          </div>

          <div className="form-group">
            <label>Tipo de Pago</label>
            <div className="price-mode-toggle" style={{ width: 'fit-content' }}>
              <button type="button" className={`price-mode-btn${paymentType === 'full' ? ' active' : ''}`} onClick={() => { setPaymentType('full'); setDownPaymentAmount(0) }}>Pago Completo</button>
              <button type="button" className={`price-mode-btn${paymentType === 'credit' ? ' active' : ''}`} onClick={() => { setPaymentType('credit'); setDownPaymentAmount(0) }}>A Crédito</button>
            </div>
          </div>

          {paymentType === 'credit' && (
            <div className="form-group">
              <label>Abonado</label>
              <NumberInput step="0.01" placeholder="Monto abonado" value={downPaymentAmount} min={0} onChange={setDownPaymentAmount} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Restante: ${Math.max(0, total - downPaymentAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          <div className="total-row">Total: ${total.toLocaleString()}</div>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Registrando...' : 'Registrar Venta'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
