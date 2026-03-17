'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Activity = {
  id: string
  type: string | null
  description: string | null
  scheduled_at: string | null
  status: string | null
  prospect_id: string | null
  advisor_id: string | null
  prospects: any
  users: any
}

const TYPE_ICONS: Record<string, string> = {
  call: '📞',
  whatsapp: '✉️',
  visit: '🏗️',
  office_meeting: '🏢',
  follow_up: '📅',
}

const TYPE_LABELS: Record<string, string> = {
  call: 'Llamada telefónica',
  whatsapp: 'WhatsApp / Correo',
  visit: 'Visita al desarrollo',
  office_meeting: 'Cita en oficina',
  follow_up: 'Seguimiento general',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  done: 'Realizada',
  no_answer: 'No contestó',
  rescheduled: 'Reprogramada',
}

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [prospects, setProspects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)

  const [type, setType] = useState('call')
  const [prospectId, setProspectId] = useState('')
  const [description, setDescription] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')

  const supabase = createClient()
  const now = new Date()

  async function loadData() {
    setLoading(true)
    const [{ data: activitiesData }, { data: prospectsData }] = await Promise.all([
      supabase
        .from('activities')
        .select('*, prospects(full_name), users(full_name)')
        .order('scheduled_at', { ascending: true }),
      supabase.from('prospects').select('id, full_name').order('full_name'),
    ])
    setActivities((activitiesData as any) ?? [])
    setProspects(prospectsData ?? [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  function isOverdue(activity: Activity) {
    if (activity.status !== 'pending') return false
    if (!activity.scheduled_at) return false
    return new Date(activity.scheduled_at) < now
  }

  const pending = activities.filter(a => a.status === 'pending' && !isOverdue(a)).length
  const overdue = activities.filter(a => isOverdue(a)).length
  const done = activities.filter(a => a.status === 'done').length

  async function saveActivity() {
    if (!prospectId || !scheduledDate) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('activities').insert({
      type,
      description: description || null,
      scheduled_at: `${scheduledDate}T${scheduledTime || '09:00'}:00`,
      status: 'pending',
      prospect_id: prospectId,
      advisor_id: user?.id,
    })
    setSaving(false)
    setShowModal(false)
    loadData()
  }

  async function markDone(id: string) {
    await supabase.from('activities').update({ status: 'done' }).eq('id', id)
    loadData()
  }

  function openNew() {
    setType('call')
    setProspectId('')
    setDescription('')
    setScheduledDate('')
    setScheduledTime('')
    setShowModal(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agenda y Alertas</h1>
          <p className="text-sm text-white/40 mt-1">Monitor de actividades de seguimiento.</p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-lg bg-white text-black px-4 py-2 text-sm font-medium hover:bg-white/90 transition-all"
        >
          <span className="text-lg leading-none">+</span> Agendar Actividad
        </button>
      </div>

      {/* Resumen */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-zinc-950 p-6 text-center">
          <p className="text-xs text-white/40 uppercase tracking-widest mb-2">Pendientes</p>
          <p className="text-3xl font-bold">{pending}</p>
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-900/10 p-6 text-center">
          <p className="text-xs text-red-400 uppercase tracking-widest mb-2">⚠️ Vencidas</p>
          <p className="text-3xl font-bold text-red-400">{overdue}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-zinc-950 p-6 text-center">
          <p className="text-xs text-white/40 uppercase tracking-widest mb-2">Realizadas</p>
          <p className="text-3xl font-bold text-green-400">{done}</p>
        </div>
      </div>

      {/* Lista */}
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="border-b border-white/10 bg-zinc-950">
            <tr>
              <th className="px-6 py-4 text-xs uppercase tracking-widest text-white/40 font-medium">Actividad</th>
              <th className="px-6 py-4 text-xs uppercase tracking-widest text-white/40 font-medium">Prospecto</th>
              <th className="px-6 py-4 text-xs uppercase tracking-widest text-white/40 font-medium">Asesor</th>
              <th className="px-6 py-4 text-xs uppercase tracking-widest text-white/40 font-medium">Fecha y Hora</th>
              <th className="px-6 py-4 text-xs uppercase tracking-widest text-white/40 font-medium">Estatus</th>
              <th className="px-6 py-4 text-xs uppercase tracking-widest text-white/40 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-white/40 text-sm">Cargando actividades...</td></tr>
            ) : activities.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-white/40 text-sm">No hay actividades registradas.</td></tr>
            ) : (
              activities.map((activity) => {
                const overdue = isOverdue(activity)
                const prospectName = Array.isArray(activity.prospects) ? activity.prospects[0]?.full_name : activity.prospects?.full_name
                const advisorName = Array.isArray(activity.users) ? activity.users[0]?.full_name : activity.users?.full_name
                const scheduledDate = activity.scheduled_at ? new Date(activity.scheduled_at) : null
                return (
                  <tr key={activity.id} className={`transition-all ${overdue ? 'bg-red-900/10' : 'hover:bg-white/5'}`}>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white flex items-center gap-2">
                        <span>{TYPE_ICONS[activity.type ?? ''] ?? '📅'}</span>
                        {TYPE_LABELS[activity.type ?? ''] ?? activity.type}
                      </div>
                      {activity.description && (
                        <div className="text-xs text-white/40 mt-1 max-w-xs truncate">{activity.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {prospectName ? (
                        <Link href={`/prospects/${activity.prospect_id}`} className="text-white/70 hover:text-white transition-all">
                          {prospectName}
                        </Link>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-4 text-white/50">{advisorName ?? '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`font-medium ${overdue ? 'text-red-400' : 'text-white'}`}>
                        {scheduledDate ? scheduledDate.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        overdue ? 'bg-red-900/40 text-red-400' :
                        activity.status === 'done' ? 'bg-green-900/40 text-green-400' :
                        'bg-zinc-800 text-zinc-300'
                      }`}>
                        {overdue ? 'Vencida' : STATUS_LABELS[activity.status ?? ''] ?? activity.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {activity.status === 'pending' && (
                        <button onClick={() => markDone(activity.id)} className="text-xs text-green-400 hover:text-green-300 transition-all">
                          Completar
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-zinc-950 p-6 space-y-4">
            <h2 className="text-lg font-bold">Nueva Actividad</h2>

            <div>
              <label className="text-xs text-white/40 uppercase tracking-widest">Tipo</label>
              <select value={type} onChange={e => setType(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30">
                {Object.entries(TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-white/40 uppercase tracking-widest">Prospecto *</label>
              <select value={prospectId} onChange={e => setProspectId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30">
                <option value="">Seleccionar prospecto</option>
                {prospects.map(p => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-white/40 uppercase tracking-widest">Descripción</label>
              <input value={description} onChange={e => setDescription(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                placeholder="Breve descripción de la actividad" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/40 uppercase tracking-widest">Fecha *</label>
                <input value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} type="date"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30" />
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-widest">Hora</label>
                <input value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} type="time"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30" />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-white/50 hover:text-white">Cancelar</button>
              <button onClick={saveActivity} disabled={saving}
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
