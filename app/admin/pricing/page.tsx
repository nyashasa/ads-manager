'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PricingModelModal } from '@/components/admin/pricing-model-modal';

export default function AdminPricingPage() {
      const [pricingModels, setPricingModels] = useState<any[]>([]);
      const [loading, setLoading] = useState(true);
      const [modalOpen, setModalOpen] = useState(false);

      useEffect(() => {
            fetchPricingModels();
      }, []);

      const fetchPricingModels = async () => {
            try {
                  const { data, error } = await supabase
                        .from('pricing_models')
                        .select('*')
                        .order('name', { ascending: true });

                  if (error) {
                        console.error('Supabase error:', error);
                        console.error('Error details:', {
                              message: error.message,
                              details: error.details,
                              hint: error.hint,
                              code: error.code
                        });
                        throw error;
                  }
                  setPricingModels(data || []);
            } catch (error: any) {
                  console.error('Error fetching pricing models:', error);
                  console.error('Error type:', typeof error);
                  console.error('Error stringified:', JSON.stringify(error, null, 2));
                  // Set empty array on error so UI doesn't break
                  setPricingModels([]);
            } finally {
                  setLoading(false);
            }
      };

      if (loading) {
            return (
                  <div className="flex items-center justify-center min-h-[400px]">
                        <p className="text-muted-foreground">Loading pricing models...</p>
                  </div>
            );
      }

      return (
            <div className="space-y-6">
                  <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold">Pricing Models</h2>
                        <Button onClick={() => setModalOpen(true)}>
                              New Model
                        </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {pricingModels?.map((model: any) => (
                              <Card key={model.id}>
                                    <CardHeader className="bg-primary/5 border-b border-primary/10">
                                          <CardTitle>{model.name}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                          <div className="text-sm space-y-2">
                                                <div className="flex justify-between">
                                                      <span className="text-muted-foreground">Type:</span>
                                                      <span className="font-medium capitalize">{model.type}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                      <span className="text-muted-foreground">Applicable To:</span>
                                                      <span className="font-medium capitalize">{model.applicable_to}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                      <span className="text-muted-foreground">Status:</span>
                                                      <span className={`font-medium ${model.is_active ? 'text-green-600' : 'text-red-600'}`}>
                                                            {model.is_active ? 'Active' : 'Inactive'}
                                                      </span>
                                                </div>
                                                <div className="pt-2 border-t mt-2">
                                                      <p className="text-xs text-muted-foreground mb-1">Config Preview:</p>
                                                      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                                            {JSON.stringify(model.config, null, 2)}
                                                      </pre>
                                                </div>
                                          </div>
                                    </CardContent>
                              </Card>
                        ))}
                        {!pricingModels?.length && (
                              <div className="col-span-full text-center py-10 text-muted-foreground">
                                    No pricing models found.
                              </div>
                        )}
                  </div>

                  <PricingModelModal
                        open={modalOpen}
                        onOpenChange={setModalOpen}
                        onSuccess={fetchPricingModels}
                  />
            </div>
      );
}
