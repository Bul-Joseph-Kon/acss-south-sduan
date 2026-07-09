-- Add 'awaiting_payment' to application_status enum type
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'awaiting_payment';
