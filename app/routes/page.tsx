'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function RouteExplorerPage() {
      const [routes, setRoutes] = useState<any[]>([]);
      const [loading, setLoading] = useState(true);
      const [searchTerm, setSearchTerm] = useState('');

      useEffect(() => {
            async function fetchRoutes() {
                  const { data } = await supabase
                        .from('routes')
                        .select('*, corridors(name)')
                        .order('name');
                  if (data) setRoutes(data);
                  setLoading(false);
            }
            fetchRoutes();
      }, []);

      const filteredRoutes = routes.filter(r =>
            r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.gabs_route_code.toLowerCase().includes(searchTerm.toLowerCase())
      );

      return (
            <div className="container mx-auto py-8 px-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <h1 className="text-2xl sm:text-3xl font-bold">Route Explorer</h1>
                        <Link href="/campaigns/new">
                              <Button className="w-full sm:w-auto">Create Campaign</Button>
                        </Link>
                  </div>

                  <div className="flex flex-col lg:flex-row gap-6">
                        {/* Sidebar / Filters */}
                        <div className="w-full lg:w-1/4 space-y-4">
                              <Card>
                                    <CardHeader className="bg-primary/5 border-b border-primary/10">
                                          <CardTitle className="text-lg">Filters</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                          <div>
                                                <label className="text-sm font-medium mb-1 block">Search</label>
                                                <Input
                                                      placeholder="Route name or code..."
                                                      value={searchTerm}
                                                      onChange={(e) => setSearchTerm(e.target.value)}
                                                />
                                          </div>
                                          {/* Add more filters here later (Corridor, Tier, etc.) */}
                                          <div className="pt-4 text-sm text-muted-foreground">
                                                Showing {filteredRoutes.length} routes
                                          </div>
                                    </CardContent>
                              </Card>
                        </div>

                        {/* Main Content */}
                        <div className="w-full lg:w-3/4 grid gap-4 sm:grid-cols-1 md:grid-cols-2">
                              {loading ? (
                                    <p>Loading routes...</p>
                              ) : (
                                    filteredRoutes.map((route) => (
                                          <Card key={route.id} className="hover:border-primary/50 transition-colors">
                                                <CardHeader className="bg-primary/5 border-b border-primary/10">
                                                      <div className="flex justify-between items-start">
                                                            <CardTitle className="text-base font-semibold">{route.name}</CardTitle>
                                                            <span className="text-xs bg-muted px-2 py-1 rounded font-mono">
                                                                  {route.gabs_route_code}
                                                            </span>
                                                      </div>
                                                      <p className="text-sm text-muted-foreground">{route.corridors?.name}</p>
                                                </CardHeader>
                                                <CardContent>
                                                      <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                                                            <div>
                                                                  <span className="text-muted-foreground block text-xs">Daily Riders</span>
                                                                  <span className="font-medium">{route.estimated_daily_ridership?.toLocaleString()}</span>
                                                            </div>
                                                            <div>
                                                                  <span className="text-muted-foreground block text-xs">Tier</span>
                                                                  <span className="font-medium capitalize">{route.tier?.replace(/_/g, ' ')}</span>
                                                            </div>
                                                            <div>
                                                                  <span className="text-muted-foreground block text-xs">Distance</span>
                                                                  <span className="font-medium">{route.distance_km} km</span>
                                                            </div>
                                                            <div>
                                                                  <span className="text-muted-foreground block text-xs">Trips (Wk/Wknd)</span>
                                                                  <span className="font-medium">{route.weekday_trips_per_day} / {route.weekend_trips_per_day}</span>
                                                            </div>
                                                      </div>
                                                </CardContent>
                                          </Card>
                                    ))
                              )}
                        </div>
                  </div>
            </div>
      );
}
