'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function formatDate(dateString: string | undefined): string {
      if (!dateString) return 'Not set';
      
      try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
            });
      } catch {
            return dateString;
      }
}

export default function CampaignSummary({ data }: any) {
      return (
            <Card className="sticky top-6 border-primary/20 shadow-lg">
                  <CardHeader className="bg-primary/5 border-b border-primary/10">
                        <CardTitle>Campaign Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                        {/* Campaign Details */}
                        <div className="space-y-4">
                              <div>
                                    <p className="text-sm text-muted-foreground">Advertiser</p>
                                    <p className="font-medium">{data.advertiserName || 'Not specified'}</p>
                              </div>
                              <div>
                                    <p className="text-sm text-muted-foreground">Campaign Name</p>
                                    <p className="font-medium">{data.campaignName || 'Untitled'}</p>
                              </div>
                              <div>
                                    <p className="text-sm text-muted-foreground">Objective</p>
                                    <p className="font-medium capitalize">{data.objective?.replace('_', ' ') || 'Not set'}</p>
                              </div>
                              <div>
                                    <p className="text-sm text-muted-foreground">Dates</p>
                                    <p className="font-medium">
                                          {formatDate(data.startDate)} to {formatDate(data.endDate)}
                                    </p>
                              </div>
                              <div>
                                    <p className="text-sm text-muted-foreground">Routes Selected</p>
                                    <p className="font-medium">{data.routeIds?.length || 0} routes</p>
                              </div>
                              <div>
                                    <p className="text-sm text-muted-foreground">Share of Voice</p>
                                    <p className="font-medium">{data.shareOfVoice || 50}%</p>
                              </div>
                              <div>
                                    <p className="text-sm text-muted-foreground">Creative</p>
                                    <p className="font-medium">{data.creativeAsset || 'No asset uploaded'}</p>
                              </div>
                        </div>

                        {/* Quote Estimate */}
                        {data.estimate && (
                              <div className="pt-4 border-t border-dashed">
                                    <h3 className="font-semibold mb-4">Quote Estimate</h3>
                                    <div className="space-y-2">
                                          <div className="flex justify-between">
                                                <span className="text-sm text-muted-foreground">Total Impressions</span>
                                                <span className="font-bold">{data.estimate.totalImpressions?.toLocaleString()}</span>
                                          </div>
                                          <div className="flex justify-between">
                                                <span className="text-sm text-muted-foreground">Estimated Reach</span>
                                                <span className="font-bold">{data.estimate.estimatedReach?.toLocaleString()}</span>
                                          </div>
                                          <div className="pt-2 border-t border-primary/20 mt-2 flex justify-between text-lg">
                                                <span className="font-bold">Total Cost</span>
                                                <span className="font-bold text-primary">R {data.estimate.estimatedCost?.toLocaleString()}</span>
                                          </div>
                                          <p className="text-xs text-muted-foreground mt-4">
                                                * This is an estimate. Final quote subject to approval by UbuntuNet Ops.
                                          </p>
                                    </div>
                              </div>
                        )}
                  </CardContent>
            </Card>
      );
}

