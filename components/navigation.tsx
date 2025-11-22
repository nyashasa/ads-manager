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
            checkAuth();
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
            <header className="border-b bg-background px-6 py-4 flex items-center justify-between sticky top-0 z-50">
                  <Link href="/" className="flex items-center gap-2">
                        <div className="bg-primary text-primary-foreground p-1.5 rounded font-bold text-lg">UN</div>
                        <span className="font-semibold text-lg">UbuntuNet Ads Manager</span>
                  </Link>
                  <div className="flex items-center gap-4">
                        {isAuthenticated ? (
                              isAdmin ? (
                                    <>
                                          <span className="text-sm text-muted-foreground">Admin</span>
                                          <Link href="/admin/pricing">
                                                <Button variant="outline" size="sm">Admin Panel</Button>
                                          </Link>
                                          <Button variant="ghost" size="sm" onClick={handleLogout}>Logout</Button>
                                    </>
                              ) : (
                                    <>
                                          <span className="text-sm text-muted-foreground">Internal Ops View</span>
                                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                                                OP
                                          </div>
                                    </>
                              )
                        ) : (
                              // Not authenticated - show login button
                              <Link href="/admin/login">
                                    <Button variant="outline" size="sm">Login</Button>
                              </Link>
                        )}
                  </div>
            </header>
      );
}

