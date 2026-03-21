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
  preferred_typology: string | null
  created_at: string
}

const TEMP_OPTIONS = [
  { id: 'cold',    label: 'Frío',     dot: 'bg-zinc-500',   text: 'text-zinc-400' },
  { id: 'warm',    label: 'Tibio',    dot: 'bg-orange-500', text: 'text-orange-400' },
  { id: 'hot',     label: 'Caliente', dot: 'bg-purple-500', text: 'text-purple-400' },
  { id: 'medium',  label: 'Medio',    dot: 'bg-yellow-500', text: 'text-yellow-400' },
  { id: 'closing', label: 'Cierre',   dot: 'bg-white',      text: 'text-white' },
]

const TEMP_MAP: Record<string, any> = TEMP_OPTIONS.reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {});

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [teams, setTeams] = useState<{id: string, name: string}[]>([])
  const [advisors, setAdvisors] = useState<{id: string, full_name: string, team_id: string | null}[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null)
  
  // Filtros
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'urgent' | 'today'>('all')
  const [filterTeam, setFilterTeam] = useState<string>('all')
  const [filterAdvisor, setFilterAdvisor] = useState<string>('all')

  const supabase = createClient()

  async function loadData() {
    // 1. Obtener sesión y perfil del usuario actual
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user?.id).single()
    setCurrentUser(profile)

    // 2. Cargar Teams y Profiles (Asesores)
    const { data: tData } = await supabase.from('teams').select('id, name')
    const { data: uData } = await supabase.from('profiles').select('id, full_name, team_id')
    setTeams(tData ?? [])
    setAdvisors(uData ?? [])

    // 3. Cargar Prospectos con lógica de visibilidad
    let query = supabase.from('prospects').select('*').order('created_at', { ascending: false })
    
    // Si no es admin, filtrar por su equipo
    if (profile?.role !== 'admin') {
      query = query.eq('team_id', profile?.team_id)
    }

    const { data: pData } = await query
    setProspects(pData ?? [])
  }

  useEffect(() => { loadData() }, [])

  const updateProspect = async (id: string, updates: Partial<Prospect>, isNoteUpdate: boolean = false) => {
    let finalUpdates = { ...updates };
    // Regla de Auditoría: Si se editan notas, se actualiza la "Última Gestión"
    if (isNoteUpdate) finalUpdates.last_contact_date = new Date().toISOString();
    
    setProspects(prev => prev.map(p => p.id === id ? { ...p, ...finalUpdates } : p))
    if (selectedProspect?.id === id) setSelectedProspect(prev => prev ? { ...prev, ...finalUpdates } : null)
    
    await supabase.from('prospects').update(finalUpdates).eq('id', id)
  }

  const deleteProspect = async (id: string) => {
    if (!confirm("¿Eliminar este prospecto permanentemente?")) return
    await supabase.from('prospects').delete().eq('id', id)
    setSelectedProspect(null)
    loadData()
  }

  const createProspect = async () => {
    const name = prompt("Nombre completo del prospecto:")
    if (!name) return
    await supabase.from('prospects').insert([{ 
      full_name: name, 
      temperature: 'cold',
      team_id: currentUser?.role !== 'admin' ? currentUser?.team_id : null 
    }])
    loadData()
  }

  const getAlertStatus = (dateStr: string | null) => {
    if (!dateStr) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    const target = new Date(dateStr + 'T00:00:00');
    if (target < today) return 'vencido';
    if (target.getTime() === today.getTime()) return 'hoy';
    return 'futuro';
  };

  const filteredProspects = prospects.filter(p => {
    const matchesSearch = p.full_name.toLowerCase().includes(search.toLowerCase());
    const matchesTeam = filterTeam === 'all' || p.team_id === filterTeam;
    const matchesAdvisor = filterAdvisor === 'all' || p.assigned_to === filterAdvisor;
    const alert = getAlertStatus(p.next_contact_date);
    let matchesTime = true;
    if (filterType === 'urgent') matchesTime = alert === 'vencido';
    if (filterType === 'today') matchesTime = alert === 'hoy';
    return matchesSearch && matchesTeam && matchesAdvisor && matchesTime;
  });

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans selection:bg-purple-500/30">
      
      {/* HEADER DINÁMICO */}
      <div className="flex justify-between items-end border-b border-white/10 pb-8 mb-10">
        <div>
          <h1 className="text-5xl font-extralight tracking-tighter uppercase italic leading-none">Boralba Living</h1>
          <p className="text-[9px] uppercase tracking-[0.5em] text-purple-500 mt-4 font-black italic">
            {currentUser?.role === 'admin' ? 'Panel de Auditoría CEO' : `Equipo: ${teams.find(t => t.id === currentUser?.team_id)?.name}`}
          </p>
        </div>
        <button onClick={createProspect} className="bg-white text-black px-10 py-4 text-[10px] uppercase tracking-[0.3em] font-black italic hover:bg-purple-600 hover:text-white transition-all">
          + Nuevo Registro
        </button>
      </div>

      {/* FILTROS DE AUDITORÍA */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="BUSCAR POR NOMBRE..." className="h-14 bg-zinc-950 border border-white/10 px-6 text-[10px] uppercase tracking-[0.3em] outline-none focus:border-purple-500/40 font-light" />
        
        {currentUser?.role === 'admin' && (
          <>
            <select value={filterTeam} onChange={e => {setFilterTeam(e.target.value); setFilterAdvisor('all');}} className="h-14 bg-zinc-950 border border-white/10 px-4 text-[10px] uppercase text-white/40 outline-none">
              <option value="all">TODOS LOS EQUIPOS</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>

            <select value={filterAdvisor} onChange={e => setFilterAdvisor(e.target.value)} className="h-14 bg-zinc-950 border border-white/10 px-4 text-[10px] uppercase text-purple-400 font-bold outline-none">
              <option value="all">TODOS LOS ASESORES</option>
              {advisors.filter(a => filterTeam === 'all' || a.team_id === filterTeam).map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
            </select>
          </>
        )}

        <div className="flex gap-1 bg-zinc-900 p-1 border border-white/5">
          <button onClick={() => setFilterType('all')} className={`flex-1 text-[8px] uppercase tracking-widest transition-all ${filterType === 'all' ? 'bg-white text-black font-black' : 'text-white/20'}`}>Todos</button>
          <button onClick={() => setFilterType('today')} className={`flex-1 text-[8px] uppercase tracking-widest transition-all ${filterType === 'today' ? 'bg-yellow-500 text-black font-black' : 'text-yellow-500/20'}`}>Hoy</button>
          <button onClick={() => setFilterType('urgent')} className={`flex-1 text-[8px] uppercase tracking-widest transition-all ${filterType === 'urgent' ? 'bg-red-600 text-white font-black' : 'text-red-600/20'}`}>Vencidos</button>
        </div>
      </div>

      {/* TABLA MAESTRA DE AUDITORÍA */}
      <div className="bg-zinc-950 border border-white/10 shadow-2xl overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-white/[0.02] border-b border-white/10 text-[8px] uppercase tracking-[0.2em] text-white/30 font-bold italic">
              <th className="px-6 py-5">Primer C. / Última G.</th>
              <th className="px-6 py-5">Asignación</th>
              <th className="px-6 py-5">Cliente / Interés</th>
              <th className="px-6 py-5 text-center">V / C</th>
              <th className="px-6 py-5">Próx. Contacto</th>
              <th className="px-6 py-5">Temperatura</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredProspects.map((p) => {
              const alert = getAlertStatus(p.next_contact_date);
              const t = TEMP_MAP[p.temperature ?? 'cold'] || TEMP_MAP['cold'];
              const advisorName = advisors.find(ad => ad.id === p.assigned_to)?.full_name || 'Sin Asesor';

              return (
                <tr key={p.id} className="hover:bg-white/[0.01] group transition-all">
                  <td className="px-6 py-6 font-mono text-[9px] space-y-1">
                    <p className="text-white/20">{new Date(p.created_at).toLocaleDateString()}</p>
                    <p className="text-purple-500/50 italic">{p.last_contact_date ? new Date(p.last_contact_date).toLocaleDateString() : '—'}</p>
                  </td>
                  <td className="px-6 py-6">
                    <p className="text-[10px] text-purple-400 font-black uppercase tracking-widest">{advisorName}</p>
                    <p className="text-[8px] text-white/20 uppercase mt-1 italic">{teams.find(tm => tm.id === p.team_id)?.name || '—'}</p>
                  </td>
                  <td className="px-6 py-6 cursor-pointer" onClick={() => setSelectedProspect(p)}>
                    <p className="text-xs font-bold uppercase group-hover:text-purple-400 transition-all underline decoration-white/5 underline-offset-8">{p.full_name}</p>
                    <p className="text-[8px] text-white/30 mt-2 uppercase italic tracking-widest">{p.preferred_typology || 'Unidad no definida'}</p>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex justify-center gap-4">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[7px] text-white/20 uppercase">Visita</span>
                        <input type="checkbox" checked={p.visited_site || false} onChange={e => updateProspect(p.id, { visited_site: e.target.checked })} className="w-3 h-3 accent-purple-600" />
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[7px] text-white/20 uppercase">Cotiz</span>
                        <input type="checkbox" checked={p.has_quote || false} onChange={e => updateProspect(p.id, { has_quote: e.target.checked })} className="w-3 h-3 accent-white" />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <p className={`text-[10px] font-mono ${alert === 'vencido' ? 'text-red-500 font-black' : alert === 'hoy' ? 'text-yellow-500 font-black' : 'text-white/40'}`}>
                      {p.next_contact_date?.split('-').reverse().join('/') || 'No prog.'}
                    </p>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
                      <span className={`text-[9px] font-black uppercase tracking-widest ${t.text}`}>{t.label}</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* EXPEDIENTE MAESTRO (PANEL LATERAL) */}
      {selectedProspect && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-sm" onClick={() => setSelectedProspect(null)} />
          <div className="relative w-full max-w-xl bg-zinc-950 border-l border-white/10 h-full p-12 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-500">
            
            <header className="border-b border-white/5 pb-10 mb-10 flex justify-between items-start">
              <div>
                <span className="text-[9px] uppercase tracking-[0.5em] text-purple-500 font-black italic">Expediente Maestro</span>
                <h2 className="text-5xl font-extralight tracking-tighter uppercase italic text-white mt-4 leading-none">{selectedProspect.full_name}</h2>
              </div>
              <button onClick={() => setSelectedProspect(null)} className="text-white/20 hover:text-white text-[10px] uppercase font-bold border border-white/10 px-4 py-2">Cerrar ✕</button>
            </header>

            <div className="space-y-12">
              
              {/* SECCIÓN ASIGNACIÓN (Lógica Cascada) */}
              <section className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-[8px] text-white/30 uppercase font-black italic">Equipo / Célula</p>
                  <select 
                    disabled={currentUser?.role !== 'admin'}
                    value={selectedProspect.team_id || ''} 
                    onChange={e => updateProspect(selectedProspect.id, { team_id: e.target.value, assigned_to: null })}
                    className="w-full bg-zinc-900 border border-white/10 p-4 text-[10px] uppercase outline-none focus:border-purple-500/50 disabled:opacity-50"
                  >
                    <option value="">Sin Equipo</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <p className="text-[8px] text-white/30 uppercase font-black italic">Asesor Responsable</p>
                  <select 
                    value={selectedProspect.assigned_to || ''} 
                    onChange={e => updateProspect(selectedProspect.id, { assigned_to: e.target.value })}
                    className="w-full bg-zinc-900 border border-white/10 p-4 text-[10px] uppercase text-purple-400 font-black outline-none focus:border-purple-500/50"
                  >
                    <option value="">Seleccionar Asesor</option>
                    {advisors.filter(a => !selectedProspect.team_id || a.team_id === selectedProspect.team_id).map(a => (
                      <option key={a.id} value={a.id}>{a.full_name}</option>
                    ))}
                  </select>
                </div>
              </section>

              {/* DATOS DE CONTACTO */}
              <section className="bg-white/[0.02] p-8 border border-white/5 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-[8px] text-white/30 uppercase font-black mb-2">WhatsApp / Teléfono</p>
                    <input type="text" value={selectedProspect.phone || ''} onChange={e => updateProspect(selectedProspect.id, { phone: e.target.value })} className="bg-transparent border-b border-white/10 w-full text-base font-mono py-2 outline-none focus:border-purple-500" />
                  </div>
                  <div>
                    <p className="text-[8px] text-white/30 uppercase font-black mb-2">Email</p>
                    <input type="email" value={selectedProspect.email || ''} onChange={e => updateProspect(selectedProspect.id, { email: e.target.value })} className="bg-transparent border-b border-white/10 w-full text-sm font-mono py-2 outline-none focus:border-purple-500 lowercase" />
                  </div>
                </div>
                <div>
                  <p className="text-[8px] text-white/30 uppercase font-black mb-2">Unidad de Interés</p>
                  <input type="text" value={selectedProspect.preferred_typology || ''} onChange={e => updateProspect(selectedProspect.id, { preferred_typology: e.target.value })} className="bg-transparent border-b border-white/10 w-full text-xs uppercase tracking-[0.2em] py-2 outline-none focus:border-purple-500" />
                </div>
              </section>

              {/* TEMPERATURA */}
              <div>
                <p className="text-[8px] text-white/30 uppercase font-black mb-4 italic text-center">Estatus Comercial</p>
                <div className="grid grid-cols-5 gap-1">
                  {TEMP_OPTIONS.map((opt) => (
                    <button key={opt.id} onClick={() => updateProspect(selectedProspect.id, { temperature: opt.id })} className={`py-3 border text-[8px] font-black tracking-widest transition-all ${selectedProspect.temperature === opt.id ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-white/20 hover:text-white'}`}>{opt.label}</button>
                  ))}
                </div>
              </div>

              {/* BITÁCORA DETALLADA */}
              <section className="space-y-4">
                <div className="flex justify-between items-end border-b border-white/5 pb-2">
                  <p className="text-[8px] text-white/30 uppercase font-black italic">Bitácora de Seguimiento</p>
                  <div className="flex items-center gap-3">
                    <p className="text-[8px] text-purple-400 uppercase font-black">Próximo:</p>
                    <input type="date" value={selectedProspect.next_contact_date || ''} onChange={e => updateProspect(selectedProspect.id, { next_contact_date: e.target.value })} className="bg-transparent text-[10px] font-mono text-white outline-none" />
                  </div>
                </div>
                <textarea 
                  value={selectedProspect.notes || ''} 
                  onChange={e => updateProspect(selectedProspect.id, { notes: e.target.value }, true)} 
                  placeholder="Ingrese notas detalladas..." 
                  className="w-full bg-black border border-white/5 p-6 h-48 text-[11px] leading-relaxed text-white/60 italic outline-none focus:border-white/10 resize-none shadow-inner" 
                />
                <p className="text-[7px] text-white/10 uppercase text-right">Cualquier cambio en notas actualiza la fecha de auditoría.</p>
              </section>

              {/* ACCIONES CRÍTICAS */}
              <div className="pt-10 flex flex-col gap-4">
                <button onClick={() => window.open(`https://wa.me/${selectedProspect.phone?.replace(/\D/g,'')}`, '_blank')} className="w-full py-6 bg-white text-black text-[10px] uppercase font-black tracking-[0.4em] italic hover:bg-purple-600 hover:text-white transition-all">Lanzar Seguimiento WhatsApp</button>
                <button onClick={() => deleteProspect(selectedProspect.id)} className="py-4 text-[8px] uppercase tracking-[0.3em] text-red-600/40 hover:text-red-600 font-bold border border-red-600/5 hover:border-red-600/20 transition-all">Eliminar Prospecto</button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
