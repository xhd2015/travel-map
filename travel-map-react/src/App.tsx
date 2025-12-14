import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PlanList from './PlanList';
import PlanDetail from './PlanDetail';
import PlanMap from './PlanMap';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PlanList />} />
        <Route path="/plan/:planId" element={<PlanDetail />} />
        <Route path="/plan/:planId/map" element={<PlanMap />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
