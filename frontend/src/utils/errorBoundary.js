import React from 'react';
import { AlertTriangle } from "lucide-react";

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Dashboard error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
                    <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
                    <h2 className="text-xl font-semibold text-slate-800 mb-2">
                        Что-то пошло не так
                    </h2>
                    <p className="text-slate-600 text-center mb-4">
                        Произошла ошибка при загрузке панели мониторинга
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                    >
                        Перезагрузить страницу
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary; // ← Add this line!