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
  const [units, setUnits] = useState<any[]>([])
  const [schemes, setSchemes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [temperature, setTemperature] = useState('')

  // Modales
  const [showVisitModal, setShowVisitModal] = useState(false)
  const [showQuoteModal, setShowQuoteModal] = useState(false)
  const [showPrefsModal, setShowPrefsModal] = useState(false)
  const [saving, setSaving] = useState(false)

  // Visita
  const [visited, setVisited] = useState(false)
  const [visitDate, setVisitDate] = useState('')
  const [visitNotes, setVisitNotes] = useState('')

  // Cotización
  const [hasQuote, setHasQuote] = useState(false)
  const [quoteDate, setQuoteDate] = useState('')
  const [quotedUnitId, setQuotedUnitId] = useState('')
  const [offeredPrice, setOfferedPrice] = useState('')
  const [paymentSchemeId, setPaymentSchemeId] = useState('')
  const [selectedUnitPrice, setSelectedUnitPrice] = useState<number | null>(null)

  // Preferencias
  const [preferredRooms, setPreferredRooms] = useState('')
  const [priceRangeMin, setPriceRangeMin] = useState('')
  const [priceRangeMax, setPriceRangeMax] = useState('')
  const [preferredTypology, setPreferredTypology] = useState('')

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

  async function loadUnitsAndSchemes() {
    const [{ data: unitsData }, { data: schemesData }] = await Promise.all([
      supabase.from('units').select('id, unit_number, tower, floor, list_price').eq('status', 'available').order('unit_number'),
      supabase.from('payment_schemes').select('id, name').order('name'),
    ])
    setUnits(unitsData ?? [])
    setSchemes(schemesData ?? [])
  }

  useEffect(() => {
    loadProspect()
    loadNotes()
    loadUnitsAndSchemes()
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

  function openVisitModal() {
    setVisited(prospect?.visited ?? false)
    setVisitDate(prospect?.visit_date ?? '')
    setVisitNotes(prospect?.visit_notes ?? '')
    setShowVisitModal(true)
  }

  function openQuoteModal() {
    setHasQuote(prospect?.has_quote ?? false)
    setQuoteDate(prospect?.quote_date ?? '')
    setQuotedUnitId(prospect?.quoted_unit_id ?? '')
    setOfferedPrice(prospect?.offered_price?.toString() ?? '')
    setPaymentSchemeId(prospect?.payment_scheme_id ?? '')
    setSelectedUnitPrice(prospect?.list_price_at_quote ?? null)
    setShowQuoteModal(true)
  }

  function openPrefsModal() {
    setPreferredRooms(prospect?.preferred_rooms?.toString() ?? '')
    setPriceRangeMin(prospect?.price_range_min?.toString() ?? '')
    setPriceRangeMax(prospect?.price_range_max?.toString() ?? '')
    setPreferredTypology(prospect?.preferred_typology ?? '')
    setShowPrefsModal(true)
  }

  async function saveVisit() {
    setSaving(true)
    await supabase.from('prospects').update({
      visited,
      visit_date: visitDate || null,
      visit_notes: visitNotes || null,
    }).eq('id', id)
    setSaving(false)
    setShowVisitModal(false)
    loadProspect()
  }

  async function saveQuote() {
    setSaving(true)
    const unit = units.find(u => u.id === quotedUnitId)
    await supabase.from('prospects').update({
      has_quote: hasQuote,
      quote_date: quoteDate || null,
      quoted_unit_id: quotedUnitId || null,
      list_price_at_quote: unit?.list_price ?? null,
      offered_price: offeredPrice ? parseFloat(offeredPrice) : null,
      payment_scheme_id: paymentSchemeId || null,
    }).eq('id', id)
    setSaving(false)
    setShowQuoteModal(false)
    loadProspect()
  }

  async function savePrefs() {
    setSaving(true)
    await supabase.from('prospects').update({
      preferred_rooms: preferredRooms ? parseInt(preferredRooms) : null,
      price_range_min: priceRangeMin ? parseFloat(priceRangeMin) : null,
      price_range_max: priceRangeMax ? parseFloat(priceRangeMax) : null,
      preferred_typology: preferredTypology || null,
    }).eq('id', id)
    setSaving(false)
    setShowPrefsModal(false)
    loadProspect()
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
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${temp.className}`}>{temp.label}</span>
            {advisorName && <span className="text-sm text-white/40">Asesor: {advisorName} {teamName ? `(${teamName})` : ''}</span>}
          </div>
        </div>
      </div>

      {/* Temperatura */}
      <div className="rounded-xl border border-white/10 bg-zinc-950 p-4">
        <p className="text-xs text-white/40 uppercase tracking-widest mb-3">Actualizar temperatura</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(TEMP_BADGE).map(([key, val]) => (
            <button key={key} onClick={() => updateTemperature(key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all border ${temperature === key ? 'border-white' : 'border-white/10 opacity-50 hover:opacity-80'} ${val.className}`}>
              {val.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">

          {/* Info del prospecto */}
          <div className="rounded-xl border border-white/10 bg-zinc-950">
            <div className="border-b border-white/10 px-6 py-4">
              <h3 className="font-semibold">Información del Prospecto</h3>
            </div>
            <div className="p-6 grid gap-4 sm:grid-cols-2">
              <div><p className="text-xs text-white/40 uppercase">Teléfono</p><p className="font-medium">{prospect.phone ?? '—'}</p></div>
              <div><p className="text-xs text-white/40 uppercase">Correo</p><p className="font-medium">{prospect.email ?? '—'}</p></div>
              <div><p className="text-xs text-white/40 uppercase">Origen</p><p className="font-medium">{prospect.source ?? '—'}</p></div>
              <div><p className="text-xs text-white/40 uppercase">Fecha 1er contacto</p><p className="font-medium">{prospect.first_contact_date ?? '—'}</p></div>
            </div>
          </div>

          {/* Visita */}
          <div className="rounded-xl border border-white/10 bg-zinc-950">
            <div className="border-b border-white/10 px-6 py-4 flex justify-between items-center">
              <h3 className="font-semibold">Visita al Desarrollo</h3>
              <button onClick={openVisitModal} className="text-xs text-white/40 hover:text-white transition-all">Editar</button>
            </div>
            <div className="p-6 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-white/40 uppercase">¿Visitó?</p>
                <p className="font-medium">{prospect.visited ? '✅ Sí' : '❌ No'}</p>
              </div>
              <div>
                <p className="text-xs text-white/40 uppercase">Fecha</p>
                <p className="font-medium">{prospect.visit_date ?? '—'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-white/40 uppercase">Observaciones</p>
                <p className="font-medium text-white/60">{prospect.visit_notes ?? '—'}</p>
              </div>
            </div>
          </div>

          {/* Cotización */}
          <div className="rounded-xl border border-white/10 bg-zinc-950">
            <div className="border-b border-white/10 px-6 py-4 flex justify-between items-center">
              <h3 className="font-semibold">Cotización</h3>
              <button onClick={openQuoteModal} className="text-xs text-white/40 hover:text-white transition-all">Editar</button>
            </div>
            <div className="p-6 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-white/40 uppercase">¿Tiene cotización?</p>
                <p className="font-medium">{prospect.has_quote ? '✅ Sí' : '❌ No'}</p>
              </div>
              <div>
                <p className="text-xs text-white/40 uppercase">Fecha</p>
                <p className="font-medium">{prospect.quote_date ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-white/40 uppercase">Precio lista</p>
                <p className="font-medium line-through text-white/40">{prospect.list_price_at_quote ? `$${prospect.list_price_at_quote.toLocaleString('es-MX')}` : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-white/40 uppercase">Precio ofrecido</p>
                <p className="font-bold text-green-400">{prospect.offered_price ? `$${prospect.offered_price.toLocaleString('es-MX')}` : '—'}</p>
              </div>
            </div>
          </div>

          {/* Preferencias */}
          <div className="rounded-xl border border-white/10 bg-zinc-950">
            <div className="border-b border-white/10 px-6 py-4 flex justify-between items-center">
              <h3 className="font-semibold">Preferencias</h3>
              <button onClick={openPrefsModal} className="text-xs text-white/40 hover:text-white transition-all">Editar</button>
            </div>
            <div className="p-6 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-white/40 uppercase">Tipología</p>
                <p className="font-medium">{prospect.preferred_typology ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-white/40 uppercase">Recámaras</p>
                <p className="font-medium">{prospect.preferred_rooms ?? '—'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-white/40 uppercase">Rango de precio</p>
                <p className="font-medium">
                  {prospect.price_range_min || prospect.price_range_max
                    ? `$${(prospect.price_range_min ?? 0).toLocaleString('es-MX')} — $${(prospect.price_range_max ?? 0).toLocaleString('es-MX')}`
                    : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bitácora */}
        <div className="md:col-span-1 space-y-4">
          <h3 className="text-lg font-bold">Bitácora de Seguimiento</h3>
          <div className="rounded-xl border border-white/10 bg-zinc-950 p-4 space-y-3">
            <label className="text-xs text-white/40 uppercase tracking-widest">Nueva nota (inmutable)</label>
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={3}
              className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
              placeholder="Escribe los detalles de la interacción..." />
            <button onClick={saveNote} disabled={savingNote}
              className="w-full rounded-lg bg-white text-black py-2 text-sm font-medium hover:bg-white/90 disabled:opacity-50">
              {savingNote ? 'Guardando...' : 'Guardar Nota'}
            </button>
          </div>
          <div className="space-y-4">
            {notes.length === 0 ? (
              <p className="text-white/30 text-sm">Sin notas aún.</p>
            ) : (
              notes.map((note, idx) => (
                <div key={note.id} className="relative pl-6">
                  {idx !== notes.length - 1 && <span className="absolute left-2 top-4 h-full w-px bg-white/10" />}
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

      {/* Modal Visita */}
      {showVisitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-zinc-950 p-6 space-y-4">
            <h2 className="text-lg font-bold">Editar Visita</h2>
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={visited} onChange={e => setVisited(e.target.checked)} className="h-4 w-4" />
              <label className="text-sm text-white">¿Ya visitó el desarrollo?</label>
            </div>
            {visited && (
              <>
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-widest">Fecha de visita</label>
                  <input value={visitDate} onChange={e => setVisitDate(e.target.value)} type="date"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30" />
                </div>
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-widest">Observaciones</label>
                  <textarea value={visitNotes} onChange={e => setVisitNotes(e.target.value)} rows={3}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                    placeholder="¿Qué le gustó? ¿Qué preguntas hizo?" />
                </div>
              </>
            )}
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowVisitModal(false)} className="px-4 py-2 text-sm text-white/50 hover:text-white">Cancelar</button>
              <button onClick={saveVisit} disabled={saving}
                className="px-4 py-2 text-sm bg-white text-black rounded-lg hover:bg-white/90 disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cotización */}
      {showQuoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 overflow-y-auto py-8">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-zinc-950 p-6 space-y-4">
            <h2 className="text-lg font-bold">Editar Cotización</h2>
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={hasQuote} onChange={e => setHasQuote(e.target.checked)} className="h-4 w-4" />
              <label className="text-sm text-white">¿Cuenta con cotización?</label>
            </div>
            {hasQuote && (
              <>
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-widest">Fecha de cotización</label>
                  <input value={quoteDate} onChange={e => setQuoteDate(e.target.value)} type="date"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30" />
                </div>
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-widest">Unidad cotizada</label>
                  <select value={quotedUnitId} onChange={e => {
                    setQuotedUnitId(e.target.value)
                    const unit = units.find(u => u.id === e.target.value)
                    setSelectedUnitPrice(unit?.list_price ?? null)
                    setOfferedPrice(unit?.list_price?.toString() ?? '')
                  }}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30">
                    <option value="">Seleccionar unidad</option>
                    {units.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.tower ? `${u.tower} - ` : ''}{u.unit_number} {u.floor ? `(Piso ${u.floor})` : ''} — ${u.list_price?.toLocaleString('es-MX')}
                      </option>
                    ))}
                  </select>
                  {selectedUnitPrice && (
                    <p className="text-xs text-white/40 mt-1">Precio lista: ${selectedUnitPrice.toLocaleString('es-MX')}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-widest">Precio ofrecido</label>
                  <input value={offeredPrice} onChange={e => setOfferedPrice(e.target.value)} type="number"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                    placeholder="Precio negociado con el cliente" />
                  {selectedUnitPrice && offeredPrice && (
                    <p className="text-xs text-white/40 mt-1">
                      Descuento: {(((selectedUnitPrice - parseFloat(offeredPrice)) / selectedUnitPrice) * 100).toFixed(1)}%
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-widest">Esquema de pago</label>
                  <select value={paymentSchemeId} onChange={e => setPaymentSchemeId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30">
                    <option value="">Seleccionar esquema</option>
                    {schemes.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowQuoteModal(false)} className="px-4 py-2 text-sm text-white/50 hover:text-white">Cancelar</button>
              <button onClick={saveQuote} disabled={saving}
                className="px-4 py-2 text-sm bg-white text-black rounded-lg hover:bg-white/90 disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Preferencias */}
      {showPrefsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-zinc-950 p-6 space-y-4">
            <h2 className="text-lg font-bold">Editar Preferencias</h2>
            <div>
              <label className="text-xs text-white/40 uppercase tracking-widest">Tipología preferida</label>
              <select value={preferredTypology} onChange={e => setPreferredTypology(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30">
                <option value="">Seleccionar</option>
                <option value="Estudio">Estudio</option>
                <option value="1 Recámara">1 Recámara</option>
                <option value="2 Recámaras">2 Recámaras</option>
                <option value="3 Recámaras">3 Recámaras</option>
                <option value="Penthouse">Penthouse</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-white/40 uppercase tracking-widest">Recámaras preferidas</label>
              <input value={preferredRooms} onChange={e => setPreferredRooms(e.target.value)} type="number"
                className="mt-1 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                placeholder="2" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/40 uppercase tracking-widest">Precio mín.</label>
                <input value={priceRangeMin} onChange={e => setPriceRangeMin(e.target.value)} type="number"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                  placeholder="2000000" />
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-widest">Precio máx.</label>
                <input value={priceRangeMax} onChange={e => setPriceRangeMax(e.target.value)} type="number"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                  placeholder="3500000" />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowPrefsModal(false)} className="px-4 py-2 text-sm text-white/50 hover:text-white">Cancelar</button>
              <button onClick={savePrefs} disabled={saving}
                className="px-4 py-2 text-sm bg-white text-black rounded-lg hover:bg-white/90 disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
