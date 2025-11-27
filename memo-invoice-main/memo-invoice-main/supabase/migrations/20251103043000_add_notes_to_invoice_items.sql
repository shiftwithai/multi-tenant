/*
  # Add notes column to invoice_items table

  1. Changes
    - Add `notes` column to `invoice_items` table
      - Type: text
      - Default: empty string
      - Nullable: true
  
  2. Important Notes
    - This allows line items to have optional notes/descriptions
    - Existing invoice items will have null notes (handled by application with default '')
*/

-- Add notes column to invoice_items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_items' AND column_name = 'notes'
  ) THEN
    ALTER TABLE invoice_items ADD COLUMN notes text DEFAULT '';
  END IF;
END $$;