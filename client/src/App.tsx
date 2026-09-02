import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AppLayout } from './layouts/AppLayout';
import Landing from './pages/Landing';
import Overview from './pages/Overview';
import RecoveryQueue from './pages/RecoveryQueue';
import Transactions from './pages/Transactions';
import RecoveryAgent from './pages/RecoveryAgent';
import RecoveryLab from './pages/RecoveryLab';
import Analytics from './pages/Analytics';
import AuditTrail from './pages/AuditTrail';
import Architecture from './pages/Architecture';
import Settings from './pages/Settings';

export default function App() {
  return (
    <>
      <Toaster
        theme="dark"
        position="top-right"
        toastOptions={{
          style: { background: '#141310', border: '1px solid #242019', color: '#f0e9dc' },
        }}
      />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route element={<AppLayout />}>
          <Route path="/overview" element={<Overview />} />
          <Route path="/queue" element={<RecoveryQueue />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/agent" element={<RecoveryAgent />} />
          <Route path="/lab" element={<RecoveryLab />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/audit" element={<AuditTrail />} />
          <Route path="/architecture" element={<Architecture />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
