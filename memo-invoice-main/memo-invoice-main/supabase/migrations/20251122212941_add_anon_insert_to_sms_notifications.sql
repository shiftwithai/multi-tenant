/*
  # Add anonymous insert access to sms_notifications

  1. Changes
    - Add policy for anonymous users to insert SMS notifications
    - This allows the public booking widget to create SMS notification records

  2. Security
    - Only allows INSERT access for anon users
    - Notifications are created automatically when appointments are booked
    - Read/update/delete still restricted to authenticated users
*/

CREATE POLICY "Anon can create sms notifications"
  ON sms_notifications FOR INSERT
  TO anon
  WITH CHECK (true);
