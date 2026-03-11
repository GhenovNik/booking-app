-- Migrate alert_type enum from (absolute_max, percent_drop) to (min_drop)
-- and change default currency from EUR to USD

-- Step 1: add min_drop to the existing enum
ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'min_drop';

-- Step 2: migrate any existing rules to min_drop with value 0 (any drop)
UPDATE alert_rules SET type = 'min_drop', value = 0, currency = 'USD'
WHERE type IN ('absolute_max', 'percent_drop');

-- Step 3: recreate the enum with only min_drop
--   PostgreSQL doesn't support removing enum values directly,
--   so we swap the column type via a new enum.
CREATE TYPE alert_type_new AS ENUM ('min_drop');

ALTER TABLE alert_rules
  ALTER COLUMN type TYPE alert_type_new
  USING type::text::alert_type_new;

DROP TYPE alert_type;
ALTER TYPE alert_type_new RENAME TO alert_type;

-- Step 4: update default currency to USD
ALTER TABLE alert_rules ALTER COLUMN currency SET DEFAULT 'USD';
