'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Tv,
  Gamepad2,
  Film,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  RotateCcw,
  Smartphone,
  Keyboard,
  Sparkles,
  Info,
  Check,
  Radio,
} from 'lucide-react';
import { ARCADE_GAMES_CATALOG, getGameUrl, getControllerUrl, CatalogGame } from '@/lib/gamesCatalog';

type VideoItem = {
  id: string;
  title: string;
  filename: string;
  user?: {
    name?: string;
  };
};

export default function DemoKioskPage() {
  const [selectedGameSlug, setSelectedGameSlug] = useState<string>('arkanoid');
  const [orientation, setOrientation] = useState<'LANDSCAPE' | 'PORTRAIT'>('LANDSCAPE');
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isGameLoading, setIsGameLoading] = useState<boolean>(true);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [selectedVideoSource, setSelectedVideoSource] = useState<string>('default');
  const [activeVideoUrl, setActiveVideoUrl] = useState<string>('/videos/demo-spot.mp4');
  const [currentVideoIdx, setCurrentVideoIdx] = useState<number>(0);
  const [reloadKey, setReloadKey] = useState<number>(0);

  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Fetch available videos from database
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await fetch('/api/videos');
        if (res.ok) {
          const data: VideoItem[] = await res.json();
          setVideos(data);
        }
      } catch (err) {
        console.warn('No se pudieron cargar videos adicionales:', err);
      }
    };
    fetchVideos();
  }, []);

  // Update active video URL when selection changes
  useEffect(() => {
    if (selectedVideoSource === 'default') {
      setActiveVideoUrl('/videos/demo-spot.mp4');
    } else if (selectedVideoSource === 'playlist' && videos.length > 0) {
      const vid = videos[currentVideoIdx % videos.length];
      const isDev =
        typeof window !== 'undefined' &&
        (window.location.hostname.includes('dev') ||
          window.location.hostname.includes('staging') ||
          window.location.hostname.includes('localhost'));
      const videoServer = isDev ? 'https://dev-videos.myplayad.com' : 'https://videos.myplayad.com';
      setActiveVideoUrl(`${videoServer}/pool/${vid.filename}`);
    } else {
      const vid = videos.find((v) => v.id === selectedVideoSource);
      if (vid) {
        const isDev =
          typeof window !== 'undefined' &&
          (window.location.hostname.includes('dev') ||
            window.location.hostname.includes('staging') ||
            window.location.hostname.includes('localhost'));
        const videoServer = isDev ? 'https://dev-videos.myplayad.com' : 'https://videos.myplayad.com';
        setActiveVideoUrl(`${videoServer}/pool/${vid.filename}`);
      } else {
        setActiveVideoUrl('/videos/demo-spot.mp4');
      }
    }
  }, [selectedVideoSource, currentVideoIdx, videos]);

  // Fullscreen listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!stageRef.current) return;
    if (!document.fullscreenElement) {
      stageRef.current.requestFullscreen().catch((err) => {
        console.warn('Error solicitando pantalla completa:', err);
      });
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleVideoEnded = () => {
    if (selectedVideoSource === 'playlist' && videos.length > 1) {
      setCurrentVideoIdx((prev) => (prev + 1) % videos.length);
    } else if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  const reloadSimulator = () => {
    setIsGameLoading(true);
    setReloadKey((prev) => prev + 1);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  const currentGame =
    ARCADE_GAMES_CATALOG.find((g) => g.slug === selectedGameSlug) || ARCADE_GAMES_CATALOG[0];

  return (
    <div className="space-y-6 pb-12">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Tv className="w-8 h-8 text-green-400" />
            <span>Simulador de Kiosco Raspberry Pi</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            Previsualiza en vivo la consola arcade dual: minijuego interactivo a un lado y canal
            de video publicitario al otro.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-green-500/10 border border-green-500/30 text-xs font-mono text-green-400">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
            RPI KIOSK V7 EN VIVO
          </span>
        </div>
      </div>

      {/* Barra de Control del Simulador */}
      <div className="glass-card rounded-2xl p-4 border border-white/10 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de Juego */}
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-green-400" />
            <select
              value={selectedGameSlug}
              onChange={(e) => {
                setIsGameLoading(true);
                setSelectedGameSlug(e.target.value);
              }}
              className="bg-black/50 border border-white/15 text-white text-sm rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-green-500/50 outline-none cursor-pointer"
            >
              {ARCADE_GAMES_CATALOG.map((g) => (
                <option key={g.slug} value={g.slug} className="bg-[#121c16] text-white">
                  {g.icon} {g.name} (/{g.slug})
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Orientación */}
          <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setOrientation('LANDSCAPE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                orientation === 'LANDSCAPE'
                  ? 'bg-green-500 text-black shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>📺 Horizontal (16:9 TV)</span>
            </button>
            <button
              type="button"
              onClick={() => setOrientation('PORTRAIT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                orientation === 'PORTRAIT'
                  ? 'bg-green-500 text-black shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>📱 Vertical (9:16 Tótem)</span>
            </button>
          </div>

          {/* Selector de Video Comercial */}
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-purple-400" />
            <select
              value={selectedVideoSource}
              onChange={(e) => setSelectedVideoSource(e.target.value)}
              className="bg-black/50 border border-white/15 text-white text-sm rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-purple-500/50 outline-none cursor-pointer max-w-[220px] truncate"
            >
              <option value="default" className="bg-[#121c16] text-white">
                Spot Demo MyPlayAd
              </option>
              {videos.length > 0 && (
                <option value="playlist" className="bg-[#121c16] text-white">
                  Rotación de Videos ({videos.length})
                </option>
              )}
              {videos.map((v) => (
                <option key={v.id} value={v.id} className="bg-[#121c16] text-white">
                  {v.title} {v.user?.name ? `(${v.user.name})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Botones de Control Derecho */}
        <div className="flex items-center gap-2">
          {/* Audio Toggle */}
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2 rounded-xl border transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium ${
              isMuted
                ? 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                : 'bg-green-500/20 border-green-500/40 text-green-400'
            }`}
            title={isMuted ? 'Activar sonido del video' : 'Silenciar video'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span className="hidden md:inline">{isMuted ? 'Mudo' : 'Audio On'}</span>
          </button>

          {/* Reiniciar Simulador */}
          <button
            type="button"
            onClick={reloadSimulator}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium"
            title="Reiniciar Kiosco"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden md:inline">Reiniciar</span>
          </button>

          {/* Pantalla Completa */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-green-500/15 hover:bg-green-500 text-green-400 hover:text-black border border-green-500/30 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            title="Pantalla Completa Kiosco"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span>{isFullscreen ? 'Salir' : 'Pantalla Completa'}</span>
          </button>
        </div>
      </div>

      {/* Escenario del Kiosco (The Raspberry Pi Stage) */}
      <div
        ref={stageRef}
        className={`w-full relative transition-all duration-300 flex items-center justify-center ${
          isFullscreen
            ? 'fixed inset-0 z-50 bg-[#060a08] p-4 h-screen w-screen'
            : 'bg-[#060a08]/90 p-4 sm:p-6 rounded-3xl border-4 border-[#1f3327] shadow-[0_0_80px_rgba(0,0,0,0.9)]'
        }`}
      >
        {/* Contenedor Kiosco según Orientación */}
        <div
          className={`w-full transition-all duration-300 flex ${
            orientation === 'LANDSCAPE'
              ? 'flex-col lg:flex-row items-stretch justify-center max-w-6xl aspect-[16/9] min-h-[500px] gap-4'
              : 'flex-col items-center justify-center max-w-md aspect-[9/16] min-h-[720px] gap-4'
          }`}
        >
          {/* SECCIÓN JUEGO ARCADE */}
          <div
            className={`relative flex items-center justify-center overflow-hidden rounded-2xl border-2 border-[#1f3327] bg-black shadow-inner min-h-0 ${
              orientation === 'LANDSCAPE'
                ? 'w-full lg:w-1/2 h-[340px] sm:h-[420px] lg:h-full'
                : 'w-full h-1/2 min-h-[340px]'
            }`}
          >
            {isGameLoading && (
              <div className="absolute inset-0 z-10 bg-[#060a08] flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                <span className="font-arcade text-xs text-green-400 tracking-wider">
                  CONECTANDO MINIJUEGO...
                </span>
              </div>
            )}
            <iframe
              key={`game-${selectedGameSlug}-${reloadKey}`}
              ref={iframeRef}
              src={getGameUrl(selectedGameSlug, 'KIOSK_SIMULATOR')}
              title={currentGame.name}
              tabIndex={0}
              allow="autoplay; fullscreen; gamepad; clipboard-write; encrypted-media"
              onLoad={() => setIsGameLoading(false)}
              className={`w-full h-full border-0 block bg-black transition-opacity duration-300 ${
                isGameLoading ? 'opacity-0' : 'opacity-100'
              }`}
            />
          </div>

          {/* SECCIÓN CANAL DE VIDEO PUBLICITARIO (BISEL RETRO CONSOLA) */}
          <div
            className={`relative flex items-center justify-center ${
              orientation === 'LANDSCAPE'
                ? 'w-full lg:w-1/2 h-[340px] sm:h-[420px] lg:h-full'
                : 'w-full h-1/2'
            }`}
          >
            <div className="kiosk-bezel w-full h-full max-w-[500px] max-h-[500px] p-3 sm:p-4 flex flex-col justify-between">
              {/* Bezel Dots */}
              <div className="text-right text-[8px] text-[#2b4536] tracking-[6px] font-arcade pr-1 select-none">
                ● ● ●
              </div>

              {/* Cabecera del Video */}
              <div className="flex justify-between items-center pb-2 mb-2 border-b border-[#1f7d49] text-[9px] font-arcade text-[#3dff8a] select-none">
                <div className="flex items-center gap-1.5 tracking-wider">
                  <Radio className="w-3 h-3 text-[#3dff8a]" />
                  <span>MYPLAYAD TV</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#ff4d6d] tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-[#ff4d6d] animate-kiosk-blink" />
                  <span>ON AIR</span>
                </div>
              </div>

              {/* Pantalla CRT del Video */}
              <div className="relative flex-1 w-full rounded-lg overflow-hidden border-2 border-[#060a08] bg-black flex items-center justify-center shadow-inner">
                {/* Scanlines Effect */}
                <div className="absolute inset-0 kiosk-scanlines z-10 pointer-events-none" />

                {/* Video Player */}
                <video
                  key={`video-${activeVideoUrl}-${reloadKey}`}
                  ref={videoRef}
                  src={activeVideoUrl}
                  autoPlay
                  loop={selectedVideoSource !== 'playlist'}
                  playsInline
                  muted={isMuted}
                  onEnded={handleVideoEnded}
                  onError={() => {
                    console.warn('Error cargando video remoto, recurriendo al video local');
                    setActiveVideoUrl('/videos/demo-spot.mp4');
                  }}
                  className="w-full h-full object-contain block kiosk-crt-flicker"
                />
              </div>

              {/* Footer de la Consola Arcade */}
              <div className="flex justify-between items-center pt-2.5 px-2 select-none">
                <div className="w-10 sm:w-12 h-3 speaker-grille-pattern rounded-sm opacity-60" />
                <div className="text-[9px] text-[#4a755d] font-arcade tracking-wider">
                  MYPLAYAD-MEDIA
                </div>
                <div className="w-10 sm:w-12 h-3 speaker-grille-pattern rounded-sm opacity-60" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Instrucciones y Guía del Kiosco */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div className="glass-card rounded-2xl p-5 border border-white/5 space-y-2">
          <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
            <Keyboard className="w-4 h-4" />
            <span>1. Juega con Teclado</span>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">
            Haz clic en el lado del juego y presiona <strong>Espacio</strong> o las flechas para
            retirar el QR e iniciar la partida de inmediato en la pantalla.
          </p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/5 space-y-2">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
            <Smartphone className="w-4 h-4" />
            <span>2. Conecta tu Celular</span>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">
            Escanea el código QR generado en la pantalla arcade con la cámara de tu smartphone para
            abrir el mando táctil WebRTC en tiempo real a 60 FPS.
          </p>
          <a
            href={getControllerUrl(selectedGameSlug)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 underline font-medium"
          >
            O abre el mando aquí en otra pestaña &rarr;
          </a>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/5 space-y-2">
          <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
            <Sparkles className="w-4 h-4" />
            <span>3. Canal Publicitario Dual</span>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">
            El video comercial rota ininterrumpidamente sin solapar la jugabilidad. Antes de arrancar
            cada partida, se sincroniza el anuncio pre-juego.
          </p>
        </div>
      </div>
    </div>
  );
}

