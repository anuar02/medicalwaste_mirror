import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import TrashBin from "./components/Trashbin";
import { LayoutDashboard, List } from 'lucide-react';
import ContainersList from "./components/ContainerList";  // Changed icons

function App() {
    return (
        <Router>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
                {/* Navigation Bar */}
                <nav className="bg-white shadow-sm border-b border-slate-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between h-16">
                            <div className="flex">
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
                            </div>
                        </div>
                    </div>
                </nav>

                {/* Route Content */}
                <Routes>
                    <Route path="/" element={<TrashBin />} />
                    <Route path="/containers" element={<ContainersList />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;