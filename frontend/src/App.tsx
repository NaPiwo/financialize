
import { useState, useEffect } from 'react'
import { Dashboard } from './pages/Dashboard'
import { MainLayout } from './components/layout/MainLayout'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Simulation } from './pages/Simulation'
import { Planning } from './pages/Planning'
import { Settings } from './pages/Settings'
import { Tracker } from './pages/Tracker'
import { OnboardingWizard } from './components/features/OnboardingWizard'
import { useFinancialStore } from './store'
import { apiClient } from './api/client'

function App() {
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem('financialize-onboarded') === 'true')
  const [checking, setChecking] = useState(onboarded) // only check if flag says onboarded
  const incomes = useFinancialStore(s => s.incomes)

  // If the onboarding flag is set but the app has no real data
  // (e.g. DB was deleted, or fresh install with stale localStorage),
  // re-trigger the wizard.
  useEffect(() => {
    if (!onboarded || !checking) return

    const verify = async () => {
      try {
        const res = await apiClient.get('/tracker/accounts')
        const hasAccounts = Array.isArray(res.data) && res.data.length > 0
        const hasIncomes = incomes.length > 0

        // If both client-side and backend are empty, user needs onboarding
        if (!hasAccounts && !hasIncomes) {
          localStorage.removeItem('financialize-onboarded')
          setOnboarded(false)
        }
      } catch {
        // Backend not reachable yet — skip check, don't block the app
      } finally {
        setChecking(false)
      }
    }
    verify()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Show a brief blank screen while verifying (only on startup, <200ms)
  if (checking) return null

  if (!onboarded) {
    return (
      <OnboardingWizard onComplete={() => {
        localStorage.setItem('financialize-onboarded', 'true')
        setOnboarded(true)
      }} />
    )
  }

  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tracker" element={<Tracker />} />
          <Route path="/simulation" element={<Simulation />} />
          <Route path="/planning" element={<Planning />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  )
}

export default App
