/*
  # Add anonymous access to services table

  1. Changes
    - Add policy for anonymous users to view services
    - This allows the public booking widget to display available services

  2. Security
    - Only allows SELECT (read) access
    - No write permissions for anonymous users
*/

CREATE POLICY "Anon can view services"
  ON services FOR SELECT
  TO anon
  USING (true);
