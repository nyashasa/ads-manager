import { FlightRequest, PricingEstimateResponse, Route, PricingModel, RouteBreakdown } from './types';

// Constants (Move to config/DB later)
const IMPRESSION_OPPORTUNITIES_PER_RIDE = 1.5;
const FILL_FACTOR = 0.8; // 80% utilization assumption
const AVG_SESSIONS_PER_RIDER_PER_DAY = 1.8; // Accounts for people not always using both directions
const WIFI_ADOPTION_RATE = 0.6; // 60% of riders connect to Wi-Fi

export function calculateDays(startDate: string, endDate: string, daysOfWeek: number[], excludeDates?: string[]): number {
      const start = new Date(startDate);
      const end = new Date(endDate);
      let count = 0;
      const cur = new Date(start);
      
      // Normalize excludeDates to YYYY-MM-DD format for comparison
      const normalizedExcludeDates = excludeDates?.map(date => {
            const d = new Date(date);
            return d.toISOString().split('T')[0];
      }) || [];

      while (cur <= end) {
            const dateStr = cur.toISOString().split('T')[0];
            // Skip if date is in excludeDates
            if (normalizedExcludeDates.includes(dateStr)) {
                  cur.setDate(cur.getDate() + 1);
                  continue;
            }
            
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
      pricingModel: PricingModel,
      excludeDates?: string[]
): PricingEstimateResponse {
      const days = calculateDays(flight.startDate, flight.endDate, flight.daysOfWeek, excludeDates);

      // Multipliers
      const placementMultiplier = pricingModel.config.multipliers?.placement?.[flight.placementType] || 1;
      // Average daypart multiplier if multiple selected (simplification)
      const daypartMultipliers = flight.dayparts.map(
            dp => pricingModel.config.multipliers?.daypart?.[dp] || 1
      );
      const avgDaypartMultiplier =
            daypartMultipliers.length > 0
                  ? daypartMultipliers.reduce((a, b) => a + b, 0) / daypartMultipliers.length
                  : 1;

      // Calculate total unique riders across all routes (Wi-Fi users)
      // wifiRiders = unique-ish riders on these routes (daily), NOT multiplied by days
      const totalDailyRiders = routes.reduce(
            (sum, route) => sum + (route.estimated_daily_ridership || 0),
            0
      );
      const wifiRiders = totalDailyRiders * WIFI_ADOPTION_RATE;

      // Calculate sessions per rider during campaign
      // T = avg_sessions_per_rider_per_day × campaign_days
      const T = AVG_SESSIONS_PER_RIDER_PER_DAY * days;

      // p = SOV as probability (shareOfVoice is already 0-1 from the API)
      const p = flight.shareOfVoice;

      // Calculate reach using probability model: reach = riders × (1 − (1 − p)^T)
      // This gives us the expected number of riders who see the ad at least once
      const estimatedReach = Math.round(wifiRiders * (1 - Math.pow(1 - p, T)));

      // Calculate total exposures: total_exposures = riders × T × p
      // Each session is one ad opportunity, so total exposures = sessions × SOV
      const totalExposures = Math.round(wifiRiders * T * p);

      // Calculate avg frequency: avg_frequency = total_exposures / reach
      // This is the average number of times a reached rider sees the ad
      const avgFrequency = estimatedReach > 0 ? totalExposures / estimatedReach : 0;

      // Use totalExposures as totalImpressions (they're the same with 1 ad per session)
      const totalImpressionsFinal = totalExposures;

      // Calculate cost based on impressions using CPM model
      // Distribute total exposures across routes proportionally for cost calculation
      let totalCost = 0;
      const routeBreakdown: RouteBreakdown[] = [];

      for (const route of routes) {
            // Calculate route's share of total daily riders
            const routeDailyRiders = route.estimated_daily_ridership || 0;
            const routeShare = totalDailyRiders > 0 ? routeDailyRiders / totalDailyRiders : 0;
            
            // Route's exposures = its share of total exposures
            const routeExposures = Math.round(totalExposures * routeShare);

            // Calculate CPM for this route
            const baseCpm = pricingModel.config.base_cpm[route.tier] || 100;
            const cpm = calculateCPM(baseCpm, 1, placementMultiplier, avgDaypartMultiplier);

            // Cost = (impressions / 1000) * cpm
            const cost = (routeExposures / 1000) * cpm;

            totalCost += cost;

            routeBreakdown.push({
                  routeId: route.id,
                  impressions: routeExposures,
                  estimatedCost: Math.round(cost),
            });
      }

      return {
            totalImpressions: Math.round(totalImpressionsFinal),
            estimatedReach: estimatedReach,
            avgFrequency: avgFrequency,
            cpm: totalImpressionsFinal > 0 ? (totalCost / totalImpressionsFinal) * 1000 : 0,
            estimatedCost: Math.round(totalCost),
            breakdown: routeBreakdown,
      };
}
