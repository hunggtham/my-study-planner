-- Migration: Add 'year' to goals period_type constraint
-- This allows yearly goals to be stored in the same goals table.
-- Existing data is not affected.

ALTER TABLE goals
DROP CONSTRAINT IF EXISTS goals_period_type_check;

ALTER TABLE goals
ADD CONSTRAINT goals_period_type_check
CHECK (period_type IN ('week', 'month', 'year'));
