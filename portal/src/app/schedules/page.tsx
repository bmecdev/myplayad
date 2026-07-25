'use client';

import { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type Schedule = {
  id: string;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  screen: { id: string; name: string };
  game: { id: string; name: string } | null;
  video: { id: string; title: string } | null;
};

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Data for selects
  const [screens, setScreens] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    screenId: '',
    type: 'game',
    gameId: '',
    videoId: '',
    startDate: new Date().toISOString().slice(0, 16),
  });

  const fetchData = async () => {
    const [schedRes, scrRes, gamRes, vidRes] = await Promise.all([
      fetch('/api/schedules'),
      fetch('/api/screens'),
      fetch('/api/games'),
      fetch('/api/videos'),
    ]);
    const schedData = await schedRes.json();
    setSchedules(schedData);
    
    const scrData = await scrRes.json();
    const gamData = await gamRes.json();
    const vidData = await vidRes.json();
    
    setScreens(scrData);
    setGames(gamData);
    setVideos(vidData);
    
    if (scrData.length > 0) setFormData(f => ({ ...f, screenId: scrData[0].id }));
    if (gamData.length > 0) setFormData(f => ({ ...f, gameId: gamData[0].id }));
    if (vidData.length > 0) setFormData(f => ({ ...f, videoId: vidData[0].id }));
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      screenId: formData.screenId,
      gameId: formData.type === 'game' ? formData.gameId : null,
      videoId: formData.type === 'video' ? formData.videoId : null,
      startDate: new Date(formData.startDate).toISOString(),
    };

    await fetch('/api/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    setIsModalOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar esta programación?')) {
      await fetch(`/api/schedules/${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="w-8 h-8 text-orange-500" /> Programación
          </h1>
          <p className="text-muted-foreground mt-2">Asigna juegos o videos a las pantallas.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors font-medium shadow-[0_0_15px_rgba(249,115,22,0.3)]"
        >
          <Plus className="w-5 h-5" /> Nueva Programación
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10">Cargando...</div>
      ) : (
        <div className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-sm font-medium text-muted-foreground">
                <th className="p-4">Pantalla</th>
                <th className="p-4">Contenido</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Fecha Inicio</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {schedules.map(schedule => (
                <tr key={schedule.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 font-medium">{schedule.screen.name}</td>
                  <td className="p-4">
                    {schedule.game ? (
                      <span className="text-green-400">{schedule.game.name}</span>
                    ) : schedule.video ? (
                      <span className="text-purple-400">{schedule.video.title}</span>
                    ) : (
                      <span className="text-gray-500">Ninguno</span>
                    )}
                  </td>
                  <td className="p-4">
                    {schedule.game ? (
                      <span className="px-2 py-1 bg-green-500/10 text-green-500 rounded text-xs">Juego</span>
                    ) : (
                      <span className="px-2 py-1 bg-purple-500/10 text-purple-500 rounded text-xs">Video</span>
                    )}
                  </td>
                  <td className="p-4 text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    {format(new Date(schedule.startDate), "d 'de' MMMM, yyyy HH:mm", { locale: es })}
                  </td>
                  <td className="p-4">
                    {schedule.isActive ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Activo
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">Inactivo</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => handleDelete(schedule.id)}
                      className="text-destructive/70 hover:text-destructive transition-colors p-2 rounded-lg hover:bg-destructive/10"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {schedules.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No hay programaciones activas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass rounded-2xl w-full max-w-md p-6 shadow-2xl border border-white/10">
            <h2 className="text-2xl font-bold mb-4">Nueva Programación</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Pantalla</label>
                <select 
                  required
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  value={formData.screenId}
                  onChange={e => setFormData({...formData, screenId: e.target.value})}
                >
                  {screens.map(s => (
                    <option key={s.id} value={s.id} className="bg-background">{s.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Tipo de Contenido</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="type" 
                      value="game"
                      checked={formData.type === 'game'}
                      onChange={() => setFormData({...formData, type: 'game'})}
                    /> Juego
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="type" 
                      value="video"
                      checked={formData.type === 'video'}
                      onChange={() => setFormData({...formData, type: 'video'})}
                    /> Video
                  </label>
                </div>
              </div>

              {formData.type === 'game' ? (
                <div>
                  <label className="block text-sm font-medium mb-1">Seleccionar Juego</label>
                  <select 
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    value={formData.gameId}
                    onChange={e => setFormData({...formData, gameId: e.target.value})}
                  >
                    {games.map(g => (
                      <option key={g.id} value={g.id} className="bg-background">{g.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-1">Seleccionar Video</label>
                  <select 
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    value={formData.videoId}
                    onChange={e => setFormData({...formData, videoId: e.target.value})}
                  >
                    {videos.map(v => (
                      <option key={v.id} value={v.id} className="bg-background">{v.title}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Fecha de Inicio</label>
                <input 
                  required
                  type="datetime-local" 
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  value={formData.startDate}
                  onChange={e => setFormData({...formData, startDate: e.target.value})}
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
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl transition-colors font-medium"
                >
                  Programar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
