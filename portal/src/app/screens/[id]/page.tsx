'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Monitor, ArrowLeft, Film, Gamepad2, Trash2, Upload, Loader2, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';
import Link from 'next/link';

type Video = {
  id: string;
  title: string;
  filename: string;
  createdAt: string;
};

type Schedule = {
  id: string;
  gameId?: string;
  videoId?: string;
  game?: any;
  startDate: string;
  isActive: boolean;
};

type ScreenDetail = {
  id: string;
  name: string;
  location: string;
  description: string;
  lastSeen?: string;
};

export default function ScreenDetailPage() {
  const params = useParams();
  const router = useRouter();
  const screenId = params.id as string;
  
  const [screen, setScreen] = useState<ScreenDetail | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [activeGameSchedule, setActiveGameSchedule] = useState<Schedule | null>(null);
  const [games, setGames] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  
  // Game Assignment Modal State
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState('');
  const [startDate, setStartDate] = useState('');
  
  // Video Upload Modal State
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');

  const fetchScreenData = async () => {
    try {
      const res = await fetch(`/api/screens/${screenId}`);
      if (!res.ok) {
        if (res.status === 404) router.push('/screens');
        throw new Error('Failed to fetch screen');
      }
      const data = await res.json();
      setScreen(data.screen);
      setVideos(data.videos);
      setActiveGameSchedule(data.activeGameSchedule);
      
      const gamesRes = await fetch('/api/games');
      const gamesData = await gamesRes.json();
      setGames(gamesData);
      if (gamesData.length > 0) setSelectedGameId(gamesData[0].id);
      
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScreenData();
  }, [screenId]);

  const handleAssignGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGameId) return;

    await fetch(`/api/screens/${screenId}/game`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        gameId: selectedGameId, 
        startDate: startDate ? new Date(startDate).toISOString() : undefined 
      })
    });
    
    setIsGameModalOpen(false);
    fetchScreenData();
  };

  const handleRemoveGame = async () => {
    if (confirm('¿Estás seguro de quitar el juego programado? La pantalla volverá a mostrar solo videos.')) {
      await fetch(`/api/screens/${screenId}/game`, {
        method: 'DELETE'
      });
      fetchScreenData();
    }
  };

  const handleDeleteVideo = async (id: string) => {
    if (confirm('¿Estás seguro de borrar este video de esta pantalla?')) {
      await fetch(`/api/videos/${id}`, { method: 'DELETE' });
      fetchScreenData();
    }
  };

  const handleUploadVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) return;

    setUploadStatus('uploading');
    setUploadMessage('Subiendo archivo...');
    
    try {
      const videoServerUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:8090' 
        : 'https://videos.myplayad.com';
        
      const uploadRes = await fetch(`${videoServerUrl}/api/upload/${screenId}`, {
        method: 'POST',
        headers: {
          'x-file-name': encodeURIComponent(file.name)
        },
        body: file,
      });

      if (!uploadRes.ok) throw new Error('Error al subir el archivo al servidor de videos.');
      const uploadData = await uploadRes.json();
      if (!uploadData.success) throw new Error(uploadData.error || 'Error al subir el video.');

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        setUploadMessage('¡Video subido correctamente!');
        fetchScreenData();
        
        setTimeout(() => {
          setIsVideoModalOpen(false);
          setFile(null);
          setTitle('');
          setUploadStatus('idle');
          setUploadMessage('');
        }, 2000);
      }
    } catch (error: any) {
      setUploadStatus('error');
      setUploadMessage(error.message || 'Hubo un error al subir el video.');
    }
  };

  if (loading) return <div className="text-center py-10">Cargando...</div>;
  if (!screen) return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/screens" className="p-2 glass-card rounded-xl hover:bg-white/5 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Monitor className="w-8 h-8 text-primary" /> {screen.name}
          </h1>
          <p className="text-muted-foreground mt-1">{screen.location}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Game Management Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2 text-green-400">
            <Gamepad2 className="w-6 h-6" /> Juego Programado
          </h2>
          
          <div className="glass-card rounded-2xl p-6 border border-green-500/20">
            {activeGameSchedule ? (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-bold text-green-400">{activeGameSchedule.game.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> 
                      Inicia: {new Date(activeGameSchedule.startDate).toLocaleString()}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-400">
                  Esta pantalla mostrará este juego. Si hay videos, se mostrarán en la parte inferior o cuando el usuario no esté jugando.
                </p>
                <div className="pt-4 border-t border-white/5 flex gap-3">
                  <button 
                    onClick={() => setIsGameModalOpen(true)}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl transition-colors font-medium text-sm"
                  >
                    Cambiar Juego
                  </button>
                  <button 
                    onClick={handleRemoveGame}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-2 rounded-xl transition-colors font-medium text-sm"
                  >
                    Quitar Juego
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <Gamepad2 className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
                <p className="text-muted-foreground mb-4">No hay ningún juego programado. La pantalla mostrará un ciclo de videos continuo.</p>
                <button 
                  onClick={() => setIsGameModalOpen(true)}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl transition-colors font-medium text-sm inline-flex items-center gap-2"
                >
                  <Gamepad2 className="w-4 h-4" /> Asignar Juego
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Videos Management Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2 text-purple-400">
              <Film className="w-6 h-6" /> Videos de esta Pantalla
            </h2>
            <button 
              onClick={() => setIsVideoModalOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors font-medium"
            >
              <Upload className="w-4 h-4" /> Subir Video
            </button>
          </div>
          
          <div className="space-y-3">
            {videos.length === 0 ? (
              <div className="text-center py-8 glass-card rounded-2xl border-dashed">
                <Film className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
                <p className="text-sm text-muted-foreground">No hay videos asignados a esta pantalla.</p>
              </div>
            ) : (
              videos.map(video => (
                <div key={video.id} className="glass-card rounded-xl p-4 flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-black/40 rounded-lg flex items-center justify-center">
                      <Film className="w-6 h-6 text-purple-500/50" />
                    </div>
                    <div>
                      <h4 className="font-bold">{video.title}</h4>
                      <p className="text-xs text-muted-foreground">{new Date(video.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteVideo(video.id)}
                    className="text-destructive/50 hover:text-destructive p-2 rounded-lg hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                    title="Eliminar Video"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Game Assignment Modal */}
      {isGameModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass rounded-2xl w-full max-w-md p-6 shadow-2xl border border-white/10">
            <h2 className="text-2xl font-bold mb-4">Programar Juego</h2>
            <form onSubmit={handleAssignGame} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Seleccionar Juego</label>
                <select 
                  required
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                  value={selectedGameId}
                  onChange={e => setSelectedGameId(e.target.value)}
                >
                  {games.map(g => (
                    <option key={g.id} value={g.id} className="bg-background">{g.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fecha de Inicio (Opcional)</label>
                <input 
                  type="datetime-local" 
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">Si se deja vacío, iniciará inmediatamente.</p>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsGameModalOpen(false)}
                  className="px-4 py-2 rounded-xl hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl transition-colors font-medium"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Video Upload Modal */}
      {isVideoModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass rounded-2xl w-full max-w-md p-6 shadow-2xl border border-white/10">
            <h2 className="text-2xl font-bold mb-4">Subir Video a Pantalla</h2>
            <form onSubmit={handleUploadVideo} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Título</label>
                <input 
                  required
                  type="text" 
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
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
                  onClick={() => setIsVideoModalOpen(false)}
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
                  {uploadStatus === 'idle' && 'Subir Video'}
                  {uploadStatus === 'uploading' && 'Subiendo...'}
                  {uploadStatus === 'success' && 'Completado'}
                  {uploadStatus === 'error' && 'Reintentar'}
                </button>
              </div>
              
              {uploadStatus !== 'idle' && (
                <div className={`mt-4 p-4 rounded-xl text-sm flex items-start gap-3 animate-in fade-in ${
                  uploadStatus === 'uploading' ? 'bg-blue-500/10 text-blue-300' :
                  uploadStatus === 'success' ? 'bg-green-500/10 text-green-300' :
                  'bg-red-500/10 text-red-300'
                }`}>
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
