'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Prospect = {
  id: string
  full_name: string
  phone: string | null
  email: string | null
  temperature: string | null
  last_contact_date: string | null
  next_contact_date: string | null 
  notes: string | null
  assigned_to: string | null
  team_id: string | null
  visited_site: boolean
  has_quote: boolean
  created_at: string
  preferred_typology: string | null // Campo de interés
}

const TEMP_BADGE: Record<string, { label: string; dot: string; text: string }> = {
  cold:    { label: 'Frío',     dot: 'bg-zinc-500',   text: 'text-zinc-400' },
  warm:    { label: 'Tibio',    dot: 'bg-orange-500', text: 'text-orange-400' },
  hot:     { label: 'Caliente', dot: 'bg-purple-500', text: 'text-purple-400' },
  medium:  { label: 'Medio',    dot: 'bg-yellow-500', text: 'text-yellow-400' },
  closing: { label: 'Cierre',   dot: 'bg-white',      text: 'text-white' },
}

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [teams, setTeams] = useState<{id: string, name: string}[]>([])
  const [advisors, setAdvisors] = useState<{id: string, full_name: string, team_id: string | null}[]>([])
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'urgent' | 'today'>('all')

  const supabase = createClient()

  async function loadInitialData() {
    setLoading(true)
    const { data: pData } = await supabase.from('prospects').select('*').order('created_at', { ascending: false })
    const { data: tData } = await supabase.from('teams').select('id, name')
    const { data: uData } = await supabase.from('profiles').select('id, full_name, team_id')
    setProspects((pData as any) ?? [])
    setTeams((tData as any) ?? [])
    setAdvisors((uData as any) ?? [])
    setLoading(false)
  }

  useEffect(() => { loadInitialData() }, [])

  async function createProspect() {
    const newName = prompt("Nombre del nuevo prospecto:");
    if (!newName) return;

    const { data, error } = await supabase
      .from('prospects')
      .insert([{ full_name: newName, temperature: 'cold' }])
      .select()
      .single();

    if (error) alert("Error al crear");
    else loadInitialData();
  }

  async function updateProspect(id: string, updates: Partial<Prospect>) {
    setProspects(current => current.map(p => (p.id === id ? { ...p, ...updates } : p)));
    if (selectedProspect?.id === id) {
      setSelectedProspect(prev => prev ? { ...prev, ...updates } : null);
    }
    await supabase.from('prospects').update(updates).eq('id', id);
  }

  const getAlertStatus = (dateStr: string | null) => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr + 'T00:00:00');
    if (target < today) return 'vencido';
    if (target.getTime() === today.getTime()) return 'hoy';
    return 'futuro';
  };

  const filteredProspects = prospects.filter(p => {
    const matchesSearch = p.full_name.toLowerCase().includes(search.toLowerCase());
    const alert = getAlertStatus(p.next_contact_date);
    if (filterType === 'urgent') return matchesSearch && alert === 'vencido';
    if (filterType === 'today') return matchesSearch && alert === 'hoy';
    return matchesSearch;
  });

  return (
    <div className="relative min-h-screen bg-black text-white p-8 font-sans">
      {/* HEADER CON BOTÓN AGREGAR */}
      <div className="flex justify-between items-start border-b border-white/10 pb-8 mb-8">
        <div>
          <h1 className="text-4xl font-extralight tracking-tighter uppercase italic">Control Comercial</h1>
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mt-2 font-bold italic">Boralba Living • Gestión Estratégica</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex gap-2 border-r border-white/10 pr-4">
            <button onClick={() => setFilterType('all')} className={`px-4 py-2 text-[9px] uppercase tracking-widest border ${filterType === 'all' ? 'bg-white text-black border-white' : 'border-white/10 text-white/40'}`}>Todos</button>
            <button onClick={() => setFilterType('today')} className={`px-4 py-2 text-[9px] uppercase tracking-widest border ${filterType === 'today' ? 'bg-yellow-500 text-black border-yellow-500' : 'border-yellow-500/30 text-yellow-500/60'}`}>Hoy</button>
            <button onClick={() => setFilterType('urgent')} className={`px-4 py-2 text-[9px] uppercase tracking-widest border ${filterType === 'urgent' ? 'bg-red-600 text-white border-red-600' : 'border-red-600/30 text-red-600/60'}`}>Vencidos</button>
          </div>
          
          <button 
            onClick={createProspect}
            className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 text-[9px] uppercase tracking-[0.2em] font-black transition-all italic"
          >
            + Nuevo Prospecto
          </button>
        </div>
      </div>

      <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="BUSCAR CLIENTE..." className="h-12 w-full bg-zinc-950 border border-white/10 px-4 text-[11px] uppercase tracking-widest mb-8 outline-none focus:border-purple-500 transition-all" />

      {/* TABLA */}
      <div className="border border-white/10 bg-zinc-950 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02] text-[9px] uppercase tracking-[0.2em] text-white/30 font-bold italic">
              <th className="px-6 py-4">Asignación</th>
              <th className="px-6 py-4">Cliente / Interés</th>
              <th className="px-6 py-4 text-center">Visita</th>
              <th className="px-6 py-4 text-center">Cotiz.</th>
              <th className="px-6 py-4">Próx. Contacto</th>
              <th className="px-6 py-4">Estatus</th>
              <th className="px-6 py-4">Notas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredProspects.map((p) => {
              const alert = getAlertStatus(p.next_contact_date);
              const temp = TEMP_BADGE[p.temperature ?? ''] ?? { label: '—', dot: 'bg-zinc-800', text: 'text-zinc-500' }
              return (
                <tr key={p.id} className={`group ${alert === 'vencido' ? 'bg-red-500/[0.03]' : alert === 'hoy' ? 'bg-yellow-500/[0.03]' : ''}`}>
                  <td className="px-6 py-5 min-w-[180px]">
                    <select value={p.team_id || ''} onChange={(e) => updateProspect(p.id, { team_id: e.target.value })} className="block w-full bg-transparent text-[9px] uppercase text-white/30 outline-none border-none">
                      <option value="">Equipo...</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <select value={p.assigned_to || ''} onChange={(e) => updateProspect(p.id, { assigned_to: e.target.value })} className="block w-full bg-transparent text-[10px] uppercase text-purple-400 font-bold outline-none border-none">
                      <option value="">Asesor...</option>
                      {advisors.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                    </select>
                  </td>
                  <td className="px-6 py-5 cursor-pointer" onClick={() => setSelectedProspect(p)}>
                    <p className="text-xs uppercase tracking-wider text-white group-hover:text-purple-400 font-medium underline decoration-white/10 underline-offset-4">{p.full_name}</p>
                    <p className="text-[8px] text-white/40 mt-1 uppercase italic tracking-widest">{p.preferred_typology || 'Sin unidad asignada'}</p>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <input type="checkbox" checked={p.visited_site || false} onChange={(e) => updateProspect(p.id, { visited_site: e.target.checked })} className="w-3 h-3 accent-purple-500" />
                  </td>
                  <td className="px-6 py-5 text-center">
                    <input type="checkbox" checked={p.has_quote || false} onChange={(e) => updateProspect(p.id, { has_quote: e.target.checked })} className="w-3 h-3 accent-white" />
                  </td>
                  <td className="px-6 py-5">
                    <input type="date" value={p.next_contact_date || ''} onChange={(e) => updateProspect(p.id, { next_contact_date: e.target.value })} className={`bg-transparent text-[10px] font-mono border-b outline-none ${alert === 'vencido' ? 'border-red-500 text-red-500' : alert === 'hoy' ? 'border-yellow-500 text-yellow-500' : 'border-white/10 text-white/40'}`} />
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${temp.dot}`} />
                      <span className={`text-[9px] uppercase font-bold ${temp.text}`}>{temp.label}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 max-w-xs overflow-hidden">
                    <p className="text-[10px] text-white/30 italic truncate">{p.notes || "..."}</p>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* PANEL LATERAL CON EDICIÓN DE UNIDAD */}
      {selectedProspect && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedProspect(null)} />
          <div className="relative w-full max-w-md bg-zinc-950 border-l border-white/10 h-full p-10 shadow-2xl animate-in slide-in-from-right">
            <button onClick={() => setSelectedProspect(null)} className="absolute top-6 right-6 text-white/20 hover:text-white text-[10px] uppercase tracking-widest border border-white/10 px-3 py-1 font-bold">Cerrar ✕</button>
            <div className="space-y-10 mt-12">
              <header className="border-b border-white/5 pb-8">
                <span className="text-[8px] uppercase tracking-[0.4em] text-purple-500 font-bold italic">Configuración de Interés</span>
                <h2 className="text-4xl font-extralight tracking-tighter uppercase italic text-white mt-2">{selectedProspect.full_name}</h2>
              </header>
              <section className="space-y-8">
                {/* EDICIÓN DE UNIDAD / TIPOLOGÍA */}
                <div>
                  <label className="text-[9px] text-white/20 uppercase tracking-[0.2em] block mb-3 font-bold">Unidad de Interés</label>
                  <input 
                    type="text"
                    value={selectedProspect.preferred_typology || ''}
                    placeholder="Ej: PH-01, Prototipo A..."
                    onChange={(e) => updateProspect(selectedProspect.id, { preferred_typology: e.target.value })}
                    className="w-full bg-white/[0.02] border border-white/10 p-4 text-xs uppercase tracking-widest text-white outline-none focus:border-purple-500 transition-all"
                  />
                </div>
                {/* CONTACTO */}
                <div className="bg-white/[0.02] border border-white/5 p-6 space-y-4">
                  <div>
                    <p className="text-[8px] text-white/30 uppercase tracking-[0.2em] mb-1 font-bold">WhatsApp</p>
                    <p className="text-base font-mono text-white select-all">{selectedProspect.phone || 'No registrado'}</p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
