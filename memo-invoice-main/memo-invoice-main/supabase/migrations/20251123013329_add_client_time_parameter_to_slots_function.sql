/*
  # Add Client Time Parameter to Time Slots Function

  1. Changes
    - Add p_client_current_time parameter to get_available_time_slots
    - Use client's current time instead of server's NOW() for "is today" check
    - This ensures timezone-correct filtering of past time slots

  2. Purpose
    - Fix timezone mismatch between client and server
    - Correctly identify when a date is "today" from client perspective
    - Filter out past time slots based on client's local time
*/

-- Drop old function
DROP FUNCTION IF EXISTS get_available_time_slots(UUID, DATE, INTEGER);

-- Create new function with client time parameter
CREATE OR REPLACE FUNCTION get_available_time_slots(
  p_staff_id UUID,
  p_date DATE,
  p_duration_minutes INTEGER,
  p_client_current_time TIMESTAMPTZ DEFAULT NOW()
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
  v_slot_time TIME;
  v_slot_end_time TIME;
  v_is_today BOOLEAN;
  v_client_current_time_only TIME;
  v_client_current_date DATE;
BEGIN
  -- Extract date and time from client's current timestamp
  v_client_current_date := CAST(p_client_current_time AS DATE);
  v_client_current_time_only := CAST(p_client_current_time AS TIME);
  
  -- Check if the requested date is today from client's perspective
  v_is_today := p_date = v_client_current_date;
  
  -- Get day of week (0 = Sunday, 6 = Saturday)
  v_day_of_week := EXTRACT(DOW FROM p_date);
  
  -- Get staff schedule for this day
  SELECT ss.start_time, ss.end_time INTO v_start_time, v_end_time
  FROM staff_schedules ss
  WHERE ss.staff_id = p_staff_id
  AND ss.day_of_week = v_day_of_week
  AND ss.is_available = true;
  
  -- If no schedule found for this day, return empty
  IF v_start_time IS NULL THEN
    RETURN;
  END IF;
  
  -- Generate time slots every 30 minutes
  v_slot_time := v_start_time;
  WHILE v_slot_time < v_end_time LOOP
    v_slot_end_time := v_slot_time + (p_duration_minutes || ' minutes')::INTERVAL;
    
    -- Check if the slot fits within working hours
    IF v_slot_end_time <= v_end_time THEN
      -- For today: only show slots that haven't started yet (based on client time)
      -- For future dates: show all slots within working hours
      IF NOT v_is_today OR v_slot_time >= v_client_current_time_only THEN
        RETURN QUERY
        SELECT 
          v_slot_time,
          check_staff_availability(p_staff_id, p_date, v_slot_time, v_slot_end_time::TIME);
      END IF;
    END IF;
    
    v_slot_time := v_slot_time + INTERVAL '30 minutes';
  END LOOP;
END;
$$;
