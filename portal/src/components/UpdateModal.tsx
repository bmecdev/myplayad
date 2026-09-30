'use client';

import { useState, useEffect } from 'react';
import {
  RefreshCw,
  Clock,
  Calendar,
  Monitor,
  CheckCircle2,
  AlertCircle,
  X,
  Trash2,
  Send,
  Zap,
  Globe,
  Users,
} from 'lucide-react';

export type ScreenOption = {
  id: string;
  name: string;
  location?: string | null;
  userId?: string | null;
  user?: { id: string; name: string } | null;
};

type UpdateScheduleItem = {
  id: string;
  targetType: string;
  targetName?: string | null;
  scheduledAt: string;
  executedAt?: string | null;
  status: string;
  resultNote?: string | null;
  screen?: { id: string; name: string; location?: string | null } | null;
  user?: { id: string; name: string } | null;
};

type UpdateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  screens: ScreenOption[];
  initialScreenId?: string | null;
  isSuperAdmin: boolean;
  currentUserId?: string;
  onSuccess?: () => void;
};

export default function UpdateModal({
  isOpen,
  onClose,
  screens,
  initialScreenId,
  isSuperAdmin,
  currentUserId,
  onSuccess,
}: UpdateModalProps) {
  const [activeTab, setActiveTab] = useState<'instant' | 'schedule' | 'history'>('instant');

  // Alcance
  // 'SINGLE' | 'CLIENT_ALL' | 'SYSTEM_ALL'
  const [targetType, setTargetType] = useState<'SINGLE' | 'CLIENT_ALL' | 'SYSTEM_ALL'>(
    initialScreenId ? 'SINGLE' : isSuperAdmin ? 'SYSTEM_ALL' : 'CLIENT_ALL'
  );
  const [selectedScreenId, setSelectedScreenId] = useState<string>(
    initialScreenId || (screens[0]?.id || '')
  );

  // Programación
  const [scheduledDateTime, setScheduledDateTime] = useState<string>('');
  const [schedules, setSchedules] = useState<UpdateScheduleItem[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  // Estados de acción
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (initialScreenId) {
      setSelectedScreenId(initialScreenId);
      setTargetType('SINGLE');
    }
  }, [initialScreenId]);

  useEffect(() => {
    if (isOpen) {
      fetchSchedules();
    }
  }, [isOpen]);

  const fetchSchedules = async () => {
    setLoadingSchedules(true);
    try {
      const res = await fetch('/api/screens/update-schedules');
      if (res.ok) {
        const data = await res.json();
        setSchedules(data);
      }
    } catch (err) {
      console.error('Error fetching update schedules:', err);
    } finally {
      setLoadingSchedules(false);
    }
  };

  if (!isOpen) return null;

  // Manejar Actualización Inmediata
  const handleInstantUpdate = async () => {
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/screens/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType,
          screenId: targetType === 'SINGLE' ? selectedScreenId : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al enviar orden');
      }

      setMessage({
        type: 'success',
        text: data.message || 'Orden de actualización enviada exitosamente.',
      });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error de conexión' });
    } finally {
      setSubmitting(false);
    }
  };

  // Manejar Programación de Actualización
  const handleScheduleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledDateTime) {
      setMessage({ type: 'error', text: 'Por favor selecciona la fecha y hora.' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const targetScreen = screens.find((s) => s.id === selectedScreenId);
      const res = await fetch('/api/screens/update-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType,
          screenId: targetType === 'SINGLE' ? selectedScreenId : undefined,
          targetName: targetType === 'SINGLE' ? targetScreen?.name : undefined,
          scheduledAt: new Date(scheduledDateTime).toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al programar');
      }

      setMessage({
        type: 'success',
        text: '¡Actualización programada con éxito!',
      });
      setScheduledDateTime('');
      fetchSchedules();
      setActiveTab('history');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error de conexión' });
    } finally {
      setSubmitting(false);
    }
  };

  // Cancelar Programación
  const handleCancelSchedule = async (scheduleId: string) => {
    if (!confirm('¿Estás seguro de cancelar esta actualización programada?')) return;

    try {
      const res = await fetch(`/api/screens/update-schedules/${scheduleId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchSchedules();
      }
    } catch (err) {
      console.error('Error cancelando:', err);
    }
  };

  // Accesos rápidos de fecha/hora
  const setQuickTime = (hoursFromNow: number) => {
    const d = new Date();
    d.setHours(d.getHours() + hoursFromNow);
    d.setMinutes(0, 0, 0);
    // Formato para input datetime-local: YYYY-MM-DDTHH:mm
    const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setScheduledDateTime(localIso);
  };

  const setTonightAt = (targetHour: number) => {
    const d = new Date();
    // Si ya pasaron las horas de hoy, programar para mañana
    if (d.getHours() >= targetHour) {
      d.setDate(d.getDate() + 1);
    }
    d.setHours(targetHour, 0, 0, 0);
    const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setScheduledDateTime(localIso);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="glass rounded-2xl w-full max-w-xl p-6 shadow-2xl border border-white/10 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
              <RefreshCw className="w-6 h-6 text-primary animate-spin-slow" /> Mantenimiento y Actualizaciones
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Despliega la última versión de producción (<span className="text-emerald-400 font-mono">origin/main</span>) en las pantallas físicas vía MQTT.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensaje de feedback */}
        {message && (
          <div
            className={`mb-4 p-3 rounded-xl border text-sm flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-destructive/15 border-destructive/30 text-destructive'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Tabs de Navegación */}
        <div className="flex border-b border-white/10 mb-5 gap-2">
          <button
            onClick={() => {
              setActiveTab('instant');
              setMessage(null);
            }}
            className={`pb-2.5 px-3 text-sm font-medium transition-colors flex items-center gap-1.5 border-b-2 ${
              activeTab === 'instant'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4" /> Actualizar Ahora
          </button>
          <button
            onClick={() => {
              setActiveTab('schedule');
              setMessage(null);
            }}
            className={`pb-2.5 px-3 text-sm font-medium transition-colors flex items-center gap-1.5 border-b-2 ${
              activeTab === 'schedule'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" /> Programar Horario
          </button>
          <button
            onClick={() => {
              setActiveTab('history');
              setMessage(null);
            }}
            className={`pb-2.5 px-3 text-sm font-medium transition-colors flex items-center gap-1.5 border-b-2 ${
              activeTab === 'history'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" /> Programadas ({schedules.filter((s) => s.status === 'PENDING').length})
          </button>
        </div>

        {/* Contenido según Tab */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {activeTab !== 'history' && (
            <div className="space-y-4">
              {/* Selector de Alcance */}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-2">
                  Alcance de la Actualización
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {/* Opción Super Admin: Toda la plataforma */}
                  {isSuperAdmin && (
                    <label
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        targetType === 'SYSTEM_ALL'
                          ? 'bg-purple-500/10 border-purple-500/40 text-purple-200'
                          : 'bg-black/30 border-white/5 hover:border-white/20 text-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="targetType"
                        value="SYSTEM_ALL"
                        checked={targetType === 'SYSTEM_ALL'}
                        onChange={() => setTargetType('SYSTEM_ALL')}
                        className="text-purple-500 focus:ring-0"
                      />
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-purple-400" />
                        <div>
                          <p className="font-semibold text-sm">Toda la Plataforma (Flota Completa)</p>
                          <p className="text-xs text-muted-foreground">
                            Emite comando broadcast a todas las pantallas activas del sistema.
                          </p>
                        </div>
                      </div>
                    </label>
                  )}

                  {/* Opción: Todas las pantallas del cliente */}
                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      targetType === 'CLIENT_ALL'
                        ? 'bg-primary/10 border-primary/40 text-primary'
                        : 'bg-black/30 border-white/5 hover:border-white/20 text-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="targetType"
                      value="CLIENT_ALL"
                      checked={targetType === 'CLIENT_ALL'}
                      onChange={() => setTargetType('CLIENT_ALL')}
                      className="text-primary focus:ring-0"
                    />
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-400" />
                      <div>
                        <p className="font-semibold text-sm">
                          {isSuperAdmin ? 'Todas las pantallas asignadas a clientes' : `Todas mis pantallas (${screens.length})`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Actualiza simultáneamente todo el parque de pantallas asociadas.
                        </p>
                      </div>
                    </div>
                  </label>

                  {/* Opción: Pantalla Individual */}
                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      targetType === 'SINGLE'
                        ? 'bg-primary/10 border-primary/40 text-primary'
                        : 'bg-black/30 border-white/5 hover:border-white/20 text-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="targetType"
                      value="SINGLE"
                      checked={targetType === 'SINGLE'}
                      onChange={() => setTargetType('SINGLE')}
                      className="text-primary focus:ring-0"
                    />
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-emerald-400" />
                      <div>
                        <p className="font-semibold text-sm">Una Pantalla Específica</p>
                        <p className="text-xs text-muted-foreground">
                          Aplica la actualización únicamente a la pantalla seleccionada.
                        </p>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Selector de pantalla específica si targetType === 'SINGLE' */}
              {targetType === 'SINGLE' && (
                <div className="p-3 rounded-xl bg-black/40 border border-slate-700/60 animate-in fade-in">
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-1.5">
                    Seleccionar Pantalla
                  </label>
                  <select
                    value={selectedScreenId}
                    onChange={(e) => setSelectedScreenId(e.target.value)}
                    className="w-full bg-black/50 border border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary text-slate-100"
                  >
                    {screens.map((s) => (
                      <option key={s.id} value={s.id} className="bg-[#181a20]">
                        {s.name} {s.location ? `• ${s.location}` : ''} {s.user ? `(Cliente: ${s.user.name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* TAB 1: Actualizar Ahora */}
          {activeTab === 'instant' && (
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-xs text-slate-300 space-y-2">
                <p className="font-semibold text-white flex items-center gap-1.5 text-sm">
                  <Zap className="w-4 h-4 text-amber-400" /> Ejecución Inmediata
                </p>
                <p>
                  Al hacer clic en el botón, el portal enviará un comando MQTT directo a la pantalla.
                  La pantalla ejecutará <code className="bg-black/40 px-1 py-0.5 rounded text-primary">update.sh</code>,
                  descargará la última versión de <strong className="text-emerald-400">production (main)</strong> y reiniciará su servicio
                  sin cerrar ni interrumpir videos locales.
                </p>
              </div>

              <button
                type="button"
                onClick={handleInstantUpdate}
                disabled={submitting || (targetType === 'SINGLE' && !selectedScreenId)}
                className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Enviando comando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Lanzar Actualización Inmediata
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 2: Programar Horario */}
          {activeTab === 'schedule' && (
            <form onSubmit={handleScheduleUpdate} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-1.5">
                  Fecha y Hora de la Actualización
                </label>
                <input
                  type="datetime-local"
                  required
                  value={scheduledDateTime}
                  onChange={(e) => setScheduledDateTime(e.target.value)}
                  className="w-full bg-black/40 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary text-slate-100"
                />
              </div>

              {/* Accesos rápidos de madrugada */}
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                  Accesos rápidos de madrugada (Recomendado para evitar interrupciones):
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setTonightAt(2)}
                    className="px-2.5 py-1 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition-colors"
                  >
                    02:00 AM
                  </button>
                  <button
                    type="button"
                    onClick={() => setTonightAt(3)}
                    className="px-2.5 py-1 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition-colors"
                  >
                    03:00 AM
                  </button>
                  <button
                    type="button"
                    onClick={() => setTonightAt(4)}
                    className="px-2.5 py-1 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition-colors"
                  >
                    04:00 AM
                  </button>
                  <button
                    type="button"
                    onClick={() => setTonightAt(5)}
                    className="px-2.5 py-1 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition-colors"
                  >
                    05:00 AM
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !scheduledDateTime}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-4"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Guardando programación...
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4" /> Guardar Programación
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 3: Historial / Pendientes */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {loadingSchedules ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Cargando programaciones...
                </div>
              ) : schedules.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No hay actualizaciones programadas registradas.
                </div>
              ) : (
                schedules.map((item) => {
                  const isPending = item.status === 'PENDING';
                  const dateStr = new Date(item.scheduledAt).toLocaleString();

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl border border-white/5 bg-black/30 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-100 truncate">
                            {item.targetName || (item.screen ? item.screen.name : item.targetType)}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.status === 'PENDING'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : item.status === 'EXECUTED'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}
                          >
                            {item.status === 'PENDING'
                              ? 'Pendiente'
                              : item.status === 'EXECUTED'
                              ? 'Ejecutado'
                              : item.status === 'CANCELLED'
                              ? 'Cancelado'
                              : item.status}
                          </span>
                        </div>
                        <p className="text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> Programado para: {dateStr}
                        </p>
                        {item.resultNote && (
                          <p className="text-[11px] text-slate-400 italic">{item.resultNote}</p>
                        )}
                      </div>

                      {isPending && (
                        <button
                          type="button"
                          onClick={() => handleCancelSchedule(item.id)}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors shrink-0"
                          title="Cancelar esta actualización programada"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
