import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import { QueueProvider } from "./contexts/QueueContext";
import { NotificationProvider } from "./contexts/NotificationContext";

import Dashboard from "./pages/Dashboard";
import JoinQueue from "./pages/JoinQueue";
import QueueStatus from "./pages/QueueStatus";
import History from "./pages/History";
import AdminDashboard from "./pages/AdminDashboard";
import ServiceManagement from "./pages/ServiceManagement";
import QueueManagement from "./pages/QueueManagement";
import Login from "./pages/Login";
import Register from "./pages/Register";


function App() {
  return (
    <QueueProvider>
    <NotificationProvider>
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/join" element={<JoinQueue />} />
        <Route path="/status" element={<QueueStatus />} />
        <Route path="/history" element={<History />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/services" element={<ServiceManagement />} />
        <Route path="/admin/queues" element={<QueueManagement />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<h1>404 — Page Not Found</h1>} />
      </Routes>
    </Layout>
    </NotificationProvider>
    </QueueProvider>
  );
}

export default App;