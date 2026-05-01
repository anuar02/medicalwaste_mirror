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
    X,
    Truck,
    Bell,
    UserCheck,
    Users as UsersIcon,
    Building2,
    Factory,
    PackageX,
    Navigation as NavigationIcon,
    LogOut,
    ChevronDown,
    Route as RouteIcon,
    ClipboardCheck,
    Activity,
    Heart,
    Wifi,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import Logo from '../components/ui/Logo';

// ============================================================================
// UTILITIES
// ============================================================================

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
    const value =
        data?.data?.results ??
        data?.data?.count ??
        data?.data?.total ??
        data?.data?.length ??
        0;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : 0;
};

// ============================================================================
// NAV CONFIG
// ============================================================================

const buildNavItems = (t, hasActiveSession) => ([
    {
        icon: <LayoutDashboard className="h-4 w-4" />,
        label: t('nav.dashboard'),
        path: '/',
        hideForDriver: true,
        bottomNav: true,
    },
    {
        icon: <Trash2 className="h-4 w-4" />,
        label: t('nav.bins'),
        path: '/bins',
        hideForDriver: true,
    },
    {
        icon: <MapPin className="h-4 w-4" />,
        label: t('nav.map'),
        path: '/map',
        hideForDriver: true,
        bottomNav: true,
    },
    {
        icon: <BarChart3 className="h-4 w-4" />,
        label: t('nav.reports'),
        path: '/reports',
        hideForDriver: true,
        bottomNav: true,
    },
    {
        icon: <PackageX className="h-4 w-4" />,
        label: 'Неназначенные',
        path: '/admin/unassigned-bins',
        adminOnly: true,
    },
    {
        icon: <User className="h-4 w-4" />,
        label: t('nav.beDriver'),
        path: '/driver/register',
        userOnly: true,
    },
    {
        icon: <Truck className="h-4 w-4" />,
        label: 'Сбор',
        path: '/driver/collection',
        driverOnly: true,
        showBadge: hasActiveSession,
        bottomNav: true,
    },
    {
        icon: <RouteIcon className="h-4 w-4" />,
        label: 'Маршруты',
        path: '/routes',
        supervisorOnly: true,
        bottomNav: true,
    },
    {
        icon: <RouteIcon className="h-4 w-4" />,
        label: 'Маршрут на сегодня',
        path: '/driver/route',
        driverOnly: true,
        bottomNav: true,
    },
    {
        icon: <ClipboardCheck className="h-4 w-4" />,
        label: 'Акты передачи',
        path: '/handoffs',
        supervisorOnly: true,
        bottomNav: true,
    },
    {
        icon: <Activity className="h-4 w-4" />,
        label: 'Активные Сессии',
        path: '/driver/dashboard',
        supervisorOnly: true,
    },
    {
        icon: <UsersIcon className="h-4 w-4" />,
        label: 'Пользователи',
        path: '/admin/users',
        adminOnly: true,
    },
    {
        icon: <UserCheck className="h-4 w-4" />,
        label: t('nav.drivers'),
        path: '/admin/drivers',
        adminOnly: true,
    },
    {
        icon: <Building2 className="h-4 w-4" />,
        label: t('nav.medicalCompanies'),
        path: '/admin/companies',
        adminOnly: true,
    },
    {
        icon: <Factory className="h-4 w-4" />,
        label: 'Заводы утилизации',
        path: '/admin/incineration-plants',
        supervisorOnly: true,
    },
    {
        icon: <NavigationIcon className="h-4 w-4" />,
        label: 'История маршрутов',
        path: '/route-history',
        hideForDriver: true,
    },
    {
        icon: <Truck className="h-4 w-4" />,
        label: t('nav.drivers'),
        path: '/driver/dashboard',
        driverOnly: true,
        bottomNav: true,
    },
    {
        icon: <Settings className="h-4 w-4" />,
        label: t('nav.settings'),
        path: '/settings',
        adminOnly: true,
    },
    {
        icon: <Heart className="h-4 w-4" />,
        label: 'Здоровье Устройств',
        path: '/device-health',
        adminOnly: true,
    },
]);

const filterNavItems = (items, { isAdmin, isSupervisor, userRole, isDriver }) => (
    items.filter((item) => {
        if (item.adminOnly && !isAdmin) return false;
        if (item.supervisorOnly && !isSupervisor) return false;
        if (item.userOnly && (isAdmin || isSupervisor || userRole === 'driver')) return false;
        if (item.driverOnly && !isDriver) return false;
        if (item.driverOrAdmin && !(isDriver || isAdmin)) return false;
        if (item.hideForDriver && isDriver) return false;
        return true;
    })
);

// ============================================================================
// SIDEBAR
// ============================================================================

const Sidebar = React.memo(function Sidebar({
    isMobile = false,
    isOpen = false,
    onClose = () => {},
    isCollapsed = true,
}) {
    const { t } = useTranslation();
    const { user, isAdmin, isSupervisor } = useAuth();
    const { pathname } = useLocation();
    const [isHovered, setIsHovered] = useState(false);

    const isDriver = user?.role === 'driver' && user?.verificationStatus === 'approved';

    const { data: activeSessionData } = useQuery({
        queryKey: ['activeCollectionSession'],
        queryFn: () => apiService.collections.getActive(),
        enabled: isDriver,
        refetchInterval: 30_000,
        retry: false,
    });

    const hasActiveSession = activeSessionData?.data?.data?.session?.status === 'active';

    const navItems = useMemo(
        () => buildNavItems(t, hasActiveSession),
        [t, hasActiveSession]
    );

    const filteredNavItems = useMemo(() => {
        return filterNavItems(navItems, {
            isAdmin,
            isSupervisor,
            userRole: user?.role,
            isDriver,
        });
    }, [navItems, isAdmin, isSupervisor, user?.role, isDriver]);

    const shouldExpand = !isMobile && (isCollapsed ? isHovered : true);

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
                    ? 'fixed inset-y-0 left-0 z-50 w-64 shadow-xl'
                    : `sticky top-0 h-screen ${shouldExpand ? 'w-64' : 'w-16'}`
                }
                ${isMobile && !isOpen ? '-translate-x-full' : 'translate-x-0'}
                flex flex-col bg-white border-r border-slate-200
                transition-all duration-300 ease-in-out overflow-hidden
            `}
            aria-label={t('nav.sidebar')}
            aria-expanded={shouldExpand}
        >
            {/* Mobile close */}
            {isMobile && (
                <button
                    onClick={onClose}
                    className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors z-10"
                    aria-label={t('nav.closeSidebar')}
                >
                    <X className="h-4 w-4" />
                </button>
            )}

            {/* Logo */}
            <div className="flex h-14 items-center border-b border-slate-200 px-3 flex-shrink-0">
                <Link to="/" className="flex items-center gap-2.5 min-w-0" aria-label={t('nav.home')}>
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center">
                        <Logo size={18} />
                    </div>
                    <span
                        className={`
                            font-chakra font-semibold text-[11px] tracking-widest uppercase text-teal-700
                            whitespace-nowrap overflow-hidden transition-[opacity,max-width] duration-200
                            ${shouldExpand || isMobile ? 'opacity-100 max-w-[10rem]' : 'opacity-0 max-w-0'}
                        `}
                    >
                        MedicalWaste
                    </span>
                </Link>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-3 px-2">
                <ul className="space-y-0.5">
                    {filteredNavItems.map((item) => (
                        <li key={item.path}>
                            <NavLink
                                to={item.path}
                                onClick={isMobile ? onClose : undefined}
                                className={({ isActive }) =>
                                    `relative flex items-center rounded-lg py-2.5 text-xs font-medium
                                    transition-all duration-150
                                    ${shouldExpand || isMobile ? 'gap-3 px-3' : 'justify-center px-2'}
                                    ${isActive
                                        ? 'bg-teal-50 text-teal-700 nav-active-bar'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                    }`
                                }
                                end={item.path === '/'}
                                title={!shouldExpand && !isMobile ? item.label : ''}
                            >
                                <div className="relative flex-shrink-0">
                                    {item.icon}
                                    {item.showBadge && (
                                        <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2" aria-hidden="true">
                                            <span className="animate-beacon absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500" />
                                        </span>
                                    )}
                                </div>
                                {(shouldExpand || isMobile) && (
                                    <span className="whitespace-nowrap">{item.label}</span>
                                )}
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* Profile */}
            <div className="border-t border-slate-200 px-2 py-2 flex-shrink-0">
                <NavLink
                    to="/profile"
                    onClick={isMobile ? onClose : undefined}
                    className={({ isActive }) =>
                        `relative flex items-center rounded-lg py-2.5 text-xs font-medium transition-all duration-150
                        ${shouldExpand || isMobile ? 'gap-3 px-3' : 'justify-center px-2'}
                        ${isActive
                            ? 'bg-teal-50 text-teal-700 nav-active-bar'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`
                    }
                    title={!shouldExpand && !isMobile ? 'Мой Профиль' : ''}
                >
                    <User className="h-4 w-4 flex-shrink-0" />
                    {(shouldExpand || isMobile) && <span className="whitespace-nowrap">Мой Профиль</span>}
                </NavLink>
            </div>

            {/* System status */}
            {shouldExpand && (
                <div className="border-t border-slate-200 px-3 py-3 flex-shrink-0">
                    <div className="flex items-center justify-between px-2 py-2 rounded-lg bg-slate-50 border border-slate-200">
                        <div className="flex items-center gap-2">
                            <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                            <span className="font-chakra text-[10px] tracking-wider uppercase text-slate-600">
                                {t('app.systemActive')}
                            </span>
                        </div>
                        <span className="font-data text-[9px] text-slate-400">
                            {t('app.version')}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
});

// ============================================================================
// HEADER
// ============================================================================

const Header = React.memo(function Header({ showMenuButton, onMenuClick }) {
    const { user, logout } = useAuth();
    const { t, i18n } = useTranslation();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const menuRef = useRef(null);

    useOnClickOutside(menuRef, () => setShowUserMenu(false));

    useEffect(() => {
        const handleKeyDown = (e) => { if (e.key === 'Escape') setShowUserMenu(false); };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const { data: alertBinsData } = useQuery({
        queryKey: ['alertBinsCount'],
        queryFn: () => apiService.wasteBins.getOverfilled(),
        refetchInterval: 60_000,
        staleTime: 30_000,
    });

    const alertCount = safeCount(alertBinsData);

    const handleLogout = () => { setShowUserMenu(false); logout(); };
    const handleLanguageChange = (e) => i18n.changeLanguage(e.target.value);

    const initial = (user?.username?.substring(0, 1) || 'U').toUpperCase();

    return (
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-5">
            <div className="flex items-center">
                {showMenuButton && (
                    <button
                        onClick={onMenuClick}
                        className="mr-3 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors md:hidden"
                        aria-label={t('nav.openSidebar')}
                    >
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M3 5h14a1 1 0 010 2H3a1 1 0 010-2zm0 4h14a1 1 0 010 2H3a1 1 0 010-2zm0 4h14a1 1 0 010 2H3a1 1 0 010-2z" clipRule="evenodd" />
                        </svg>
                    </button>
                )}
            </div>

            <div className="flex items-center gap-3">
                {/* Alert badge */}
                <Link
                    to="/bins?filter=alert"
                    className="relative flex items-center rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    aria-label={t('header.alerts')}
                >
                    <Bell className="h-4 w-4" />
                    {alertCount > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                            {alertCount > 9 ? '9+' : alertCount}
                        </span>
                    )}
                </Link>

                {/* User menu */}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setShowUserMenu((p) => !p)}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 transition-all"
                        aria-haspopup="menu"
                        aria-expanded={showUserMenu}
                    >
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-[10px] font-chakra font-semibold text-teal-700">
                            {initial}
                        </div>
                        <span className="hidden sm:inline-block">{user?.username || t('header.user')}</span>
                        <ChevronDown className="h-3 w-3 text-slate-400" />
                    </button>

                    {showUserMenu && (
                        <div
                            role="menu"
                            className="absolute right-0 mt-2 w-44 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden"
                        >
                            <Link
                                to="/profile"
                                className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-teal-700 transition-colors"
                                onClick={() => setShowUserMenu(false)}
                                role="menuitem"
                            >
                                <User className="h-3.5 w-3.5 text-slate-400" />
                                {t('nav.profile')}
                            </Link>
                            <div className="h-px bg-slate-100 mx-2" />
                            <button
                                onClick={handleLogout}
                                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-xs text-red-500 hover:bg-red-50 transition-colors"
                                role="menuitem"
                            >
                                <LogOut className="h-3.5 w-3.5" />
                                {t('header.logout')}
                            </button>
                        </div>
                    )}
                </div>

                {/* Language */}
                <select
                    aria-label="Language"
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:border-teal-300 transition-colors cursor-pointer"
                    value={i18n.language?.startsWith('ru') ? 'ru' : 'en'}
                    onChange={handleLanguageChange}
                >
                    <option value="ru">RU</option>
                    <option value="en">EN</option>
                </select>
            </div>
        </header>
    );
});

// ============================================================================
// BOTTOM NAV
// ============================================================================

const BottomNav = React.memo(function BottomNav() {
    const { t } = useTranslation();
    const { user, isAdmin, isSupervisor } = useAuth();
    const { pathname } = useLocation();

    const isDriver = user?.role === 'driver' && user?.verificationStatus === 'approved';
    const isIncinerator = user?.role === 'incinerator' || user?.role === 'incinerator_operator';

    const { data: activeSessionData } = useQuery({
        queryKey: ['activeCollectionSession'],
        queryFn: () => apiService.collections.getActive(),
        enabled: isDriver,
        refetchInterval: 30_000,
        retry: false,
    });

    const hasActiveSession = activeSessionData?.data?.data?.session?.status === 'active';

    const navItems = useMemo(() => buildNavItems(t, hasActiveSession), [t, hasActiveSession]);

    const filteredNavItems = useMemo(() => {
        return filterNavItems(navItems, {
            isAdmin,
            isSupervisor,
            userRole: user?.role,
            isDriver,
        }).filter((item) => item.bottomNav);
    }, [navItems, isAdmin, isSupervisor, user?.role, isDriver]);

    if (!isDriver && !isIncinerator) return null;
    if (pathname.startsWith('/driver/collection')) return null;
    if (filteredNavItems.length + 1 > 5) return null;

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white md:hidden">
            <div className="flex items-center justify-around gap-1 px-2 py-2">
                {filteredNavItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex flex-1 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-[10px] font-medium transition-colors ${
                                isActive ? 'text-teal-700 bg-teal-50' : 'text-slate-500 hover:text-teal-600'
                            }`
                        }
                        end={item.path === '/'}
                    >
                        <div className="relative">
                            {item.icon}
                            {item.showBadge && (
                                <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2" aria-hidden="true">
                                    <span className="animate-beacon absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500" />
                                </span>
                            )}
                        </div>
                        <span className="truncate">{item.label}</span>
                    </NavLink>
                ))}
                <NavLink
                    to="/profile"
                    className={({ isActive }) =>
                        `flex flex-1 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-[10px] font-medium transition-colors ${
                            isActive ? 'text-teal-700 bg-teal-50' : 'text-slate-500 hover:text-teal-600'
                        }`
                    }
                >
                    <User className="h-4 w-4" />
                    <span className="truncate">Профиль</span>
                </NavLink>
            </div>
        </nav>
    );
});

// ============================================================================
// LAYOUT
// ============================================================================

const DashboardLayout = () => {
    const { t } = useTranslation();
    const { user, isAdmin, isSupervisor } = useAuth();
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    const isDriver = user?.role === 'driver' && user?.verificationStatus === 'approved';
    const isIncinerator = user?.role === 'incinerator' || user?.role === 'incinerator_operator';

    const bottomNavItems = useMemo(() => {
        const items = buildNavItems(t, false);
        return filterNavItems(items, { isAdmin, isSupervisor, userRole: user?.role, isDriver })
            .filter((item) => item.bottomNav);
    }, [t, isAdmin, isSupervisor, user?.role, isDriver]);

    const showBottomNav = (isDriver || isIncinerator) && bottomNavItems.length + 1 <= 5;

    return (
        <div className="flex h-screen bg-slate-50">
            {/* Desktop sidebar */}
            <div className="hidden md:block">
                <Sidebar
                    isCollapsed={isCollapsed}
                    onToggleCollapse={() => setIsCollapsed((p) => !p)}
                />
            </div>

            {!showBottomNav && (
                <>
                    <div id="mobile-sidebar" className="md:hidden">
                        <Sidebar
                            isMobile
                            isOpen={isSidebarOpen}
                            onClose={() => setSidebarOpen(false)}
                        />
                    </div>
                    {isSidebarOpen && (
                        <div
                            className="fixed inset-0 z-40 bg-black/50 md:hidden"
                            onClick={() => setSidebarOpen(false)}
                            aria-hidden="true"
                        />
                    )}
                </>
            )}

            <div className="flex flex-1 flex-col overflow-hidden">
                <Header showMenuButton={!showBottomNav} onMenuClick={() => setSidebarOpen(true)} />
                <main className={`flex-1 overflow-auto ${showBottomNav ? 'pb-20' : ''} md:pb-0`}>
                    <Outlet />
                </main>
                {showBottomNav && <BottomNav />}
            </div>
        </div>
    );
};

export default DashboardLayout;
