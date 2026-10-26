import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { Monitor, Gamepad2, Film, Users, Award, ShieldCheck, CheckCircle2, Radio, Zap, Building2, Store } from 'lucide-react';
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

      {/* Sección Informativa: Modalidades Físicas de Pantallas & 4G */}
      <div className="mt-10 pt-6 border-t border-white/5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Monitor className="w-5 h-5 text-primary" /> Modalidades de Pantallas MyPlayAd
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Estaciones físicas interactivas listas para operar en puntos comerciales.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>4G LTE Incluido • Solo Electricidad</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pantalla Grande Fija */}
          <div className="glass-card rounded-2xl p-6 border border-blue-500/20 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Pantalla Grande Fija</h3>
              <p className="text-xs text-blue-400 font-medium">Ideal para Centros Comerciales (CC / Malls)</p>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Tótem vertical de gran formato (43&quot;, 55&quot;, 65&quot;+) con resolución Full HD / 4K. Diseñado para áreas de alto tráfico peatonal como pasillos principales, plazas centrales y plazoletas de comidas. Chasis robusto con protección antivandálica.
            </p>
            <div className="pt-2 flex flex-wrap gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-white/5 text-slate-300 border border-white/5">
                Alta Visibilidad 4K
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20">
                Instalación Fija Robusta
              </span>
            </div>
          </div>

          {/* Pantalla Mediana Portable */}
          <div className="glass-card rounded-2xl p-6 border border-purple-500/20 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Pantalla Mediana Portable</h3>
              <p className="text-xs text-purple-400 font-medium">Ideal para Negocios Locales, Ferias y Stands</p>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Formato estilizado y ligero (32&quot; a 43&quot;) optimizado para fácil transporte y montaje rápido en recepciones, ferias comerciales, eventos corporativos y tiendas retail. Incluye base portable o atril ajustable.
            </p>
            <div className="pt-2 flex flex-wrap gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-white/5 text-slate-300 border border-white/5">
                Montaje en 5 Minutos
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20">
                100% Transportable
              </span>
            </div>
          </div>
        </div>

        {/* Banner Plug & Play */}
        <div className="glass rounded-2xl p-5 border border-emerald-500/20 bg-emerald-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-emerald-300">
                Tecnología Plug & Play: ¡Lo único que necesitas es electricidad!
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                Todas las pantallas vienen con conectividad 4G LTE móvil integrada de fábrica. No requieres solicitar Wi-Fi, cableado ethernet ni abrir puertos de red.
              </p>
            </div>
          </div>
          <Link
            href="/screens"
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shrink-0 transition-colors cursor-pointer"
          >
            Ver Mis Pantallas
          </Link>
        </div>
      </div>
    </div>
  );
}
