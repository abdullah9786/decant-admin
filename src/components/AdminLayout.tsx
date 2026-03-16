import React from 'react';

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-indigo-900 text-white flex-shrink-0">
        <div className="p-6">
          <h2 className="text-2xl font-bold italic tracking-wider">Scents Admin</h2>
        </div>
        <nav className="mt-6">
          <a href="#" className="block py-2.5 px-6 bg-indigo-800 text-white">Dashboard</a>
          <a href="#" className="block py-2.5 px-6 text-indigo-300 hover:bg-indigo-800 hover:text-white transition-colors">Products</a>
          <a href="#" className="block py-2.5 px-6 text-indigo-300 hover:bg-indigo-800 hover:text-white transition-colors">Orders</a>
          <a href="#" className="block py-2.5 px-6 text-indigo-300 hover:bg-indigo-800 hover:text-white transition-colors">Customers</a>
          <a href="#" className="block py-2.5 px-6 text-indigo-300 hover:bg-indigo-800 hover:text-white transition-colors">Settings</a>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm h-16 flex items-center justify-between px-8">
          <h1 className="text-xl font-semibold text-gray-800">Dashboard Overiew</h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">Admin User</span>
            <div className="w-8 h-8 rounded-full bg-indigo-500"></div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-8 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
