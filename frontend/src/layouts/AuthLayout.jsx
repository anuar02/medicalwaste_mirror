// layouts/AuthLayout.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Logo from '../components/ui/Logo';
import { useAuth } from '../contexts/AuthContext';

const AuthLayout = () => {
    const { isAuthenticated, loading } = useAuth();

    // If user is already authenticated, redirect to dashboard
    if (isAuthenticated && !loading) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50">
            <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
                {/* Logo and branding */}
                <div className="mb-8 text-center">
                    <Logo size={48} className="mx-auto" />
                    <h1 className="mt-4 text-2xl font-bold text-slate-800">
                        Система Мониторинга Медицинских Отходов
                    </h1>
                    <p className="mt-2 text-sm text-slate-500">
                        Вход в панель управления и мониторинга
                    </p>
                </div>

                {/* Content from child routes */}
                <div className="w-full max-w-md">
                    <Outlet />
                </div>

                {/* Footer */}
                <div className="mt-8 text-center text-xs text-slate-500">
                    <p className="mb-2">&copy; {new Date().getFullYear()} МедВейст. Все права защищены.</p>
                    <div className="flex justify-center space-x-4">
                        <a href="#" className="hover:text-teal-600">Условия использования</a>
                        <a href="#" className="hover:text-teal-600">Политика конфиденциальности</a>
                        <a href="#" className="hover:text-teal-600">Помощь</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;