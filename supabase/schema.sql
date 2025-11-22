-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables to ensure clean slate for re-run
DROP TABLE IF EXISTS quotes CASCADE;
DROP TABLE IF EXISTS creatives CASCADE;
DROP TABLE IF EXISTS flights CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS pricing_models CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS advertisers CASCADE;
DROP TABLE IF EXISTS stops CASCADE;
DROP TABLE IF EXISTS routes CASCADE;
DROP TABLE IF EXISTS corridors CASCADE;

-- Drop existing types
DROP TYPE IF EXISTS route_direction CASCADE;
DROP TYPE IF EXISTS route_tier CASCADE;
DROP TYPE IF EXISTS advertiser_type CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS pricing_model_type CASCADE;
DROP TYPE IF EXISTS pricing_applicable_to CASCADE;
DROP TYPE IF EXISTS campaign_objective CASCADE;
DROP TYPE IF EXISTS campaign_status CASCADE;
DROP TYPE IF EXISTS flight_type CASCADE;
DROP TYPE IF EXISTS creative_format CASCADE;
DROP TYPE IF EXISTS quote_status CASCADE;

-- Enums
CREATE TYPE route_direction AS ENUM ('inbound', 'outbound', 'loop');
CREATE TYPE route_tier AS ENUM ('tier_1_core', 'tier_2_strong', 'tier_3_longtail');
CREATE TYPE advertiser_type AS ENUM ('brand', 'agency', 'sme', 'gov_ngo');
CREATE TYPE user_role AS ENUM ('advertiser_user', 'ops', 'gabs_viewer', 'super_admin');
CREATE TYPE pricing_model_type AS ENUM ('cpm', 'flat_fee', 'hybrid');
CREATE TYPE pricing_applicable_to AS ENUM ('brand', 'sme', 'all');
CREATE TYPE campaign_objective AS ENUM ('brand_awareness', 'traffic', 'leads', 'voucher_redemption', 'other');
CREATE TYPE campaign_status AS ENUM ('draft', 'pending_approval', 'approved', 'rejected', 'active', 'completed', 'cancelled');
CREATE TYPE flight_type AS ENUM ('brand', 'sme', 'test');
CREATE TYPE creative_format AS ENUM ('portal_banner', 'full_screen', 'survey', 'voucher');
CREATE TYPE quote_status AS ENUM ('draft', 'sent', 'accepted', 'expired');

-- 4.2 Corridors
CREATE TABLE corridors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    area_cluster TEXT,
    estimated_daily_ridership INTEGER,
    primary_segments JSONB,
    polygon_geojson JSONB
);

-- 4.1 Routes
CREATE TABLE routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gabs_route_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    origin TEXT,
    destination TEXT,
    direction route_direction,
    corridor_id UUID REFERENCES corridors(id),
    distance_km NUMERIC,
    weekday_trips_per_day INTEGER,
    weekend_trips_per_day INTEGER,
    peak_trips_per_day INTEGER,
    offpeak_trips_per_day INTEGER,
    estimated_daily_ridership INTEGER,
    tier route_tier,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB
);

-- 4.3 Stops
CREATE TABLE stops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    lat NUMERIC,
    lng NUMERIC,
    gabs_stop_code TEXT,
    corridor_id UUID REFERENCES corridors(id)
);

-- 4.4 Advertisers
CREATE TABLE advertisers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type advertiser_type,
    contact_name TEXT,
    contact_email TEXT,
    billing_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4.5 Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    advertiser_id UUID REFERENCES advertisers(id),
    email TEXT UNIQUE NOT NULL,
    -- password_hash TEXT, -- Handled by Supabase Auth
    role user_role DEFAULT 'advertiser_user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- 4.6 Pricing Models
CREATE TABLE pricing_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    type pricing_model_type,
    applicable_to pricing_applicable_to,
    config JSONB,
    active_from DATE,
    active_to DATE,
    is_active BOOLEAN DEFAULT true
);

-- 4.7 Campaigns
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    advertiser_id UUID REFERENCES advertisers(id),
    name TEXT NOT NULL,
    objective campaign_objective,
    status campaign_status DEFAULT 'draft',
    start_date DATE,
    end_date DATE,
    primary_segment TEXT,
    pricing_model_id UUID REFERENCES pricing_models(id),
    notes TEXT,
    contact_info JSONB,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4.8 Flights
CREATE TABLE flights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id),
    name TEXT,
    flight_type flight_type,
    start_date DATE,
    end_date DATE,
    routes UUID[], -- Array of route IDs
    corridors UUID[], -- Array of corridor IDs
    dayparts TEXT[],
    days_of_week INTEGER[],
    share_of_voice NUMERIC CHECK (share_of_voice >= 0 AND share_of_voice <= 1), -- Ad Delivery % as decimal (0.0-1.0)
    estimated_impressions BIGINT,
    estimated_reach BIGINT,
    estimated_cpm NUMERIC,
    estimated_cost NUMERIC,
    pricing_snapshot JSONB,
    status campaign_status DEFAULT 'draft'
);

-- 4.9 Creatives
CREATE TABLE creatives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id),
    name TEXT,
    format creative_format,
    asset_url TEXT,
    clickthrough_url TEXT,
    metadata JSONB
);

-- 4.10 Quotes
CREATE TABLE quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id),
    quote_number TEXT,
    total_cost NUMERIC,
    currency TEXT DEFAULT 'ZAR',
    line_items JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    status quote_status DEFAULT 'draft'
);

-- Enable Row Level Security
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE corridors ENABLE ROW LEVEL SECURITY;
ALTER TABLE stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertisers ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Basic Policies (Open for now, refine later)
-- Basic Policies (Open for now, refine later)
CREATE POLICY "Public read access for routes" ON routes FOR SELECT USING (true);
CREATE POLICY "Public read access for corridors" ON corridors FOR SELECT USING (true);
CREATE POLICY "Public read access for pricing_models" ON pricing_models FOR SELECT USING (true);

-- Allow all operations for now (Dev Mode)
CREATE POLICY "Enable all access for routes" ON routes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for corridors" ON corridors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for stops" ON stops FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for pricing_models" ON pricing_models FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for campaigns" ON campaigns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for flights" ON flights FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for creatives" ON creatives FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for quotes" ON quotes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for advertisers" ON advertisers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for users" ON users FOR ALL USING (true) WITH CHECK (true);
