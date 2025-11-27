/*
  # Create Appointments System

  1. New Tables
    - `appointments`
      - `id` (uuid, primary key)
      - `booknetic_id` (integer, unique) - External booking system ID
      - `customer_id` (uuid, references customers) - Linked customer
      - `customer_name` (text) - Customer name snapshot
      - `customer_email` (text) - Customer email snapshot
      - `customer_phone` (text) - Customer phone snapshot
      - `staff_name` (text) - Staff member name
      - `staff_email` (text) - Staff member email
      - `service_name` (text) - Service provided
      - `location_name` (text) - Location of appointment
      - `start_date` (timestamptz) - Appointment start time
      - `end_date` (timestamptz) - Appointment end time
      - `duration` (integer) - Duration in seconds
      - `status` (text) - approved, pending, canceled, rejected
      - `payment_status` (text) - paid, pending, not_paid, canceled
      - `total_price` (numeric) - Total appointment price
      - `notes` (text) - Additional notes
      - `created_at` (timestamptz) - Record creation time
      - `updated_at` (timestamptz) - Record update time

  2. Changes to Existing Tables
    - Add `booknetic_id` column to `customers` table for external system linking
    - Add `appointment_id` column to `invoices` table for appointment-invoice linking

  3. Security
    - Enable RLS on `appointments` table
    - Add policies for authenticated users to read appointments
    - Add policies for service role to insert/update appointments (for n8n webhook)

  4. Functions
    - Create `get_next_invoice_number()` function to safely generate unique invoice numbers

  5. Important Notes
    - Appointments will be synced from external booking system via n8n webhooks
    - Real-time subscriptions enabled for live updates
    - Invoice creation linked to appointments for tracking
    - booknetic_id ensures no duplicate appointments from external system
*/

-- Add booknetic_id to customers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'booknetic_id'
  ) THEN
    ALTER TABLE customers ADD COLUMN booknetic_id INTEGER UNIQUE;
  END IF;
END $$;

-- Add appointment_id to invoices table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'appointment_id'
  ) THEN
    ALTER TABLE invoices ADD COLUMN appointment_id UUID;
  END IF;
END $$;

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booknetic_id INTEGER UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  customer_email TEXT DEFAULT '',
  customer_phone TEXT DEFAULT '',
  staff_name TEXT DEFAULT '',
  staff_email TEXT DEFAULT '',
  service_name TEXT NOT NULL DEFAULT '',
  location_name TEXT DEFAULT '',
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  duration INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'not_paid',
  total_price NUMERIC DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add foreign key constraint for appointment_id in invoices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'invoices_appointment_id_fkey'
  ) THEN
    ALTER TABLE invoices 
    ADD CONSTRAINT invoices_appointment_id_fkey 
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index on appointment_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_invoices_appointment_id ON invoices(appointment_id);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_appointments_customer_id ON appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_date ON appointments(start_date DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_customers_booknetic_id ON customers(booknetic_id);

-- Enable RLS on appointments table
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read all appointments
CREATE POLICY "Authenticated users can read appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Service role can insert appointments (for n8n webhooks)
CREATE POLICY "Service role can insert appointments"
  ON appointments FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy: Service role can update appointments (for n8n webhooks)
CREATE POLICY "Service role can update appointments"
  ON appointments FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Service role can delete appointments
CREATE POLICY "Service role can delete appointments"
  ON appointments FOR DELETE
  TO service_role
  USING (true);

-- Create function to get next invoice number safely
CREATE OR REPLACE FUNCTION get_next_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  last_invoice_number TEXT;
  next_number INTEGER;
BEGIN
  -- Get the last invoice number
  SELECT invoice_number INTO last_invoice_number
  FROM invoices
  ORDER BY invoice_number DESC
  LIMIT 1;

  -- Extract number and increment
  IF last_invoice_number IS NULL THEN
    next_number := 1;
  ELSE
    next_number := (regexp_match(last_invoice_number, 'INV-(\d+)'))[1]::INTEGER + 1;
  END IF;

  -- Return formatted invoice number
  RETURN 'INV-' || LPAD(next_number::TEXT, 5, '0');
END;
$$;