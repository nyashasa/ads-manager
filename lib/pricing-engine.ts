import { FlightRequest, PricingEstimateResponse, Route, PricingModel, RouteBreakdown } from './types';

// Constants (Move to config/DB later)
const IMPRESSION_OPPORTUNITIES_PER_RIDE = 1.5;
const FILL_FACTOR = 0.8; // 80% utilization assumption

export function calculateDays(startDate: string, endDate: string, daysOfWeek: number[]): number {
      const start = new Date(startDate);
      const end = new Date(endDate);
      let count = 0;
      const cur = new Date(start);

      while (cur <= end) {
            if (daysOfWeek.includes(cur.getDay())) {
                  count++;
            }
            cur.setDate(cur.getDate() + 1);
      }
      return count;
}

export function calculateRouteImpressions(
      route: Route,
      days: number,
      sov: number
): number {
      return (
            route.estimated_daily_ridership *
            days *
            IMPRESSION_OPPORTUNITIES_PER_RIDE *
            sov *
            FILL_FACTOR
      );
}

export function calculateCPM(
      baseCpm: number,
      tierMultiplier: number = 1,
      placementMultiplier: number = 1,
      daypartMultiplier: number = 1
): number {
      return baseCpm * tierMultiplier * placementMultiplier * daypartMultiplier;
}

export function generateEstimate(
      flight: FlightRequest,
      routes: Route[],
      pricingModel: PricingModel
): PricingEstimateResponse {
      const days = calculateDays(flight.startDate, flight.endDate, flight.daysOfWeek);

      let totalImpressions = 0;
      let totalCost = 0;
      const breakdown: RouteBreakdown[] = [];

      // Multipliers
      const placementMultiplier = pricingModel.config.multipliers?.placement?.[flight.placementType] || 1;
      // Average daypart multiplier if multiple selected (simplification)
      const daypartMultipliers = flight.dayparts.map(dp => pricingModel.config.multipliers?.daypart?.[dp] || 1);
      const avgDaypartMultiplier = daypartMultipliers.reduce((a, b) => a + b, 0) / daypartMultipliers.length || 1;

      for (const route of routes) {
            const impressions = calculateRouteImpressions(route, days, flight.shareOfVoice);

            const baseCpm = pricingModel.config.base_cpm[route.tier] || 100; // Default fallback
            const cpm = calculateCPM(baseCpm, 1, placementMultiplier, avgDaypartMultiplier);

            const cost = (impressions / 1000) * cpm;

            totalImpressions += impressions;
            totalCost += cost;

            breakdown.push({
                  routeId: route.id,
                  impressions: Math.round(impressions),
                  estimatedCost: Math.round(cost),
            });
      }

      // Reach estimation (Simplified: 80% of impressions are unique riders for now, can be refined)
      const estimatedReach = Math.round(totalImpressions / (IMPRESSION_OPPORTUNITIES_PER_RIDE * calculateDays(flight.startDate, flight.endDate, flight.daysOfWeek) * 0.5));
      // Actually, a better simple reach calc might be: sum(daily_riders) * unique_factor
      // Let's stick to the spec's "Derived Values" section implies reach is separate.
      // For V1, let's approximate reach as: Total Daily Riders * Reach Factor (e.g. 1.2x for frequency)
      // But spec says "estimated_reach" in response.
      // Let's use a simple heuristic: Unique riders = Total Impressions / Frequency.
      // Assume Frequency = 4 per campaign period for now.
      const estimatedReachFinal = Math.round(totalImpressions / 4);


      return {
            totalImpressions: Math.round(totalImpressions),
            estimatedReach: estimatedReachFinal,
            cpm: totalImpressions > 0 ? (totalCost / totalImpressions) * 1000 : 0,
            estimatedCost: Math.round(totalCost),
            breakdown,
      };
}
