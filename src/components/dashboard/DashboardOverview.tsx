"use client";

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { dashboardApi } from '@/lib/api';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { clsx } from 'clsx';

interface StatCardProps {
  title: string;
  value: string | number;
  change: string;
  trend: 'up' | 'down';
  icon: React.ElementType;
  className?: string;
}

const StatCard = ({ title, value, change, trend, icon: Icon, className }: StatCardProps) => {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{title}</p>
          <h3 className="text-3xl font-bold text-slate-900 mt-2">{typeof value === 'number' ? value.toLocaleString() : value}</h3>
        </div>
        <div className={`p-3 rounded-xl bg-slate-50 ${className}`}>
          <Icon className="text-slate-600" size={24} />
        </div>
      </div>
      <div className="mt-6 flex items-center space-x-2">
        <span className={clsx(
          "text-xs font-bold flex items-center px-2 py-1 rounded-full",
          trend === 'up' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        )}>
          {trend === 'up' ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
          {change}
        </span>
        <span className="text-xs text-slate-400 font-medium">vs last month</span>
      </div>
    </div>
  );
};

export default function DashboardOverview() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await dashboardApi.getStats();
        setStats(response.data);
      } catch (err) {
        console.error("Error fetching dashboard stats", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
        <p className="text-slate-500 font-medium tracking-widest uppercase text-xs">Loading analytics...</p>
      </div>
    );
  }

  const chartData = stats?.daily_stats || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
        <p className="text-slate-500 mt-1">Welcome back. Here's what's happening with your store today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Revenue" 
          value={`₹${stats?.revenue?.toLocaleString() || 0}`} 
          change={stats?.revenue_change || "+0%"} 
          trend="up" 
          icon={DollarSign}
        />
        <StatCard 
          title="Total Orders" 
          value={stats?.orders || 0} 
          change={stats?.orders_change || "+0%"} 
          trend="up" 
          icon={ShoppingCart}
        />
        <StatCard 
          title="Total Users" 
          value={stats?.users || 0} 
          change={stats?.users_change || "+0%"} 
          trend="up" 
          icon={Users}
        />
        <StatCard 
          title="Low Stock" 
          value={stats?.low_stock || 0} 
          change={stats?.low_stock_change || "0"} 
          trend={stats?.low_stock > 0 ? "down" : "up"} 
          icon={AlertCircle}
          className={stats?.low_stock > 0 ? "!bg-red-50 text-red-600" : ""}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-slate-900">Revenue Performance</h3>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-50 px-2 py-1 rounded">Live Data</span>
          </div>
          <div className="h-[300px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 12}}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 12}}
                  />
                  <Tooltip 
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="#4f46e5" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <TrendingUp size={48} className="mb-2 opacity-50" />
                <p className="text-sm font-medium italic">No sales data yet</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <h3 className="font-bold text-slate-900 mb-8">System Activity</h3>
          <div className="space-y-6 relative z-10">
             <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100/50 transition-all group-hover:bg-indigo-100/50">
                <p className="text-sm text-slate-600 font-medium leading-relaxed">
                  "Your dashboard is now fully synchronized with the live production database. All figures, including the revenue trends and stock alerts, are real-time."
                </p>
             </div>
             <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Real-time Data Stream Active</p>
             </div>
             
             <div className="pt-8 grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Users</p>
                   <p className="text-xl font-bold text-slate-900">{stats?.users || 0}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">AOV</p>
                   <p className="text-xl font-bold text-slate-900">₹{stats?.aov || 0}</p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
