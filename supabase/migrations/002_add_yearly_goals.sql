-- Migration: Add 'year' to goals period_type constraint
-- This allows yearly goals to be stored in the same goals table
-- Existing data is NOT affected

-- Drop the old constraint that only allows 'week' and 'month'
ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_period_type_check;

-- Add new constraint allowing 'week', 'month', and 'year'
ALTER TABLE goals ADD CONSTRAINT goals_period_type_check
  CHECK (period_type IN ('week', 'month', 'year'));
