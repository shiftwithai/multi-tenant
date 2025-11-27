/*
  # Cancel Reminders When Appointment Status Changes

  1. New Function
    - `cancel_appointment_reminders()` - Cancels pending reminders when appointment is no longer confirmed

  2. New Trigger
    - `trigger_cancel_reminders` - Fires on UPDATE of booking_appointments
    - Cancels reminders when status changes from 'confirmed' to any other status

  3. Logic
    - Only processes status changes (not other field updates)
    - Only affects reminder notifications (reminder_24h, reminder_2h)
    - Only cancels reminders that are still pending
    - Sets status to 'failed' with descriptive error message

  4. Use Cases
    - Customer cancels confirmed appointment → reminders cancelled
    - Admin marks appointment as completed → reminders cancelled
    - Appointment rescheduled → old reminders cancelled (new ones will be created)
*/

CREATE OR REPLACE FUNCTION cancel_appointment_reminders()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If status changed from 'confirmed' to something else, cancel pending reminders
  IF OLD.status = 'confirmed' AND NEW.status != 'confirmed' THEN
    UPDATE sms_notifications
    SET 
      status = 'failed',
      error_message = 'Appointment status changed to ' || NEW.status || ' - reminder cancelled'
    WHERE 
      appointment_id = NEW.id
      AND notification_type LIKE 'reminder%'
      AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_cancel_reminders ON booking_appointments;

-- Create trigger on appointment status changes
CREATE TRIGGER trigger_cancel_reminders
  AFTER UPDATE ON booking_appointments
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION cancel_appointment_reminders();
