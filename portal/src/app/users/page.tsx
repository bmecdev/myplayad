'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Edit2, Shield, User, Award, Monitor } from 'lucide-react';

type Plan = {
  id: string;
  name: string;
  slug: string;
};

type UserItem = {
  id: string;
  username: string;
  name: string;
  email?: string | null;
  role: 'SUPER_ADMIN' | 'CLIENT';
  createdAt: string;
  planId?: string | null;
  plan?: Plan | null;
  _count?: {
    screens: number;
  };
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    email: '',
    role: 'CLIENT',
    planId: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [usersRes, plansRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/plans'),
      ]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
      }
      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setPlans(plansData);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      username: '',
      password: '',
      email: '',
      role: 'CLIENT',
      planId: plans[0]?.id || '',
    });
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (user: UserItem) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      username: user.username,
      password: '', // Dejar en blanco para no modificar
      email: user.email || '',
      role: user.role,
      planId: user.planId || '',
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Ocurrió un error al guardar el usuario.');
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

  const handleDelete = async (user: UserItem) => {
    if (!confirm(`¿Estás seguro de eliminar al usuario "${user.name}" (@${user.username})? Las pantallas asociadas quedarán sin asignar.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Error al eliminar usuario');
        return;
      }
      fetchData();
    } catch (err) {
      console.error('Error deleting user:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-8 h-8 text-primary" /> Clientes y Usuarios
          </h1>
          <p className="text-muted-foreground mt-2">
            Administra las cuentas de clientes que rentan pantallas y asígnales planes de suscripción.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors font-medium shadow-[0_0_15px_rgba(59,130,246,0.3)]"
        >
          <Plus className="w-5 h-5" /> Nuevo Cliente
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Cargando usuarios...</div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden border border-white/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/30 border-b border-white/5 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-4 px-6">Cliente / Usuario</th>
                  <th className="py-4 px-6">Rol</th>
                  <th className="py-4 px-6">Plan Asignado</th>
                  <th className="py-4 px-6">Pantallas</th>
                  <th className="py-4 px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((user) => {
                  const isSuperAdmin = user.role === 'SUPER_ADMIN';
                  return (
                    <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSuperAdmin ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            {isSuperAdmin ? <Shield className="w-5 h-5" /> : <User className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-100">{user.name}</p>
                            <p className="text-xs text-muted-foreground">@{user.username} {user.email && `• ${user.email}`}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          isSuperAdmin 
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          {isSuperAdmin ? 'Super Admin' : 'Cliente'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {isSuperAdmin ? (
                          <span className="text-xs text-muted-foreground">Acceso Ilimitado</span>
                        ) : user.plan ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Award className="w-3.5 h-3.5" />
                            {user.plan.name}
                          </span>
                        ) : (
                          <span className="text-xs text-amber-400/80 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                            Sin Plan
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Monitor className="w-4 h-4 text-primary" />
                          <span className="font-medium">{user._count?.screens || 0}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-2 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
                            title="Editar Usuario"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            className="p-2 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                            title="Eliminar Usuario"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No hay clientes registrados aún.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Crear / Editar Usuario */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass rounded-2xl w-full max-w-md p-6 shadow-2xl border border-white/10">
            <h2 className="text-2xl font-bold mb-4">
              {editingUser ? 'Editar Cliente / Usuario' : 'Nuevo Cliente / Usuario'}
            </h2>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-1">
                  Nombre Completo o Empresa
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ej: Mall Plaza Sur / Juan Pérez"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-black/40 border border-slate-700/80 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-1">
                  Usuario de Acceso
                </label>
                <input
                  required
                  type="text"
                  placeholder="ej: cliente_mall"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full bg-black/40 border border-slate-700/80 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-1">
                  {editingUser ? 'Nueva Contraseña (dejar en blanco para no cambiar)' : 'Contraseña'}
                </label>
                <input
                  type="password"
                  placeholder={editingUser ? '••••••••' : 'Contraseña segura'}
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-black/40 border border-slate-700/80 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-1">
                  Correo Electrónico (opcional)
                </label>
                <input
                  type="email"
                  placeholder="contacto@cliente.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-black/40 border border-slate-700/80 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-1">
                    Rol
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full bg-black/40 border border-slate-700/80 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="CLIENT" className="bg-[#181a20]">Cliente</option>
                    <option value="SUPER_ADMIN" className="bg-[#181a20]">Super Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-1">
                    Plan
                  </label>
                  <select
                    disabled={formData.role === 'SUPER_ADMIN'}
                    value={formData.planId}
                    onChange={(e) => setFormData({ ...formData, planId: e.target.value })}
                    className="w-full bg-black/40 border border-slate-700/80 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary disabled:opacity-50"
                  >
                    <option value="" className="bg-[#181a20]">Sin Plan Asignado</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id} className="bg-[#181a20]">
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6 pt-2 border-t border-white/5">
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
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl transition-colors font-medium text-sm disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
