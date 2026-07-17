import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit3, Trash2, DollarSign, RefreshCw, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { productsService } from '../services/products.service'
import { areasService } from '../services/areas.service'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { NumberInput } from '../components/NumberInput'
import { SortableTh } from '../components/SortableTh'
import { useSortableTable } from '../hooks/useSortableTable'
import type {
  ProductResponse,
  ProductCreateRequest,
  ProductUpdateRequest,
  AreaResponse,
  DistributorPriceResponse,
} from '../types'
import './CrudPage.css'

const rowVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0 },
}

const emptyState = { areaId: 0, name: '', sellingPrice: 0, iva: false, threshold: 5 }

export function ProductsPage() {
  const [products, setProducts] = useState<ProductResponse[]>([])
  const [areas, setAreas] = useState<AreaResponse[]>([])
  const [loading, setLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ProductResponse | null>(null)
  const [form, setForm] = useState<ProductCreateRequest>(emptyState)

  const [pricesModal, setPricesModal] = useState(false)
  const [prices, setPrices] = useState<DistributorPriceResponse[]>([])
  const [pricesTitle, setPricesTitle] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<ProductResponse | null>(null)
  const [recalculating, setRecalculating] = useState<number | null>(null)

  const { sortKey, sortDir, toggleSort, sortedData: sortedProducts } = useSortableTable(products)

  const [filterArea, setFilterArea] = useState<number | undefined>()
  const [filterName, setFilterName] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    areasService.getAll()
      .then(setAreas)
      .catch(() => toast.error('Error al cargar áreas'))
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      productsService.getAll({ areaId: filterArea, name: filterName || undefined })
        .then(setProducts)
        .catch(() => toast.error('Error al cargar productos'))
        .finally(() => setLoading(false))
    }, filterName ? 300 : 0)
    return () => clearTimeout(debounceRef.current)
  }, [filterArea, filterName])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...emptyState, areaId: areas[0]?.id ?? 0 })
    setModalOpen(true)
  }

  const openEdit = (p: ProductResponse) => {
    setEditing(p)
    setForm({
      areaId: areas.find((a) => a.name === p.areaName)?.id ?? 0,
      name: p.name,
      sellingPrice: p.sellingPrice,
      iva: p.iva,
      threshold: p.threshold,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    const toastId = toast.loading(editing ? 'Actualizando...' : 'Creando...')
    try {
      if (editing) {
        const updated = await productsService.update(editing.id, form as ProductUpdateRequest)
        setProducts((prev) => prev.map((p) => (p.id === editing.id ? updated : p)))
        toast.success('Producto actualizado', { id: toastId })
      } else {
        const created = await productsService.create(form)
        setProducts((prev) => [created, ...prev])
        toast.success('Producto creado', { id: toastId })
      }
      setModalOpen(false)
    } catch {
      toast.error('Error al guardar producto', { id: toastId })
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const toastId = toast.loading('Eliminando...')
    try {
      await productsService.delete(deleteTarget.id)
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id))
      toast.success('Producto eliminado', { id: toastId })
    } catch {
      toast.error('Error al eliminar producto', { id: toastId })
    }
    setDeleteTarget(null)
  }

  const handleRecalculate = async (id: number) => {
    setRecalculating(id)
    try {
      const updated = await productsService.recalculatePrice(id)
      setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)))
      toast.success('Precio recalculado')
    } catch {
      toast.error('Error al recalcular precio')
    }
    setRecalculating(null)
  }

  const showPrices = async (p: ProductResponse) => {
    setPricesTitle(`Precios - ${p.name}`)
    try {
      const data = await productsService.comparePrices(p.id)
      setPrices(data)
      setPricesModal(true)
    } catch {
      toast.error('Error al cargar precios')
    }
  }

  if (loading) {
    return (
      <div className="crud-page">
        <div className="crud-header">
          <h1 className="page-title">Productos</h1>
        </div>
        <div className="table-wrapper">
          <table className="crud-table">
            <thead>
              <tr><th>ID</th><th>Nombre</th><th>Área</th><th>Precio</th><th>Stock</th><th>Umbral</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="skeleton-row">
                  {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                    <td key={j}><div className="skeleton-cell" /></td>
                  ))}
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
        <h1 className="page-title">Productos</h1>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={18} />
          Nuevo Producto
        </button>
      </div>

      <div className="filter-bar">
        <div className="form-group">
          <label>Nombre</label>
          <input value={filterName} onChange={(e) => setFilterName(e.target.value)} placeholder="Buscar por nombre" />
        </div>
        <div className="form-group">
          <label>Área</label>
          <select value={filterArea ?? ''} onChange={(e) => setFilterArea(e.target.value ? Number(e.target.value) : undefined)}>
            <option value="">Todas</option>
            {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="crud-table">
          <thead>
            <tr>
              <SortableTh label="ID" sortKey="id" activeSortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              <SortableTh label="Nombre" sortKey="name" activeSortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              <SortableTh label="Área" sortKey="areaName" activeSortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              <SortableTh label="Precio Venta" sortKey="sellingPrice" activeSortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              <SortableTh label="Precio Rec." sortKey="priceRecomendation" activeSortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              <SortableTh label="IVA" sortKey="iva" activeSortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              <SortableTh label="Stock" sortKey="totalStock" activeSortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              <SortableTh label="Umbral" sortKey="threshold" activeSortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {sortedProducts.map((p) => (
                <motion.tr
                  key={p.id}
                  variants={rowVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  layout
                >
                  <td>{p.id}</td>
                  <td style={{ fontWeight: 500 }}>{p.name}</td>
                  <td>{p.areaName}</td>
                  <td>${p.sellingPrice.toLocaleString()}</td>
                  <td>{p.priceRecomendation ? `$${p.priceRecomendation.toLocaleString()}` : '—'}</td>
                  <td>{p.iva ? 'Sí' : 'No'}</td>
                  <td><span className={p.totalStock <= p.threshold ? 'stock-low' : ''}>{p.totalStock}</span></td>
                  <td>{p.threshold}</td>
                  <td className="actions-cell">
                    <button className="btn btn-sm" onClick={() => showPrices(p)} title="Ver precios">
                      <DollarSign size={14} />
                    </button>
                    <button
                      className="btn btn-sm"
                      onClick={() => handleRecalculate(p.id)}
                      disabled={recalculating === p.id}
                      title="Recalcular precio recomendado"
                    >
                      <RefreshCw size={14} className={recalculating === p.id ? 'spin' : ''} />
                    </button>
                    <button className="btn btn-sm" onClick={() => openEdit(p)} title="Editar">
                      <Edit3 size={14} />
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => setDeleteTarget(p)} title="Eliminar">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
            {products.length === 0 && (
              <tr>
                <td colSpan={9} className="empty-row">
                  <Package size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <br />
                  No hay productos registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} title={editing ? 'Editar Producto' : 'Nuevo Producto'} onClose={() => setModalOpen(false)}>
        <div className="modal-form">
          <div className="form-group">
            <label>Área</label>
            <select value={form.areaId} onChange={(e) => setForm({ ...form, areaId: Number(e.target.value) })}>
              <option value={0}>Seleccione un área</option>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Nombre</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre del producto" />
          </div>
          <div className="form-group">
            <label>Precio de Venta</label>
            <NumberInput step="0.01" value={form.sellingPrice} onChange={(v) => setForm({ ...form, sellingPrice: v })} />
          </div>
          <div className="form-group">
            <label className="checkbox-label">
              <input type="checkbox" checked={form.iva} onChange={(e) => setForm({ ...form, iva: e.target.checked })} />
              IVA
            </label>
          </div>
          <div className="form-group">
            <label>Umbral de Stock Bajo</label>
            <NumberInput value={form.threshold} onChange={(v) => setForm({ ...form, threshold: v })} />
          </div>
          <button className="btn btn-primary" onClick={handleSave}>
            {editing ? 'Guardar Cambios' : 'Crear Producto'}
          </button>
        </div>
      </Modal>

      <Modal open={pricesModal} title={pricesTitle} onClose={() => setPricesModal(false)}>
        {prices.length === 0 ? (
          <p className="empty-row">No hay precios registrados</p>
        ) : (
          <table className="crud-table">
            <thead>
              <tr><th>Distribuidor</th><th>Precio</th><th>Fecha</th></tr>
            </thead>
            <tbody>
              {prices.map((pr) => (
                <tr key={pr.id}><td>{pr.distributorName}</td><td>${pr.price.toLocaleString()}</td><td>{pr.date}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar Producto"
        message={`¿Estás seguro de eliminar "${deleteTarget?.name}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
