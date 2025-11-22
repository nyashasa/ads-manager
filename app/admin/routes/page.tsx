import { createClient } from '@supabase/supabase-js';

// We need to create a server-side client or use the one we have if it works server-side
// For simplicity in this server component, we can use the env vars directly if needed
// or better, use a utility that handles server-side auth if we had it.
// Since we are using the client-side supabase lib, we might need to adjust for server components.
// But for now, let's just fetch client-side or use a simple fetch.

// Actually, in Next.js App Router, we can fetch directly in the component.
// We need a server-safe supabase client.

import { supabase } from '@/lib/supabase';

export default async function AdminRoutesPage() {
      const { data: routes } = await supabase.from('routes').select('*, corridors(name)');

      return (
            <div className="space-y-6">
                  <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold">Routes</h2>
                        <button className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm">
                              Refresh Routes
                        </button>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm text-left">
                              <thead className="bg-muted text-muted-foreground">
                                    <tr>
                                          <th className="px-4 py-3">Code</th>
                                          <th className="px-4 py-3">Name</th>
                                          <th className="px-4 py-3">Corridor</th>
                                          <th className="px-4 py-3">Tier</th>
                                          <th className="px-4 py-3 text-right">Daily Riders</th>
                                    </tr>
                              </thead>
                              <tbody className="divide-y">
                                    {routes?.map((route: any) => (
                                          <tr key={route.id} className="hover:bg-muted/50">
                                                <td className="px-4 py-3 font-medium">{route.gabs_route_code}</td>
                                                <td className="px-4 py-3">{route.name}</td>
                                                <td className="px-4 py-3">{route.corridors?.name}</td>
                                                <td className="px-4 py-3">{route.tier}</td>
                                                <td className="px-4 py-3 text-right">{route.estimated_daily_ridership?.toLocaleString()}</td>
                                          </tr>
                                    ))}
                                    {!routes?.length && (
                                          <tr>
                                                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                                      No routes found. Run ingestion.
                                                </td>
                                          </tr>
                                    )}
                              </tbody>
                        </table>
                  </div>
            </div>
      );
}
