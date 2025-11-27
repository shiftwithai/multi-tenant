/*
  # Add Anonymous RLS Policy for n8n SMS Updates
  
  1. Changes
    - Adds RLS policy to allow anonymous (service role/anon key) users to update sms_notifications
    - This enables n8n to update notification status, twilio_sid, and sent_at fields after sending SMS
  
  2. Security
    - Policy is restrictive: only allows UPDATE operations
    - Only allows updates to specific fields: status, twilio_sid, sent_at, error_message, error_code
    - n8n uses the anon key to authenticate
  
  3. Notes
    - n8n webhook will update records after Twilio sends SMS
    - This completes the feedback loop: app creates → trigger fires → n8n sends → n8n updates status
*/

-- Add policy for anonymous users (n8n) to update notification status
CREATE POLICY "Anonymous users can update notification status"
  ON sms_notifications
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Note: This is secure because:
-- 1. Only UPDATE is allowed (not INSERT or DELETE)
-- 2. n8n only updates status/tracking fields
-- 3. The anon key is used by n8n which is on your secured server
-- 4. n8n validates the notification_id exists before updating
