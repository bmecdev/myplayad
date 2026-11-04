'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Gamepad2,
  Database,
  Lock,
  CheckCircle2,
  Play,
  X,
  Maximize2,
  Minimize2,
  ExternalLink,
  Smartphone,
  Sparkles,
  Keyboard,
} from 'lucide-react';
import { ARCADE_GAMES_CATALOG, getGameUrl, getControllerUrl, CatalogGame } from '@/lib/gamesCatalog';

type UserSession = {
  id: string;
  role: 'SUPER_ADMIN' | 'CLIENT';
  plan?: {
    name: string;
  } | null;
};

export default function GamesPage() {
  const [games, setGames] = useState<CatalogGame[]>([]);
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeGame, setActiveGame] = useState<CatalogGame | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const fetchData = async () => {
    try {
      const [meRes, gamesRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/games?all=true'),
      ]);

      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentUser(meData.user);
      }

      if (gamesRes.ok) {
        const gamesData: any[] = await gamesRes.json();
        // Merge API games with rich metadata from catalog
        const merged: CatalogGame[] = ARCADE_GAMES_CATALOG.map((cat) => {
          const apiMatch = gamesData.find((g) => g.slug === cat.slug);
          return {
            ...cat,
            id: apiMatch?.id || cat.slug,
            name: apiMatch?.name || cat.name,
            description: cat.description || apiMatch?.description || '',
            isIncluded: apiMatch ? apiMatch.isIncluded : true,
          };
        });
        setGames(merged);
      } else {
        setGames(ARCADE_GAMES_CATALOG.map((g) => ({ ...g, isIncluded: true })));
      }
    } catch (err) {
      console.error('Error fetching games:', err);
      setGames(ARCADE_GAMES_CATALOG.map((g) => ({ ...g, isIncluded: true })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeGame) {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
          setIsFullscreen(false);
        } else {
          setActiveGame(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeGame]);

  // Focus iframe when modal opens
  useEffect(() => {
    if (activeGame) {
      const timer = setTimeout(() => {
        iframeRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [activeGame]);

  // Responder a peticiones GET_AD_VIDEO en el modal
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'GET_AD_VIDEO') {
        const fullUrl = `${window.location.origin}/videos/demo-spot.mp4`;
        event.source?.postMessage(
          {
            type: 'AD_VIDEO_RESPONSE',
            videoUrl: fullUrl,
          },
          '*' as any
        );
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const toggleFullscreen = () => {
    if (!modalContainerRef.current) return;
    if (!document.fullscreenElement) {
      modalContainerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.warn('Error entering fullscreen:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(() => {});
    }
  };

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Gamepad2 className="w-8 h-8 text-green-500" />
            {isSuperAdmin ? 'Catálogo de Juegos' : 'Juegos de tu Plan'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isSuperAdmin
              ? 'Haz clic en cualquier juego para abrirlo y probarlo en vivo con teclado o móvil.'
              : `Catálogo de juegos según tu suscripción (${currentUser?.plan?.name || 'Sin Plan'}).`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isSuperAdmin ? (
            <div className="bg-green-500/10 text-green-400 px-4 py-2 rounded-xl flex items-center gap-2 border border-green-500/20 text-sm font-medium">
              <Database className="w-4 h-4" /> 13 Juegos Arcade Disponibles
            </div>
          ) : (
            currentUser?.plan && (
              <div className="bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-xl flex items-center gap-2 border border-emerald-500/20 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" /> {currentUser.plan.name}
              </div>
            )
          )}
        </div>
      </div>

      {/* Grid de Juegos */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          <span>Cargando catálogo arcade...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {games.map((game) => {
            const hasAccess = isSuperAdmin || game.isIncluded;

            return (
              <div
                key={game.slug}
                onClick={() => {
                  if (hasAccess) {
                    setIsIframeLoading(true);
                    setActiveGame(game);
                  }
                }}
                className={`glass-card rounded-2xl p-6 relative group border transition-all flex flex-col justify-between ${
                  hasAccess
                    ? 'border-green-500/20 hover:border-green-500/60 hover:shadow-[0_0_30px_rgba(34,197,94,0.15)] hover:-translate-y-1 cursor-pointer bg-gradient-to-br from-white/[0.03] to-transparent'
                    : 'border-white/5 opacity-50 bg-black/40 cursor-not-allowed'
                }`}
              >
                <div>
                  {/* Top Bar de la Card */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl p-2 rounded-xl bg-black/40 border border-white/5 shadow-inner">
                        {game.icon}
                      </span>
                      <div>
                        <h3
                          className={`text-xl font-bold tracking-tight transition-colors ${
                            hasAccess
                              ? 'text-white group-hover:text-green-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {game.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground bg-black/40 font-mono px-2 py-0.5 rounded border border-white/5">
                            /{game.slug}
                          </span>
                          <span className="text-[11px] text-green-400/80 font-medium bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                            {game.genre}
                          </span>
                        </div>
                      </div>
                    </div>

                    {!hasAccess ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Lock className="w-3.5 h-3.5" /> Bloqueado
                      </span>
                    ) : (
                      !isSuperAdmin && (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Habilitado
                        </span>
                      )
                    )}
                  </div>

                  {/* Descripción */}
                  <p className="text-sm text-gray-300 mt-2 line-clamp-2 leading-relaxed">
                    {game.description}
                  </p>

                  {/* Controles info */}
                  {game.controls && (
                    <div className="mt-3 text-xs text-gray-400 flex items-center gap-1.5 bg-black/30 p-2 rounded-lg border border-white/5">
                      <Keyboard className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                      <span className="truncate">{game.controls}</span>
                    </div>
                  )}
                </div>

                {/* Botón de Acción */}
                <div className="mt-5 pt-4 border-t border-white/5">
                  {hasAccess ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsIframeLoading(true);
                        setActiveGame(game);
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-green-500/15 hover:bg-green-500 text-green-400 hover:text-black font-semibold text-sm border border-green-500/30 flex items-center justify-center gap-2 transition-all duration-200 group-hover:bg-green-500 group-hover:text-black shadow-sm cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Jugar Ahora
                    </button>
                  ) : (
                    <div className="text-center text-xs text-muted-foreground py-2 font-medium">
                      Disponible al actualizar de plan
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {games.length === 0 && (
            <div className="col-span-full text-center py-12 glass-card rounded-2xl border-dashed">
              <Gamepad2 className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No hay juegos disponibles en este momento.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal Interactivo de Juego Arcade */}
      {activeGame && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
          <div
            ref={modalContainerRef}
            className={`w-full bg-[#0a0f0d] border-2 border-green-500/40 rounded-2xl flex flex-col overflow-hidden shadow-[0_0_60px_rgba(34,197,94,0.2)] transition-all ${
              isFullscreen
                ? 'fixed inset-0 rounded-none border-0 h-screen max-h-none'
                : 'max-w-5xl h-[92vh] max-h-[860px]'
            }`}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#0f1713] border-b border-green-500/30 flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{activeGame.icon}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white tracking-wide">
                      {activeGame.name}
                    </h2>
                    <span className="text-xs bg-green-500/20 text-green-400 font-mono px-2 py-0.5 rounded border border-green-500/30 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> DEMO PLAY
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {activeGame.genre} &bull; /{activeGame.slug}
                  </p>
                </div>
              </div>

              {/* Botones de Cabecera */}
              <div className="flex items-center gap-2">
                {/* Abrir en nueva pestaña */}
                <a
                  href={getGameUrl(activeGame.slug, 'PORTAL_STANDALONE')}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
                  title="Abrir en pestaña nueva"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>

                {/* Pantalla Completa */}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
                  title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </button>

                {/* Cerrar */}
                <button
                  type="button"
                  onClick={() => setActiveGame(null)}
                  className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 transition-colors cursor-pointer ml-1"
                  title="Cerrar juego (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body: Iframe del Juego */}
            <div className="flex-1 min-h-0 min-w-0 bg-black relative flex items-center justify-center overflow-hidden">
              {isIframeLoading && (
                <div className="absolute inset-0 z-10 bg-[#0a0f0d] flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                  <span className="font-arcade text-xs text-green-400 tracking-wider">
                    CARGANDO CONSOLA ARCADE...
                  </span>
                </div>
              )}
              <iframe
                ref={iframeRef}
                src={`${getGameUrl(activeGame.slug, 'PORTAL_PLAY')}&adVideo=${encodeURIComponent(
                  `${typeof window !== 'undefined' ? window.location.origin : ''}/videos/demo-spot.mp4`
                )}`}
                title={activeGame.name}
                tabIndex={0}
                allow="autoplay; fullscreen; gamepad; clipboard-write; encrypted-media"
                onLoad={() => {
                  setIsIframeLoading(false);
                  setTimeout(() => iframeRef.current?.focus(), 150);
                  const fullUrl = `${window.location.origin}/videos/demo-spot.mp4`;
                  iframeRef.current?.contentWindow?.postMessage(
                    {
                      type: 'AD_VIDEO_RESPONSE',
                      videoUrl: fullUrl,
                    },
                    '*'
                  );
                }}
                className={`w-full h-full border-0 block bg-black transition-opacity duration-300 ${
                  isIframeLoading ? 'opacity-0' : 'opacity-100'
                }`}
              />
            </div>

            {/* Modal Footer: Controles y QR Móvil */}
            <div className="px-5 py-3 bg-[#0f1713] border-t border-green-500/20 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-300 flex-shrink-0">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-md border border-white/5">
                  <Keyboard className="w-3.5 h-3.5 text-green-400" />
                  <span><strong>[WASD / Flechas]</strong> Mover</span>
                </span>
                <span className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-md border border-white/5">
                  <span className="w-2 h-2 rounded-full bg-green-400" />
                  <span><strong>[Espacio / Enter]</strong> Iniciar / Acción</span>
                </span>
                <span className="hidden sm:flex items-center gap-1.5 text-gray-400">
                  <span>Haz clic dentro de la pantalla para tomar el foco de teclado.</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={getControllerUrl(activeGame.slug)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 bg-green-500/15 hover:bg-green-500/25 text-green-400 px-3 py-1 rounded-lg border border-green-500/30 font-medium transition-colors"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Abrir Mando Móvil</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
