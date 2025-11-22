'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AdminLoginPage() {
      const [email, setEmail] = useState('');
      const [password, setPassword] = useState('');
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState<string | null>(null);
      const router = useRouter();

      const handleLogin = async (e: React.FormEvent) => {
            e.preventDefault();
            setError(null);
            setLoading(true);

            try {
                  const { data, error: authError } = await supabase.auth.signInWithPassword({
                        email,
                        password,
                  });

                  if (authError) {
                        setError(authError.message);
                        setLoading(false);
                        return;
                  }

                  if (data.user) {
                        // Check if user has admin role
                        const { data: userData, error: userError } = await supabase
                              .from('users')
                              .select('role')
                              .eq('email', email)
                              .single();

                        if (userError || !userData) {
                              setError('User not found in system');
                              await supabase.auth.signOut();
                              setLoading(false);
                              return;
                        }

                        // Check if user has admin privileges (ops, super_admin, or gabs_viewer)
                        const adminRoles = ['ops', 'super_admin', 'gabs_viewer'];
                        if (!adminRoles.includes(userData.role)) {
                              setError('Access denied. Admin privileges required.');
                              await supabase.auth.signOut();
                              setLoading(false);
                              return;
                        }

                        // Redirect to admin dashboard
                        router.push('/admin/pricing');
                  }
            } catch (err: any) {
                  setError(err.message || 'An error occurred during login');
            } finally {
                  setLoading(false);
            }
      };

      return (
            <div className="min-h-screen flex items-center justify-center bg-muted/10 px-4">
                  <Card className="w-full max-w-md">
                        <CardHeader>
                              <CardTitle>Admin Login</CardTitle>
                              <CardDescription>
                                    Sign in to access the admin dashboard
                              </CardDescription>
                        </CardHeader>
                        <CardContent>
                              <form onSubmit={handleLogin} className="space-y-4">
                                    {error && (
                                          <Alert variant="destructive">
                                                <AlertDescription>{error}</AlertDescription>
                                          </Alert>
                                    )}
                                    <div className="space-y-2">
                                          <Label htmlFor="email">Email</Label>
                                          <Input
                                                id="email"
                                                type="email"
                                                placeholder="admin@ubuntunet.co.za"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                                disabled={loading}
                                          />
                                    </div>
                                    <div className="space-y-2">
                                          <Label htmlFor="password">Password</Label>
                                          <Input
                                                id="password"
                                                type="password"
                                                placeholder="Enter your password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                disabled={loading}
                                          />
                                    </div>
                                    <Button type="submit" className="w-full" disabled={loading}>
                                          {loading ? 'Signing in...' : 'Sign In'}
                                    </Button>
                              </form>
                        </CardContent>
                  </Card>
            </div>
      );
}

