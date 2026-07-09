-- Add citizen/foreigner classification for Trader accounts.
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS applicant_type TEXT DEFAULT 'not_applicable';

ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_applicant_type_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_applicant_type_check
CHECK (applicant_type IN ('citizen', 'foreigner', 'not_applicable'));
