/*
  # Add n8n SMS Webhook Integration
  
  1. Changes
    - Creates a database function to call n8n webhook when SMS notifications are inserted
    - Creates a trigger to automatically send SMS via n8n when notification is created
    - Only fires for notifications with status 'pending'
  
  2. Security
    - Function executes with security definer privileges
    - Uses pg_net extension for HTTP requests
  
  3. Notes
    - n8n webhook will handle Twilio integration
    - n8n will update the notification status back to 'sent' or 'failed'
    - Webhook URL is configurable
*/

-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create function to call n8n webhook for SMS sending
CREATE OR REPLACE FUNCTION notify_n8n_sms()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  webhook_url text := 'https://n8n.shiftwith.ai/webhook/send-sms';
  payload jsonb;
BEGIN
  -- Only trigger for pending notifications
  IF NEW.status = 'pending' AND NEW.scheduled_for <= NOW() THEN
    -- Build the payload
    payload := jsonb_build_object(
      'notification_id', NEW.id,
      'recipient_phone', NEW.recipient_phone,
      'message_body', NEW.message_body,
      'notification_type', NEW.notification_type,
      'appointment_id', NEW.appointment_id
    );

    -- Call n8n webhook asynchronously
    PERFORM net.http_post(
      url := webhook_url,
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := payload
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_sms_notification_to_n8n ON sms_notifications;

-- Create trigger on sms_notifications INSERT
CREATE TRIGGER trigger_sms_notification_to_n8n
  AFTER INSERT ON sms_notifications
  FOR EACH ROW
  EXECUTE FUNCTION notify_n8n_sms();

-- Add index for better performance on scheduled notifications
CREATE INDEX IF NOT EXISTS idx_sms_notifications_pending_scheduled 
  ON sms_notifications(status, scheduled_for) 
  WHERE status = 'pending';
