'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return <main className="w-full min-h-screen">{children}</main>;
  }

  return (
    <>
      <Sidebar />
      <main className="flex-1 ml-64 p-8 overflow-y-auto min-h-screen">
        {children}
      </main>
    </>
  );
}

