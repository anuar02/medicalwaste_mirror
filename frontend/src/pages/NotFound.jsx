// pages/NotFound.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';
import Button from '../components/ui/Button';
import Logo from '../components/ui/Logo';

const NotFound = () => {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-teal-50 px-4 py-12">
            <Logo size={64} className="mb-6" />

            <div className="w-full max-w-md text-center">
                <h1 className="mb-2 text-6xl font-bold text-slate-800">404</h1>
                <h2 className="mb-4 text-2xl font-semibold text-slate-700">Страница не найдена</h2>
                <p className="mb-8 text-slate-500">
                    Запрашиваемая страница не существует или была перемещена.
                    Проверьте URL или вернитесь на главную страницу.
                </p>

                <div className="flex flex-col space-y-3 sm:flex-row sm:space-x-3 sm:space-y-0 justify-center">
                    <Button
                        as={Link}
                        to="/"
                        color="teal"
                    >
                        <Home className="mr-2 h-4 w-4" />
                        На главную
                    </Button>

                    <Button
                        as={Link}
                        to="/bins"
                        variant="outline"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        К списку контейнеров
                    </Button>
                </div>
            </div>

            <div className="mt-12 flex items-center space-x-1 text-sm text-slate-500">
                <Search className="h-4 w-4" />
                <span>Ошибка 404 - Страница не найдена</span>
            </div>
        </div>
    );
};

export default NotFound;