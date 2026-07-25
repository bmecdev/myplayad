'use client';

import { useState, useEffect } from 'react';
import { Gamepad2, Database } from 'lucide-react';

type Game = {
  id: string;
  name: string;
  slug: string;
  description: string;
};

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGames = async () => {
    const res = await fetch('/api/games');
    const data = await res.json();
    setGames(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchGames();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Gamepad2 className="w-8 h-8 text-green-500" /> Juegos
          </h1>
          <p className="text-muted-foreground mt-2">Los juegos se sincronizan automáticamente desde el sistema de archivos del servidor.</p>
        </div>
        <div className="bg-green-500/10 text-green-500 px-4 py-2 rounded-xl flex items-center gap-2 border border-green-500/20">
          <Database className="w-5 h-5" /> Auto-sync activado
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10">Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {games.map(game => (
            <div key={game.id} className="glass-card rounded-2xl p-6 relative group border border-green-500/20">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-green-400">{game.name}</h3>
                  <p className="text-sm text-muted-foreground bg-black/30 inline-block px-2 py-1 rounded mt-2">
                    /{game.slug}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-400 mb-2">{game.description}</p>
            </div>
          ))}
          {games.length === 0 && (
            <div className="col-span-full text-center py-12 glass-card rounded-2xl border-dashed">
              <Gamepad2 className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No hay juegos sincronizados. Asegúrate de subirlos a la carpeta correspondiente en el servidor.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
