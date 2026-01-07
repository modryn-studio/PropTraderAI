-- Migration: Add unique constraint to prop_firms.name
-- This allows ON CONFLICT handling in seed data

ALTER TABLE prop_firms
ADD CONSTRAINT prop_firms_name_unique UNIQUE (name);
