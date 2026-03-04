'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useParams } from 'next/navigation'

const TEMP_BADGE: Record<string, { label: string; className: string }> = {
  cold:    { label: '🔴 Frío',             className: 'bg-zinc-800 text-zinc-300' },
  warm:    { label: '🟠 Tibio',            className: 'bg-orange-900/40 text-orange-400' },
  medium:  { label: '🟡 Medio',            className: 'bg-yellow-900/40 text-yellow-400' },
  hot:     { label: '🟢 Caliente',         className: 'bg-green-900/40 text-green-400' },
  closing: { label: '⭐ Cierre Inminente', className: 'bg-blue-900/40 text-blue-400' },
}

export default function ProspectDetailPage() {
  const { id } = useParams()
  const [prospect, setProspect] = useState<any>(null)
  const [notes, setNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [temperature, setTemperature] = useState('')

  const supabase = createClient()

  async function loadProspect() {
    const { data } = await supabase
      .from('prospects')
      .select('*, users(full_name), teams(name)')
      .eq('id', id)
      .single()
    setProspect(data)
    setTemperature(data?.temperature ?? 'medium')
    setLoading(false)
  }

  async function loadNotes() {
    const { data } = await supabase
      .from('prospect_notes')
      .select('*, users(full_name)')
      .eq('prospect_id', id)
      .order('created_at', { ascending: false })
    setNotes(data ?? [])
  }

  useEffect(() => {
    loadProspect()
    loadNotes()
  }, [id])

  async function saveNote() {
    if (!noteText.trim()) return
    setSavingNote(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('prospect_notes').insert({
      prospect_id: id,
      author_id: user?.id,
      content: noteText,
    })
    setNoteText('')
    setSavingNote(false)
    loadNotes()
  }

  async function updateTemperature(newTemp: string) {
    setTemperature(newTemp)
    await supabase.from('prospects').update({ temperature: newTemp }).eq('id', id)
  }

  if (loading) return <p className="text-white/40 text-sm p-8">Cargando prospecto...</p>
  if (!prospect) return <p className="text-white/40 text-sm p-8">Prospecto no encontrado.</p>

  const temp = TEMP_BADGE[prospect.temperature ?? ''] ?? { label: prospect.temperature ?? '—', className: 'bg-zinc-800 text-zinc-300' }
  const advisorName = Array.isArray(prospect.users) ? prospect.users[0]?.full_name : prospect.users?.full_name
  const teamName = Array.isArray(prospect.teams) ? prospect.teams[0]?.name : prospect.teams?.name

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/prospects" className="text-white/40 hover:text-white transition">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{prospect.full_name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${temp.className}`}>
              {temp.label}
            </span>
            {advisorName && <span className="text-sm text-white/40">Asesor: {advisorName} {teamName ? `(${teamName})` : ''}</span>}
          </div>
        </div>
      </div>

      {/* Temperatura */}
      <div className="rounded-xl border border-white/10 bg-zinc-950 p-4">
        <p className="text-xs text-white/40 uppercase tracking-widest mb-3">Actualizar temperatura</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(TEMP_BADGE).map(([key, val]) => (
            <button
              key={key}
              onClick={() => updateTemperature(key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all border ${temperature === key ? 'border-white' : 'border-white/10 opacity-50 hover:opacity-80'} ${val.className}`}
            >
              {val.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Columna izquierda */}
        <div className="md:col-span-2 space-y-6">

          {/* Info del prospecto */}
          <div className="rounded-xl border border-white/10 bg-zinc-950">
            <div className="border-b border-white/10 px-6 py-4">
              <h3 className="font-semibold">Información del Prospecto</h3>
            </div>
            <div className="p-6 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-white/40 uppercase">Teléfono</p>
                <p className="font-medium">{prospect.phone ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-white/40 uppercase">Correo</p>
                <p className="font-medium">{prospect.email ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-white/40 uppercase">Origen</p>
                <p className="font-medium">{prospect.source ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-white/40 uppercase">Fecha 1er contacto</p>
                <p className="font-medium">{prospect.first_contact_date ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-white/40 uppercase">Recámaras preferidas</p>
                <p className="font-medium">{prospect.preferred_rooms ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-white/40 uppercase">Rango de precio</p>
                <p className="font-medium">
                  {prospect.price_range_min || prospect.price_range_max
                    ? `$${(prospect.price_range_min ?? 0).toLocaleString('es-MX')} - $${(prospect.price_range_max ?? 0).toLocaleString('es-MX')}`
                    : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Visita y Cotización */}
          <div className="rounded-xl border border-white/10 bg-zinc-950 grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-white/10">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Visita al Desarrollo</h3>
                {prospect.visited && (
                  <span className="inline-flex items-center rounded-full bg-blue-900/40 px-2.5 py-0.5 text-xs font-medium text-blue-400">Realizada</span>
                )}
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-white/40 uppercase">Fecha</p>
                  <p>{prospect.visit_date ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40 uppercase">Observaciones</p>
                  <p className="text-white/60">{prospect.visit_notes ?? '—'}</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Cotización</h3>
                {prospect.has_quote && (
                  <span className="inline-flex items-center rounded-full bg-green-900/40 px-2.5 py-0.5 text-xs font-medium text-green-400">Vigente</span>
                )}
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-white/40 uppercase">Fecha</p>
                  <p>{prospect.quote_date ?? '—'}</p>
                </div>
                <div className="flex gap-6">
                  <div>
                    <p className="text-xs text-white/40 uppercase">Precio lista</p>
                    <p className="line-through text-white/40">
                      {prospect.list_price_at_quote ? `$${prospect.list_price_at_quote.toLocaleString('es-MX')}` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase">Precio ofrecido</p>
                    <p className="font-bold text-green-400">
                      {prospect.offered_price ? `$${prospect.offered_price.toLocaleString('es-MX')}` : '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bitácora */}
        <div className="md:col-span-1 space-y-4">
          <h3 className="text-lg font-bold">Bitácora de Seguimiento</h3>

          <div className="rounded-xl border border-white/10 bg-zinc-950 p-4 space-y-3">
            <label className="text-xs text-white/40 uppercase tracking-widest">Nueva nota (inmutable)</label>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
              placeholder="Escribe los detalles de la interacción..."
            />
            <button
              onClick={saveNote}
              disabled={savingNote}
              className="w-full rounded-lg bg-white text-black py-2 text-sm font-medium hover:bg-white/90 disabled:opacity-50"
            >
              {savingNote ? 'Guardando...' : 'Guardar Nota'}
            </button>
          </div>

          <div className="space-y-4">
            {notes.length === 0 ? (
              <p className="text-white/30 text-sm">Sin notas aún.</p>
            ) : (
              notes.map((note, idx) => (
                <div key={note.id} className="relative pl-6">
                  {idx !== notes.length - 1 && (
                    <span className="absolute left-2 top-4 h-full w-px bg-white/10" />
                  )}
                  <span className="absolute left-0 top-1.5 h-4 w-4 rounded-full bg-zinc-800 border border-white/20 flex items-center justify-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
                  </span>
                  <p className="text-sm text-white/60">{note.content}</p>
                  <p className="text-xs text-white/30 mt-1">
                    {Array.isArray(note.users) ? note.users[0]?.full_name : note.users?.full_name} — {new Date(note.created_at).toLocaleString('es-MX')}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
