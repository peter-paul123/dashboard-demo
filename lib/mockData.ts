import type { CampaignRow, Platform } from '@/types/campaign';

// Deterministic pseudo-random generator (mulberry32) so the demo dataset is
// stable across renders/reloads without relying on Math.random().
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface CampaignDef {
  platform: Platform;
  name: string;
  seed: number;
  baseSpend: number;
  ctr: number;
  cvr: number;
  hasVideo?: boolean;
}

const CAMPAIGNS: CampaignDef[] = [
  { platform: 'linkedin', name: 'LinkedIn — Awareness Q3',        seed: 101, baseSpend: 140, ctr: 0.006, cvr: 0.03 },
  { platform: 'linkedin', name: 'LinkedIn — Conversies Vacatures', seed: 102, baseSpend: 210, ctr: 0.008, cvr: 0.06 },
  { platform: 'meta',     name: 'Meta — Video Employer Branding',  seed: 201, baseSpend: 180, ctr: 0.011, cvr: 0.02, hasVideo: true },
  { platform: 'meta',     name: 'Meta — Traffic Campagne',         seed: 202, baseSpend: 120, ctr: 0.014, cvr: 0.015 },
  { platform: 'google',   name: 'Google Ads — Search Brand',       seed: 301, baseSpend: 90,  ctr: 0.045, cvr: 0.09 },
  { platform: 'google',   name: 'Google Ads — Search Vacatures',   seed: 302, baseSpend: 160, ctr: 0.032, cvr: 0.07 },
];

function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Generates ~3 months of daily rows per campaign, ending "today". Deterministic
// per campaign seed, so the demo always shows the same numbers.
export function generateMockRows(days = 92): CampaignRow[] {
  const rows: CampaignRow[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const c of CAMPAIGNS) {
    const rand = mulberry32(c.seed);
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);

      // Weekends dip a bit; small day-to-day noise; slight upward trend over the window.
      const weekday = date.getDay();
      const weekendFactor = weekday === 0 || weekday === 6 ? 0.6 : 1;
      const trend = 1 + ((days - i) / days) * 0.15;
      const noise = 0.75 + rand() * 0.5;

      const spend = Math.round(c.baseSpend * weekendFactor * trend * noise * 100) / 100;
      const impressions = Math.round((spend / 8) * (800 + rand() * 400));
      const clicks = Math.round(impressions * c.ctr * (0.8 + rand() * 0.4));
      const conversions = Math.round(clicks * c.cvr * (0.7 + rand() * 0.6));
      const reach = Math.round(impressions * (0.55 + rand() * 0.2));
      const thruplays = c.hasVideo ? Math.round(impressions * (0.18 + rand() * 0.1)) : 0;

      rows.push({
        platform: c.platform,
        campaign_name: c.name,
        date: fmt(date),
        spend,
        impressions,
        clicks,
        conversions,
        reach,
        thruplays,
      });
    }
  }
  return rows;
}
