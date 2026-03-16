"use client";

import React, { useState } from 'react';
import { 
  User, 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  Database,
  Save,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { useAdminStore } from '@/store/useAdminStore';
import { clsx } from 'clsx';

export default function SettingsPage() {
  const { admin } = useAdminStore();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', name: 'Profile Information', icon: User },
    { id: 'security', name: 'Security & Auth', icon: Shield },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'system', name: 'System Settings', icon: Database },
  ];

  const handleSave = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Settings</h1>
          <p className="text-slate-500 mt-1">Manage your administrator profile and system preferences.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={loading}
          className="bg-indigo-600 text-white px-8 py-2.5 rounded-xl flex items-center space-x-2 font-bold text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          <span>{loading ? 'Saving Changes...' : 'Save Settings'}</span>
        </button>
      </div>

      {success && (
        <div className="p-4 bg-green-50 text-green-700 rounded-xl border border-green-100 flex items-center space-x-3 text-sm font-bold animate-in slide-in-from-top-4">
          <CheckCircle2 size={18} />
          <span>Your settings have been updated successfully!</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-8">
        {/* Navigation Tabs */}
        <aside className="w-full md:w-64 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all text-sm font-bold",
                activeTab === tab.id 
                  ? "bg-white text-indigo-600 shadow-sm border border-slate-200" 
                  : "text-slate-500 hover:bg-white/50 hover:text-slate-900"
              )}
            >
              <tab.icon size={18} />
              <span>{tab.name}</span>
            </button>
          ))}
        </aside>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          {activeTab === 'profile' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="flex items-center space-x-6">
                  <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-100">
                    <User size={40} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">{admin?.full_name || 'Admin User'}</h3>
                    <p className="text-slate-500 text-sm">{admin?.email || 'admin@decant.com'}</p>
                    <button className="text-indigo-600 text-xs font-bold mt-2 hover:underline underline-offset-4">Change Avatar</button>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Full Name</label>
                    <input 
                      type="text" 
                      defaultValue={admin?.full_name || 'Admin User'}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Email Address</label>
                    <input 
                      type="email" 
                      defaultValue={admin?.email || 'admin@decant.com'}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-400 font-bold outline-none cursor-not-allowed" 
                      disabled
                    />
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
               <h3 className="font-bold text-slate-900 text-lg border-b border-slate-100 pb-4">Password Security</h3>
               <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Current Password</label>
                    <input 
                      type="password" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" 
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">New Password</label>
                      <input 
                        type="password" 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Confirm Password</label>
                      <input 
                        type="password" 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" 
                      />
                    </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
               <h3 className="font-bold text-slate-900 text-lg border-b border-slate-100 pb-4">Notification Preferences</h3>
               <div className="space-y-4 pt-2">
                  {[
                    "Email notifications on new orders",
                    "Stock alerts for popular fragrances",
                    "Daily sales summary reports",
                    "Weekly analytics digest"
                  ].map((text, i) => (
                    <label key={i} className="flex items-center space-x-3 cursor-pointer group">
                      <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20" />
                      <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{text}</span>
                    </label>
                  ))}
               </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
               <h3 className="font-bold text-slate-900 text-lg border-b border-slate-100 pb-4">System Preferences</h3>
               <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Currency Symbol</label>
                    <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none">
                       <option value="INR">₹ (INR)</option>
                       <option value="USD">$ (USD)</option>
                       <option value="EUR">€ (EUR)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Tax Percentage (%)</label>
                    <input 
                      type="number" 
                      defaultValue={18}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none" 
                    />
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
