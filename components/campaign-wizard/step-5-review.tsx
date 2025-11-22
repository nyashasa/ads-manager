'use client';

import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';

export default function Step5Review({ data }: any) {
      return (
            <div className="space-y-6">
                  <Card className="border-primary/20 bg-primary/5">
                        <CardContent className="pt-6">
                              <div className="flex flex-col items-center justify-center text-center space-y-4 py-8">
                                    <CheckCircle2 className="h-8 w-8 text-primary" />
                                    <div>
                                          <h3 className="text-2xl font-bold mb-2">Ready to Submit</h3>
                                          <p className="text-muted-foreground">
                                                Review your campaign details in the summary sidebar. 
                                                Click "Submit" to create your campaign.
                                          </p>
                                    </div>
                              </div>
                        </CardContent>
                  </Card>
            </div>
      );
}
