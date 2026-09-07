import type { ChannelResultRow, Pacing } from '@/types/results';

// Seed-data — realistische demo-cijfers voor een video-awareness-achtige campagne
// (Meta/Youtube/LinkedIn × Skill ads/EBV/Extra video's). Achieved = wat er gebeurd is
// (straks ingeladen vanuit campagnetooling); KPI = budget + kosten-targets per metric.
// Bekendheid (impressions/reach/frequency/CPM) staat voor elke rij altijd aan.
// activePairKeys bepaalt welke doel-bundels (Verkeer/Views/Leads) verder meetellen —
// "Meta — Extra video's" toont bewust Verkeer + Leads i.p.v. het standaard Views,
// als voorbeeld dat dit per campagne verschilt.
export const SEED_RESULT_ROWS: ChannelResultRow[] = [
  {
    id: 'row-1', kanaal: 'Meta', campagne: 'Skill ads',
    achieved: { spend: 2750.80, volumes: { impressions: 445424, reach: 222712, clicks: 504, completedViews: 11044 } },
    kpi: { spend: 4200, costs: { impressions: 4.20, clicks: 3.50, completedViews: 0.05 }, frequency: 2.2 },
    activePairKeys: ['clicks', 'completedViews'],
    comments: [
      { date: '2026-02-13', text: 'Meeste budget gaat uit naar Samenwerken.' },
      { date: '2026-03-19', text: 'Resultaten zijn achteruit gegaan. Samenwerken weer aangezet.' },
      { date: '2026-05-12', text: 'Niet meer sturen op max volume maar op bid. Kosten per resultaat ingesteld op €0,05.' },
      { date: '2026-07-03', text: 'Q3 toegevoegd plus budget aangepast.' },
    ],
  },
  {
    id: 'row-2', kanaal: 'Youtube', campagne: 'Skill ads',
    achieved: { spend: 1025.61, volumes: { impressions: 520889, reach: 260445, clicks: 0, completedViews: 7423 } },
    kpi: { spend: 1700, costs: { impressions: 1.70, clicks: 0, completedViews: 0.07 }, frequency: 2.2 },
    activePairKeys: ['clicks', 'completedViews'],
    comments: [],
  },
  {
    id: 'row-3', kanaal: 'LinkedIn', campagne: 'Skill ads',
    achieved: { spend: 2176.44, volumes: { impressions: 106758, reach: 53379, clicks: 398, completedViews: 1729 } },
    kpi: { spend: 3400, costs: { impressions: 21.00, clicks: 3.10, completedViews: 0.55 }, frequency: 2.2 },
    activePairKeys: ['clicks', 'completedViews'],
    comments: [],
  },
  {
    id: 'row-4', kanaal: 'Meta', campagne: 'EBV',
    achieved: { spend: 2141.95, volumes: { impressions: 375019, reach: 187510, clicks: 312, completedViews: 11649 } },
    kpi: { spend: 3700, costs: { impressions: 4.35, clicks: 8.35, completedViews: 0.30 }, frequency: 2.2 },
    activePairKeys: ['clicks', 'completedViews'],
    comments: [],
  },
  {
    id: 'row-5', kanaal: 'Youtube', campagne: 'EBV',
    achieved: { spend: 1749.79, volumes: { impressions: 400637, reach: 200319, clicks: 54, completedViews: 224357 } },
    kpi: { spend: 2800, costs: { impressions: 6.75, clicks: 17.00, completedViews: 0.01 }, frequency: 2.2 },
    activePairKeys: ['clicks', 'completedViews'],
    comments: [],
  },
  {
    id: 'row-6', kanaal: 'LinkedIn', campagne: 'EBV',
    achieved: { spend: 1386.70, volumes: { impressions: 71062, reach: 35531, clicks: 291, completedViews: 692 } },
    kpi: { spend: 2400, costs: { impressions: 20.20, clicks: 3.30, completedViews: 2.40 }, frequency: 2.2 },
    activePairKeys: ['clicks', 'completedViews'],
    comments: [],
  },
  {
    id: 'row-7', kanaal: 'Meta', campagne: "Extra video's",
    achieved: { spend: 3087.69, volumes: { impressions: 570836, reach: 285418, clicks: 1158, conversions: 45 } },
    kpi: { spend: 4000, costs: { impressions: 3.00, clicks: 6.00, conversions: 60 }, frequency: 2.2 },
    activePairKeys: ['clicks', 'conversions'],
    comments: [],
  },
  {
    id: 'row-8', kanaal: 'Youtube', campagne: "Extra video's",
    achieved: { spend: 1398.68, volumes: { impressions: 348350, reach: 174175, clicks: 61, completedViews: 658382 } },
    kpi: { spend: 2300, costs: { impressions: 5.00, clicks: 8.00, completedViews: 0.008 }, frequency: 2.2 },
    activePairKeys: ['clicks', 'completedViews'],
    comments: [],
  },
  {
    id: 'row-9', kanaal: 'LinkedIn', campagne: "Extra video's",
    achieved: { spend: 1656.78, volumes: { impressions: 85856, reach: 42928, clicks: 410, completedViews: 1222 } },
    kpi: { spend: 3200, costs: { impressions: 20.20, clicks: 3.30, completedViews: 2.40 }, frequency: 2.2 },
    activePairKeys: ['clicks', 'completedViews'],
    comments: [],
  },
];

export const SEED_PACING: Pacing = {
  startDate: '2026-04-14',
  endDate: '2026-08-30',
};
