'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import KpiCard from '@/components/KpiCard';
import ChannelCard from '@/components/ChannelCard';
import CampaignRankTable from '@/components/CampaignRankTable';
import CampaignSidebar from '@/components/CampaignSidebar';
import { generateMockRows } from '@/lib/mockData';
import type { CampaignRow } from '@/types/campaign';
import { sumRows } from '@/types/campaign';
import type { Objective } from '@/types/objective';
import { autoDetectObjective } from '@/types/objective';

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtEur = (n: number) =>
  n.toLocaleString('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
const fmtNum = (n: number) => n.toLocaleString('nl-NL');
const fmtPct = (n: number) => `${(n * 100).toFixed(2)}%`;

// ── Date helpers ──────────────────────────────────────────────────────────────
type Preset = 'week' | '14days' | 'month' | '3months' | 'custom';
type Tab = 'ads' | 'analyse' | 'ga4' | 'sollicitaties';

function fmt(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function presetRange(preset: Preset, customFrom: string, customTo: string) {
  if (preset === 'custom') return { from: customFrom, to: customTo };
  const today = new Date();
  const to = fmt(today);
  if (preset === 'week') {
    const day = today.getDay();
    const diff = day === 0 ? 6 : day - 1; // Monday = 0
    const mon = new Date(today);
    mon.setDate(today.getDate() - diff);
    return { from: fmt(mon), to };
  }
  if (preset === '14days') {
    const start = new Date(today);
    start.setDate(today.getDate() - 13);
    return { from: fmt(start), to };
  }
  if (preset === 'month') {
    return { from: fmt(new Date(today.getFullYear(), today.getMonth(), 1)), to };
  }
  // 3months
  const start = new Date(today);
  start.setMonth(today.getMonth() - 3);
  return { from: fmt(start), to };
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  // Mock dataset — generated once, stands in for the real API/data-source integration.
  const rows: CampaignRow[] = useMemo(() => generateMockRows(), []);

  // Navigation
  const [tab, setTab] = useState<Tab>('ads');
  const [preset, setPreset] = useState<Preset>('3months');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Campaign selector
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set());

  // Compare toggle
  const [compareEnabled, setCompareEnabled] = useState(false);

  // Sidebar open state (persisted)
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const s = localStorage.getItem('demo_sidebar');
    return s !== null ? s === 'true' : true;
  });

  // Manual objective override (persisted)
  const [manualObjective, setManualObjective] = useState<Objective | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('demo_objective') as Objective | null;
  });

  useEffect(() => { localStorage.setItem('demo_sidebar', String(sidebarOpen)); }, [sidebarOpen]);

  useEffect(() => {
    if (manualObjective) localStorage.setItem('demo_objective', manualObjective);
    else localStorage.removeItem('demo_objective');
  }, [manualObjective]);

  const { from: dateFrom, to: dateTo } = useMemo(
    () => presetRange(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  );

  // Running campaigns = recent activity in last 7 days of available data.
  const runningCampaigns = useMemo(() => {
    if (rows.length === 0) return new Set<string>();
    const maxByCampaign = new Map<string, string>();
    let datasetMax = '';
    for (const r of rows) {
      if (r.date > datasetMax) datasetMax = r.date;
      const cur = maxByCampaign.get(r.campaign_name);
      if (!cur || r.date > cur) maxByCampaign.set(r.campaign_name, r.date);
    }
    const cutoffMs = new Date(datasetMax + 'T00:00:00').getTime() - 7 * 86_400_000;
    const cutoff = fmt(new Date(cutoffMs));
    const running = new Set<string>();
    for (const [name, lastDate] of maxByCampaign) {
      if (lastDate >= cutoff) running.add(name);
    }
    return running;
  }, [rows]);

  // Smart campaign selection initialisation with localStorage persistence.
  const hasInitCampaignsRef = useRef(false);

  useEffect(() => {
    if (rows.length === 0) return;
    const allNames = new Set(rows.map((r) => r.campaign_name));
    if (!hasInitCampaignsRef.current) {
      hasInitCampaignsRef.current = true;
      try {
        const saved = localStorage.getItem('demo_campaigns');
        if (saved) {
          const arr = JSON.parse(saved) as string[];
          const valid = new Set(arr.filter((c) => allNames.has(c)));
          if (valid.size > 0) { setSelectedCampaigns(valid); return; }
        }
      } catch { /* ignore */ }
      setSelectedCampaigns(runningCampaigns.size > 0 ? new Set(runningCampaigns) : allNames);
    }
  }, [rows, runningCampaigns]);

  useEffect(() => {
    if (selectedCampaigns.size > 0)
      localStorage.setItem('demo_campaigns', JSON.stringify([...selectedCampaigns]));
  }, [selectedCampaigns]);

  // Filtered rows by date
  const filtered = useMemo(() =>
    rows.filter((r) =>
      (!dateFrom || r.date >= dateFrom) &&
      (!dateTo || r.date <= dateTo)
    ),
    [rows, dateFrom, dateTo],
  );

  // Filtered rows by date AND selected campaigns
  const filteredRows = useMemo(() =>
    selectedCampaigns.size === 0
      ? filtered
      : filtered.filter((r) => selectedCampaigns.has(r.campaign_name)),
    [filtered, selectedCampaigns],
  );

  // Most recent date present in the dataset — "data through" freshness marker.
  const datasetMax = useMemo(() => {
    let max = '';
    for (const r of rows) if (r.date > max) max = r.date;
    return max;
  }, [rows]);

  // Totals
  const totals = useMemo(() => sumRows(filteredRows), [filteredRows]);
  const overallCpa = totals.conversions > 0 ? totals.spend / totals.conversions : null;

  // Per-channel totals
  const liTotals = useMemo(() => sumRows(filteredRows.filter((r) => r.platform === 'linkedin')), [filteredRows]);
  const meTotals = useMemo(() => sumRows(filteredRows.filter((r) => r.platform === 'meta')), [filteredRows]);
  const goTotals = useMemo(() => sumRows(filteredRows.filter((r) => r.platform === 'google')), [filteredRows]);
  const liCpa = liTotals.conversions > 0 ? liTotals.spend / liTotals.conversions : null;
  const meCpa = meTotals.conversions > 0 ? meTotals.spend / meTotals.conversions : null;
  const goCpa = goTotals.conversions > 0 ? goTotals.spend / goTotals.conversions : null;
  const liCtr = liTotals.impressions > 0 ? liTotals.clicks / liTotals.impressions : 0;
  const meCtr = meTotals.impressions > 0 ? meTotals.clicks / meTotals.impressions : 0;
  const goCtr = goTotals.impressions > 0 ? goTotals.clicks / goTotals.impressions : 0;
  const liCpc = liTotals.clicks > 0 ? liTotals.spend / liTotals.clicks : 0;
  const meCpc = meTotals.clicks > 0 ? meTotals.spend / meTotals.clicks : 0;
  const goCpc = goTotals.clicks > 0 ? goTotals.spend / goTotals.clicks : 0;
  const liCpm = liTotals.impressions > 0 ? (liTotals.spend / liTotals.impressions) * 1000 : 0;
  const meCpm = meTotals.impressions > 0 ? (meTotals.spend / meTotals.impressions) * 1000 : 0;
  const goCpm = goTotals.impressions > 0 ? (goTotals.spend / goTotals.impressions) * 1000 : 0;

  // Winner logic (CPA-based, simplified for the demo)
  const convMinVolume = Math.max(3, totals.conversions * 0.1);
  const cpaQualified = [
    { name: 'LinkedIn', cpa: liCpa, vol: liTotals.conversions },
    { name: 'Meta', cpa: meCpa, vol: meTotals.conversions },
    { name: 'Google Ads', cpa: goCpa, vol: goTotals.conversions },
  ].filter((c) => c.cpa !== null && c.vol >= convMinVolume);
  const cpaWinner = cpaQualified.sort((a, b) => (a.cpa! - b.cpa!))[0] ?? null;
  const minCpa = cpaWinner?.cpa ?? Math.min(...[liCpa, meCpa, goCpa].filter((c): c is number => c !== null));
  const liWins = cpaWinner?.name === 'LinkedIn';
  const meWins = cpaWinner?.name === 'Meta';
  const goWins = cpaWinner?.name === 'Google Ads';
  const bestChannel = cpaWinner?.name ?? '—';

  // Previous period computation
  const { prevFrom, prevTo } = useMemo(() => {
    if (!compareEnabled || !dateFrom || !dateTo) return { prevFrom: '', prevTo: '' };
    const fromD = new Date(dateFrom + 'T00:00:00');
    const toD = new Date(dateTo + 'T00:00:00');
    const dur = toD.getTime() - fromD.getTime();
    const pTo = new Date(fromD.getTime() - 86400000);
    const pFrom = new Date(pTo.getTime() - dur);
    return { prevFrom: fmt(pFrom), prevTo: fmt(pTo) };
  }, [compareEnabled, dateFrom, dateTo]);

  const prevRows = useMemo(() => {
    if (!compareEnabled || !prevFrom || !prevTo) return [] as CampaignRow[];
    return rows.filter((r) =>
      r.date >= prevFrom && r.date <= prevTo &&
      (selectedCampaigns.size === 0 || selectedCampaigns.has(r.campaign_name))
    );
  }, [compareEnabled, rows, prevFrom, prevTo, selectedCampaigns]);

  const prevTotals = useMemo(() => sumRows(prevRows), [prevRows]);
  const prevOverallCpa = prevTotals.conversions > 0 ? prevTotals.spend / prevTotals.conversions : null;

  function delta(cur: number, prev: number): number | null {
    if (prev === 0) return null;
    return (cur - prev) / prev;
  }

  // Objective auto-detection
  const autoObjective = useMemo(() => autoDetectObjective([...selectedCampaigns]), [selectedCampaigns]);
  const effectiveObjective: Objective = manualObjective ?? autoObjective;

  // Per-platform campaign lists for the sidebar
  const liCampaigns = useMemo(() =>
    [...new Set(rows.filter((r) => r.platform === 'linkedin').map((r) => r.campaign_name))].sort(),
    [rows],
  );
  const meCampaigns = useMemo(() =>
    [...new Set(rows.filter((r) => r.platform === 'meta').map((r) => r.campaign_name))].sort(),
    [rows],
  );
  const goCampaigns = useMemo(() =>
    [...new Set(rows.filter((r) => r.platform === 'google').map((r) => r.campaign_name))].sort(),
    [rows],
  );

  // ── Preset button helper ───────────────────────────────────────────────────
  const presets: { key: Preset; label: string }[] = [
    { key: 'week', label: 'Deze week' },
    { key: '14days', label: '14 dagen' },
    { key: 'month', label: 'Deze maand' },
    { key: '3months', label: '3 maanden' },
    { key: 'custom', label: 'Aangepast' },
  ];

  // ── Comparison table rows ─────────────────────────────────────────────────
  const comparisonRows: Array<{ label: string; li: string; me: string; go: string; liR: number; meR: number; goR: number; lower?: boolean; neutral?: boolean }> = [
    { label: 'Budget', li: fmtEur(liTotals.spend), me: fmtEur(meTotals.spend), go: fmtEur(goTotals.spend), liR: liTotals.spend, meR: meTotals.spend, goR: goTotals.spend, neutral: true },
    { label: 'CPM', li: liCpm > 0 ? fmtEur(liCpm) : '—', me: meCpm > 0 ? fmtEur(meCpm) : '—', go: goCpm > 0 ? fmtEur(goCpm) : '—', liR: liCpm, meR: meCpm, goR: goCpm, lower: true },
    { label: 'Impressies', li: fmtNum(liTotals.impressions), me: fmtNum(meTotals.impressions), go: fmtNum(goTotals.impressions), liR: liTotals.impressions, meR: meTotals.impressions, goR: goTotals.impressions },
    { label: 'Clicks', li: fmtNum(liTotals.clicks), me: fmtNum(meTotals.clicks), go: fmtNum(goTotals.clicks), liR: liTotals.clicks, meR: meTotals.clicks, goR: goTotals.clicks },
    { label: 'CTR', li: fmtPct(liCtr), me: fmtPct(meCtr), go: fmtPct(goCtr), liR: liCtr, meR: meCtr, goR: goCtr },
    { label: 'Kosten/klik', li: liCpc > 0 ? fmtEur(liCpc) : '—', me: meCpc > 0 ? fmtEur(meCpc) : '—', go: goCpc > 0 ? fmtEur(goCpc) : '—', liR: liCpc, meR: meCpc, goR: goCpc, lower: true },
    { label: 'Sollicitanten', li: fmtNum(liTotals.conversions), me: fmtNum(meTotals.conversions), go: fmtNum(goTotals.conversions), liR: liTotals.conversions, meR: meTotals.conversions, goR: goTotals.conversions },
    { label: 'Kosten/soll.', li: liCpa != null ? fmtEur(liCpa) : '—', me: meCpa != null ? fmtEur(meCpa) : '—', go: goCpa != null ? fmtEur(goCpa) : '—', liR: liCpa ?? 0, meR: meCpa ?? 0, goR: goCpa ?? 0, lower: true },
  ];

  const NAV_TABS: { key: Tab; label: string }[] = [
    { key: 'ads', label: 'Advertenties' },
    { key: 'analyse', label: 'Analyse' },
    { key: 'sollicitaties', label: 'Sollicitaties' },
    { key: 'ga4', label: 'GA4 — Website' },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen" style={{ background: '#F0F4F8' }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-white" style={{ borderBottom: '1px solid #DCE0E6' }}>
        <div className="max-w-[1280px] mx-auto px-6 h-16 grid items-center" style={{ gridTemplateColumns: '1fr auto 1fr' }}>

          {/* Logo — left */}
          <span
            className="gf-display text-lg"
            style={{ color: '#0B1020', letterSpacing: '-0.02em' }}
          >
            Dashboard <span style={{ color: '#1E3A8A', fontWeight: 700 }}>demo</span>
          </span>

          {/* Nav — center */}
          <nav className="flex items-center">
            {NAV_TABS.map(({ key, label }) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className="relative h-16 px-6 text-sm transition-colors"
                  style={{
                    fontWeight: active ? 700 : 500,
                    color: active ? '#0B1020' : '#8C9BAF',
                    letterSpacing: '-0.01em',
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = '#555E6C'; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = '#8C9BAF'; }}
                >
                  {label}
                  {active && (
                    <span
                      className="absolute bottom-0 left-4 right-4"
                      style={{ height: '2px', background: '#1E3A8A', borderRadius: '2px 2px 0 0' }}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Spacer — right (Vernieuwen is n.v.t. voor mock-data) */}
          <div className="flex justify-end" />

        </div>
      </header>

      {/* ── Filters bar (sticky below header) ───────────────────── */}
      <div className="sticky top-16 z-10 bg-white" style={{ borderBottom: '1px solid #DCE0E6' }}>
        <div className="max-w-[1280px] mx-auto px-6">

          {/* Period presets */}
          <div className="flex flex-wrap items-center gap-2 py-3">
            <span className="gf-eyebrow mr-1 hidden sm:inline-flex">Periode</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {presets.map(({ key, label }) => {
                const active = preset === key;
                return (
                  <button
                    key={key}
                    onClick={() => setPreset(key)}
                    className="text-xs font-semibold px-3 py-1.5 transition-all"
                    style={{
                      borderRadius: '4px',
                      background: active ? '#1E3A8A' : '#ffffff',
                      color: active ? '#ffffff' : '#555E6C',
                      border: `1px solid ${active ? '#1E3A8A' : '#DCE0E6'}`,
                    }}
                  >
                    {label}
                  </button>
                );
              })}

              {preset === 'custom' && (
                <div className="flex items-center gap-1.5 ml-1">
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="text-xs px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                    style={{ border: '1px solid #DCE0E6', borderRadius: '4px', color: '#0B1020' }}
                  />
                  <span className="text-xs" style={{ color: '#8C9BAF' }}>t/m</span>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="text-xs px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                    style={{ border: '1px solid #DCE0E6', borderRadius: '4px', color: '#0B1020' }}
                  />
                </div>
              )}
            </div>

            {preset !== 'custom' && dateFrom && (
              <span className="text-xs ml-2" style={{ color: '#BCC4CF' }}>
                {new Date(dateFrom + 'T00:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                {' '}–{' '}
                {new Date(dateTo + 'T00:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            )}

            {/* Compare toggle */}
            <button
              onClick={() => setCompareEnabled((c) => !c)}
              className="text-xs font-semibold px-3 py-1.5 transition-all"
              style={{
                borderRadius: '4px',
                background: compareEnabled ? '#1E3A8A14' : '#ffffff',
                color: compareEnabled ? '#1E3A8A' : '#555E6C',
                border: `1px solid ${compareEnabled ? '#1E3A8A' : '#DCE0E6'}`,
              }}
            >
              ↔ Vergelijk
            </button>

            {compareEnabled && prevFrom && (
              <span className="text-xs ml-1" style={{ color: '#8C9BAF' }}>
                vs. {prevFrom} – {prevTo}
              </span>
            )}

            {/* Data freshness */}
            {datasetMax && (
              <span
                className="text-xs ml-auto flex items-center gap-1.5"
                style={{ color: '#8C9BAF' }}
                title="Meest recente dag met data in de (demo)bron"
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#16A34A' }} />
                Data t/m {new Date(datasetMax + 'T00:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>

          {/* In-tab section navigation (Advertenties only) */}
          {tab === 'ads' && (
            <div className="flex items-center gap-1.5 pb-3 overflow-x-auto">
              {([
                ['overzicht', 'Overzicht'],
                ['kanalen', 'Kanalen'],
                ['campagnes', 'Campagnes'],
              ] as [string, string][]).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className="text-xs font-semibold px-2.5 py-1 whitespace-nowrap transition-colors"
                  style={{ borderRadius: '4px', background: '#F0F4F8', color: '#555E6C' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#1E3A8A14'; e.currentTarget.style.color = '#1E3A8A'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#F0F4F8'; e.currentTarget.style.color = '#555E6C'; }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* ── Main content ────────────────────────────────────────────── */}
      <div className="max-w-[1280px] mx-auto px-6 py-8">

        {/* ══════════════════════════════════════════════════════════ */}
        {/* TAB: ADVERTENTIES                                          */}
        {/* ══════════════════════════════════════════════════════════ */}
        {tab === 'ads' && (
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            <CampaignSidebar
              open={sidebarOpen}
              onToggle={() => setSidebarOpen((o) => !o)}
              liCampaigns={liCampaigns}
              meCampaigns={meCampaigns}
              goCampaigns={goCampaigns}
              selected={selectedCampaigns}
              onSelect={setSelectedCampaigns}
              runningCampaigns={runningCampaigns}
              autoObjective={autoObjective}
              manualObjective={manualObjective}
              onObjective={setManualObjective}
            />
            <div style={{ flex: 1, minWidth: 0 }} className="space-y-10">

              {/* Top KPIs */}
              <section id="overzicht" className="scroll-mt-[150px]">
                <h2 className="gf-eyebrow mb-5">Totaaloverzicht</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <KpiCard
                    title="Budget gespendeerd"
                    value={fmtEur(totals.spend)}
                    subtitle="Alle kanalen"
                    delta={compareEnabled ? delta(totals.spend, prevTotals.spend) : null}
                    deltaInverted={false}
                  />
                  <KpiCard
                    title="Totaal sollicitanten"
                    value={fmtNum(totals.conversions)}
                    subtitle="LinkedIn · Meta · Google Ads"
                    delta={compareEnabled ? delta(totals.conversions, prevTotals.conversions) : null}
                    deltaInverted={false}
                  />
                  <KpiCard
                    title="Kosten per sollicitant"
                    value={overallCpa !== null ? fmtEur(overallCpa) : '—'}
                    subtitle="Spend ÷ conversies"
                    delta={compareEnabled && overallCpa !== null && prevOverallCpa !== null ? delta(overallCpa, prevOverallCpa) : null}
                    deltaInverted={true}
                  />
                  <KpiCard
                    title="Beste kanaal"
                    value={bestChannel}
                    accent={bestChannel !== '—'}
                    subtitle={bestChannel !== '—' && isFinite(minCpa) ? `Laagste CPA: ${fmtEur(minCpa)}` : 'Geen conversiedata'}
                  />
                </div>
              </section>

              {/* Channel comparison */}
              <section id="kanalen" className="scroll-mt-[150px]">
                <h2 className="gf-eyebrow mb-5">Kanaalvergelijking</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <ChannelCard platform="linkedin" spend={liTotals.spend} applicants={liTotals.conversions} clicks={liTotals.clicks} impressions={liTotals.impressions} thruplays={liTotals.thruplays ?? 0}
                    isWinner={liWins} objective={effectiveObjective} spendMissing={false} />
                  <ChannelCard platform="meta" spend={meTotals.spend} applicants={meTotals.conversions} clicks={meTotals.clicks} impressions={meTotals.impressions} thruplays={meTotals.thruplays ?? 0}
                    isWinner={meWins} objective={effectiveObjective} spendMissing={false} />
                  <ChannelCard platform="google" spend={goTotals.spend} applicants={goTotals.conversions} clicks={goTotals.clicks} impressions={goTotals.impressions} thruplays={goTotals.thruplays ?? 0}
                    isWinner={goWins} objective={effectiveObjective} spendMissing={false} />
                </div>

                <div className="bg-white overflow-hidden" style={{ border: '1px solid #DCE0E6', borderRadius: '8px', boxShadow: '0 8px 24px rgba(18,16,34,0.08)' }}>
                  <table className="w-full">
                    <thead style={{ background: '#F0F4F8', borderBottom: '1px solid #DCE0E6' }}>
                      <tr>
                        <th className="py-3 px-4 text-left text-xs font-bold uppercase tracking-wider w-36" style={{ color: '#8C9BAF' }}>Metric</th>
                        <th className="py-3 px-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#0077B5' }}>LinkedIn</th>
                        <th className="py-3 px-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#1877F2' }}>Meta</th>
                        <th className="py-3 px-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#F59E0B' }}>Google Ads</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonRows.map(({ label, li, me, go, liR, meR, goR, lower, neutral }) => {
                        const best = lower
                          ? Math.min(...[liR, meR, goR].filter(Boolean))
                          : Math.max(liR, meR, goR);
                        const win = (v: number) => !neutral && v === best && v > 0;
                        return (
                          <tr key={label} style={{ borderBottom: '1px solid #F0F4F8' }} className="last:border-0">
                            <td className="py-3 px-4 text-xs font-medium" style={{ color: '#555E6C' }}>{label}</td>
                            {([li, me, go] as string[]).map((val, i) => {
                              const raw = [liR, meR, goR][i] as number;
                              return (
                                <td key={i} className="py-3 px-4 text-sm tabular-nums font-semibold" style={{ color: win(raw) ? '#16A34A' : '#0B1020' }}>
                                  {win(raw) && <span className="mr-1" style={{ color: '#16A34A' }}>✓</span>}
                                  {val}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Campaign table */}
              <section id="campagnes" className="scroll-mt-[150px]">
                <h2 className="gf-eyebrow mb-5">Campagnes</h2>
                <CampaignRankTable rows={filteredRows} objective={effectiveObjective} />
              </section>

            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* Overige tabs — placeholder, buiten scope van deze demo      */}
        {/* ══════════════════════════════════════════════════════════ */}
        {tab !== 'ads' && (
          <div
            className="bg-white flex flex-col items-center justify-center text-center gap-2 py-24"
            style={{ border: '1px solid #DCE0E6', borderRadius: '8px' }}
          >
            <p className="gf-eyebrow">{NAV_TABS.find((t) => t.key === tab)?.label}</p>
            <p className="text-sm" style={{ color: '#8C9BAF' }}>Binnenkort beschikbaar in deze demo.</p>
          </div>
        )}

      </div>

    </main>
  );
}
