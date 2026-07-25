'use client';

import { useState, useEffect } from 'react';
import { Film, Upload, Trash2, Monitor, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

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
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');

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

    setUploadStatus('uploading');
    setUploadMessage('Subiendo archivo... esto puede tardar un poco dependiendo del tamaño.');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('screenId', screenId);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      const res = await response.json();
      
      if (!response.ok || !res.success) {
        setUploadStatus('error');
        setUploadMessage(res.error || 'Error desconocido al subir el video.');
      } else {
        setUploadStatus('success');
        setUploadMessage('¡Video subido y asignado correctamente!');
        fetchData();
        
        // Cierra el modal automáticamente después de 2.5 segundos de éxito
        setTimeout(() => {
          setIsModalOpen(false);
          setFile(null);
          setTitle('');
          setUploadStatus('idle');
          setUploadMessage('');
        }, 2500);
      }
    } catch (error) {
      setUploadStatus('error');
      setUploadMessage('Hubo un error de conexión al subir el video.');
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
                  className="px-4 py-2 rounded-xl hover:bg-white/5 transition-colors disabled:opacity-50"
                  disabled={uploadStatus === 'uploading'}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={uploadStatus === 'uploading' || !file || uploadStatus === 'success'}
                  className={`px-4 py-2 rounded-xl transition-colors font-medium flex items-center gap-2 disabled:opacity-50 ${
                    uploadStatus === 'success' ? 'bg-green-600 text-white' : 
                    uploadStatus === 'error' ? 'bg-red-600 text-white hover:bg-red-700' :
                    'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                >
                  {uploadStatus === 'uploading' && <Loader2 className="w-5 h-5 animate-spin" />}
                  {uploadStatus === 'success' && <CheckCircle2 className="w-5 h-5" />}
                  {uploadStatus === 'error' && <AlertCircle className="w-5 h-5" />}
                  
                  {uploadStatus === 'idle' && 'Subir Video'}
                  {uploadStatus === 'uploading' && 'Subiendo...'}
                  {uploadStatus === 'success' && 'Completado'}
                  {uploadStatus === 'error' && 'Reintentar'}
                </button>
              </div>
              
              {/* Feedback messages */}
              {uploadStatus !== 'idle' && (
                <div className={`mt-4 p-4 rounded-xl text-sm flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 ${
                  uploadStatus === 'uploading' ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20' :
                  uploadStatus === 'success' ? 'bg-green-500/10 text-green-300 border border-green-500/20' :
                  'bg-red-500/10 text-red-300 border border-red-500/20'
                }`}>
                  {uploadStatus === 'uploading' && <Loader2 className="w-5 h-5 animate-spin shrink-0 mt-0.5" />}
                  {uploadStatus === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />}
                  {uploadStatus === 'error' && <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
                  <p>{uploadMessage}</p>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
