import React, { useState } from 'react';
import { Download, ChevronDown } from 'lucide-react';
import Button from "./Button";

const ExportDropdownButton = ({ handleExportData, t }) => {
    const [isOpen, setIsOpen] = useState(false);

    const exportOptions = [
        { format: 'csv', label: 'CSV' },
        { format: 'pdf', label: 'PDF' },
        { format: 'xlsx', label: 'Excel' }
    ];

    return (
        <div className="relative">
            <Button
                variant="outline"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center"
            >
                <Download className="mr-2 h-4 w-4" />
                Экспорт
                <ChevronDown className="ml-2 h-4 w-4" />
            </Button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-32 bg-white rounded-md shadow-lg z-20 border">
                        <div className="py-1">
                            {exportOptions.map(({ format, label }) => (
                                <button
                                    key={format}
                                    onClick={() => {
                                        handleExportData(format);
                                        setIsOpen(false);
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ExportDropdownButton