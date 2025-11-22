'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function Step3Schedule({ data, updateData }: any) {
      const [estimate, setEstimate] = useState<any>(null);
      const [loading, setLoading] = useState(false);
      const [pricingModelId, setPricingModelId] = useState<string>('');
      const [showAssumptions, setShowAssumptions] = useState(false);
      const isFetchingRef = useRef(false);
      const lastParamsRef = useRef<string>('');

      // Create stable dependencies for the effect
      const routeIdsKey = useMemo(() => {
            const routeIds = Array.isArray(data.routeIds) ? [...data.routeIds].sort() : [];
            return routeIds.join(',');
      }, [data.routeIds]);

      const startDate = data.startDate;
      const endDate = data.endDate;
      const shareOfVoice = data.shareOfVoice || 50;

      // Fetch active pricing model on mount
      useEffect(() => {
            async function fetchPricingModel() {
                  const { data: modelData } = await supabase
                        .from('pricing_models')
                        .select('id')
                        .eq('is_active', true)
                        .limit(1)
                        .single();
                  
                  if (modelData) {
                        setPricingModelId(modelData.id);
                  }
            }
            fetchPricingModel();
      }, []);

      // Debounce estimate call - only depend on specific fields
      useEffect(() => {
            if (!pricingModelId) return;
            
            const routeIds = Array.isArray(data.routeIds) ? [...data.routeIds] : [];

            // Create a unique key for the current parameters
            const paramsKey = JSON.stringify({
                  routeIds: routeIdsKey,
                  startDate,
                  endDate,
                  shareOfVoice
            });

            // Skip if parameters haven't changed
            if (paramsKey === lastParamsRef.current) {
                  return;
            }

            // Skip if required fields are missing
            if (routeIds.length === 0 || !startDate || !endDate) {
                  return;
            }

            const timer = setTimeout(async () => {
                  // Double-check parameters haven't changed during debounce
                  const currentRouteIds = Array.isArray(data.routeIds) ? [...data.routeIds].sort() : [];
                  const currentRouteIdsKey = currentRouteIds.join(',');
                  const currentParamsKey = JSON.stringify({
                        routeIds: currentRouteIdsKey,
                        startDate: data.startDate,
                        endDate: data.endDate,
                        shareOfVoice: data.shareOfVoice || 50
                  });

                  if (currentParamsKey !== paramsKey || isFetchingRef.current) {
                        return;
                  }

                  // Prevent concurrent requests
                  if (isFetchingRef.current) {
                        return;
                  }

                  isFetchingRef.current = true;
                  setLoading(true);

                  try {
                        const res = await fetch('/api/pricing/estimate', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                    pricingModelId,
                                    advertiserId: data.advertiserName || 'new-advertiser',
                                    flight: {
                                          routeIds: routeIds,
                                          startDate: startDate,
                                          endDate: endDate,
                                          daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // Default all days
                                          dayparts: ['morning_peak', 'daytime', 'evening_peak'], // Default all
                                          shareOfVoice: shareOfVoice / 100,
                                          placementType: 'portal_banner'
                                    }
                              })
                        });
                        
                        if (!res.ok) {
                              const error = await res.json();
                              console.error('Estimate error:', error);
                              return;
                        }
                        
                        const result = await res.json();
                        
                        // Only update if parameters haven't changed during fetch
                        const finalRouteIds = Array.isArray(data.routeIds) ? [...data.routeIds].sort() : [];
                        const finalRouteIdsKey = finalRouteIds.join(',');
                        const finalParamsKey = JSON.stringify({
                              routeIds: finalRouteIdsKey,
                              startDate: data.startDate,
                              endDate: data.endDate,
                              shareOfVoice: data.shareOfVoice || 50
                        });

                        if (finalParamsKey === paramsKey) {
                              setEstimate(result);
                              lastParamsRef.current = paramsKey;
                              updateData({ estimate: result });
                        }
                  } catch (err) {
                        console.error('Error fetching estimate:', err);
                  } finally {
                        setLoading(false);
                        isFetchingRef.current = false;
                  }
            }, 800);

            return () => clearTimeout(timer);
      }, [pricingModelId, routeIdsKey, startDate, endDate, shareOfVoice, data.advertiserName, updateData]);

      return (
            <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-6">
                        <div className="space-y-4">
                              <div className="space-y-2">
                                    <Label htmlFor="start">Start Date</Label>
                                    <DatePicker
                                          date={data.startDate ? new Date(data.startDate) : undefined}
                                          onDateChange={(date) => updateData({ startDate: date?.toISOString().split('T')[0] })}
                                          placeholder="Select start date"
                                    />
                              </div>
                              <div className="space-y-2">
                                    <Label htmlFor="end">End Date</Label>
                                    <DatePicker
                                          date={data.endDate ? new Date(data.endDate) : undefined}
                                          onDateChange={(date) => updateData({ endDate: date?.toISOString().split('T')[0] })}
                                          placeholder="Select end date"
                                    />
                              </div>
                        </div>

                        <div className="space-y-2">
                              <Label>Ad Frequency / Reach Target ({data.shareOfVoice || 50}%)</Label>
                              <Slider
                                    min={10}
                                    max={100}
                                    step={10}
                                    value={[data.shareOfVoice || 50]}
                                    onValueChange={(value) => updateData({ shareOfVoice: value[0] })}
                                    className="w-full"
                              />
                              <p className="text-xs text-muted-foreground">
                                    Also known as "Share of Voice". Controls how often your ad appears.
                              </p>
                        </div>
                  </div>

                  <div>
                        <Card className="bg-muted/50">
                              <CardContent className="pt-6 space-y-4">
                                    <h3 className="font-semibold text-lg">Estimated Results</h3>
                                    {loading ? (
                                          <p className="text-sm text-muted-foreground">Calculating...</p>
                                    ) : estimate ? (
                                          <TooltipProvider>
                                                <div className="space-y-3">
                                                      <div className="flex justify-between">
                                                            <span className="text-muted-foreground">Impressions:</span>
                                                            <span className="font-bold">{estimate.totalImpressions?.toLocaleString()}</span>
                                                      </div>
                                                      <div className="flex justify-between">
                                                            <div className="flex items-center gap-1">
                                                                  <span className="text-muted-foreground">Est. Reach</span>
                                                                  <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                                                        </TooltipTrigger>
                                                                        <TooltipContent className="max-w-xs">
                                                                              <p className="font-medium mb-1">Estimated Reach</p>
                                                                              <p className="text-xs mb-2">The number of unique riders on the selected routes who are likely to see your ad at least once during the campaign.</p>
                                                                              <p className="text-xs font-medium mb-1">Based on:</p>
                                                                              <ul className="text-xs space-y-0.5 list-disc list-inside">
                                                                                    <li>Route ridership</li>
                                                                                    <li>% of riders who use UbuntuNet Wi-Fi</li>
                                                                                    <li>Your share of voice setting</li>
                                                                              </ul>
                                                                              <p className="text-xs mt-2 italic">We assume ≈60% of riders connect to Wi-Fi at least once per day.</p>
                                                                        </TooltipContent>
                                                                  </Tooltip>
                                                            </div>
                                                            <span className="font-bold">{estimate.estimatedReach?.toLocaleString()}</span>
                                                      </div>
                                                      <div className="flex justify-between">
                                                            <span className="text-muted-foreground">Avg Frequency</span>
                                                            <span className="font-medium">{estimate.estimatedReach ? (estimate.totalImpressions / estimate.estimatedReach).toFixed(1) : 0}× per rider</span>
                                                      </div>
                                                      <div className="flex justify-between">
                                                            <span className="text-muted-foreground">CPM</span>
                                                            <span>R {estimate.cpm?.toFixed(2)}</span>
                                                      </div>
                                                      <div className="border-t border-dashed pt-4 mt-2">
                                                            <div className="flex justify-between text-lg mb-1">
                                                                  <span className="font-bold">Total Cost</span>
                                                                  <span className="font-bold text-primary">R {estimate.estimatedCost?.toLocaleString()}</span>
                                                            </div>
                                                      </div>

                                                      <button
                                                            onClick={() => setShowAssumptions(!showAssumptions)}
                                                            className="text-xs text-muted-foreground hover:text-foreground underline"
                                                      >
                                                            {showAssumptions ? 'Hide' : 'View'} assumptions
                                                      </button>

                                                      {showAssumptions && (
                                                            <div className="text-xs space-y-2 p-3 bg-muted/50 rounded-md">
                                                                  <p className="font-medium">Assumptions for this estimate</p>
                                                                  <div className="space-y-1">
                                                                        <p>• Wi-Fi adoption: 60% of riders</p>
                                                                        <p>• Avg ad exposures per rider per day: 4</p>
                                                                        <p>• Campaign days: {data.startDate && data.endDate ? Math.ceil((new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) / (1000 * 60 * 60 * 24)) : 0}</p>
                                                                        <p>• Share of Voice: {data.shareOfVoice || 50}%</p>
                                                                  </div>
                                                            </div>
                                                      )}
                                                </div>
                                          </TooltipProvider>
                                    ) : (
                                          <p className="text-sm text-muted-foreground">
                                                Select routes and dates to see estimates.
                                          </p>
                                    )}
                              </CardContent>
                        </Card>
                  </div>
            </div>
      );
}
