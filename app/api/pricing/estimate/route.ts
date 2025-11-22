import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateEstimate } from '@/lib/pricing-engine';
import { FlightRequest, PricingModel, Route } from '@/lib/types';

export async function POST(request: Request) {
      try {
            const body = await request.json();
            const { pricingModelId, flight } = body as { pricingModelId: string; flight: FlightRequest };

            if (!pricingModelId || !flight) {
                  return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
            }

            // 1. Fetch Pricing Model
            const { data: pricingModelData, error: pmError } = await supabase
                  .from('pricing_models')
                  .select('*')
                  .eq('id', pricingModelId)
                  .single();

            if (pmError || !pricingModelData) {
                  return NextResponse.json({ error: 'Pricing model not found' }, { status: 404 });
            }

            const pricingModel = pricingModelData as PricingModel;

            // 2. Fetch Routes
            // If specific route IDs are provided
            let routesData: Route[] = [];

            if (flight.routeIds && flight.routeIds.length > 0) {
                  const { data, error } = await supabase
                        .from('routes')
                        .select('*')
                        .in('id', flight.routeIds);

                  if (error) throw error;
                  routesData = data as Route[];
            }
            // If corridor IDs are provided (fetch all routes in corridors)
            else if (flight.corridorIds && flight.corridorIds.length > 0) {
                  const { data, error } = await supabase
                        .from('routes')
                        .select('*')
                        .in('corridor_id', flight.corridorIds);

                  if (error) throw error;
                  routesData = data as Route[];
            } else {
                  return NextResponse.json({ error: 'No routes or corridors specified' }, { status: 400 });
            }

            // 3. Generate Estimate
            const estimate = generateEstimate(flight, routesData, pricingModel);

            return NextResponse.json(estimate);

      } catch (error) {
            console.error('Error generating estimate:', error);
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
      }
}
