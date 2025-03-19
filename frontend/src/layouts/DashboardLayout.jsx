// layouts/DashboardLayout.jsx
import React, { useState } from 'react';
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Trash2,
    MapPin,
    BarChart3,
    Settings,
    User,
    Menu,
    X,
    Bell,
    LogOut,
    ChevronDown,
    Wifi
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from 'react-query';
import apiService from '../services/api';
import Logo from '../components/ui/Logo';

const Sidebar = ({ isMobile = false, isOpen, onClose }) => {
    const { pathname } = useLocation();
    const { user, isAdmin } = useAuth();

    // Define navigation items
    const navItems = [
        {
            icon: <LayoutDashboard className="h-5 w-5" />,
            label: 'Панель Мониторинга',
            path: '/',
        },
        {
            icon: <Trash2 className="h-5 w-5" />,
            label: 'Управление контейнерами',
            path: '/admin/bins',
            adminOnly: true,
        },
        {
            icon: <Trash2 className="h-5 w-5" />,
            label: 'Контейнеры',
            path: '/bins',
        },
        {
            icon: <MapPin className="h-5 w-5" />,
            label: 'Карта',
            path: '/map',
        },
        {
            icon: <BarChart3 className="h-5 w-5" />,
            label: 'Отчеты',
            path: '/reports',
        },
        {
            icon: <Settings className="h-5 w-5" />,
            label: 'Настройки',
            path: '/settings',
            adminOnly: true,
        },
    ];

    // Filter admin-only items if user is not admin
    const filteredNavItems = navItems.filter(item => {
        if (item.adminOnly && !isAdmin) return false;
        return true;
    });

    return (
        <div
            className={`
        ${isMobile ? 'fixed inset-y-0 left-0 z-50 w-64 transform shadow-lg transition-transform duration-300 ease-in-out' : 'sticky top-0 h-screen w-64'}
        ${isMobile && !isOpen ? '-translate-x-full' : 'translate-x-0'}
        flex flex-col bg-white border-r border-slate-200
      `}
        >
            {/* Mobile close button */}
            {isMobile && (
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-500"
                >
                    <X className="h-5 w-5" />
                </button>
            )}

            {/* Logo */}
            <div className="flex h-16 items-center border-b border-slate-200 px-6">
                <Link to="/" className="flex items-center space-x-2">
                    <Logo size={32} />
                    <span className="text-lg font-semibold text-slate-800">MedWaste</span>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-4">
                <ul className="space-y-1">
                    {filteredNavItems.map((item) => (
                        <li key={item.path}>
                            <NavLink
                                to={item.path}
                                onClick={isMobile ? onClose : undefined}
                                className={({ isActive }) => `
                  flex items-center space-x-3 rounded-lg px-4 py-2.5 text-sm font-medium
                  ${isActive
                                    ? 'bg-teal-50 text-teal-700'
                                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'}
                `}
                                end={item.path === '/'}
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* User profile section */}
            <div className="border-t border-slate-200 p-4">
                <NavLink
                    to="/profile"
                    onClick={isMobile ? onClose : undefined}
                    className={({ isActive }) => `
            flex items-center space-x-3 rounded-lg px-4 py-2.5 text-sm font-medium
            ${isActive
                        ? 'bg-teal-50 text-teal-700'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'}
          `}
                >
                    <User className="h-5 w-5" />
                    <span>Мой Профиль</span>
                </NavLink>
            </div>

            {/* System status */}
            <div className="border-t border-slate-200 p-4">
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm">
                    <div className="flex items-center space-x-2">
                        <Wifi className="h-4 w-4 text-emerald-500" />
                        <span className="font-medium text-slate-700">Система активна</span>
                    </div>
                    <span className="text-xs text-slate-500">v1.0.0</span>
                </div>
            </div>
        </div>
    );
};

const Header = ({ onMenuClick }) => {
    const { user, logout } = useAuth();
    const [showUserMenu, setShowUserMenu] = useState(false);

    // Fetch alert bins count
    const { data: alertBinsData } = useQuery(
        'alertBinsCount',
        () => apiService.wasteBins.getOverfilled(),
        {
            refetchInterval: 60000, // 1 minute
            staleTime: 30000, // 30 seconds
            select: (data) => data.data.results || 0,
        }
    );

    // Alert count
    const alertCount = alertBinsData || 0;

    return (
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
            {/* Left section: Mobile menu & Title */}
            <div className="flex items-center">
                <button
                    onClick={onMenuClick}
                    className="mr-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-500 md:hidden"
                >
                    <Menu className="h-5 w-5" />
                </button>
            </div>

            {/* Right section: Notifications & User */}
            <div className="flex items-center space-x-4">
                {/* Notifications */}
                <div className="relative">
                    <Link
                        to="/bins?filter=alert"
                        className="flex items-center rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-500"
                    >
                        <Bell className="h-5 w-5" />
                        {alertCount > 0 && (
                            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                {alertCount > 9 ? '9+' : alertCount}
              </span>
                        )}
                    </Link>
                </div>

                {/* User menu */}
                <div className="relative">
                    <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="flex items-center space-x-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                    >
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-700">
                            {user?.username?.substring(0, 1).toUpperCase() || 'U'}
                        </div>
                        <span className="hidden sm:inline-block">{user?.username || 'Пользователь'}</span>
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                    </button>

                    {/* Dropdown menu */}
                    {showUserMenu && (
                        <div className="absolute right-0 mt-2 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                            <Link
                                to="/profile"
                                className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                onClick={() => setShowUserMenu(false)}
                            >
                                <User className="mr-2 h-4 w-4 text-slate-400" />
                                Мой профиль
                            </Link>
                            <button
                                onClick={() => {
                                    setShowUserMenu(false);
                                    logout();
                                }}
                                className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-slate-50"
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Выйти
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

const DashboardLayout = () => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen bg-slate-50">
            {/* Sidebar for desktop */}
            <div className="hidden md:block">
                <Sidebar />
            </div>

            {/* Mobile sidebar */}
            <Sidebar
                isMobile
                isOpen={isSidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            {/* Backdrop for mobile sidebar */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main content */}
            <div className="flex flex-1 flex-col overflow-hidden">
                <Header onMenuClick={() => setSidebarOpen(true)} />
                <main className="flex-1 overflow-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;