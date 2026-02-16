
import { useState } from 'react'
import { Dashboard } from './pages/Dashboard'
import { MainLayout } from './components/layout/MainLayout'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Simulation } from './pages/Simulation'
import { Planning } from './pages/Planning'
import { Settings } from './pages/Settings'
import { Tracker } from './pages/Tracker'
import { OnboardingWizard } from './components/features/OnboardingWizard'

function App() {
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem('financialize-onboarded') === 'true')

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
