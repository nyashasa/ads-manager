import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Or SERVICE_ROLE_KEY if you have one, but ANON works if policies allow

if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase URL or Key');
      process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const MOCK_CORRIDORS = [
      {
            name: 'Cape Town - Bellville',
            area_cluster: 'Northern Suburbs',
            estimated_daily_ridership: 50000,
      },
      {
            name: 'Cape Town - Khayelitsha',
            area_cluster: 'Cape Flats',
            estimated_daily_ridership: 80000,
      }
];

const MOCK_ROUTES = [
      {
            gabs_route_code: 'BELL-CT',
            name: 'Bellville to Cape Town',
            origin: 'Bellville',
            destination: 'Cape Town',
            direction: 'inbound',
            distance_km: 25.5,
            weekday_trips_per_day: 40,
            weekend_trips_per_day: 20,
            peak_trips_per_day: 15,
            offpeak_trips_per_day: 25,
            estimated_daily_ridership: 12000,
            tier: 'tier_1_core',
            corridor_name: 'Cape Town - Bellville'
      },
      {
            gabs_route_code: 'KHAY-CT',
            name: 'Khayelitsha to Cape Town',
            origin: 'Khayelitsha',
            destination: 'Cape Town',
            direction: 'inbound',
            distance_km: 35.0,
            weekday_trips_per_day: 60,
            weekend_trips_per_day: 30,
            peak_trips_per_day: 25,
            offpeak_trips_per_day: 35,
            estimated_daily_ridership: 25000,
            tier: 'tier_1_core',
            corridor_name: 'Cape Town - Khayelitsha'
      }
];

const MOCK_PRICING_MODEL = {
      name: '2025 Standard Pricing',
      type: 'cpm',
      applicable_to: 'all',
      config: {
            base_cpm: {
                  tier_1_core: 150,
                  tier_2_strong: 100,
                  tier_3_longtail: 50
            },
            multipliers: {
                  daypart: {
                        morning_peak: 1.2,
                        evening_peak: 1.2,
                        daytime: 0.8
                  },
                  placement: {
                        portal_banner: 1.0,
                        full_screen: 2.0
                  }
            }
      },
      active_from: '2025-01-01',
      active_to: '2025-12-31'
};

async function seed() {
      console.log('Seeding Corridors...');
      const corridorMap = new Map();

      // Clear existing data first to avoid duplicates (since unique constraints might be missing)
      await supabase.from('routes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('stops').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('corridors').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('pricing_models').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      for (const c of MOCK_CORRIDORS) {
            const { data, error } = await supabase
                  .from('corridors')
                  .insert(c)
                  .select()
                  .single();

            if (error) {
                  console.error('Error seeding corridor:', c.name, error);
            } else {
                  corridorMap.set(c.name, data.id);
            }
      }

      console.log('Seeding Routes...');
      for (const r of MOCK_ROUTES) {
            const { corridor_name, ...routeData } = r;
            const corridorId = corridorMap.get(corridor_name);

            if (!corridorId) {
                  console.warn(`Corridor not found for route ${r.name}`);
                  continue;
            }

            const { error } = await supabase
                  .from('routes')
                  .insert({ ...routeData, corridor_id: corridorId });

            if (error) console.error('Error seeding route:', r.name, error);
      }

      console.log('Seeding Pricing Model...');
      const { error: pmError } = await supabase
            .from('pricing_models')
            .insert(MOCK_PRICING_MODEL);
      // Actually schema doesn't have unique on name. Let's just insert if not exists or something.
      // For simplicity, just insert.

      if (pmError) console.error('Error seeding pricing model:', pmError);

      console.log('Done!');
}

seed();
