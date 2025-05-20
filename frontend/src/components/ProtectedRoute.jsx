import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
    const token = localStorage.getItem('token');

    // Check if the token exists
    const isAuthenticated = !!token; // Convert token string (or null) to boolean

    console.log("ProtectedRoute Check: isAuthenticated =", isAuthenticated); // For debugging

    // If authenticated, render the child route components
    // If not authenticated, redirect to the login page
    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
