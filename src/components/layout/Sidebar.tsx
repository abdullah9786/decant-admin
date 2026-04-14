"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAdminStore } from '@/store/useAdminStore';
import { revokeRefreshOnServer } from '@/lib/api';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  Users, 
  BarChart3, 
  Boxes, 
  Tag,
  Sparkles,
  Settings, 
  LogOut,
  Menu,
  X,
  DollarSign,
  Wallet,
  Ticket,
  AlertTriangle,
  Gift,
} from 'lucide-react';
import { PerfumeBottle } from '@/components/icons/PerfumeBottle';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Brands', href: '/brands', icon: Sparkles },
  { name: 'Fragrance Families', href: '/fragrance-families', icon: Tag },
  { name: 'Gift Boxes', href: '/gift-boxes', icon: Gift },
  { name: 'Bottles', href: '/bottles', icon: PerfumeBottle },
  { name: 'Orders', href: '/orders', icon: ShoppingBag },
  { name: 'Abandoned', href: '/abandoned-checkouts', icon: AlertTriangle },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Inventory', href: '/inventory', icon: Boxes },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Influencers', href: '/influencers', icon: Sparkles },
  { name: 'Commissions', href: '/commissions', icon: DollarSign },
  { name: 'Payouts', href: '/payouts', icon: Wallet },
  { name: 'Coupons', href: '/coupons', icon: Ticket },
];

const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAdminStore();

  const handleLogout = async () => {
    const rt = useAdminStore.getState().refreshToken;
    await revokeRefreshOnServer(rt);
    logout();
    router.push('/login');
  };

  return (
    <aside className="w-64 bg-white h-screen fixed left-0 top-0 border-r border-slate-200 flex flex-col z-50">
      <div className="h-16 flex items-center px-6 border-b border-slate-100 italic">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-100">
            <span className="text-white font-bold">D</span>
          </div>
          <span className="text-slate-900 font-bold text-xl tracking-tight">DecantAdmin</span>
        </Link>
      </div>

      <nav className="flex-1 py-6 px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 group text-sm font-bold",
                isActive 
                  ? "bg-indigo-50 text-indigo-600 shadow-sm" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon size={20} className={cn(
                "transition-colors",
                isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
              )} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <Link 
          href="/settings"
          className={cn(
            "w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all text-sm font-bold",
            pathname === '/settings' 
              ? "bg-indigo-50 text-indigo-600 shadow-sm" 
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
          )}
        >
          <Settings size={20} className={cn(
            "transition-colors",
            pathname === '/settings' ? "text-indigo-600" : "text-slate-400"
          )} />
          <span>Settings</span>
        </Link>
        <button 
          onClick={handleLogout}
          className="w-full mt-1 flex items-center space-x-3 px-3 py-2.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 transition-all text-sm font-bold"
        >
          <LogOut size={20} className="text-slate-400" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
