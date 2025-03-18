// components/modals/DeleteConfirmationModal.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import Button from '../ui/Button';

const DeleteConfirmationModal = ({
                                     isOpen,
                                     onClose,
                                     onConfirm,
                                     title = 'Подтверждение удаления',
                                     message = 'Вы уверены, что хотите удалить этот элемент? Это действие нельзя отменить.',
                                     isDeleting = false
                                 }) => {
    // If modal is not open, don't render anything
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-red-600">
                        <AlertTriangle className="h-5 w-5" />
                        <h2 className="text-xl font-semibold">{title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-500"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Message */}
                <div className="mb-6 text-slate-700">
                    <p>{message}</p>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={isDeleting}
                    >
                        Отмена
                    </Button>
                    <Button
                        type="button"
                        color="red"
                        onClick={onConfirm}
                        isLoading={isDeleting}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Удалить
                    </Button>
                </div>
            </div>
        </div>
    );
};

DeleteConfirmationModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onConfirm: PropTypes.func.isRequired,
    title: PropTypes.string,
    message: PropTypes.string,
    isDeleting: PropTypes.bool,
};

export default DeleteConfirmationModal;