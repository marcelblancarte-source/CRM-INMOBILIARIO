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
  users: any
}

const TEMP_BADGE: Record<string, { label: string; className: string }> = {
  cold:    { label: '🔴 Frío',             className: 'bg-zinc-800 text-zinc-300' },
  warm:    { label: '🟠 Tibio',            className: 'bg-orange-900/40 text-orange-400' },
  medium:  { label: '🟡 Medio',            className: 'bg-yellow-900/40 text-yellow-400' },
  hot:     { label: '🟢 Caliente',         className: 'bg-green-900/40 text-green-400' },
  closing: { label: '⭐ Cierre Inminente', className: 'bg-blue-900/40 text-blue-400' },
}

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [filtered, setFiltered] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tempFilter, setTempFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [source, setSource] = useState('')
  const [temperature, setTemperature] = useState('medium')

  const supabase = createClient()

  async function loadProspects() {
    setLoading(true)
    const { data } = await supabase
      .from('prospects')
      .select('id, full_name, phone, email, temperature, created_at, users(full_name)')
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
        p.phone?.includes(q)
      )
    }
    if (tempFilter) {
      result = result.filter(p => p.temperature === tempFilter)
    }
    setFiltered(result)
  }, [search, tempFilter, prospects])

  function openNew() {
    setFullName('')
    setPhone('')
    setEmail('')
    setSource('')
    setTemperature('medium')
    setShowModal(true)
  }

  async function saveProspect() {
    if (!fullName.trim()) return
    setSaving(true)
    await supabase.from('prospects').insert({
      full_name: fullName,
      phone: phone || null,
      email: email || null,
      source: source || null,
      temperature,
      first_contact_date: new Date().toISOString().split('T')[0],
    })
    setSaving(false)
    setShowModal(false)
    loadProspects()
  }

  function getAdvisorName(users: any): string {
    if (!users) return 'Sin asesor'
    if (Array.isArray(users)) return users[0]?.full_name ? `Asesor: ${users[0].full_name}` : 'Sin asesor'
    return users.full_name ? `Asesor: ${users.full_name}` : 'Sin asesor'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Directorio de Prospectos</h1>
          <p className="text-sm text-white/40 mt-1">Gestiona el seguimiento y embudo de ventas.</p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-lg bg-white text-black px-4 py-2 text-sm font-medium hover:bg-white/90 transition-all"
        >
          <span className="text-lg leading-none">+</span> Nuevo Prospecto
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, correo o teléfono..."
          className="h-10 w-full sm:w-1/3 rounded-lg border border-white/10 bg-zinc-950 px-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
        />
        <select
          value={tempFilter}
          onChange={e => setTempFilter(e.target.value)}
          className="h-10 rounded-lg border border-white/10 bg-zinc-950 px-3 text-sm text-white focus:outline-none focus:border-white/30"
        >
          <option value="">Todas las temperaturas</option>
          <option value="cold">🔴 Frío</option>
          <option value="warm">🟠 Tibio</option>
          <option value="medium">🟡 Medio</option>
          <option value="hot">🟢 Caliente</option>
          <option value="closing">⭐ Cierre Inminente</option>
        </select>
      </div>

      {loading ? (
        <p className="text-white/40 text-sm">Cargando prospectos...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-white/10 p-12 text-center">
          <p className="text-white/40 text-sm">No hay prospectos registrados.</p>
          <button onClick={openNew} className="mt-4 text-sm text-white underline">Registrar el primero</button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => {
            const temp = TEMP_BADGE[p.temperature ?? ''] ?? { label: p.temperature ?? '—', className: 'bg-zinc-800 text-zinc-300' }
            return (
              <div key={p.id} className="rounded-xl border border-white/10 bg-zinc-950 p-6 hover:border-white/20 transition-all">
                <div className="flex justify-between items-start mb-3">
                  <Link href={`/prospects/${p.id}`} className="text-base font-bold text-white hover:text-white/70 transition-all">
                    {p.full_name}
                  </Link>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${temp.className}`}>
                    {temp.label}
                  </span>
                </div>
                <div className="space-y-1 text-sm text-white/40">
                  {p.phone && <p>📱 {p.phone}</p>}
                  {p.email && <p>✉️ {p.email}</p>}
                </div>
                <div className="mt-4 pt-4 border-t border-white/5 flex justify-between text-xs text-white/30">
                  <span>{getAdvisorName(p.users)}</span>
                  <span>{new Date(p.created_at).toLocaleDateString('es-MX')}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-zinc-950 p-6 space-y-4">
            <h2 className="text-lg font-bold">Nuevo Prospecto</h2>

            <div>
              <label className="text-xs text-white/40 uppercase tracking-widest">Nombre completo *</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                placeholder="Nombre Apellido" />
            </div>

            <div>
              <label className="text-xs text-white/40 uppercase tracking-widest">Teléfono</label>
              <input value={phone} onChange={e => setPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                placeholder="555-000-0000" />
            </div>

            <div>
              <label className="text-xs text-white/40 uppercase tracking-widest">Correo electrónico</label>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email"
                className="mt-1 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                placeholder="correo@ejemplo.com" />
            </div>

            <div>
              <label className="text-xs text-white/40 uppercase tracking-widest">¿Cómo se enteró?</label>
              <select value={source} onChange={e => setSource(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30">
                <option value="">Seleccionar origen</option>
                <option value="Referido">Referido</option>
                <option value="Redes sociales">Redes sociales</option>
                <option value="Portal inmobiliario">Portal inmobiliario</option>
                <option value="Espectacular">Espectacular</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-white/40 uppercase tracking-widest">Temperatura inicial</label>
              <select value={temperature} onChange={e => setTemperature(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30">
                <option value="cold">🔴 Frío</option>
                <option value="warm">🟠 Tibio</option>
                <option value="medium">🟡 Medio</option>
                <option value="hot">🟢 Caliente</option>
                <option value="closing">⭐ Cierre Inminente</option>
              </select>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-white/50 hover:text-white">Cancelar</button>
              <button onClick={saveProspect} disabled={saving}
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
