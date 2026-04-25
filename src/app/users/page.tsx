"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  UserPlus,
  Mail,
  ShieldCheck,
  User as UserIcon,
  Loader2,
  Trash2,
  UserCheck,
  UserCog,
  AlertCircle,
  X,
  Lock,
  User,
  CheckCircle2,
} from 'lucide-react';
import { userApi } from '@/lib/api';
import { clsx } from 'clsx';
import ConfirmDialog, { ConfirmDialogConfig } from '@/components/shared/ConfirmDialog';

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [newAdmin, setNewAdmin] = useState({
    full_name: '',
    email: '',
    password: '',
  });

  const [confirmCfg, setConfirmCfg] = useState<ConfirmDialogConfig | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [toast, setToast] = useState<{ kind: 'error' | 'success'; message: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await userApi.getAll();
      setUsers(response.data);
    } catch (err) {
      console.error('Error fetching users', err);
      setError('Failed to load users. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const askDelete = (user: any) => {
    const uid = user.id || user._id;
    setConfirmCfg({
      title: 'Delete user?',
      message: `${user.full_name || user.email} will be permanently removed${user.is_admin ? ' and will lose all admin access' : ''}. This action cannot be undone.`,
      confirmLabel: 'Delete user',
      destructive: true,
      run: async () => {
        setActionId(uid);
        try {
          await userApi.delete(uid);
          setUsers(prev => prev.filter(u => u.id !== uid && u._id !== uid));
          setToast({ kind: 'success', message: `User "${user.full_name || user.email}" deleted.` });
        } catch (err) {
          console.error('Error deleting user', err);
          setToast({ kind: 'error', message: 'Failed to delete user.' });
        } finally {
          setActionId(null);
        }
      },
    });
  };

  const askToggleAdmin = (user: any) => {
    const uid = user.id || user._id;
    const promoting = !user.is_admin;
    setConfirmCfg({
      title: promoting ? 'Grant admin access?' : 'Revoke admin access?',
      message: promoting
        ? `${user.full_name || user.email} will get full access to products, orders, chips, offers and other admin settings.`
        : `${user.full_name || user.email} will no longer be able to access the admin panel.`,
      confirmLabel: promoting ? 'Make Admin' : 'Revoke Admin',
      destructive: !promoting,
      run: async () => {
        setActionId(uid);
        try {
          const response = await userApi.toggleAdmin(uid);
          const updatedUser = response.data;
          setUsers(prev => prev.map(u => (u.id === uid || u._id === uid ? updatedUser : u)));
          setToast({
            kind: 'success',
            message: promoting ? 'Admin access granted.' : 'Admin access revoked.',
          });
        } catch (err) {
          console.error('Error toggling admin status', err);
          setToast({ kind: 'error', message: 'Failed to update user status.' });
        } finally {
          setActionId(null);
        }
      },
    });
  };

  const runConfirm = async () => {
    if (!confirmCfg) return;
    const cfg = confirmCfg;
    setConfirmLoading(true);
    try {
      await cfg.run();
    } finally {
      setConfirmLoading(false);
      setConfirmCfg(null);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(newAdmin.email)) {
      setModalError('Please enter a valid email address (e.g. admin@decant.com)');
      return;
    }

    setModalLoading(true);
    setModalError(null);
    try {
      const response = await userApi.createAdmin(newAdmin);
      setUsers([response.data, ...users]);
      setIsModalOpen(false);
      setNewAdmin({ full_name: '', email: '', password: '' });
      setToast({ kind: 'success', message: 'Admin account created.' });
    } catch (err: any) {
      console.error('Error adding admin', err);
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setModalError(detail[0]?.msg || 'Invalid input data.');
      } else {
        setModalError(detail || 'Failed to create admin.');
      }
    } finally {
      setModalLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(
      user =>
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [users, searchTerm]);

  const adminCount = useMemo(() => users.filter(u => u.is_admin).length, [users]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500 mt-1">Manage administrators and customer accounts.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg flex items-center space-x-2 font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
        >
          <UserPlus size={18} />
          <span>Add Admin</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
        <div className="relative w-96 max-w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search users by name or email..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-950 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-400"
          />
        </div>
        <div className="flex items-center space-x-4 text-[10px] uppercase tracking-widest font-bold text-slate-400">
          <span>
            <span className="text-slate-700">{filteredUsers.length}</span> Users
          </span>
          <span className="text-slate-200">·</span>
          <span>
            <span className="text-indigo-600">{adminCount}</span> Admins
          </span>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="animate-spin text-indigo-600" size={40} />
          <p className="text-slate-500 font-medium">Fetching users...</p>
        </div>
      ) : error ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-4 text-center">
          <AlertCircle className="text-red-400" size={48} />
          <p className="text-slate-600 font-medium">{error}</p>
          <button onClick={fetchUsers} className="text-indigo-600 font-bold hover:underline">
            Try Again
          </button>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-4 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <UserIcon className="text-slate-200" size={64} />
          <p className="text-slate-500 font-medium italic">No users found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">User</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Email</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Role</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map(user => {
                  const uid = user.id || user._id;
                  const isProcessing = actionId === uid;

                  return (
                    <tr
                      key={uid}
                      className={clsx(
                        'transition-colors group hover:bg-slate-50/50',
                        isProcessing && 'opacity-60',
                      )}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={clsx(
                              'w-10 h-10 rounded-full flex items-center justify-center border flex-shrink-0',
                              user.is_admin
                                ? 'bg-indigo-50 border-indigo-100 text-indigo-600'
                                : 'bg-slate-100 border-slate-200 text-slate-400',
                            )}
                          >
                            <UserIcon size={18} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-slate-900 truncate">
                                {user.full_name || 'Unnamed User'}
                              </p>
                              {user.is_admin && (
                                <ShieldCheck size={14} className="text-indigo-600 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-tighter mt-0.5">
                              ID: {(uid || '').toString().substring(0, 8)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <Mail size={12} className="text-slate-400 flex-shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={clsx(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest',
                            user.is_admin
                              ? 'text-indigo-600 bg-indigo-50 border border-indigo-100'
                              : 'text-slate-500 bg-slate-50 border border-slate-100',
                          )}
                        >
                          {user.is_admin ? 'Admin' : 'Customer'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest text-green-600 bg-green-50 border border-green-100">
                          Active
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => askToggleAdmin(user)}
                            disabled={isProcessing}
                            title={user.is_admin ? 'Revoke admin access' : 'Make admin'}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-50"
                          >
                            {isProcessing ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : user.is_admin ? (
                              <UserCog size={16} />
                            ) : (
                              <UserCheck size={16} />
                            )}
                          </button>
                          <button
                            onClick={() => askDelete(user)}
                            disabled={isProcessing}
                            title="Delete user"
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0">
              <h3 className="text-lg font-bold text-slate-900">Create New Administrator</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddAdmin} className="p-6 space-y-6">
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-xs font-bold flex items-center">
                  <AlertCircle size={14} className="mr-2" />
                  {modalError}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      required
                      value={newAdmin.full_name}
                      onChange={e => setNewAdmin({ ...newAdmin, full_name: e.target.value })}
                      placeholder="e.g. John Smith"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-400 text-slate-900"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="email"
                      required
                      value={newAdmin.email}
                      onChange={e => setNewAdmin({ ...newAdmin, email: e.target.value })}
                      placeholder="admin@decant.com"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-400 text-slate-900"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">
                    Initial Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="password"
                      required
                      value={newAdmin.password}
                      onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })}
                      placeholder="Min. 8 characters"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-400 text-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col space-y-3 pt-2">
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {modalLoading ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
                  <span>{modalLoading ? 'Creating Admin...' : 'Create Admin Account'}</span>
                </button>
                <p className="text-[10px] text-center text-slate-400 font-medium px-4">
                  Admin accounts have full access to products, orders, and user settings.
                </p>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        config={confirmCfg}
        loading={confirmLoading}
        onCancel={() => setConfirmCfg(null)}
        onConfirm={runConfirm}
      />

      {toast && (
        <div className="fixed bottom-6 right-6 z-[120] animate-in slide-in-from-bottom-4 duration-200">
          <div
            className={clsx(
              'flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border max-w-sm',
              toast.kind === 'error'
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-green-50 border-green-200 text-green-700',
            )}
          >
            {toast.kind === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <p className="text-sm font-medium">{toast.message}</p>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-current opacity-60 hover:opacity-100"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
