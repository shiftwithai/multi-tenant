/*
  # Helper Functions for Appointment Booking System

  1. Functions
    - check_staff_availability: Verify if staff member is available at a given time
    - get_available_time_slots: Get all available time slots for a date
    - create_appointment_with_services: Create appointment with multiple services
    - schedule_sms_notifications: Queue SMS notifications for appointment
    
  2. Purpose
    - Prevent double-booking
    - Calculate total duration and price
    - Handle multi-service appointments
    - Automate SMS notification scheduling
*/

-- Function to check if a staff member is available at a specific time
CREATE OR REPLACE FUNCTION check_staff_availability(
  p_staff_id UUID,
  p_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_exclude_appointment_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_day_of_week INTEGER;
  v_has_schedule BOOLEAN;
  v_has_conflict BOOLEAN;
BEGIN
  -- Get day of week (0 = Sunday)
  v_day_of_week := EXTRACT(DOW FROM p_date);
  
  -- Check if staff has a schedule for this day
  SELECT EXISTS (
    SELECT 1 FROM staff_schedules
    WHERE staff_id = p_staff_id
    AND day_of_week = v_day_of_week
    AND is_available = true
    AND start_time <= p_start_time
    AND end_time >= p_end_time
  ) INTO v_has_schedule;
  
  IF NOT v_has_schedule THEN
    RETURN false;
  END IF;
  
  -- Check for conflicting appointments
  SELECT EXISTS (
    SELECT 1 FROM booking_appointments
    WHERE staff_id = p_staff_id
    AND appointment_date = p_date
    AND status NOT IN ('cancelled', 'no_show')
    AND (p_exclude_appointment_id IS NULL OR id != p_exclude_appointment_id)
    AND (
      (start_time < p_end_time AND end_time > p_start_time)
    )
  ) INTO v_has_conflict;
  
  RETURN NOT v_has_conflict;
END;
$$;

-- Function to get available time slots for a given date and staff
CREATE OR REPLACE FUNCTION get_available_time_slots(
  p_staff_id UUID,
  p_date DATE,
  p_duration_minutes INTEGER
)
RETURNS TABLE (
  slot_time TIME,
  is_available BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_day_of_week INTEGER;
  v_start_time TIME;
  v_end_time TIME;
  v_current_time TIME;
  v_slot_end_time TIME;
BEGIN
  -- Get day of week
  v_day_of_week := EXTRACT(DOW FROM p_date);
  
  -- Get staff schedule for this day
  SELECT start_time, end_time INTO v_start_time, v_end_time
  FROM staff_schedules
  WHERE staff_id = p_staff_id
  AND day_of_week = v_day_of_week
  AND is_available = true;
  
  IF v_start_time IS NULL THEN
    RETURN;
  END IF;
  
  -- Generate time slots
  v_current_time := v_start_time;
  WHILE v_current_time < v_end_time LOOP
    v_slot_end_time := v_current_time + (p_duration_minutes || ' minutes')::INTERVAL;
    
    IF v_slot_end_time <= v_end_time THEN
      RETURN QUERY
      SELECT 
        v_current_time,
        check_staff_availability(p_staff_id, p_date, v_current_time, v_slot_end_time::TIME);
    END IF;
    
    v_current_time := v_current_time + INTERVAL '30 minutes';
  END LOOP;
END;
$$;

-- Function to create SMS notification
CREATE OR REPLACE FUNCTION create_sms_notification(
  p_appointment_id UUID,
  p_recipient_phone TEXT,
  p_recipient_type TEXT,
  p_notification_type TEXT,
  p_message_body TEXT,
  p_scheduled_for TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO sms_notifications (
    appointment_id,
    recipient_phone,
    recipient_type,
    notification_type,
    message_body,
    scheduled_for
  ) VALUES (
    p_appointment_id,
    p_recipient_phone,
    p_recipient_type,
    p_notification_type,
    p_message_body,
    p_scheduled_for
  ) RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Function to format phone number (basic)
CREATE OR REPLACE FUNCTION format_phone_number(p_phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  -- Remove all non-numeric characters
  p_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');
  
  -- Add +1 if not present (for North America)
  IF length(p_phone) = 10 THEN
    p_phone := '+1' || p_phone;
  ELSIF length(p_phone) = 11 AND left(p_phone, 1) = '1' THEN
    p_phone := '+' || p_phone;
  ELSIF left(p_phone, 1) != '+' THEN
    p_phone := '+' || p_phone;
  END IF;
  
  RETURN p_phone;
END;
$$;