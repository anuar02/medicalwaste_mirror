import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
    Truck,
    Bell,
    UserCheck,
    Building2,
    PackageX,
    Navigation as NavigationIcon,
    LogOut,
    ChevronDown,
    Wifi,
    Cpu,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import apiService from '../services/api';
import Logo from '../components/ui/Logo';

/** Utils **/
const useOnClickOutside = (ref, handler) => {
    useEffect(() => {
        const listener = (event) => {
            if (!ref.current || ref.current.contains(event.target)) return;
            handler(event);
        };
        document.addEventListener('mousedown', listener);
        document.addEventListener('touchstart', listener);
        return () => {
            document.removeEventListener('mousedown', listener);
            document.removeEventListener('touchstart', listener);
        };
    }, [ref, handler]);
};

const safeCount = (data) => {
    // Accepts several common API shapes
    const v = data?.data?.results ?? data?.data?.count ?? data?.data?.total ?? data?.data?.length ?? 0;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : 0;
};

/** Sidebar **/
const Sidebar = React.memo(function Sidebar({
                                                isMobile = false,
                                                isOpen = false,
                                                onClose = () => {},
                                                isCollapsed = true,
                                                onToggleCollapse = () => {},
                                            }) {
    const { t } = useTranslation();
    const { user, isAdmin } = useAuth();
    const [isHovered, setIsHovered] = useState(false);
    const { pathname } = useLocation();

    const isDriver = user?.role === 'driver' && user?.verificationStatus === 'approved';

    // Only drivers poll for active collection session badge
    const { data: activeSessionData } = useQuery({
        queryKey: ['activeCollectionSession'],
        queryFn: () => apiService.collections.getActive(),
        enabled: isDriver,
        refetchInterval: 30_000,
        retry: false,
    });
    const hasActiveSession = activeSessionData?.data?.data?.session?.status === 'active';

    const navItems = useMemo(
        () => [
            { icon: <LayoutDashboard className="h-5 w-5" />, label: t('nav.dashboard'), path: '/' },
            { icon: <Trash2 className="h-5 w-5" />, label: t('nav.bins'), path: '/bins' },
            { icon: <MapPin className="h-5 w-5" />, label: t('nav.map'), path: '/map' },
            { icon: <BarChart3 className="h-5 w-5" />, label: t('nav.reports'), path: '/reports' },
            { icon: <Cpu className="h-5 w-5" />, label: t('nav.devices'), path: '/admin/devices', adminOnly: true },
            { icon: <PackageX className="h-5 w-5" />, label: 'Неназначенные', path: '/admin/unassigned-bins', adminOnly: true },
            // Visible to authenticated non-admin, non-driver users (invite to become driver)
            { icon: <User className="h-5 w-5" />, label: t('nav.beDriver'), path: '/driver/register', userOnly: true },
            // Driver-only collection with live badge
            { icon: <Truck className="h-5 w-5" />, label: 'Сбор', path: '/driver/collection', driverOnly: true, showBadge: hasActiveSession },
            { icon: <UserCheck className="h-5 w-5" />, label: t('nav.driverVerification'), path: '/admin/drivers', adminOnly: true },
            { icon: <Building2 className="h-5 w-5" />, label: t('nav.medicalCompanies'), path: '/admin/companies', adminOnly: true },
            { icon: <NavigationIcon className="h-5 w-5" />, label: 'История маршрутов', path: '/route-history' },
            // Driver dashboard strictly for drivers
            { icon: <Truck className="h-5 w-5" />, label: t('nav.drivers'), path: '/driver/dashboard', driverOnly: true },
            { icon: <Settings className="h-5 w-5" />, label: t('nav.settings'), path: '/settings', adminOnly: true },
        ],
        [t, hasActiveSession]
    );

    const filteredNavItems = useMemo(() => {
        return navItems.filter((item) => {
            if (item.adminOnly && !isAdmin) return false;
            if (item.userOnly && (isAdmin || user?.role === 'driver')) return false;
            if (item.driverOnly && !isDriver) return false;
            if (item.driverOrAdmin && !(isDriver || isAdmin)) return false;
            return true;
        });
    }, [navItems, isAdmin, user?.role, isDriver]);

    const shouldExpand = !isMobile && (isCollapsed ? isHovered : true);

    // Close mobile sidebar on route change automatically
    useEffect(() => {
        if (isMobile && isOpen) onClose();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    return (
        <div
            onMouseEnter={() => !isMobile && isCollapsed && setIsHovered(true)}
            onMouseLeave={() => !isMobile && isCollapsed && setIsHovered(false)}
            className={`
                ${isMobile
                ? 'fixed inset-y-0 left-0 z-50 w-64 shadow-lg'
                : `sticky top-0 h-screen ${shouldExpand ? 'w-64' : 'w-20'}`}
                ${isMobile && !isOpen ? '-translate-x-full' : 'translate-x-0'}
                flex flex-col bg-white border-r border-slate-200
                transition-all duration-300 ease-in-out
            `}
            aria-label={t('nav.sidebar')}
            aria-expanded={shouldExpand}
        >
            {/* Mobile close button */}
            {isMobile && (
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-500 z-10"
                    aria-label={t('nav.closeSidebar')}
                >
                    <X className="h-5 w-5" />
                </button>
            )}

            {/* Logo */}
            <div className="flex h-16 items-center border-b border-slate-200 px-4">
                <Link to="/" className="flex items-center space-x-2" aria-label={t('nav.home')}>
                    <Logo size={32} />
                    <span
                        className={`
                            text-lg font-semibold text-slate-800 whitespace-nowrap overflow-hidden
                            transition-[opacity,max-width] duration-200
                            ${shouldExpand ? 'opacity-100 max-w-[12rem]' : 'opacity-0 max-w-0'}
                        `}
                    >
                        {t('app.brand')}
                    </span>
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
                                className={({ isActive }) =>
                                    `flex items-center rounded-lg py-2.5 text-sm font-medium relative
                                    ${shouldExpand ? 'space-x-3 px-4' : 'px-2'}
                                    ${isMobile ? 'gap-2' : 'px-2'}
                                    ${isActive ? 'bg-teal-50 text-teal-700' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'}`
                                }
                                end={item.path === '/'}
                                title={!shouldExpand || isMobile ? item.label : ''}
                            >
                                <div className="relative flex-shrink-0">
                                    {item.icon}
                                    {item.showBadge && (
                                        <span className="absolute -right-1 -top-1 flex h-2 w-2" aria-hidden="true">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                                        </span>
                                    )}
                                </div>
                                {(shouldExpand || isMobile) && <span className="whitespace-nowrap">{item.label}</span>}
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* Profile shortcut */}
            <div className="border-t border-slate-200 p-4">
                <NavLink
                    to="/profile"
                    onClick={isMobile ? onClose : undefined}
                    className={({ isActive }) =>
                        `flex items-center gap-2 rounded-lg py-2.5 text-sm font-medium px-3
                        ${isActive ? 'bg-teal-50 text-teal-700' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'}`
                    }
                    title={!shouldExpand ? 'Мой Профиль' : ''}
                >
                    <User className="h-5 w-5 flex-shrink-0" />
                    {(shouldExpand || isMobile) && <span className="whitespace-nowrap">Мой Профиль</span>}
                </NavLink>
            </div>

            {/* System status */}
            {shouldExpand && (
                <div className="border-t border-slate-200 p-4">
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm">
                        <div className="flex items-center space-x-2">
                            <Wifi className="h-4 w-4 text-emerald-500" />
                            <span className="font-medium text-slate-700">{t('app.systemActive')}</span>
                        </div>
                        <span className="text-xs text-slate-500">{t('app.version')}</span>
                    </div>
                </div>
            )}
        </div>
    );
});

/** Header **/
const Header = React.memo(function Header({ onMenuClick }) {
    const { user, logout } = useAuth();
    const { t, i18n } = useTranslation();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const menuRef = useRef(null);

    // Close on outside click / Esc
    useOnClickOutside(menuRef, () => setShowUserMenu(false));
    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && setShowUserMenu(false);
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // Overfilled bins / alerts
    const { data: alertBinsData } = useQuery({
        queryKey: ['alertBinsCount'],
        queryFn: () => apiService.wasteBins.getOverfilled(),
        refetchInterval: 60_000,
        staleTime: 30_000,
    });
    const alertCount = safeCount(alertBinsData);

    return (
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
            <div className="flex items-center">
                <button
                    onClick={onMenuClick}
                    className="mr-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-500 md:hidden"
                    aria-label={t('nav.openSidebar')}
                    aria-controls="mobile-sidebar"
                >
                    <Menu className="h-5 w-5" />
                </button>
            </div>

            <div className="flex items-center space-x-4">
                <div className="relative">
                    <Link
                        to="/bins?filter=alert"
                        className="flex items-center rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-500"
                        aria-label={t('header.alerts')}
                        title={t('header.alerts')}
                    >
                        <Bell className="h-5 w-5" />
                        {alertCount > 0 && (
                            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                                {alertCount > 9 ? '9+' : alertCount}
                            </span>
                        )}
                    </Link>
                </div>

                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setShowUserMenu((s) => !s)}
                        className="flex items-center space-x-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                        aria-haspopup="menu"
                        aria-expanded={showUserMenu}
                    >
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-700">
                            {(user?.username?.substring(0, 1) || 'U').toUpperCase()}
                        </div>
                        <span className="hidden sm:inline-block">{user?.username || t('header.user')}</span>
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                    </button>

                    {showUserMenu && (
                        <div role="menu" className="absolute right-0 mt-2 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                            <Link
                                to="/profile"
                                className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                onClick={() => setShowUserMenu(false)}
                                role="menuitem"
                            >
                                <User className="mr-2 h-4 w-4 text-slate-400" />
                                {t('nav.profile')}
                            </Link>
                            <button
                                onClick={() => {
                                    setShowUserMenu(false);
                                    logout();
                                }}
                                className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-slate-50"
                                role="menuitem"
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                {t('header.logout')}
                            </button>
                        </div>
                    )}
                </div>

                <div>
                    <select
                        aria-label="Language"
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
                        value={i18n.language?.startsWith('ru') ? 'ru' : 'en'}
                        onChange={(e) => i18n.changeLanguage(e.target.value)}
                    >
                        <option value="ru">RU</option>
                        <option value="en">EN</option>
                    </select>
                </div>
            </div>
        </header>
    );
});

/** Layout wrapper **/
const DashboardLayout = () => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(true);

    return (
        <div className="flex h-screen bg-slate-50">
            {/* Desktop sidebar */}
            <div className="hidden md:block">
                <Sidebar
                    isCollapsed={isCollapsed}
                    onToggleCollapse={() => setIsCollapsed((s) => !s)}
                />
            </div>

            {/* Mobile sidebar */}
            <div id="mobile-sidebar" className="md:hidden">
                <Sidebar isMobile isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
            </div>

            {/* Mobile overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden="true"
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
