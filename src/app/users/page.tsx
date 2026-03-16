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
  User
} from 'lucide-react';
import { userApi } from '@/lib/api';
import { clsx } from 'clsx';

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [newAdmin, setNewAdmin] = useState({
    full_name: '',
    email: '',
    password: ''
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await userApi.getAll();
      setUsers(response.data);
    } catch (err) {
      console.error("Error fetching users", err);
      setError("Failed to load users. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    
    setActionId(id);
    try {
      await userApi.delete(id);
      setUsers(users.filter(u => u.id !== id && u._id !== id));
    } catch (err) {
      console.error("Error deleting user", err);
      alert("Failed to delete user.");
    } finally {
      setActionId(null);
    }
  };

  const handleToggleAdmin = async (id: string) => {
    setActionId(id);
    try {
      const response = await userApi.toggleAdmin(id);
      const updatedUser = response.data;
      setUsers(users.map(u => (u.id === id || u._id === id) ? updatedUser : u));
    } catch (err) {
      console.error("Error toggling admin status", err);
      alert("Failed to update user status.");
    } finally {
      setActionId(null);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Improved frontend email validation (at least checks for .com/.net type length)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(newAdmin.email)) {
      setModalError("Please enter a valid email address (e.g. admin@decant.com)");
      return;
    }

    setModalLoading(true);
    setModalError(null);
    try {
      const response = await userApi.createAdmin(newAdmin);
      setUsers([response.data, ...users]);
      setIsModalOpen(false);
      setNewAdmin({ full_name: '', email: '', password: '' });
    } catch (err: any) {
      console.error("Error adding admin", err);
      // Handle the case where FastAPI returns an array of errors
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setModalError(detail[0]?.msg || "Invalid input data.");
      } else {
        setModalError(detail || "Failed to create admin.");
      }
    } finally {
      setModalLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

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

      {/* Control Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search users by name or email..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-950 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-400"
          />
        </div>
        <div className="flex items-center space-x-3 text-xs text-slate-400 font-medium">
          Total: {filteredUsers.length} Users
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
          <button onClick={fetchUsers} className="text-indigo-600 font-bold hover:underline">Try Again</button>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-4 text-center">
          <UserIcon className="text-slate-200" size={64} />
          <p className="text-slate-500 font-medium italic">No users found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredUsers.map((user) => {
            const uid = user.id || user._id;
            const isProcessing = actionId === uid;

            return (
              <div key={uid} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group flex flex-col relative overflow-hidden">
                <div className="flex items-start justify-between mb-6">
                  <div className={clsx(
                    "w-12 h-12 rounded-full flex items-center justify-center border",
                    user.is_admin ? "bg-indigo-50 border-indigo-100 text-indigo-600" : "bg-slate-100 border-slate-200 text-slate-400"
                  )}>
                    <UserIcon size={24} />
                  </div>
                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleToggleAdmin(uid)}
                      disabled={isProcessing}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                    >
                      {user.is_admin ? <UserCog size={16} /> : <UserCheck size={16} />}
                    </button>
                    <button 
                      onClick={() => handleDelete(uid)}
                      disabled={isProcessing}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="mb-6 flex-1">
                  <h3 className="font-bold text-slate-900 flex items-center space-x-2">
                    <span className="truncate">{user.full_name || 'Unnamed User'}</span>
                    {user.is_admin && <ShieldCheck size={14} className="text-indigo-600 flex-shrink-0" />}
                  </h3>
                  <p className="text-xs text-slate-400 truncate mt-1 flex items-center">
                    <Mail size={12} className="mr-1 inline" /> {user.email}
                  </p>
                </div>

                <div className="space-y-3 pt-6 border-t border-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  <div className="flex items-center justify-between">
                    <span>Role</span>
                    <span className={clsx(
                      "px-2 py-0.5 rounded",
                      user.is_admin ? "text-indigo-600 bg-indigo-50" : "text-slate-500 bg-slate-50"
                    )}>
                      {user.is_admin ? 'Admin' : 'Customer'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Status</span>
                    <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded">
                      Active
                    </span>
                  </div>
                </div>

                {isProcessing && (
                  <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
                    <Loader2 className="animate-spin text-indigo-600" size={24} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Admin Modal */}
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
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text"
                      required
                      value={newAdmin.full_name}
                      onChange={(e) => setNewAdmin({...newAdmin, full_name: e.target.value})}
                      placeholder="e.g. John Smith"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-400 text-slate-900"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="email"
                      required
                      value={newAdmin.email}
                      onChange={(e) => setNewAdmin({...newAdmin, email: e.target.value})}
                      placeholder="admin@decant.com"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-400 text-slate-900"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Initial Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="password"
                      required
                      value={newAdmin.password}
                      onChange={(e) => setNewAdmin({...newAdmin, password: e.target.value})}
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
    </div>
  );
}
