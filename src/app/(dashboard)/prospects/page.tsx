'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Prospect = {
  id: string
  full_name: string
  phone: string | null
  email: string | null
  temperature: string | null
  created_at: string
  first_contact_date: string | null
  last_contact_date: string | null
  notes: string | null
  users: any
}

const TEMP_BADGE: Record<string, { label: string; dot: string; text: string }> = {
  cold:    { label: 'Frío',            dot: 'bg-zinc-500',   text: 'text-zinc-400' },
  warm:    { label: 'Tibio',           dot: 'bg-orange-500', text: 'text-orange-400' },
  medium:  { label: 'Medio',           dot: 'bg-yellow-500', text: 'text-yellow-400' },
  hot:     { label: 'Caliente',        dot: 'bg-purple-500', text: 'text-purple-400' },
  closing: { label: 'Cierre Inminente', dot: 'bg-white',      text: 'text-white' },
}

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [filtered, setFiltered] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tempFilter, setTempFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)

  // Estados para Edición Rápida de Notas
  const [editingId, setEditingId] = useState<string | null>(null)
  const [tempNote, setTempNote] = useState('')

  // Campos para Nuevo Prospecto
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [source, setSource] = useState('')
  const [temperature, setTemperature] = useState('medium')
  const [notes, setNotes] = useState('')

  const supabase = createClient()

  async function loadProspects() {
    setLoading(true)
    const { data } = await supabase
      .from('prospects')
      .select('id, full_name, phone, email, temperature, created_at, first_contact_date, last_contact_date, notes')
      .order('created_at', { ascending: false })
    setProspects((data as any) ?? [])
    setFiltered((data as any) ?? [])
    setLoading(false)
  }

  useEffect(() => { loadProspects() }, [])

  useEffect(() => {
    let result = prospects
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(p =>
        p.full_name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.phone?.includes(q) ||
        p.notes?.toLowerCase().includes(q)
      )
    }
    if (tempFilter) {
      result = result.filter(p => p.temperature === tempFilter)
    }
    setFiltered(result)
  }, [search, tempFilter, prospects])

  async function saveQuickNote(id: string) {
    await supabase.from('prospects').update({ 
      notes: tempNote,
      last_contact_date: new Date().toISOString() 
    }).eq('id', id)
    setEditingId(null)
    loadProspects()
  }

  function openNew() {
    setFullName(''); setPhone(''); setEmail(''); setSource(''); setTemperature('medium'); setNotes('');
    setShowModal(true)
  }

  async function saveProspect() {
    if (!fullName.trim()) return
    setSaving(true)
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('prospects').insert({
      full_name: fullName, phone, email, source, temperature, notes,
      first_contact_date: today,
    })
    setSaving(false); setShowModal(false); loadProspects()
  }

  return (
    <div className="space-y-8 bg-black text-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-8">
        <div>
          <h1 className="text-4xl font-extralight tracking-tighter uppercase">Prospectos</h1>
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mt-2">Gestión de Situaciones en Tiempo Real</p>
        </div>
        <button onClick={openNew} className="h-10 border border-white/20 bg-white text-black px-6 text-[10px] uppercase tracking-widest font-bold hover:bg-zinc-200 transition-all">
          + Agregar Registro
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-px bg-white/10 border border-white/10">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="FILTRAR POR CLIENTE O SITUACIÓN..." className="h-12 flex-1 bg-zinc-950 px-4 text-[11px] uppercase tracking-widest text-white placeholder:text-white/20 focus:outline-none" />
        <select value={tempFilter} onChange={e => setTempFilter(e.target.value)} className="h-12 bg-zinc-950 px-4 text-[11px] uppercase tracking-widest text-white/60 focus:outline-none border-l border-white/10">
          <option value="">TEMPERATURA</option>
          <option value="cold">FRÍO</option><option value="warm">TIBIO</option><option value="medium">MEDIO</option><option value="hot">CALIENTE</option><option value="closing">CIERRE</option>
        </select>
      </div>

      {/* Table */}
      <div className="border border-white/10 bg-zinc-950 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              <th className="px-6 py-4 text-[9px] uppercase tracking-[0.2em] text-white/30 font-bold">Registro / 1º</th>
              <th className="px-6 py-4 text-[9px] uppercase tracking-[0.2em] text-white/30 font-bold">Últ. Contacto</th>
              <th className="px-6 py-4 text-[9px] uppercase tracking-[0.2em] text-white/30 font-bold">Cliente</th>
              <th className="px-6 py-4 text-[9px] uppercase tracking-[0.2em] text-white/30 font-bold">Estatus</th>
              <th className="px-6 py-4 text-[9px] uppercase tracking-[0.2em] text-white/30 font-bold">Situación (Clic para editar)</th>
              <th className="px-6 py-4 text-right text-[9px] uppercase tracking-[0.2em] text-white/30 font-bold">Perfil</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((p) => {
              const temp = TEMP_BADGE[p.temperature ?? ''] ?? { label: '—', dot: 'bg-zinc-800', text: 'text-zinc-500' }
              return (
                <tr key={p.id} className="group hover:bg-white/[0.01] transition-all">
                  <td className="px-6 py-5 text-[10px] font-mono text-purple-400">
                    {p.first_contact_date ? new Date(p.first_contact_date).toLocaleDateString('es-MX') : '—'}
                  </td>
                  <td className="px-6 py-5 text-[10px] font-mono text-white/40">
                    {p.last_contact_date ? new Date(p.last_contact_date).toLocaleDateString('es-MX') : '—'}
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-xs uppercase tracking-wider font-light text-white">{p.full_name}</p>
                    <p className="text-[9px] text-white/20 mt-0.5">{p.phone || 'Sin tel.'}</p>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${temp.dot}`} />
                      <span className={`text-[9px] uppercase tracking-[0.15em] font-bold ${temp.text}`}>{temp.label}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 max-w-sm">
                    {editingId === p.id ? (
                      <div className="flex gap-2">
                        <input autoFocus value={tempNote} onChange={e => setTempNote(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveQuickNote(p.id)} className="bg-black border border-white/20 px-2 py-1 text-[10px] text-white w-full focus:outline-none focus:border-purple-500" />
                        <button onClick={() => saveQuickNote(p.id)} className="text-[10px] text-purple-400 uppercase font-bold">Guardar</button>
                      </div>
                    ) : (
                      <p onClick={() => { setEditingId(p.id); setTempNote(p.notes || '') }} className="text-[10px] leading-relaxed text-white/40 line-clamp-2 italic cursor-pointer hover:text-white transition-colors">
                        {p.notes || "Haga clic para añadir nota..."}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <Link href={`/prospects/${p.id}`} className="text-[9px] uppercase tracking-[0.2em] text-white/20 group-hover:text-purple-400 transition-colors">Gestionar →</Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Nuevo Prospecto */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg border border-white/10 bg-zinc-950 p-8 space-y-6">
            <h2 className="text-xl font-extralight uppercase tracking-widest border-b border-white/5 pb-4 text-white">Nuevo Prospecto</h2>
            <div className="space-y-4">
              <div><label className="text-[9px] text-white/30 uppercase tracking-[0.2em]">Nombre completo</label><input value={fullName} onChange={e => setFullName(e.target.value)} className="mt-2 w-full border-b border-white/10 bg-transparent py-2 text-sm text-white focus:outline-none focus:border-white transition-all" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[9px] text-white/30 uppercase tracking-[0.2em]">Teléfono</label><input value={phone} onChange={e => setPhone(e.target.value)} className="mt-2 w-full border-b border-white/10 bg-transparent py-2 text-sm text-white focus:outline-none focus:border-white" /></div>
                <div><label className="text-[9px] text-white/30 uppercase tracking-[0.2em]">Temperatura</label><select value={temperature} onChange={e => setTemperature(e.target.value)} className="mt-2 w-full border-b border-white/10 bg-transparent py-2 text-sm text-white/60 focus:outline-none"><option value="cold">Frío</option><option value="warm">Tibio</option><option value="medium">Medio</option><option value="hot">Caliente</option><option value="closing">Cierre</option></select></div>
              </div>
              <div><label className="text-[9px] text-white/30 uppercase tracking-[0.2em]">Situación Inicial</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="mt-2 w-full border border-white/10 bg-black p-3 text-sm text-white focus:outline-none focus:border-white/30 resize-none" placeholder="Interés en..." /></div>
            </div>
            <div className="flex gap-4 pt-4">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 text-[10px] uppercase tracking-widest text-white/30 hover:text-white">Cancelar</button>
              <button onClick={saveProspect} disabled={saving} className="flex-1 py-3 bg-white text-black text-[10px] uppercase tracking-widest font-bold hover:bg-purple-600 hover:text-white transition-all">{saving ? '...' : 'Confirmar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
