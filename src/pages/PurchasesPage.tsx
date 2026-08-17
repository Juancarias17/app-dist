import { useEffect, useRef, useState, Fragment } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, ShoppingCart, X, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { purchasesService } from '../services/purchases.service'
import { distributorsService } from '../services/distributors.service'
import { productsService } from '../services/products.service'
import { Modal } from '../components/Modal'
import { NumberInput } from '../components/NumberInput'
import { SearchableSelect } from '../components/SearchableSelect'
import { SortableTh } from '../components/SortableTh'
import { useSortableTable } from '../hooks/useSortableTable'
import { DatePickerField } from '../components/DatePickerField'
import type {
  PurchaseResponse,
  PurchaseCreateRequest,
  DistributorResponse,
  ProductResponse,
  DistributorPriceResponse,
} from '../types'
import './CrudPage.css'

const rowVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0 },
}

function todayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const emptyForm: PurchaseCreateRequest = {
  distributorId: 0,
  purchaseDate: todayLocal(),
  description: '',
  items: [{ productId: 0, quantity: 1, price: 0 }],
}

export function PurchasesPage() {
  const [purchases, setPurchases] = useState<PurchaseResponse[]>([])
  const [distributors, setDistributors] = useState<DistributorResponse[]>([])
  const [products, setProducts] = useState<ProductResponse[]>([])
  const [loading, setLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<PurchaseCreateRequest>(emptyForm)
  const [total, setTotal] = useState(0)
  const [saving, setSaving] = useState(false)

  const [filterDistributor, setFilterDistributor] = useState<number | undefined>()
  const [filterProduct, setFilterProduct] = useState('')
  const [filterDesde, setFilterDesde] = useState('')
  const [filterHasta, setFilterHasta] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const [expandedId, setExpandedId] = useState<number | null>(null)

  const [productPrices, setProductPrices] = useState<Record<number, DistributorPriceResponse[]>>({})
  const [priceModes, setPriceModes] = useState<Record<number, 'unit' | 'total'>>({})
  const [itemTotals, setItemTotals] = useState<Record<number, number>>({})

  const { sortKey, sortDir, toggleSort, sortedData: sortedPurchases } = useSortableTable(purchases)

  const fetchPurchases = (distributorId?: number, product?: string, desde?: string, hasta?: string) => {
    const params: { distributorId?: number; productName?: string; desde?: string; hasta?: string } = {}
    if (distributorId) params.distributorId = distributorId
    if (product) params.productName = product
    if (desde) params.desde = desde
    if (hasta) params.hasta = hasta
    purchasesService.getAll(params).then(setPurchases).catch(() => toast.error('Error al cargar compras'))
  }

  useEffect(() => {
    Promise.all([purchasesService.getAll(), distributorsService.getAll(), productsService.getAll()])
      .then(([p, d, pr]) => { setPurchases(p); setDistributors(d); setProducts(pr) })
      .catch(() => toast.error('Error al cargar datos'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchPurchases(filterDistributor, filterProduct, filterDesde, filterHasta)
    }, filterProduct ? 300 : 0)
    return () => clearTimeout(debounceRef.current)
  }, [filterDistributor, filterProduct, filterDesde, filterHasta])

  useEffect(() => {
    setTotal(form.items.reduce((acc, item) => acc + item.quantity * item.price, 0))
  }, [form.items])

  useEffect(() => {
    form.items.forEach((item) => {
      if (item.productId && !productPrices[item.productId]) {
        productsService.comparePrices(item.productId)
          .then((prices) => setProductPrices((prev) => ({ ...prev, [item.productId]: prices })))
          .catch(() => {})
      }
    })
  }, [form.items, productPrices])

  const openCreate = () => {
    setForm({ ...emptyForm, distributorId: distributors[0]?.id ?? 0 })
    setPriceModes({})
    setItemTotals({})
    setModalOpen(true)
  }

  const toggleExpand = (id: number) => setExpandedId((prev) => (prev === id ? null : id))

  const addItem = () => setForm((prev) => ({ ...prev, items: [...prev.items, { productId: 0, quantity: 1, price: 0 }] }))

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

  const handleSave = async () => {
    if (form.items.some((i) => !i.productId)) { toast.error('Selecciona un producto para cada item'); return }
    setSaving(true)
    const toastId = toast.loading('Registrando compra...')
    try {
      const created = await purchasesService.create(form)
      setPurchases((prev) => [created, ...prev])
      toast.success('Compra registrada', { id: toastId })
      setModalOpen(false)
    } catch {
      toast.error('Error al registrar compra', { id: toastId })
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="crud-page">
        <div className="crud-header"><h1 className="page-title">Compras</h1></div>
        <div className="table-wrapper">
          <table className="crud-table">
            <thead><tr><th>Distribuidor</th><th>Fecha</th><th>Items</th><th>Total</th></tr></thead>
            <tbody>{[1, 2, 3].map((i) => <tr key={i} className="skeleton-row"><td colSpan={4}><div className="skeleton-cell" /></td></tr>)}</tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="crud-page">
      <div className="crud-header">
        <h1 className="page-title">Compras</h1>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={18} /> Nueva Compra
        </button>
      </div>

      <div className="filter-bar">
        <div className="form-group">
          <label>Distribuidor</label>
          <select value={filterDistributor ?? ''} onChange={(e) => setFilterDistributor(e.target.value ? Number(e.target.value) : undefined)}>
            <option value="">Todos</option>
            {distributors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
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
          <thead>
            <tr>
              <SortableTh label="Distribuidor" sortKey="distributorName" activeSortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              <SortableTh label="Fecha" sortKey="purchaseDate" activeSortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              <SortableTh label="Descripción" sortKey="description" activeSortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              <th>Items</th>
              <SortableTh label="Total" sortKey="total" activeSortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {sortedPurchases.map((p) => (
                <Fragment key={p.id}>
                  <motion.tr key={p.id} variants={rowVariants} initial="hidden" animate="visible" exit="hidden" layout>
                    <td data-label="Distribuidor" style={{ fontWeight: 500 }}>{p.distributorName}</td>
                    <td data-label="Fecha">{p.purchaseDate}</td>
                    <td data-label="Descripción">{p.description || '—'}</td>
                    <td data-label="Items">
                      <button className="btn btn-sm btn-ghost" onClick={() => toggleExpand(p.id)}>
                        {expandedId === p.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {p.items.length} producto{p.items.length !== 1 ? 's' : ''}
                      </button>
                    </td>
                    <td data-label="Total" style={{ fontWeight: 600 }}>${p.total.toLocaleString()}</td>
                  </motion.tr>

                  <AnimatePresence>
                    {expandedId === p.id && (
                      <motion.tr
                        key={`detail-${p.id}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <td colSpan={5} style={{ padding: 0, background: 'var(--bg-alt)', borderBottom: '2px solid var(--border)' }}>
                          <div style={{ padding: '1rem 1.5rem' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)', marginBottom: '0.75rem' }}>
                              Productos de la compra #{p.id}
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
                                {p.items.map((item) => (
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
            {purchases.length === 0 && <tr><td colSpan={5} className="empty-row"><ShoppingCart size={40} style={{ opacity: 0.3, marginBottom: 8 }} /><br />No hay compras registradas</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} title="Nueva Compra" onClose={() => setModalOpen(false)}>
        <div className="modal-form">
          <div className="form-group">
            <label>Distribuidor</label>
            <select value={form.distributorId} onChange={(e) => setForm({ ...form, distributorId: Number(e.target.value) })}>
              <option value={0}>Seleccione</option>
              {distributors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Fecha</label>
            <DatePickerField value={form.purchaseDate} onChange={(v) => setForm({ ...form, purchaseDate: v })} />
          </div>

          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Productos</label>
          {form.items.map((item, idx) => {
            const prices = productPrices[item.productId] ?? []
            const bestPrice = prices.length > 0 ? Math.min(...prices.map((p) => p.price)) : null
            const selectedDistributorName = distributors.find((d) => d.id === form.distributorId)?.name
            const mode = priceModes[idx] ?? 'unit'
            return (
              <div key={idx} className="item-group">
                <div className="item-row">
                  <SearchableSelect
                    options={products.map((pr) => ({ value: pr.id, label: pr.name, group: pr.areaName }))}
                    value={item.productId}
                    onChange={(v) => {
                      setForm((prev) => ({ ...prev, items: prev.items.map((it, i) => i === idx ? { ...it, productId: v } : it) }))
                    }}
                    placeholder="Seleccione producto"
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
                {prices.length > 0 && (
                  <div className="price-options">
                    {prices.map((p) => (
                      <button
                        key={p.id}
                        className={`price-chip${p.price === bestPrice ? ' recommended' : ''}${p.distributorName === selectedDistributorName ? ' selected' : ''}`}
                        onClick={() => {
                          const dist = distributors.find((d) => d.name === p.distributorName)
                          if (dist) setForm((prev) => ({ ...prev, distributorId: dist.id }))
                          handlePriceChange(idx, p.price)
                        }}
                        type="button"
                      >
                        {p.distributorName}: ${p.price.toLocaleString()}
                        {p.price === bestPrice && <span className="badge">Mejor precio</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          <button className="btn btn-sm add-item-btn" onClick={addItem}>+ Agregar Producto</button>

          <div className="form-group">
            <label>Descripción</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Opcional" />
          </div>

          <div className="total-row">Total: ${total.toLocaleString()}</div>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Registrando...' : 'Registrar Compra'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
