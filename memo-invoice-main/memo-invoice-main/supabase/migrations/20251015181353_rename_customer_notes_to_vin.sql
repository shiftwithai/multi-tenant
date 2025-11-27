/*
  # Rename customer notes column to vin

  1. Changes
    - Rename the `notes` column in the `customers` table to `vin`
    - This better reflects the intended use of the field for Vehicle Identification Numbers
  
  2. Notes
    - Existing data is preserved during the rename
    - No changes to RLS policies are needed
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'notes'
  ) THEN
    ALTER TABLE customers RENAME COLUMN notes TO vin;
  END IF;
END $$;
