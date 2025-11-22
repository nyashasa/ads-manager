'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Globe } from '@/components/ui/globe';
import { ArrowRight, BarChart3, Map, Settings, Calculator } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function DashboardPage() {
      const [isAdmin, setIsAdmin] = useState(false);
      const [isAuthenticated, setIsAuthenticated] = useState(false);
      const [loading, setLoading] = useState(true);
      const [stats, setStats] = useState({
            totalRoutes: 0,
            activeCampaigns: 0,
            estimatedDailyReach: 0,
      });

      useEffect(() => {
            async function fetchStats() {
                  try {
                        // Fetch total routes count
                        const { count: routesCount } = await supabase
                              .from('routes')
                              .select('*', { count: 'exact', head: true })
                              .eq('is_active', true);

                        // Fetch active campaigns count
                        const { count: campaignsCount } = await supabase
                              .from('campaigns')
                              .select('*', { count: 'exact', head: true })
                              .eq('status', 'active');

                        // Fetch estimated daily reach (sum of estimated_daily_ridership from routes)
                        const { data: routes } = await supabase
                              .from('routes')
                              .select('estimated_daily_ridership')
                              .eq('is_active', true);

                        const totalReach = routes?.reduce((sum, route) => {
                              return sum + (route.estimated_daily_ridership || 0);
                        }, 0) || 0;

                        setStats({
                              totalRoutes: routesCount || 0,
                              activeCampaigns: campaignsCount || 0,
                              estimatedDailyReach: totalReach,
                        });
                  } catch (error) {
                        console.error('Error fetching stats:', error);
                  }
            }

            if (isAuthenticated) {
                  fetchStats();
            }
      }, [isAuthenticated]);

      useEffect(() => {
            async function checkAuth() {
                  // Reset state
                  setIsAdmin(false);
                  setIsAuthenticated(false);
                  
                  try {
                        // Get current session
                        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                        
                        // If no session, definitely not admin and not authenticated
                        if (sessionError || !session) {
                              setLoading(false);
                              setIsAdmin(false);
                              setIsAuthenticated(false);
                              return;
                        }

                        // Get user from session
                        const { data: { user }, error: authError } = await supabase.auth.getUser();
                  
                        if (authError || !user) {
                              setLoading(false);
                              setIsAdmin(false);
                              setIsAuthenticated(false);
                              return;
                        }

                        // User is authenticated
                        setIsAuthenticated(true);

                        const { data: userData, error: userError } = await supabase
                              .from('users')
                              .select('role')
                              .eq('email', user.email)
                              .single();
                        
                        if (userError || !userData) {
                              setLoading(false);
                              setIsAdmin(false);
                              return;
                        }

                        const adminRoles = ['ops', 'super_admin', 'gabs_viewer'];
                        const isUserAdmin = adminRoles.includes(userData.role);
                        setIsAdmin(isUserAdmin);
                  } catch (error: any) {
                        console.error('Auth check error:', error);
                        setIsAdmin(false);
                        setIsAuthenticated(false);
                  } finally {
                        setLoading(false);
                  }
            }
            checkAuth();
      }, []);
  return (
    <div className="min-h-screen bg-muted/10">
      <main className="container mx-auto py-8 px-4">
        {/* Overview heading - Only show for authenticated users */}
        {!loading && isAuthenticated && (
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Overview</h1>
          </div>
        )}

        {/* Marketing Section - Only show for unauthenticated users */}
        {!loading && !isAuthenticated && (
          <div className="mb-12">
            {/* Hero Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/95 to-primary/90 text-primary-foreground shadow-2xl">
              {/* Decorative background elements */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
              </div>
              
              {/* Grid layout: text on left, globe on right */}
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6 items-center p-6 md:p-8 lg:p-12">
                {/* Text content */}
                <div className="max-w-2xl">
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                    Reach a captive audience of over{' '}
                    <span className="text-primary-foreground/90">200,000</span> daily commuters
                  </h2>
                  <p className="text-lg md:text-xl text-primary-foreground/80">
                    UbuntuNet lets brands and agencies explore routes, build campaigns and get transparent pricing in minutes.
                  </p>
                </div>
                
                {/* Globe */}
                <div className="relative flex items-center justify-center lg:justify-end h-full min-h-[250px] lg:min-h-[350px] pointer-events-none -mr-8 lg:-mr-12">
                  <div className="opacity-70 w-full max-w-[400px] lg:max-w-[500px]">
                    <Globe className="w-full h-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats Row - Only show for authenticated users */}
        {!loading && isAuthenticated && (
          <div className="grid gap-4 md:grid-cols-3 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Routes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalRoutes}</div>
                <p className="text-xs text-muted-foreground">Active routes</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Campaigns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeCampaigns}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.activeCampaigns === 0 ? 'No active campaigns' : `${stats.activeCampaigns} running`}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Est. Daily Reach</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.estimatedDailyReach >= 1000 
                    ? `${(stats.estimatedDailyReach / 1000).toFixed(0)}k+`
                    : stats.estimatedDailyReach.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Across all corridors</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Actions Grid */}
        <h2 className="text-xl font-semibold mb-4">Tools & Management</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

          {/* Route Explorer */}
          <Link href="/routes" className="block group">
            <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader className="bg-primary/5 border-b border-primary/10">
                <CardTitle>
                  Route Explorer
                </CardTitle>
                <CardDescription>
                  View available routes, ridership stats, and coverage maps.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-primary font-medium group-hover:underline">
                  Explore Routes <ArrowRight className="ml-1 h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Campaign Manager */}
          <Link href="/campaigns/new" className="block group">
            <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader className="bg-primary/5 border-b border-primary/10">
                <CardTitle>
                  Campaign Manager
                </CardTitle>
                <CardDescription>
                  Create new campaigns, estimate costs, and generate quotes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-primary font-medium group-hover:underline">
                  Start New Campaign <ArrowRight className="ml-1 h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Estimator Tool */}
          <Link href="/estimator" className="block group">
            <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader className="bg-primary/5 border-b border-primary/10">
                <CardTitle>
                  Quick Estimator
                </CardTitle>
                <CardDescription>
                  Calculate reach and costs instantly without creating a campaign.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-primary font-medium group-hover:underline">
                  Open Calculator <ArrowRight className="ml-1 h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Admin card - only show for authenticated users */}
          {!loading && isAuthenticated && (
            isAdmin ? (
              <Link href="/admin/pricing" className="block group">
                <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
                  <CardHeader className="bg-primary/5 border-b border-primary/10">
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5 text-primary" />
                      Admin Settings
                    </CardTitle>
                    <CardDescription>
                      Manage pricing models, user roles, and system configuration.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-primary font-medium group-hover:underline">
                      Go to Admin <ArrowRight className="ml-1 h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ) : (
              <Link href="/admin/login" className="block group">
                <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
                  <CardHeader className="bg-primary/5 border-b border-primary/10">
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5 text-primary" />
                      Admin Login
                    </CardTitle>
                    <CardDescription>
                      Sign in to access admin tools and system configuration.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-primary font-medium group-hover:underline">
                      Sign In <ArrowRight className="ml-1 h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          )}

        </div>
      </main>
    </div>
  );
}
