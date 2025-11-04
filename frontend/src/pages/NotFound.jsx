// pages/NotFound.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Home, ArrowLeft, Search } from 'lucide-react';
import Button from '../components/ui/Button';
import Logo from '../components/ui/Logo';

const NotFound = () => {
    const { t } = useTranslation();
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-teal-50 px-4 py-12">
            <Logo size={64} className="mb-6" />

            <div className="w-full max-w-md text-center">
                <h1 className="mb-2 text-6xl font-bold text-slate-800">404</h1>
                <h2 className="mb-4 text-2xl font-semibold text-slate-700">{t('notFound.title')}</h2>
                <p className="mb-8 text-slate-500">
                    {t('notFound.description')}
                </p>

                <div className="flex flex-col space-y-3 sm:flex-row sm:space-x-3 sm:space-y-0 justify-center">
                    <Button
                        as="a"
                        href="https://medicalwaste.kz"
                        color="teal"
                    >
                        <Home className="mr-2 h-4 w-4" />
                        {t('notFound.home')}
                    </Button>

                    <Button
                        as="a"
                        href="https://medicalwaste.kz/bins"
                        variant="outline"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {t('notFound.toBins')}
                    </Button>
                </div>
            </div>

            <div className="mt-12 flex items-center space-x-1 text-sm text-slate-500">
                <Search className="h-4 w-4" />
                <span>{t('notFound.footer')}</span>
            </div>
        </div>
    );
};

export default NotFound;