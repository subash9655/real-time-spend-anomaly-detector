import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { WsProvider } from './contexts/WsContext';
import { Layout } from './components/Layout';
import Dashboard from './pages/Dashboard';
import { Anomalies, AnomalyDetail } from './pages/Anomalies';
import Accounts from './pages/Accounts';
import Resources from './pages/Resources';
import Deployments from './pages/Deployments';
import { Workloads } from './pages/Workloads';
import Alerts from './pages/Alerts';
import AuditTrail from './pages/AuditTrail';
import ChangeReview from './pages/ChangeReview';
import { Rollback } from './pages/Rollback';
import { Experiments } from './pages/Experiments';
import { FailureCases } from './pages/FailureCases';
import { Validation } from './pages/Validation';
import { Settings } from './pages/Settings';

export default function App() {
  return (
    <WsProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="anomalies" element={<Navigate to="/anomalies/active" replace />} />
            <Route path="anomalies/active" element={<Anomalies mode="active" />} />
            <Route path="anomalies/history" element={<Anomalies mode="history" />} />
            <Route path="anomalies/:id" element={<AnomalyDetail />} />
            <Route path="accounts" element={<Accounts />} />
            <Route path="resources" element={<Resources />} />
            <Route path="deployments" element={<Deployments />} />
            <Route path="workloads" element={<Workloads />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="audit" element={<AuditTrail />} />
            <Route path="change-review" element={<ChangeReview />} />
            <Route path="rollback" element={<Rollback />} />
            <Route path="experiments" element={<Experiments />} />
            <Route path="failure-cases" element={<FailureCases />} />
            <Route path="validation" element={<Validation />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Router>
    </WsProvider>
  );
}
