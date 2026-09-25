import type { Metadata } from 'next';
import './globals.css';
import LayoutShell from '@/components/LayoutShell';

export const metadata: Metadata = {
  title: 'MyPlayAd Portal',
  description: 'Portal administrativo para pantallas interactivas.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased min-h-screen flex bg-background text-foreground">
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
