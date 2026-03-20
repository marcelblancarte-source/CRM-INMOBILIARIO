'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Prospect = {
  id: string
  full_name: string
  phone: string | null
  email: string | null
  temperature: string | null
  first_contact_date: string | null
  last_contact_date: string | null
  preferred_typology: string | null
  notes: string | null
  assigned_to: string | null
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
  const [users, setUsers] = useState<{id: string, email: string}[]>([])
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [tempNote, setTempNote] = useState('')

  const supabase = createClient()

  async function loadInitialData() {
    setLoading(true)
    // 1. Cargar Prospectos
    const { data: pData } = await supabase.from('prospects').select('*').order('created_at', { ascending: false })
    setProspects((pData as any) ?? [])
    
    // 2. Cargar Asesores (Usuarios) - Ajusta según tu tabla de perfiles si tienes una
    const { data: uData } = await supabase.from('profiles').select('id, full_name').limit(50)
    setUsers((uData as any) ?? [])
    
    setLoading(false)
  }

  useEffect(() => { loadInitialData() }, [])

  async function updateProspect(id: string, updates: Partial<Prospect>) {
    const { error } = await supabase.from('prospects').update(updates).eq('id', id)
    if (!error) loadInitialData()
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' })
  }

  return (
    <div className="relative min-h-screen bg-black text-white p-8">
      {/* Header */}
      <div className="flex justify-between items-end border-b border-white/10 pb-8 mb-8">
        <div>
          <h1 className="text-4xl font-extralight tracking-tighter uppercase italic">Control Comercial</h1>
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mt-2 font-bold italic">Boralba Living</p>
        </div>
      </div>

      {/* Buscador */}
      <input 
        type="text" 
        value={search} 
        onChange={e => setSearch(e.target.value)} 
        placeholder="BUSCAR CLIENTE..." 
        className="h-12 w-full bg-zinc-950 border border-white/10 px-4 text-[11px] uppercase tracking-widest mb-8 outline-none focus:border-purple-500 transition-all" 
      />

      {/* Tabla */}
      <div className="border border-white/10 bg-zinc-950 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02] text-[9px] uppercase tracking-[0.2em] text-white/30 font-bold italic">
              <th className="px-6 py-4">Asesor</th>
              <th className="px-6 py-4">Cliente (Click p/ Detalle)</th>
              <th className="px-6 py-4">Estatus</th>
              <th className="px-6 py-4">Últ. Gestión</th>
              <th className="px-6 py-4">Notas Rápidas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {prospects.filter(p => p.full_name.toLowerCase().includes(search.toLowerCase())).map((p) => {
              const temp = TEMP_BADGE[p.temperature ?? ''] ?? { label: '—', dot: 'bg-zinc-800', text: 'text-zinc-500' }
              return (
                <tr key={p.id} className="group hover:bg-white/[0.01]">
                  {/* Selector de Asesor */}
                  <td className="px-6 py-5">
                    <select 
                      value={p.assigned_to || ''} 
                      onChange={(e) => updateProspect(p.id, { assigned_to: e.target.value })}
                      className="bg-transparent text-[10px] uppercase text-purple-400 outline-none border-none cursor-pointer"
                    >
                      <option value="">Sin Asignar</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.email}</option>)}
                    </select>
                  </td>

                  {/* Nombre con Trigger de Ficha */}
                  <td className="px-6 py-5 cursor-pointer" onClick={() => setSelectedProspect(p)}>
                    <p className="text-xs uppercase tracking-wider font-light text-white group-hover:text-purple-400 transition-colors underline decoration-white/10 underline-offset-4">
                      {p.full_name}
                    </p>
                  </td>

                  <td className="px-6 py-5 text-[9px] uppercase font-bold">
                    <span className={`flex items-center gap-2 ${temp.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${temp.dot}`} />
                      {temp.label}
                    </span>
                  </td>

                  <td className="px-6 py-5 text-[10px] font-mono text-white/40">{formatDate(p.last_contact_date)}</td>

                  {/* Nota rápida */}
                  <td className="px-6 py-5 max-w-xs">
                    {editingId === p.id ? (
                      <input 
                        autoFocus 
                        value={tempNote} 
                        onChange={e => setTempNote(e.target.value)} 
                        onBlur={() => { updateProspect(p.id, { notes: tempNote, last_contact_date: new Date().toISOString() }); setEditingId(null); }}
                        className="bg-zinc-900 border border-purple-500 px-2 py-1 text-[10px] text-white w-full outline-none" 
                      />
                    ) : (
                      <p onClick={() => { setEditingId(p.id); setTempNote(p.notes || '') }} className="text-[10px] text-white/30 italic cursor-pointer truncate">
                        {p.notes || "Añadir nota..."}
                      </p>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* PANEL LATERAL: DETALLES DEL PROSPECTO */}
      {selectedProspect && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedProspect(null)} />
          <div className="relative w-full max-w-md bg-zinc-950 border-l border-white/10 h-full p-10 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
            <button onClick={() => setSelectedProspect(null)} className="absolute top-6 right-6 text-white/20 hover:text-white text-xs uppercase tracking-widest">Cerrar ✕</button>
            
            <div className="space-y-8 mt-10">
              <header className="border-b border-white/5 pb-6">
                <span className="text-[8px] uppercase tracking-[0.3em] text-purple-500 font-bold">Ficha de Cliente</span>
                <h2 className="text-3xl font-extralight tracking-tighter uppercase italic text-white mt-1">{selectedProspect.full_name}</h2>
              </header>

              <section className="space-y-6">
                <div>
                  <label className="text-[9px] text-white/20 uppercase tracking-[0.2em] block mb-2 font-bold">Datos de Contacto</label>
                  <div className="bg-white/[0.02] border border-white/5 p-4 space-y-4">
                    <div>
                      <p className="text-[8px] text-white/30 uppercase">WhatsApp / Tel</p>
                      <p className="text-sm font-mono text-white mt-1">{selectedProspect.phone || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[8px] text-white/30 uppercase">Correo Electrónico</p>
                      <p className="text-sm font-mono text-white mt-1 lowercase">{selectedProspect.email || '—'}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] text-white/20 uppercase tracking-[0.2em] block mb-2 font-bold">Unidad de Interés</label>
                    <p className="text-[11px] uppercase text-white border border-white/10 p-3 italic">{selectedProspect.preferred_typology || 'GENERAL'}</p>
                  </div>
                  <div>
                    <label className="text-[9px] text-white/20 uppercase tracking-[0.2em] block mb-2 font-bold">1er Contacto</label>
                    <p className="text-[11px] font-mono text-purple-400 border border-white/10 p-3">{formatDate(selectedProspect.first_contact_date)}</p>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] text-white/20 uppercase tracking-[0.2em] block mb-2 font-bold">Historial de Situación</label>
                  <div className="bg-black border border-white/5 p-4 min-h-[100px]">
                    <p className="text-[11px] leading-relaxed text-white/50 italic whitespace-pre-wrap">{selectedProspect.notes || 'Sin anotaciones previas.'}</p>
                  </div>
                </div>
              </section>

              <div className="pt-10">
                <button className="w-full py-4 border border-white/10 text-[10px] uppercase tracking-widest hover:bg-white hover:text-black transition-all font-bold">
                  Editar Datos Completos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
