'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

export default function Navigation() {
      const pathname = usePathname();
      const [isAdmin, setIsAdmin] = useState(false);
      const [isAuthenticated, setIsAuthenticated] = useState(false);
      const [userEmail, setUserEmail] = useState<string | null>(null);

      useEffect(() => {
            async function checkAuth() {
                  // Reset state
                  setIsAdmin(false);
                  setIsAuthenticated(false);
                  setUserEmail(null);
                  
                  try {
                        // Check session first
                        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                        
                        if (sessionError || !session) {
                              return;
                        }

                        const { data: { user }, error: authError } = await supabase.auth.getUser();
                  
                        if (authError || !user) {
                              return;
                        }

                        // User is authenticated
                        setIsAuthenticated(true);
                        setUserEmail(user.email || null);
                        
                        const { data: userData, error: userError } = await supabase
                              .from('users')
                              .select('role')
                              .eq('email', user.email)
                              .single();
                        
                        if (userError || !userData) {
                              return;
                        }

                        const adminRoles = ['ops', 'super_admin', 'gabs_viewer'];
                        setIsAdmin(adminRoles.includes(userData.role));
                  } catch (error) {
                        console.error('Auth check error:', error);
                        setIsAdmin(false);
                        setIsAuthenticated(false);
                        setUserEmail(null);
                  }
            }
            
            // Check auth on mount
            checkAuth();
            
            // Listen for auth state changes (login, logout, token refresh)
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                  if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
                        await checkAuth();
                  }
            });
            
            // Cleanup subscription on unmount
            return () => {
                  subscription.unsubscribe();
            };
      }, []);

      const handleLogout = async () => {
            await supabase.auth.signOut();
            window.location.href = '/';
      };

      // Hide navigation on login page - must be after all hooks
      if (pathname === '/admin/login') {
            return null;
      }

      return (
            <header className="border-b bg-background px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-50">
                  <Link href="/" className="flex items-center gap-2 min-w-0">
                        <div className="bg-primary text-primary-foreground p-1.5 rounded font-bold text-base sm:text-lg flex-shrink-0">UN</div>
                        <span className="font-semibold text-base sm:text-lg truncate">
                              {isAuthenticated && isAdmin ? 'UbuntuNet Admin' : 'UbuntuNet Ads Manager'}
                        </span>
                  </Link>
                  <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                        {isAuthenticated ? (
                              isAdmin ? (
                                    <>
                                          <nav className="flex gap-3 sm:gap-4 text-xs sm:text-sm font-medium">
                                                <Link href="/admin/campaigns" className="hover:underline whitespace-nowrap">Campaigns</Link>
                                                <Link href="/admin/routes" className="hover:underline whitespace-nowrap">Routes</Link>
                                                <Link href="/admin/pricing" className="hover:underline whitespace-nowrap">Pricing</Link>
                                          </nav>
                                          <Button variant="outline" size="sm" onClick={handleLogout} className="text-xs sm:text-sm">Logout</Button>
                                    </>
                              ) : (
                                    <>
                                          <span className="hidden sm:inline text-sm text-muted-foreground">Internal Ops View</span>
                                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                                                OP
                                          </div>
                                    </>
                              )
                        ) : (
                              // Not authenticated - show login button
                              <Link href="/admin/login">
                                    <Button variant="outline" size="sm" className="text-xs sm:text-sm">Login</Button>
                              </Link>
                        )}
                  </div>
            </header>
      );
}

