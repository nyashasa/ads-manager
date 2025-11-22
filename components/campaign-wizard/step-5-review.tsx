'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function Step5Review({ data, updateData }: any) {
      return (
            <div className="space-y-6">
                  <Card>
                        <CardHeader>
                              <CardTitle>Contact Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                          <Label htmlFor="firstName">First Name *</Label>
                                          <Input
                                                id="firstName"
                                                placeholder="Enter your first name"
                                                value={data.firstName || ''}
                                                onChange={(e) => updateData({ firstName: e.target.value })}
                                                required
                                          />
                                    </div>
                                    <div className="space-y-2">
                                          <Label htmlFor="lastName">Last Name *</Label>
                                          <Input
                                                id="lastName"
                                                placeholder="Enter your last name"
                                                value={data.lastName || ''}
                                                onChange={(e) => updateData({ lastName: e.target.value })}
                                                required
                                          />
                                    </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                          <Label htmlFor="email">Email Address *</Label>
                                          <Input
                                                id="email"
                                                type="email"
                                                placeholder="your.email@example.com"
                                                value={data.email || ''}
                                                onChange={(e) => updateData({ email: e.target.value })}
                                                required
                                          />
                                    </div>
                                    <div className="space-y-2">
                                          <Label htmlFor="phone">Phone Number *</Label>
                                          <Input
                                                id="phone"
                                                type="tel"
                                                placeholder="+27 12 345 6789"
                                                value={data.phone || ''}
                                                onChange={(e) => updateData({ phone: e.target.value })}
                                                required
                                          />
                                    </div>
                              </div>

                              <div className="space-y-2">
                                    <Label htmlFor="company">Company / Organization</Label>
                                    <Input
                                          id="company"
                                          placeholder="Enter company name (optional)"
                                          value={data.company || ''}
                                          onChange={(e) => updateData({ company: e.target.value })}
                                    />
                              </div>

                              <div className="space-y-2">
                                    <Label htmlFor="notes">Additional Notes</Label>
                                    <Textarea
                                          id="notes"
                                          placeholder="Any additional information or special requirements..."
                                          value={data.notes || ''}
                                          onChange={(e) => updateData({ notes: e.target.value })}
                                          rows={4}
                                    />
                              </div>
                        </CardContent>
                  </Card>

                  <Card className="border-primary/20 bg-primary/5">
                        <CardContent className="pt-6">
                              <div className="flex flex-col items-center justify-center text-center space-y-4 py-4">
                                    <div>
                                          <h3 className="text-lg font-semibold mb-2">Ready to Submit</h3>
                                          <p className="text-sm text-muted-foreground">
                                                Review your campaign details in the summary sidebar. 
                                                Complete the contact information above and click "Submit" to create your campaign.
                                          </p>
                                    </div>
                              </div>
                        </CardContent>
                  </Card>
            </div>
      );
}
