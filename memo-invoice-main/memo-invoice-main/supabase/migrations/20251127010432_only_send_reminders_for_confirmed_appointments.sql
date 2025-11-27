/*
  # Only Send Reminders for Confirmed Appointments

  1. Changes
    - Updates notify_n8n_sms() function to check appointment status before sending reminders
    - Reminders (reminder_24h, reminder_2h) only send if appointment status is 'confirmed'
    - Other notification types (confirmation, cancellation, etc.) continue to send immediately

  2. Logic
    - For reminder notifications: check if appointment.status = 'confirmed'
    - For non-reminder notifications: send as usual (immediate send types)
    - Prevents sending reminders for pending, cancelled, or completed appointments

  3. Security
    - Function remains SECURITY DEFINER to access appointment data
    - Only processes pending SMS notifications as before
*/

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
  v_appointment_status text;
BEGIN
  -- Only process pending notifications
  IF NEW.status = 'pending' THEN
    -- For reminder notifications, check if appointment is confirmed
    IF NEW.notification_type LIKE 'reminder%' THEN
      -- Get the appointment status
      SELECT status INTO v_appointment_status
      FROM booking_appointments
      WHERE id = NEW.appointment_id;
      
      -- Only send reminder if appointment is confirmed AND scheduled time has arrived
      IF v_appointment_status = 'confirmed' AND NEW.scheduled_for <= NOW() THEN
        should_send := true;
      END IF;
    -- Immediate send for confirmation, cancellation, and staff notifications
    ELSIF NEW.notification_type IN ('booking_received', 'confirmation', 'cancellation', 'staff_notification', 'staff_assigned') THEN
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
