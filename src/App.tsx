import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/AppLayout'
import { ChildrenPage } from '@/features/children/ChildrenPage'
import { LoansPage } from '@/features/loans/LoansPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { StatisticsPage } from '@/features/statistics/StatisticsPage'
import { ToysPage } from '@/features/toys/ToysPage'

export default function App() {
  return (
    // Hash routing keeps every screen reachable on static hosting, with no server rewrites.
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<LoansPage />} />
          <Route path="toys" element={<ToysPage />} />
          <Route path="children" element={<ChildrenPage />} />
          <Route path="statistics" element={<StatisticsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
