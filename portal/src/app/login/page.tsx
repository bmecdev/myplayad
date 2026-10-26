'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  Radio,
  Zap,
  Building2,
  Store,
  Sparkles,
  WifiOff,
  CheckCircle2,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Por favor ingresa tu usuario y contraseña.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Credenciales inválidas.');
        setLoading(false);
        return;
      }

      // Redirigir al dashboard principal con recarga limpia para aplicar la cookie
      window.location.href = '/';
    } catch (err) {
      console.error('Error al iniciar sesión:', err);
      setError('Ocurrió un error al conectar con el servidor.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 md:p-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0f1115] to-black relative overflow-hidden">
      {/* Luces de fondo decorativas */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-6xl relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Columna Izquierda: Presentación de Producto y Modalidades de Pantallas */}
        <div className="lg:col-span-7 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider">
            <Radio className="w-3.5 h-3.5 animate-pulse text-blue-400" />
            Conectividad 4G LTE Incluida • Plug & Play
          </div>

          <div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-foreground tracking-tight leading-tight">
              Publicidad Interactiva &{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
                Juegos Retro
              </span>
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg mt-3 leading-relaxed">
              Transforma la experiencia en punto de venta con cartelería digital que combina spots de video y minijuegos arcade jugables desde el celular sin instalar aplicaciones.
            </p>
          </div>

          {/* Tarjetas de Modalidades de Pantallas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Modalidad 1: Pantalla Grande Fija */}
            <div className="glass border border-white/10 rounded-2xl p-5 hover:border-blue-500/30 transition-all bg-[#141820]/70">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-foreground text-base">Pantalla Grande Fija</h3>
              <p className="text-xs text-blue-400 font-medium mt-0.5">Centros Comerciales (CC / Malls)</p>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Tótem vertical de gran formato (43&quot;, 55&quot;, 65&quot;+) de alto impacto visual para pasillos centrales, plazas de comidas y áreas de alto tráfico peatonal.
              </p>
            </div>

            {/* Modalidad 2: Pantalla Mediana Portable */}
            <div className="glass border border-white/10 rounded-2xl p-5 hover:border-purple-500/30 transition-all bg-[#141820]/70">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3">
                <Store className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-foreground text-base">Pantalla Mediana Portable</h3>
              <p className="text-xs text-purple-400 font-medium mt-0.5">Negocios, Ferias y Stands</p>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Estación digital compacta y versátil lista para montar en minutos en mostradores, recepciones, eventos corporativos y ferias comerciales.
              </p>
            </div>
          </div>

          {/* Banner de Conectividad 4G Total */}
          <div className="glass border border-emerald-500/20 rounded-2xl p-4 bg-emerald-950/20 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-emerald-300">
                ¡Lo único que necesitas es electricidad!
              </h4>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Nuestras pantallas cuentan con <strong className="text-emerald-400 font-semibold">conexión 4G LTE autónoma incluida</strong>. No requieres solicitar claves de Wi-Fi locales, configurar routers ni lidiar con firewalls corporativos. Solo conecta a la corriente y arranca al instante.
              </p>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Tarjeta de Login */}
        <div className="lg:col-span-5 w-full max-w-md mx-auto">
          <div className="glass border border-white/10 rounded-3xl shadow-2xl p-8 backdrop-blur-xl bg-[#181a20]/80">
            {/* Logo y Encabezado */}
            <div className="text-center mb-7">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 mb-3 shadow-[0_0_25px_rgba(59,130,246,0.35)]">
                <ShieldCheck className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gradient tracking-tight">Acceso al Portal</h2>
              <p className="text-xs text-muted-foreground mt-1">Gestiona tus pantallas, videos y campañas</p>
            </div>

            {/* Alerta de Error */}
            {error && (
              <div className="mb-6 p-3.5 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-sm flex items-center gap-3 animate-in fade-in duration-200">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wider">
                  Usuario
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin o tu usuario"
                    autoComplete="username"
                    autoFocus
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-slate-700/80 rounded-xl text-foreground placeholder:text-slate-600 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wider">
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    className="w-full pl-10 pr-11 py-2.5 bg-black/40 border border-slate-700/80 rounded-xl text-foreground placeholder:text-slate-600 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-slate-200 transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium text-sm shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:opacity-95 hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] active:scale-[0.99] transition-all disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verificando...</span>
                  </>
                ) : (
                  <span>Iniciar Sesión</span>
                )}
              </button>
            </form>

            {/* Footer de la tarjeta */}
            <div className="mt-6 pt-5 border-t border-white/5 text-center text-[11px] text-muted-foreground">
              &copy; {new Date().getFullYear()} MyPlayAd Systems • Todos los derechos reservados
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
