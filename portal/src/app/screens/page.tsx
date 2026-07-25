'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Monitor, Plus, Trash2, Edit, Settings, Lightbulb } from 'lucide-react';
import mqtt from 'mqtt';

type Screen = {
  id: string;
  name: string;
  location: string;
  description: string;
  lastSeen?: string;
  createdAt: string;
};

export default function ScreensPage() {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', location: '', description: '' });
  const [mqttStatuses, setMqttStatuses] = useState<Record<string, boolean>>({});

  const fetchScreens = async () => {
    const res = await fetch('/api/screens');
    const data = await res.json();
    setScreens(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchScreens();
    // Auto-refresh screens to update list (not needed for online status anymore, but good for new screens)
    const interval = setInterval(fetchScreens, 15000);

    // Conexión a MQTT
    const client = mqtt.connect('wss://videos.myplayad.com/mqtt');
    
    client.on('connect', () => {
      client.subscribe('screens/+/status');
    });

    client.on('message', (topic, message) => {
      // topic: screens/123/status
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
    setFormData({ name: '', location: '', description: '' });
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

  const isOnline = (screenId: string, lastSeen?: string) => {
    // Si tenemos estado MQTT en tiempo real, ese manda
    if (mqttStatuses[screenId] !== undefined) {
      return mqttStatuses[screenId];
    }
    // Fallback a latido por base de datos (histórico)
    if (!lastSeen) return false;
    const diff = Date.now() - new Date(lastSeen).getTime();
    return diff < 120000; // 2 minutes
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Monitor className="w-8 h-8 text-primary" /> Pantallas
          </h1>
          <p className="text-muted-foreground mt-2">Gestiona las pantallas físicas del sistema.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl flex items-center gap-2 transition-colors font-medium shadow-[0_0_15px_rgba(59,130,246,0.3)]"
        >
          <Plus className="w-5 h-5" /> Nueva Pantalla
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10">Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {screens.map(screen => {
            const online = isOnline(screen.id, screen.lastSeen);
            return (
              <div key={screen.id} className="glass-card rounded-2xl p-6 relative group overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${online ? 'bg-gradient-to-b from-green-500 to-green-300' : 'bg-gradient-to-b from-red-500 to-red-300'}`}></div>
                <div className="flex justify-between items-start mb-4">
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
                  <button 
                    onClick={() => handleDelete(screen.id)}
                    className="text-destructive/70 hover:text-destructive transition-colors p-2 rounded-lg hover:bg-destructive/10"
                    title="Eliminar"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-400 mb-4 h-10 overflow-hidden line-clamp-2">{screen.description}</p>
              <div className="text-xs text-muted-foreground bg-black/20 p-2 rounded-lg break-all">
                ID: {screen.id}
              </div>
            </div>
            );
          })}
          {screens.length === 0 && (
            <div className="col-span-full text-center py-12 glass-card rounded-2xl border-dashed">
              <Monitor className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No hay pantallas registradas.</p>
            </div>
          )}
        </div>
      )}

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
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all min-h-[100px]"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Detalles adicionales..."
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
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl transition-colors font-medium"
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
