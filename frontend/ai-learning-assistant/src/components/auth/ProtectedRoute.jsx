import React from 'react'
import AppLayout from "../layout/AppLayout"
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = () => {
    const {isAuthenticated, loading}= useAuth()
    

    if (loading) {
        return <div>Loading...</div>
    }
    return isAuthenticated ? (
        <AppLayout>
            <Outlet />
        </AppLayout>
    ) : (
        <Navigate to="/login" replace />
    )
}

export default ProtectedRoute