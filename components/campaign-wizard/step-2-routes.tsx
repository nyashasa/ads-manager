'use client';

import { useState, useEffect, useCallback } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import RouteMap from './route-map';

export default function Step2Routes({ data, updateData }: any) {
      const [routes, setRoutes] = useState<any[]>([]);
      const [loading, setLoading] = useState(true);
      const [searchTerm, setSearchTerm] = useState('');
      const [routeAvailability, setRouteAvailability] = useState<Record<string, {
            hasLimitedAvailability: boolean;
            maxBookedSOV: number;
            datesWithBooking: string[];
            minAvailableSOV: number;
      }>>({});
      const [availabilityLoading, setAvailabilityLoading] = useState(false);

      useEffect(() => {
            async function fetchRoutes() {
                  const { data: routesData } = await supabase
                        .from('routes')
                        .select('*, corridors(name, polygon_geojson)')
                        .order('name');

                  if (routesData) {
                        // Fetch stops for each route's corridor to draw paths
                        const routesWithStops = await Promise.all(
                              routesData.map(async (route) => {
                                    if (route.corridor_id) {
                                          const { data: stops } = await supabase
                                                .from('stops')
                                                .select('lat, lng, name')
                                                .eq('corridor_id', route.corridor_id)
                                                .not('lat', 'is', null)
                                                .not('lng', 'is', null)
                                                .order('name');
                                          
                                          return {
                                                ...route,
                                                stops: stops || [],
                                          };
                                    }
                                    return { ...route, stops: [] };
                              })
                        );
                        setRoutes(routesWithStops);
                  }
                  setLoading(false);
            }
            fetchRoutes();
      }, []);

      // Fetch route availability when selected routes change
      useEffect(() => {
            const fetchRouteAvailability = async () => {
                  const selectedRouteIds = data.routeIds || [];
                  
                  if (selectedRouteIds.length === 0) {
                        setRouteAvailability({});
                        return;
                  }

                  setAvailabilityLoading(true);
                  try {
                        const routeIdsParam = selectedRouteIds.join(',');
                        const res = await fetch(`/api/routes/availability?routeIds=${routeIdsParam}`);
                        
                        if (res.ok) {
                              const availabilityData = await res.json();
                              setRouteAvailability(availabilityData.routes || {});
                              
                              // Store detailed availability in wizard data for Step 3
                              updateData({ 
                                    routeAvailabilityData: availabilityData.detailedAvailability || {},
                                    routeAvailabilitySummaries: availabilityData.routes || {}
                              });
                        }
                  } catch (err) {
                        console.error('Error fetching route availability:', err);
                  } finally {
                        setAvailabilityLoading(false);
                  }
            };

            const timer = setTimeout(fetchRouteAvailability, 300);
            return () => clearTimeout(timer);
      }, [data.routeIds, updateData]);

      const toggleRoute = useCallback((routeId: string) => {
            const currentRoutes = data.routeIds || [];
            if (currentRoutes.includes(routeId)) {
                  updateData({ routeIds: currentRoutes.filter((id: string) => id !== routeId) });
            } else {
                  updateData({ routeIds: [...currentRoutes, routeId] });
            }
      }, [data.routeIds, updateData]);

      const filteredRoutes = routes.filter(r =>
            r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.gabs_route_code.toLowerCase().includes(searchTerm.toLowerCase())
      );

      return (
            <div className="space-y-6">
                  <div className="flex flex-col md:flex-row gap-4 md:h-[600px]">
                        {/* Map Section */}
                        <div className="w-full min-h-[200px] h-full md:w-1/2 md:h-full md:min-h-[600px]">
                              {loading ? (
                                    <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center">
                                          <p className="text-muted-foreground">Loading map...</p>
                                    </div>
                              ) : (
                                    <RouteMap
                                          routes={filteredRoutes}
                                          selectedRouteIds={data.routeIds || []}
                                          onRouteToggle={toggleRoute}
                                    />
                              )}
                        </div>

                        {/* Routes List Section */}
                        <div className="w-full md:w-1/2 space-y-4 flex flex-col md:h-full">
                              <Input
                                    placeholder="Search routes..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                              />

                              <div className="border rounded-md flex-1 overflow-y-auto p-4 space-y-2 max-h-[400px] md:max-h-none md:min-h-0">
                                    {loading ? (
                                          <p>Loading routes...</p>
                                    ) : (
                                          filteredRoutes.map((route) => {
                                                const availability = routeAvailability[route.id];
                                                const hasLimitedAvailability = availability?.hasLimitedAvailability || false;
                                                // Use nullish coalescing (??) instead of || to handle 0 correctly
                                                const minAvailableSOV = availability?.minAvailableSOV ?? undefined;
                                                
                                                return (
                                                      <div key={route.id} className="flex items-start space-x-3 p-2 hover:bg-muted/50 rounded">
                                                            <Checkbox
                                                                  id={route.id}
                                                                  checked={(data.routeIds || []).includes(route.id)}
                                                                  onCheckedChange={() => toggleRoute(route.id)}
                                                            />
                                                            <div className="grid gap-1.5 leading-none flex-1">
                                                                  <div className="flex items-center gap-2">
                                                                        <Label htmlFor={route.id} className="font-medium cursor-pointer">
                                                                              {route.name} <span className="text-xs text-muted-foreground">({route.gabs_route_code})</span>
                                                                        </Label>
                                                                        {hasLimitedAvailability && (
                                                                              <Badge variant="outline" className="text-xs bg-amber-50 border-amber-200 text-amber-700">
                                                                                    Limited
                                                                              </Badge>
                                                                        )}
                                                                  </div>
                                                                  <p className="text-xs text-muted-foreground">
                                                                        {route.corridors?.name} • {route.estimated_daily_ridership?.toLocaleString()} daily riders
                                                                        {hasLimitedAvailability && data.startDate && data.endDate && minAvailableSOV !== undefined && (
                                                                              <span className="ml-2 text-amber-600">
                                                                                    • {Math.round(minAvailableSOV * 100)}% available
                                                                              </span>
                                                                        )}
                                                                  </p>
                                                            </div>
                                                      </div>
                                                );
                                          })
                                    )}
                                    {!loading && filteredRoutes.length === 0 && (
                                          <p className="text-muted-foreground text-center py-4">No routes found.</p>
                                    )}
                              </div>

                              <div className="text-sm text-muted-foreground text-right pt-2 border-t">
                                    Selected: {(data.routeIds || []).length} routes
                              </div>
                        </div>
                  </div>
            </div>
      );
}
