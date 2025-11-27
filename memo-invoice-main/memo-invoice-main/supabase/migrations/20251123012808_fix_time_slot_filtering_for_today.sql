/*
  # Fix Time Slot Filtering for Today's Date

  1. Changes
    - Fix the logic in get_available_time_slots function
    - For today's date, only show slots where slot_time is AFTER current time
    - Previous logic was inverted (showing slots before current time)

  2. Purpose
    - Prevent users from booking appointments in the past
    - Correctly filter out time slots that have already passed today
*/

-- Drop and recreate the function with corrected time filtering
DROP FUNCTION IF EXISTS get_available_time_slots(UUID, DATE, INTEGER);

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
  v_current_datetime TIMESTAMPTZ;
  v_is_today BOOLEAN;
BEGIN
  -- Get current time in the database timezone
  v_current_datetime := NOW();
  
  -- Check if the requested date is today
  v_is_today := p_date = CURRENT_DATE;
  
  -- Get current time (time portion only)
  v_current_time := CAST(v_current_datetime AS TIME);
  
  -- Get day of week
  v_day_of_week := EXTRACT(DOW FROM p_date);
  
  -- Get staff schedule for this day
  SELECT ss.start_time, ss.end_time INTO v_start_time, v_end_time
  FROM staff_schedules ss
  WHERE ss.staff_id = p_staff_id
  AND ss.day_of_week = v_day_of_week
  AND ss.is_available = true;
  
  IF v_start_time IS NULL THEN
    RETURN;
  END IF;
  
  -- Generate time slots every 30 minutes
  v_current_time := v_start_time;
  WHILE v_current_time < v_end_time LOOP
    v_slot_end_time := v_current_time + (p_duration_minutes || ' minutes')::INTERVAL;
    
    IF v_slot_end_time <= v_end_time THEN
      -- For today: only show slots that start AFTER the current time
      -- For future dates: show all slots
      IF NOT v_is_today OR v_current_time > CAST(NOW() AS TIME) THEN
        RETURN QUERY
        SELECT 
          v_current_time,
          check_staff_availability(p_staff_id, p_date, v_current_time, v_slot_end_time::TIME);
      END IF;
    END IF;
    
    v_current_time := v_current_time + INTERVAL '30 minutes';
  END LOOP;
END;
$$;
