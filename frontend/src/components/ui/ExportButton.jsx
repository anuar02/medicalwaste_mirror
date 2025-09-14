import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, File, Loader2 } from 'lucide-react';

const ExportButton = ({ t }) => {
    const [isExporting, setIsExporting] = useState(false);
    const [exportFormat, setExportFormat] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);

    const handleExportData = async (format) => {
        try {
            setIsExporting(true);
            setExportFormat(format);
            setShowDropdown(false);

            const params = new URLSearchParams();

            const queryString = params.toString();
            const url = `/api/waste-bins/export/${format}${queryString ? `?${queryString}` : ''}`;
            console.log(url)

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Accept': 'application/octet-stream',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Export failed: ${response.statusText}`);
            }

            const blob = await response.blob();

            // Check if blob is actually the expected format
            if (blob.size === 0) {
                throw new Error('Downloaded file is empty');
            }

            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;

            const timestamp = new Date().toISOString().slice(0, 10);
            const formatExtensions = {
                'pdf': 'pdf',
                'xlsx': 'xlsx',
                'csv': 'csv'
            };

            link.download = `waste_bins_report_${timestamp}.${formatExtensions[format] || format}`;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);

            // Success notification
            console.log(`${format.toUpperCase()} report downloaded successfully`);

        } catch (error) {
            console.error('Export error:', error);
            alert(`Failed to export ${format.toUpperCase()} report: ${error.message}`);
        } finally {
            setIsExporting(false);
            setExportFormat(null);
        }
    };

    const exportOptions = [
        { format: 'pdf', label: 'PDF', icon: FileText, color: 'text-red-600' },
        { format: 'xlsx', label: 'Excel', icon: FileSpreadsheet, color: 'text-green-600' },
        { format: 'csv', label: 'CSV', icon: File, color: 'text-blue-600' }
    ];

    return (
        <div className="relative">
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                disabled={isExporting}
                className="flex items-center text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                title={t('dashboard.exportReport', 'Экспорт отчета')}
            >
                {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Download className="h-4 w-4" />
                )}
            </button>

            {showDropdown && (
                <div className="absolute right-0 mt-2 w-32 bg-white rounded-md shadow-lg z-50 border">
                    <div className="py-1">
                        {exportOptions.map(({ format, label, icon: Icon, color }) => (
                            <button
                                key={format}
                                onClick={() => handleExportData(format)}
                                disabled={isExporting}
                                className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                            >
                                <Icon className={`h-4 w-4 mr-2 ${color}`} />
                                {label}
                                {isExporting && exportFormat === format && (
                                    <Loader2 className="h-3 w-3 ml-auto animate-spin" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Click outside to close dropdown */}
            {showDropdown && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowDropdown(false)}
                />
            )}
        </div>
    );
};

export default ExportButton;
