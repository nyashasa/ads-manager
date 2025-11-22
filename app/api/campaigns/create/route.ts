import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
      try {
            const body = await request.json();
            const {
                  advertiserName,
                  campaignName,
                  objective,
                  routeIds,
                  startDate,
                  endDate,
                  shareOfVoice,
                  creativeFormat,
                  headline,
                  ctaUrl,
                  creativeAsset,
                  firstName,
                  lastName,
                  email,
                  phone,
                  company,
                  notes,
                  estimate,
                  unavailableDates = [] // Dates that should be excluded from the flight
            } = body;

            // Validate required fields
            if (!advertiserName || !campaignName || !objective || !routeIds || !startDate || !endDate) {
                  return NextResponse.json(
                        { error: 'Missing required fields' },
                        { status: 400 }
                  );
            }

            if (!firstName || !lastName || !email || !phone) {
                  return NextResponse.json(
                        { error: 'Missing required contact information' },
                        { status: 400 }
                  );
            }

            // Get or create advertiser
            let advertiserId;
            const { data: existingAdvertiser } = await supabase
                  .from('advertisers')
                  .select('id')
                  .eq('name', advertiserName)
                  .single();

            if (existingAdvertiser) {
                  advertiserId = existingAdvertiser.id;
            } else {
                  // Create new advertiser
                  const { data: newAdvertiser, error: advertiserError } = await supabase
                        .from('advertisers')
                        .insert({
                              name: advertiserName,
                              contact_name: `${firstName} ${lastName}`,
                              contact_email: email,
                              billing_details: {
                                    phone,
                                    company
                              }
                        })
                        .select('id')
                        .single();

                  if (advertiserError) {
                        console.error('Error creating advertiser:', advertiserError);
                        return NextResponse.json(
                              { error: 'Failed to create advertiser' },
                              { status: 500 }
                        );
                  }
                  advertiserId = newAdvertiser.id;
            }

            // Check availability before creating campaign (with daypart support)
            // Re-check availability immediately before creating (atomic check)
            // Date overlap: flight.start_date <= request.end_date AND flight.end_date >= request.start_date
            // Ensure dates are in YYYY-MM-DD format for proper DATE comparison (not timestamp)
            const normalizedStartDate = startDate.split('T')[0]; // Extract just the date part
            const normalizedEndDate = endDate.split('T')[0]; // Extract just the date part
            
            const { data: overlappingFlights, error: availabilityError } = await supabase
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

            // Debug logging
            console.log('Availability check:', {
                  routeIds,
                  startDate,
                  endDate,
                  overlappingFlightsCount: overlappingFlights?.length || 0,
                  overlappingFlights: overlappingFlights?.map(f => ({
                        id: f.id,
                        routes: f.routes,
                        share_of_voice: f.share_of_voice,
                        status: f.status,
                        start_date: f.start_date,
                        end_date: f.end_date
                  }))
            });

            // Calculate booked SOV (with daypart support)
            // Default dayparts if not provided in request
            const requestedDayparts = body.dayparts && Array.isArray(body.dayparts) && body.dayparts.length > 0
                  ? body.dayparts
                  : ['morning_peak', 'daytime', 'evening_peak'];
            
            let minAvailableSOV = 1.0;
            if (overlappingFlights && overlappingFlights.length > 0) {
                  const start = new Date(startDate);
                  const end = new Date(endDate);
                  
                  // Calculate availability per route per date per daypart
                  const routeAvailability: Record<string, Record<string, Record<string, number>>> = {};
                  
                  // Initialize to 100%
                  const cur = new Date(start);
                  while (cur <= end) {
                        const dateStr = cur.toISOString().split('T')[0];
                        for (const routeId of routeIds) {
                              if (!routeAvailability[routeId]) {
                                    routeAvailability[routeId] = {};
                              }
                              if (!routeAvailability[routeId][dateStr]) {
                                    routeAvailability[routeId][dateStr] = {};
                              }
                              for (const daypart of requestedDayparts) {
                                    routeAvailability[routeId][dateStr][daypart] = 1.0;
                              }
                        }
                        cur.setDate(cur.getDate() + 1);
                  }

                  // Subtract booked SOV
                  for (const flight of overlappingFlights) {
                        // Normalize route IDs to strings for comparison (handles UUID arrays)
                        const flightRoutes = (flight.routes || []).map((r: any) => String(r).toLowerCase());
                        const normalizedRouteIds = routeIds.map((rid: string) => String(rid).toLowerCase());
                        const hasOverlappingRoute = normalizedRouteIds.some((rid: string) => flightRoutes.includes(rid));
                        
                        if (!hasOverlappingRoute) {
                              console.log('Skipping flight - no route overlap:', {
                                    flightId: flight.id,
                                    flightRoutes,
                                    requestedRoutes: normalizedRouteIds
                              });
                              continue;
                        }
                        
                        console.log('Processing overlapping flight:', {
                              flightId: flight.id,
                              flightRoutes,
                              share_of_voice: flight.share_of_voice,
                              status: flight.status
                        });

                        // Get SOV directly from flight.share_of_voice (0.0-1.0 decimal)
                        // Handle both numeric and string types (Postgres might return as string)
                        let flightSOV: number;
                        
                        if (flight.share_of_voice !== null && flight.share_of_voice !== undefined) {
                              // Convert to number if it's a string
                              flightSOV = typeof flight.share_of_voice === 'string' 
                                    ? parseFloat(flight.share_of_voice) 
                                    : Number(flight.share_of_voice);
                        } else {
                              // Legacy support: try to get from pricing_snapshot
                              const pricingSnapshot = flight.pricing_snapshot || {};
                              flightSOV = pricingSnapshot.shareOfVoice || 0;
                              
                              // If still not found, default to a conservative estimate
                              if (flightSOV === 0 && pricingSnapshot && Object.keys(pricingSnapshot).length > 0) {
                                    console.warn(`Flight ${flight.id} has no share_of_voice and no shareOfVoice in pricing_snapshot. Defaulting to 0.5 (50%) for safety.`);
                                    flightSOV = 0.5; // Default to 50% for safety if we can't determine
                              }
                        }
                        
                        // Ensure it's a valid decimal (0.0-1.0)
                        // If it's stored as percentage (0-100), convert to decimal
                        if (flightSOV > 1) {
                              flightSOV = flightSOV / 100;
                        }
                        flightSOV = Math.max(0, Math.min(1, Number(flightSOV) || 0)); // Clamp to 0-1, handle NaN
                        
                        console.log(`Processing flight ${flight.id}: SOV = ${flightSOV} (raw: ${flight.share_of_voice})`);

                        // Get flight dayparts (default to all if not specified)
                        const flightDayparts = (flight.dayparts && Array.isArray(flight.dayparts) && flight.dayparts.length > 0)
                              ? flight.dayparts
                              : ['morning_peak', 'daytime', 'evening_peak'];

                        const flightStart = new Date(flight.start_date);
                        const flightEnd = new Date(flight.end_date);
                        const overlapStart = flightStart > start ? flightStart : start;
                        const overlapEnd = flightEnd < end ? flightEnd : end;

                        const overlapCur = new Date(overlapStart);
                        while (overlapCur <= overlapEnd) {
                              const dateStr = overlapCur.toISOString().split('T')[0];
                              for (const routeId of flightRoutes) {
                                    if (routeIds.includes(routeId) && routeAvailability[routeId] && routeAvailability[routeId][dateStr]) {
                                          // Check daypart overlap
                                          for (const flightDaypart of flightDayparts) {
                                                if (requestedDayparts.includes(flightDaypart)) {
                                                      routeAvailability[routeId][dateStr][flightDaypart] = Math.max(
                                                            0,
                                                            (routeAvailability[routeId][dateStr][flightDaypart] || 1.0) - flightSOV
                                                      );
                                                }
                                          }
                                    }
                              }
                              overlapCur.setDate(overlapCur.getDate() + 1);
                        }
                  }

                  // Find minimum available across all routes, dates, and dayparts
                  for (const routeId of routeIds) {
                        if (routeAvailability[routeId]) {
                              for (const dateStr in routeAvailability[routeId]) {
                                    if (routeAvailability[routeId][dateStr]) {
                                          for (const daypart of requestedDayparts) {
                                                const available = routeAvailability[routeId][dateStr][daypart] || 1.0;
                                                if (available < minAvailableSOV) {
                                                      minAvailableSOV = available;
                                                }
                                          }
                                    }
                              }
                        }
                  }
            }

            const requestedSOV = shareOfVoice / 100; // Convert percentage to decimal
            
            console.log('Final availability check:', {
                  requestedSOV,
                  minAvailableSOV,
                  requestedSOVPercentage: shareOfVoice,
                  availablePercentage: Math.round(minAvailableSOV * 100),
                  willBlock: requestedSOV > minAvailableSOV
            });
            
            if (requestedSOV > minAvailableSOV) {
                  return NextResponse.json(
                        {
                              error: `Requested delivery (${shareOfVoice}%) exceeds available inventory (${Math.round(minAvailableSOV * 100)}%). Please reduce delivery or select different routes/dates.`,
                              maxAvailable: Math.round(minAvailableSOV * 100),
                        },
                        { status: 409 } // Conflict status code
                  );
            }

            // Get active pricing model
            const { data: pricingModel } = await supabase
                  .from('pricing_models')
                  .select('id')
                  .eq('is_active', true)
                  .limit(1)
                  .single();

            if (!pricingModel) {
                  return NextResponse.json(
                        { error: 'No active pricing model found' },
                        { status: 500 }
                  );
            }

            // Create campaign with contact information
            // Status should be 'pending_approval' when submitted (not 'draft')
            const { data: campaign, error: campaignError } = await supabase
                  .from('campaigns')
                  .insert({
                        advertiser_id: advertiserId,
                        name: campaignName,
                        objective: objective,
                        status: 'pending_approval',
                        start_date: startDate,
                        end_date: endDate,
                        pricing_model_id: pricingModel.id,
                        notes: notes || null,
                        contact_info: {
                              firstName,
                              lastName,
                              email,
                              phone,
                              company: company || null
                        }
                  })
                  .select('id')
                  .single();

            if (campaignError) {
                  console.error('Error creating campaign:', campaignError);
                  return NextResponse.json(
                        { error: 'Failed to create campaign' },
                        { status: 500 }
                  );
            }

            // Calculate actual flight dates excluding unavailable dates
            // If unavailableDates exist, we need to find the first and last available dates
            let flightStartDate = startDate;
            let flightEndDate = endDate;
            
            if (unavailableDates && unavailableDates.length > 0) {
                  const start = new Date(startDate);
                  const end = new Date(endDate);
                  const unavailableDateSet = new Set(unavailableDates.map((d: string) => d.split('T')[0]));
                  
                  // Find first available date
                  let firstAvailable: Date | null = null;
                  const curStart = new Date(start);
                  while (curStart <= end) {
                        const dateStr = curStart.toISOString().split('T')[0];
                        if (!unavailableDateSet.has(dateStr)) {
                              firstAvailable = new Date(curStart);
                              break;
                        }
                        curStart.setDate(curStart.getDate() + 1);
                  }
                  
                  // Find last available date
                  let lastAvailable: Date | null = null;
                  const curEnd = new Date(end);
                  while (curEnd >= start) {
                        const dateStr = curEnd.toISOString().split('T')[0];
                        if (!unavailableDateSet.has(dateStr)) {
                              lastAvailable = new Date(curEnd);
                              break;
                        }
                        curEnd.setDate(curEnd.getDate() - 1);
                  }
                  
                  if (firstAvailable && lastAvailable) {
                        // Format dates as YYYY-MM-DD
                        flightStartDate = `${firstAvailable.getFullYear()}-${String(firstAvailable.getMonth() + 1).padStart(2, '0')}-${String(firstAvailable.getDate()).padStart(2, '0')}`;
                        flightEndDate = `${lastAvailable.getFullYear()}-${String(lastAvailable.getMonth() + 1).padStart(2, '0')}-${String(lastAvailable.getDate()).padStart(2, '0')}`;
                        console.log(`Excluding unavailable dates. Original: ${startDate} to ${endDate}, Flight: ${flightStartDate} to ${flightEndDate}`);
                  }
            }

            // Create flight with adjusted dates (excluding unavailable dates)
            const { data: flight, error: flightError } = await supabase
                  .from('flights')
                  .insert({
                        campaign_id: campaign.id,
                        name: `${campaignName} - Flight 1`,
                        flight_type: 'brand',
                        start_date: flightStartDate,
                        end_date: flightEndDate,
                        routes: routeIds,
                        dayparts: ['morning_peak', 'daytime', 'evening_peak'],
                        days_of_week: [0, 1, 2, 3, 4, 5, 6],
                        estimated_impressions: estimate?.totalImpressions || null,
                        estimated_reach: estimate?.estimatedReach || null,
                        estimated_cpm: estimate?.cpm || null,
                        estimated_cost: estimate?.estimatedCost || null,
                        pricing_snapshot: estimate || null,
                        share_of_voice: shareOfVoice / 100, // Convert percentage to decimal
                        status: 'pending_approval' // Match campaign status
                  })
                  .select('id')
                  .single();

            if (flightError) {
                  console.error('Error creating flight:', flightError);
                  return NextResponse.json(
                        { error: 'Failed to create flight' },
                        { status: 500 }
                  );
            }

            // Create creative if provided
            if (creativeFormat) {
                  const { error: creativeError } = await supabase
                        .from('creatives')
                        .insert({
                              campaign_id: campaign.id,
                              name: headline || 'Creative 1',
                              format: creativeFormat,
                              asset_url: creativeAsset || null,
                              clickthrough_url: ctaUrl || null,
                              metadata: {
                                    headline,
                                    uploaded_file: creativeAsset
                              }
                        });

                  if (creativeError) {
                        console.error('Error creating creative:', creativeError);
                        // Don't fail the whole request if creative fails
                  }
            }

            // Create quote
            const quoteNumber = `QT-${Date.now()}`;
            const { error: quoteError } = await supabase
                  .from('quotes')
                  .insert({
                        campaign_id: campaign.id,
                        quote_number: quoteNumber,
                        total_cost: estimate?.estimatedCost || 0,
                        currency: 'ZAR',
                        line_items: estimate || {},
                        status: 'draft',
                        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
                  });

            if (quoteError) {
                  console.error('Error creating quote:', quoteError);
                  // Don't fail the whole request if quote fails
            }

            return NextResponse.json({
                  success: true,
                  campaignId: campaign.id,
                  flightId: flight.id,
                  quoteNumber,
                  message: 'Campaign created successfully'
            });

      } catch (error: any) {
            console.error('Error creating campaign:', error);
            return NextResponse.json(
                  { error: error.message || 'An error occurred while creating the campaign' },
                  { status: 500 }
            );
      }
}

