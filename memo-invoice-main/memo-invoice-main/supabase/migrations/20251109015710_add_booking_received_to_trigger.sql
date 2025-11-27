/*
  # Add booking_received to Immediate Send Types
  
  1. Changes
    - Updates the notify_n8n_sms() function to include 'booking_received' in immediate send types
    - Customers now get instant confirmation when they book an appointment
  
  2. Notification Types
    - Immediate send: 'booking_received', 'confirmation', 'cancellation', 'staff_notification', 'staff_assigned'
    - Scheduled send: 'reminder_24h', 'reminder_2h', and other reminder types
  
  3. Flow
    - Customer books (status='pending') → 'booking_received' sends immediately
    - Admin confirms (status='confirmed') → 'confirmation' sends immediately
    - This provides instant feedback at both stages
*/

-- Update the trigger function to include booking_received as immediate send
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
    -- Immediate send for booking_received, confirmation, cancellation, staff_notification, and staff_assigned
    IF NEW.notification_type IN ('booking_received', 'confirmation', 'cancellation', 'staff_notification', 'staff_assigned') THEN
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
