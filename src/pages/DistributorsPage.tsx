import { useEffect, useRef, useState, Fragment } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit3, Trash2, Truck, DollarSign, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { distributorsService } from '../services/distributors.service'
import { distributorPricesService } from '../services/distributor-prices.service'
import { productsService } from '../services/products.service'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { NumberInput } from '../components/NumberInput'
import { SortableTh } from '../components/SortableTh'
import { useSortableTable } from '../hooks/useSortableTable'
import type {
  DistributorResponse,
  DistributorCreateRequest,
  DistributorUpdateRequest,
  DistributorPriceResponse,
  DistributorPriceCreateRequest,
  ProductResponse,
} from '../types'
import './CrudPage.css'

const rowVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0 },
}

const emptyDistributorForm: DistributorCreateRequest = { name: '', contact: '' }
const emptyPriceForm: DistributorPriceCreateRequest = { productId: 0, distributorId: 0, price: 0 }

export function DistributorsPage() {
  // ── Distributors ─────────────────────────────────────────────────────────
  const [distributors, setDistributors] = useState<DistributorResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [filterName, setFilterName] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<DistributorResponse | null>(null)
  const [form, setForm] = useState<DistributorCreateRequest>(emptyDistributorForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DistributorResponse | null>(null)

  // ── Prices panel ─────────────────────────────────────────────────────────
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [prices, setPrices] = useState<Record<number, DistributorPriceResponse[]>>({})
  const [loadingPrices, setLoadingPrices] = useState<number | null>(null)
  const [products, setProducts] = useState<ProductResponse[]>([])

  const [priceModalOpen, setPriceModalOpen] = useState(false)
  const [editingPrice, setEditingPrice] = useState<DistributorPriceResponse | null>(null)
  const [priceForm, setPriceForm] = useState<DistributorPriceCreateRequest>(emptyPriceForm)
  const [savingPrice, setSavingPrice] = useState(false)
  const [deletePriceTarget, setDeletePriceTarget] = useState<DistributorPriceResponse | null>(null)

  const { sortKey, sortDir, toggleSort, sortedData: sortedDistributors } = useSortableTable(distributors)

  // ── Load distributors ─────────────────────────────────────────────────────
  useEffect(() => {
    distributorsService.getAll()
      .then(setDistributors)
      .catch(() => toast.error('Error al cargar distribuidores'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    productsService.getAll()
      .then(setProducts)
      .catch(() => toast.error('Error al cargar productos'))
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      distributorsService.getAll({ name: filterName || undefined })
        .then(setDistributors)
        .catch(() => toast.error('Error al cargar distribuidores'))
    }, filterName ? 300 : 0)
    return () => clearTimeout(debounceRef.current)
  }, [filterName])

  // ── Toggle prices panel ───────────────────────────────────────────────────
  const togglePrices = async (distributorId: number) => {
    if (expandedId === distributorId) {
      setExpandedId(null)
      return
    }
    setExpandedId(distributorId)
    if (prices[distributorId]) return // ya cargados, no volver a pedir

    setLoadingPrices(distributorId)
    try {
      const data = await distributorPricesService.getAll({ distributorId })
      setPrices((prev) => ({ ...prev, [distributorId]: data }))
    } catch {
      toast.error('Error al cargar precios')
    } finally {
      setLoadingPrices(null)
    }
  }

  // ── Distributor CRUD ──────────────────────────────────────────────────────
  const openCreate = () => {
    setEditing(null)
    setForm(emptyDistributorForm)
    setModalOpen(true)
  }

  const openEdit = (d: DistributorResponse) => {
    setEditing(d)
    setForm({ name: d.name, contact: d.contact || '' })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('El nombre es requerido'); return }
    setSaving(true)
    const toastId = toast.loading(editing ? 'Actualizando...' : 'Creando...')
    try {
      if (editing) {
        const updated = await distributorsService.update(editing.id, form as DistributorUpdateRequest)
        setDistributors((prev) => prev.map((d) => (d.id === editing.id ? updated : d)))
        toast.success('Distribuidor actualizado', { id: toastId })
      } else {
        const created = await distributorsService.create(form)
        setDistributors((prev) => [created, ...prev])
        toast.success('Distribuidor creado', { id: toastId })
      }
      setModalOpen(false)
    } catch {
      toast.error('Error al guardar distribuidor', { id: toastId })
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const toastId = toast.loading('Eliminando...')
    try {
      await distributorsService.delete(deleteTarget.id)
      setDistributors((prev) => prev.filter((d) => d.id !== deleteTarget.id))
      // Limpiar precios del distribuidor eliminado del cache local
      setPrices((prev) => { const next = { ...prev }; delete next[deleteTarget.id]; return next })
      toast.success('Distribuidor eliminado', { id: toastId })
    } catch {
      toast.error('No se puede eliminar: tiene compras asociadas', { id: toastId })
    }
    setDeleteTarget(null)
  }

  // ── Price CRUD ────────────────────────────────────────────────────────────
  const openCreatePrice = (distributorId: number) => {
    setEditingPrice(null)
    setPriceForm({ ...emptyPriceForm, distributorId })
    setPriceModalOpen(true)
  }

  const openEditPrice = (price: DistributorPriceResponse, distributorId: number) => {
    setEditingPrice(price)
    // Al editar solo se permite cambiar el precio; producto y distribuidor quedan fijos
    setPriceForm({ productId: 0, distributorId, price: price.price })
    setPriceModalOpen(true)
  }

  const handleSavePrice = async () => {
    if (!editingPrice && priceForm.productId === 0) {
      toast.error('Selecciona un producto'); return
    }
    if (priceForm.price <= 0) { toast.error('El precio debe ser mayor a 0'); return }

    setSavingPrice(true)
    const toastId = toast.loading(editingPrice ? 'Actualizando precio...' : 'Registrando precio...')
    const distributorId = priceForm.distributorId

    try {
      if (editingPrice) {
        // Crea un registro nuevo con el precio actualizado (histórico — acordado en el diseño)
        const updated = await distributorPricesService.update(editingPrice.id, { price: priceForm.price })
        setPrices((prev) => ({
          ...prev,
          [distributorId]: (prev[distributorId] ?? []).map((p) =>
            p.id === editingPrice.id ? updated : p
          ),
        }))
        toast.success('Precio actualizado', { id: toastId })
      } else {
        const created = await distributorPricesService.create(priceForm)
        setPrices((prev) => ({
          ...prev,
          [distributorId]: [created, ...(prev[distributorId] ?? [])],
        }))
        toast.success('Precio registrado', { id: toastId })
      }
      setPriceModalOpen(false)
    } catch {
      toast.error('Error al guardar precio', { id: toastId })
    }
    setSavingPrice(false)
  }

  const handleDeletePrice = async () => {
    if (!deletePriceTarget) return
    const distributorId = expandedId!
    const toastId = toast.loading('Eliminando precio...')
    try {
      await distributorPricesService.delete(deletePriceTarget.id)
      setPrices((prev) => ({
        ...prev,
        [distributorId]: (prev[distributorId] ?? []).filter((p) => p.id !== deletePriceTarget.id),
      }))
      toast.success('Precio eliminado', { id: toastId })
    } catch {
      toast.error('Error al eliminar precio', { id: toastId })
    }
    setDeletePriceTarget(null)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="crud-page">
        <div className="crud-header"><h1 className="page-title">Distribuidores</h1></div>
        <div className="table-wrapper">
          <table className="crud-table">
            <thead><tr><th>ID</th><th>Nombre</th><th>Contacto</th><th>Acciones</th></tr></thead>
            <tbody>{[1, 2, 3].map((i) => (
              <tr key={i} className="skeleton-row"><td colSpan={4}><div className="skeleton-cell" /></td></tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="crud-page">
      <div className="crud-header">
        <h1 className="page-title">Distribuidores</h1>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={18} /> Nuevo Distribuidor
        </button>
      </div>

      <div className="filter-bar">
        <div className="form-group">
          <label>Nombre</label>
          <input
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            placeholder="Buscar por nombre"
          />
        </div>
      </div>

      <div className="table-wrapper">
        <table className="crud-table">
          <thead>
            <tr><SortableTh label="ID" sortKey="id" activeSortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} /><SortableTh label="Nombre" sortKey="name" activeSortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} /><SortableTh label="Contacto" sortKey="contact" activeSortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} /><th>Acciones</th></tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {sortedDistributors.map((d) => (
                <Fragment key={d.id}>
                  {/* Fila del distribuidor */}
                  <motion.tr
                    key={d.id}
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    layout
                  >
                    <td data-label="ID">{d.id}</td>
                    <td data-label="Nombre" style={{ fontWeight: 500 }}>{d.name}</td>
                    <td data-label="Contacto">{d.contact || '—'}</td>
                    <td data-label="" className="actions-cell">
                      {/* Botón para expandir precios */}
                      <button
                        className="btn btn-sm"
                        onClick={() => togglePrices(d.id)}
                        title="Ver precios por producto"
                        style={{ color: expandedId === d.id ? 'var(--primary)' : undefined }}
                      >
                        <DollarSign size={14} />
                        {expandedId === d.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                      <button className="btn btn-sm" onClick={() => openEdit(d)} title="Editar">
                        <Edit3 size={14} />
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => setDeleteTarget(d)} title="Eliminar">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </motion.tr>

                  {/* Panel de precios expandible */}
                  <AnimatePresence>
                    {expandedId === d.id && (
                      <motion.tr
                        key={`prices-${d.id}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <td colSpan={4} style={{ padding: 0, background: 'var(--bg-alt)', borderBottom: '2px solid var(--border)' }}>
                          <div style={{ padding: '1rem 1.5rem' }}>

                            {/* Header del panel */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>
                                Precios de {d.name}
                              </span>
                              <button className="btn btn-sm btn-primary" onClick={() => openCreatePrice(d.id)}>
                                <Plus size={13} /> Agregar precio
                              </button>
                            </div>

                            {/* Tabla de precios */}
                            {loadingPrices === d.id ? (
                              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Cargando precios...</p>
                            ) : (
                              <table className="crud-table" style={{ fontSize: '0.85rem' }}>
                                <thead>
                                  <tr>
                                    <th>Producto</th>
                                    <th>Precio</th>
                                    <th>Fecha</th>
                                    <th>Acciones</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(prices[d.id] ?? []).map((p) => (
                                    <tr key={p.id}>
                                      <td style={{ fontWeight: 500 }}>{p.productName}</td>
                                      <td>${p.price.toLocaleString('es-CO')}</td>
                                      <td>{p.date}</td>
                                      <td className="actions-cell">
                                        <button
                                          className="btn btn-sm"
                                          onClick={() => openEditPrice(p, d.id)}
                                          title="Actualizar precio"
                                        >
                                          <Edit3 size={13} />
                                        </button>
                                        <button
                                          className="btn btn-sm btn-danger"
                                          onClick={() => setDeletePriceTarget(p)}
                                          title="Eliminar precio"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                  {(prices[d.id] ?? []).length === 0 && (
                                    <tr>
                                      <td colSpan={4} className="empty-row" style={{ padding: '1rem' }}>
                                        Este distribuidor no tiene precios registrados
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </Fragment>
              ))}
            </AnimatePresence>

            {distributors.length === 0 && (
              <tr>
                <td colSpan={4} className="empty-row">
                  <Truck size={40} style={{ opacity: 0.3, marginBottom: 8 }} /><br />
                  No hay distribuidores registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: crear/editar distribuidor */}
      <Modal
        open={modalOpen}
        title={editing ? 'Editar Distribuidor' : 'Nuevo Distribuidor'}
        onClose={() => setModalOpen(false)}
      >
        <div className="modal-form">
          <div className="form-group">
            <label>Nombre</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nombre del distribuidor"
            />
          </div>
          <div className="form-group">
            <label>Contacto (email)</label>
            <input
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
              placeholder="Opcional"
            />
          </div>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : editing ? 'Guardar Cambios' : 'Crear Distribuidor'}
          </button>
        </div>
      </Modal>

      {/* Modal: agregar/editar precio */}
      <Modal
        open={priceModalOpen}
        title={editingPrice ? 'Actualizar Precio' : 'Agregar Precio'}
        onClose={() => setPriceModalOpen(false)}
      >
        <div className="modal-form">
          {!editingPrice && (
            <div className="form-group">
              <label>Producto</label>
              <select
                value={priceForm.productId}
                onChange={(e) => setPriceForm({ ...priceForm, productId: Number(e.target.value) })}
              >
                <option value={0} disabled>Selecciona un producto</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {editingPrice && (
            <div className="form-group">
              <label>Producto</label>
              {/* Solo lectura al editar: el producto no cambia, se crea un registro nuevo */}
              <input value={editingPrice.productName} disabled style={{ opacity: 0.6 }} />
            </div>
          )}

          <div className="form-group">
            <label>Precio</label>
            <NumberInput
              value={priceForm.price}
              onChange={(v) => setPriceForm({ ...priceForm, price: v })}
              prefix="$"
              min={0}
            />
          </div>

          {editingPrice && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Se creará un nuevo registro con el precio actualizado (el historial anterior se conserva).
            </p>
          )}

          <button className="btn btn-primary" onClick={handleSavePrice} disabled={savingPrice}>
            {savingPrice ? 'Guardando...' : editingPrice ? 'Actualizar Precio' : 'Registrar Precio'}
          </button>
        </div>
      </Modal>

      {/* Confirm: eliminar distribuidor */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar Distribuidor"
        message={`¿Estás seguro de eliminar "${deleteTarget?.name}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Confirm: eliminar precio */}
      <ConfirmDialog
        open={!!deletePriceTarget}
        title="Eliminar Precio"
        message={`¿Eliminar el precio de "${deletePriceTarget?.productName}"?`}
        onConfirm={handleDeletePrice}
        onCancel={() => setDeletePriceTarget(null)}
      />
    </div>
  )
}