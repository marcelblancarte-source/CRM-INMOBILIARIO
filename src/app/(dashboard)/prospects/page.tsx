'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const TEMP_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  cold:    { label: 'Frío',     color: 'text-zinc-400',   bg: 'bg-zinc-800' },
  warm:    { label: 'Tibio',    color: 'text-orange-400', bg: 'bg-orange-900/40' },
  medium:  { label: 'Medio',    color: 'text-yellow-400', bg: 'bg-yellow-900/40' },
  hot:     { label: 'Caliente', color: 'text-green-400',  bg: 'bg-green-900/40' },
  closing: { label: 'Cierre',   color: 'text-purple-400', bg: 'bg-purple-900/40' },
}

type Prospect = {
  id: string
  full_name: string
  phone: string | null
  email: string | null
  temperature: string | null
  visited: boolean | null
  has_quote: boolean | null
  preferred_typology: string | null
  first_contact_date: string | null
  last_contact_date: string | null
  next_followup_date: string | null
  last_note_at: string | null
  team_id: string | null
  assigned_advisor_id: string | null
  created_at: string
}

type Team = { id: string; name: string }
type User = { id: string; full_name: string; team_id: string | null }
type Project = { id: string; name: string }

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterTeam, setFilterTeam] = useState('')
  const [filterAdvisor, setFilterAdvisor] = useState('')
  const [filterUrgency, setFilterUrgency] = useState('all')
  const [selected, setSelected] = useState<Prospect | null>(null)
  const [notes, setNotes] = useState<any[]>([])
  const [prospectProjects, setProspectProjects] = useState<string[]>([])
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  async function loadData() {
    setLoading(true)
    const [{ data: prospectsData }, { data: teamsData }, { data: usersData }, { data: projectsData }] = await Promise.all([
      supabase.from('prospects').select('*').order('created_at', { ascending: false }),
      supabase.from('teams').select('id, name').order('name'),
      supabase.from('users').select('id, full_name, team_id').order('full_name'),
      supabase.from('projects').select('id, name').eq('status', 'active').order('name'),
    ])
    setProspects((prospectsData as any) ?? [])
    setTeams(teamsData ?? [])
    setUsers(usersData ?? [])
    setProjects(projectsData ?? [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  async function loadNotes(prospectId: string) {
    const { data } = await supabase
      .from('prospect_notes')
      .select('*, users(full_name)')
      .eq('prospect_id', prospectId)
      .order('created_at', { ascending: false })
    setNotes(data ?? [])
  }

  async function loadProspectProjects(prospectId: string) {
    const { data } = await supabase
      .from('prospect_projects')
      .select('project_id')
      .eq('prospect_id', prospectId)
    setProspectProjects((data ?? []).map((pp: any) => pp.project_id))
  }

  function openDrawer(prospect: Prospect) {
    setSelected(prospect)
    setNoteText('')
    setShowDeleteConfirm(false)
    loadNotes(prospect.id)
    loadProspectProjects(prospect.id)
  }

  function closeDrawer() {
    setSelected(null)
    setNotes([])
    setProspectProjects([])
    loadData()
  }

  async function updateField(id: string, field: string, value: any) {
    await supabase.from('prospects').update({ [field]: value }).eq('id', id)
    setProspects(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, [field]: value } : prev)
  }

  async function toggleProject(projectId: string) {
    if (!selected) return
    if (prospectProjects.includes(projectId)) {
      await supabase.from('prospect_projects')
        .delete()
        .eq('prospect_id', selected.id)
        .eq('project_id', projectId)
      setProspectProjects(prev => prev.filter(id => id !== projectId))
    } else {
      await supabase.from('prospect_projects').insert({
        prospect_id: selected.id,
        project_id: projectId,
        temperature: selected.temperature ?? 'cold',
      })
      setProspectProjects(prev => [...prev, projectId])
    }
  }

  async function saveNote() {
    if (!noteText.trim() || !selected) return
    setSavingNote(true)
    const { data: { user } } = await supabase.auth.getUser()
    const now = new Date().toISOString()
    await supabase.from('prospect_notes').insert({
      prospect_id: selected.id,
      author_id: user?.id,
      content: noteText,
    })
    await supabase.from('prospects').update({ last_note_at: now }).eq('id', selected.id)
    setNoteText('')
    setSavingNote(false)
    loadNotes(selected.id)
    setProspects(prev => prev.map(p => p.id === selected.id ? { ...p, last_note_at: now } : p))
  }

  async function deleteProspect() {
    if (!selected) return
    await supabase.from('prospect_notes').delete().eq('prospect_id', selected.id)
    await supabase.from('prospect_projects').delete().eq('prospect_id', selected.id)
    await supabase.from('prospects').delete().eq('id', selected.id)
    closeDrawer()
  }

  const filteredAdvisors = filterTeam ? users.filter(u => u.team_id === filterTeam) : users

  const filtered = prospects.filter(p => {
    if (search && !p.full_name?.toLowerCase().includes(search.toLowerCase())) return false
    if (filterTeam && p.team_id !== filterTeam) return false
    if (filterAdvisor && p.assigned_advisor_id !== filterAdvisor) return false
    if (filterUrgency === 'today' && p.next_followup_date !== today) return false
    if (filterUrgency === 'overdue' && (!p.next_followup_date || p.next_followup_date >= today)) return false
    return true
  })

  function getFollowupStatus(date: string | null) {
    if (!date) return null
    if (date < today) return 'overdue'
    if (date === today) return 'today'
    return 'ok'
  }

  function getTeamName(teamId: string | null) {
    return teams.find(t => t.id === teamId)?.name ?? null
  }

  function getAdvisorName(advisorId: string | null) {
    return users.find(u => u.id === advisorId)?.full_name ?? null
  }

  const overdueCount = prospects.filter(p => p.next_followup_date && p.next_followup_date < today).length
  const todayCount = prospects.filter(p => p.next_followup_date === today).length
  const hotCount = prospects.filter(p => p.temperature === 'hot' || p.temperature === 'closing').length

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      <div className={`flex flex-col flex-1 overflow-hidden transition-all ${selected ? 'mr-[480px]' : ''}`}>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/10 bg-black">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-extralight tracking-[0.1em] uppercase">Directorio de Prospectos</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mt-1">{filtered.length} registros</p>
            </div>
            <button
              onClick={() => {
                supabase.from('prospects').insert({
                  full_name: 'Nuevo Prospecto',
                  temperature: 'cold',
                  first_contact_date: today
                }).select().single().then(({ data }) => {
                  if (data) { loadData(); openDrawer(data as any) }
                })
              }}
              className="rounded-none border border-white/20 bg-transparent px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-white hover:bg-white hover:text-black transition-all"
            >
              + Nuevo Lead
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-px bg-white/10 border border-white/10 mb-4">
            <div className="bg-black px-4 py-3 text-center">
              <p className="text-2xl font-light">{prospects.length}</p>
              <p className="text-[9px] uppercase tracking-widest text-white/30 mt-1">Leads en Selección</p>
            </div>
            <div className="bg-black px-4 py-3 text-center">
              <p className="text-2xl font-light text-purple-400">{hotCount}</p>
              <p className="text-[9px] uppercase tracking-widest text-white/30 mt-1">Leads Calientes</p>
            </div>
            <div className="bg-black px-4 py-3 text-center">
              <p className="text-2xl font-light text-white/40">{prospects.length > 0 ? Math.round((hotCount / prospects.length) * 100) : 0}%</p>
              <p className="text-[9px] uppercase tracking-widest text-white/30 mt-1">% Conversión</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar nombre..."
              className="h-8 flex-1 min-w-[180px] rounded-none border border-white/10 bg-zinc-950 px-3 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-white/30" />
            <select value={filterTeam} onChange={e => { setFilterTeam(e.target.value); setFilterAdvisor('') }}
              className="h-8 rounded-none border border-white/10 bg-zinc-950 px-3 text-xs text-white focus:outline-none focus:border-white/30">
              <option value="">Todos los Equipos</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select value={filterAdvisor} onChange={e => setFilterAdvisor(e.target.value)}
              className="h-8 rounded-none border border-white/10 bg-zinc-950 px-3 text-xs text-white focus:outline-none focus:border-white/30">
              <option value="">Todos los Asesores</option>
              {filteredAdvisors.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
            <div className="flex border border-white/10">
              {[['all','Todos'],['today','Hoy'],['overdue','Vencidos']].map(([val, label]) => (
                <button key={val} onClick={() => setFilterUrgency(val)}
                  className={`px-3 h-8 text-[10px] uppercase tracking-widest transition-all ${filterUrgency === val ? 'bg-white text-black' : 'bg-transparent text-white/40 hover:text-white'}`}>
                  {label}{val === 'today' && todayCount > 0 && <span className="ml-1 text-yellow-400">{todayCount}</span>}
                  {val === 'overdue' && overdueCount > 0 && <span className="ml-1 text-red-400">{overdueCount}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-zinc-950 border-b border-white/10 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-[9px] uppercase tracking-[0.15em] text-white/30 font-normal">Equipo / Asesor</th>
                <th className="px-4 py-3 text-left text-[9px] uppercase tracking-[0.15em] text-white/30 font-normal">Cliente / Interés</th>
                <th className="px-4 py-3 text-left text-[9px] uppercase tracking-[0.15em] text-white/30 font-normal">Primer Contacto</th>
                <th className="px-4 py-3 text-left text-[9px] uppercase tracking-[0.15em] text-white/30 font-normal">Última Gestión</th>
                <th className="px-4 py-3 text-left text-[9px] uppercase tracking-[0.15em] text-white/30 font-normal">Próx. Seguimiento</th>
                <th className="px-4 py-3 text-center text-[9px] uppercase tracking-[0.15em] text-white/30 font-normal">Visita</th>
                <th className="px-4 py-3 text-center text-[9px] uppercase tracking-[0.15em] text-white/30 font-normal">Cotiz.</th>
                <th className="px-4 py-3 text-left text-[9px] uppercase tracking-[0.15em] text-white/30 font-normal">Temperatura</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-white/20">Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-white/20">No hay prospectos registrados.</td></tr>
              ) : filtered.map(p => {
                const followupStatus = getFollowupStatus(p.next_followup_date)
                const isSelected = selected?.id === p.id
                return (
                  <tr key={p.id} onClick={() => openDrawer(p)}
                    className={`cursor-pointer transition-all hover:bg-white/5 ${isSelected ? 'bg-white/5 border-l-2 border-purple-500' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="text-purple-400 font-medium">{getAdvisorName(p.assigned_advisor_id) ?? <span className="text-white/20 italic">Sin Asesor</span>}</p>
                      <p className="text-white/30 text-[10px] mt-0.5">{getTeamName(p.team_id) ?? <span className="italic">Sin Equipo</span>}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{p.full_name}</p>
                      {p.preferred_typology && <p className="text-white/30 text-[10px] mt-0.5">{p.preferred_typology}</p>}
                    </td>
                    <td className="px-4 py-3 text-white/40">
                      {p.first_contact_date ? new Date(p.first_contact_date + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                    </td>
                    <td className="px-4 py-3 text-white/40">
                      {p.last_note_at
                        ? new Date(p.last_note_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })
                        : p.last_contact_date
                          ? new Date(p.last_contact_date + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })
                          : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {p.next_followup_date ? (
                        <span className={`text-[10px] font-medium ${followupStatus === 'overdue' ? 'text-red-400' : followupStatus === 'today' ? 'text-yellow-400' : 'text-white/50'}`}>
                          {followupStatus === 'overdue' && '⚠ '}
                          {followupStatus === 'today' && '● '}
                          {new Date(p.next_followup_date + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                        </span>
                      ) : <span className="text-white/20">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={p.visited ?? false}
                        onChange={e => updateField(p.id, 'visited', e.target.checked)}
                        className="h-3.5 w-3.5 accent-purple-500 cursor-pointer" />
                    </td>
                    <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={p.has_quote ?? false}
                        onChange={e => updateField(p.id, 'has_quote', e.target.checked)}
                        className="h-3.5 w-3.5 accent-purple-500 cursor-pointer" />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${TEMP_CONFIG[p.temperature ?? '']?.bg ?? 'bg-zinc-800'} ${TEMP_CONFIG[p.temperature ?? '']?.color ?? 'text-zinc-400'}`}>
                        {TEMP_CONFIG[p.temperature ?? '']?.label ?? '—'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer */}
      {selected && (
        <div className="fixed right-0 top-0 h-full w-[480px] bg-zinc-950 border-l border-white/10 z-50 flex flex-col overflow-hidden">
          <div className="px-6 pt-6 pb-4 border-b border-white/10">
            <div className="flex items-start justify-between">
              <div className="flex-1 mr-4">
                <p className="text-[9px] uppercase tracking-[0.3em] text-purple-400 mb-2">Expediente Maestro</p>
                <input value={selected.full_name}
                  onChange={e => setSelected(prev => prev ? { ...prev, full_name: e.target.value } : prev)}
                  onBlur={e => updateField(selected.id, 'full_name', e.target.value)}
                  className="text-2xl font-extralight tracking-tight text-white bg-transparent border-none outline-none w-full italic" />
              </div>
              <button onClick={closeDrawer} className="text-white/20 hover:text-white transition-all mt-1 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">

            {/* Contacto */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-white/20 text-sm shrink-0">📱</span>
                <input value={selected.phone ?? ''}
                  onChange={e => setSelected(prev => prev ? { ...prev, phone: e.target.value } : prev)}
                  onBlur={e => updateField(selected.id, 'phone', e.target.value || null)}
                  placeholder="WhatsApp..."
                  className="flex-1 bg-transparent border-b border-white/10 pb-1 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/30" />
                {selected.phone && (
                  <a href={`https://wa.me/${selected.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                    className="text-[10px] text-green-400 hover:text-green-300 border border-green-400/30 px-2 py-0.5 rounded-full shrink-0">
                    WA
                  </a>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white/20 text-sm shrink-0">✉️</span>
                <input value={selected.email ?? ''}
                  onChange={e => setSelected(prev => prev ? { ...prev, email: e.target.value } : prev)}
                  onBlur={e => updateField(selected.id, 'email', e.target.value || null)}
                  placeholder="email..."
                  className="flex-1 bg-transparent border-b border-white/10 pb-1 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/30" />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white/20 text-sm shrink-0">🏠</span>
                <input value={selected.preferred_typology ?? ''}
                  onChange={e => setSelected(prev => prev ? { ...prev, preferred_typology: e.target.value } : prev)}
                  onBlur={e => updateField(selected.id, 'preferred_typology', e.target.value || null)}
                  placeholder="Unidad de interés..."
                  className="flex-1 bg-transparent border-b border-white/10 pb-1 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/30" />
              </div>
            </div>

            {/* Proyectos de interés */}
            <div>
              <label className="text-[9px] uppercase tracking-widest text-white/30 block mb-2">Proyectos de Interés</label>
              <div className="flex flex-wrap gap-2">
                {projects.map(project => {
                  const isLinked = prospectProjects.includes(project.id)
                  return (
                    <button key={project.id} onClick={() => toggleProject(project.id)}
                      className={`px-3 py-1 text-[10px] uppercase tracking-wider border transition-all ${isLinked ? 'border-purple-500 bg-purple-500/20 text-purple-300' : 'border-white/10 text-white/30 hover:border-white/30 hover:text-white'}`}>
                      {isLinked && '✓ '}{project.name}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Asignación */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase tracking-widest text-white/30 block mb-1">Equipo</label>
                <select value={selected.team_id ?? ''}
                  onChange={e => {
                    const val = e.target.value || null
                    updateField(selected.id, 'team_id', val)
                    updateField(selected.id, 'assigned_advisor_id', null)
                    setSelected(prev => prev ? { ...prev, team_id: val, assigned_advisor_id: null } : prev)
                  }}
                  className="w-full rounded-none border border-white/10 bg-black px-2 py-1.5 text-xs text-white focus:outline-none focus:border-white/30">
                  <option value="">Sin Equipo</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-widest text-white/30 block mb-1">Asesor</label>
                <select value={selected.assigned_advisor_id ?? ''}
                  onChange={e => updateField(selected.id, 'assigned_advisor_id', e.target.value || null)}
                  className="w-full rounded-none border border-white/10 bg-black px-2 py-1.5 text-xs text-white focus:outline-none focus:border-white/30">
                  <option value="">Sin Asesor</option>
                  {(selected.team_id ? users.filter(u => u.team_id === selected.team_id) : users).map(u => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Temperatura */}
            <div>
              <label className="text-[9px] uppercase tracking-widest text-white/30 block mb-2">Estatus Comercial</label>
              <div className="grid grid-cols-5 gap-1">
                {Object.entries(TEMP_CONFIG).map(([key, val]) => (
                  <button key={key} onClick={() => updateField(selected.id, 'temperature', key)}
                    className={`py-1.5 text-[10px] uppercase tracking-wider border transition-all ${selected.temperature === key ? 'border-white bg-white text-black' : 'border-white/10 text-white/40 hover:text-white hover:border-white/30'}`}>
                    {val.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Hitos */}
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-3 border border-white/10 px-3 py-2 cursor-pointer hover:border-white/20 transition-all">
                <input type="checkbox" checked={selected.visited ?? false}
                  onChange={e => updateField(selected.id, 'visited', e.target.checked)}
                  className="accent-purple-500" />
                <span className="text-xs text-white/60">Visita Realizada</span>
              </label>
              <label className="flex items-center gap-3 border border-white/10 px-3 py-2 cursor-pointer hover:border-white/20 transition-all">
                <input type="checkbox" checked={selected.has_quote ?? false}
                  onChange={e => updateField(selected.id, 'has_quote', e.target.checked)}
                  className="accent-purple-500" />
                <span className="text-xs text-white/60">Cotización Entregada</span>
              </label>
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[9px] uppercase tracking-widest text-white/30 block mb-1">Primer Contacto</label>
                <input type="date" value={selected.first_contact_date ?? ''}
                  onChange={e => updateField(selected.id, 'first_contact_date', e.target.value || null)}
                  className="w-full rounded-none border border-white/10 bg-black px-2 py-1.5 text-xs text-white focus:outline-none focus:border-white/30 [color-scheme:dark]" />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-widest text-white/30 block mb-1">Último Contacto</label>
                <input type="date" value={selected.last_contact_date ?? ''}
                  onChange={e => updateField(selected.id, 'last_contact_date', e.target.value || null)}
                  className="w-full rounded-none border border-white/10 bg-black px-2 py-1.5 text-xs text-white focus:outline-none focus:border-white/30 [color-scheme:dark]" />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-widest text-white/30 block mb-1">Próx. Seguimiento</label>
                <input type="date" value={selected.next_followup_date ?? ''}
                  onChange={e => updateField(selected.id, 'next_followup_date', e.target.value || null)}
                  className="w-full rounded-none border border-white/10 bg-black px-2 py-1.5 text-xs text-white focus:outline-none focus:border-white/30 [color-scheme:dark]" />
              </div>
            </div>

            {/* Bitácora */}
            <div>
              <label className="text-[9px] uppercase tracking-widest text-white/30 block mb-2">Bitácora de Seguimiento</label>
              <div className="space-y-2">
                <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
                  rows={3} placeholder="Notas de seguimiento..."
                  className="w-full rounded-none border border-white/10 bg-black px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 resize-none" />
                <button onClick={saveNote} disabled={savingNote || !noteText.trim()}
                  className="w-full py-2 text-[10px] uppercase tracking-widest border border-white/20 text-white/60 hover:bg-white hover:text-black transition-all disabled:opacity-30">
                  {savingNote ? 'Guardando...' : 'Agregar Nota'}
                </button>
              </div>
              <div className="mt-3 space-y-3 max-h-48 overflow-y-auto">
                {notes.map(note => (
                  <div key={note.id} className="border-l border-white/10 pl-3">
                    <p className="text-xs text-white/60">{note.content}</p>
                    <p className="text-[10px] text-white/20 mt-1">
                      {Array.isArray(note.users) ? note.users[0]?.full_name : note.users?.full_name} — {new Date(note.created_at).toLocaleString('es-MX')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/10">
            {!showDeleteConfirm ? (
              <button onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-2 text-[10px] uppercase tracking-widest text-red-500/60 border border-red-500/20 hover:bg-red-500/10 transition-all">
                Eliminar Prospecto
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-[10px] text-red-400 text-center uppercase tracking-widest">¿Confirmar eliminación permanente?</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setShowDeleteConfirm(false)}
                    className="py-2 text-[10px] uppercase tracking-widest border border-white/10 text-white/40 hover:text-white transition-all">
                    Cancelar
                  </button>
                  <button onClick={deleteProspect}
                    className="py-2 text-[10px] uppercase tracking-widest bg-red-600 text-white hover:bg-red-700 transition-all">
                    Eliminar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
