'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Team = {
  id: string
  name: string
  description: string | null
  created_at: string
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  async function loadTeams() {
    setLoading(true)
    const { data } = await supabase.from('teams').select('*').order('created_at')
    setTeams(data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadTeams() }, [])

  function openNew() {
    setEditingTeam(null)
    setName('')
    setDescription('')
    setShowModal(true)
  }

  function openEdit(team: Team) {
    setEditingTeam(team)
    setName(team.name)
    setDescription(team.description ?? '')
    setShowModal(true)
  }

  async function saveTeam() {
    if (!name.trim()) return
    setSaving(true)
    if (editingTeam) {
      await supabase.from('teams').update({ name, description }).eq('id', editingTeam.id)
    } else {
      await supabase.from('teams').insert({ name, description })
    }
    setSaving(false)
    setShowModal(false)
    loadTeams()
  }

  async function deleteTeam(id: string) {
    if (!confirm('¿Eliminar este equipo?')) return
    await supabase.from('teams').delete().eq('id', id)
    loadTeams()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 classN
