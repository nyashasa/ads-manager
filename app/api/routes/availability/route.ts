import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/routes/availability?routeIds=id1,id2,id3
 * 
 * Returns availability information for the given routes:
 * - For each route, shows which dates have limited availability
 * - Shows available SOV per route/date/daypart
 * - Includes draft/pending campaigns (not just approved/active)
 */
export async function GET(request: NextRequest) {
      try {
            const searchParams = request.nextUrl.searchParams;
            const routeIdsParam = searchParams.get('routeIds');
            
            if (!routeIdsParam) {
                  return NextResponse.json(
                        { error: 'routeIds query parameter is required' },
                        { status: 400 }
                  );
            }

            const routeIds = routeIdsParam.split(',').filter(Boolean);
            
            if (routeIds.length === 0) {
                  return NextResponse.json(
                        { error: 'At least one routeId is required' },
                        { status: 400 }
                  );
            }

            console.log('Checking route availability for:', routeIds);

            // Fetch all flights (including draft/pending_approval) that use any of these routes
            // We include draft/pending_approval so users can see what's already in the pipeline
            const { data: flights, error: flightsError } = await supabase
                  .from('flights')
                  .select(`
                        id,
                        campaign_id,
                        routes,
                        start_date,
                        end_date,
                        dayparts,
                        share_of_voice,
                        pricing_snapshot,
                        status
                  `)
                  .in('status', ['draft', 'pending_approval', 'approved', 'active']);

            if (flightsError) {
                  console.error('Error fetching flights:', flightsError);
                  return NextResponse.json(
                        { error: 'Failed to fetch availability data' },
                        { status: 500 }
                  );
            }

            console.log(`Found ${flights?.length || 0} flights (including drafts/pending)`);

            // Structure: routeId -> date -> daypart -> bookedSOV
            const routeAvailability: Record<string, Record<string, Record<string, number>>> = {};
            
            // Initialize all routes with empty availability
            for (const routeId of routeIds) {
                  routeAvailability[routeId] = {};
            }

            // Process each flight
            for (const flight of flights || []) {
                  const flightRoutes = Array.isArray(flight.routes) ? flight.routes.map((r: any) => String(r)) : [];
                  
                  // Check if this flight affects any of our requested routes
                  const matchingRoutes = flightRoutes.filter((r: string) => routeIds.includes(r));
                  
                  if (matchingRoutes.length === 0) continue;

                  // Parse SOV
                  let flightSOV: number;
                  
                  if (flight.share_of_voice !== null && flight.share_of_voice !== undefined) {
                        flightSOV = typeof flight.share_of_voice === 'string' 
                              ? parseFloat(flight.share_of_voice) 
                              : Number(flight.share_of_voice);
                  } else {
                        const pricingSnapshot = flight.pricing_snapshot || {};
                        flightSOV = pricingSnapshot.shareOfVoice || 0;
                        if (flightSOV > 1) flightSOV = flightSOV / 100;
                  }
                  
                  flightSOV = Math.max(0, Math.min(1, Number(flightSOV) || 0));

                  const flightDayparts = (flight.dayparts && Array.isArray(flight.dayparts) && flight.dayparts.length > 0)
                        ? flight.dayparts
                        : ['morning_peak', 'daytime', 'evening_peak'];

                  // Process each date in the flight range
                  const flightStart = new Date(flight.start_date);
                  const flightEnd = new Date(flight.end_date);
                  const cur = new Date(flightStart);
                  
                  while (cur <= flightEnd) {
                        const dateStr = cur.toISOString().split('T')[0];
                        
                        for (const routeId of matchingRoutes) {
                              if (!routeAvailability[routeId][dateStr]) {
                                    routeAvailability[routeId][dateStr] = {
                                          morning_peak: 0,
                                          daytime: 0,
                                          evening_peak: 0,
                                    };
                              }
                              
                              for (const daypart of flightDayparts) {
                                    if (routeAvailability[routeId][dateStr][daypart] !== undefined) {
                                          const currentBooked = routeAvailability[routeId][dateStr][daypart] || 0;
                                          routeAvailability[routeId][dateStr][daypart] = currentBooked + flightSOV;
                                          console.log(`Route ${routeId.substring(0, 8)} date ${dateStr} daypart ${daypart}: booked ${currentBooked} + ${flightSOV} = ${routeAvailability[routeId][dateStr][daypart]}`);
                                    }
                              }
                        }
                        
                        cur.setDate(cur.getDate() + 1);
                  }
            }

            // Calculate summary for each route
            const routeSummaries: Record<string, {
                  hasLimitedAvailability: boolean;
                  maxBookedSOV: number;
                  datesWithBooking: string[];
                  minAvailableSOV: number;
            }> = {};

            for (const routeId of routeIds) {
                  let maxBookedSOV = 0;
                  const datesWithBooking: string[] = [];
                  let minAvailableSOV = 1.0;
                  let hasAnyBookings = false;

                  for (const dateStr in routeAvailability[routeId]) {
                        const dayparts = routeAvailability[routeId][dateStr];
                        let dateMaxBooked = 0;
                        let dateMinAvailable = 1.0;
                        
                        for (const daypart of ['morning_peak', 'daytime', 'evening_peak']) {
                              const booked = dayparts[daypart] || 0;
                              dateMaxBooked = Math.max(dateMaxBooked, booked);
                              if (booked > 0) {
                                    hasAnyBookings = true;
                                    const available = Math.max(0, 1.0 - booked);
                                    dateMinAvailable = Math.min(dateMinAvailable, available);
                              }
                        }
                        
                        if (dateMaxBooked > 0) {
                              datesWithBooking.push(dateStr);
                              maxBookedSOV = Math.max(maxBookedSOV, dateMaxBooked);
                              // minAvailableSOV is the worst-case availability across all dates with bookings
                              minAvailableSOV = Math.min(minAvailableSOV, dateMinAvailable);
                              console.log(`  Date ${dateStr}: maxBooked=${dateMaxBooked}, minAvailable=${dateMinAvailable}, overall minAvailable=${minAvailableSOV}`);
                        }
                  }

                  console.log(`Route ${routeId.substring(0, 8)}: hasAnyBookings=${hasAnyBookings}, maxBookedSOV=${maxBookedSOV}, minAvailableSOV=${minAvailableSOV}, datesWithBooking=${datesWithBooking.length}`);

                  // If there are no bookings at all, minAvailableSOV should be 1.0 (100%)
                  // If there are bookings, minAvailableSOV is the minimum across all booked dates
                  routeSummaries[routeId] = {
                        hasLimitedAvailability: maxBookedSOV > 0,
                        maxBookedSOV,
                        datesWithBooking,
                        minAvailableSOV: hasAnyBookings ? Math.max(0, minAvailableSOV) : 1.0,
                  };
            }

            console.log('Route availability summaries:', routeSummaries);

            return NextResponse.json({
                  routes: routeSummaries,
                  detailedAvailability: routeAvailability,
            }, { status: 200 });

      } catch (error) {
            console.error('Unhandled route availability check error:', error);
            return NextResponse.json(
                  { error: 'An unexpected error occurred' },
                  { status: 500 }
            );
      }
}

