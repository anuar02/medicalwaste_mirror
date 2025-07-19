import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';

// Context Providers
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';
import AuthLayout from './layouts/AuthLayout';
import UserManagement from "./pages/admin/UserManagement";
import BinManagement from "./pages/admin/BinManagement";
import DeviceManagement from "./pages/admin/DeviceManagement";
import DriverRegistration from "./components/DriverRegistration";
import AdminDriverVerification from "./components/AdminDriverVerification";
import MedicalCompanyManagement from "./components/MedicalCompanyManagement";
import ErrorBoundary from "./utils/errorBoundary";

// Pages - Using lazy loading for improved performance
const Login = React.lazy(() => import('./pages/auth/Login'));
const Register = React.lazy(() => import('./pages/auth/Register'));
const ForgotPassword = React.lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = React.lazy(() => import('./pages/auth/ResetPassword'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const BinDetails = React.lazy(() => import('./pages/BinDetails'));
const DriverTracking = React.lazy(() => import('./pages/DriverTracking'));
const BinList = React.lazy(() => import('./pages/BinList'));
const BinMap = React.lazy(() => import('./pages/BinMap'));
const Reports = React.lazy(() => import('./pages/Reports'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Profile = React.lazy(() => import('./pages/Profile'));
const NotFound = React.lazy(() => import('./pages/NotFound'));
const DeviceTracking = React.lazy(() => import('./pages/DeviceTracking'));

// Enhanced Loading component with better UX
const LoadingScreen = () => (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
            {/* Enhanced spinner with pulsing effect */}
            <div className="relative">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-teal-500"></div>
                <div className="absolute inset-0 h-12 w-12 animate-pulse rounded-full border-4 border-teal-100"></div>
            </div>
            <div className="text-center">
                <p className="text-lg font-medium text-slate-700">Загрузка...</p>
                <p className="text-sm text-slate-500">Подготовка панели мониторинга</p>
            </div>

            {/* Loading progress simulation */}
            <div className="w-48 bg-slate-200 rounded-full h-1.5">
                <div className="bg-teal-500 h-1.5 rounded-full animate-pulse" style={{ width: '70%' }}></div>
            </div>
        </div>
    </div>
);

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
    // Get auth status from context
    const token = localStorage.getItem('token');

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

// Enhanced React Query configuration for better performance
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: true,  // Enhanced: Enable focus refetch
            refetchOnReconnect: true,    // Enhanced: Enable reconnect refetch
            retry: (failureCount, error) => {
                // Enhanced: Smart retry logic
                if (error?.status === 404 || error?.status === 403) {
                    return false; // Don't retry on client errors
                }
                return failureCount < 3;
            },
            staleTime: 60000,           // Enhanced: Increased to 1 minute
            cacheTime: 300000,          // Enhanced: Cache for 5 minutes
            retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
        },
        mutations: {
            retry: 1,
            onError: (error) => {
                // Enhanced: Global error handling for mutations
                console.error('Mutation error:', error);
                // You can add global error notification here if needed
            }
        }
    },
});

// Enhanced: Add global error handlers
queryClient.setMutationDefaults(['update', 'create', 'delete'], {
    mutationFn: async (variables) => {
        // Add global loading states, optimistic updates, etc.
        return variables;
    }
});

const App = () => {
    return (
        <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider>
                    <BrowserRouter>
                        <AuthProvider>
                            <Suspense fallback={<LoadingScreen />}>
                                <Routes>
                                    {/* Auth Routes */}
                                    <Route element={<AuthLayout />}>
                                        <Route path="/login" element={<Login />} />
                                        <Route path="/register" element={<Register />} />
                                        <Route path="/forgot-password" element={<ForgotPassword />} />
                                        <Route path="/reset-password/:token" element={<ResetPassword />} />
                                    </Route>

                                    {/* Dashboard Routes - Protected */}
                                    <Route element={<DashboardLayout />}>
                                        <Route
                                            path="/"
                                            element={
                                                <ProtectedRoute>
                                                    <ErrorBoundary>
                                                        <Dashboard />
                                                    </ErrorBoundary>
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/driver/register"
                                            element={
                                                <ProtectedRoute>
                                                    <DriverRegistration />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/admin/drivers"
                                            element={
                                                <ProtectedRoute>
                                                    <AdminDriverVerification />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/admin/companies"
                                            element={
                                                <ProtectedRoute>
                                                    <MedicalCompanyManagement />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/bins"
                                            element={
                                                <ProtectedRoute>
                                                    <BinList />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/bins/:binId"
                                            element={
                                                <ProtectedRoute>
                                                    <BinDetails />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/drivers"
                                            element={
                                                <ProtectedRoute>
                                                    <DriverTracking />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/map"
                                            element={
                                                <ProtectedRoute>
                                                    <BinMap />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/reports"
                                            element={
                                                <ProtectedRoute>
                                                    <Reports />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/settings"
                                            element={
                                                <ProtectedRoute>
                                                    <Settings />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/admin/devices"
                                            element={
                                                <ProtectedRoute>
                                                    <DeviceManagement />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/admin/bins"
                                            element={
                                                <ProtectedRoute>
                                                    <BinManagement />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/admin/users"
                                            element={
                                                <ProtectedRoute>
                                                    <UserManagement />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/tracking"
                                            element={
                                                <ProtectedRoute>
                                                    <DeviceTracking />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/profile"
                                            element={
                                                <ProtectedRoute>
                                                    <Profile />
                                                </ProtectedRoute>
                                            }
                                        />
                                    </Route>

                                    {/* 404 Not Found */}
                                    <Route path="*" element={<NotFound />} />
                                </Routes>
                            </Suspense>

                            {/* Enhanced Toast notifications with better styling */}
                            <Toaster
                                position="top-right"
                                toastOptions={{
                                    duration: 4000,
                                    style: {
                                        background: '#ffffff',
                                        color: '#1f2937',
                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '0.5rem',
                                        padding: '16px',
                                        fontSize: '14px',
                                        maxWidth: '400px'
                                    },
                                    success: {
                                        iconTheme: {
                                            primary: '#10b981',
                                            secondary: '#ffffff',
                                        },
                                        style: {
                                            borderLeft: '4px solid #10b981'
                                        }
                                    },
                                    error: {
                                        iconTheme: {
                                            primary: '#ef4444',
                                            secondary: '#ffffff',
                                        },
                                        style: {
                                            borderLeft: '4px solid #ef4444'
                                        }
                                    },
                                    loading: {
                                        iconTheme: {
                                            primary: '#3b82f6',
                                            secondary: '#ffffff',
                                        },
                                        style: {
                                            borderLeft: '4px solid #3b82f6'
                                        }
                                    }
                                }}
                            />
                        </AuthProvider>
                    </BrowserRouter>
                </ThemeProvider>

                {/* React Query Devtools - Enhanced with better positioning */}
                {process.env.NODE_ENV === 'development' && (
                    <ReactQueryDevtools
                        initialIsOpen={false}
                        position="bottom-right"
                        toggleButtonProps={{
                            style: {
                                background: '#0f172a',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.375rem',
                                padding: '8px 12px',
                                fontSize: '12px',
                                fontWeight: '500'
                            }
                        }}
                    />
                )}
            </QueryClientProvider>
        </ErrorBoundary>
    );
};

export default App;