import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { Monitor, Gamepad2, Film, Users, Award, ShieldCheck, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const currentUser = await getCurrentUser();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  let screensCount = 0;
  let gamesCount = 0;
  let videosCount = 0;
  let clientsCount = 0;
  let plansCount = 0;

  if (isSuperAdmin) {
    const [sc, gc, vc, cc, pc] = await Promise.all([
      prisma.screen.count(),
      prisma.game.count(),
      prisma.video.count(),
      prisma.user.count({ where: { role: 'CLIENT' } }),
      prisma.plan.count(),
    ]);
    screensCount = sc;
    gamesCount = gc;
    videosCount = vc;
    clientsCount = cc;
    plansCount = pc;
  } else if (currentUser) {
    const [sc, vc] = await Promise.all([
      prisma.screen.count({ where: { userId: currentUser.id } }),
      prisma.video.count({
        where: {
          schedules: {
            some: {
              screen: { userId: currentUser.id }
            }
          }
        }
      }),
    ]);
    screensCount = sc;
    videosCount = vc;
    gamesCount = currentUser.plan?.games?.length || 0;
  }

  const superAdminStats = [
    { name: 'Pantallas Totales', value: screensCount, icon: Monitor, color: 'text-blue-500', bg: 'bg-blue-500/10', href: '/screens' },
    { name: 'Clientes Activos', value: clientsCount, icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10', href: '/users' },
    { name: 'Planes Creados', value: plansCount, icon: Award, color: 'text-emerald-500', bg: 'bg-emerald-500/10', href: '/plans' },
    { name: 'Juegos Sincronizados', value: gamesCount, icon: Gamepad2, color: 'text-green-500', bg: 'bg-green-500/10', href: '/games' },
    { name: 'Videos Subidos', value: videosCount, icon: Film, color: 'text-amber-500', bg: 'bg-amber-500/10', href: '/videos' },
  ];

  const clientStats = [
    { name: 'Mis Pantallas Rentadas', value: screensCount, icon: Monitor, color: 'text-blue-500', bg: 'bg-blue-500/10', href: '/screens' },
    { name: 'Juegos Habilitados', value: gamesCount, icon: Gamepad2, color: 'text-green-500', bg: 'bg-green-500/10', href: '/games' },
    { name: 'Videos en Mis Pantallas', value: videosCount, icon: Film, color: 'text-purple-500', bg: 'bg-purple-500/10', href: '/videos' },
  ];

  const stats = isSuperAdmin ? superAdminStats : clientStats;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            {isSuperAdmin
              ? 'Panel de control maestro de la plataforma MyPlayAd.'
              : `Bienvenido, ${currentUser?.name || 'Cliente'}. Gestiona tus pantallas interactivas.`}
          </p>
        </div>

        {currentUser && (
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl">
            {isSuperAdmin ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-purple-400">
                <ShieldCheck className="w-4 h-4" /> Super Administrador
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                <CheckCircle2 className="w-4 h-4" /> Plan: {currentUser.plan?.name || 'Sin Plan'}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.name} href={stat.href}>
              <div className="glass-card rounded-2xl p-6 flex items-center gap-4 transition-transform hover:scale-105 cursor-pointer border border-white/5">
                <div className={`p-4 rounded-xl ${stat.bg}`}>
                  <Icon className={`w-8 h-8 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                  <p className="text-3xl font-bold mt-0.5">{stat.value}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
