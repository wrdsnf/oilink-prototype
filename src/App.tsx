import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { SimulatorRunner } from './components/SimulatorRunner';
import Landing from './pages/Landing';
import Home from './pages/Home';
import MapPage from './pages/MapPage';
import Detail from './pages/Detail';
import RoutePage from './pages/RoutePage';
import Handover from './pages/Handover';
import Receipt from './pages/Receipt';
import History from './pages/History';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import About from './pages/About';
import WorkshopView from './pages/WorkshopView';

export default function App() {
  return (
    <BrowserRouter>
      <SimulatorRunner />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/bengkel" element={<WorkshopView />} />
        <Route path="/app" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="peta" element={<MapPage />} />
          <Route path="bengkel/:id" element={<Detail />} />
          <Route path="rute" element={<RoutePage />} />
          <Route path="serah-terima" element={<Handover />} />
          <Route path="bukti/:id" element={<Receipt />} />
          <Route path="riwayat" element={<History />} />
          <Route path="notifikasi" element={<Notifications />} />
          <Route path="pengaturan" element={<Settings />} />
          <Route path="tentang" element={<About />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
