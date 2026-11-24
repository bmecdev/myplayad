'use client';

import { useState, useEffect } from 'react';
import { 
  Gift, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Download, 
  User, 
  Mail, 
  Phone, 
  Monitor, 
  Gamepad2, 
  Sparkles,
  RefreshCw,
  Filter
} from 'lucide-react';

type RewardLead = {
  id: string;
  code: string;
  name: string;
  email: string;
  whatsapp: string;
  termsAccepted: boolean;
  gameSlug: string;
  score: number;
  rewardTitle: string;
  status: 'PENDING' | 'REDEEMED' | 'EXPIRED';
  expiresAt: string;
  redeemedAt?: string | null;
  createdAt: string;
  screen?: {
    id: string;
    name: string;
    location?: string;
  };
  user?: {
    id: string;
    name: string;
  };
};

export default function RewardsPage() {
  const [leads, setLeads] = useState<RewardLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Redimir / Buscar en caja
  const [claimInput, setClaimInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [foundLead, setFoundLead] = useState<RewardLead | null>(null);
  const [claimResult, setClaimResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchFilter) params.append('search', searchFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const res = await fetch(`/api/rewards/leads?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [statusFilter]);

  const handleSearchClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimInput.trim()) return;

    setVerifying(true);
    setClaimResult(null);
    setFoundLead(null);

    try {
      const res = await fetch('/api/rewards/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: claimInput.trim(), action: 'SEARCH' }),
      });
      const data = await res.json();

      if (!res.ok) {
        setClaimResult({ type: 'error', message: data.error || 'No encontrado' });
      } else {
        setFoundLead(data.lead);
      }
    } catch (err) {
      setClaimResult({ type: 'error', message: 'Error de conexión con el servidor' });
    } finally {
      setVerifying(false);
    }
  };

  const handleConfirmRedeem = async () => {
    if (!foundLead) return;

    setVerifying(true);
    try {
      const res = await fetch('/api/rewards/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: foundLead.code, action: 'REDEEM' }),
      });
      const data = await res.json();

      if (!res.ok) {
        setClaimResult({ type: 'error', message: data.error || 'Error al validar' });
      } else {
        setClaimResult({ type: 'success', message: data.message });
        setFoundLead(data.lead);
        fetchLeads(); // Recargar la tabla
      }
    } catch (err) {
      setClaimResult({ type: 'error', message: 'Error al procesar el canje' });
    } finally {
      setVerifying(false);
    }
  };

  const exportToCSV = () => {
    if (leads.length === 0) return;

    const headers = ['Nombre', 'Email', 'WhatsApp', 'Juego', 'Puntaje', 'Premio', 'Estado', 'Fecha Registro', 'Fecha Canje', 'Pantalla'];
    const rows = leads.map(l => [
      `"${l.name}"`,
      `"${l.email}"`,
      `"${l.whatsapp}"`,
      `"${l.gameSlug}"`,
      l.score,
      `"${l.rewardTitle}"`,
      l.status,
      `"${new Date(l.createdAt).toLocaleString()}"`,
      l.redeemedAt ? `"${new Date(l.redeemedAt).toLocaleString()}"` : '""',
      `"${l.screen?.name || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `leads_myplayad_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <Gift className="w-8 h-8 text-amber-400" />
            Premios & Captación de Clientes (Leads)
          </h1>
          <p className="text-muted-foreground mt-1">
            Valida los códigos ganadores de tus jugadores en el mostrador y gestiona tu base de datos de clientes.
          </p>
        </div>

        <button
          onClick={exportToCSV}
          disabled={leads.length === 0}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Descargar Leads (Excel / CSV)
        </button>
      </div>

      {/* Módulo de Validación Rápida en Caja / Mostrador */}
      <div className="glass-card rounded-2xl p-6 border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
        <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          Validación de Código en Mostrador / Caja
        </h2>
        <p className="text-sm text-slate-300 mb-4">
          Ingresa el <strong>Código de Reclamo</strong> (ej: <code>WIN-8492</code>) o el <strong>correo electrónico</strong> del jugador que está en tu local:
        </p>

        <form onSubmit={handleSearchClaim} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Ej: WIN-7832 o cliente@correo.com"
              value={claimInput}
              onChange={(e) => setClaimInput(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 uppercase font-mono tracking-wider"
            />
          </div>
          <button
            type="submit"
            disabled={verifying || !claimInput.trim()}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold px-6 py-2.5 rounded-xl transition-all cursor-pointer shadow-lg shadow-amber-500/20"
          >
            {verifying ? 'Buscando...' : 'Buscar Premio'}
          </button>
        </form>

        {/* Mensaje de Resultado */}
        {claimResult && (
          <div className={`mt-4 p-4 rounded-xl flex items-center gap-3 ${
            claimResult.type === 'success' 
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
          }`}>
            {claimResult.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span className="text-sm font-medium">{claimResult.message}</span>
          </div>
        )}

        {/* Ficha del Premio Encontrado */}
        {foundLead && (
          <div className="mt-5 p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs uppercase font-mono tracking-widest text-amber-400">Código Validado</span>
                <div className="text-2xl font-black text-white font-mono tracking-wider">{foundLead.code}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
                  foundLead.status === 'PENDING'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : foundLead.status === 'REDEEMED'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {foundLead.status === 'PENDING' ? '⏳ Listo para Canjear' : foundLead.status === 'REDEEMED' ? '✓ Ya Canjeado' : '✕ Expirado'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-xs text-muted-foreground block">Premio a Entregar:</span>
                <span className="font-bold text-amber-300 text-base">{foundLead.rewardTitle}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Jugador:</span>
                <span className="font-medium text-white">{foundLead.name}</span>
                <div className="text-xs text-slate-400">{foundLead.email} • {foundLead.whatsapp}</div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Límite para reclamar:</span>
                <span className="text-xs font-mono text-slate-300 flex items-center gap-1 mt-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  {new Date(foundLead.expiresAt).toLocaleTimeString()} ({new Date(foundLead.expiresAt).toLocaleDateString()})
                </span>
              </div>
            </div>

            {foundLead.status === 'PENDING' && (
              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleConfirmRedeem}
                  disabled={verifying}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/30 transition-all cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Marcar como Entregado / Canjear Ahora
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabla de Jugadores y Leads */}
      <div className="glass-card rounded-2xl p-6 border border-border/50 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-cyan-400" />
            Base de Datos de Jugadores ({leads.length})
          </h2>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Filtro de Estado */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-cyan-400"
            >
              <option value="all">Todos los estados</option>
              <option value="PENDING">Pendientes</option>
              <option value="REDEEMED">Canjeados</option>
              <option value="EXPIRED">Expirados</option>
            </select>

            {/* Refrescar */}
            <button
              onClick={fetchLeads}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition-colors"
              title="Actualizar lista"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Cargando base de datos de jugadores...</div>
        ) : leads.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No hay jugadores registrados aún. Cuando un usuario supere el récord en tus juegos y reclame su premio, sus datos aparecerán aquí.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-900/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Jugador</th>
                  <th className="px-4 py-3">WhatsApp / Tel</th>
                  <th className="px-4 py-3">Juego / Pts</th>
                  <th className="px-4 py-3">Premio</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-900/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-amber-400">{lead.code}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{lead.name}</div>
                      <div className="text-xs text-slate-400">{lead.email}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-emerald-400">{lead.whatsapp}</td>
                    <td className="px-4 py-3">
                      <span className="uppercase text-xs font-semibold text-slate-300">{lead.gameSlug}</span>
                      <span className="block text-xs text-cyan-400 font-mono">{lead.score} pts</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-200">{lead.rewardTitle}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        lead.status === 'PENDING'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : lead.status === 'REDEEMED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {lead.status === 'PENDING' ? 'Pendiente' : lead.status === 'REDEEMED' ? 'Canjeado' : 'Expirado'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(lead.createdAt).toLocaleDateString()} {new Date(lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
