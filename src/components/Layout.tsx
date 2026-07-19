import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  ShoppingCart,
  DollarSign,
  Landmark,
  Truck,
  Layers,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useInactivityTimeout } from '../hooks/useInactivityTimeout'
import './Layout.css'
import logo from '../assets/logo.jpeg'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/productos', label: 'Productos', icon: Package },
  { to: '/distribuidores', label: 'Distribuidores', icon: Truck },
  { to: '/areas', label: 'Áreas', icon: Layers },
  { to: '/inventario', label: 'Inventario', icon: ClipboardList },
  { to: '/compras', label: 'Compras', icon: ShoppingCart },
  { to: '/ventas', label: 'Ventas', icon: DollarSign },
  { to: '/finanzas', label: 'Finanzas', icon: Landmark },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  useInactivityTimeout()

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 768) setSidebarOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <div className="layout">
      <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Abrir menú">
        <Menu size={22} />
      </button>

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="sidebar-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        className={`sidebar${sidebarOpen ? ' open' : ''}`}
        initial={{ x: -260 }}
        animate={{ x: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      >
        <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Cerrar menú">
          <X size={20} />
        </button>

        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img src={logo} alt="DistriDentales" />
          </div>
          <span className="sidebar-brand">DistriDentales</span>
          <span className="sidebar-subtitle">Sistema de Gestión</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={`sidebar-link${isActive ? ' active' : ''}`}
              >
                <Icon size={20} className="sidebar-link-icon" />
                <span>{item.label}</span>
                {isActive && (
                  <motion.div
                    className="sidebar-link-indicator"
                    layoutId="indicator"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </NavLink>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-logout" onClick={logout}>
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </motion.aside>

      <motion.main
        className="main-content"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        key={location.pathname}
      >
        {children}
      </motion.main>
    </div>
  )
}
