'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type PaymentScheme = {
  id: string
  name: string
  type: string | null
  down_payment_pct: number | null
  monthly_payments: number | null
  term_months: number | null
  conditions: string | null
  notes: string | null
}

export default function PaymentSchemasPage() {
  const [schemes, setSchemes] = useState<PaymentScheme[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingScheme, setEditingScheme] = useState<PaymentScheme | null>(null)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const [downPaymentPct, setDownPaymentPct] = useState('')
  const [termMonths, setTermMonths] = useState('')
  const [conditions, setConditions] = useState('')
  const [notes, setNotes] = useState('')

  const supabase = createClient()

  async function loadSchemes() {
    setLoading(true)
    const { data } = await supabase
      .from('payment_schemes')
      .select('*')
      .order('created_at')
    setSchemes(data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadSchemes() }, [])

  function openNew() {
    setEditingScheme(null)
    setName('')
    setType('')
    setDownPaymentPct('')
    setTermMonths('')
    setConditions('')
    setNotes('')
    setShowModal(true)
  }

  function openEdit(scheme: PaymentScheme) {
    setEditingScheme(scheme)
    setName(scheme.name)
    setType(scheme.type ?? '')
    setDownPaymentPct(scheme.down_payment_pct?.toString() ?? '')
    setTermMonths(scheme.term_months?.toString() ?? '')
    setConditions(scheme.conditions ?? '')
    setNotes(scheme.notes ?? '')
    setShowModal(true)
  }

  async function saveScheme() {
    if (!name.trim()) return
    setSaving(true)
    const payload = {
      name,
      type: type || null,
      down_payment_pct: downPaymentPct ? parseFloat(downPaymentPct) : null,
      term_months: termMonths ? parseInt(termMonths) : null,
      conditions: conditions || null,
      notes: notes || null,
    }
    if (editingScheme) {
      await supabase.from('payment_schemes').update(payload).eq('id', editingScheme.id)
    } else {
      await supabase.from('payment_schemes').insert(payload)
    }
    setSaving(false)
    setShowModal(false)
    loadSchemes()
  }

  async function deleteScheme(id: string) {
    if (!confirm('¿Eliminar este esquema?')) return
    await supabase.from('payment_schemes').delete().eq('id', id)
    loadSchemes()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Políticas de Pago</h1>
          <p className="text-sm text-white/40 mt-1">Administra los esquemas disponibles para los prospectos.</p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-lg bg-white text-black px-4 py-2 text-sm font-medium hover:bg-white/90 transition-all"
        >
          <span className="text-lg leading-none">+</span> Nuevo Esquema
        </button>
      </div>

      {loading ? (
        <p className="text-white/40 text-sm">Cargando esquemas...</p>
      ) : schemes.length === 0 ? (
        <div className="rounded-xl border border-white/10 p-12 text-center">
          <p className="text-white/40 text-sm">No hay esquemas registrados.</p>
          <button onClick={openNew} className="mt-4 text-sm text-white underline">Crear el primero</button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {schemes.map((scheme) => (
            <div key={scheme.id} className="rounded-xl border border-white/10 bg-zinc-950 p-6 flex flex-col">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-white">{scheme.name}</h3>
                {scheme.type && <p className="mt-1 text-xs text-white/40 uppercase tracking-widest">{scheme.type}</p>}
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-sm text-white/40">Enganche mín.</span>
                  <span className="text-sm font-medium">{scheme.down_payment_pct != null ? `${scheme.down_payment_pct}%` : '—'}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-sm text-white/40">Plazo</span>
                  <span className="text-sm font-medium">{scheme.term_months ? `${scheme.term_months} meses` : '—'}</span>
                </div>
                {scheme.conditions && (
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Condiciones</p>
                    <p className="text-sm text-white/60 bg-white/5 p-2 rounded-lg">{scheme.conditions}</p>
                  </div>
                )}
                {scheme.notes && (
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Notas</p>
                    <p className="text-sm text-white/60 bg-white/5 p-2 rounded-lg">{scheme.notes}</p>
                  </div>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-white/10 flex justify-end gap-3">
                <button onClick={() => openEdit(scheme)} className="text-xs text-white/40 hover:text-white transition-all">Editar</button>
                <button onClick={() => deleteScheme(scheme.id)} className="text-xs text-red-500 hover:text-red-400">Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 overflow-y-auto py-8">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-zinc-950 p-6 space-y-4">
            <h2 className="text-lg font-bold">{editingScheme ? 'Editar Esquema' : 'Nuevo Esquema'}</h2>

            <div>
              <label className="text-xs text-white/40 uppercase tracking-widest">Nombre *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                placeholder="Ej. Financiamiento Directo" />
            </div>

            <div>
              <label className="text-xs text-white/40 uppercase tracking-widest">Tipo</label>
              <select value={type} onChange={e => setType(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30">
                <option value="">Seleccionar tipo</option>
                <option value="Contado">Contado</option>
                <option value="Crédito hipotecario">Crédito hipotecario</option>
                <option value="Financiamiento directo">Financiamiento directo</option>
                <option value="Mixto">Mixto</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/40 uppercase tracking-widest">Enganche %</label>
                <input value={downPaymentPct} onChange={e => setDownPaymentPct(e.target.value)} type="number"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                  placeholder="30" />
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-widest">Plazo (meses)</label>
                <input value={termMonths} onChange={e => setTermMonths(e.target.value)} type="number"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                  placeholder="24" />
              </div>
            </div>

            <div>
              <label className="text-xs text-white/40 uppercase tracking-widest">Condiciones</label>
              <textarea value={conditions} onChange={e => setConditions(e.target.value)} rows={2}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                placeholder="Describe las condiciones del esquema..." />
            </div>

            <div>
              <label className="text-xs text-white/40 uppercase tracking-widest">Notas adicionales</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                placeholder="Notas relevantes para los asesores..." />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-white/50 hover:text-white">Cancelar</button>
              <button onClick={saveScheme} disabled={saving}
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
