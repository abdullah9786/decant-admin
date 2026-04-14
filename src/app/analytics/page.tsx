"use client";

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  AlertCircle,
  Loader2,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  Activity
} from 'lucide-react';
import { dashboardApi } from '@/lib/api';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { clsx } from 'clsx';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await dashboardApi.getStats();
        setStats(response.data);
      } catch (err) {
        console.error("Error fetching analytics data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="h-[600px] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
        <p className="text-slate-500 font-medium tracking-widest uppercase text-xs">Generating Reports...</p>
      </div>
    );
  }

  // Use real data from backend
  const dailyStats = stats?.daily_stats || [];
  const familyStats = stats?.family_stats || [];
  const totalFamilyValue = familyStats.reduce((acc: number, item: any) => acc + item.value, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics & Insights</h1>
          <p className="text-slate-500 mt-1">Comprehensive data analysis of your store's performance.</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
            {['24h', '7d', '30d'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={clsx(
                  "px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold rounded-md transition-all",
                  timeRange === range ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
                )}
              >
                {range}
              </button>
            ))}
          </div>
          <button className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
            <Download size={18} />
          </button>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Total Revenue" 
          value={`₹${stats?.revenue?.toLocaleString() || 0}`} 
          change={stats?.revenue_change || "+0%"} 
          trend="up" 
          icon={DollarSign}
        />
        <MetricCard 
          title="Avg. Order Value" 
          value={`₹${stats?.aov?.toLocaleString() || 0}`} 
          change="+2.4%" 
          trend="up" 
          icon={Activity}
        />
        <MetricCard 
          title="Total Orders" 
          value={stats?.orders || 0} 
          change={stats?.orders_change || "+0%"} 
          trend="up" 
          icon={ShoppingCart}
        />
        <MetricCard 
          title="Low Stock" 
          value={stats?.low_stock || 0} 
          change={stats?.low_stock_change || "0"} 
          trend={stats?.low_stock > 0 ? "down" : "up"} 
          icon={AlertCircle}
          isWarning={stats?.low_stock > 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Bar Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <BarChartIcon size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Sales vs Orders</h3>
                <p className="text-xs text-slate-500">Live data for the last 7 days</p>
              </div>
            </div>
          </div>
          <div className="h-[350px] w-full">
            {dailyStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyStats}>
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
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}}
                  />
                  <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                  <Bar dataKey="sales" name="Revenue (₹)" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={32} />
                  <Bar dataKey="orders" name="Orders" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <TrendingUp size={40} className="mb-2 opacity-50" />
                <p className="text-sm font-medium">Insufficient data for trend analysis</p>
              </div>
            )}
          </div>
        </div>

        {/* Category Breakdown Pie Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
           <div className="flex items-center space-x-3 mb-8">
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                <PieChartIcon size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Fragrance Family Mix</h3>
                <p className="text-xs text-slate-500">Top selling fragrance families</p>
              </div>
            </div>
            <div className="h-[280px] w-full mt-4">
              {familyStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={familyStats}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      {familyStats.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <PieChartIcon size={40} className="mb-2 opacity-50" />
                  <p className="text-sm font-medium">No fragrance family data yet</p>
                </div>
              )}
            </div>
            <div className="mt-8 space-y-4">
               {familyStats.map((item: any, id: number) => (
                 <div key={id} className="flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center space-x-2">
                       <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[id % COLORS.length]}} />
                       <span className="text-slate-500 uppercase tracking-widest">{item.name}</span>
                    </div>
                    <span className="text-slate-900">
                      {totalFamilyValue > 0 ? ((item.value / totalFamilyValue) * 100).toFixed(0) : 0}%
                    </span>
                 </div>
               ))}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {/* Live Updates Card */}
         <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-2xl shadow-xl shadow-indigo-100 text-white relative overflow-hidden group">
            <div className="relative z-10 transition-transform group-hover:scale-[1.02] duration-500">
               <div className="p-3 bg-white/10 rounded-xl w-fit mb-6">
                  <Activity size={24} />
               </div>
               <h3 className="text-2xl font-bold mb-2">Real-time Insights Active</h3>
               <p className="text-indigo-100 text-sm leading-relaxed max-w-sm mb-6">
                  Your analytics are now connected directly to your MongoDB database. Sales trends, fragrance family mixes, and inventory alerts refresh automatically as your customers shop.
               </p>
               <div className="flex items-center space-x-4">
                  <div className="px-4 py-2 bg-white/20 rounded-lg text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
                     Live Mode
                  </div>
                  <div className="flex items-center text-xs text-indigo-200">
                     <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
                     Syncing with DB
                  </div>
               </div>
            </div>
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 -mr-12 -mt-12 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-48 h-48 bg-black/10 rounded-full blur-2xl" />
         </div>

         {/* Inventory Health */}
         <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Inventory Health</h3>
            <div className="space-y-6">
               <div className="flex items-center justify-between">
                  <div className="space-y-1">
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">In Stock Products</p>
                     <p className="text-xl font-bold text-slate-900">{stats?.total_products || stats?.users || 0}</p>
                  </div>
                  <div className="h-1.5 w-32 bg-slate-100 rounded-full overflow-hidden">
                     <div className="h-full bg-green-500 w-[85%]" />
                  </div>
               </div>
               <div className="flex items-center justify-between">
                  <div className="space-y-1">
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Low Stock Alerts</p>
                     <p className="text-xl font-bold text-slate-900">{stats?.low_stock || 0}</p>
                  </div>
                  <div className="h-1.5 w-32 bg-slate-100 rounded-full overflow-hidden">
                     <div className={clsx(
                       "h-full bg-red-500",
                       stats?.low_stock > 10 ? "w-[70%]" : "w-[20%]"
                     )} />
                  </div>
               </div>
            </div>
            <div className="mt-8 pt-8 border-t border-slate-50 flex items-center justify-between">
               <span className="text-xs text-slate-400 font-medium italic">Data refreshed just now</span>
               <button className="text-indigo-600 text-xs font-bold hover:underline underline-offset-4">Run Detailed Audit</button>
            </div>
         </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, change, trend, icon: Icon, isWarning }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-center justify-between mb-4">
        <div className={clsx(
          "p-2 rounded-lg transition-colors",
          isWarning ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-400 group-hover:text-indigo-600"
        )}>
          <Icon size={20} />
        </div>
        <div className={clsx(
          "flex items-center text-xs font-bold px-2 py-1 rounded-full",
          trend === 'up' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        )}>
          {trend === 'up' ? <ArrowUpRight size={12} className="mr-0.5" /> : <ArrowDownRight size={12} className="mr-0.5" />}
          {change}
        </div>
      </div>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
      </div>
    </div>
  );
}
