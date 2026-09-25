'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';

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

      // Redirigir al dashboard principal
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error('Error al iniciar sesión:', err);
      setError('Ocurrió un error al conectar con el servidor.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0f1115] to-black relative overflow-hidden">
      {/* Luces de fondo decorativas */}
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Tarjeta de Login */}
        <div className="glass border border-white/10 rounded-2xl shadow-2xl p-8 backdrop-blur-xl bg-[#181a20]/80">
          {/* Logo y Encabezado */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 mb-4 shadow-[0_0_25px_rgba(59,130,246,0.35)]">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gradient tracking-tight">MyPlayAd</h1>
            <p className="text-sm text-muted-foreground mt-1">Panel de Control & Cartelería Digital</p>
          </div>

          {/* Alerta de Error */}
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-sm flex items-center gap-3 animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-5">
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
                  placeholder="admin"
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
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-slate-200 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium text-sm shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:opacity-95 hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] active:scale-[0.99] transition-all disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-2"
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
          <div className="mt-8 pt-6 border-t border-white/5 text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} MyPlayAd Systems • Todos los derechos reservados
          </div>
        </div>
      </div>
    </div>
  );
}

