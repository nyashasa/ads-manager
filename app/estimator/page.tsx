'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Info, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function EstimatorPage() {
      const [routes, setRoutes] = useState<any[]>([]);
      const [selectedRouteIds, setSelectedRouteIds] = useState<string[]>([]);
      const [loadingRoutes, setLoadingRoutes] = useState(true);

      const [startDate, setStartDate] = useState<Date | undefined>();
      const [endDate, setEndDate] = useState<Date | undefined>();
      const [sov, setSov] = useState(50);
      const [estimate, setEstimate] = useState<any>(null);
      const [loadingEstimate, setLoadingEstimate] = useState(false);
      const [showAssumptions, setShowAssumptions] = useState(false);
      const [maxAvailableSOV, setMaxAvailableSOV] = useState<number | null>(null);
      const [availabilityLoading, setAvailabilityLoading] = useState(false);
      const [unavailableDates, setUnavailableDates] = useState<string[]>([]);
      const [routeAvailability, setRouteAvailability] = useState<Record<string, {
            hasLimitedAvailability: boolean;
            maxBookedSOV: number;
            datesWithBooking: string[];
            minAvailableSOV: number;
      }>>({});

      useEffect(() => {
            async function fetchRoutes() {
                  const { data } = await supabase
                        .from('routes')
                        .select('*, corridors(name)')
                        .order('name');
                  if (data) setRoutes(data);
                  setLoadingRoutes(false);
            }
            fetchRoutes();
      }, []);

      // Fetch route availability when routes are selected (without dates - just to show "Limited" badge)
      useEffect(() => {
            const fetchRouteAvailability = async () => {
                  if (selectedRouteIds.length === 0) {
                        setRouteAvailability({});
                        return;
                  }

                  try {
                        const routeIdsParam = selectedRouteIds.join(',');
                        const res = await fetch(`/api/routes/availability?routeIds=${routeIdsParam}`);
                        
                        if (res.ok) {
                              const availabilityData = await res.json();
                              setRouteAvailability(availabilityData.routes || {});
                        }
                  } catch (err) {
                        console.error('Error fetching route availability:', err);
                  }
            };

            const timer = setTimeout(fetchRouteAvailability, 300);
            return () => clearTimeout(timer);
      }, [selectedRouteIds]);

      const handleCalculate = async () => {
            if (selectedRouteIds.length === 0 || !startDate || !endDate) return;

            setLoadingEstimate(true);
            try {
                  const res = await fetch('/api/pricing/estimate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                              pricingModelId: 'default', // The API handles fetching the active model if we don't pass a specific ID, or we might need to fix the API to do so. 
                              // Actually my API implementation required an ID. Let's check route.ts.
                              // It does: const { pricingModelId, flight } = body;
                              // And: .eq('id', pricingModelId)
                              // I should probably fetch the active model first or hardcode a known ID for now.
                              // For this prototype, I'll fetch the first active model.
                              advertiserId: 'estimator-tool',
                              flight: {
                                    routeIds: selectedRouteIds,
                                    startDate,
                                    endDate,
                                    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
                                    dayparts: ['morning_peak', 'daytime', 'evening_peak'],
                                    shareOfVoice: sov / 100,
                                    placementType: 'portal_banner'
                              }
                        })
                  });

                  // Wait, I need a valid pricingModelId. 
                  // Let's fetch it on mount.

                  const result = await res.json();
                  setEstimate(result);
            } catch (err) {
                  console.error(err);
            } finally {
                  setLoadingEstimate(false);
            }
      };

      const [pricingModelId, setPricingModelId] = useState('');

      useEffect(() => {
            async function fetchModel() {
                  const { data } = await supabase.from('pricing_models').select('id').limit(1).single();
                  if (data) setPricingModelId(data.id);
            }
            fetchModel();
      }, []);

      // Fetch availability when routes/dates change
      useEffect(() => {
            const fetchAvailability = async () => {
                  if (selectedRouteIds.length === 0 || !startDate || !endDate) {
                        setMaxAvailableSOV(null);
                        setUnavailableDates([]);
                        return;
                  }

                  setAvailabilityLoading(true);
                  try {
                        const res = await fetch('/api/campaigns/availability', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                    routeIds: selectedRouteIds,
                                    startDate: startDate ? (() => {
                                          const year = startDate.getFullYear();
                                          const month = String(startDate.getMonth() + 1).padStart(2, '0');
                                          const day = String(startDate.getDate()).padStart(2, '0');
                                          return `${year}-${month}-${day}`;
                                    })() : '',
                                    endDate: endDate ? (() => {
                                          const year = endDate.getFullYear();
                                          const month = String(endDate.getMonth() + 1).padStart(2, '0');
                                          const day = String(endDate.getDate()).padStart(2, '0');
                                          return `${year}-${month}-${day}`;
                                    })() : '',
                                    dayparts: ['morning_peak', 'daytime', 'evening_peak'], // Default dayparts
                              }),
                        });

                        if (res.ok) {
                              const data = await res.json();
                              const maxSOV = Math.round(data.maxAvailableSOV * 100); // Convert to percentage
                              setMaxAvailableSOV(maxSOV);
                              const unavailableDatesList = data.unavailableDates || [];
                              console.log('Estimator: Setting unavailableDates:', unavailableDatesList);
                              setUnavailableDates(unavailableDatesList);
                              
                              // Auto-adjustment for low availability (<10%)
                              if (maxSOV < 10 && sov > maxSOV) {
                                    // Automatically set to max available
                                    setSov(maxSOV);
                              } else if (sov > maxSOV) {
                                    // For higher availability, just cap it
                                    setSov(maxSOV);
                              }
                        } else {
                              // If availability check fails, default to 100% (fallback)
                              setMaxAvailableSOV(100);
                              setUnavailableDates([]);
                        }
                  } catch (err) {
                        console.error('Error fetching availability:', err);
                        setMaxAvailableSOV(100); // Fallback to 100%
                        setUnavailableDates([]);
                  } finally {
                        setAvailabilityLoading(false);
                  }
            };

            const timer = setTimeout(fetchAvailability, 500);
            return () => clearTimeout(timer);
      }, [selectedRouteIds, startDate, endDate, sov]);

      // Wrap calculate in a useEffect to auto-calc when inputs change (debounced)
      useEffect(() => {
            const timer = setTimeout(() => {
                  if (pricingModelId && selectedRouteIds.length > 0 && startDate && endDate) {
                        // Re-implement fetch here to use the state ID
                        fetch('/api/pricing/estimate', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                    pricingModelId,
                                    advertiserId: 'estimator-tool',
                                    flight: {
                                          routeIds: selectedRouteIds,
                                          startDate: startDate ? (() => {
                                                const year = startDate.getFullYear();
                                                const month = String(startDate.getMonth() + 1).padStart(2, '0');
                                                const day = String(startDate.getDate()).padStart(2, '0');
                                                return `${year}-${month}-${day}`;
                                          })() : '',
                                          endDate: endDate ? (() => {
                                                const year = endDate.getFullYear();
                                                const month = String(endDate.getMonth() + 1).padStart(2, '0');
                                                const day = String(endDate.getDate()).padStart(2, '0');
                                                return `${year}-${month}-${day}`;
                                          })() : '',
                                          daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
                                          dayparts: ['morning_peak', 'daytime', 'evening_peak'],
                                          shareOfVoice: sov / 100,
                                          placementType: 'portal_banner'
                                    }
                              })
                        })
                              .then(res => res.json())
                              .then(data => setEstimate(data))
                              .catch(err => console.error(err));
                  }
            }, 800);
            return () => clearTimeout(timer);
      }, [selectedRouteIds, startDate, endDate, sov, pricingModelId]);


      const toggleRoute = (id: string) => {
            setSelectedRouteIds(prev =>
                  prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
            );
      };

      return (
            <div className="container mx-auto py-8 px-4">
                  <h1 className="text-3xl font-bold mb-6">
                        Quick Estimator
                  </h1>

                  <div className="grid md:grid-cols-3 gap-6">
                        {/* Left Column: Inputs */}
                        <div className="md:col-span-2 space-y-6">

                              {/* Routes Selection */}
                              <Card>
                                    <CardHeader className="bg-primary/5 border-b border-primary/10">
                                          <CardTitle>1. Select Routes</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                          <div className="h-64 overflow-y-auto border rounded-md p-4 space-y-2">
                                                {loadingRoutes ? (
                                                      <p>Loading routes...</p>
                                                ) : (
                                                      routes.map(route => {
                                                            const availability = routeAvailability[route.id];
                                                            const hasLimitedAvailability = availability?.hasLimitedAvailability || false;
                                                            // Use nullish coalescing (??) instead of || to handle 0 correctly
                                                            const minAvailableSOV = availability?.minAvailableSOV ?? undefined;
                                                            
                                                            return (
                                                                  <div key={route.id} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded">
                                                                        <Checkbox
                                                                              id={`est-${route.id}`}
                                                                              checked={selectedRouteIds.includes(route.id)}
                                                                              onCheckedChange={() => toggleRoute(route.id)}
                                                                        />
                                                                        <div className="grid gap-1 flex-1">
                                                                              <div className="flex items-center gap-2">
                                                                                    <Label htmlFor={`est-${route.id}`} className="font-medium cursor-pointer">
                                                                                          {route.name}
                                                                                    </Label>
                                                                                    {hasLimitedAvailability && (
                                                                                          <Badge variant="outline" className="text-xs bg-amber-50 border-amber-200 text-amber-700">
                                                                                                Limited
                                                                                          </Badge>
                                                                                    )}
                                                                              </div>
                                                                              <span className="text-xs text-muted-foreground">
                                                                                    {route.corridors?.name} • {route.estimated_daily_ridership?.toLocaleString()} riders
                                                                                    {hasLimitedAvailability && startDate && endDate && minAvailableSOV !== undefined && (
                                                                                          <span className="ml-2 text-amber-600">
                                                                                                • {Math.round(minAvailableSOV * 100)}% available
                                                                                          </span>
                                                                                    )}
                                                                              </span>
                                                                        </div>
                                                                  </div>
                                                            );
                                                      })
                                                )}
                                          </div>
                                          <div className="mt-2 text-sm text-muted-foreground text-right">
                                                {selectedRouteIds.length} routes selected
                                          </div>
                                    </CardContent>
                              </Card>

                              {/* Parameters */}
                              <Card>
                                    <CardHeader className="bg-primary/5 border-b border-primary/10">
                                          <CardTitle>2. Campaign Parameters</CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                          <div className="space-y-2">
                                                <Label>Start Date</Label>
                                                <DatePicker date={startDate} onDateChange={setStartDate} placeholder="Select start date" />
                                          </div>
                                          <div className="space-y-2">
                                                <Label>End Date</Label>
                                                <DatePicker date={endDate} onDateChange={setEndDate} placeholder="Select end date" />
                                          </div>
                                          <div className="col-span-1 sm:col-span-2 space-y-2">
                                                <div className="flex justify-between items-center">
                                                      <Label>Ad Delivery (Sessions to Reach)</Label>
                                                      <div className="flex items-center gap-2">
                                                            {maxAvailableSOV !== null && maxAvailableSOV < 100 && (
                                                                  <span className="text-xs text-muted-foreground">
                                                                        Max available: {maxAvailableSOV}%
                                                                  </span>
                                                            )}
                                                            <span className="text-sm font-medium text-foreground">
                                                                  {sov >= 10 && sov <= 20 ? 'Light' : 
                                                                   sov >= 30 && sov <= 50 ? 'Standard' : 
                                                                   sov >= 60 && sov <= 80 ? 'High' : 
                                                                   sov >= 90 ? 'Max' : 'Light'}
                                                            </span>
                                                      </div>
                                                </div>
                                                <Slider
                                                      min={10}
                                                      max={maxAvailableSOV !== null ? maxAvailableSOV : 100}
                                                      step={10}
                                                      value={[sov]}
                                                      onValueChange={(value) => setSov(value[0])}
                                                      className="w-full"
                                                      disabled={availabilityLoading}
                                                />
                                                {unavailableDates && unavailableDates.length > 0 && (
                                                      <Alert className="border-amber-200 bg-amber-50 mt-2">
                                                            <AlertDescription className="text-xs text-amber-700">
                                                                  <strong>Limited availability:</strong> The following dates have 0% delivery available and will be excluded from your estimate: {unavailableDates.map(date => {
                                                                        // Parse date string (YYYY-MM-DD) in local timezone
                                                                        const [year, month, day] = date.split('-').map(Number);
                                                                        const d = new Date(year, month - 1, day);
                                                                        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                                                  }).join(', ')}. Your estimate will only include the available dates.
                                                            </AlertDescription>
                                                      </Alert>
                                                )}
                                                {maxAvailableSOV !== null && maxAvailableSOV < 100 && unavailableDates.length === 0 && (
                                                      <div className={`text-xs border rounded p-2 ${
                                                            maxAvailableSOV < 10 
                                                                  ? 'text-red-600 bg-red-50 border-red-200' 
                                                                  : 'text-amber-600 bg-amber-50 border-amber-200'
                                                      }`}>
                                                            {maxAvailableSOV < 10 
                                                                  ? `Only ${maxAvailableSOV}% delivery left on some routes for these dates. Slider has been adjusted to maximum available.`
                                                                  : `Only ${maxAvailableSOV}% delivery is available for the selected routes and dates. Some inventory has already been booked.`
                                                            }
                                                      </div>
                                                )}
                                                <p className="text-xs text-muted-foreground">
                                                      "Ad Delivery" controls how many rider Wi-Fi sessions your ad appears in.
                                                      Higher delivery = your ad appears in a larger share of rider sessions, increasing both reach and avg times seen per rider.
                                                      
                                                </p>
                                          </div>
                                    </CardContent>
                              </Card>
                        </div>

                        {/* Right Column: Results */}
                        <div className="md:col-span-1">
                              <Card className="md:sticky md:top-6 border-primary/20 shadow-lg">
                                    <CardHeader className="bg-primary/5 border-b border-primary/10">
                                          <CardTitle className="flex items-center gap-2">
                                                Estimate
                                                {loadingEstimate && <RefreshCw className="h-4 w-4 animate-spin" />}
                                          </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6 space-y-6">
                                          {!estimate ? (
                                                <div className="text-center text-muted-foreground py-8">
                                                      Select routes and dates to see the magic numbers.
                                                </div>
                                          ) : (
                                                <TooltipProvider>
                                                      <div className="space-y-1">
                                                            <p className="text-sm text-muted-foreground">Total Impressions</p>
                                                            <p className="text-2xl font-bold">{estimate.totalImpressions?.toLocaleString()}</p>
                                                      </div>

                                                      <div className="space-y-1">
                                                            <div className="flex items-center gap-1">
                                                                  <p className="text-sm text-muted-foreground">Estimated Reach</p>
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
                                                            <p className="text-2xl font-bold">{estimate.estimatedReach?.toLocaleString()}</p>
                                                      </div>

                                                      <div className="space-y-1">
                                                            <div className="flex items-center gap-1">
                                                                  <p className="text-sm text-muted-foreground">Avg Frequency</p>
                                                                  <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                                                        </TooltipTrigger>
                                                                        <TooltipContent className="max-w-xs">
                                                                              <p className="font-medium mb-1">Avg Frequency</p>
                                                                              <p className="text-xs mb-2">How many times the average reached rider is expected to see your ad during the campaign, based on:</p>
                                                                              <ul className="text-xs space-y-0.5 list-disc list-inside">
                                                                                    <li>How often riders use these routes</li>
                                                                                    <li>How many of those Wi-Fi sessions your campaign wins (Ad Delivery %)</li>
                                                                              </ul>
                                                                        </TooltipContent>
                                                                  </Tooltip>
                                                            </div>
                                                            <p className="text-lg font-medium">
                                                                  {estimate.avgFrequency ? estimate.avgFrequency.toFixed(1) : (estimate.estimatedReach ? (estimate.totalImpressions / estimate.estimatedReach).toFixed(1) : 0)}× per rider
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">Based on how many trips/sessions riders make during your campaign period.</p>
                                                      </div>

                                                      <div className="space-y-1">
                                                            <p className="text-sm text-muted-foreground">CPM</p>
                                                            <p className="text-lg font-medium">R {estimate.cpm?.toFixed(2)}</p>
                                                      </div>

                                                      <div className="pt-4 border-t border-dashed">
                                                            <p className="text-sm text-muted-foreground mb-1">Estimated Cost</p>
                                                            <p className="text-4xl font-bold text-primary">
                                                                  R {estimate.estimatedCost?.toLocaleString()}
                                                            </p>
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
                                                                        <p>• Each Wi-Fi session shows 1 full ad experience (hero + banner).</p>
                                                                        <p>• At {sov}% delivery, we aim to show your ad in ~{sov}% of eligible sessions on these routes.</p>
                                                                        <p>• Wi-Fi adoption: 60% of riders</p>
                                                                        <p>• Campaign days: {startDate && endDate ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) : 0}</p>
                                                                        <p>• Ad Delivery Level: {sov}%</p>
                                                                  </div>
                                                            </div>
                                                      )}

                                                      <div className="flex flex-col gap-2 mt-4">
                                                            <Button
                                                                  className="w-full"
                                                                  onClick={() => {
                                                                        // Navigate to campaign wizard with pre-filled data
                                                                        const params = new URLSearchParams({
                                                                              routes: selectedRouteIds.join(','),
                                                                              startDate: startDate?.toISOString() || '',
                                                                              endDate: endDate?.toISOString() || '',
                                                                              shareOfVoice: sov.toString()
                                                                        });
                                                                        window.location.href = `/campaigns/new?${params.toString()}`;
                                                                  }}
                                                            >
                                                                  Book Campaign
                                                            </Button>
                                                            <Button className="w-full" variant="outline">
                                                                  Export Quote (PDF)
                                                            </Button>
                                                      </div>
                                                </TooltipProvider>
                                          )}
                                    </CardContent>
                              </Card>
                        </div>
                  </div>
            </div>
      );
}
