import { createClient } from '@/lib/supabase/server'

function StatCard({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) {
  return (
    <div className="rounded-none border border-white/10 bg-zinc-950 p-6 transition-all hover:border-white/20">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">{title}</p>
      <p className="mt-3 text-3xl font-light tracking-tight text-white">{value}</p>
      {subtitle && <p className="mt-2 text-[10px] text-white/30 italic">{subtitle}</p>}
    </div>
  )
}

function TempBar({ label, emoji, count, total, colorHex }: { label: string; emoji: string; count: number; total: number; colorHex: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-4">
      <div className="w-32 shrink-0 flex items-center gap-2 text-[11px] uppercase tracking-widest text-white/70">
        <span>{emoji}</span>
        <span>{label}</span>
      </div>
      <div className="flex-1 h-[2px] bg-white/5 overflow-hidden">
        <div className="h-full transition-all duration-1000" style={{ width: `${pct}%`, backgroundColor: colorHex }} />
      </div>
      <span className="w-12 text-right text-[11px] font-mono text-white/50">{count}</span>
    </div>
  )
}

function FunnelStep({ step, label, count, pct, last }: { step: number; label: string; count: number; pct: number; last?: boolean }) {
  return (
    <div className="flex items-center gap-6">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-white/20 text-xs font-light text-white">
        0{step}
      </div>
      <div className="flex-1">
        <div className="flex justify-between text-[11px] uppercase tracking-[0.1em] mb-2 text-white/80">
          <span>{label}</span>
          <span className="font-mono text-white">{count} <span className="text-white/30">({pct}%)</span></span>
        </div>
        <div className="h-[1px] bg-white/10 w-full relative">
          <div className="absolute top-0 left-0 h-full bg-purple-500" style={{ width: `${pct}%` }} />
        </div>
      </div>
      {!last && <div className="text-white/10 font-thin text-2xl">→</div>}
    </div>
  )
}

export default async function DashboardHomePage() {
  const supabase = await createClient()

  // Cargar datos reales en paralelo
  const [
    { count: totalProspects },
    { count: visited },
    { count: quoted },
    { count: closing },
    { data: tempCounts },
    { data: inventoryData },
    { data: activitiesData },
    { data: discountData },
  ] = await Promise.all([
    supabase.from('prospects').select('*', { count: 'exact', head: true }),
    supabase.from('prospects').select('*', { count: 'exact', head: true }).eq('visited', true),
    supabase.from('prospects').select('*', { count: 'exact', head: true }).eq('has_quote', true),
    supabase.from('prospects').select('*', { count: 'exact', head: true }).eq('temperature', 'closing'),
    supabase.from('prospects').select('temperature'),
    supabase.from('units').select('status'),
    supabase.from('activities').select('status, scheduled_at'),
    supabase.from('prospects').select('list_price_at_quote, offered_price').not('offered_price', 'is', null).not('list_price_at_quote', 'is', null),
  ])

  const total = totalProspects ?? 0

  // Temperatura
  const tempMap: Record<string, number> = { cold: 0, warm: 0, medium: 0, hot: 0, closing: 0 }
  tempCounts?.forEach((p: any) => { if (p.temperature) tempMap[p.temperature] = (tempMap[p.temperature] ?? 0) + 1 })

  // Inventario
  const invMap: Record<string, number> = { available: 0, reserved: 0, in_process: 0, sold: 0 }
  inventoryData?.forEach((u: any) => { if (u.status) invMap[u.status] = (invMap[u.status] ?? 0) + 1 })

  // Actividades
  const now = new Date()
  const todayDone = activitiesData?.filter((a: any) => a.status === 'done').length ?? 0
  const todayOverdue = activitiesData?.filter((a: any) => a.status === 'pending' && new Date(a.scheduled_at) < now).length ?? 0
  const todayTotal = activitiesData?.length ?? 0

  // Descuento promedio
  let avgDiscount = 0
  if (discountData && discountData.length > 0) {
    const discounts = discountData
      .filter((p: any) => p.list_price_at_quote > 0)
      .map((p: any) => ((p.list_price_at_quote - p.offered_price) / p.list_price_at_quote) * 100)
    avgDiscount = discounts.length > 0 ? discounts.reduce((a: number, b: number) => a + b, 0) / discounts.length : 0
  }

  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0

  return (
    <div className="space-y-12 bg-black text-white min-h-screen pb-20">
      <div className="border-b border-white/10 pb-8">
        <h1 className="text-4xl font-extralight tracking-tighter uppercase">MTP Dashboard</h1>
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mt-2">Inteligencia Estratégica Inmobiliaria</p>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-2 gap-px bg-white/10 border border-white/10 lg:grid-cols-4">
        <StatCard title="Total Prospectos" value={total} subtitle="Base de datos activa" />
        <StatCard title="Visitas" value={visited ?? 0} subtitle="Conversión presencial" />
        <StatCard title="Cotizaciones" value={quoted ?? 0} subtitle="Intención de compra" />
        <StatCard title="Cierres" value={closing ?? 0} subtitle="Etapa final" />
      </div>

      <div className="grid gap-12 lg:grid-cols-3">
        {/* Temperatura */}
        <div className="lg:col-span-2 border border-white/10 bg-zinc-950 p-8">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-10 text-white/50 border-b border-white/5 pb-4">Distribución de Temperatura</h2>
          <div className="space-y-8">
            <TempBar label="Cierre Inminente" emoji="✧" count={tempMap.closing} total={total} colorHex="#9333ea" />
            <TempBar label="Caliente" emoji="●" count={tempMap.hot} total={total} colorHex="#ffffff" />
            <TempBar label="Medio" emoji="○" count={tempMap.medium} total={total} colorHex="#eab308" />
            <TempBar label="Tibio" emoji="◌" count={tempMap.warm} total={total} colorHex="#f97316" />
            <TempBar label="Frío" emoji="□" count={tempMap.cold} total={total} colorHex="#71717a" />
          </div>
        </div>

        <div className="space-y-6">
          {/* Actividades */}
          <div className="border border-white/10 bg-zinc-950 p-8">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-6 text-white/50">Actividades</h2>
            <div className="flex justify-between items-end">
              <p className="text-5xl font-light">{todayTotal}</p>
              <div className="text-right space-y-1">
                <p className="text-[9px] uppercase tracking-widest text-white/40">{todayDone} Completadas</p>
                <p className="text-[9px] uppercase tracking-widest text-purple-400">{todayOverdue} Vencidas</p>
              </div>
            </div>
          </div>

          {/* Descuento promedio */}
          <div className="bg-purple-600 p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">Descuento Promedio</p>
            <p className="text-4xl font-light text-white mt-2">{avgDiscount.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* Inventario */}
      <div className="grid grid-cols-2 gap-px bg-white/10 border border-white/10 lg:grid-cols-4">
        <StatCard title="Disponibles" value={invMap.available} subtitle="Unidades en venta" />
        <StatCard title="Apartados" value={invMap.reserved} subtitle="Con enganche" />
        <StatCard title="En Proceso" value={invMap.in_process} subtitle="Trámite en curso" />
        <StatCard title="Vendidos" value={invMap.sold} subtitle="Escriturados" />
      </div>

      {/* Embudo */}
      <div className="border border-white/10 bg-zinc-950 p-8">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-10 text-white/50">Embudo de Conversión</h2>
        <div className="space-y-10 max-w-3xl">
          <FunnelStep step={1} label="Registros" count={total} pct={100} />
          <FunnelStep step={2} label="Visitas" count={visited ?? 0} pct={pct(visited ?? 0)} />
          <FunnelStep step={3} label="Cotizaciones" count={quoted ?? 0} pct={pct(quoted ?? 0)} />
          <FunnelStep step={4} label="Cierre Inminente" count={closing ?? 0} pct={pct(closing ?? 0)} last />
        </div>
      </div>
    </div>
  )
}
