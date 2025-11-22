import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
      try {
            const body = await request.json();
            const { name, type, applicable_to, active_from, active_to, config } = body;

            // Validate required fields
            if (!name || !type || !applicable_to) {
                  return NextResponse.json(
                        { error: 'Missing required fields: name, type, applicable_to' },
                        { status: 400 }
                  );
            }

            // Deactivate other models if this one is set to active
            // (You might want to only have one active model at a time)
            const isActive = true; // Default to active

            // Create pricing model
            const { data: pricingModel, error: pricingError } = await supabase
                  .from('pricing_models')
                  .insert({
                        name,
                        type,
                        applicable_to,
                        config: config || {},
                        active_from: active_from || null,
                        active_to: active_to || null,
                        is_active: isActive,
                  })
                  .select()
                  .single();

            if (pricingError) {
                  console.error('Error creating pricing model:', pricingError);
                  
                  // Check if it's a unique constraint violation
                  if (pricingError.code === '23505') {
                        return NextResponse.json(
                              { error: 'A pricing model with this name already exists' },
                              { status: 400 }
                        );
                  }

                  return NextResponse.json(
                        { error: 'Failed to create pricing model' },
                        { status: 500 }
                  );
            }

            return NextResponse.json(
                  { message: 'Pricing model created successfully', pricingModel },
                  { status: 200 }
            );
      } catch (error) {
            console.error('Unhandled pricing model creation error:', error);
            return NextResponse.json(
                  { error: 'An unexpected error occurred' },
                  { status: 500 }
            );
      }
}

