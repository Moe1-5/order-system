// Example: src/App.jsx (or your main router file)
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import your page components
import Login from './pages/Login'; // Adjust paths as needed
import Register from './pages/Register';
import MainDashboard from './pages/MainDashboard';
import Orders from './pages/Orders';
import Menu from './pages/Menu';
import QrGenerator from './pages/QrGenerator';
import SiteInfo from './pages/SiteInfo';
import Settings from './pages/Settings';
import BillingPage from './pages/Billing';
// Import the protected route component
import ProtectedRoute from './components/ProtectedRoute';

// --- IMPORT AdminLayout ---
import AdminLayout from './components/AdminLayout'; // Adjust path if necessary

// --- IMPORT NotFound component ---
import NotFound from './pages/NotFound'; // Adjust path if necessary

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes - Wrap with ProtectedRoute */}
        <Route element={<ProtectedRoute />}>
          {/* --- USE AdminLayout HERE --- */}
          <Route element={<AdminLayout />}>
            {/* These routes will render inside AdminLayout's <Outlet /> */}
            <Route path="/dashboard" element={<MainDashboard />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/qr-settings" element={<QrGenerator />} />
            <Route path="/site-info" element={<SiteInfo />} />
            <Route path="/settings" element={<Settings />} />
            {/* Add other protected routes here */}

            {/* Optional: Redirect root path to dashboard if logged in */}
            {/* Make sure this is also within a layout if needed, or adjust */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>
          {/* --- END AdminLayout WRAPPER --- */}
        </Route>

        {/* Fallback Route for Not Found (404) */}
        {/* This route will match any path not matched above */}
        <Route path="*" element={<NotFound />} />

      </Routes>
    </Router>
  );
}

export default App;
