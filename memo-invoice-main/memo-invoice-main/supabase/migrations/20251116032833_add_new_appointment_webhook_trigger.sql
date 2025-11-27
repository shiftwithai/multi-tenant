/*
  # Add webhook trigger for new appointments

  1. New Functions
    - `trigger_new_appointment_webhook()` - Sends appointment data to n8n webhook when new appointment is created
  
  2. New Triggers
    - `on_booking_appointment_insert` - Fires after INSERT on booking_appointments table
  
  3. Security
    - Uses http extension to make POST requests
    - Trigger executes immediately after appointment creation
  
  4. Webhook Details
    - URL: https://n8n.shiftwith.ai/webhook/new-appointment
    - Method: POST
    - Sends: id, appointment_date, start_time, end_time, total_price
*/

CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION trigger_new_appointment_webhook()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url text := 'https://n8n.shiftwith.ai/webhook/new-appointment';
  payload json;
BEGIN
  payload := json_build_object(
    'record', json_build_object(
      'id', NEW.id,
      'appointment_date', NEW.appointment_date,
      'start_time', NEW.start_time,
      'end_time', NEW.end_time,
      'total_price', NEW.total_price
    )
  );

  PERFORM extensions.http((
    'POST',
    webhook_url,
    ARRAY[extensions.http_header('Content-Type', 'application/json')],
    'application/json',
    payload::text
  )::extensions.http_request);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_booking_appointment_insert ON booking_appointments;

CREATE TRIGGER on_booking_appointment_insert
  AFTER INSERT ON booking_appointments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_new_appointment_webhook();
