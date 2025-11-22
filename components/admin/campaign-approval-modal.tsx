'use client';

import { useState, useEffect } from 'react';
import {
      Dialog,
      DialogContent,
      DialogDescription,
      DialogFooter,
      DialogHeader,
      DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Campaign {
      id: string;
      name: string;
      objective: string;
      status: string;
      start_date: string;
      end_date: string;
      advertiser: {
            name: string;
      };
      contact_info: {
            firstName?: string;
            lastName?: string;
            email?: string;
            phone?: string;
            company?: string;
      };
      flights?: Array<{
            id?: string;
            estimated_cost: number;
            estimated_reach: number;
            estimated_impressions: number;
            routes: string[];
            start_date?: string;
            end_date?: string;
            share_of_voice?: number;
      }>;
      notes?: string;
}

interface CampaignApprovalModalProps {
      campaign: Campaign;
      open: boolean;
      onOpenChange: (open: boolean) => void;
      onApprovalComplete: () => void;
}

export function CampaignApprovalModal({
      campaign,
      open,
      onOpenChange,
      onApprovalComplete,
}: CampaignApprovalModalProps) {
      const [action, setAction] = useState<'approve' | 'reject' | null>(null);
      const [notes, setNotes] = useState('');
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState<string | null>(null);
      const [routeNames, setRouteNames] = useState<Record<string, string>>({});

      const handleSubmit = async () => {
            if (!action) return;

            setLoading(true);
            setError(null);

            try {
                  const response = await fetch('/api/campaigns/approve', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                              campaignId: campaign.id,
                              action,
                              notes: notes.trim() || undefined,
                        }),
                  });

                  if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to update campaign');
                  }

                  onApprovalComplete();
            } catch (err: any) {
                  setError(err.message || 'An error occurred');
            } finally {
                  setLoading(false);
            }
      };

      // Fetch route names when modal opens and flight has routes
      useEffect(() => {
            const fetchRouteNames = async () => {
                  const flight = campaign.flights?.[0];
                  if (!flight || !flight.routes || flight.routes.length === 0) {
                        return;
                  }

                  try {
                        const { data: routes, error } = await supabase
                              .from('routes')
                              .select('id, name, gabs_route_code')
                              .in('id', flight.routes);

                        if (error) throw error;

                        const namesMap: Record<string, string> = {};
                        routes?.forEach(route => {
                              namesMap[route.id] = route.name || route.gabs_route_code || 'Unknown Route';
                        });

                        setRouteNames(namesMap);
                  } catch (err) {
                        console.error('Error fetching route names:', err);
                  }
            };

            if (open && campaign.flights?.[0]?.routes) {
                  fetchRouteNames();
            }
      }, [open, campaign.flights]);

      // Ensure contact_info is an object
      const contactInfo = typeof campaign.contact_info === 'object' && campaign.contact_info !== null 
            ? campaign.contact_info 
            : {};
      const flight = campaign.flights?.[0];

      const getStatusBadge = (status: string) => {
            const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any; label: string }> = {
                  draft: { variant: 'secondary', icon: Clock, label: 'Draft' },
                  pending_approval: { variant: 'default', icon: Clock, label: 'Pending Approval' },
                  approved: { variant: 'default', icon: CheckCircle2, label: 'Approved' },
                  rejected: { variant: 'destructive', icon: XCircle, label: 'Rejected' },
                  active: { variant: 'default', icon: CheckCircle2, label: 'Active' },
                  completed: { variant: 'secondary', icon: CheckCircle2, label: 'Completed' },
                  cancelled: { variant: 'destructive', icon: XCircle, label: 'Cancelled' },
            };

            const config = variants[status] || { variant: 'secondary', icon: Clock, label: status };
            const Icon = config.icon;

            return (
                  <Badge variant={config.variant} className="inline-flex items-center gap-1">
                        <Icon className="h-3 w-3" />
                        {config.label}
                  </Badge>
            );
      };

      return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                  <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
                        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
                              <DialogTitle>Review Campaign: {campaign.name}</DialogTitle>
                              <DialogDescription>
                                    Review campaign details and approve or reject the submission.
                              </DialogDescription>
                        </DialogHeader>

                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                              {/* Campaign Details */}
                              <Card>
                                    <CardHeader>
                                          <CardTitle className="text-lg">Campaign Details</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3 text-sm">
                                          <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                      <Label className="text-muted-foreground">Campaign Name</Label>
                                                      <p className="font-medium">{campaign.name}</p>
                                                </div>
                                                <div>
                                                      <Label className="text-muted-foreground">Objective</Label>
                                                      <p className="font-medium capitalize">{campaign.objective?.replace('_', ' ')}</p>
                                                </div>
                                                <div>
                                                      <Label className="text-muted-foreground">Advertiser</Label>
                                                      <p className="font-medium">{campaign.advertiser?.name || 'N/A'}</p>
                                                </div>
                                                <div>
                                                      <Label className="text-muted-foreground">Status</Label>
                                                      <div className="mt-1">
                                                            {getStatusBadge(campaign.status)}
                                                      </div>
                                                </div>
                                                {campaign.start_date && (
                                                      <div>
                                                            <Label className="text-muted-foreground">Start Date</Label>
                                                            <p className="font-medium">{new Date(campaign.start_date).toLocaleDateString()}</p>
                                                      </div>
                                                )}
                                                {campaign.end_date && (
                                                      <div>
                                                            <Label className="text-muted-foreground">End Date</Label>
                                                            <p className="font-medium">{new Date(campaign.end_date).toLocaleDateString()}</p>
                                                      </div>
                                                )}
                                          </div>
                                          {campaign.notes && (
                                                <div>
                                                      <Label className="text-muted-foreground">Notes</Label>
                                                      <p className="mt-1">{campaign.notes}</p>
                                                </div>
                                          )}
                                    </CardContent>
                              </Card>

                              {/* Contact Information */}
                              <Card>
                                    <CardHeader>
                                          <CardTitle className="text-lg">Contact Information</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2 text-sm">
                                          <div className="grid grid-cols-2 gap-4">
                                                {contactInfo.firstName && (
                                                      <div>
                                                            <Label className="text-muted-foreground">First Name</Label>
                                                            <p className="font-medium">{contactInfo.firstName}</p>
                                                      </div>
                                                )}
                                                {contactInfo.lastName && (
                                                      <div>
                                                            <Label className="text-muted-foreground">Last Name</Label>
                                                            <p className="font-medium">{contactInfo.lastName}</p>
                                                      </div>
                                                )}
                                                {contactInfo.email && (
                                                      <div>
                                                            <Label className="text-muted-foreground">Email</Label>
                                                            <p className="font-medium">{contactInfo.email}</p>
                                                      </div>
                                                )}
                                                {contactInfo.phone && (
                                                      <div>
                                                            <Label className="text-muted-foreground">Phone</Label>
                                                            <p className="font-medium">{contactInfo.phone}</p>
                                                      </div>
                                                )}
                                                {contactInfo.company && (
                                                      <div className="col-span-2">
                                                            <Label className="text-muted-foreground">Company</Label>
                                                            <p className="font-medium">{contactInfo.company}</p>
                                                      </div>
                                                )}
                                          </div>
                                    </CardContent>
                              </Card>

                              {/* Flight Details */}
                              {flight && (
                                    <Card>
                                          <CardHeader>
                                                <CardTitle className="text-lg">Flight Details</CardTitle>
                                          </CardHeader>
                                          <CardContent className="space-y-4 text-sm">
                                                <div className="grid grid-cols-2 gap-4">
                                                      {flight.start_date && (
                                                            <div>
                                                                  <Label className="text-muted-foreground">Flight Start Date</Label>
                                                                  <p className="font-medium">{new Date(flight.start_date).toLocaleDateString()}</p>
                                                            </div>
                                                      )}
                                                      {flight.end_date && (
                                                            <div>
                                                                  <Label className="text-muted-foreground">Flight End Date</Label>
                                                                  <p className="font-medium">{new Date(flight.end_date).toLocaleDateString()}</p>
                                                            </div>
                                                      )}
                                                      {flight.estimated_cost && (
                                                            <div>
                                                                  <Label className="text-muted-foreground">Estimated Cost</Label>
                                                                  <p className="font-medium">R {Number(flight.estimated_cost).toLocaleString()}</p>
                                                            </div>
                                                      )}
                                                      {flight.estimated_reach && (
                                                            <div>
                                                                  <Label className="text-muted-foreground">Estimated Reach</Label>
                                                                  <p className="font-medium">{Number(flight.estimated_reach).toLocaleString()}</p>
                                                            </div>
                                                      )}
                                                      {flight.estimated_impressions && (
                                                            <div>
                                                                  <Label className="text-muted-foreground">Estimated Impressions</Label>
                                                                  <p className="font-medium">{Number(flight.estimated_impressions).toLocaleString()}</p>
                                                            </div>
                                                      )}
                                                      {flight.share_of_voice !== undefined && flight.share_of_voice !== null && (
                                                            <div>
                                                                  <Label className="text-muted-foreground">Ad Delivery</Label>
                                                                  <p className="font-medium">{Math.round(Number(flight.share_of_voice) * 100)}%</p>
                                                            </div>
                                                      )}
                                                </div>
                                                {flight.routes && flight.routes.length > 0 && (
                                                      <div>
                                                            <Label className="text-muted-foreground mb-2 block">Routes ({flight.routes.length})</Label>
                                                            <div className="space-y-1">
                                                                  {flight.routes.map((routeId: string) => (
                                                                        <div key={routeId} className="text-sm font-medium">
                                                                              • {routeNames[routeId] || routeId.substring(0, 8) + '...'}
                                                                        </div>
                                                                  ))}
                                                            </div>
                                                      </div>
                                                )}
                                          </CardContent>
                                    </Card>
                              )}

                              {/* Review Notes */}
                              <Card>
                                    <CardHeader>
                                          <CardTitle className="text-lg">Review Notes</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                          <div className="space-y-2">
                                                <Label htmlFor="notes">Add notes (optional)</Label>
                                                <Textarea
                                                      id="notes"
                                                      placeholder="Add any notes about this decision..."
                                                      value={notes}
                                                      onChange={(e) => setNotes(e.target.value)}
                                                      rows={3}
                                                />
                                          </div>
                                          {error && (
                                                <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                                                      {error}
                                                </div>
                                          )}
                                    </CardContent>
                              </Card>
                        </div>

                        <DialogFooter className="px-6 py-4 border-t flex-shrink-0 gap-2">
                              <Button
                                    variant="default"
                                    onClick={() => {
                                          setAction('approve');
                                          handleSubmit();
                                    }}
                                    disabled={loading}
                              >
                                    {loading && action === 'approve' ? 'Approving...' : 'Approve Campaign'}
                              </Button>
                              <Button
                                    variant="outline"
                                    className="border-destructive text-destructive hover:bg-destructive hover:text-white"
                                    onClick={() => {
                                          setAction('reject');
                                          handleSubmit();
                                    }}
                                    disabled={loading}
                              >
                                    {loading && action === 'reject' ? 'Rejecting...' : 'Reject Campaign'}
                              </Button>
                        </DialogFooter>
                  </DialogContent>
            </Dialog>
      );
}

