/*
  # POS System Schema for Car Mechanic Shop

  1. New Tables
    - `services`
      - `id` (uuid, primary key)
      - `name` (text) - Service name (e.g., "Oil Change")
      - `description` (text) - Service details
      - `price` (numeric) - Service price
      - `category` (text) - Service category
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `products`
      - `id` (uuid, primary key)
      - `name` (text) - Product name (e.g., "Oil Filter")
      - `description` (text) - Product details
      - `price` (numeric) - Product price
      - `category` (text) - Product category
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `customers`
      - `id` (uuid, primary key)
      - `name` (text) - Customer name
      - `phone` (text) - Phone number
      - `email` (text) - Email address
      - `vehicle_make` (text) - Vehicle manufacturer
      - `vehicle_model` (text) - Vehicle model
      - `vehicle_year` (text) - Vehicle year
      - `vehicle_plate` (text) - License plate
      - `notes` (text) - Additional notes
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `invoices`
      - `id` (uuid, primary key)
      - `customer_id` (uuid) - Reference to customer
      - `invoice_number` (text) - Unique invoice number
      - `subtotal` (numeric) - Subtotal amount
      - `tax_rate` (numeric) - Tax percentage
      - `tax_amount` (numeric) - Tax amount
      - `total` (numeric) - Total amount
      - `status` (text) - Payment status (paid/unpaid)
      - `notes` (text) - Invoice notes
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `invoice_items`
      - `id` (uuid, primary key)
      - `invoice_id` (uuid) - Reference to invoice
      - `item_type` (text) - Type: 'service' or 'product'
      - `item_id` (uuid) - Reference to service or product
      - `item_name` (text) - Name snapshot at time of invoice
      - `quantity` (numeric) - Quantity
      - `unit_price` (numeric) - Price per unit at time of invoice
      - `total_price` (numeric) - Total line item price
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated access only
    
  3. Important Notes
    - All prices stored as numeric for precision
    - Invoice items store snapshot of name/price for historical accuracy
    - Invoice numbers generated sequentially
    - Tax rate stored per invoice for flexibility
*/

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  price numeric(10, 2) NOT NULL DEFAULT 0,
  category text DEFAULT 'general',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  price numeric(10, 2) NOT NULL DEFAULT 0,
  category text DEFAULT 'general',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text DEFAULT '',
  email text DEFAULT '',
  vehicle_make text DEFAULT '',
  vehicle_model text DEFAULT '',
  vehicle_year text DEFAULT '',
  vehicle_plate text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  invoice_number text UNIQUE NOT NULL,
  subtotal numeric(10, 2) NOT NULL DEFAULT 0,
  tax_rate numeric(5, 2) NOT NULL DEFAULT 0,
  tax_amount numeric(10, 2) NOT NULL DEFAULT 0,
  total numeric(10, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'unpaid',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create invoice_items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  item_type text NOT NULL,
  item_id uuid,
  item_name text NOT NULL,
  quantity numeric(10, 2) NOT NULL DEFAULT 1,
  unit_price numeric(10, 2) NOT NULL DEFAULT 0,
  total_price numeric(10, 2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for services
CREATE POLICY "Anyone can view services"
  ON services FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can insert services"
  ON services FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update services"
  ON services FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete services"
  ON services FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for products
CREATE POLICY "Anyone can view products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for customers
CREATE POLICY "Anyone can view customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete customers"
  ON customers FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for invoices
CREATE POLICY "Anyone can view invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can insert invoices"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete invoices"
  ON invoices FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for invoice_items
CREATE POLICY "Anyone can view invoice_items"
  ON invoice_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can insert invoice_items"
  ON invoice_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update invoice_items"
  ON invoice_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete invoice_items"
  ON invoice_items FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);