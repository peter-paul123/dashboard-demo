import type { ChannelResultRow, Pacing, SpendVolumes } from '@/types/results';
import { sumSpendVolumes } from '@/types/results';
import { fmt } from '@/lib/dateHelpers';

// Deterministische demo-opsplitsing van een rij's achieved-totaal naar diepere
// niveaus (doelgroep → advertentie → dag). Elke opsplitsing telt exact op tot
// het brontotaal — zodra hier een echte koppeling met campagnetooling komt,
// vervangt die deze generator 1-op-1, zonder dat de rest van de UI verandert.

export interface DrilldownEntity {
  name: string;
  metrics: SpendVolumes;
}

export interface DailyEntity {
  date: string;
  metrics: SpendVolumes;
}

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h || 1;
}

function normalizedWeights(n: number, rand: () => number): number[] {
  const raw = Array.from({ length: n }, () => 0.3 + rand());
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map((w) => w / sum);
}

// Splitst een totaal in n delen — elk veld (spend + elke volume-key) krijgt zijn
// eigen willekeurige verdeling, zodat kosten-per-x niet voor elk deel identiek is.
function splitSpendVolumes(total: SpendVolumes, n: number, seed: number): SpendVolumes[] {
  const rand = mulberry32(seed);
  const spendW = normalizedWeights(n, rand);
  const volumeKeys = Object.keys(total.volumes);
  const volumeW: Record<string, number[]> = {};
  for (const k of volumeKeys) volumeW[k] = normalizedWeights(n, rand);

  return Array.from({ length: n }, (_, i) => ({
    spend: total.spend * spendW[i],
    volumes: Object.fromEntries(volumeKeys.map((k) => [k, total.volumes[k] * volumeW[k][i]])),
  }));
}

const AD_SET_NAMES = [
  'Overwicht', '(LAL) Overwicht',
  'Samenwerken', '(LAL) Samenwerken',
  'Forensische scherpte', '(LAL) Forensische scherpte',
];

export function generateAdSets(row: ChannelResultRow): DrilldownEntity[] {
  const splits = splitSpendVolumes(row.achieved, AD_SET_NAMES.length, hashSeed(`${row.id}:adsets`));
  return AD_SET_NAMES.map((name, i) => ({ name, metrics: splits[i] }));
}

export function generateAds(rowId: string, adSet: DrilldownEntity): DrilldownEntity[] {
  const splits = splitSpendVolumes(adSet.metrics, 2, hashSeed(`${rowId}:${adSet.name}:ads`));
  return ['copy 1', 'copy 2'].map((suffix, i) => ({ name: `${adSet.name} - ${suffix}`, metrics: splits[i] }));
}

// Dagelijkse spreiding tussen de campagne-startdatum en vandaag (of einddatum,
// wat eerder komt) — met een lichte weekend-dip, zoals een echte flight.
export function generateDailyRows(row: ChannelResultRow, pacing: Pacing): DailyEntity[] {
  if (!pacing.startDate) return [];
  const start = new Date(pacing.startDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endCandidate = pacing.endDate ? new Date(pacing.endDate + 'T00:00:00') : today;
  const end = endCandidate < today ? endCandidate : today;
  if (end < start) return [];

  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  const rand = mulberry32(hashSeed(`${row.id}:daily`));
  const dates: string[] = [];
  const rawWeights: number[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    rawWeights.push((weekend ? 0.6 : 1) * (0.7 + rand() * 0.6));
    dates.push(fmt(d));
  }
  const sumW = rawWeights.reduce((a, b) => a + b, 0);
  const weights = rawWeights.map((w) => w / sumW);

  return dates.map((date, i) => ({
    date,
    metrics: {
      spend: row.achieved.spend * weights[i],
      volumes: Object.fromEntries(Object.entries(row.achieved.volumes).map(([k, v]) => [k, v * weights[i]])),
    },
  }));
}

export type GroupBy = 'dag' | 'doelgroep' | 'advertentie' | 'campagne' | 'kanaal';

export interface GroupedEntity {
  label: string;
  metrics: SpendVolumes;
}

// Eén herbruikbare group-by voor de Analyse-tab — dezelfde bouwstenen die
// KanalenTab.tsx al gebruikt voor Doelgroep-/Advertentie-/Dagniveau, nu ook
// zelf te kiezen i.p.v. altijd alle vier tegelijk te tonen.
export function buildGroupedEntities(groupBy: GroupBy, rows: ChannelResultRow[], pacing: Pacing): GroupedEntity[] {
  const multi = rows.length > 1;

  if (groupBy === 'kanaal') {
    const kanalen = [...new Set(rows.map((r) => r.kanaal))];
    return kanalen.map((k) => ({ label: k, metrics: sumSpendVolumes(rows.filter((r) => r.kanaal === k).map((r) => r.achieved)) }));
  }

  if (groupBy === 'campagne') {
    return rows.map((r) => ({ label: `${r.kanaal} — ${r.campagne}`, metrics: r.achieved }));
  }

  if (groupBy === 'doelgroep') {
    return rows.flatMap((r) =>
      generateAdSets(r).map((a) => ({ label: multi ? `${r.campagne}: ${a.name}` : a.name, metrics: a.metrics }))
    );
  }

  if (groupBy === 'advertentie') {
    return rows.flatMap((r) =>
      generateAdSets(r).flatMap((a) => generateAds(r.id, a)).map((a) => ({ label: multi ? `${r.campagne}: ${a.name}` : a.name, metrics: a.metrics }))
    );
  }

  // 'dag' — alle rijen delen dezelfde campagne-pacing, dus dezelfde dagenreeks;
  // per dag optellen kan daarom simpelweg per index (zoals in KanalenTab.tsx).
  const dailyLists = rows.map((r) => generateDailyRows(r, pacing));
  return dailyLists[0]?.map((_, i) => ({
    label: dailyLists[0][i].date,
    metrics: sumSpendVolumes(dailyLists.map((list) => list[i].metrics)),
  })) ?? [];
}
