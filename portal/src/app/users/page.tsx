'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  Shield,
  User,
  Award,
  Monitor,
  Search,
  Check,
  AlertCircle,
  X,
  CheckCircle2,
  Eye,
  Cpu,
  ExternalLink,
  Unlink,
  Calendar,
  Clock,
  Power,
} from 'lucide-react';

type Plan = {
  id: string;
  name: string;
  slug: string;
};

type ScreenSummary = {
  id: string;
  name: string;
  location?: string | null;
  consoleId?: string | null;
  userId?: string | null;
  user?: {
    id: string;
    name: string;
    username: string;
  } | null;
  lastSeen?: string;
  displayState?: string;
};

type UserItem = {
  id: string;
  username: string;
  name: string;
  email?: string | null;
  role: 'SUPER_ADMIN' | 'CLIENT';
  isActive: boolean;
  planStartsAt?: string | null;
  planEndsAt?: string | null;
  createdAt: string;
  planId?: string | null;
  plan?: Plan | null;
  screens?: {
    id: string;
    name: string;
    location?: string | null;
    consoleId?: string | null;
    lastSeen?: string | null;
    displayState?: string | null;
  }[];
  _count?: {
    screens: number;
  };
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [allScreens, setAllScreens] = useState<ScreenSummary[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);

  // Modal State (Crear / Editar Usuario)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    email: '',
    role: 'CLIENT',
    isActive: true,
    planId: '',
    planStartsAt: '',
    planEndsAt: '',
    screenIds: [] as string[],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal State (Asignación Rápida de Pantallas a Cliente)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignActiveTab, setAssignActiveTab] = useState<'view' | 'assign'>('view');
  const [assigningUser, setAssigningUser] = useState<UserItem | null>(null);
  const [assignScreenIds, setAssignScreenIds] = useState<string[]>([]);
  const [assignSearch, setAssignSearch] = useState('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [meRes, usersRes, plansRes, screensRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/users'),
        fetch('/api/plans'),
        fetch('/api/screens'),
      ]);

      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentUser(meData.user);
      }
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
      }
      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setPlans(plansData);
      }
      if (screensRes.ok) {
        const screensData = await screensRes.json();
        setAllScreens(screensData);
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

  const getClientTenure = (createdAt?: string | Date | null) => {
    if (!createdAt) return 'Desconocido';
    const start = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    if (diffMs < 0) return 'Hoy';
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Hace 1 día';
    if (diffDays < 30) return `Hace ${diffDays} días`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `Hace ${diffMonths} ${diffMonths === 1 ? 'mes' : 'meses'}`;
    const diffYears = Math.floor(diffDays / 365);
    const remainingMonths = Math.floor((diffDays % 365) / 30);
    if (remainingMonths > 0) {
      return `Hace ${diffYears} ${diffYears === 1 ? 'año' : 'años'} y ${remainingMonths}m`;
    }
    return `Hace ${diffYears} ${diffYears === 1 ? 'año' : 'años'}`;
  };

  const MONTH_NAMES_ES = [
    'ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sept', 'oct', 'nov', 'dic'
  ];

  // Formateo de fecha sin desfase de zona horaria (UTC a fecha calendario pura)
  const formatPlanDate = (dateStr?: string | Date | null) => {
    if (!dateStr) return null;
    const clean = String(dateStr).trim().split('T')[0];
    const parts = clean.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    const [y, m, d] = parts;
    const monthName = MONTH_NAMES_ES[m - 1] || '';
    return `${d} ${monthName} ${y}`;
  };

  // Un plan se considera vencido si el día indicado ya pasó en hora local (hasta las 23:59:59.999)
  const isPlanExpired = (planEndsAt?: string | Date | null) => {
    if (!planEndsAt) return false;
    const clean = String(planEndsAt).trim().split('T')[0];
    const parts = clean.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return false;
    const [y, m, d] = parts;
    const endOfDay = new Date(y, m - 1, d, 23, 59, 59, 999);
    return endOfDay.getTime() < Date.now();
  };

  const isPlanPending = (planStartsAt?: string | Date | null) => {
    if (!planStartsAt) return false;
    const clean = String(planStartsAt).trim().split('T')[0];
    const parts = clean.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return false;
    const [y, m, d] = parts;
    const startOfDay = new Date(y, m - 1, d, 0, 0, 0, 0);
    return startOfDay.getTime() > Date.now();
  };

  const formatDateForInput = (d?: string | Date | null) => {
    if (!d) return '';
    return String(d).trim().split('T')[0];
  };

  // Cálculo de meses con aritmética de calendario pura sin desviaciones de huso horario
  const addMonthsToPlan = (months: number) => {
    const baseStr = formData.planStartsAt || new Date().toISOString().split('T')[0];
    const parts = baseStr.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return;
    const [y, m, d] = parts;
    const totalMonths = y * 12 + (m - 1) + months;
    const targetYear = Math.floor(totalMonths / 12);
    const targetMonth = (totalMonths % 12) + 1;
    const maxDays = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
    const targetDay = Math.min(d, maxDays);
    const pad = (n: number) => String(n).padStart(2, '0');
    const computedEndsAt = `${targetYear}-${pad(targetMonth)}-${pad(targetDay)}`;

    const isPast = new Date(targetYear, targetMonth - 1, targetDay, 23, 59, 59, 999).getTime() < Date.now();

    setFormData((prev) => ({
      ...prev,
      planEndsAt: computedEndsAt,
      isActive: !isPast,
    }));
  };

  const handleToggleActive = async (user: UserItem) => {
    if (user.role === 'SUPER_ADMIN') return;

    const planExpired = isPlanExpired(user.planEndsAt);
    if (planExpired && !user.isActive) {
      alert(
        'Este cliente tiene el plan vencido y no se puede activar directamente. Por favor edita el cliente y extiende la fecha de terminación del plan.'
      );
      openEditModal(user);
      return;
    }

    const newStatus = !user.isActive;
    setTogglingUserId(user.id);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, isActive: newStatus } : u))
        );
      } else {
        const data = await res.json();
        alert(data.error || 'Error al cambiar estado del cliente');
      }
    } catch (e: any) {
      alert(e.message || 'Error de conexión');
    } finally {
      setTogglingUserId(null);
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      username: '',
      password: '',
      email: '',
      role: 'CLIENT',
      isActive: true,
      planId: plans[0]?.id || '',
      planStartsAt: new Date().toISOString().split('T')[0],
      planEndsAt: '',
      screenIds: [],
    });
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (user: UserItem) => {
    setEditingUser(user);
    const userScreenIds = user.screens
      ? user.screens.map((s) => s.id)
      : allScreens.filter((s) => s.userId === user.id).map((s) => s.id);

    setFormData({
      name: user.name,
      username: user.username,
      password: '', // Dejar en blanco para no modificar
      email: user.email || '',
      role: user.role,
      isActive: user.isActive !== false,
      planId: user.planId || '',
      planStartsAt: formatDateForInput(user.planStartsAt),
      planEndsAt: formatDateForInput(user.planEndsAt),
      screenIds: userScreenIds,
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
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (user: UserItem) => {
    if (user.role === 'SUPER_ADMIN' || user.id === currentUser?.id) {
      alert('No está permitido eliminar cuentas de Super Administrador ni tu propia cuenta.');
      return;
    }

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

  // --- Quick Screen Assignment Modal Handlers ---
  const openAssignModal = (user: UserItem, initialTab: 'view' | 'assign' = 'view') => {
    setAssigningUser(user);
    const userScreenIds = user.screens
      ? user.screens.map((s) => s.id)
      : allScreens.filter((s) => s.userId === user.id).map((s) => s.id);

    setAssignScreenIds(userScreenIds);
    setAssignSearch('');
    setAssignError(null);
    setAssignActiveTab(initialTab);
    setIsAssignModalOpen(true);
  };

  const handleQuickUnassign = async (screenId: string) => {
    if (!assigningUser) return;
    const newIds = assignScreenIds.filter((id) => id !== screenId);
    setAssignSubmitting(true);
    setAssignError(null);
    try {
      const res = await fetch(`/api/users/${assigningUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ screenIds: newIds }),
      });
      if (res.ok) {
        setAssignScreenIds(newIds);
        setAssigningUser((prev) =>
          prev
            ? {
                ...prev,
                screens: (prev.screens || []).filter((s) => s.id !== screenId),
              }
            : null
        );
        await fetchData();
      } else {
        const data = await res.json();
        setAssignError(data.error || 'Error al desvincular pantalla');
      }
    } catch (err: any) {
      setAssignError(err.message || 'Error de conexión');
    } finally {
      setAssignSubmitting(false);
    }
  };

  const toggleScreenSelection = (screenId: string) => {
    setAssignScreenIds((prev) =>
      prev.includes(screenId)
        ? prev.filter((id) => id !== screenId)
        : [...prev, screenId]
    );
  };

  const handleSelectAll = (filteredIds: string[]) => {
    setAssignScreenIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
  };

  const handleDeselectAll = (filteredIds: string[]) => {
    setAssignScreenIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
  };

  const handleSaveScreenAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningUser) return;
    setAssignSubmitting(true);
    setAssignError(null);

    try {
      const res = await fetch(`/api/users/${assigningUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          screenIds: assignScreenIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAssignError(data.error || 'Error al guardar la asignación de pantallas');
        setAssignSubmitting(false);
        return;
      }

      setIsAssignModalOpen(false);
      setAssigningUser(null);
      await fetchData();
    } catch (err: any) {
      setAssignError(err.message || 'Error de conexión');
    } finally {
      setAssignSubmitting(false);
    }
  };

  const isScreenOnline = (lastSeen?: string | null) => {
    if (!lastSeen) return false;
    const diff = Date.now() - new Date(lastSeen).getTime();
    return diff < 120000;
  };

  // Filtrado de pantallas para el modal de asignación
  const filteredScreens = allScreens.filter((s) => {
    const term = assignSearch.toLowerCase().trim();
    if (!term) return true;
    return (
      s.name.toLowerCase().includes(term) ||
      (s.location && s.location.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-8 h-8 text-primary" /> Clientes y Usuarios
          </h1>
          <p className="text-muted-foreground mt-2">
            Administra las cuentas de clientes, asigna pantallas físicas y planes de suscripción.
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
                  <th className="py-4 px-6">Cliente / Antigüedad</th>
                  <th className="py-4 px-6">Estado</th>
                  <th className="py-4 px-6">Rol</th>
                  <th className="py-4 px-6">Plan & Vigencia</th>
                  <th className="py-4 px-6">Pantallas Asignadas</th>
                  <th className="py-4 px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((user) => {
                  const isSuperAdmin = user.role === 'SUPER_ADMIN';
                  const isCurrentUser = currentUser?.id === user.id;
                  const planExpired = isPlanExpired(user.planEndsAt);
                  const isClientActive = user.isActive !== false && !planExpired;
                  const userScreens = user.screens || allScreens.filter((s) => s.userId === user.id);
                  const screensCount = user._count?.screens ?? userScreens.length;
                  const planPending = isPlanPending(user.planStartsAt);

                  return (
                    <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              isSuperAdmin
                                ? 'bg-purple-500/20 text-purple-400'
                                : isClientActive
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {isSuperAdmin ? <Shield className="w-5 h-5" /> : <User className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-slate-100">{user.name}</p>
                              {isCurrentUser && (
                                <span className="text-[10px] bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.5 rounded font-medium">
                                  Tú
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              @{user.username} {user.email && `• ${user.email}`}
                            </p>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
                              <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                              <span title={`Registrado el ${new Date(user.createdAt).toLocaleDateString()}`}>
                                Cliente: {getClientTenure(user.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Estado con Toggle manual rápido */}
                      <td className="py-4 px-6">
                        {isSuperAdmin ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            <Shield className="w-3 h-3" /> Permanente
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleActive(user)}
                            disabled={togglingUserId === user.id}
                            className={`group inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                              planExpired
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.15)]'
                                : isClientActive
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                                : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                            } disabled:opacity-50`}
                            title={
                              planExpired
                                ? 'Plan vencido. El cliente fue desactivado automáticamente. Haz clic para renovar su plan.'
                                : isClientActive
                                ? 'Cliente activo. Haz clic para pausar/desactivar sus pantallas'
                                : 'Cliente inactivo. Haz clic para activar y reanudar transmisiones'
                            }
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                planExpired
                                  ? 'bg-amber-400'
                                  : isClientActive
                                  ? 'bg-emerald-400 animate-pulse'
                                  : 'bg-red-400'
                              }`}
                            />
                            <span>{planExpired ? 'INACTIVO (VENCIDO)' : isClientActive ? 'ACTIVO' : 'INACTIVO'}</span>
                            <Power className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity ml-0.5" />
                          </button>
                        )}
                      </td>

                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            isSuperAdmin
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}
                        >
                          {isSuperAdmin ? 'Super Admin' : 'Cliente'}
                        </span>
                      </td>

                      {/* Plan y Vigencia */}
                      <td className="py-4 px-6">
                        {isSuperAdmin ? (
                          <span className="text-xs text-muted-foreground">Acceso Ilimitado</span>
                        ) : (
                          <div className="flex flex-col gap-1 items-start">
                            {user.plan ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <Award className="w-3.5 h-3.5" />
                                {user.plan.name}
                              </span>
                            ) : (
                              <span className="text-xs text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                Sin Plan
                              </span>
                            )}

                            <div className="flex flex-col gap-0.5 text-[11px] mt-0.5 text-slate-300">
                              <span className="flex items-center gap-1 text-slate-400">
                                <Calendar className="w-3 h-3 text-slate-500 shrink-0" />
                                <span>Inicio: {formatPlanDate(user.planStartsAt) || 'Sin definir'}</span>
                              </span>
                              <span className="flex items-center gap-1 flex-wrap">
                                <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                                <span>Fin: {formatPlanDate(user.planEndsAt) || 'Indefinido'}</span>
                                {planExpired && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                                    VENCIDO
                                  </span>
                                )}
                                {planPending && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                    PROGRAMADO
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Columna Pantallas Asignadas con Gestión Directa */}
                      <td className="py-4 px-6">
                        {isSuperAdmin ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-purple-300 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20 font-medium">
                            <Shield className="w-3.5 h-3.5 text-purple-400" />
                            Acceso Global ({allScreens.length} en sistema)
                          </span>
                        ) : (
                          <div className="flex flex-col gap-1.5 items-start">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => openAssignModal(user, 'view')}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all hover:scale-[1.02] cursor-pointer"
                                title="Ver detalles de pantallas asignadas"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>{screensCount} {screensCount === 1 ? 'Pantalla' : 'Pantallas'}</span>
                              </button>
                              <button
                                onClick={() => openAssignModal(user, 'assign')}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all hover:scale-[1.02] cursor-pointer"
                                title="Asignar o desasignar pantallas"
                              >
                                <Monitor className="w-3 h-3" />
                                <span>+ Asignar</span>
                              </button>
                            </div>

                            {!isClientActive && (
                              <span className="text-[10px] text-red-400/90 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 font-medium">
                                ⏸ Pantallas suspendidas (inactivo)
                              </span>
                            )}

                            {userScreens.length > 0 && (
                              <div className="flex flex-wrap gap-1 max-w-[280px]">
                                {userScreens.slice(0, 3).map((s) => {
                                  const isOnline = isScreenOnline(s.lastSeen);
                                  return (
                                    <span
                                      key={s.id}
                                      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/5 truncate max-w-[130px]"
                                      title={`${s.name} ${s.location ? `(${s.location})` : ''} ${s.consoleId ? `[Consola: ${s.consoleId}]` : ''}`}
                                    >
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                          isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                                        }`}
                                      />
                                      <span className="truncate">{s.name}</span>
                                    </span>
                                  );
                                })}
                                {userScreens.length > 3 && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-slate-400 font-medium">
                                    +{userScreens.length - 3} más
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botón rápido para ver y gestionar pantallas (Clientes) */}
                          {!isSuperAdmin && (
                            <button
                              onClick={() => openAssignModal(user, 'view')}
                              className="p-2 hover:bg-emerald-500/10 rounded-lg text-slate-300 hover:text-emerald-400 transition-colors"
                              title="Ver y gestionar pantallas de este cliente"
                            >
                              <Monitor className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => openEditModal(user)}
                            className="p-2 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
                            title="Editar Usuario"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* ELIMINACIÓN PROTEGIDA: Ni Super Admin ni usuario actual pueden borrarse */}
                          {!isSuperAdmin && !isCurrentUser ? (
                            <button
                              onClick={() => handleDelete(user)}
                              className="p-2 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                              title="Eliminar Cliente"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span
                              className="p-2 text-slate-600 cursor-not-allowed inline-flex items-center"
                              title={
                                isSuperAdmin
                                  ? 'Las cuentas de Super Administrador están protegidas contra eliminación.'
                                  : 'No puedes eliminar tu propia cuenta.'
                              }
                            >
                              <Shield className="w-4 h-4 opacity-40 text-purple-400" />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No hay clientes registrados aún.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Dedicado de Pantallas del Cliente (Ver y Asignar) */}
      {isAssignModalOpen && assigningUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass rounded-2xl w-full max-w-xl p-6 shadow-2xl border border-white/10 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-primary" /> Pantallas del Cliente
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Cliente: <span className="text-white font-semibold">{assigningUser.name}</span> (@{assigningUser.username})
                </p>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pestañas: Ver Pantallas Asignadas vs Asignar / Gestionar */}
            <div className="flex border-b border-white/10 mb-4 gap-2">
              <button
                type="button"
                onClick={() => setAssignActiveTab('view')}
                className={`flex items-center gap-2 pb-2.5 px-3 text-sm font-semibold transition-all border-b-2 -mb-[1px] ${
                  assignActiveTab === 'view'
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-4 h-4" />
                <span>Pantallas Asignadas ({assigningUser.screens?.length || 0})</span>
              </button>
              <button
                type="button"
                onClick={() => setAssignActiveTab('assign')}
                className={`flex items-center gap-2 pb-2.5 px-3 text-sm font-semibold transition-all border-b-2 -mb-[1px] ${
                  assignActiveTab === 'assign'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Monitor className="w-4 h-4" />
                <span>Asignar / Gestionar</span>
              </button>
            </div>

            {assignError && (
              <div className="mb-4 p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {assignError}
              </div>
            )}

            {/* PESTAÑA 1: VISTA INMEDIATA DE PANTALLAS ASIGNADAS */}
            {assignActiveTab === 'view' ? (
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[260px]">
                {!assigningUser.screens || assigningUser.screens.length === 0 ? (
                  <div className="text-center py-12 px-4 rounded-xl border border-dashed border-white/10 bg-white/[0.02]">
                    <Monitor className="w-10 h-10 mx-auto text-slate-500 mb-3 opacity-60" />
                    <h3 className="text-sm font-semibold text-slate-200 mb-1">
                      No tiene pantallas asignadas
                    </h3>
                    <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto">
                      Este cliente aún no tiene pantallas vinculadas. Haz clic en el botón de abajo para asignarle pantallas.
                    </p>
                    <button
                      type="button"
                      onClick={() => setAssignActiveTab('assign')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-md transition-all"
                    >
                      <Monitor className="w-3.5 h-3.5" /> Asignar Pantallas Ahora
                    </button>
                  </div>
                ) : (
                  assigningUser.screens.map((screen) => {
                    const isOnline = isScreenOnline(screen.lastSeen);
                    return (
                      <div
                        key={screen.id}
                        className="p-3.5 rounded-xl border border-white/10 bg-white/[0.03] hover:border-white/20 transition-all flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span
                              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse' : 'bg-red-500'
                              }`}
                              title={isOnline ? 'Online (Activa)' : 'Offline (Desconectada)'}
                            />
                            <p className="font-semibold text-sm text-slate-100 truncate">
                              {screen.name}
                            </p>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                isOnline
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}
                            >
                              {isOnline ? 'ONLINE' : 'OFFLINE'}
                            </span>
                            {screen.displayState && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5">
                                {screen.displayState === 'ACTIVE' ? '📺 Activa' : '🌙 En Reposo'}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                            <span>📍 {screen.location || 'Sin ubicación registrada'}</span>
                            {screen.consoleId ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                                <Cpu className="w-3 h-3 text-cyan-400" />
                                Consola: {screen.consoleId}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-500 italic">
                                Sin consola vinculada
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Link
                            href={`/screens/${screen.id}`}
                            target="_blank"
                            className="p-2 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
                            title="Abrir panel detallado de esta pantalla"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleQuickUnassign(screen.id)}
                            disabled={assignSubmitting}
                            className="p-2 hover:bg-destructive/15 rounded-lg text-slate-400 hover:text-destructive transition-colors disabled:opacity-50"
                            title="Desvincular esta pantalla del cliente"
                          >
                            <Unlink className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              /* PESTAÑA 2: ASIGNACIÓN Y GESTIÓN CON CHECKBOXES */
              <>
                {/* Buscador de pantallas */}
                <div className="relative mb-3">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o ubicación..."
                    value={assignSearch}
                    onChange={(e) => setAssignSearch(e.target.value)}
                    className="w-full bg-black/40 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Acciones masivas */}
                <div className="flex justify-between items-center text-xs text-muted-foreground mb-3 px-1">
                  <span>{filteredScreens.length} pantalla(s) encontradas</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectAll(filteredScreens.map((s) => s.id))}
                      className="text-primary hover:underline"
                    >
                      Seleccionar visibles
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => handleDeselectAll(filteredScreens.map((s) => s.id))}
                      className="text-slate-400 hover:underline"
                    >
                      Deseleccionar visibles
                    </button>
                  </div>
                </div>

                {/* Lista de Pantallas con Checkboxes */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
                  {filteredScreens.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground text-sm">
                      {allScreens.length === 0
                        ? 'No hay pantallas creadas en el sistema todavía. Crea pantallas en la sección "Pantallas".'
                        : 'No se encontraron pantallas con esa búsqueda.'}
                    </div>
                  ) : (
                    filteredScreens.map((screen) => {
                      const isChecked = assignScreenIds.includes(screen.id);
                      const isOnline = isScreenOnline(screen.lastSeen);
                      const currentlyAssignedToOther =
                        screen.userId && screen.userId !== assigningUser.id;
                      const assignedToThisUser = screen.userId === assigningUser.id;

                      return (
                        <div
                          key={screen.id}
                          onClick={() => toggleScreenSelection(screen.id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isChecked
                              ? 'bg-primary/10 border-primary/40 shadow-[0_0_10px_rgba(59,130,246,0.15)]'
                              : 'bg-black/30 border-white/5 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                                isChecked
                                  ? 'bg-primary border-primary text-black font-bold'
                                  : 'border-slate-600 bg-black/40'
                              }`}
                            >
                              {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>

                            <div className="min-w-0">
                              <p className="font-medium text-sm text-slate-100 truncate flex items-center gap-2">
                                {screen.name}
                                <span
                                  className={`w-2 h-2 rounded-full inline-block ${
                                    isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                                  }`}
                                  title={isOnline ? 'Online' : 'Offline'}
                                />
                                {screen.consoleId && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                                    {screen.consoleId}
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {screen.location || 'Sin ubicación'}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            {assignedToThisUser ? (
                              <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                Asignada actual
                              </span>
                            ) : currentlyAssignedToOther ? (
                              <span
                                className="text-[11px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20"
                                title={`Esta pantalla está actualmente asignada a ${screen.user?.name || 'otro cliente'}. Al asignarla aquí se transferirá a este cliente.`}
                              >
                                Asignada a {screen.user?.name || 'otro cliente'}
                              </span>
                            ) : (
                              <span className="text-[11px] font-medium text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                                Disponible
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}

            {/* Footer Dinámico según la Pestaña Activa */}
            <div className="flex items-center justify-between pt-4 mt-3 border-t border-white/5">
              {assignActiveTab === 'view' ? (
                <>
                  <span className="text-xs text-slate-300 font-medium">
                    {assigningUser.screens?.length || 0}{' '}
                    {(assigningUser.screens?.length || 0) === 1
                      ? 'pantalla asignada'
                      : 'pantallas asignadas'}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAssignActiveTab('assign')}
                      className="px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Monitor className="w-3.5 h-3.5" /> Asignar / Cambiar Pantallas
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAssignModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 transition-colors text-sm font-medium"
                    >
                      Cerrar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span className="text-xs text-slate-300 font-medium">
                    {assignScreenIds.length}{' '}
                    {assignScreenIds.length === 1
                      ? 'pantalla seleccionada'
                      : 'pantallas seleccionadas'}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAssignActiveTab('view')}
                      className="px-3 py-1.5 rounded-xl hover:bg-white/5 transition-colors text-xs text-slate-300"
                      disabled={assignSubmitting}
                    >
                      Volver a Pantallas
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveScreenAssignment}
                      disabled={assignSubmitting}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl transition-colors font-medium text-sm flex items-center gap-1.5 shadow-[0_0_15px_rgba(59,130,246,0.3)] disabled:opacity-50"
                    >
                      {assignSubmitting ? (
                        'Guardando...'
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" /> Guardar Asignación
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear / Editar Usuario */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto">
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

              {/* Estado y Vigencia del Plan (Solo para Clientes) */}
              {formData.role === 'CLIENT' && (
                <div className="space-y-4 pt-2 border-t border-white/5">
                  {/* Selector Estado: Activo / Inactivo */}
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-1.5">
                      Estado del Cliente
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (formData.planEndsAt && isPlanExpired(formData.planEndsAt)) {
                            alert(
                              'No puedes activar un cliente cuya fecha de plan ya venció. Amplía la fecha de terminación primero.'
                            );
                            return;
                          }
                          setFormData({ ...formData, isActive: true });
                        }}
                        className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          formData.isActive
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                            : 'bg-black/30 border-white/5 text-slate-400 hover:border-white/20'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Activo (Habilitado)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, isActive: false })}
                        className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          !formData.isActive
                            ? 'bg-red-500/20 text-red-300 border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                            : 'bg-black/30 border-white/5 text-slate-400 hover:border-white/20'
                        }`}
                      >
                        <Power className="w-4 h-4 text-red-400" />
                        <span>Inactivo (Suspendido)</span>
                      </button>
                    </div>
                    {!formData.isActive && (
                      <p className="text-[11px] text-amber-400/90 mt-1.5 flex items-center gap-1.5 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                        Las pantallas de este cliente se pausarán y no mostrarán videos ni juegos mientras esté inactivo.
                      </p>
                    )}
                  </div>

                  {/* Fechas de Inicio y Terminación del Plan */}
                  <div className="p-3 rounded-xl bg-black/20 border border-slate-700/60 space-y-2.5">
                    <label className="block text-xs font-medium uppercase tracking-wider text-slate-300">
                      Vigencia del Plan
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Fecha de Inicio
                        </label>
                        <input
                          type="date"
                          value={formData.planStartsAt}
                          onChange={(e) => setFormData({ ...formData, planStartsAt: e.target.value })}
                          className="w-full bg-black/40 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Fecha de Terminación
                        </label>
                        <input
                          type="date"
                          value={formData.planEndsAt}
                          onChange={(e) => {
                            const val = e.target.value;
                            const isPast = val ? isPlanExpired(val) : false;
                            setFormData((prev) => ({
                              ...prev,
                              planEndsAt: val,
                              isActive: !isPast,
                            }));
                          }}
                          className="w-full bg-black/40 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>

                    {formData.planEndsAt && isPlanExpired(formData.planEndsAt) ? (
                      <p className="text-[11px] text-amber-400 mt-1 flex items-center gap-1.5 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                        Esta fecha de terminación ya venció. El cliente se guardará como Inactivo automáticamente.
                      </p>
                    ) : formData.planEndsAt && !isPlanExpired(formData.planEndsAt) && !editingUser?.isActive ? (
                      <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1.5 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                        Fecha de vigencia válida. El cliente se activará automáticamente al guardar.
                      </p>
                    ) : null}

                    {/* Botones de cálculo rápido */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] pt-1 border-t border-white/5">
                      <span className="text-slate-400">Atajos de duración:</span>
                      <button
                        type="button"
                        onClick={() => addMonthsToPlan(1)}
                        className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-primary/20 hover:text-primary text-slate-300 border border-white/5 transition-colors cursor-pointer"
                      >
                        +1 Mes
                      </button>
                      <button
                        type="button"
                        onClick={() => addMonthsToPlan(3)}
                        className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-primary/20 hover:text-primary text-slate-300 border border-white/5 transition-colors cursor-pointer"
                      >
                        +3 Meses
                      </button>
                      <button
                        type="button"
                        onClick={() => addMonthsToPlan(6)}
                        className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-primary/20 hover:text-primary text-slate-300 border border-white/5 transition-colors cursor-pointer"
                      >
                        +6 Meses
                      </button>
                      <button
                        type="button"
                        onClick={() => addMonthsToPlan(12)}
                        className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-primary/20 hover:text-primary text-slate-300 border border-white/5 transition-colors cursor-pointer"
                      >
                        +1 Año
                      </button>
                      <button
                        type="button"
                        onClick={() => addMonthsToPlan(24)}
                        className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-primary/20 hover:text-primary text-slate-300 border border-white/5 transition-colors cursor-pointer"
                      >
                        +2 Años
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, planEndsAt: '', isActive: true }))}
                        className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-amber-500/20 hover:text-amber-400 text-slate-400 border border-white/5 transition-colors cursor-pointer"
                      >
                        Sin Límite
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Selector de Pantallas Asignadas al crear o editar cliente */}
              {formData.role === 'CLIENT' && (
                <div className="pt-2 border-t border-white/5">
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-2 flex items-center justify-between">
                    <span>Pantallas Asignadas ({formData.screenIds.length})</span>
                    <span className="text-[11px] text-muted-foreground font-normal lowercase">
                      selecciona las pantallas para este cliente
                    </span>
                  </label>

                  <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-black/30 border border-slate-700/60">
                    {allScreens.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        No hay pantallas creadas en el sistema.
                      </p>
                    ) : (
                      allScreens.map((screen) => {
                        const isChecked = formData.screenIds.includes(screen.id);
                        return (
                          <label
                            key={screen.id}
                            className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                              isChecked
                                ? 'bg-primary/20 text-primary border border-primary/30'
                                : 'hover:bg-white/5 text-slate-300 border border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  const updated = isChecked
                                    ? formData.screenIds.filter((id) => id !== screen.id)
                                    : [...formData.screenIds, screen.id];
                                  setFormData({ ...formData, screenIds: updated });
                                }}
                                className="rounded border-slate-600 bg-black/40 text-primary focus:ring-0"
                              />
                              <span className="font-medium truncate">{screen.name}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground ml-2 shrink-0">
                              {screen.location || 'Sin ubicación'}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

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
