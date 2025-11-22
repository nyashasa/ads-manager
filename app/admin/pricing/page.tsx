import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { supabase } from '@/lib/supabase';

export default async function AdminPricingPage() {
      const { data: pricingModels } = await supabase.from('pricing_models').select('*');

      return (
            <div className="space-y-6">
                  <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold">Pricing Models</h2>
                        <button className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm">
                              New Model
                        </button>
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
            </div>
      );
}
