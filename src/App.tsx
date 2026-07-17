import { HashRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { ProductsPage } from './pages/ProductsPage'
import { InventoryPage } from './pages/InventoryPage'
import { PurchasesPage } from './pages/PurchasesPage'
import { SalesPage } from './pages/SalesPage'
import { FinancesPage } from './pages/FinancesPage'
import { DistributorsPage } from './pages/DistributorsPage'
import { AreasPage } from './pages/AreasPage'
import './App.css'

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: 'var(--radius)',
              background: 'var(--bg)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-md)',
              fontSize: '0.875rem',
            },
            success: {
              iconTheme: { primary: '#22c55e', secondary: '#fefefe' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#fefefe' },
            },
          }}
        />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/productos" element={<ProductsPage />} />
                    <Route path="/inventario" element={<InventoryPage />} />
                    <Route path="/compras" element={<PurchasesPage />} />
                    <Route path="/ventas" element={<SalesPage />} />
                    <Route path="/finanzas" element={<FinancesPage />} />
                    <Route path="/distribuidores" element={<DistributorsPage />} />
                    <Route path="/areas" element={<AreasPage />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </HashRouter>
  )
}

export default App
