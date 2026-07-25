'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Monitor, Gamepad2, Film, LayoutDashboard, LogOut } from 'lucide-react';

const menuItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Pantallas', href: '/screens', icon: Monitor },
  { name: 'Juegos', href: '/games', icon: Gamepad2 },
  { name: 'Videos', href: '/videos', icon: Film },
];

export default function Sidebar() {
  const pathname = usePathname();

  const handleLogout = () => {
    // Hack to clear Basic Auth cache in most browsers
    fetch('/', {
      headers: {
        'Authorization': 'Basic ' + btoa('logout:logout')
      }
    }).finally(() => {
      window.location.href = '/';
    });
  };

  return (
    <aside className="fixed inset-y-0 left-0 w-64 glass border-r border-border/50 z-50 flex flex-col">
      <div className="flex items-center justify-center h-20 border-b border-border/50">
        <h1 className="text-2xl font-bold text-gradient tracking-tight">MyPlayAd</h1>
      </div>
      
      <nav className="flex-1 py-8 px-4 space-y-2">
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
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-border/50">
        <button 
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar Sesión</span>
        </button>
        <div className="text-xs text-center text-muted-foreground mt-4">
          &copy; {new Date().getFullYear()} MyPlayAd
        </div>
      </div>
    </aside>
  );
}
