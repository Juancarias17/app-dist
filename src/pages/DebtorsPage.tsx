import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, DollarSign } from 'lucide-react'
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
                  <td data-label="Venta">#{d.saleId}</td>
                  <td data-label="Acciones">
                    {d.status !== 'PAID' && (
                      <button className="btn btn-sm btn-primary" onClick={() => openPayment(d)}>
                        Registrar Abono
                      </button>
                    )}
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
