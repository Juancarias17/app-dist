import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, DollarSign, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { debtsService } from '../services/debts.service'
import { Modal } from '../components/Modal'
import { NumberInput } from '../components/NumberInput'
import { SortableTh } from '../components/SortableTh'
import { useSortableTable } from '../hooks/useSortableTable'
import type { DebtResponse, DebtSummary } from '../types'
import './CrudPage.css'

const rowVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0 },
}

function toCurrency(n: number) {
  return `$${n.toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function DebtorsPage() {
  const [debts, setDebts] = useState<DebtResponse[]>([])
  const [summary, setSummary] = useState<DebtSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterClient, setFilterClient] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [selectedDebt, setSelectedDebt] = useState<DebtResponse | null>(null)
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [paymentDesc, setPaymentDesc] = useState('')
  const [saving, setSaving] = useState(false)

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ clientName: '', totalAmount: 0, initialPayment: 0, description: '' })
  const [creating, setCreating] = useState(false)

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editDebt, setEditDebt] = useState<DebtResponse | null>(null)
  const [editClientName, setEditClientName] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const { sortKey, sortDir, toggleSort, sortedData: sortedDebts } = useSortableTable(debts)

  const fetchData = (client?: string, status?: string) => {
    const params: { clientName?: string; status?: string } = {}
    if (client) params.clientName = client
    if (status) params.status = status
    debtsService.getAll(params).then(setDebts).catch(() => toast.error('Error al cargar deudas'))
    debtsService.getSummary().then(setSummary).catch(() => {})
  }

  useEffect(() => {
    debtsService.getAll().then(setDebts).catch(() => toast.error('Error al cargar deudas'))
    debtsService.getSummary().then(setSummary).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchData(filterClient || undefined, filterStatus || undefined)
  }, [filterClient, filterStatus])

  const openPayment = (debt: DebtResponse) => {
    setSelectedDebt(debt)
    setPaymentAmount(0)
    setPaymentDesc('')
    setPaymentModalOpen(true)
  }

  const openCreate = () => {
    setCreateForm({ clientName: '', totalAmount: 0, initialPayment: 0, description: '' })
    setCreateModalOpen(true)
  }

  const openEdit = (debt: DebtResponse) => {
    setEditDebt(debt)
    setEditClientName(debt.clientName)
    setEditModalOpen(true)
  }

  const handleEdit = async () => {
    if (!editDebt) return
    if (!editClientName.trim()) { toast.error('El nombre del cliente es obligatorio'); return }
    setSavingEdit(true)
    const toastId = toast.loading('Actualizando cliente...')
    try {
      await debtsService.update(editDebt.id, { clientName: editClientName.trim() })
      toast.success('Cliente actualizado', { id: toastId })
      setEditModalOpen(false)
      fetchData(filterClient || undefined, filterStatus || undefined)
    } catch {
      toast.error('Error al actualizar cliente', { id: toastId })
    }
    setSavingEdit(false)
  }

  const handleCreate = async () => {
    if (!createForm.clientName.trim()) { toast.error('El nombre del cliente es obligatorio'); return }
    if (createForm.totalAmount <= 0) { toast.error('El monto total debe ser mayor a 0'); return }
    if (createForm.initialPayment >= createForm.totalAmount) {
      toast.error('El abono inicial debe ser menor que el monto total')
      return
    }
    setCreating(true)
    const toastId = toast.loading('Creando deuda...')
    try {
      await debtsService.create({
        clientName: createForm.clientName.trim(),
        totalAmount: createForm.totalAmount,
        initialPayment: createForm.initialPayment > 0 ? createForm.initialPayment : undefined,
        description: createForm.description.trim() || undefined,
      })
      toast.success('Deuda creada', { id: toastId })
      setCreateModalOpen(false)
      fetchData(filterClient || undefined, filterStatus || undefined)
    } catch {
      toast.error('Error al crear deuda', { id: toastId })
    }
    setCreating(false)
  }

  const handlePayment = async () => {
    if (!selectedDebt) return
    if (paymentAmount <= 0) { toast.error('El monto debe ser mayor a 0'); return }
    if (paymentAmount > selectedDebt.remainingAmount) {
      toast.error(`El monto excede el saldo pendiente (${toCurrency(selectedDebt.remainingAmount)})`)
      return
    }
    setSaving(true)
    const toastId = toast.loading('Registrando abono...')
    try {
      await debtsService.recordPayment(selectedDebt.id, {
        amount: paymentAmount,
        description: paymentDesc || undefined,
      })
      toast.success('Abono registrado', { id: toastId })
      setPaymentModalOpen(false)
      fetchData(filterClient || undefined, filterStatus || undefined)
    } catch {
      toast.error('Error al registrar abono', { id: toastId })
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="crud-page">
        <div className="crud-header"><h1 className="page-title">Deudores</h1></div>
        <div className="table-wrapper">
          <table className="crud-table">
            <thead><tr><th>Cliente</th><th>Total</th><th>Abonado</th><th>Pendiente</th><th>Estado</th></tr></thead>
            <tbody>{[1, 2, 3].map((i) => <tr key={i} className="skeleton-row"><td colSpan={5}><div className="skeleton-cell" /></td></tr>)}</tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="crud-page">
      <div className="crud-header">
        <h1 className="page-title">Deudores</h1>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={18} /> Nueva Deuda
        </button>
      </div>

      {summary && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              flex: 1, minWidth: 180, padding: '1rem 1.25rem', borderRadius: 'var(--radius-lg)',
              background: 'var(--bg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
            }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
              <DollarSign size={22} />
            </div>
            <div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Pendiente</p>
              <p style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#ef4444' }}>{toCurrency(summary.totalRemaining)}</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            style={{
              flex: 1, minWidth: 180, padding: '1rem 1.25rem', borderRadius: 'var(--radius-lg)',
              background: 'var(--bg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
            }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e' }}>
              <DollarSign size={22} />
            </div>
            <div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Abonado</p>
              <p style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#22c55e' }}>{toCurrency(summary.totalPaid)}</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{
              flex: 1, minWidth: 180, padding: '1rem 1.25rem', borderRadius: 'var(--radius-lg)',
              background: 'var(--bg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
            }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(100,139,162,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#648ba2' }}>
              <Users size={22} />
            </div>
            <div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Deudas Activas</p>
              <p style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#648ba2' }}>{summary.pendingCount}</p>
            </div>
          </motion.div>
        </div>
      )}

      <div className="filter-bar">
        <div className="form-group">
          <label>Cliente</label>
          <input value={filterClient} onChange={(e) => setFilterClient(e.target.value)} placeholder="Buscar cliente" />
        </div>
        <div className="form-group">
          <label>Estado</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Todos</option>
            <option value="PENDING">Pendiente</option>
            <option value="PAID">Pagado</option>
          </select>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="crud-table">
          <thead><tr>
            <SortableTh label="Cliente" sortKey="clientName" activeSortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
            <SortableTh label="Total Deuda" sortKey="totalAmount" activeSortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
            <SortableTh label="Abonado" sortKey="paidAmount" activeSortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
            <SortableTh label="Pendiente" sortKey="remainingAmount" activeSortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
            <SortableTh label="Estado" sortKey="status" activeSortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
            <SortableTh label="Venta" sortKey="saleId" activeSortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
            <th>Acciones</th>
          </tr></thead>
          <tbody>
            <AnimatePresence>
              {sortedDebts.map((d) => (
                <motion.tr key={d.id} variants={rowVariants} initial="hidden" animate="visible" exit="hidden" layout>
                  <td data-label="Cliente" style={{ fontWeight: 500 }}>{d.clientName}</td>
                  <td data-label="Total Deuda">{toCurrency(d.totalAmount)}</td>
                  <td data-label="Abonado" style={{ color: '#22c55e' }}>{toCurrency(d.paidAmount)}</td>
                  <td data-label="Pendiente" style={{ fontWeight: 600, color: d.remainingAmount > 0 ? '#ef4444' : '#22c55e' }}>{toCurrency(d.remainingAmount)}</td>
                  <td data-label="Estado">
                    <span className={`type-badge ${d.status === 'PAID' ? 'type-income' : 'type-outcome'}`}>
                      {d.status === 'PAID' ? 'Pagado' : 'Pendiente'}
                    </span>
                  </td>
                  <td data-label="Venta">{d.saleId ? `#${d.saleId}` : '—'}</td>
                  <td data-label="Acciones">
                    <div className="actions-cell">
                      {d.status !== 'PAID' && (
                        <button className="btn btn-sm btn-primary" onClick={() => openPayment(d)}>
                          Registrar Abono
                        </button>
                      )}
                      <button className="btn btn-sm btn-ghost" onClick={() => openEdit(d)}>
                        Editar
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
            {debts.length === 0 && (
              <tr>
                <td colSpan={7} className="empty-row">
                  <Users size={40} style={{ opacity: 0.3, marginBottom: 8 }} /><br />
                  No hay deudas registradas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={editModalOpen} title="Editar Deuda" onClose={() => setEditModalOpen(false)}>
        <div className="modal-form">
          {editDebt && (
            <>
              <div className="form-group">
                <label>Cliente</label>
                <input
                  value={editClientName}
                  onChange={(e) => setEditClientName(e.target.value)}
                  placeholder="Nombre del cliente"
                />
                <small>Si el cliente ya tiene otra deuda pendiente, ambas se unificarán</small>
              </div>
              <button className="btn btn-primary" onClick={handleEdit} disabled={savingEdit}>
                {savingEdit ? 'Guardando...' : 'Guardar'}
              </button>
            </>
          )}
        </div>
      </Modal>

      <Modal open={createModalOpen} title="Nueva Deuda" onClose={() => setCreateModalOpen(false)}>
        <div className="modal-form">
          <div className="form-group">
            <label>Cliente</label>
            <input
              value={createForm.clientName}
              onChange={(e) => setCreateForm({ ...createForm, clientName: e.target.value })}
              placeholder="Nombre del cliente"
            />
          </div>
          <div className="form-group">
            <label>Monto Total</label>
            <NumberInput
              step="0.01"
              placeholder="Monto total"
              value={createForm.totalAmount}
              min={0}
              onChange={(v) => setCreateForm({ ...createForm, totalAmount: v })}
            />
          </div>
          <div className="form-group">
            <label>Abono Inicial (opcional)</label>
            <NumberInput
              step="0.01"
              placeholder="Abono inicial"
              value={createForm.initialPayment}
              min={0}
              onChange={(v) => setCreateForm({ ...createForm, initialPayment: v })}
            />
            <small>Debe ser menor que el monto total</small>
          </div>
          <div className="form-group">
            <label>Descripción (opcional)</label>
            <input
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              placeholder="Ej: Préstamo en efectivo"
            />
          </div>
          <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
            {creating ? 'Creando...' : 'Crear Deuda'}
          </button>
        </div>
      </Modal>

      <Modal open={paymentModalOpen} title="Registrar Abono" onClose={() => setPaymentModalOpen(false)}>
        <div className="modal-form">
          {selectedDebt && (
            <>
              <div className="form-group">
                <label>Cliente</label>
                <input value={selectedDebt.clientName} readOnly style={{ background: 'var(--bg-alt)' }} />
              </div>
              <div className="form-group">
                <label>Deuda Actual</label>
                <input value={toCurrency(selectedDebt.remainingAmount)} readOnly style={{ background: 'var(--bg-alt)' }} />
              </div>
              <div className="form-group">
                <label>Monto a Abonar</label>
                <NumberInput step="0.01" placeholder="Monto" value={paymentAmount} min={0} onChange={setPaymentAmount} />
              </div>
              <div className="form-group">
                <label>Descripción (opcional)</label>
                <input value={paymentDesc} onChange={(e) => setPaymentDesc(e.target.value)} placeholder="Ej: Abono en efectivo" />
              </div>
              <button className="btn btn-primary" onClick={handlePayment} disabled={saving}>
                {saving ? 'Registrando...' : 'Registrar Abono'}
              </button>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
