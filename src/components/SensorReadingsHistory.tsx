import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Activity, Clock } from 'lucide-react';
import { api } from "@/lib/api";
import { format } from 'date-fns';

interface SensorReading {
  id: string;
  reading_type: string;
  value: number;
  unit: string;
  source: string;
  device_name: string | null;
  recorded_at: string;
}

export const SensorReadingsHistory = () => {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem("user_id");
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchReadings = async () => {
      try {
        const data = await api.get<SensorReading[]>(`/sensor-readings?user_id=${userId}&limit=50`);
        setReadings(data || []);
      } catch (error) {
        console.error('Error fetching readings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReadings();

    // Polling every 10 seconds instead of realtime for now
    const interval = setInterval(fetchReadings, 10000);

    return () => clearInterval(interval);
  }, []);

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'web_bluetooth':
        return <Badge variant="secondary">Bluetooth</Badge>;
      case 'fitbit':
        return <Badge className="bg-teal-500">Fitbit</Badge>;
      case 'google_fit':
        return <Badge className="bg-blue-500">Google Fit</Badge>;
      case 'manual':
        return <Badge variant="outline">Manual</Badge>;
      default:
        return <Badge variant="outline">{source}</Badge>;
    }
  };

  const getReadingIcon = (type: string) => {
    switch (type) {
      case 'heart_rate':
        return <Heart className="h-4 w-4 text-destructive" />;
      default:
        return <Activity className="h-4 w-4 text-primary" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sensor History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Sensor History
        </CardTitle>
        <CardDescription>
          Your recent health sensor readings
        </CardDescription>
      </CardHeader>
      <CardContent>
        {readings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No sensor readings yet</p>
            <p className="text-sm">Connect a device to start tracking</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {readings.map((reading) => (
              <div
                key={reading.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getReadingIcon(reading.reading_type)}
                  <div>
                    <p className="font-medium capitalize">
                      {reading.reading_type.replace('_', ' ')}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(new Date(reading.recorded_at), 'MMM d, h:mm a')}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">
                    {reading.value} <span className="text-sm font-normal text-muted-foreground">{reading.unit}</span>
                  </p>
                  {getSourceBadge(reading.source)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
