-- Add contact information fields to campaigns table
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS contact_info JSONB;

-- Add comment to explain the structure
COMMENT ON COLUMN campaigns.contact_info IS 'Stores contact information for the booking: {firstName, lastName, email, phone, company}';

