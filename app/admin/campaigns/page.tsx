'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CampaignApprovalModal } from '@/components/admin/campaign-approval-modal';
import { CheckCircle2, XCircle, Clock, Eye } from 'lucide-react';

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
      created_at: string;
      flights?: Array<any>; // Flights can have various properties
}

export default function AdminCampaignsPage() {
      const [campaigns, setCampaigns] = useState<Campaign[]>([]);
      const [loading, setLoading] = useState(true);
      const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
      const [approvalModalOpen, setApprovalModalOpen] = useState(false);

      useEffect(() => {
            fetchCampaigns();
      }, []);

      const fetchCampaigns = async () => {
            try {
                  const { data, error } = await supabase
                        .from('campaigns')
                        .select(`
                              *,
                              advertisers!campaigns_advertiser_id_fkey(name),
                              flights(*)
                        `)
                        .order('created_at', { ascending: false });

                  if (error) throw error;
                  
                  console.log('Fetched campaigns:', data);
                  
                  // Transform data to match interface
                  const transformedData = (data || []).map((campaign: any) => ({
                        ...campaign,
                        advertiser: campaign.advertisers ? { name: campaign.advertisers.name } : { name: 'N/A' },
                  }));
                  
                  console.log('Transformed campaigns:', transformedData);
                  setCampaigns(transformedData);
            } catch (error) {
                  console.error('Error fetching campaigns:', error);
            } finally {
                  setLoading(false);
            }
      };

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

      const handleViewCampaign = (campaign: Campaign) => {
            setSelectedCampaign(campaign);
            setApprovalModalOpen(true);
      };

      const handleApprovalComplete = () => {
            fetchCampaigns();
            setApprovalModalOpen(false);
            setSelectedCampaign(null);
      };

      if (loading) {
            return (
                  <div className="flex items-center justify-center min-h-[400px]">
                        <p className="text-muted-foreground">Loading campaigns...</p>
                  </div>
            );
      }

      // Group campaigns by status
      const pendingCampaigns = campaigns.filter(c => c.status === 'pending_approval');
      const approvedCampaigns = campaigns.filter(c => c.status === 'approved');
      const rejectedCampaigns = campaigns.filter(c => c.status === 'rejected');
      
      // Debug logging
      console.log('All campaigns:', campaigns);
      console.log('Pending campaigns:', pendingCampaigns);
      console.log('Campaign statuses:', campaigns.map(c => ({ id: c.id, name: c.name, status: c.status })));

      const renderCampaignCard = (campaign: Campaign) => (
            <Card key={campaign.id} className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => handleViewCampaign(campaign)}>
                  <CardHeader className="bg-primary/5 border-b border-primary/10">
                        <div className="flex justify-between items-start">
                              <CardTitle className="text-base font-semibold">{campaign.name}</CardTitle>
                              {getStatusBadge(campaign.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{campaign.advertiser?.name || 'N/A'}</p>
                  </CardHeader>
                  <CardContent>
                        <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                              <div>
                                    <span className="text-muted-foreground block text-xs">Objective</span>
                                    <span className="font-medium capitalize">{campaign.objective?.replace('_', ' ') || 'N/A'}</span>
                              </div>
                              {campaign.flights?.[0]?.estimated_cost && (
                                    <div>
                                          <span className="text-muted-foreground block text-xs">Est. Cost</span>
                                          <span className="font-medium">R {Number(campaign.flights[0].estimated_cost).toLocaleString()}</span>
                                    </div>
                              )}
                              {campaign.start_date && (
                                    <div>
                                          <span className="text-muted-foreground block text-xs">Start Date</span>
                                          <span className="font-medium">{new Date(campaign.start_date).toLocaleDateString()}</span>
                                    </div>
                              )}
                              {campaign.end_date && (
                                    <div>
                                          <span className="text-muted-foreground block text-xs">End Date</span>
                                          <span className="font-medium">{new Date(campaign.end_date).toLocaleDateString()}</span>
                                    </div>
                              )}
                        </div>
                        {campaign.flights?.[0]?.estimated_reach && (
                              <div className="mt-3 pt-3 border-t">
                                    <span className="text-muted-foreground block text-xs mb-1">Est. Reach</span>
                                    <span className="font-medium">{Number(campaign.flights[0].estimated_reach).toLocaleString()}</span>
                              </div>
                        )}
                  </CardContent>
            </Card>
      );

      return (
            <div className="space-y-6">
                  <div className="flex justify-between items-center">
                        <div>
                              <h2 className="text-2xl font-bold">Campaigns</h2>
                              <p className="text-sm text-muted-foreground mt-1">
                                    {campaigns.length} total campaigns
                              </p>
                        </div>
                  </div>

                  {/* Kanban Board */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Pending Column */}
                        <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                          <Clock className="h-5 w-5" />
                                          Pending
                                    </h3>
                                    <Badge variant="secondary" className="inline-flex items-center gap-1">
                                          {pendingCampaigns.length}
                                    </Badge>
                              </div>
                              <div className="space-y-4 min-h-[400px]">
                                    {pendingCampaigns.length > 0 ? (
                                          pendingCampaigns.map(renderCampaignCard)
                                    ) : (
                                          <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                                                No pending campaigns
                                          </div>
                                    )}
                              </div>
                        </div>

                        {/* Approved Column */}
                        <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                                          Approved
                                    </h3>
                                    <Badge variant="default" className="inline-flex items-center gap-1">
                                          {approvedCampaigns.length}
                                    </Badge>
                              </div>
                              <div className="space-y-4 min-h-[400px]">
                                    {approvedCampaigns.length > 0 ? (
                                          approvedCampaigns.map(renderCampaignCard)
                                    ) : (
                                          <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                                                No approved campaigns
                                          </div>
                                    )}
                              </div>
                        </div>

                        {/* Rejected Column */}
                        <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                          <XCircle className="h-5 w-5 text-red-600" />
                                          Rejected
                                    </h3>
                                    <Badge variant="destructive" className="inline-flex items-center gap-1">
                                          {rejectedCampaigns.length}
                                    </Badge>
                              </div>
                              <div className="space-y-4 min-h-[400px]">
                                    {rejectedCampaigns.length > 0 ? (
                                          rejectedCampaigns.map(renderCampaignCard)
                                    ) : (
                                          <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                                                No rejected campaigns
                                          </div>
                                    )}
                              </div>
                        </div>
                  </div>

                  {selectedCampaign && (
                        <CampaignApprovalModal
                              campaign={selectedCampaign}
                              open={approvalModalOpen}
                              onOpenChange={setApprovalModalOpen}
                              onApprovalComplete={handleApprovalComplete}
                        />
                  )}
            </div>
      );
}

