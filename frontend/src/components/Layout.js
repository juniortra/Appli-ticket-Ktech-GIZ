import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { GlobalSearch } from './GlobalSearch';
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  Calendar,
  Users,
  LogOut,
  Menu,
  X,
  BarChart3,
} from 'lucide-react';

export const Layout = () => {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard, testId: 'nav-dashboard' },
    { path: '/forms/frm', label: 'FRM', icon: FileText, testId: 'nav-frm' },
    { path: '/forms/fdi', label: 'FDI', icon: ClipboardList, testId: 'nav-fdi' },
    { path: '/forms/rdd', label: 'RDD', icon: FileText, testId: 'nav-rdd' },
    { path: '/forms/rdi', label: 'RDI', icon: FileText, testId: 'nav-rdi' },
    { path: '/tasks', label: 'Tâches', icon: Calendar, testId: 'nav-tasks' },
    { path: '/reports', label: 'Rapports', icon: BarChart3, testId: 'nav-reports' },
  ];

  if (isAdmin) {
    menuItems.push({ path: '/admin/users', label: 'Utilisateurs', icon: Users, testId: 'nav-users' });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 w-full border-b bg-card">
        <div className="flex h-16 items-center px-4 gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            data-testid="sidebar-toggle"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <div className="flex items-center gap-3">
            <img
              src="/logo-ktech.png"
              alt="K-Technology"
              className="h-10 w-auto object-contain"
            />
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold leading-none text-primary">K-Technology</h1>
              <p className="text-xs text-muted-foreground">Expertise & Innovation</p>
            </div>
          </div>

          {/* Global Search Bar */}
          <div className="flex-1 max-w-md mx-4 hidden md:block">
            <GlobalSearch />
          </div>

          <div className="ml-auto flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="logout-button">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed md:sticky top-16 left-0 z-40 h-[calc(100vh-4rem)] w-64 border-r bg-card transform transition-transform md:transform-none ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } md:translate-x-0`}
        >
          <nav className="flex flex-col gap-1 p-4" data-testid="sidebar-nav">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              return (
                <Link key={item.path} to={item.path} data-testid={item.testId}>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={`w-full justify-start gap-3 ${
                      isActive ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 md:p-8" data-testid="main-content">
          <Outlet />
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};
