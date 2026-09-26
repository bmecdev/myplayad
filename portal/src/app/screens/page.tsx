'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Monitor, Plus, Trash2, Settings, Lightbulb, UserCheck, UserX, Edit3 } from 'lucide-react';
import mqtt from 'mqtt';

type UserSummary = {
  id: string;
  name: string;
  username: string;
  plan?: {
    id: string;
    name: string;
  } | null;
};

type Screen = {
  id: string;
  name: string;
  location: string;
  description: string;
  userId?: string | null;
  user?: UserSummary | null;
  lastSeen?: string;
  createdAt: string;
};

export default function ScreensPage() {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Modal de Crear Pantalla
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', location: '', description: '', userId: '' });
  
  // Modal de Reasignar Cliente (Super Admin)
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [selectedScreenForReassign, setSelectedScreenForReassign] = useState<Screen | null>(null);
  const [newAssignedUserId, setNewAssignedUserId] = useState('');
  const [reassignLoading, setReassignLoading] = useState(false);

  const [mqttStatuses, setMqttStatuses] = useState<Record<string, boolean>>({});

  const fetchSessionAndData = async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentUser(meData.user);

        if (meData.user?.role === 'SUPER_ADMIN') {
          // Obtener lista de clientes para asignación
          const usersRes = await fetch('/api/users');
          if (usersRes.ok) {
            const usersData = await usersRes.json();
            // Filtrar solo usuarios clientes (o admins)
            setUsers(usersData);
          }
        }
      }

      await fetchScreens();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchScreens = async () => {
    try {
      const res = await fetch('/api/screens');
      if (res.ok) {
        const data = await res.json();
        setScreens(data);
      }
    } catch (e) {
      console.warn('Error fetching screens:', e);
    }
  };

  useEffect(() => {
    fetchSessionAndData();
    const interval = setInterval(fetchScreens, 15000);

    const client = mqtt.connect('wss://videos.myplayad.com/mqtt');
    client.on('connect', () => {
      client.subscribe('screens/+/status');
    });

    client.on('message', (topic, message) => {
      const parts = topic.split('/');
      if (parts.length === 3 && parts[0] === 'screens' && parts[2] === 'status') {
        const screenId = parts[1];
        const status = message.toString();
        setMqttStatuses(prev => ({ ...prev, [screenId]: status === 'online' }));
      }
    });

    return () => {
      clearInterval(interval);
      client.end();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/screens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    setFormData({ name: '', location: '', description: '', userId: '' });
    setIsModalOpen(false);
    fetchScreens();
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta pantalla?')) {
      await fetch(`/api/screens/${id}`, { method: 'DELETE' });
      fetchScreens();
    }
  };

  const handleIdentify = async (id: string) => {
    try {
      await fetch(`/api/screens/${id}/identify`, { method: 'POST' });
    } catch (error) {
      console.error('Failed to identify screen', error);
    }
  };

  const openReassignModal = (screen: Screen) => {
    setSelectedScreenForReassign(screen);
    setNewAssignedUserId(screen.userId || 'none');
    setReassignModalOpen(true);
  };

  const handleSaveReassignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScreenForReassign) return;

    setReassignLoading(true);
    try {
      await fetch(`/api/screens/${selectedScreenForReassign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: newAssignedUserId === 'none' ? null : newAssignedUserId,
        }),
      });

      setReassignModalOpen(false);
      setSelectedScreenForReassign(null);
      await fetchScreens();
    } catch (err) {
      console.error('Error reasignando pantalla:', err);
    } finally {
      setReassignLoading(false);
    }
  };

  const isOnline = (screenId: string, lastSeen?: string) => {
    if (mqttStatuses[screenId] !== undefined) {
      return mqttStatuses[screenId];
    }
    if (!lastSeen) return false;
    const diff = Date.now() - new Date(lastSeen).getTime();
    return diff < 120000;
  };

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Monitor className="w-8 h-8 text-primary" /> {isSuperAdmin ? 'Pantallas' : 'Mis Pantallas'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isSuperAdmin
              ? 'Gestiona todas las pantallas físicas del sistema y asígnalas a tus clientes.'
              : 'Pantallas interactivas asignadas a tu cuenta.'}
          </p>
        </div>

        {/* Solo el Super Administrador puede crear nuevas pantallas */}
        {isSuperAdmin && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl flex items-center gap-2 transition-colors font-medium shadow-[0_0_15px_rgba(59,130,246,0.3)]"
          >
            <Plus className="w-5 h-5" /> Nueva Pantalla
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-10">Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {screens.map(screen => {
            const online = isOnline(screen.id, screen.lastSeen);
            return (
              <div key={screen.id} className="glass-card rounded-2xl p-6 relative group overflow-hidden flex flex-col justify-between">
                <div className={`absolute top-0 left-0 w-1 h-full ${online ? 'bg-gradient-to-b from-green-500 to-green-300' : 'bg-gradient-to-b from-red-500 to-red-300'}`}></div>
                
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        {screen.name}
                      </h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <span className={`flex items-center gap-1 font-medium ${online ? 'text-green-500' : 'text-red-500'}`}>
                          <span className={`w-2 h-2 rounded-full ${online ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse' : 'bg-red-500'}`}></span>
                          {online ? 'Online' : 'Offline'}
                        </span>
                        • {screen.location}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleIdentify(screen.id)}
                        className="text-green-500/70 hover:text-green-500 transition-colors p-2 rounded-lg hover:bg-green-500/10"
                        title="Identificar Pantalla"
                      >
                        <Lightbulb className="w-5 h-5" />
                      </button>
                      <Link 
                        href={`/screens/${screen.id}`}
                        className="text-primary/70 hover:text-primary transition-colors p-2 rounded-lg hover:bg-primary/10"
                        title="Administrar"
                      >
                        <Settings className="w-5 h-5" />
                      </Link>

                      {/* Solo el Super Administrador puede eliminar pantallas */}
                      {isSuperAdmin && (
                        <button 
                          onClick={() => handleDelete(screen.id)}
                          className="text-destructive/70 hover:text-destructive transition-colors p-2 rounded-lg hover:bg-destructive/10"
                          title="Eliminar"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-gray-400 mb-4 h-10 overflow-hidden line-clamp-2">{screen.description}</p>
                </div>

                <div className="space-y-2 pt-3 border-t border-white/5">
                  {/* Badge de Cliente Asignado (Visible para Super Admin) */}
                  {isSuperAdmin && (
                    <div className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-white/5 border border-white/5">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        {screen.user ? (
                          <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                        ) : (
                          <UserX className="w-3.5 h-3.5 text-amber-400" />
                        )}
                        Cliente:
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${screen.user ? 'text-blue-300' : 'text-amber-300'}`}>
                          {screen.user ? screen.user.name : 'Sin asignar'}
                        </span>
                        <button
                          onClick={() => openReassignModal(screen)}
                          className="text-slate-400 hover:text-white p-1 hover:bg-white/10 rounded"
                          title="Cambiar cliente asignado"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground bg-black/20 p-2 rounded-lg break-all">
                    ID: {screen.id}
                  </div>
                </div>
              </div>
            );
          })}

          {screens.length === 0 && (
            <div className="col-span-full text-center py-12 glass-card rounded-2xl border-dashed">
              <Monitor className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">
                {isSuperAdmin
                  ? 'No hay pantallas registradas. Haz clic en "Nueva Pantalla" para crear una.'
                  : 'Aún no tienes pantallas asignadas a tu cuenta. Contacta al administrador.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal Crear Pantalla (Super Admin) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass rounded-2xl w-full max-w-md p-6 shadow-2xl border border-white/10">
            <h2 className="text-2xl font-bold mb-4">Registrar Pantalla</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <input 
                  required
                  type="text" 
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Ej: Pantalla Principal Mall"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ubicación</label>
                <input 
                  required
                  type="text" 
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  value={formData.location}
                  onChange={e => setFormData({...formData, location: e.target.value})}
                  placeholder="Ej: Entrada Sur"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <textarea 
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all min-h-[80px]"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Detalles adicionales..."
                />
              </div>

              {/* Asignar a un Cliente */}
              <div>
                <label className="block text-sm font-medium mb-1">Asignar a Cliente</label>
                <select
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  value={formData.userId}
                  onChange={e => setFormData({ ...formData, userId: e.target.value })}
                >
                  <option value="" className="bg-[#181a20]">Sin asignar (Pool de pantallas)</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id} className="bg-[#181a20]">
                      {u.name} ({u.username}) {u.plan ? `• ${u.plan.name}` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  El cliente seleccionado tendrá acceso y control sobre esta pantalla al iniciar sesión.
                </p>
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
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl transition-colors font-medium"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reasignar Cliente (Super Admin) */}
      {reassignModalOpen && selectedScreenForReassign && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass rounded-2xl w-full max-w-md p-6 shadow-2xl border border-white/10">
            <h2 className="text-xl font-bold mb-2">Asignar Pantalla a Cliente</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Pantalla: <span className="text-white font-semibold">{selectedScreenForReassign.name}</span>
            </p>

            <form onSubmit={handleSaveReassignment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Cliente Asignado</label>
                <select
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  value={newAssignedUserId}
                  onChange={e => setNewAssignedUserId(e.target.value)}
                >
                  <option value="none" className="bg-[#181a20]">Sin asignar (Desvincular)</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id} className="bg-[#181a20]">
                      {u.name} ({u.username}) {u.plan ? `• ${u.plan.name}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button 
                  type="button" 
                  onClick={() => setReassignModalOpen(false)}
                  className="px-4 py-2 rounded-xl hover:bg-white/5 transition-colors"
                  disabled={reassignLoading}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={reassignLoading}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl transition-colors font-medium"
                >
                  {reassignLoading ? 'Guardando...' : 'Actualizar Asignación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
