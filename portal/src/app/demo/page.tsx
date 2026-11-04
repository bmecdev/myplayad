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
  Trophy,
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

type RankingEntry = {
  name: string;
  score: number;
};

const DEFAULT_GAME_RANKINGS: Record<string, RankingEntry[]> = {
  circus: [
    { name: 'CHARLIE', score: 20000 },
    { name: 'DOMADOR', score: 15000 },
    { name: 'LION', score: 10000 },
    { name: 'RETRO', score: 7500 },
    { name: 'ROOKIE', score: 5000 },
  ],
  arkanoid: [
    { name: 'VAUS', score: 3500 },
    { name: 'PILOT', score: 2500 },
    { name: 'DOH', score: 1800 },
    { name: 'RETRO', score: 1200 },
    { name: 'ACE', score: 800 },
  ],
  galaga: [
    { name: 'FIGHTER', score: 45000 },
    { name: 'COMMANDER', score: 32000 },
    { name: 'PILOT', score: 24000 },
    { name: 'ROOKIE', score: 18000 },
    { name: 'ACE', score: 12000 },
  ],
  pacman: [
    { name: 'PACMAN', score: 12400 },
    { name: 'MS PAC', score: 9800 },
    { name: 'BLINKY', score: 7600 },
    { name: 'INKY', score: 5400 },
    { name: 'CLYDE', score: 3200 },
  ],
  outrun: [
    { name: 'DRIVER', score: 58000 },
    { name: 'FERRARI', score: 46000 },
    { name: 'CRUISER', score: 35000 },
    { name: 'TURBO', score: 28000 },
    { name: 'SPEEDY', score: 19000 },
  ],
  megaman: [
    { name: 'MEGAMAN', score: 30000 },
    { name: 'ROCK', score: 24000 },
    { name: 'ROLL', score: 18000 },
    { name: 'PROTO', score: 14000 },
    { name: 'BASS', score: 9000 },
  ],
  snake: [
    { name: 'VIPER', score: 850 },
    { name: 'COBRA', score: 620 },
    { name: 'PYTHON', score: 480 },
    { name: 'MAMBA', score: 350 },
    { name: 'WORM', score: 210 },
  ],
  skyroads: [
    { name: 'SKYWALKER', score: 4200 },
    { name: 'ROADRUN', score: 3300 },
    { name: 'NEO', score: 2500 },
    { name: 'PILOT', score: 1800 },
    { name: 'ACE', score: 1100 },
  ],
  pinball: [
    { name: 'WIZARD', score: 150000 },
    { name: 'FLIPPER', score: 110000 },
    { name: 'TILT', score: 85000 },
    { name: 'BALLER', score: 60000 },
    { name: 'ROOKIE', score: 35000 },
  ],
  duckhunt: [
    { name: 'HUNTER', score: 28000 },
    { name: 'SNIPER', score: 21000 },
    { name: 'DOG', score: 16000 },
    { name: 'DUCK', score: 11000 },
    { name: 'ACE', score: 7000 },
  ],
  cybercanyon: [
    { name: 'CYBER', score: 38000 },
    { name: 'RUNNER', score: 29000 },
    { name: 'PILOT', score: 22000 },
    { name: 'NEO', score: 16000 },
    { name: 'ROOKIE', score: 10000 },
  ],
  invaders: [
    { name: 'DEFENDER', score: 18500 },
    { name: 'CANNON', score: 14200 },
    { name: 'PILOT', score: 10800 },
    { name: 'ALIEN', score: 7900 },
    { name: 'BASE', score: 4500 },
  ],
  starwars: [
    { name: 'SKYWALKER', score: 55000 },
    { name: 'SOLO', score: 42000 },
    { name: 'YODA', score: 33000 },
    { name: 'VADER', score: 25000 },
    { name: 'CHEWIE', score: 18000 },
  ],
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
  const [isVideoRankingVisible, setIsVideoRankingVisible] = useState<boolean>(false);
  const [rankingData, setRankingData] = useState<RankingEntry[]>([]);

  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const rankingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch available videos from database
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await fetch('/api/videos');
        if (res.ok) {
          const data: VideoItem[] = await res.json();
          setVideos(data);
          // Si hay videos subidos en el sistema, iniciar directamente con rotación
          if (data.length > 0) {
            setSelectedVideoSource('playlist');
          }
        }
      } catch (err) {
        console.warn('No se pudieron cargar videos adicionales:', err);
      }
    };
    fetchVideos();
  }, []);

  // Update active video URL when selection changes
  useEffect(() => {
    const isDev =
      typeof window !== 'undefined' &&
      (window.location.hostname.includes('dev') ||
        window.location.hostname.includes('staging') ||
        window.location.hostname.includes('localhost'));
    const videoServer = isDev ? 'https://dev-videos.myplayad.com' : 'https://videos.myplayad.com';

    let targetUrl = '/videos/demo-spot.mp4';

    if (selectedVideoSource === 'playlist' && videos.length > 0) {
      const vid = videos[currentVideoIdx % videos.length];
      const cleanName = vid.filename.replace(/^pool\//, '').split('/').pop() || vid.filename;
      targetUrl = `${videoServer}/videos/00000000-0000-0000-0000-000000000000/${encodeURIComponent(cleanName)}`;
    } else if (selectedVideoSource !== 'default') {
      const vid = videos.find((v) => v.id === selectedVideoSource);
      if (vid && vid.filename) {
        const cleanName = vid.filename.replace(/^pool\//, '').split('/').pop() || vid.filename;
        targetUrl = `${videoServer}/videos/00000000-0000-0000-0000-000000000000/${encodeURIComponent(cleanName)}`;
      }
    }

    setActiveVideoUrl(targetUrl);
  }, [selectedVideoSource, currentVideoIdx, videos]);

  // Obtener URL absoluta para el video (soporta URLs relativas en localhost/portal y absolutas en storage)
  const getAbsoluteVideoUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
    }
    return url;
  };

  // Escuchar mensajes del juego arcade en el iframe (comunicación pre-juego y sincronización)
  useEffect(() => {
    const sendAdVideo = (targetWindow?: Window | null) => {
      const win = targetWindow || iframeRef.current?.contentWindow;
      if (!win) return;
      const fullUrl = getAbsoluteVideoUrl(activeVideoUrl);
      if (!fullUrl) return;
      try {
        win.postMessage(
          {
            type: 'AD_VIDEO_RESPONSE',
            videoUrl: fullUrl,
          },
          '*'
        );
      } catch (_) {}
    };

    const handleMessage = (event: MessageEvent) => {
      if (!event.data) return;

      // 1. Minijuego solicita la URL del anuncio publicitario pre-juego
      if (event.data.type === 'GET_AD_VIDEO') {
        sendAdVideo(event.source as Window);
      }

      // 2. El minijuego comenzó a reproducir el video publicitario pre-juego en su pantalla
      if (event.data.type === 'GAME_AD_START') {
        if (videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
        }
      }

      // 3. El minijuego terminó el video publicitario pre-juego y arrancó la partida
      if (event.data.type === 'GAME_AD_END') {
        if (videoRef.current) {
          videoRef.current.play().catch(() => {});
        }
      }

      // 4. El minijuego envía actualización de puntuaciones / Hall of Fame
      if (event.data.type === 'RANKING_UPDATE') {
        if (Array.isArray(event.data.ranking) && event.data.ranking.length > 0) {
          setRankingData(event.data.ranking);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Enviar periódicamente y tras inicialización para garantizar que el juego reciba el video
    sendAdVideo();
    const t1 = setTimeout(() => sendAdVideo(), 400);
    const t2 = setTimeout(() => sendAdVideo(), 1200);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [activeVideoUrl]);

  // Asegurar autoplay y volumen en el elemento de video
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.play().catch((err) => {
        console.warn('Autoplay bloqueado por navegador:', err);
      });
    }
  }, [activeVideoUrl, isMuted]);

  // Fullscreen listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Al cambiar de juego, reiniciar rankingData y solicitar ranking actualizado al iframe
  useEffect(() => {
    setRankingData([]);
    const timer = setTimeout(() => {
      if (iframeRef.current?.contentWindow) {
        try {
          iframeRef.current.contentWindow.postMessage({ type: 'GET_RANKING' }, '*');
        } catch (_) {}
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [selectedGameSlug]);

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
    // Mostrar Ranking / Hall of Fame durante exactamente 5 segundos al terminar la secuencia de video
    setIsVideoRankingVisible(true);
    if (rankingTimeoutRef.current) clearTimeout(rankingTimeoutRef.current);

    rankingTimeoutRef.current = setTimeout(() => {
      setIsVideoRankingVisible(false);
      if (selectedVideoSource === 'playlist' && videos.length > 1) {
        setCurrentVideoIdx((prev) => (prev + 1) % videos.length);
      } else if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
    }, 5000);
  };

  const reloadSimulator = () => {
    if (rankingTimeoutRef.current) clearTimeout(rankingTimeoutRef.current);
    setIsVideoRankingVisible(false);
    setIsGameLoading(true);
    setReloadKey((prev) => prev + 1);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  const currentGame =
    ARCADE_GAMES_CATALOG.find((g) => g.slug === selectedGameSlug) || ARCADE_GAMES_CATALOG[0];

  const currentRanking =
    rankingData.length > 0
      ? rankingData
      : DEFAULT_GAME_RANKINGS[selectedGameSlug] || DEFAULT_GAME_RANKINGS.circus;

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
              <option value="default" className="bg-[#121c16] text-white">
                Spot Demo MyPlayAd
              </option>
            </select>
          </div>
        </div>

        {/* Botones de Control Derecho */}
        <div className="flex items-center gap-2">
          {/* Botón Ver Leaderboard en Video */}
          <button
            type="button"
            onClick={() => setIsVideoRankingVisible(!isVideoRankingVisible)}
            className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-medium ${
              isVideoRankingVisible
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_15px_rgba(255,183,3,0.3)]'
                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
            }`}
            title="Mostrar u ocultar tabla de posiciones (Hall of Fame) en el video"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="hidden md:inline">Leaderboard {isVideoRankingVisible ? 'ON' : ''}</span>
          </button>

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
            className={`relative flex items-center justify-center overflow-hidden min-h-0 ${
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
              onLoad={() => {
                setIsGameLoading(false);
                const fullUrl = getAbsoluteVideoUrl(activeVideoUrl);
                if (iframeRef.current?.contentWindow) {
                  if (fullUrl) {
                    iframeRef.current.contentWindow.postMessage(
                      {
                        type: 'AD_VIDEO_RESPONSE',
                        videoUrl: fullUrl,
                      },
                      '*'
                    );
                  }
                  // Solicitar ranking al juego
                  iframeRef.current.contentWindow.postMessage(
                    {
                      type: 'GET_RANKING',
                    },
                    '*'
                  );
                }
              }}
              className={`w-full h-full border-0 block bg-transparent transition-opacity duration-300 ${
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
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsVideoRankingVisible(!isVideoRankingVisible)}
                    className="flex items-center gap-1 text-[8px] text-amber-400 hover:text-amber-300 font-arcade border border-amber-400/40 rounded px-1.5 py-0.5 bg-amber-400/10 cursor-pointer transition-colors"
                    title="Ver Ranking / Hall of Fame"
                  >
                    <Trophy className="w-2.5 h-2.5" />
                    <span>HALL OF FAME</span>
                  </button>
                  <div className="flex items-center gap-1.5 text-[#ff4d6d] tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-[#ff4d6d] animate-kiosk-blink" />
                    <span>ON AIR</span>
                  </div>
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
                  loop={false}
                  playsInline
                  muted={isMuted}
                  onEnded={handleVideoEnded}
                  onError={() => {
                    console.warn('Error cargando video remoto, recurriendo al video local');
                    if (videos.length > 0 && selectedVideoSource === 'default') {
                      setSelectedVideoSource('playlist');
                    } else if (activeVideoUrl !== '/videos/demo-spot.mp4') {
                      setActiveVideoUrl('/videos/demo-spot.mp4');
                    }
                  }}
                  className="w-full h-full object-contain block kiosk-crt-flicker"
                />

                {/* Overlay de Ranking / Hall of Fame (aparece 5 segundos al terminar la secuencia de videos o por botón) */}
                <div
                  id="video-ranking-overlay"
                  className={`absolute inset-0 bg-[#060b08]/95 z-20 flex flex-col items-center justify-center p-3 sm:p-4 transition-all duration-300 ${
                    isVideoRankingVisible
                      ? 'opacity-100 visible pointer-events-auto'
                      : 'opacity-0 invisible pointer-events-none'
                  }`}
                >
                  <div className="w-full max-w-[340px] text-center">
                    <h2 className="font-arcade text-xs sm:text-sm text-amber-400 tracking-wider mb-2.5 drop-shadow-[0_0_10px_rgba(255,183,3,0.7)] flex items-center justify-center gap-1.5">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <span>HALL OF FAME</span>
                    </h2>
                    <div className="flex justify-between font-arcade text-[8px] sm:text-[9px] text-[#3dff8a]/70 border-b border-[#1f7d49] pb-1 mb-2 tracking-wider">
                      <span className="w-8 text-left">POS</span>
                      <span className="flex-1 text-left pl-2">PILOTO</span>
                      <span className="text-right">SCORE</span>
                    </div>
                    <ul className="divide-y divide-[#1f7d49]/30 font-arcade text-[8px] sm:text-[9px]">
                      {currentRanking.slice(0, 5).map((entry, index) => {
                        const isTop1 = index === 0;
                        const isTop2 = index === 1;
                        const isTop3 = index === 2;
                        const rankColor = isTop1
                          ? 'text-amber-400 font-bold'
                          : isTop2
                          ? 'text-[#3dff8a]'
                          : isTop3
                          ? 'text-blue-400'
                          : 'text-gray-300';
                        return (
                          <li
                            key={index}
                            className={`flex justify-between py-1.5 items-center ${rankColor}`}
                          >
                            <span className="w-8 text-left">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <span className="flex-1 text-left pl-2 truncate uppercase">
                              {entry.name.slice(0, 10)}
                            </span>
                            <span className="text-right text-[#3dff8a]">
                              {String(entry.score).padStart(6, '0')}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[7px] font-arcade text-gray-400">
                      <span>MYPLAYAD TV</span>
                      <span className="text-amber-400">★ TOP PILOTOS ★</span>
                    </div>
                  </div>
                </div>
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

