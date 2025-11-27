/*
  # Add tax number field to invoices

  1. Changes
    - Add `tax_number` column to `invoices` table
      - Type: text
      - Nullable: allows storing customer/business tax numbers
      - Default: empty string

  2. Notes
    - This field stores the tax identification number for businesses
    - Used for tax reporting and compliance purposes
    - Optional field that can be filled during invoice creation
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'tax_number'
  ) THEN
    ALTER TABLE invoices ADD COLUMN tax_number text DEFAULT '';
  END IF;
END $$;
