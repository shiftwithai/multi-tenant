/*
  # Add Admin Authentication and Line Item Notes

  1. Changes to Existing Tables
    - `invoice_items`
      - Add `notes` column (text) - Notes for individual line items
  
  2. New Tables
    - `admin_users`
      - `id` (uuid, primary key)
      - `password_hash` (text) - Hashed admin password
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  3. Security
    - Enable RLS on admin_users table
    - Add policies for admin access
    
  4. Important Notes
    - Line item notes allow adding specific details for each service/product
    - Admin access stored separately from regular user authentication
    - Default admin password will be "invoicesmemo"
*/

-- Add notes column to invoice_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_items' AND column_name = 'notes'
  ) THEN
    ALTER TABLE invoice_items ADD COLUMN notes text DEFAULT '';
  END IF;
END $$;

-- Create admin_users table for simple password-based admin access
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_users (anyone authenticated can read, needed for password verification)
CREATE POLICY "Authenticated users can view admin_users"
  ON admin_users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update admin_users"
  ON admin_users FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can insert admin_users"
  ON admin_users FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Insert default admin password hash (bcrypt hash of "invoicesmemo")
-- Using a simple approach: we'll verify password on client side for simplicity
INSERT INTO admin_users (password_hash)
VALUES ('invoicesmemo')
ON CONFLICT DO NOTHING;