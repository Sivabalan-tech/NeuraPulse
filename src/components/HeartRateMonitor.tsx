import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Bluetooth, BluetoothConnected, BluetoothOff, Activity } from 'lucide-react';
import { api } from "@/lib/api";
import { useToast } from '@/hooks/use-toast';
import SOSModal from './SOSModal';

// Web Bluetooth types (not included in standard TypeScript lib)
interface WebBluetoothDevice {
  id: string;
  name?: string;
  gatt?: WebBluetoothRemoteGATTServer;
  addEventListener(type: 'gattserverdisconnected', listener: EventListener): void;
  removeEventListener(type: 'gattserverdisconnected', listener: EventListener): void;
}

interface WebBluetoothRemoteGATTServer {
  device: WebBluetoothDevice;
  connected: boolean;
  connect(): Promise<WebBluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(service: string): Promise<WebBluetoothRemoteGATTService>;
}

interface WebBluetoothRemoteGATTService {
  device: WebBluetoothDevice;
  uuid: string;
  getCharacteristic(characteristic: string): Promise<WebBluetoothRemoteGATTCharacteristic>;
}

interface WebBluetoothRemoteGATTCharacteristic {
  service: WebBluetoothRemoteGATTService;
  uuid: string;
  value?: DataView;
  startNotifications(): Promise<WebBluetoothRemoteGATTCharacteristic>;
  stopNotifications(): Promise<WebBluetoothRemoteGATTCharacteristic>;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

// Extend Navigator for bluetooth
interface NavigatorWithBluetooth extends Navigator {
  bluetooth: {
    requestDevice(options: {
      filters?: { services?: string[]; name?: string; namePrefix?: string }[];
      optionalServices?: string[];
      acceptAllDevices?: boolean;
    }): Promise<WebBluetoothDevice>;
    getAvailability(): Promise<boolean>;
  };
}

interface HeartRateReading {
  heartRate: number;
  timestamp: Date;
}

export const HeartRateMonitor = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [currentHeartRate, setCurrentHeartRate] = useState<number | null>(null);
  const [readings, setReadings] = useState<HeartRateReading[]>([]);
  const [device, setDevice] = useState<WebBluetoothDevice | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check if Web Bluetooth is supported
    setIsSupported('bluetooth' in navigator);
  }, []);

  const parseHeartRate = (value: DataView): number => {
    // Heart Rate Value Format is in the first byte
    const flags = value.getUint8(0);
    const rate16Bits = flags & 0x1;

    if (rate16Bits) {
      return value.getUint16(1, true);
    } else {
      return value.getUint8(1);
    }
  };

  const saveReading = async (heartRate: number, deviceName: string | null) => {
    try {
      const userId = localStorage.getItem("user_id");
      if (!userId) return;

      await api.post("/sensor-readings", {
        user_id: userId,
        reading_type: 'heart_rate',
        value: heartRate,
        unit: 'bpm',
        source: 'web_bluetooth',
        device_name: deviceName,
      });
    } catch (error) {
      console.error('Error saving reading:', error);
    }
  };

  const [showSOS, setShowSOS] = useState(false);

  // ... (previous useEffect)

  const handleHeartRateChange = useCallback((event: Event) => {
    const characteristic = event.target as unknown as WebBluetoothRemoteGATTCharacteristic;
    const value = characteristic.value;

    if (value) {
      const heartRate = parseHeartRate(value);
      setCurrentHeartRate(heartRate);

      // SOS Trigger Logic
      if (heartRate > 140 && !showSOS) {
        setShowSOS(true);
      }

      const newReading: HeartRateReading = {
        heartRate,
        timestamp: new Date(),
      };

      setReadings(prev => [...prev.slice(-29), newReading]); // Keep last 30 readings

      // Save every 5th reading to database to avoid too many writes
      if (readings.length % 5 === 0) {
        saveReading(heartRate, deviceName);
      }
    }
  }, [deviceName, readings.length, showSOS]);

  const connectToDevice = async () => {
    if (!isSupported) {
      toast({
        title: "Not Supported",
        description: "Web Bluetooth is not supported in this browser. Try Chrome on Android or desktop.",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);

    try {
      // Request Bluetooth device with Heart Rate service
      const nav = navigator as NavigatorWithBluetooth;
      const bluetoothDevice = await nav.bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }],
        optionalServices: ['battery_service'],
      });

      setDevice(bluetoothDevice);
      setDeviceName(bluetoothDevice.name || 'Unknown Device');

      // Connect to GATT server
      const server = await bluetoothDevice.gatt?.connect();
      if (!server) throw new Error('Failed to connect to GATT server');

      // Get Heart Rate service
      const service = await server.getPrimaryService('heart_rate');

      // Get Heart Rate Measurement characteristic
      const characteristic = await service.getCharacteristic('heart_rate_measurement');

      // Start notifications
      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', handleHeartRateChange);

      setIsConnected(true);

      // Handle disconnect
      bluetoothDevice.addEventListener('gattserverdisconnected', () => {
        setIsConnected(false);
        setCurrentHeartRate(null);
        toast({
          title: "Disconnected",
          description: "Heart rate monitor has been disconnected.",
        });
      });

      toast({
        title: "Connected!",
        description: `Successfully connected to ${bluetoothDevice.name || 'heart rate monitor'}`,
      });

    } catch (error) {
      console.error('Bluetooth connection error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('User cancelled')) {
        toast({
          title: "Connection Cancelled",
          description: "Device selection was cancelled.",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectDevice = async () => {
    if (device?.gatt?.connected) {
      device.gatt.disconnect();
    }
    setDevice(null);
    setIsConnected(false);
    setCurrentHeartRate(null);
    setDeviceName(null);
    setReadings([]);
  };

  const getHeartRateZone = (hr: number): { zone: string; color: string } => {
    if (hr < 60) return { zone: 'Resting', color: 'bg-blue-500' };
    if (hr < 100) return { zone: 'Light', color: 'bg-green-500' };
    if (hr < 140) return { zone: 'Moderate', color: 'bg-yellow-500' };
    if (hr < 170) return { zone: 'Hard', color: 'bg-orange-500' };
    return { zone: 'Maximum', color: 'bg-red-500' };
  };

  const averageHeartRate = readings.length > 0
    ? Math.round(readings.reduce((sum, r) => sum + r.heartRate, 0) / readings.length)
    : null;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-destructive" />
              Heart Rate Monitor
            </CardTitle>
            <CardDescription>
              Connect your Bluetooth heart rate monitor
            </CardDescription>
          </div>
          {isConnected && (
            <Badge variant="outline" className="flex items-center gap-1">
              <BluetoothConnected className="h-3 w-3" />
              {deviceName}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isSupported ? (
          <div className="text-center p-6 bg-muted rounded-lg">
            <BluetoothOff className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              Web Bluetooth is not supported in this browser.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Try using Chrome on Android or desktop.
            </p>
          </div>
        ) : !isConnected ? (
          <div className="text-center p-6">
            <Bluetooth className="h-12 w-12 mx-auto text-primary mb-3" />
            <p className="text-muted-foreground mb-4">
              Connect a Bluetooth heart rate monitor to start tracking
            </p>
            <Button onClick={connectToDevice} disabled={isConnecting}>
              {isConnecting ? 'Connecting...' : 'Connect Device'}
            </Button>
          </div>
        ) : (
          <>
            {/* Main heart rate display */}
            <div className="text-center p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl">
              <div className="relative inline-block">
                <Heart
                  className="h-20 w-20 text-destructive animate-pulse"
                  style={{ animationDuration: currentHeartRate ? `${60000 / currentHeartRate}ms` : '1s' }}
                />
              </div>
              <div className="mt-4">
                <span className="text-6xl font-bold text-foreground">
                  {currentHeartRate || '--'}
                </span>
                <span className="text-2xl text-muted-foreground ml-2">BPM</span>
              </div>
              {currentHeartRate && (
                <Badge className={`mt-3 ${getHeartRateZone(currentHeartRate).color}`}>
                  {getHeartRateZone(currentHeartRate).zone} Zone
                </Badge>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <Activity className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-sm text-muted-foreground">Average</p>
                <p className="text-xl font-semibold">{averageHeartRate || '--'}</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Min</p>
                <p className="text-xl font-semibold">
                  {readings.length > 0 ? Math.min(...readings.map(r => r.heartRate)) : '--'}
                </p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Max</p>
                <p className="text-xl font-semibold">
                  {readings.length > 0 ? Math.max(...readings.map(r => r.heartRate)) : '--'}
                </p>
              </div>
            </div>

            {/* Simple chart representation */}
            {readings.length > 1 && (
              <div className="h-20 flex items-end gap-0.5">
                {readings.slice(-30).map((reading, index) => {
                  const height = ((reading.heartRate - 40) / 160) * 100;
                  return (
                    <div
                      key={index}
                      className="flex-1 bg-primary/60 rounded-t transition-all duration-300"
                      style={{ height: `${Math.max(5, Math.min(100, height))}%` }}
                    />
                  );
                })}
              </div>
            )}

            <Button variant="outline" onClick={disconnectDevice} className="w-full">
              Disconnect
            </Button>
          </>
        )}
      </CardContent>
      <SOSModal
        isOpen={showSOS}
        onClose={() => setShowSOS(false)}
        heartRate={currentHeartRate || 0}
      />
    </Card>
  );
};
