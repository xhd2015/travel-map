import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PlanList from './PlanList';
import PlanDetail from './PlanDetail';
import DestinationDetail from './DestinationDetail';
import PlanMap from './PlanMap';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PlanList />} />
        <Route path="/plans/:planId" element={<PlanDetail />} />
        <Route path="/plans/:planId/destinations/:destId" element={<DestinationDetail />} />
        <Route path="/plans/:planId/destinations/:destId/map" element={<PlanMap />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
