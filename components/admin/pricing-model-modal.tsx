'use client';

import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';

interface PricingModelModalProps {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      onSuccess: () => void;
}

export function PricingModelModal({
      open,
      onOpenChange,
      onSuccess,
}: PricingModelModalProps) {
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState<string | null>(null);
      const [formData, setFormData] = useState({
            name: '',
            type: 'cpm' as 'cpm' | 'flat_fee' | 'hybrid',
            applicable_to: 'all' as 'brand' | 'sme' | 'all',
            active_from: undefined as Date | undefined,
            active_to: undefined as Date | undefined,
            config: '',
      });

      const handleSubmit = async (e: React.FormEvent) => {
            e.preventDefault();
            setLoading(true);
            setError(null);

            try {
                  // Parse config JSON
                  let config = {};
                  if (formData.config.trim()) {
                        try {
                              config = JSON.parse(formData.config);
                        } catch {
                              throw new Error('Invalid JSON in config field');
                        }
                  }

                  const response = await fetch('/api/pricing-models/create', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                              name: formData.name,
                              type: formData.type,
                              applicable_to: formData.applicable_to,
                              active_from: formData.active_from ? formData.active_from.toISOString().split('T')[0] : null,
                              active_to: formData.active_to ? formData.active_to.toISOString().split('T')[0] : null,
                              config,
                        }),
                  });

                  if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to create pricing model');
                  }

                  // Reset form
                  setFormData({
                        name: '',
                        type: 'cpm',
                        applicable_to: 'all',
                        active_from: undefined,
                        active_to: undefined,
                        config: '',
                  });

                  onSuccess();
                  onOpenChange(false);
            } catch (err: any) {
                  setError(err.message || 'An error occurred');
            } finally {
                  setLoading(false);
            }
      };

      return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                  <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
                        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
                              <DialogTitle>Create New Pricing Model</DialogTitle>
                              <DialogDescription>
                                    Create a new pricing model for campaigns. Configure the pricing structure and applicable rules.
                              </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                              <div className="space-y-2">
                                    <Label htmlFor="name">Model Name *</Label>
                                    <Input
                                          id="name"
                                          placeholder="e.g., 2025 Standard Pricing"
                                          value={formData.name}
                                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                          required
                                    />
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                          <Label htmlFor="type">Pricing Type *</Label>
                                          <Select
                                                value={formData.type}
                                                onValueChange={(value: 'cpm' | 'flat_fee' | 'hybrid') =>
                                                      setFormData({ ...formData, type: value })
                                                }
                                          >
                                                <SelectTrigger>
                                                      <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                      <SelectItem value="cpm">CPM (Cost Per Mille)</SelectItem>
                                                      <SelectItem value="flat_fee">Flat Fee</SelectItem>
                                                      <SelectItem value="hybrid">Hybrid</SelectItem>
                                                </SelectContent>
                                          </Select>
                                    </div>

                                    <div className="space-y-2">
                                          <Label htmlFor="applicable_to">Applicable To *</Label>
                                          <Select
                                                value={formData.applicable_to}
                                                onValueChange={(value: 'brand' | 'sme' | 'all') =>
                                                      setFormData({ ...formData, applicable_to: value })
                                                }
                                          >
                                                <SelectTrigger>
                                                      <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                      <SelectItem value="brand">Brand</SelectItem>
                                                      <SelectItem value="sme">SME</SelectItem>
                                                      <SelectItem value="all">All</SelectItem>
                                                </SelectContent>
                                          </Select>
                                    </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                          <Label htmlFor="active_from">Active From</Label>
                                          <DatePicker
                                                date={formData.active_from}
                                                onDateChange={(date) => setFormData({ ...formData, active_from: date })}
                                                placeholder="Select start date"
                                          />
                                    </div>

                                    <div className="space-y-2">
                                          <Label htmlFor="active_to">Active To</Label>
                                          <DatePicker
                                                date={formData.active_to}
                                                onDateChange={(date) => setFormData({ ...formData, active_to: date })}
                                                placeholder="Select end date"
                                          />
                                    </div>
                              </div>

                              <div className="space-y-2">
                                    <Label htmlFor="config">Configuration (JSON)</Label>
                                    <Textarea
                                          id="config"
                                          placeholder='{"base_cpm": 50, "tier_multipliers": {"tier_1_core": 1.2, "tier_2_strong": 1.0, "tier_3_longtail": 0.8}}'
                                          value={formData.config}
                                          onChange={(e) => setFormData({ ...formData, config: e.target.value })}
                                          rows={6}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                          Enter pricing configuration as JSON. This will be used for calculations.
                                    </p>
                              </div>

                                    {error && (
                                          <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                                                {error}
                                          </div>
                                    )}
                              </div>

                              <DialogFooter className="px-6 py-4 border-t flex-shrink-0 gap-2">
                                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                          Cancel
                                    </Button>
                                    <Button type="submit" disabled={loading}>
                                          {loading ? 'Creating...' : 'Create Pricing Model'}
                                    </Button>
                              </DialogFooter>
                        </form>
                  </DialogContent>
            </Dialog>
      );
}

