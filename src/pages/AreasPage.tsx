import { useEffect, useRef, useState, Fragment } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit3, Trash2, Layers } from 'lucide-react'
import toast from 'react-hot-toast'
import { areasService } from '../services/areas.service'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { NumberInput } from '../components/NumberInput'
import { SortableTh } from '../components/SortableTh'
import { useSortableTable } from '../hooks/useSortableTable'
import type { AreaResponse, AreaCreateRequest, AreaUpdateRequest } from '../types'
import './CrudPage.css'

const rowVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0 },
}

const emptyForm: AreaCreateRequest = { name: '', margen: 0 }

export function AreasPage() {
  const [areas, setAreas] = useState<AreaResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [filterName, setFilterName] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AreaResponse | null>(null)
  const [form, setForm] = useState<AreaCreateRequest>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AreaResponse | null>(null)

  const { sortKey, sortDir, toggleSort, sortedData: sortedAreas } = useSortableTable(areas)

  useEffect(() => {
    areasService.getAll()
      .then(setAreas)
      .catch(() => toast.error('Error al cargar áreas'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      areasService.getAll({ name: filterName || undefined })
        .then(setAreas)
        .catch(() => toast.error('Error al cargar áreas'))
    }, filterName ? 300 : 0)
    return () => clearTimeout(debounceRef.current)
  }, [filterName])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...emptyForm })
    setModalOpen(true)
  }

  const openEdit = (a: AreaResponse) => {
    setEditing(a)
    setForm({ name: a.name, margen: a.margen })
    setModalOpen(true)
  }

  const handleSave = async () => {
    const toastId = toast.loading(editing ? 'Actualizando...' : 'Creando...')
    try {
      if (editing) {
        const updated = await areasService.update(editing.id, form as AreaUpdateRequest)
        setAreas((prev) => prev.map((a) => (a.id === editing.id ? updated : a)))
        toast.success('Área actualizada', { id: toastId })
      } else {
        const created = await areasService.create(form)
        setAreas((prev) => [...prev, created])
        toast.success('Área creada', { id: toastId })
      }
      setModalOpen(false)
    } catch {
      toast.error(editing ? 'Error al actualizar' : 'Error al crear', { id: toastId })
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const toastId = toast.loading('Eliminando...')
    try {
      await areasService.delete(deleteTarget.id)
      setAreas((prev) => prev.filter((a) => a.id !== deleteTarget.id))
      toast.success('Área eliminada', { id: toastId })
    } catch {
      toast.error('Error al eliminar área', { id: toastId })
    }
    setDeleteTarget(null)
  }

  if (loading) {
    return (
      <div className="crud-page">
        <div className="crud-header"><h1 className="page-title">Áreas</h1></div>
        <div className="table-wrapper">
          <table className="crud-table">
            <thead><tr><th>ID</th><th>Nombre</th><th>Margen</th><th>Acciones</th></tr></thead>
            <tbody>
              {[1, 2, 3].map((i) => (
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
        <h1 className="page-title">Áreas</h1>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={18} /> Nueva Área
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
            <tr>
              <SortableTh label="ID" sortKey="id" activeSortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              <SortableTh label="Nombre" sortKey="name" activeSortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              <SortableTh label="Margen" sortKey="margen" activeSortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {sortedAreas.map((a) => (
                <Fragment key={a.id}>
                  <motion.tr
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    layout
                  >
                    <td data-label="ID">{a.id}</td>
                    <td data-label="Nombre" style={{ fontWeight: 500 }}>{a.name}</td>
                    <td data-label="Margen">{(a.margen * 100).toFixed(0)}%</td>
                    <td data-label="" className="actions-cell">
                      <button className="btn btn-sm" onClick={() => openEdit(a)} title="Editar">
                        <Edit3 size={14} />
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => setDeleteTarget(a)} title="Eliminar">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </motion.tr>
                </Fragment>
              ))}
            </AnimatePresence>
            {sortedAreas.length === 0 && (
              <tr>
                <td colSpan={4} className="empty-row">
                  <Layers size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <br />
                  No hay áreas registradas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} title={editing ? 'Editar Área' : 'Nueva Área'} onClose={() => setModalOpen(false)}>
        <div className="modal-form">
          <div className="form-group">
            <label>Nombre</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nombre del área"
            />
          </div>
          <div className="form-group">
            <label>Margen (0-1)</label>
            <NumberInput
              step="0.01"
              value={form.margen}
              onChange={(v) => setForm({ ...form, margen: v })}
              placeholder="Ej: 0.25 = 25%"
            />
            <small>Expresado en decimal. Ej: 0.25 = 25%</small>
          </div>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar área"
        message={`¿Estás seguro de eliminar "${deleteTarget?.name}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
