-- Add 'revenue' role to user_role enum type
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'revenue';
