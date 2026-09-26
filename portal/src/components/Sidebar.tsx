'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Monitor, Gamepad2, Film, LayoutDashboard, LogOut, Users, Award, Shield, User } from 'lucide-react';

type UserSession = {
  id: string;
  name: string;
  username: string;
  role: 'SUPER_ADMIN' | 'CLIENT';
  plan?: {
    id: string;
    name: string;
  } | null;
};

export default function Sidebar() {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data.user);
        }
      } catch (err) {
        console.warn('Error fetching session:', err);
      }
    };
    fetchSession();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Error cerrando sesión:', err);
    }
    window.location.href = '/login';
  };

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const menuItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: isSuperAdmin ? 'Pantallas' : 'Mis Pantallas', href: '/screens', icon: Monitor },
    ...(isSuperAdmin ? [
      { name: 'Clientes', href: '/users', icon: Users },
      { name: 'Planes', href: '/plans', icon: Award },
    ] : []),
    { name: isSuperAdmin ? 'Juegos' : 'Juegos de mi Plan', href: '/games', icon: Gamepad2 },
    { name: 'Videos', href: '/videos', icon: Film },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 w-64 glass border-r border-border/50 z-50 flex flex-col">
      {/* Logo */}
      <div className="flex items-center justify-center h-20 border-b border-border/50">
        <h1 className="text-2xl font-bold text-gradient tracking-tight">MyPlayAd</h1>
      </div>
      
      {/* Navegación */}
      <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                isActive 
                  ? 'bg-primary/20 text-primary border border-primary/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]' 
                  : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
      
      {/* Perfil del Usuario y Logout */}
      <div className="p-4 border-t border-border/50 space-y-3">
        {currentUser && (
          <div className="bg-black/30 p-3 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 mb-1">
              {isSuperAdmin ? (
                <Shield className="w-4 h-4 text-purple-400 flex-shrink-0" />
              ) : (
                <User className="w-4 h-4 text-blue-400 flex-shrink-0" />
              )}
              <span className="text-sm font-bold truncate text-slate-200">{currentUser.name}</span>
            </div>
            <div className="text-xs text-muted-foreground flex items-center justify-between">
              <span>{isSuperAdmin ? 'Super Admin' : 'Cliente'}</span>
              {!isSuperAdmin && currentUser.plan && (
                <span className="text-emerald-400 font-medium truncate max-w-[110px]" title={currentUser.plan.name}>
                  {currentUser.plan.name}
                </span>
              )}
            </div>
          </div>
        )}

        <button 
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar Sesión</span>
        </button>
        <div className="text-xs text-center text-muted-foreground">
          &copy; {new Date().getFullYear()} MyPlayAd
        </div>
      </div>
    </aside>
  );
}
