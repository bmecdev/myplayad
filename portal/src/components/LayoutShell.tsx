'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { Menu, PanelLeft } from 'lucide-react';

interface SidebarContextType {
  isCollapsed: boolean;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  toggleCollapse: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleMobile: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a LayoutShell');
  }
  return context;
}

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string } | null>(null);

  // Cargar preferencia persistente de colapsado en desktop
  useEffect(() => {
    try {
      const saved = localStorage.getItem('myplayad_sidebar_collapsed');
      if (saved !== null) {
        setIsCollapsed(saved === 'true');
      }
    } catch (_) {}
  }, []);

  // Obtener info básica del usuario para la cabecera móvil
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data.user);
        }
      } catch (_) {}
    };
    if (!isLoginPage) fetchUser();
  }, [isLoginPage]);

  // Cerrar drawer móvil al navegar entre páginas
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('myplayad_sidebar_collapsed', String(next));
      } catch (_) {}
      return next;
    });
  };

  const toggleMobile = () => {
    setIsMobileOpen((prev) => !prev);
  };

  if (isLoginPage) {
    return <main className="w-full min-h-screen">{children}</main>;
  }

  return (
    <SidebarContext.Provider
      value={{
        isCollapsed,
        setIsCollapsed,
        toggleCollapse,
        isMobileOpen,
        setIsMobileOpen,
        toggleMobile,
      }}
    >
      <div className="min-h-screen flex flex-col w-full bg-background text-foreground">
        {/* BARRA SUPERIOR PARA DISPOSITIVOS MÓVILES (< lg) */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-[#0f1115]/90 backdrop-blur-md border-b border-white/5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleMobile}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition-colors cursor-pointer"
              aria-label="Abrir menú de navegación"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-xl font-bold text-gradient tracking-tight">MyPlayAd</span>
          </div>

          {currentUser && (
            <div className="flex items-center gap-2 text-xs">
              <span
                className={`px-2.5 py-0.5 rounded-full font-medium border text-[11px] ${
                  currentUser.role === 'SUPER_ADMIN'
                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                    : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                }`}
              >
                {currentUser.role === 'SUPER_ADMIN' ? 'Super Admin' : currentUser.name}
              </span>
            </div>
          )}
        </header>

        {/* TELÓN / BACKDROP PARA MÓVILES */}
        {isMobileOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />
        )}

        {/* SIDEBAR RETRÁCTIL / RESPONSIVE */}
        <Sidebar />

        {/* CONTENEDOR PRINCIPAL RESPONSIVE */}
        <div
          className={`flex-1 flex flex-col w-full transition-all duration-300 ${
            isCollapsed ? 'lg:pl-0' : 'lg:pl-64'
          }`}
        >
          {/* BOTÓN DE ESCRITORIO PARA REAPARECER EL MENÚ CUANDO ESTÁ OCULTO */}
          {isCollapsed && (
            <div className="hidden lg:block sticky top-4 left-4 z-20 self-start ml-6 mt-4 -mb-10">
              <button
                type="button"
                onClick={toggleCollapse}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#181a20]/90 hover:bg-[#1e293b] text-slate-200 border border-white/10 shadow-2xl backdrop-blur-md transition-all hover:scale-105 cursor-pointer"
                title="Mostrar menú lateral (Expandir)"
              >
                <PanelLeft className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold">Mostrar Menú</span>
              </button>
            </div>
          )}

          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}

