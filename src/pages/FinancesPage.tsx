import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Landmark, TrendingUp, TrendingDown, PiggyBank, DollarSign, Package, AlertTriangle, Calendar, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { transactionsService } from '../services/transactions.service'
import { inventoryService } from '../services/inventory.service'
import { debtsService } from '../services/debts.service'
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

function todayISO() {
  return toLocalDate(new Date())
}

function monthsAgoISO(n: number) {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  d.setDate(1)
  return toLocalDate(d)
}

const PRESETS = [
  { label: 'Este Mes', months: 0 },
  { label: '3 Meses', months: 3 },
  { label: '6 Meses', months: 6 },
  { label: 'Este Año', months: 12 },
]

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
  const [inventoryValue, setInventoryValue] = useState(0)
  const [pendingDebt, setPendingDebt] = useState(0)

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<TransactionCreateRequest>(emptyForm)
  const [saving, setSaving] = useState(false)

  const [filterType, setFilterType] = useState<TypeTransaction | undefined>()
  const [filterDesde, setFilterDesde] = useState('')
  const [filterHasta, setFilterHasta] = useState('')
  const [tempDesde, setTempDesde] = useState('')
  const [tempHasta, setTempHasta] = useState('')

  const { sortKey, sortDir, toggleSort, sortedData: sortedTransactions } = useSortableTable(transactions)

  const typeLabel = (t: TypeTransaction) => {
    switch (t) {
      case 'INCOME': return 'Ingreso'
      case 'OUTCOME': return 'Egreso'
      case 'INVESTMENT': return 'Inversion'
    }
  }

  const fetchTransactions = () => {
    const p: { type?: TypeTransaction; desde?: string; hasta?: string } = {}
    if (filterType) p.type = filterType
    if (filterDesde) p.desde = filterDesde
    if (filterHasta) p.hasta = filterHasta

    Promise.all([
      transactionsService.getAll(p),
      transactionsService.getSummary(filterDesde && filterHasta ? { desde: filterDesde, hasta: filterHasta } : filterDesde ? { desde: filterDesde } : filterHasta ? { hasta: filterHasta } : undefined),
      inventoryService.getAll(),
      debtsService.getSummary(),
    ]).then(([txs, sum, inv, debtSum]) => {
      setTransactions(txs)
      setSummary(sum)
      const totalInv = inv.reduce((acc, item) => {
        const stock = item.batches.reduce((s, b) => s + b.quantity, 0)
        return acc + (item.batches[0]?.sellingPrice ?? 0) * stock
      }, 0)
      setInventoryValue(totalInv)
      setPendingDebt(debtSum.totalRemaining)
    }).catch(() => toast.error('Error al cargar datos'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchTransactions() }, [filterType, filterDesde, filterHasta])

  const applyPreset = (months: number) => {
    const d = monthsAgoISO(months)
    const h = todayISO()
    setFilterDesde(d)
    setFilterHasta(h)
    setTempDesde(d)
    setTempHasta(h)
  }

  const applyCustom = () => {
    setFilterDesde(tempDesde)
    setFilterHasta(tempHasta)
  }

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

  const totalIngresos = Number(summary.totalIngresos ?? 0)
  const totalEgresos = Number(summary.totalEgresos ?? 0)
  const totalInversiones = Number(summary.totalInversiones ?? 0)
  const caja = totalIngresos - totalEgresos + totalInversiones

  const row1Items = [
    { icon: DollarSign, label: 'Dinero en Caja', value: caja, color: caja >= 0 ? '#22c55e' : '#ef4444', bg: caja >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' },
    { icon: Package, label: 'Dinero en Inventario', value: inventoryValue, color: '#648ba2', bg: 'rgba(100,139,162,0.1)' },
    { icon: AlertTriangle, label: 'Dinero no Cancelado', value: pendingDebt, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  ]

  const row2Items = [
    { icon: TrendingUp, label: 'Ingresos', value: totalIngresos, color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
    { icon: TrendingDown, label: 'Egresos', value: totalEgresos, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    { icon: PiggyBank, label: 'Inversión', value: totalInversiones, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  ]

  if (loading) {
    return (
      <div className="crud-page">
        <div className="crud-header"><h1 className="page-title">Finanzas</h1></div>
        <div className="cards-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="dash-card skeleton">
              <div className="skeleton-text">
                <div className="skeleton-line short" />
                <div className="skeleton-line medium" />
              </div>
            </div>
          ))}
        </div>
        <div className="cards-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {[1, 2, 3].map((i) => (
            <div key={`b-${i}`} className="dash-card skeleton">
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

      <div className="cards-row" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {row1Items.map((c) => (
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

      <div className="cards-row" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {row2Items.map((c) => (
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

      <div className="dash-filters" style={{ marginBottom: '1.5rem' }}>
        <div className="preset-group">
          {PRESETS.map((p) => (
            <button
              key={p.months}
              className={`preset-btn${filterDesde === monthsAgoISO(p.months) ? ' active' : ''}`}
              onClick={() => applyPreset(p.months)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="date-range">
          <Calendar size={16} className="date-icon" />
          <select value={filterType ?? ''} onChange={(e) => setFilterType(e.target.value ? (e.target.value as TypeTransaction) : undefined)} style={{ fontSize: '0.85rem', padding: '0.35rem 0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <option value="">Todos</option>
            <option value="INCOME">Ingresos</option>
            <option value="OUTCOME">Egresos</option>
            <option value="INVESTMENT">Inversiones</option>
          </select>
          <DatePickerField value={tempDesde} onChange={setTempDesde} />
          <span className="date-sep">—</span>
          <DatePickerField value={tempHasta} onChange={setTempHasta} />
          <button className="btn btn-sm btn-primary" onClick={applyCustom}>
            Aplicar
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="crud-table">
          <thead><tr>
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
                <td data-label="Tipo"><span className={`type-badge type-${t.type.toLowerCase()}`}>{typeLabel(t.type)}</span></td>
                <td data-label="Fecha">{t.date}</td>
                <td data-label="Contraparte">{t.counterpart}</td>
                <td data-label="Monto" style={{ fontWeight: 600 }}>${t.amount.toLocaleString()}</td>
                <td data-label="Descripción">{t.description || '—'}</td>
              </motion.tr>
            ))}
            </AnimatePresence>
            {sortedTransactions.length === 0 && (
              <tr><td colSpan={5} className="empty-row"><Landmark size={40} style={{ opacity: 0.3, marginBottom: 8 }} /><br />No hay transacciones registradas</td></tr>
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
