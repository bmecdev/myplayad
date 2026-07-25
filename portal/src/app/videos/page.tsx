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
  const [screenId, setScreenId] = useState('none');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  
  // Assign screens modal state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [selectedScreenIds, setSelectedScreenIds] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);

  const fetchData = async () => {
    const [vidRes, scrRes] = await Promise.all([
      fetch('/api/videos'),
      fetch('/api/screens')
    ]);
    const vidData = await vidRes.json();
    const scrData = await scrRes.json();
    setVideos(vidData);
    setScreens(scrData);
    setScreenId('none');
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) return;

    setUploadStatus('uploading');
    setUploadMessage('Subiendo archivo... esto puede tardar un poco dependiendo del tamaño.');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    // If we want to use the same video server upload logic, we can pass "pool" or an empty screenId
    const actualScreenId = (!screenId || screenId === 'none') ? 'pool' : screenId;
    formData.append('screenId', actualScreenId);

    try {
      const videoServerUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:8090' 
        : 'https://videos.myplayad.com';
        
      const uploadRes = await fetch(`${videoServerUrl}/api/upload/${actualScreenId}`, {
        method: 'POST',
        headers: {
          'x-file-name': encodeURIComponent(file.name)
        },
        body: file, // Raw body to bypass Next.js middleware limits completely
      });

      if (!uploadRes.ok) {
        throw new Error('Error al subir el archivo al servidor de videos.');
      }

      const uploadData = await uploadRes.json();
      
      if (!uploadData.success) {
        throw new Error(uploadData.error || 'Error al subir el video.');
      }

      // 2. Register in the database via Next.js API
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          screenId,
          filename: uploadData.filename
        }),
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
    } catch (error: any) {
      setUploadStatus('error');
      setUploadMessage(error.message || 'Hubo un error de conexión al subir el video.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de borrar este video y sus programaciones?')) {
      await fetch(`/api/videos/${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

  const openAssignModal = (video: Video) => {
    setSelectedVideo(video);
    // Extraer los IDs de las pantallas donde este video ya está asignado
    const assignedScreenIds = video.schedules.map(s => s.screenId).filter(Boolean);
    setSelectedScreenIds(assignedScreenIds);
    setIsAssignModalOpen(true);
  };

  const handleAssignScreens = async () => {
    if (!selectedVideo) return;
    setIsAssigning(true);
    try {
      const res = await fetch(`/api/videos/${selectedVideo.id}/screens`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ screenIds: selectedScreenIds })
      });
      if (res.ok) {
        setIsAssignModalOpen(false);
        fetchData();
      } else {
        alert('Error al asignar pantallas');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión');
    } finally {
      setIsAssigning(false);
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
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs bg-purple-500/10 text-purple-300 w-max px-2 py-1 rounded">
                    <Monitor className="w-3 h-3" />
                    {video.schedules.length === 0 
                      ? 'Sin asignar' 
                      : video.schedules.length === 1 
                        ? '1 Pantalla' 
                        : `${video.schedules.length} Pantallas`
                    }
                  </div>
                  <button 
                    onClick={() => openAssignModal(video)}
                    className="text-xs flex items-center gap-1 bg-white/5 hover:bg-white/10 text-white px-2 py-1 rounded transition-colors"
                    title="Gestionar Pantallas"
                  >
                    Asignar
                  </button>
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
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  value={screenId}
                  onChange={e => setScreenId(e.target.value)}
                >
                  <option value="none">Ninguna (Solo subir a la piscina)</option>
                  {screens.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
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
      {/* Assign Screens Modal */}
      {isAssignModalOpen && selectedVideo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass rounded-2xl w-full max-w-md p-6 shadow-2xl border border-white/10 flex flex-col max-h-[80vh]">
            <h2 className="text-2xl font-bold mb-2">Asignar a Pantallas</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Selecciona en qué pantallas se mostrará el video <strong>{selectedVideo.title}</strong>.
            </p>
            
            <div className="overflow-y-auto flex-1 space-y-2 mb-4 pr-2">
              {screens.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  No hay pantallas registradas.
                </div>
              ) : (
                screens.map(screen => (
                  <label key={screen.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 border border-white/5 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-white/20 bg-black/40 text-purple-600 focus:ring-purple-500/50"
                      checked={selectedScreenIds.includes(screen.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedScreenIds([...selectedScreenIds, screen.id]);
                        } else {
                          setSelectedScreenIds(selectedScreenIds.filter(id => id !== screen.id));
                        }
                      }}
                    />
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-black/40 rounded-lg flex items-center justify-center">
                        <Monitor className="w-5 h-5 text-purple-500/50" />
                      </div>
                      <h4 className="font-bold text-sm">{screen.name}</h4>
                    </div>
                  </label>
                ))
              )}
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-white/10">
              <button 
                type="button" 
                onClick={() => setIsAssignModalOpen(false)}
                className="px-4 py-2 rounded-xl hover:bg-white/5 transition-colors disabled:opacity-50"
                disabled={isAssigning}
              >
                Cancelar
              </button>
              <button 
                onClick={handleAssignScreens}
                disabled={isAssigning}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {isAssigning && <Loader2 className="w-4 h-4 animate-spin" />}
                Guardar Asignación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
