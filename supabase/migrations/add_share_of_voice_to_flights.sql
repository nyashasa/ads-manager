-- Add share_of_voice column to flights table
-- This stores the Ad Delivery % (0.0-1.0) directly on the flight for inventory calculations
ALTER TABLE flights
ADD COLUMN IF NOT EXISTS share_of_voice NUMERIC CHECK (share_of_voice >= 0 AND share_of_voice <= 1);

-- Add comment for clarity
COMMENT ON COLUMN flights.share_of_voice IS 'Ad Delivery percentage as decimal (0.0-1.0). Represents the share of voice/ad delivery level for this flight.';

