-- Enable Supabase Realtime replication on required tables
-- Run this SQL in your Supabase SQL editor to enable Realtime

-- Enable Realtime on profiles table
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- Enable Realtime on applications table
ALTER PUBLICATION supabase_realtime ADD TABLE applications;

-- Enable Realtime on payments table
ALTER PUBLICATION supabase_realtime ADD TABLE payments;

-- Enable Realtime on notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Enable Realtime on documents table
ALTER PUBLICATION supabase_realtime ADD TABLE documents;

-- Enable Realtime on audit_logs table
ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;

-- Verify Realtime is enabled
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
