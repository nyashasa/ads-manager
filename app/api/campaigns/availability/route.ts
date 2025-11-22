import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
      try {
            const body = await request.json();
            const { routeIds, startDate, endDate, dayparts, excludeCampaignId } = body;

            if (!routeIds || !Array.isArray(routeIds) || routeIds.length === 0) {
                  return NextResponse.json(
                        { error: 'routeIds array is required' },
                        { status: 400 }
                  );
            }

            if (!startDate || !endDate) {
                  return NextResponse.json(
                        { error: 'startDate and endDate are required' },
                        { status: 400 }
                  );
            }

            // Fetch all approved/active flights that overlap with the requested dates
            // Date overlap: flight.start_date <= request.end_date AND flight.end_date >= request.start_date
            // Ensure dates are in YYYY-MM-DD format for proper DATE comparison (not timestamp)
            const normalizedStartDate = startDate.split('T')[0]; // Extract just the date part
            const normalizedEndDate = endDate.split('T')[0]; // Extract just the date part
            
            console.log('Availability check:', {
                  routeIds,
                  startDate: normalizedStartDate,
                  endDate: normalizedEndDate,
                  dayparts: dayparts || ['morning_peak', 'daytime', 'evening_peak']
            });
            
            const { data: overlappingFlights, error: flightsError } = await supabase
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
                  .in('status', ['approved', 'active'])
                  .lte('start_date', normalizedEndDate)  // flight starts before or on request end
                  .gte('end_date', normalizedStartDate); // flight ends on or after request start

            if (flightsError) {
                  console.error('Error fetching flights:', flightsError);
                  return NextResponse.json(
                        { error: 'Failed to fetch availability data' },
                        { status: 500 }
                  );
            }
            
            console.log(`Found ${overlappingFlights?.length || 0} overlapping flights for date range ${normalizedStartDate} to ${normalizedEndDate}`);

            // Calculate booked SOV per route per date per daypart
            // Availability key: routeId_date_daypart
            const routeAvailability: Record<string, Record<string, Record<string, number>>> = {};
            
            // Normalize routeIds to strings for consistent key usage
            const normalizedRouteIdsForKeys = routeIds.map((rid: string) => String(rid));
            
            // Default dayparts if not provided
            const requestedDayparts = dayparts && Array.isArray(dayparts) && dayparts.length > 0 
                  ? dayparts 
                  : ['morning_peak', 'daytime', 'evening_peak'];
            
            // Initialize all route+date+daypart combinations to 100% available
            const start = new Date(normalizedStartDate);
            const end = new Date(normalizedEndDate);
            const cur = new Date(start);
            
            console.log('Initialized routeAvailability for routes:', normalizedRouteIdsForKeys);
            
            while (cur <= end) {
                  const dateStr = cur.toISOString().split('T')[0];
                  for (const routeId of normalizedRouteIdsForKeys) {
                        if (!routeAvailability[routeId]) {
                              routeAvailability[routeId] = {};
                        }
                        if (!routeAvailability[routeId][dateStr]) {
                              routeAvailability[routeId][dateStr] = {};
                        }
                        for (const daypart of requestedDayparts) {
                              routeAvailability[routeId][dateStr][daypart] = 1.0; // 100% available initially
                        }
                  }
                  cur.setDate(cur.getDate() + 1);
            }
            
            console.log('Initialized routeAvailability structure:', normalizedRouteIdsForKeys);

            // Subtract booked SOV from overlapping flights
            for (const flight of overlappingFlights || []) {
                  // Exclude the current campaign if excludeCampaignId is provided
                  if (excludeCampaignId && flight.campaign_id === excludeCampaignId) {
                        continue;
                  }

                  const flightRoutes = Array.isArray(flight.routes) ? flight.routes.map((r: any) => String(r).toLowerCase()) : [];
                  
                  // Check if this flight affects any of our requested routes
                  const matchingRoutes = flightRoutes.filter((r: string) => 
                        normalizedRouteIdsForKeys.some((rid: string) => String(rid).toLowerCase() === r)
                  );
                  
                  if (matchingRoutes.length === 0) continue;

                  console.log(`Flight ${flight.id.substring(0, 8)} matches routes: ${matchingRoutes.join(', ')}`);

                  // Parse SOV
                  let flightSOV: number;
                  
                  if (flight.share_of_voice !== null && flight.share_of_voice !== undefined) {
                        flightSOV = typeof flight.share_of_voice === 'string' 
                              ? parseFloat(flight.share_of_voice) 
                              : Number(flight.share_of_voice);
                        console.log(`Flight ${flight.id.substring(0, 8)} SOV: ${flightSOV} (from share_of_voice: ${flight.share_of_voice})`);
                  } else {
                        const pricingSnapshot = flight.pricing_snapshot || {};
                        flightSOV = pricingSnapshot.shareOfVoice || 0;
                        if (flightSOV > 1) flightSOV = flightSOV / 100;
                        console.log(`Flight ${flight.id.substring(0, 8)} SOV: ${flightSOV} (from pricing_snapshot)`);
                  }
                  
                  flightSOV = Math.max(0, Math.min(1, Number(flightSOV) || 0));

                  const flightDayparts = (flight.dayparts && Array.isArray(flight.dayparts) && flight.dayparts.length > 0)
                        ? flight.dayparts
                        : ['morning_peak', 'daytime', 'evening_peak'];

                  // Process each date in the flight range that overlaps with our requested range
                  const flightStart = new Date(flight.start_date);
                  const flightEnd = new Date(flight.end_date);
                  const overlapStart = flightStart > start ? flightStart : start;
                  const overlapEnd = flightEnd < end ? flightEnd : end;
                  const overlapCur = new Date(overlapStart);
                  
                  while (overlapCur <= overlapEnd) {
                        const dateStr = overlapCur.toISOString().split('T')[0];
                        
                        for (const flightRouteId of flightRoutes) {
                              // Find the original routeId that matches this normalized flight route
                              const matchingRouteId = normalizedRouteIdsForKeys.find((rid: string) => 
                                    String(rid).toLowerCase() === flightRouteId
                              );
                              
                              if (matchingRouteId && routeAvailability[String(matchingRouteId).toLowerCase()] && routeAvailability[String(matchingRouteId).toLowerCase()][dateStr]) {
                                    // Check daypart overlap
                                    for (const flightDaypart of flightDayparts) {
                                          // If flight daypart overlaps with requested dayparts, subtract SOV
                                          if (requestedDayparts.includes(flightDaypart)) {
                                                const currentAvailable = routeAvailability[String(matchingRouteId).toLowerCase()][dateStr][flightDaypart] || 1.0;
                                                routeAvailability[String(matchingRouteId).toLowerCase()][dateStr][flightDaypart] = Math.max(
                                                      0,
                                                      currentAvailable - flightSOV
                                                );
                                                console.log(`Subtracted ${flightSOV} from route ${matchingRouteId.substring(0, 8)} date ${dateStr} daypart ${flightDaypart}. New available: ${routeAvailability[String(matchingRouteId).toLowerCase()][dateStr][flightDaypart]}`);
                                          }
                                    }
                              }
                        }
                        
                        overlapCur.setDate(overlapCur.getDate() + 1);
                  }
            }

            // Debug: Log routeAvailability structure after all subtractions
            console.log('RouteAvailability after subtractions:', JSON.stringify(routeAvailability, null, 2));
            
            // Calculate per-date availability summary FIRST
            // Structure: date -> { minAvailable: number, unavailable: boolean, routes: string[] }
            const dateAvailabilitySummary: Record<string, { minAvailable: number; unavailable: boolean; routes: string[] }> = {};
            
            // Initialize all dates in range
            const dateRangeStart = new Date(normalizedStartDate);
            const dateRangeEnd = new Date(normalizedEndDate);
            const dateRangeCur = new Date(dateRangeStart);
            while (dateRangeCur <= dateRangeEnd) {
                  const dateStr = dateRangeCur.toISOString().split('T')[0];
                  dateAvailabilitySummary[dateStr] = {
                        minAvailable: 1.0,
                        unavailable: false,
                        routes: []
                  };
                  dateRangeCur.setDate(dateRangeCur.getDate() + 1);
            }
            
            // Calculate per-date availability
            for (const routeId of normalizedRouteIdsForKeys) {
                  if (routeAvailability[routeId]) {
                        for (const dateStr in routeAvailability[routeId]) {
                              if (dateAvailabilitySummary[dateStr]) {
                                    const dateData = routeAvailability[routeId][dateStr];
                                    if (dateData && typeof dateData === 'object') {
                                          let dateMinAvailable = 1.0;
                                          
                                          for (const daypart of requestedDayparts) {
                                                const available = (dateData[daypart] as number) ?? 1.0;
                                                dateMinAvailable = Math.min(dateMinAvailable, available);
                                          }
                                          
                                          dateAvailabilitySummary[dateStr].minAvailable = Math.min(
                                                dateAvailabilitySummary[dateStr].minAvailable,
                                                dateMinAvailable
                                          );
                                          
                                          if (dateMinAvailable === 0) {
                                                dateAvailabilitySummary[dateStr].unavailable = true;
                                                if (!dateAvailabilitySummary[dateStr].routes.includes(routeId)) {
                                                      dateAvailabilitySummary[dateStr].routes.push(routeId);
                                                }
                                          }
                                    }
                              }
                        }
                  }
            }
            
            // Get list of unavailable dates
            const unavailableDates = Object.entries(dateAvailabilitySummary)
                  .filter(([_, data]) => data.unavailable)
                  .map(([date, _]) => date);
            
            // Find minimum available SOV across all routes, dates, and dayparts
            // BUT exclude unavailable dates from this calculation
            let minAvailable = 1.0;
            const availabilityBreakdown: Record<string, number> = {};
            
            for (const routeId of normalizedRouteIdsForKeys) {
                  console.log(`Checking route ${routeId} in routeAvailability:`, routeAvailability[routeId] ? 'exists' : 'NOT FOUND');
                  if (routeAvailability[routeId]) {
                        for (const dateStr in routeAvailability[routeId]) {
                              const dateAvailability = routeAvailability[routeId][dateStr];
                              console.log(`  Date ${dateStr}:`, dateAvailability);
                              if (dateAvailability && typeof dateAvailability === 'object') {
                                    // Check if this date is unavailable
                                    const isUnavailable = dateAvailabilitySummary[dateStr]?.unavailable || false;
                                    
                                    // Skip unavailable dates when calculating minAvailable
                                    if (isUnavailable) {
                                          console.log(`    Skipping unavailable date ${dateStr} from minAvailable calculation`);
                                          continue;
                                    }
                                    
                                    for (const daypart of requestedDayparts) {
                                          const available = (dateAvailability[daypart] as number) ?? 1.0;
                                          const key = `${routeId.substring(0, 8)}-${dateStr}-${daypart}`;
                                          availabilityBreakdown[key] = available;
                                          
                                          console.log(`    ${daypart}: available=${available}, minAvailable=${minAvailable}`);
                                          
                                          if (available < minAvailable) {
                                                minAvailable = available;
                                          }
                                    }
                              }
                        }
                  }
            }

            // If all dates are unavailable, minAvailable stays at 1.0, but we should return 0
            // Otherwise, use the minAvailable from available dates only
            const maxAvailableSOV = unavailableDates.length > 0 && unavailableDates.length === Object.keys(dateAvailabilitySummary).length
                  ? 0  // All dates unavailable
                  : Math.max(0, minAvailable);
            
            console.log('Availability calculation result:', {
                  minAvailable,
                  maxAvailableSOV,
                  maxAvailableSOVPercent: Math.round(maxAvailableSOV * 100),
                  breakdown: availabilityBreakdown,
                  unavailableDates,
                  dateAvailabilitySummary
            });

            // Return availability info
            return NextResponse.json({
                  maxAvailableSOV: maxAvailableSOV,
                  routeAvailability,
                  dateAvailability: dateAvailabilitySummary, // Per-date availability summary
                  unavailableDates, // List of dates with 0% availability
                  // Helper: which routes/dates/dayparts are the bottleneck
                  bottlenecks: Object.entries(routeAvailability)
                        .flatMap(([routeId, dates]) =>
                              Object.entries(dates)
                                    .flatMap(([date, dayparts]) => {
                                          if (typeof dayparts === 'object' && dayparts !== null) {
                                                return Object.entries(dayparts)
                                                      .filter(([_, available]) => (available as number) < 1.0)
                                                      .map(([daypart, available]) => ({
                                                            routeId,
                                                            date,
                                                            daypart,
                                                            available: Math.round((available as number) * 100),
                                                      }));
                                          }
                                          return [];
                                    })
                        ),
            }, { status: 200 });

      } catch (error) {
            console.error('Unhandled availability check error:', error);
            return NextResponse.json(
                  { error: 'An unexpected error occurred' },
                  { status: 500 }
            );
      }
}
