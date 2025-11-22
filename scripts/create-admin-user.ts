import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase URL or Service Role Key');
      process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdminUser() {
      const adminEmail = 'admin@ubuntunet.co.za';
      const adminPassword = 'Admin@2025!'; // Change this to a secure password

      try {
            // Create user in Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                  email: adminEmail,
                  password: adminPassword,
                  email_confirm: true, // Auto-confirm email
            });

            if (authError) {
                  // If user already exists, get the existing user
                  if (authError.message.includes('already registered')) {
                        console.log('User already exists in Auth, fetching...');
                        const { data: existingUser } = await supabase.auth.admin.listUsers();
                        const user = existingUser?.users.find(u => u.email === adminEmail);
                        
                        if (user) {
                              // Create or update user in public.users table
                              const { data: userData, error: userError } = await supabase
                                    .from('users')
                                    .upsert({
                                          id: user.id,
                                          email: adminEmail,
                                          role: 'super_admin'
                                    }, {
                                          onConflict: 'email'
                                    })
                                    .select()
                                    .single();

                              if (userError) {
                                    console.error('Error creating user record:', userError);
                              } else {
                                    console.log('✅ Admin user updated successfully!');
                                    console.log('Email:', adminEmail);
                                    console.log('Password:', adminPassword);
                                    console.log('Role: super_admin');
                              }
                        }
                  } else {
                        console.error('Error creating auth user:', authError);
                  }
                  return;
            }

            if (!authData.user) {
                  console.error('Failed to create user');
                  return;
            }

            // Create user record in public.users table
            const { data: userData, error: userError } = await supabase
                  .from('users')
                  .insert({
                        id: authData.user.id,
                        email: adminEmail,
                        role: 'super_admin'
                  })
                  .select()
                  .single();

            if (userError) {
                  console.error('Error creating user record:', userError);
                  return;
            }

            console.log('✅ Admin user created successfully!');
            console.log('Email:', adminEmail);
            console.log('Password:', adminPassword);
            console.log('Role: super_admin');
            console.log('User ID:', authData.user.id);

      } catch (error: any) {
            console.error('Error:', error);
      }
}

createAdminUser();

