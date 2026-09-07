'use client';

import { Fragment } from 'react';
import { awarenessFromVolumes, costFor, ratio } from '@/types/results';
import type { MetricPairDef, SpendVolumes } from '@/types/results';
import { fmtDecimal, fmtEur, fmtNum, fmtPct } from '@/lib/format';

interface Entity {
  label: string;
  metrics: SpendVolumes;
}

interface Props {
  labelHeader: string; // bv. "Campaign Name", "Ad Set Name", "Ad Name", "Day"
  entities: Entity[];
  metricPairs: MetricPairDef[]; // extra metrics — Bekendheid komt er altijd apart bij
  maxHeight?: string; // voor lange lijsten (bv. dagelijkse data) een scrollbare body
}

function fmtOrDash(v: number | null, fmt: (n: number) => string) {
  return v === null ? '—' : fmt(v);
}

// Eén rij per entiteit (campagne/doelgroep/advertentie/dag) — alleen achieved-stijl
// cijfers, geen KPI-kolom. Dezelfde metric-kolommen als "Resultaten per kanaal &
// campagne", zodat de niveaus onderling vergelijkbaar blijven.
export default function MetricsFlatTable({ labelHeader, entities, metricPairs, maxHeight }: Props) {
  return (
    <div className="bg-white overflow-x-auto" style={{ border: '1px solid #DCE0E6', borderRadius: '8px', boxShadow: '0 8px 24px rgba(18,16,34,0.08)' }}>
      <div className={maxHeight ? 'overflow-y-auto' : ''} style={maxHeight ? { maxHeight } : undefined}>
        <table className="w-full" style={{ minWidth: '760px' }}>
          <thead style={{ background: '#F0F4F8', borderBottom: '1px solid #DCE0E6', position: maxHeight ? 'sticky' : undefined, top: 0 }}>
            <tr>
              <th className="py-3 px-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#8C9BAF' }}>{labelHeader}</th>
              <th className="py-3 px-2 text-right text-xs font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: '#8C9BAF' }}>Amount spent</th>
              <th className="py-3 px-2 text-right text-xs font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: '#8C9BAF' }}>Impressies</th>
              <th className="py-3 px-2 text-right text-xs font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: '#8C9BAF' }}>Bereik</th>
              <th className="py-3 px-2 text-right text-xs font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: '#8C9BAF' }}>Frequentie</th>
              <th className="py-3 px-2 text-right text-xs font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: '#8C9BAF' }}>CPM</th>
              {metricPairs.map((p) => (
                <Fragment key={p.key}>
                  <th className="py-3 px-2 text-right text-xs font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: '#8C9BAF' }}>{p.costLabel}</th>
                  <th className="py-3 px-2 text-right text-xs font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: '#8C9BAF' }}>{p.volumeLabel}</th>
                  {p.rateLabel && (
                    <th className="py-3 px-2 text-right text-xs font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: '#8C9BAF' }}>{p.rateLabel}</th>
                  )}
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {entities.map((e, i) => {
              const a = awarenessFromVolumes(e.metrics);
              return (
                <tr key={`${e.label}-${i}`} style={{ borderBottom: '1px solid #F0F4F8' }} className="last:border-0">
                  <td className="px-3 py-2 text-xs font-medium whitespace-nowrap" style={{ color: '#0B1020' }}>{e.label}</td>
                  <td className="px-2 py-2 text-right text-xs tabular-nums font-semibold" style={{ color: '#0B1020' }}>{fmtEur(e.metrics.spend)}</td>
                  <td className="px-2 py-2 text-right text-xs tabular-nums font-semibold" style={{ color: '#0B1020' }}>{fmtNum(a.impressions)}</td>
                  <td className="px-2 py-2 text-right text-xs tabular-nums" style={{ color: '#555E6C' }}>{fmtNum(a.reach)}</td>
                  <td className="px-2 py-2 text-right text-xs tabular-nums" style={{ color: '#555E6C' }}>{fmtOrDash(a.frequency, fmtDecimal)}</td>
                  <td className="px-2 py-2 text-right text-xs tabular-nums" style={{ color: '#555E6C' }}>{fmtOrDash(a.cpm, fmtEur)}</td>
                  {metricPairs.map((p) => (
                    <Fragment key={p.key}>
                      <td className="px-2 py-2 text-right text-xs tabular-nums" style={{ color: '#555E6C' }}>{fmtOrDash(costFor(e.metrics, p), fmtEur)}</td>
                      <td className="px-2 py-2 text-right text-xs tabular-nums font-semibold" style={{ color: '#0B1020' }}>{fmtNum(e.metrics.volumes[p.key] ?? 0)}</td>
                      {p.rateLabel && (
                        <td className="px-2 py-2 text-right text-xs tabular-nums" style={{ color: '#555E6C' }}>{fmtOrDash(ratio(e.metrics, p.key, 'impressions'), fmtPct)}</td>
                      )}
                    </Fragment>
                  ))}
                </tr>
              );
            })}
            {entities.length === 0 && (
              <tr><td colSpan={5 + metricPairs.length * 3} className="px-3 py-6 text-center text-xs" style={{ color: '#8C9BAF' }}>Geen data</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
