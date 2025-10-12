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
// import BillingPage from './pages/Billing';
// Import the protected route component
import ProtectedRoute from './components/ProtectedRoute';

// --- IMPORT AdminLayout ---
import AdminLayout from './components/AdminLayout'; // Adjust path if necessary

// --- IMPORT NotFound component ---
import NotFoundComponent from './pages/NotFound'; // Adjust path if necessary
import RestrictedRegister from './pages/RestrictedRegister';



function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/Admin-register" element={<RestrictedRegister />} />

        {/* Protected Routes - Wrap with ProtectedRoute */}
        <Route element={<ProtectedRoute />}>
          {/* --- USE AdminLayout HERE --- */}
          <Route element={<AdminLayout />}>
            {/* These routes will render inside AdminLayout's <Outlet /> */}
            <Route path="/dashboard" element={<MainDashboard />} />
            {/* <Route path="/billing" element={<BillingPage />} /> */}
            <Route path="/orders" element={<Orders />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/qr-settings" element={<QrGenerator />} />
            <Route path="/site-info" element={<SiteInfo />} />
            <Route path="/settings" element={<Settings />} />

            {/* Optional: Redirect root path to dashboard if logged in */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>

        </Route>

        {/* Fallback Route for Not Found (404) */}
        <Route path="*" element={<NotFoundComponent />} />

      </Routes>
    </Router>
  );
}

export default App;
