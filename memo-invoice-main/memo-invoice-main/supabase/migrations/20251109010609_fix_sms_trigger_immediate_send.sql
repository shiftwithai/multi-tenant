/*
  # Fix SMS Trigger for Immediate Sending
  
  1. Changes
    - Updates the notify_n8n_sms() function to send immediately for certain notification types
    - Confirmation, cancellation, and staff notifications send immediately
    - Only reminder notifications check scheduled_for time
  
  2. Logic
    - Immediate send types: 'confirmation', 'cancellation', 'staff_notification'
    - Scheduled send types: 'reminder_24h', 'reminder_2h', or any other reminder types
    - All pending notifications will trigger, but timing depends on type
  
  3. Notes
    - This ensures customers get instant confirmation/cancellation messages
    - Reminders still respect the scheduled_for time
*/

-- Update the trigger function to handle immediate vs scheduled sends
CREATE OR REPLACE FUNCTION notify_n8n_sms()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  webhook_url text := 'https://n8n.shiftwith.ai/webhook/send-sms';
  payload jsonb;
  should_send boolean := false;
BEGIN
  -- Only process pending notifications
  IF NEW.status = 'pending' THEN
    -- Immediate send for confirmation, cancellation, and staff notifications
    IF NEW.notification_type IN ('confirmation', 'cancellation', 'staff_notification') THEN
      should_send := true;
    -- Scheduled send for reminders - only if scheduled time has arrived
    ELSIF NEW.notification_type LIKE 'reminder%' AND NEW.scheduled_for <= NOW() THEN
      should_send := true;
    -- Any other pending notification with past scheduled time
    ELSIF NEW.scheduled_for <= NOW() THEN
      should_send := true;
    END IF;

    -- Send the webhook if conditions are met
    IF should_send THEN
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
  END IF;

  RETURN NEW;
END;
$$;
