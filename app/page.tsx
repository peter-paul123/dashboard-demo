'use client';

import { useState, useEffect, useMemo } from 'react';
import PacingSummary from '@/components/PacingSummary';
import TotalsResultsTable from '@/components/TotalsResultsTable';
import ResultsPerChannelTable from '@/components/ResultsPerChannelTable';
import MetricPairManager from '@/components/MetricPairManager';
import KanalenTab from '@/components/KanalenTab';
import AnalyseTab from '@/components/AnalyseTab';
import type { ChannelResultRow, MetricPairDef, Pacing } from '@/types/results';
import { DEFAULT_METRIC_PAIRS, kpiToSpendVolumes, sumSpendVolumes } from '@/types/results';
import { SEED_RESULT_ROWS, SEED_PACING } from '@/lib/seedResults';

type Tab = 'totaal' | 'kanalen' | 'analyse' | 'ga4';

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  // Navigation
  const [tab, setTab] = useState<Tab>('totaal');

  // Totaaloverzicht — bewerkbare resultaten-per-kanaal + budget/pacing (persisted).
  // "_v2" omdat het datamodel (achieved.volumes / kpi.costs) niet compatibel is met
  // een eerdere opzet — zo laadt een oude cache niet per ongeluk een verkeerde vorm.
  //
  // Server en client renderen bij hydratie allebei de seed-data — pas ná mount
  // (useEffect hieronder) wordt eventueel opgeslagen state ingeladen. Zo lezen we
  // localStorage nooit al tijdens de allereerste render, wat een hydration-mismatch
  // zou geven zodra de opgeslagen data van de seed afwijkt (bv. na een toegevoegde rij).
  const [resultRows, setResultRows] = useState<ChannelResultRow[]>(SEED_RESULT_ROWS);
  const [pacing, setPacing] = useState<Pacing>(SEED_PACING);
  const [metricPairs, setMetricPairs] = useState<MetricPairDef[]>(DEFAULT_METRIC_PAIRS);
  const [hasLoadedPersisted, setHasLoadedPersisted] = useState(false);

  useEffect(() => {
    try {
      const savedRows = localStorage.getItem('demo_results_rows_v4');
      if (savedRows) setResultRows(JSON.parse(savedRows) as ChannelResultRow[]);
      const savedPacing = localStorage.getItem('demo_pacing_v2');
      if (savedPacing) setPacing(JSON.parse(savedPacing) as Pacing);
      const savedMetrics = localStorage.getItem('demo_metric_pairs_v3');
      if (savedMetrics) setMetricPairs(JSON.parse(savedMetrics) as MetricPairDef[]);
    } catch { /* ignore */ }
    setHasLoadedPersisted(true);
  }, []);

  // Pas opslaan zodra de opgeslagen state is ingeladen — anders overschrijft de
  // seed-waarde (die er tijdens de eerste render even in staat) je eigen data.
  useEffect(() => { if (hasLoadedPersisted) localStorage.setItem('demo_results_rows_v4', JSON.stringify(resultRows)); }, [resultRows, hasLoadedPersisted]);
  useEffect(() => { if (hasLoadedPersisted) localStorage.setItem('demo_pacing_v2', JSON.stringify(pacing)); }, [pacing, hasLoadedPersisted]);
  useEffect(() => { if (hasLoadedPersisted) localStorage.setItem('demo_metric_pairs_v3', JSON.stringify(metricPairs)); }, [metricPairs, hasLoadedPersisted]);

  const resultsAchievedSpend = useMemo(
    () => resultRows.reduce((sum, r) => sum + r.achieved.spend, 0),
    [resultRows],
  );

  // Totaal mediaspend-target = som van alle kanaal-KPI-budgetten (bepaalt ook
  // "Totaal mediaspend" in het Budget & pacing-blok — zie PacingSummary).
  const resultsKpiSpend = useMemo(
    () => sumSpendVolumes(resultRows.map((r) => kpiToSpendVolumes(r.kpi, metricPairs))).spend,
    [resultRows, metricPairs],
  );

  // Alleen de doel-bundels tonen die door minstens één campagne worden gebruikt.
  const activeUnion = useMemo(
    () => metricPairs.filter((p) => resultRows.some((r) => r.activePairKeys.includes(p.key))),
    [metricPairs, resultRows],
  );

  const NAV_TABS: { key: Tab; label: string }[] = [
    { key: 'totaal', label: 'Totaaloverzicht' },
    { key: 'kanalen', label: 'Kanalen' },
    { key: 'analyse', label: 'Analyse' },
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

      {/* ── Main content ────────────────────────────────────────────── */}
      <div className="max-w-[1280px] mx-auto px-6 py-8">

        {/* ══════════════════════════════════════════════════════════ */}
        {/* TAB: TOTAALOVERZICHT — los van periode/campagnekeuze         */}
        {/* ══════════════════════════════════════════════════════════ */}
        {tab === 'totaal' && (
          <div className="space-y-8">
            <div>
              <h2 className="gf-eyebrow mb-5">Budget &amp; voortgang</h2>
              <PacingSummary pacing={pacing} onChange={setPacing} achievedSpend={resultsAchievedSpend} kpiSpendTotal={resultsKpiSpend} />
            </div>
            <div>
              <h2 className="gf-eyebrow mb-5">Totaalresultaten — alle kanalen</h2>
              <TotalsResultsTable rows={resultRows} metricPairs={activeUnion} />
            </div>
            <div>
              <h2 className="gf-eyebrow mb-5">Resultaten per kanaal &amp; campagne</h2>
              <MetricPairManager catalog={metricPairs} onChange={setMetricPairs} />
              <ResultsPerChannelTable rows={resultRows} onChange={setResultRows} metricPairs={metricPairs} />
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* TAB: KANALEN — drill-down per kanaal/advertentie             */}
        {/* ══════════════════════════════════════════════════════════ */}
        {tab === 'kanalen' && (
          <KanalenTab
            resultRows={resultRows}
            metricPairs={metricPairs}
            pacing={pacing}
            onChangeRows={setResultRows}
            onChangePacing={setPacing}
          />
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* TAB: ANALYSE — zelf samen te stellen grafiek                 */}
        {/* ══════════════════════════════════════════════════════════ */}
        {tab === 'analyse' && (
          <AnalyseTab resultRows={resultRows} metricPairs={metricPairs} pacing={pacing} />
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* TAB: GA4 — placeholder, buiten scope van deze demo           */}
        {/* ══════════════════════════════════════════════════════════ */}
        {tab === 'ga4' && (
          <div
            className="bg-white flex flex-col items-center justify-center text-center gap-2 py-24"
            style={{ border: '1px solid #DCE0E6', borderRadius: '8px' }}
          >
            <p className="gf-eyebrow">GA4 — Website</p>
            <p className="text-sm" style={{ color: '#8C9BAF' }}>Binnenkort beschikbaar in deze demo.</p>
          </div>
        )}

      </div>

    </main>
  );
}
