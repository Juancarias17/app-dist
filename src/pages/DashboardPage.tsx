import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  Package, AlertTriangle, TrendingUp, DollarSign, Calendar,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { productsService } from '../services/products.service'
import { inventoryService } from '../services/inventory.service'
import { salesService } from '../services/sales.service'
import { transactionsService } from '../services/transactions.service'
import './DashboardPage.css'
import { DatePickerField } from '../components/DatePickerField'

const COLORS = ['#648ba2', '#deda05', '#0b2035']
const PRESETS = [
  { label: 'Este Mes', months: 0 },
  { label: '3 Meses', months: 3 },
  { label: '6 Meses', months: 6 },
  { label: 'Este Año', months: 12 },
]

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

function monthRangeISO(date: Date) {
  const start = toLocalDate(new Date(date.getFullYear(), date.getMonth(), 1))
  const end = toLocalDate(new Date(date.getFullYear(), date.getMonth() + 1, 0))
  return { start, end }
}

function buildMonths(desde: string, hasta: string) {
  const months: { start: string; end: string; label: string }[] = []
  const d = new Date(desde)
  const end = new Date(hasta)
  while (d <= end) {
    const { start, end: monthEnd } = monthRangeISO(d)
    months.push({
      start,
      end: monthEnd > hasta ? hasta : monthEnd,
      label: d.toLocaleString('es', { month: 'short', year: '2-digit' }),
    })
    d.setMonth(d.getMonth() + 1)
  }
  return months
}

function toCurrency(n: number) {
  return `$${n.toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, damping: 20, stiffness: 200 } },
}

const chartCardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, damping: 22, stiffness: 180 } },
}

function SkeletonCard() {
  return (
    <div className="dash-card skeleton">
      <div className="skeleton-icon" />
      <div className="skeleton-text">
        <div className="skeleton-line short" />
        <div className="skeleton-line medium" />
      </div>
    </div>
  )
}

function SkeletonChart() {
  return (
    <div className="chart-card skeleton">
      <div className="skeleton-line short" style={{ marginBottom: '1rem' }} />
      <div className="skeleton-chart" />
    </div>
  )
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="chart-tooltip-item" style={{ color: p.color }}>
          {p.name}: {toCurrency(p.value)}
        </p>
      ))}
    </div>
  )
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`
  return `$${n.toFixed(0)}`
}

export function DashboardPage() {
  const [desde, setDesde] = useState(monthsAgoISO(6))
  const [hasta, setHasta] = useState(todayISO())
  const [loading, setLoading] = useState(true)

  const [productCount, setProductCount] = useState<number | null>(null)
  const [lowStockCount, setLowStockCount] = useState<number | null>(null)
  const [transactionCount, setTransactionCount] = useState<number | null>(null)
  const [balance, setBalance] = useState<number | null>(null)

  const [areaData, setAreaData] = useState<{ month: string; income: number; outcome: number }[]>([])
  const [pieData, setPieData] = useState<{ name: string; value: number; color: string }[]>([])
  const [composedData, setComposedData] = useState<{ month: string; income: number; outcome: number; net: number }[]>([])
  const [topProducts, setTopProducts] = useState<{ name: string; revenue: number; quantity: number }[]>([])
  const [stockHealth, setStockHealth] = useState<{ name: string; value: number; fill: string }[]>([])
  const [stockPct, setStockPct] = useState(100)

  const fetchData = useCallback(async (d: string, h: string) => {
    setLoading(true)
    try {
      const [products, salesList, transactions, inv] = await Promise.all([
        productsService.getAll(),
        salesService.getAll({ desde: d, hasta: h }),
        transactionsService.getAll({ desde: d, hasta: h }),
        inventoryService.getAll(),
      ])

      let lowStock: typeof inv = []
      try {
        lowStock = await inventoryService.getLowStock()
      } catch {
        lowStock = []
      }

      setProductCount(products.length)
      setLowStockCount(lowStock.length)
      setTransactionCount(transactions.length)

      const totalIncome = transactions
        .filter((t) => t.type === 'INCOME')
        .reduce((s, t) => s + t.amount, 0)
      const totalOutcome = transactions
        .filter((t) => t.type === 'OUTCOME')
        .reduce((s, t) => s + t.amount, 0)
      setBalance(totalIncome - totalOutcome)

      const months = buildMonths(d, h)
      const area = months.map((m) => {
        const filtered = transactions.filter(
          (t) => t.date >= m.start && t.date <= m.end,
        )
        return {
          month: m.label,
          income: filtered.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0),
          outcome: filtered.filter((t) => t.type === 'OUTCOME').reduce((s, t) => s + t.amount, 0),
        }
      })
      setAreaData(area)
      setComposedData(
        area.map((m) => ({ ...m, net: m.income - m.outcome })),
      )

      const byType: Record<string, number> = {}
      transactions.forEach((t) => {
        const key = t.type === 'INCOME' ? 'Ingresos' : t.type === 'OUTCOME' ? 'Egresos' : 'Inversión'
        byType[key] = (byType[key] ?? 0) + t.amount
      })
      setPieData(
        Object.entries(byType).map(([name, value], i) => ({
          name,
          value,
          color: COLORS[i % COLORS.length],
        })),
      )

      const productMap: Record<number, { name: string; revenue: number; quantity: number }> = {}
      for (const sale of salesList) {
        for (const item of sale.items) {
          if (!productMap[item.inventoryBatchId]) {
            productMap[item.inventoryBatchId] = { name: item.productName, revenue: 0, quantity: 0 }
          }
          productMap[item.inventoryBatchId].revenue += item.total
          productMap[item.inventoryBatchId].quantity += item.quantity
        }
      }
      setTopProducts(
        Object.values(productMap)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10),
      )

      const totalProducts = inv.length
      const healthy = totalProducts - lowStock.length
      const pct = totalProducts > 0 ? Math.round((healthy / totalProducts) * 100) : 100
      setStockPct(pct)
      setStockHealth([
        { name: 'Stock OK', value: healthy, fill: '#22c55e' },
        { name: 'Stock Bajo', value: lowStock.length, fill: '#ef4444' },
      ])
    } catch {
      toast.error('Error al cargar datos del dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(desde, hasta)
  }, [fetchData, desde, hasta])

  const applyPreset = (months: number) => {
    setDesde(monthsAgoISO(months))
    setHasta(todayISO())
  }

  const applyCustom = () => {
    fetchData(desde, hasta)
  }

  const cards = [
    { icon: Package, label: 'Productos', value: productCount ?? 0, color: '#648ba2', bg: 'rgba(100,139,162,0.1)' },
    { icon: AlertTriangle, label: 'Stock Bajo', value: lowStockCount ?? 0, color: '#ef4444', bg: 'rgba(239,68,68,0.1)', warn: true },
    { icon: TrendingUp, label: 'Transacciones', value: transactionCount ?? 0, color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
    {
      icon: DollarSign,
      label: 'Balance',
      value: balance !== null ? toCurrency(balance) : '—',
      color: balance !== null && balance >= 0 ? '#22c55e' : '#ef4444',
      bg: balance !== null && balance >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
      warn: balance !== null && balance < 0,
    },
  ]

  if (loading) {
    return (
      <div className="dashboard">
        <h1 className="page-title">Dashboard</h1>
        <div className="cards-row">
          <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
        <div className="charts-grid charts-grid-3">
          <SkeletonChart /><SkeletonChart />
          <div className="full-width"><SkeletonChart /></div>
          <SkeletonChart /><SkeletonChart />
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="dashboard"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="dash-header">
        <h1 className="page-title">Dashboard</h1>
        <div className="dash-filters">
          <div className="preset-group">
            {PRESETS.map((p) => (
              <button
                key={p.months}
                className={`preset-btn${desde === monthsAgoISO(p.months) ? ' active' : ''}`}
                onClick={() => applyPreset(p.months)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="date-range">
            <Calendar size={16} className="date-icon" />
            <DatePickerField value={desde} onChange={setDesde} className="date-picker-dashboard" />
            <span className="date-sep">—</span>
            <DatePickerField value={hasta} onChange={setHasta} className="date-picker-dashboard" />
            <button className="btn btn-sm btn-primary" onClick={applyCustom}>
              Aplicar
            </button>
          </div>
        </div>
      </div>

      <div className="cards-row">
        {cards.map((c) => (
          <motion.div key={c.label} className="dash-card" variants={cardVariants}>
            <div className="dash-card-icon-wrap" style={{ background: c.bg, color: c.color }}>
              <c.icon size={24} />
            </div>
            <div className="dash-card-info">
              <p className="dash-card-label">{c.label}</p>
              <p className={`dash-card-value${c.warn ? ' warn' : ''}`}>{c.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="charts-grid charts-grid-2">
        <motion.div className="chart-card" variants={chartCardVariants}>
          <h3>Ingresos vs Egresos</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={areaData}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#648ba2" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#648ba2" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="outcomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0b2035" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0b2035" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="income"
                name="Ingresos"
                stroke="#648ba2"
                strokeWidth={2.5}
                fill="url(#incomeGrad)"
                dot={{ fill: '#648ba2', r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Area
                type="monotone"
                dataKey="outcome"
                name="Egresos"
                stroke="#0b2035"
                strokeWidth={2.5}
                fill="url(#outcomeGrad)"
                dot={{ fill: '#0b2035', r: 3 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div className="chart-card" variants={chartCardVariants}>
          <h3>Distribución</h3>
          <div className="donut-wrap">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={105}
                  dataKey="value"
                  paddingAngle={3}
                  cornerRadius={6}
                >
                  {pieData.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => toCurrency(Number(v ?? 0))} />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  formatter={(value: string) => (
                    <span style={{ color: 'var(--text)', fontSize: 13 }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center">
              <span className="donut-total-label">{formatCompact(pieData.reduce((s, e) => s + e.value, 0))}</span>
              <span className="donut-total-sub">Total</span>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="charts-grid charts-grid-1">
        <motion.div className="chart-card" variants={chartCardVariants}>
          <h3>Balance Mensual</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={composedData}>
              <defs>
                <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#deda05" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#deda05" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="income" name="Ingresos" fill="#648ba2" radius={[4, 4, 0, 0]} barSize={20} />
              <Bar dataKey="outcome" name="Egresos" fill="#0b2035" radius={[4, 4, 0, 0]} barSize={20} />
              <Line
                type="monotone"
                dataKey="net"
                name="Balance Neto"
                stroke="#deda05"
                strokeWidth={2.5}
                dot={{ fill: '#deda05', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      <div className="charts-grid charts-grid-2">
        <motion.div className="chart-card" variants={chartCardVariants}>
          <h3>Top Productos</h3>
          {topProducts.length === 0 ? (
            <div className="chart-empty">Sin ventas en este período</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={topProducts.slice(0, 8)}
                layout="vertical"
                margin={{ left: 100, right: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  width={90}
                />
                <Tooltip formatter={(v, n) => [toCurrency(Number(v ?? 0)), n === 'revenue' ? 'Ingresos' : 'Cantidad']} />
                <Bar dataKey="revenue" name="revenue" fill="#648ba2" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        <motion.div className="chart-card" variants={chartCardVariants}>
          <h3>Salud del Inventario</h3>
          <div className="stock-gauge-wrap">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={stockHealth}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="value"
                  startAngle={180}
                  endAngle={0}
                  paddingAngle={2}
                >
                  {stockHealth.map((e, i) => (
                    <Cell key={i} fill={e.fill} />
                  ))}
                </Pie>
                <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle">
                  <tspan x="50%" dy="-0.3em" className="gauge-value">{stockPct}%</tspan>
                  <tspan x="50%" dy="1.4em" className="gauge-label">Stock Saludable</tspan>
                </text>
                <Tooltip formatter={(v) => [Number(v ?? 0), 'Productos']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="stock-legend">
              <div className="stock-legend-item">
                <span className="stock-dot" style={{ background: '#22c55e' }} />
                <span>Stock OK</span>
                <strong>{stockHealth[0]?.value ?? 0}</strong>
              </div>
              <div className="stock-legend-item">
                <span className="stock-dot" style={{ background: '#ef4444' }} />
                <span>Stock Bajo</span>
                <strong>{stockHealth[1]?.value ?? 0}</strong>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
