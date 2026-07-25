'use client';

import { useState, useEffect } from 'react';
import { Film, Upload, Trash2, Monitor } from 'lucide-react';

type Video = {
  id: string;
  title: string;
  filename: string;
  createdAt: string;
  schedules: any[];
};

type Screen = {
  id: string;
  name: string;
};

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [screenId, setScreenId] = useState('');
  const [uploading, setUploading] = useState(false);

  const fetchData = async () => {
    const [vidRes, scrRes] = await Promise.all([
      fetch('/api/videos'),
      fetch('/api/screens')
    ]);
    const vidData = await vidRes.json();
    const scrData = await scrRes.json();
    setVideos(vidData);
    setScreens(scrData);
    if (scrData.length > 0) setScreenId(scrData[0].id);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !screenId || !title) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('screenId', screenId);

    try {
      await fetch('/api/videos', {
        method: 'POST',
        body: formData,
      });
      setIsModalOpen(false);
      setFile(null);
      setTitle('');
      fetchData();
    } catch (error) {
      alert('Error al subir video');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de borrar este video y sus programaciones?')) {
      await fetch(`/api/videos/${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Film className="w-8 h-8 text-purple-500" /> Videos
          </h1>
          <p className="text-muted-foreground mt-2">Sube y gestiona videos publicitarios.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors font-medium shadow-[0_0_15px_rgba(147,51,234,0.3)]"
        >
          <Upload className="w-5 h-5" /> Subir Video
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10">Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {videos.map(video => (
            <div key={video.id} className="glass-card rounded-2xl overflow-hidden group border border-purple-500/10 hover:border-purple-500/30 transition-all">
              <div className="aspect-video bg-black/50 flex items-center justify-center relative">
                <Film className="w-12 h-12 text-purple-500/30" />
                <button 
                  onClick={() => handleDelete(video.id)}
                  className="absolute top-2 right-2 bg-black/60 text-destructive hover:bg-destructive hover:text-white p-2 rounded-lg backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4">
                <h3 className="font-bold truncate" title={video.title}>{video.title}</h3>
                <p className="text-xs text-muted-foreground truncate mt-1">{video.filename}</p>
                <div className="mt-3 flex items-center gap-2 text-xs bg-purple-500/10 text-purple-300 w-max px-2 py-1 rounded">
                  <Monitor className="w-3 h-3" />
                  {video.schedules[0]?.screen?.name || 'Sin asignar'}
                </div>
              </div>
            </div>
          ))}
          {videos.length === 0 && (
            <div className="col-span-full text-center py-12 glass-card rounded-2xl border-dashed">
              <Film className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No hay videos subidos.</p>
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass rounded-2xl w-full max-w-md p-6 shadow-2xl border border-white/10">
            <h2 className="text-2xl font-bold mb-4">Subir Nuevo Video</h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Título</label>
                <input 
                  required
                  type="text" 
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ej: Promo Verano"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Asignar a Pantalla Inicialmente</label>
                <select 
                  required
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  value={screenId}
                  onChange={e => setScreenId(e.target.value)}
                >
                  {screens.map(s => (
                    <option key={s.id} value={s.id} className="bg-background">{s.name}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">El video se guardará en la carpeta de esta pantalla en el servidor.</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Archivo MP4</label>
                <input 
                  required
                  type="file"
                  accept="video/mp4"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-500/20 file:text-purple-300 hover:file:bg-purple-500/30"
                />
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl hover:bg-white/5 transition-colors"
                  disabled={uploading}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={uploading || !file}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl transition-colors font-medium disabled:opacity-50"
                >
                  {uploading ? 'Subiendo...' : 'Subir Video'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
