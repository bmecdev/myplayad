'use client';

import { useState, useEffect } from 'react';
import { Award, Plus, Trash2, Edit2, Gamepad2, Users, Check } from 'lucide-react';

type Game = {
  id: string;
  name: string;
  slug: string;
};

type PlanItem = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  games: Game[];
  _count?: {
    users: number;
  };
};

export default function PlansPage() {
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    gameIds: [] as string[],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [plansRes, gamesRes] = await Promise.all([
        fetch('/api/plans'),
        fetch('/api/games?all=true'),
      ]);

      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setPlans(plansData);
      }
      if (gamesRes.ok) {
        const gamesData = await gamesRes.json();
        setAllGames(gamesData);
      }
    } catch (err) {
      console.error('Error fetching plans/games:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      gameIds: [],
    });
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (plan: PlanItem) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || '',
      gameIds: plan.games.map((g) => g.id),
    });
    setError(null);
    setIsModalOpen(true);
  };

  const toggleGameSelection = (gameId: string) => {
    setFormData((prev) => {
      const exists = prev.gameIds.includes(gameId);
      return {
        ...prev,
        gameIds: exists
          ? prev.gameIds.filter((id) => id !== gameId)
          : [...prev.gameIds, gameId],
      };
    });
  };

  const selectAllGames = () => {
    setFormData((prev) => ({
      ...prev,
      gameIds: allGames.map((g) => g.id),
    }));
  };

  const clearAllGames = () => {
    setFormData((prev) => ({
      ...prev,
      gameIds: [],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const url = editingPlan ? `/api/plans/${editingPlan.id}` : '/api/plans';
      const method = editingPlan ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Ocurrió un error al guardar el plan.');
        setSubmitting(false);
        return;
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (plan: PlanItem) => {
    if (!confirm(`¿Estás seguro de eliminar el plan "${plan.name}"? Los clientes asociados quedarán sin plan asignado.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/plans/${plan.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Error al eliminar plan');
        return;
      }
      fetchData();
    } catch (err) {
      console.error('Error deleting plan:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Award className="w-8 h-8 text-emerald-400" /> Planes de Suscripción
          </h1>
          <p className="text-muted-foreground mt-2">
            Configura qué juegos arcade tiene habilitados cada cliente según el plan contratado.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors font-medium shadow-[0_0_15px_rgba(16,185,129,0.3)]"
        >
          <Plus className="w-5 h-5" /> Nuevo Plan
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Cargando planes...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div key={plan.id} className="glass-card rounded-2xl p-6 border border-emerald-500/20 flex flex-col justify-between relative group">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-2xl font-bold text-emerald-400">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">slug: {plan.slug}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(plan)}
                      className="p-2 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
                      title="Editar Plan"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(plan)}
                      className="p-2 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                      title="Eliminar Plan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-slate-300 mb-4 min-h-[40px]">
                  {plan.description || 'Sin descripción.'}
                </p>

                <div className="space-y-2 mb-6">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Gamepad2 className="w-4 h-4 text-emerald-400" />
                    Juegos Incluidos ({plan.games.length}):
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {plan.games.map((g) => (
                      <span
                        key={g.id}
                        className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium"
                      >
                        {g.name}
                      </span>
                    ))}
                    {plan.games.length === 0 && (
                      <span className="text-xs text-amber-400/80 italic">Ningún juego asignado aún.</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  {plan._count?.users || 0} cliente(s) activos
                </span>
                <span className="text-emerald-400 font-medium">Activo</span>
              </div>
            </div>
          ))}

          {plans.length === 0 && (
            <div className="col-span-full text-center py-12 glass-card rounded-2xl border-dashed">
              <Award className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No hay planes registrados. Crea uno para comenzar a comercializar juegos.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal Crear / Editar Plan */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-white/10 max-h-[90vh] flex flex-col">
            <h2 className="text-2xl font-bold mb-4">
              {editingPlan ? 'Editar Plan de Suscripción' : 'Nuevo Plan de Suscripción'}
            </h2>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-1">
                  Nombre del Plan
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ej: Plan Arcade Oro"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-black/40 border border-slate-700/80 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-1">
                  Identificador / Slug (opcional)
                </label>
                <input
                  type="text"
                  placeholder="ej: arcade-oro"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full bg-black/40 border border-slate-700/80 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-1">
                  Descripción
                </label>
                <textarea
                  placeholder="Detalles de lo que incluye este plan para el cliente..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-black/40 border border-slate-700/80 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 min-h-[70px]"
                />
              </div>

              {/* Selección de Juegos Incluidos */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-300">
                    Juegos Habilitados ({formData.gameIds.length}/{allGames.length})
                  </label>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={selectAllGames}
                      className="text-emerald-400 hover:underline"
                    >
                      Todos
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={clearAllGames}
                      className="text-muted-foreground hover:underline"
                    >
                      Ninguno
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-black/30 rounded-xl border border-white/5">
                  {allGames.map((game) => {
                    const isSelected = formData.gameIds.includes(game.id);
                    return (
                      <div
                        key={game.id}
                        onClick={() => toggleGameSelection(game.id)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs font-medium ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                            : 'bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/5'
                        }`}
                      >
                        <span className="truncate">{game.name}</span>
                        {isSelected && <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl hover:bg-white/5 transition-colors text-sm"
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl transition-colors font-medium text-sm disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : editingPlan ? 'Guardar Cambios' : 'Crear Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
