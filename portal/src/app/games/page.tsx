'use client';

import { useState, useEffect } from 'react';
import { Gamepad2, Plus, Trash2 } from 'lucide-react';

type Game = {
  id: string;
  name: string;
  slug: string;
  description: string;
};

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', slug: '', description: '' });

  const fetchGames = async () => {
    const res = await fetch('/api/games');
    const data = await res.json();
    setGames(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    setFormData({ name: '', slug: '', description: '' });
    setIsModalOpen(false);
    fetchGames();
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este juego?')) {
      // NOTE: Should add an API route for deleting games. Assuming we create it later if needed.
      alert('Funcionalidad de borrar juego pendiente de API');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Gamepad2 className="w-8 h-8 text-green-500" /> Juegos
          </h1>
          <p className="text-muted-foreground mt-2">Registra los juegos web disponibles.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors font-medium shadow-[0_0_15px_rgba(34,197,94,0.3)]"
        >
          <Plus className="w-5 h-5" /> Nuevo Juego
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10">Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {games.map(game => (
            <div key={game.id} className="glass-card rounded-2xl p-6 relative group border border-green-500/20 hover:border-green-500/50 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-green-400">{game.name}</h3>
                  <p className="text-sm text-muted-foreground bg-black/30 inline-block px-2 py-1 rounded mt-2">
                    /{game.slug}
                  </p>
                </div>
                <button 
                  onClick={() => handleDelete(game.id)}
                  className="text-destructive/70 hover:text-destructive transition-colors p-2 rounded-lg hover:bg-destructive/10"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-400 mb-2">{game.description}</p>
            </div>
          ))}
          {games.length === 0 && (
            <div className="col-span-full text-center py-12 glass-card rounded-2xl border-dashed">
              <Gamepad2 className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No hay juegos registrados.</p>
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass rounded-2xl w-full max-w-md p-6 shadow-2xl border border-white/10">
            <h2 className="text-2xl font-bold mb-4">Registrar Juego</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <input 
                  required
                  type="text" 
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Ej: Snake Clásico"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Slug (URL)</label>
                <input 
                  required
                  type="text" 
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all"
                  value={formData.slug}
                  onChange={e => setFormData({...formData, slug: e.target.value})}
                  placeholder="Ej: snake"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <textarea 
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl transition-colors font-medium"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
