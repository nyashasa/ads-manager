export type RouteTier = 'tier_1_core' | 'tier_2_strong' | 'tier_3_longtail';
export type PlacementType = 'portal_banner' | 'full_screen' | 'survey' | 'voucher';
export type DayPart = 'morning_peak' | 'daytime' | 'evening_peak';

export interface Route {
      id: string;
      gabs_route_code: string;
      name: string;
      tier: RouteTier;
      estimated_daily_ridership: number;
      // Add other fields as needed from DB schema
}

export interface PricingModel {
      id: string;
      name: string;
      config: {
            base_cpm: Record<RouteTier, number>;
            multipliers?: {
                  daypart?: Record<DayPart, number>;
                  placement?: Record<PlacementType, number>;
            };
      };
}

export interface FlightRequest {
      routeIds: string[];
      corridorIds: string[];
      startDate: string;
      endDate: string;
      daysOfWeek: number[]; // 0-6
      dayparts: DayPart[];
      shareOfVoice: number; // 0-1
      placementType: PlacementType;
}

export interface PricingEstimateRequest {
      pricingModelId: string;
      advertiserId: string;
      flight: FlightRequest;
}

export interface RouteBreakdown {
      routeId: string;
      impressions: number;
      estimatedCost: number;
}

export interface PricingEstimateResponse {
      totalImpressions: number;
      estimatedReach: number;
      cpm: number;
      estimatedCost: number;
      breakdown: RouteBreakdown[];
}
