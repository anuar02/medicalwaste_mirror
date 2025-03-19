import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    Search,
    RefreshCw,
    Trash2,
    UserPlus,
    X,
    AlertTriangle,
    CheckCircle,
    Shield
} from 'lucide-react';
import apiService from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';

// Delete confirmation modal component
const DeleteModal = ({ isOpen, onClose, onConfirm, userName }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-red-600">
                        <AlertTriangle className="h-5 w-5" />
                        <h2 className="text-xl font-semibold">Подтверждение удаления</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-500"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="mb-6">
                    <p className="text-slate-700">
                        Вы уверены, что хотите удалить пользователя <span className="font-semibold">{userName}</span>?
                    </p>
                    <p className="mt-2 text-sm text-red-500">Это действие нельзя отменить.</p>
                </div>

                <div className="flex justify-end space-x-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                    >
                        Отмена
                    </Button>
                    <Button
                        type="button"
                        color="red"
                        onClick={onConfirm}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Удалить
                    </Button>
                </div>
            </div>
        </div>
    );
};

// User Management component
const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [userToDelete, setUserToDelete] = useState(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [sortBy, setSortBy] = useState('username');
    const [sortOrder, setSortOrder] = useState('asc');
    const navigate = useNavigate();
    const { user: currentUser, isAdmin } = useAuth();

    // Fetch all users
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await apiService.users.getAllUsers();
            setUsers(response.data.data.users || []);
        } catch (error) {
            toast.error('Не удалось загрузить список пользователей');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Update user role
    const updateUserRole = async (userId, newRole) => {
        try {
            await apiService.users.updateUserRole(userId, { role: newRole });
            toast.success('Роль пользователя успешно обновлена');
            fetchUsers(); // Refresh the list
        } catch (error) {
            toast.error('Не удалось обновить роль пользователя');
            console.error(error);
        }
    };

    // Handle role change
    const handleRoleChange = (userId, e) => {
        const newRole = e.target.value;
        updateUserRole(userId, newRole);
    };

    // Open delete modal
    const openDeleteModal = (user) => {
        setUserToDelete(user);
        setDeleteModalOpen(true);
    };

    // Close delete modal
    const closeDeleteModal = () => {
        setUserToDelete(null);
        setDeleteModalOpen(false);
    };

    // Handle Delete user
    const confirmDeleteUser = async () => {
        if (!userToDelete) return;

        try {
            await apiService.users.deleteUser(userToDelete._id || userToDelete.id);
            toast.success('Пользователь успешно удален');
            closeDeleteModal();
            fetchUsers(); // Refresh the list
        } catch (error) {
            toast.error('Не удалось удалить пользователя');
            console.error(error);
        }
    };

    // Handle sort change
    const handleSort = (field) => {
        if (sortBy === field) {
            // Toggle order if same field
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            // New field, default to ascending
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    // Filter and sort users
    const processedUsers = React.useMemo(() => {
        // First filter
        const filteredUsers = users.filter(user => {
            const username = user.username || '';
            const email = user.email || '';
            const searchLower = search.toLowerCase();

            return username.toLowerCase().includes(searchLower) ||
                email.toLowerCase().includes(searchLower);
        });

        // Then sort
        return [...filteredUsers].sort((a, b) => {
            let valueA = a[sortBy] || '';
            let valueB = b[sortBy] || '';

            // Ensure strings for comparison
            if (typeof valueA === 'string') valueA = valueA.toLowerCase();
            if (typeof valueB === 'string') valueB = valueB.toLowerCase();

            // Compare
            if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
            if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }, [users, search, sortBy, sortOrder]);

    useEffect(() => {
        // Check if user is admin
        if (!isAdmin) {
            navigate('/');
            return;
        }

        fetchUsers();
    }, [isAdmin, navigate]);

    // Check if current user is trying to change their own role/delete themselves
    const isSelf = (userId) => {
        if (!currentUser || !userId) return false;
        return userId === currentUser.id || userId === currentUser._id;
    };

    // Get role badge class and icon
    const getRoleBadge = (role) => {
        switch (role) {
            case 'admin':
                return {
                    icon: <Shield className="mr-1 h-3 w-3" />,
                    class: 'bg-purple-100 text-purple-800'
                };
            case 'supervisor':
                return {
                    icon: <CheckCircle className="mr-1 h-3 w-3" />,
                    class: 'bg-blue-100 text-blue-800'
                };
            default:
                return {
                    icon: <UserPlus className="mr-1 h-3 w-3" />,
                    class: 'bg-slate-100 text-slate-800'
                };
        }
    };

    // Get sort icon
    const getSortIcon = (field) => {
        if (sortBy !== field) return null;
        return sortOrder === 'asc' ?
            <span className="ml-1 text-xs">↑</span> :
            <span className="ml-1 text-xs">↓</span>;
    };

    return (
        <div className="container mx-auto p-4">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Управление пользователями</h1>
                <p className="text-sm text-slate-500">Управляйте аккаунтами пользователей и их ролями в системе</p>
            </div>

            {/* Search and controls */}
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-lg bg-white p-4 shadow-sm">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Поиск пользователей по имени или email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-md border border-slate-200 py-2 pl-10 pr-4 text-sm focus:border-teal-500 focus:ring-teal-500"
                        />
                    </div>
                </div>
                <div className="flex items-center justify-end space-x-3 rounded-lg bg-white p-4 shadow-sm">
                    <Button
                        onClick={fetchUsers}
                        variant="outline"
                        className="flex items-center"
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Обновить
                    </Button>
                    <Button
                        onClick={() => navigate('/admin/register-user')} // You'll need to create this route
                        className="flex items-center"
                    >
                        <UserPlus className="mr-2 h-4 w-4" />
                        Создать пользователя
                    </Button>
                </div>
            </div>

            {/* Stats overview */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-white p-4 shadow-sm">
                    <div className="text-sm text-slate-500">Всего пользователей</div>
                    <div className="mt-1 text-2xl font-bold text-slate-800">{users.length}</div>
                </div>
                <div className="rounded-lg bg-white p-4 shadow-sm">
                    <div className="text-sm text-slate-500">Администраторов</div>
                    <div className="mt-1 text-2xl font-bold text-purple-600">
                        {users.filter(user => user.role === 'admin').length}
                    </div>
                </div>
                <div className="rounded-lg bg-white p-4 shadow-sm">
                    <div className="text-sm text-slate-500">Активных пользователей</div>
                    <div className="mt-1 text-2xl font-bold text-teal-600">
                        {users.filter(user => user.active).length}
                    </div>
                </div>
            </div>

            {/* Users table */}
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                {loading ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-teal-500"></div>
                    </div>
                ) : processedUsers.length === 0 ? (
                    <div className="flex h-64 flex-col items-center justify-center">
                        <Users className="h-12 w-12 text-slate-300" />
                        <p className="mt-2 text-center text-slate-500">
                            {search ? 'Нет пользователей, соответствующих вашему поиску' : 'Нет пользователей в системе'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                            <tr>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 cursor-pointer hover:bg-slate-100"
                                    onClick={() => handleSort('username')}
                                >
                                    <div className="flex items-center">
                                        Пользователь
                                        {getSortIcon('username')}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 cursor-pointer hover:bg-slate-100"
                                    onClick={() => handleSort('email')}
                                >
                                    <div className="flex items-center">
                                        Email
                                        {getSortIcon('email')}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 cursor-pointer hover:bg-slate-100"
                                    onClick={() => handleSort('role')}
                                >
                                    <div className="flex items-center">
                                        Роль
                                        {getSortIcon('role')}
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                                    Действия
                                </th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                            {processedUsers.map((user, index) => {
                                const roleBadge = getRoleBadge(user.role);
                                return (
                                    <tr key={user._id || user.id || `user-${index}`} className="hover:bg-slate-50">
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-teal-700">
                                                    {(user.username || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-slate-900">{user.username || 'Без имени'}</div>
                                                    <div className="flex items-center text-xs text-slate-500">
                                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 mr-2 ${
                                                                user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                            }`}>
                                                                {user.active ? 'Активен' : 'Неактивен'}
                                                            </span>
                                                        {user.department && <span>{user.department}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                                            {user.email || 'Нет email'}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                                            <div>
                                                <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium mb-2 ${roleBadge.class}`}>
                                                    {roleBadge.icon}
                                                    {user.role === 'admin' ? 'Администратор' :
                                                        user.role === 'supervisor' ? 'Супервизор' : 'Пользователь'}
                                                </div>

                                                <select
                                                    value={user.role || 'user'}
                                                    onChange={(e) => handleRoleChange(user._id || user.id, e)}
                                                    disabled={isSelf(user._id || user.id)}
                                                    className="block w-full rounded-md border border-slate-200 px-3 py-1 text-sm focus:border-teal-500 focus:outline-none focus:ring-teal-500"
                                                >
                                                    <option value="user">Пользователь</option>
                                                    <option value="supervisor">Супервизор</option>
                                                    <option value="admin">Администратор</option>
                                                </select>

                                                {isSelf(user._id || user.id) && (
                                                    <p className="mt-1 text-xs text-slate-400">Нельзя изменить свою роль</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                                            <div className="flex items-center space-x-2">
                                                {!isSelf(user._id || user.id) && (
                                                    <Button
                                                        variant="outline"
                                                        color="red"
                                                        size="sm"
                                                        onClick={() => openDeleteModal(user)}
                                                        className="flex items-center"
                                                    >
                                                        <Trash2 className="mr-1 h-4 w-4" />
                                                        Удалить
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            <DeleteModal
                isOpen={deleteModalOpen}
                onClose={closeDeleteModal}
                onConfirm={confirmDeleteUser}
                userName={userToDelete?.username || 'этого пользователя'}
            />
        </div>
    );
};

export default UserManagement;