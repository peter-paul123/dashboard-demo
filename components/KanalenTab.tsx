'use client';

import { useEffect, useState } from 'react';
import PacingSummary from '@/components/PacingSummary';
import PacingChart from '@/components/PacingChart';
import TotalsResultsTable from '@/components/TotalsResultsTable';
import CommentsTable from '@/components/CommentsTable';
import MetricsFlatTable from '@/components/MetricsFlatTable';
import ComparisonTool from '@/components/ComparisonTool';
import type { ChannelResultRow, MetricPairDef, Pacing } from '@/types/results';
import { kpiToSpendVolumes, sumSpendVolumes } from '@/types/results';
import { generateAdSets, generateAds, generateDailyRows } from '@/lib/channelDrilldown';
import type { DailyEntity } from '@/lib/channelDrilldown';

interface Props {
  resultRows: ChannelResultRow[];
  metricPairs: MetricPairDef[]; // volledige catalogus
  pacing: Pacing;
  onChangeRows: (rows: ChannelResultRow[]) => void;
  onChangePacing: (p: Pacing) => void;
}

export default function KanalenTab({ resultRows, metricPairs, pacing, onChangeRows, onChangePacing }: Props) {
  const kanalen = [...new Set(resultRows.map((r) => r.kanaal))].sort();
  const [selectedKanaal, setSelectedKanaal] = useState<string>('');
  const [selectedCampagnes, setSelectedCampagnes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!selectedKanaal && kanalen.length > 0) {
      const k = kanalen[0];
      setSelectedKanaal(k);
      setSelectedCampagnes(new Set(resultRows.filter((r) => r.kanaal === k).map((r) => r.campagne)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kanalen, selectedKanaal]);

  const campagnesForKanaal = [...new Set(resultRows.filter((r) => r.kanaal === selectedKanaal).map((r) => r.campagne))].sort();

  function selectKanaal(k: string) {
    setSelectedKanaal(k);
    setSelectedCampagnes(new Set(resultRows.filter((r) => r.kanaal === k).map((r) => r.campagne)));
  }

  function toggleCampagne(name: string) {
    setSelectedCampagnes((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }

  const selectedRows = resultRows.filter((r) => r.kanaal === selectedKanaal && selectedCampagnes.has(r.campagne));
  // Alleen de doel-bundels tonen die door minstens één geselecteerde campagne worden gebruikt.
  const activePairs = metricPairs.filter((p) => selectedRows.some((r) => r.activePairKeys.includes(p.key)));
  const achievedSpend = selectedRows.reduce((s, r) => s + r.achieved.spend, 0);
  const kpiSpendTotal = sumSpendVolumes(selectedRows.map((r) => kpiToSpendVolumes(r.kpi, activePairs))).spend;
  const multi = selectedRows.length > 1;

  // Doelgroep-/advertentieniveau — demo-opsplitsing per geselecteerde campagne.
  const adSetEntities = selectedRows.flatMap((r) =>
    generateAdSets(r).map((a) => ({ label: multi ? `${r.campagne}: ${a.name}` : a.name, metrics: a.metrics }))
  );
  const adEntities = selectedRows.flatMap((r) =>
    generateAdSets(r).flatMap((a) => generateAds(r.id, a)).map((a) => ({ label: multi ? `${r.campagne}: ${a.name}` : a.name, metrics: a.metrics }))
  );

  // Alle geselecteerde rijen delen dezelfde campagne-pacing, dus hebben dezelfde
  // dagenreeks — per dag optellen kan daarom simpelweg per index.
  const dailyLists = selectedRows.map((r) => generateDailyRows(r, pacing));
  const dailyMerged: DailyEntity[] = dailyLists[0]?.map((_, i) => ({
    date: dailyLists[0][i].date,
    metrics: sumSpendVolumes(dailyLists.map((list) => list[i].metrics)),
  })) ?? [];

  return (
    <div className="space-y-8">
      {/* Kanaal- en campagnekeuze */}
      <div className="flex flex-wrap items-start gap-6">
        <div>
          <p className="gf-eyebrow mb-2">Kanaal</p>
          <select
            value={selectedKanaal}
            onChange={(e) => selectKanaal(e.target.value)}
            className="text-sm font-semibold px-3 py-2"
            style={{ border: '1px solid #DCE0E6', borderRadius: '6px', color: '#0B1020', background: '#ffffff' }}
          >
            {kanalen.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        {selectedKanaal && (
          <div>
            <p className="gf-eyebrow mb-2">Campagne(s)</p>
            <div className="flex flex-wrap gap-2">
              {campagnesForKanaal.map((name) => {
                const active = selectedCampagnes.has(name);
                return (
                  <button
                    key={name}
                    onClick={() => toggleCampagne(name)}
                    className="text-xs font-semibold px-3 py-1.5"
                    style={{
                      borderRadius: '5px',
                      background: active ? '#1E3A8A' : '#ffffff',
                      color: active ? '#ffffff' : '#555E6C',
                      border: `1px solid ${active ? '#1E3A8A' : '#DCE0E6'}`,
                    }}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {selectedRows.length === 0 ? (
        <p className="text-sm" style={{ color: '#8C9BAF' }}>Kies minstens één campagne om de resultaten te zien.</p>
      ) : (
        <>
          <h1 className="gf-display text-2xl" style={{ color: '#0B1020' }}>
            {selectedKanaal} {selectedRows.map((r) => r.campagne).join(' + ')}
          </h1>

          <div>
            <h2 className="gf-eyebrow mb-5">Budget &amp; pacing</h2>
            <div className="flex flex-wrap items-start gap-4">
              <PacingSummary pacing={pacing} onChange={onChangePacing} achievedSpend={achievedSpend} kpiSpendTotal={kpiSpendTotal} />
              <PacingChart dailyEntities={dailyMerged} pacing={pacing} kpiSpendTotal={kpiSpendTotal} />
            </div>
          </div>

          <div>
            <h2 className="gf-eyebrow mb-5">Resultaten</h2>
            <TotalsResultsTable rows={selectedRows} metricPairs={activePairs} />
          </div>

          <div>
            <h2 className="gf-eyebrow mb-5">Optimalisaties &amp; opvallendheden</h2>
            <CommentsTable rows={resultRows} selectedRowIds={selectedRows.map((r) => r.id)} onChange={onChangeRows} />
          </div>

          <div>
            <h2 className="gf-eyebrow mb-5">Campagne resultaten (totaal)</h2>
            <MetricsFlatTable
              labelHeader="Campaign Name"
              entities={selectedRows.map((r) => ({ label: `${r.kanaal} — ${r.campagne}`, metrics: r.achieved }))}
              metricPairs={activePairs}
            />
          </div>

          <div>
            <h2 className="gf-eyebrow mb-5">Doelgroepniveau</h2>
            <MetricsFlatTable labelHeader="Ad Set Name" entities={adSetEntities} metricPairs={activePairs} />
          </div>

          <div>
            <h2 className="gf-eyebrow mb-5">Advertentieniveau</h2>
            <MetricsFlatTable labelHeader="Ad Name" entities={adEntities} metricPairs={activePairs} />
          </div>

          <div>
            <h2 className="gf-eyebrow mb-5">Resultaten per dag</h2>
            <MetricsFlatTable
              labelHeader="Day"
              entities={dailyMerged.map((d) => ({ label: new Date(d.date + 'T00:00:00').toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }), metrics: d.metrics }))}
              metricPairs={activePairs}
              maxHeight="420px"
            />
          </div>

          <div>
            <h2 className="gf-eyebrow mb-5">Vergelijken op periode</h2>
            <ComparisonTool dailyEntities={dailyMerged} metricPairs={activePairs} />
          </div>
        </>
      )}
    </div>
  );
}
