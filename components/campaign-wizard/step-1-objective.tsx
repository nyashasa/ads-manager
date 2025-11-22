'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Step1Objective({ data, updateData }: any) {
      return (
            <div className="space-y-4">
                  <div className="space-y-2">
                        <Label htmlFor="advertiser">Advertiser</Label>
                        <Input
                              id="advertiser"
                              placeholder="Enter advertiser name"
                              value={data.advertiserName || ''}
                              onChange={(e) => updateData({ advertiserName: e.target.value })}
                        />
                  </div>

                  <div className="space-y-2">
                        <Label htmlFor="name">Campaign Name</Label>
                        <Input
                              id="name"
                              placeholder="e.g. Summer Promo 2025"
                              value={data.campaignName}
                              onChange={(e) => updateData({ campaignName: e.target.value })}
                        />
                  </div>

                  <div className="space-y-2">
                        <Label htmlFor="objective">Objective</Label>
                        <Select
                              value={data.objective}
                              onValueChange={(val) => updateData({ objective: val })}
                        >
                              <SelectTrigger id="objective">
                                    <SelectValue placeholder="Select Objective" />
                              </SelectTrigger>
                              <SelectContent>
                                    <SelectItem value="brand_awareness">Brand Awareness</SelectItem>
                                    <SelectItem value="traffic">Traffic</SelectItem>
                                    <SelectItem value="leads">Leads</SelectItem>
                                    <SelectItem value="voucher_redemption">Voucher Redemption</SelectItem>
                              </SelectContent>
                        </Select>
                  </div>
            </div>
      );
}
