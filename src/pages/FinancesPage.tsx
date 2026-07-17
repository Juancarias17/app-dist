import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Landmark, TrendingUp, TrendingDown, PiggyBank, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'
import { transactionsService } from '../services/transactions.service'
import { Modal } from '../components/Modal'
import { NumberInput } from '../components/NumberInput'
import { SortableTh } from '../components/SortableTh'
import { useSortableTable } from '../hooks/useSortableTable'
import { DatePickerField } from '../components/DatePickerField'
import type { TransactionResponse, TransactionCreateRequest, TypeTransaction } from '../types'
import './CrudPage.css'
import './DashboardPage.css'

const rowVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0 },
}

function toLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const emptyForm: TransactionCreateRequest = {
  type: 'INVESTMENT' as TypeTransaction,
  date: toLocalDate(new Date()),
  counterpart: '',
  amount: 0,
  description: '',
}

export function FinancesPage() {
  const [transactions, setTransactions] = useState<TransactionResponse[]>([])
  const [summary, setSummary] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<TransactionCreateRequest>(emptyForm)
  const [saving, setSaving] = useState(false)

  const [filterType, setFilterType] = useState<TypeTransaction | undefined>()
  const [filterDesde, setFilterDesde] = useState('')
  const [filterHasta, setFilterHasta] = useState('')

  const { sortKey, sortDir, toggleSort, sortedData: sortedTransactions } = useSortableTable(transactions)

  const fetchTransactions = () => {
    const p: { type?: TypeTransaction; desde?: string; hasta?: string } = {}
    if (filterType) p.type = filterType
    if (filterDesde) p.desde = filterDesde
    if (filterHasta) p.hasta = filterHasta

    const summaryDesde = p.desde || toLocalDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
    const summaryHasta = p.hasta || toLocalDate(new Date())

    Promise.all([
      transactionsService.getAll(p),
      transactionsService.getSummary({ desde: summaryDesde, hasta: summaryHasta }),
    ]).then(([txs, sum]) => {
      setTransactions(txs)
      setSummary(sum)
    }).catch(() => toast.error('Error al cargar transacciones'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchTransactions() }, [filterType, filterDesde, filterHasta])

  const handleSave = async () => {
    setSaving(true)
    const toastId = toast.loading('Registrando transacción...')
    try {
      const created = await transactionsService.createManual(form)
      setTransactions((prev) => [created, ...prev])
      toast.success('Transacción registrada', { id: toastId })
      setModalOpen(false)
      fetchTransactions()
    } catch {
      toast.error('Error al registrar transacción', { id: toastId })
    }
    setSaving(false)
  }

  const typeLabel = (t: TypeTransaction) => {
    switch (t) {
      case 'INCOME': return 'Ingreso'
      case 'OUTCOME': return 'Egreso'
      case 'INVESTMENT': return 'Inversión'
    }
  }

  const cardItems = [
    { icon: TrendingUp, label: 'Ingresos (Mes)', value: Number(summary.totalIngresos ?? 0), color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
    { icon: TrendingDown, label: 'Egresos (Mes)', value: Number(summary.totalEgresos ?? 0), color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    { icon: PiggyBank, label: 'Inversión (Mes)', value: Number(summary.totalInversiones ?? 0), color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
    { icon: DollarSign, label: 'Balance', value: Number(summary.balanceNeto ?? 0), color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  ]

  if (loading) {
    return (
      <div className="crud-page">
        <div className="crud-header"><h1 className="page-title">Finanzas</h1></div>
        <div className="cards-row">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="dash-card skeleton">
              <div className="skeleton-text">
                <div className="skeleton-line short" />
                <div className="skeleton-line medium" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="crud-page">
      <div className="crud-header">
        <h1 className="page-title">Finanzas</h1>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={18} /> Nueva Transacción
        </button>
      </div>

      <div className="cards-row" style={{ marginBottom: '1.5rem' }}>
        {cardItems.map((c) => (
          <motion.div
            key={c.label}
            className="dash-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="dash-card-icon-wrap" style={{ background: c.bg, color: c.color }}>
              <c.icon size={24} />
            </div>
            <div className="dash-card-info">
              <p className="dash-card-label">{c.label}</p>
              <p className="dash-card-value">
                {typeof c.value === 'number' ? `$${c.value.toLocaleString()}` : c.value}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="filter-bar">
        <div className="form-group">
          <label>Tipo</label>
          <select value={filterType ?? ''} onChange={(e) => setFilterType(e.target.value ? (e.target.value as TypeTransaction) : undefined)}>
            <option value="">Todos</option>
            <option value="INCOME">Ingresos</option>
            <option value="OUTCOME">Egresos</option>
            <option value="INVESTMENT">Inversiones</option>
          </select>
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
            <SortableTh label="ID" sortKey="id" activeSortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
            <SortableTh label="Tipo" sortKey="type" activeSortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
            <SortableTh label="Fecha" sortKey="date" activeSortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
            <SortableTh label="Contraparte" sortKey="counterpart" activeSortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
            <SortableTh label="Monto" sortKey="amount" activeSortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
            <SortableTh label="Descripción" sortKey="description" activeSortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
          </tr></thead>
          <tbody>
            <AnimatePresence>
            {sortedTransactions.map((t) => (
              <motion.tr key={t.id} variants={rowVariants} initial="hidden" animate="visible" exit="hidden" layout>
                <td>{t.id}</td>
                <td><span className={`type-badge type-${t.type.toLowerCase()}`}>{typeLabel(t.type)}</span></td>
                <td>{t.date}</td>
                <td>{t.counterpart}</td>
                <td style={{ fontWeight: 600 }}>${t.amount.toLocaleString()}</td>
                <td>{t.description || '—'}</td>
              </motion.tr>
            ))}
            </AnimatePresence>
            {sortedTransactions.length === 0 && (
              <tr><td colSpan={6} className="empty-row"><Landmark size={40} style={{ opacity: 0.3, marginBottom: 8 }} /><br />No hay transacciones registradas</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} title="Nueva Transacción (Inversión)" onClose={() => setModalOpen(false)}>
        <div className="modal-form">
          <div className="form-group">
            <label>Tipo</label>
            <input value="Inversión" disabled style={{ opacity: 0.6 }} />
          </div>
          <div className="form-group">
            <label>Fecha</label>
            <DatePickerField value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
          </div>
          <div className="form-group">
            <label>Contraparte (inversor)</label>
            <input value={form.counterpart} onChange={(e) => setForm({ ...form, counterpart: e.target.value })} placeholder="Nombre del inversor" />
          </div>
          <div className="form-group">
            <label>Monto</label>
            <NumberInput step="0.01" value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} placeholder="0.00" />
          </div>
          <div className="form-group">
            <label>Descripción</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Opcional" />
          </div>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Registrando...' : 'Registrar Transacción'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
