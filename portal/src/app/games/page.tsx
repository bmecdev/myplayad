'use client';

import { useState, useEffect } from 'react';
import { Gamepad2, Database, Lock, CheckCircle2 } from 'lucide-react';

type Game = {
  id: string;
  name: string;
  slug: string;
  description: string;
  isIncluded?: boolean;
};

type UserSession = {
  id: string;
  role: 'SUPER_ADMIN' | 'CLIENT';
  plan?: {
    name: string;
  } | null;
};

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [meRes, gamesRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/games?all=true'),
      ]);

      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentUser(meData.user);
      }

      if (gamesRes.ok) {
        const gamesData = await gamesRes.json();
        setGames(gamesData);
      }
    } catch (err) {
      console.error('Error fetching games:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Gamepad2 className="w-8 h-8 text-green-500" />
            {isSuperAdmin ? 'Catálogo de Juegos' : 'Juegos de tu Plan'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isSuperAdmin
              ? 'Todos los minijuegos arcade disponibles en el sistema.'
              : `Catálogo de juegos según tu suscripción (${currentUser?.plan?.name || 'Sin Plan'}).`}
          </p>
        </div>

        {isSuperAdmin ? (
          <div className="bg-green-500/10 text-green-500 px-4 py-2 rounded-xl flex items-center gap-2 border border-green-500/20 text-sm font-medium">
            <Database className="w-4 h-4" /> Auto-sync activado
          </div>
        ) : (
          currentUser?.plan && (
            <div className="bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-xl flex items-center gap-2 border border-emerald-500/20 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" /> {currentUser.plan.name}
            </div>
          )
        )}
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Cargando juegos...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {games.map((game) => {
            const hasAccess = isSuperAdmin || game.isIncluded;
            return (
              <div
                key={game.id}
                className={`glass-card rounded-2xl p-6 relative group border transition-all ${
                  hasAccess
                    ? 'border-green-500/20 hover:border-green-500/40'
                    : 'border-white/5 opacity-60 bg-black/40'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className={`text-xl font-bold ${hasAccess ? 'text-green-400' : 'text-slate-400'}`}>
                      {game.name}
                    </h3>
                    <p className="text-sm text-muted-foreground bg-black/30 inline-block px-2 py-0.5 rounded mt-2">
                      /{game.slug}
                    </p>
                  </div>

                  {!hasAccess ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Lock className="w-3.5 h-3.5" /> Bloqueado
                    </span>
                  ) : (
                    !isSuperAdmin && (
                      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Habilitado
                      </span>
                    )
                  )}
                </div>

                <p className="text-sm text-gray-400 mb-2">{game.description}</p>
              </div>
            );
          })}

          {games.length === 0 && (
            <div className="col-span-full text-center py-12 glass-card rounded-2xl border-dashed">
              <Gamepad2 className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No hay juegos disponibles en este momento.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
