import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { LayoutDashboard, List, LogOut, User } from 'lucide-react';
import TrashBin from "./components/Trashbin";
import ContainersList from "./components/ContainerList";
import { AuthProvider, Login, ProtectedRoute, useAuth } from './components/Auth';

const Navigation = () => {
    const { user, logout } = useAuth();

    if (!user) return null;

    return (
        <nav className="bg-white shadow-sm border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex space-x-8">
                        <Link
                            to="/"
                            className="inline-flex items-center px-1 pt-1 text-sm font-medium text-slate-700 hover:text-slate-900"
                        >
                            <LayoutDashboard className="w-4 h-4 mr-2" />
                            Панель Мониторинга
                        </Link>
                        <Link
                            to="/containers"
                            className="inline-flex items-center px-1 pt-1 text-sm font-medium text-slate-700 hover:text-slate-900"
                        >
                            <List className="w-4 h-4 mr-2" />
                            Контейнеры
                        </Link>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center text-sm text-slate-600">
                            <User className="w-4 h-4 mr-2" />
                            {user.username}
                        </div>
                        <button
                            onClick={logout}
                            className="inline-flex items-center px-3 py-1 text-sm font-medium text-red-600 hover:text-red-700"
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Выйти
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
};

function App() {
    return (
        <Router>
            <AuthProvider>
                <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
                    <Navigation />
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route
                            path="/"
                            element={
                                <ProtectedRoute>
                                    <TrashBin />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/containers"
                            element={
                                <ProtectedRoute>
                                    <ContainersList />
                                </ProtectedRoute>
                            }
                        />
                    </Routes>
                </div>
            </AuthProvider>
        </Router>
    );
}

export default App;