'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AdminLayout({
      children,
}: {
      children: React.ReactNode;
}) {
      const [isAuthenticated, setIsAuthenticated] = useState(false);
      const [loading, setLoading] = useState(true);
      const router = useRouter();
      const pathname = usePathname();

      useEffect(() => {
            async function checkAuth() {
                  // Don't check auth on login page
                  if (pathname === '/admin/login') {
                        setIsAuthenticated(false);
                        setLoading(false);
                        return;
                  }

                  // Reset state
                  setIsAuthenticated(false);

                  try {
                        const { data: { user }, error: authError } = await supabase.auth.getUser();
                  
                        if (authError || !user) {
                              router.push('/admin/login');
                              setLoading(false);
                              return;
                        }

                        // Check if user has admin role
                        const { data: userData, error: userError } = await supabase
                              .from('users')
                              .select('role')
                              .eq('email', user.email)
                              .single();

                        if (userError || !userData) {
                              router.push('/admin/login');
                              setLoading(false);
                              return;
                        }

                        const adminRoles = ['ops', 'super_admin', 'gabs_viewer'];
                        if (!adminRoles.includes(userData.role)) {
                              router.push('/admin/login');
                              setLoading(false);
                              return;
                        }

                        setIsAuthenticated(true);
                  } catch (error) {
                        console.error('Auth check error:', error);
                        router.push('/admin/login');
                  } finally {
                        setLoading(false);
                  }
            }
            checkAuth();
      }, [router, pathname]);

      // Don't render admin layout on login page
      if (pathname === '/admin/login') {
            return <>{children}</>;
      }

      if (loading) {
            return (
                  <div className="min-h-screen flex items-center justify-center">
                        <p>Loading...</p>
                  </div>
            );
      }

      if (!isAuthenticated) {
            return null;
      }

      return (
            <div className="flex min-h-screen flex-col">
                  <main className="flex-1 p-6">
                        {children}
                  </main>
            </div>
      );
}
