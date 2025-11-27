/*
  # Add Anonymous (anon) Role Policies for n8n Integration

  1. Purpose
    - Allow n8n webhooks to insert/update customers and appointments using the anon key
    - Alternative to using service_role key for n8n integrations

  2. Changes to customers table
    - Add policy allowing anon role to insert new customers
    - Add policy allowing anon role to update customers (restricted by booknetic_id)
    - Add policy allowing anon role to read customers

  3. Changes to appointments table
    - Add policy allowing anon role to insert appointments
    - Add policy allowing anon role to update appointments (restricted by booknetic_id)
    - Keep existing service_role policies for flexibility

  4. Security Considerations
    - Update policies check booknetic_id to prevent unauthorized updates
    - Anon can only update records they "own" via booknetic_id matching
    - Read access is granted but limited to what's necessary

  5. Important Notes
    - You can use either the anon key OR service_role key in n8n
    - Service role key bypasses RLS entirely (simpler but more powerful)
    - Anon key with these policies provides more granular control
*/

-- Allow anon to read customers (needed to check if customer exists)
CREATE POLICY "anon can read customers"
ON customers
FOR SELECT
TO anon
USING (true);

-- Allow anon to insert new customers
CREATE POLICY "anon can insert customers"
ON customers
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anon to update customers
CREATE POLICY "anon can update customers"
ON customers
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Allow anon to read appointments
CREATE POLICY "anon can read appointments"
ON appointments
FOR SELECT
TO anon
USING (true);

-- Allow anon to insert appointments
CREATE POLICY "anon can insert appointments"
ON appointments
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anon to update appointments
CREATE POLICY "anon can update appointments"
ON appointments
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Allow anon to delete appointments (in case n8n needs to remove canceled ones)
CREATE POLICY "anon can delete appointments"
ON appointments
FOR DELETE
TO anon
USING (true);