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
    Building2,
    Factory,
    PackageX,
    Navigation as NavigationIcon,
    LogOut,
    ChevronDown,
    Wifi,
    Heart,
    Route as RouteIcon,
    ClipboardCheck,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import Logo from '../components/ui/Logo';

// ============================================================================
// UTILITY HOOKS & FUNCTIONS
// ============================================================================

/**
 * Hook to detect clicks outside a referenced element
 */
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

/**
 * Safely extract count from various API response shapes
 */
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
// SIDEBAR COMPONENT
// ============================================================================

const buildNavItems = (t, hasActiveSession) => ([
    {
        icon: <LayoutDashboard className="h-5 w-5" />,
        label: t('nav.dashboard'),
        path: '/',
        hideForDriver: true,
        bottomNav: true,
    },
    {
        icon: <Trash2 className="h-5 w-5" />,
        label: t('nav.bins'),
        path: '/bins',
        hideForDriver: true,
    },
    {
        icon: <MapPin className="h-5 w-5" />,
        label: t('nav.map'),
        path: '/map',
        hideForDriver: true,
        bottomNav: true,
    },
    {
        icon: <BarChart3 className="h-5 w-5" />,
        label: t('nav.reports'),
        path: '/reports',
        hideForDriver: true,
        bottomNav: true,
    },
    {
        icon: <PackageX className="h-5 w-5" />,
        label: 'Неназначенные',
        path: '/admin/unassigned-bins',
        adminOnly: true,
    },
    {
        icon: <User className="h-5 w-5" />,
        label: t('nav.beDriver'),
        path: '/driver/register',
        userOnly: true,
    },
    {
        icon: <Truck className="h-5 w-5" />,
        label: 'Сбор',
        path: '/driver/collection',
        driverOnly: true,
        showBadge: hasActiveSession,
        bottomNav: true,
    },
    {
        icon: <RouteIcon className="h-5 w-5" />,
        label: 'Маршруты',
        path: '/routes',
        supervisorOnly: true,
        bottomNav: true,
    },
    {
        icon: <RouteIcon className="h-5 w-5" />,
        label: 'Маршрут на сегодня',
        path: '/driver/route',
        driverOnly: true,
        bottomNav: true,
    },
    {
        icon: <ClipboardCheck className="h-5 w-5" />,
        label: 'Акты передачи',
        path: '/handoffs',
        supervisorOnly: true,
        bottomNav: true,
    },
    {
        icon: <UserCheck className="h-5 w-5" />,
        label: t('nav.drivers'),
        path: '/admin/drivers',
        adminOnly: true,
    },
    {
        icon: <Building2 className="h-5 w-5" />,
        label: t('nav.medicalCompanies'),
        path: '/admin/companies',
        adminOnly: true,
    },
    {
        icon: <Factory className="h-5 w-5" />,
        label: 'Заводы утилизации',
        path: '/admin/incineration-plants',
        supervisorOnly: true,
    },
    {
        icon: <NavigationIcon className="h-5 w-5" />,
        label: 'История маршрутов',
        path: '/route-history',
        hideForDriver: true,
    },
    {
        icon: <Truck className="h-5 w-5" />,
        label: t('nav.drivers'),
        path: '/driver/dashboard',
        driverOnly: true,
        bottomNav: true,
    },
    {
        icon: <Settings className="h-5 w-5" />,
        label: t('nav.settings'),
        path: '/settings',
        adminOnly: true,
    },
    {
        icon: <Heart className="h-5 w-5" />,
        label: 'Здоровье Устройств',
        path: '/device-health',
        adminOnly: true,
    },
]);

const filterNavItems = (items, { isAdmin, isSupervisor, userRole, isDriver }) => (
    items.filter((item) => {
        if (item.adminOnly && !isAdmin) return false;
        if (item.supervisorOnly && !isSupervisor) return false;
        if (item.userOnly && (isAdmin || userRole === 'driver')) return false;
        if (item.driverOnly && !isDriver) return false;
        if (item.driverOrAdmin && !(isDriver || isAdmin)) return false;
        if (item.hideForDriver && isDriver) return false;
        return true;
    })
);

const Sidebar = React.memo(function Sidebar({
                                                isMobile = false,
                                                isOpen = false,
                                                onClose = () => {},
                                                isCollapsed = true,
                                                onToggleCollapse = () => {},
                                            }) {
    const { t } = useTranslation();
    const { user, isAdmin, isSupervisor } = useAuth();
    const { pathname } = useLocation();
    const [isHovered, setIsHovered] = useState(false);

    const isDriver =
        user?.role === 'driver' && user?.verificationStatus === 'approved';

    // Poll for active collection session (drivers only)
    const { data: activeSessionData } = useQuery({
        queryKey: ['activeCollectionSession'],
        queryFn: () => apiService.collections.getActive(),
        enabled: isDriver,
        refetchInterval: 30_000,
        retry: false,
    });

    const hasActiveSession =
        activeSessionData?.data?.data?.session?.status === 'active';

    // Navigation items configuration
    const navItems = useMemo(
        () => buildNavItems(t, hasActiveSession),
        [t, hasActiveSession]
    );

    // Filter navigation items based on user role
    const filteredNavItems = useMemo(() => {
        return filterNavItems(navItems, {
            isAdmin,
            isSupervisor,
            userRole: user?.role,
            isDriver
        });
    }, [navItems, isAdmin, isSupervisor, user?.role, isDriver]);

    const shouldExpand = !isMobile && (isCollapsed ? isHovered : true);

    // Auto-close mobile sidebar on route change
    useEffect(() => {
        if (isMobile && isOpen) {
            onClose();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    return (
        <div
            onMouseEnter={() => !isMobile && isCollapsed && setIsHovered(true)}
            onMouseLeave={() => !isMobile && isCollapsed && setIsHovered(false)}
            className={`
                ${
                isMobile
                    ? 'fixed inset-y-0 left-0 z-50 w-64 shadow-lg'
                    : `sticky top-0 h-screen ${shouldExpand ? 'w-64' : 'w-20'}`
            }
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

            {/* Logo section */}
            <div className="flex h-16 items-center border-b border-slate-200 px-4">
                <Link
                    to="/"
                    className="flex items-center space-x-2"
                    aria-label={t('nav.home')}
                >
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

            {/* Navigation menu */}
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
                                    ${
                                        isActive
                                            ? 'bg-teal-50 text-teal-700'
                                            : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                                    }`
                                }
                                end={item.path === '/'}
                                title={!shouldExpand || isMobile ? item.label : ''}
                            >
                                <div className="relative flex-shrink-0">
                                    {item.icon}
                                    {item.showBadge && (
                                        <span
                                            className="absolute -right-1 -top-1 flex h-2 w-2"
                                            aria-hidden="true"
                                        >
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
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

            {/* Profile link */}
            <div className="border-t border-slate-200 p-4">
                <NavLink
                    to="/profile"
                    onClick={isMobile ? onClose : undefined}
                    className={({ isActive }) =>
                        `flex items-center gap-2 rounded-lg py-2.5 text-sm font-medium px-3
                        ${
                            isActive
                                ? 'bg-teal-50 text-teal-700'
                                : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                        }`
                    }
                    title={!shouldExpand ? 'Мой Профиль' : ''}
                >
                    <User className="h-5 w-5 flex-shrink-0" />
                    {(shouldExpand || isMobile) && (
                        <span className="whitespace-nowrap">Мой Профиль</span>
                    )}
                </NavLink>
            </div>

            {/* System status indicator */}
            {shouldExpand && (
                <div className="border-t border-slate-200 p-4">
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm">
                        <div className="flex items-center space-x-2">
                            <Wifi className="h-4 w-4 text-emerald-500" />
                            <span className="font-medium text-slate-700">
                                {t('app.systemActive')}
                            </span>
                        </div>
                        <span className="text-xs text-slate-500">
                            {t('app.version')}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
});

// ============================================================================
// HEADER COMPONENT
// ============================================================================

const Header = React.memo(function Header({ showMenuButton, onMenuClick }) {
    const { user, logout } = useAuth();
    const { t, i18n } = useTranslation();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const menuRef = useRef(null);

    // Close menu on outside click
    useOnClickOutside(menuRef, () => setShowUserMenu(false));

    // Close menu on Escape key
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setShowUserMenu(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Fetch overfilled bins count for alerts
    const { data: alertBinsData } = useQuery({
        queryKey: ['alertBinsCount'],
        queryFn: () => apiService.wasteBins.getOverfilled(),
        refetchInterval: 60_000,
        staleTime: 30_000,
    });

    const alertCount = safeCount(alertBinsData);

    const handleLogout = () => {
        setShowUserMenu(false);
        logout();
    };

    const handleLanguageChange = (event) => {
        i18n.changeLanguage(event.target.value);
    };

    return (
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
            <div className="flex items-center">
                {showMenuButton && (
                    <button
                        onClick={onMenuClick}
                        className="mr-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-500 md:hidden"
                        aria-label={t('nav.openSidebar')}
                        aria-controls="mobile-sidebar"
                    >
                        <span className="sr-only">{t('nav.openSidebar')}</span>
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path
                                fillRule="evenodd"
                                d="M3 5h14a1 1 0 010 2H3a1 1 0 010-2zm0 4h14a1 1 0 010 2H3a1 1 0 010-2zm0 4h14a1 1 0 010 2H3a1 1 0 010-2z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </button>
                )}
            </div>

            {/* Right side controls */}
            <div className="flex items-center space-x-4">
                {/* Alert notifications */}
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

                {/* User menu dropdown */}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setShowUserMenu((prev) => !prev)}
                        className="flex items-center space-x-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                        aria-haspopup="menu"
                        aria-expanded={showUserMenu}
                    >
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-700">
                            {(user?.username?.substring(0, 1) || 'U').toUpperCase()}
                        </div>
                        <span className="hidden sm:inline-block">
                            {user?.username || t('header.user')}
                        </span>
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                    </button>

                    {showUserMenu && (
                        <div
                            role="menu"
                            className="absolute right-0 mt-2 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                        >
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
                                onClick={handleLogout}
                                className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-slate-50"
                                role="menuitem"
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                {t('header.logout')}
                            </button>
                        </div>
                    )}
                </div>

                {/* Language selector */}
                <div>
                    <select
                        aria-label="Language"
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
                        value={i18n.language?.startsWith('ru') ? 'ru' : 'en'}
                        onChange={handleLanguageChange}
                    >
                        <option value="ru">RU</option>
                        <option value="en">EN</option>
                    </select>
                </div>
            </div>
        </header>
    );
});

const BottomNav = React.memo(function BottomNav() {
    const { t } = useTranslation();
    const { user, isAdmin, isSupervisor } = useAuth();
    const { pathname } = useLocation();

    const isDriver =
        user?.role === 'driver' && user?.verificationStatus === 'approved';
    const isIncinerator =
        user?.role === 'incinerator' || user?.role === 'incinerator_operator';

    const { data: activeSessionData } = useQuery({
        queryKey: ['activeCollectionSession'],
        queryFn: () => apiService.collections.getActive(),
        enabled: isDriver,
        refetchInterval: 30_000,
        retry: false,
    });

    const hasActiveSession =
        activeSessionData?.data?.data?.session?.status === 'active';

    const navItems = useMemo(
        () => buildNavItems(t, hasActiveSession),
        [t, hasActiveSession]
    );

    const filteredNavItems = useMemo(() => {
        return filterNavItems(navItems, {
            isAdmin,
            isSupervisor,
            userRole: user?.role,
            isDriver
        }).filter((item) => item.bottomNav);
    }, [navItems, isAdmin, isSupervisor, user?.role, isDriver]);

    if (!isDriver && !isIncinerator) return null;
    if (pathname.startsWith('/driver/collection')) return null;
    if (filteredNavItems.length + 1 > 5) return null;

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white md:hidden">
            <div className="flex items-center justify-around gap-2 px-2 py-2">
                {filteredNavItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex flex-1 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-[11px] font-medium ${
                                isActive
                                    ? 'text-teal-700'
                                    : 'text-slate-600'
                            }`
                        }
                        end={item.path === '/'}
                        title={item.label}
                    >
                        <div className="relative">
                            {item.icon}
                            {item.showBadge && (
                                <span
                                    className="absolute -right-1 -top-1 flex h-2 w-2"
                                    aria-hidden="true"
                                >
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                                </span>
                            )}
                        </div>
                        <span className="truncate">{item.label}</span>
                    </NavLink>
                ))}
                <NavLink
                    to="/profile"
                    className={({ isActive }) =>
                        `flex flex-1 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-[11px] font-medium ${
                            isActive
                                ? 'text-teal-700'
                                : 'text-slate-600'
                        }`
                    }
                    title="Мой Профиль"
                >
                    <User className="h-5 w-5" />
                    <span className="truncate">Профиль</span>
                </NavLink>
            </div>
        </nav>
    );
});

// ============================================================================
// DASHBOARD LAYOUT COMPONENT
// ============================================================================

const DashboardLayout = () => {
    const { t } = useTranslation();
    const { user, isAdmin, isSupervisor } = useAuth();
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    const handleToggleCollapse = () => setIsCollapsed((prev) => !prev);
    const handleSidebarOpen = () => setSidebarOpen(true);
    const handleSidebarClose = () => setSidebarOpen(false);

    const isDriver =
        user?.role === 'driver' && user?.verificationStatus === 'approved';
    const isIncinerator =
        user?.role === 'incinerator' || user?.role === 'incinerator_operator';

    const bottomNavItems = useMemo(() => {
        const items = buildNavItems(t, false);
        return filterNavItems(items, {
            isAdmin,
            isSupervisor,
            userRole: user?.role,
            isDriver
        }).filter((item) => item.bottomNav);
    }, [t, isAdmin, isSupervisor, user?.role, isDriver]);

    const showBottomNav = (isDriver || isIncinerator) && bottomNavItems.length + 1 <= 5;

    return (
        <div className="flex h-screen bg-slate-50">
            {/* Desktop sidebar */}
            <div className="hidden md:block">
                <Sidebar
                    isCollapsed={isCollapsed}
                    onToggleCollapse={handleToggleCollapse}
                />
            </div>

            {!showBottomNav && (
                <>
                    <div id="mobile-sidebar" className="md:hidden">
                        <Sidebar
                            isMobile
                            isOpen={isSidebarOpen}
                            onClose={handleSidebarClose}
                        />
                    </div>

                    {isSidebarOpen && (
                        <div
                            className="fixed inset-0 z-40 bg-black/50 md:hidden"
                            onClick={handleSidebarClose}
                            aria-hidden="true"
                        />
                    )}
                </>
            )}

            {/* Main content area */}
            <div className="flex flex-1 flex-col overflow-hidden">
                <Header showMenuButton={!showBottomNav} onMenuClick={handleSidebarOpen} />
                <main className={`flex-1 overflow-auto ${showBottomNav ? 'pb-20' : ''} md:pb-0`}>
                    <Outlet />
                </main>
                {showBottomNav && <BottomNav />}
            </div>
        </div>
    );
};

export default DashboardLayout;
