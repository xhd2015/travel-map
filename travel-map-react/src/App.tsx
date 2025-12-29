import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PlanList from './PlanList';
import PlanDetail from './PlanDetail';
import DestinationDetail from './DestinationDetail';
import PlanMap from './PlanMap';
import { APP_BASE } from './api';
import { GlobalErrorProvider } from './context/GlobalErrorContext';
import RootLayout from './layout/RootLayout';

function App() {
  return (
    <GlobalErrorProvider>
      <Router basename={APP_BASE}>
        <Routes>
          <Route element={<RootLayout />}>
            <Route path="/" element={<PlanList />} />
            <Route path="/plans/:planId" element={<PlanDetail />} />
            <Route path="/plans/:planId/destinations/:destId" element={<DestinationDetail />} />
            <Route path="/plans/:planId/destinations/:destId/map" element={<PlanMap />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Router>
    </GlobalErrorProvider>
  );
}

export default App;
