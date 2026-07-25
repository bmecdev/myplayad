import prisma from '@/lib/prisma';
import { Monitor, Gamepad2, Film, Calendar } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const [screensCount, gamesCount, videosCount, schedulesCount] = await Promise.all([
    prisma.screen.count(),
    prisma.game.count(),
    prisma.video.count(),
    prisma.schedule.count(),
  ]);

  const stats = [
    { name: 'Pantallas', value: screensCount, icon: Monitor, color: 'text-blue-500', bg: 'bg-blue-500/10', href: '/screens' },
    { name: 'Juegos', value: gamesCount, icon: Gamepad2, color: 'text-green-500', bg: 'bg-green-500/10', href: '/games' },
    { name: 'Videos', value: videosCount, icon: Film, color: 'text-purple-500', bg: 'bg-purple-500/10', href: '/videos' },
    { name: 'Programaciones', value: schedulesCount, icon: Calendar, color: 'text-orange-500', bg: 'bg-orange-500/10', href: '/schedules' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Resumen de tu infraestructura de MyPlayAd.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.name} href={stat.href}>
              <div className="glass-card rounded-2xl p-6 flex items-center gap-4 transition-transform hover:scale-105 cursor-pointer">
                <div className={`p-4 rounded-xl ${stat.bg}`}>
                  <Icon className={`w-8 h-8 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
