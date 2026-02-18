-- Create table for storing health sensor readings
CREATE TABLE public.sensor_readings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  reading_type TEXT NOT NULL, -- 'heart_rate', 'blood_oxygen', 'steps', etc.
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL, -- 'bpm', '%', 'steps', etc.
  source TEXT NOT NULL, -- 'web_bluetooth', 'fitbit', 'google_fit', 'manual'
  device_name TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sensor_readings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own sensor readings"
ON public.sensor_readings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sensor readings"
ON public.sensor_readings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sensor readings"
ON public.sensor_readings FOR DELETE
USING (auth.uid() = user_id);

-- Create index for efficient queries
CREATE INDEX idx_sensor_readings_user_type ON public.sensor_readings(user_id, reading_type, recorded_at DESC);