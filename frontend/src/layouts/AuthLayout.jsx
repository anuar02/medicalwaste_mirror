// layouts/AuthLayout.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AuthLayout = () => {
    const { isAuthenticated, loading } = useAuth();

    if (isAuthenticated && !loading) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 to-teal-50 flex items-center justify-center p-4">
            <div className="w-full max-w-5xl">
                <Outlet />
            </div>
            <div className="fixed bottom-4 left-0 right-0 text-center text-xs text-slate-400 pointer-events-none">
                &copy; {new Date().getFullYear()} MedicalWaste.kz
            </div>
        </div>
    );
};

export default AuthLayout;
