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

// Pages - Using lazy loading for improved performance
const Login = React.lazy(() => import('./pages/auth/Login'));
const Register = React.lazy(() => import('./pages/auth/Register'));
const ForgotPassword = React.lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = React.lazy(() => import('./pages/auth/ResetPassword'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const BinDetails = React.lazy(() => import('./pages/BinDetails'));
const BinList = React.lazy(() => import('./pages/BinList'));
const BinMap = React.lazy(() => import('./pages/BinMap'));
const Reports = React.lazy(() => import('./pages/Reports'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Profile = React.lazy(() => import('./pages/Profile'));
const NotFound = React.lazy(() => import('./pages/NotFound'));
const DeviceTracking = React.lazy(() => import('./pages/DeviceTracking'));

// Loading component for suspense fallback
const LoadingScreen = () => (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-teal-500"></div>
            <p className="text-lg font-medium text-slate-700">Загрузка...</p>
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

// Configure React Query
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 30000,
        },
    },
});

const App = () => {
    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                <BrowserRouter>
                    <AuthProvider> {/* Now inside BrowserRouter */}
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
                                                <Dashboard />
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
                                    {/*<Route*/}
                                    {/*    path="/admin/bins"*/}
                                    {/*    element={*/}
                                    {/*        <ProtectedRoute>*/}
                                    {/*            <BinManagement />*/}
                                    {/*        </ProtectedRoute>*/}
                                    {/*    }*/}
                                    {/*/>*/}
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

                        {/* Toast notifications */}
                        <Toaster position="top-right" />
                    </AuthProvider>
                </BrowserRouter>
            </ThemeProvider>

            {/* React Query Devtools - only in development */}
            {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
    );
};

export default App;
