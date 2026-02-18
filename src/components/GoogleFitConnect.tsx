import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Watch, CheckCircle2, XCircle, Loader2, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface GoogleFitConnectProps {
    userId: string;
    onSyncComplete?: () => void;
}

const GoogleFitConnect: React.FC<GoogleFitConnectProps> = ({ userId, onSyncComplete }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [connectionInfo, setConnectionInfo] = useState<any>(null);
    const { toast } = useToast();

    useEffect(() => {
        checkConnectionStatus();

        // Check for OAuth callback
        const params = new URLSearchParams(window.location.search);
        if (params.get('google_fit') === 'connected') {
            toast({
                title: "Google Fit Connected!",
                description: "Your wearable data will now sync automatically"
            });
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
            checkConnectionStatus();
        } else if (params.get('google_fit') === 'error') {
            toast({
                title: "Connection Failed",
                description: params.get('message') || "Failed to connect Google Fit",
                variant: "destructive"
            });
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    const checkConnectionStatus = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem("baymax_token");
            const response = await fetch(`http://localhost:5000/api/google-fit/status?user_id=${userId}`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setIsConnected(data.connected);
                setConnectionInfo(data);
            }
        } catch (error) {
            console.error("Status check error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleConnect = () => {
        // Redirect to OAuth flow
        window.location.href = `http://localhost:5000/api/google-fit/connect?user_id=${userId}`;
    };

    const handleDisconnect = async () => {
        try {
            const token = localStorage.getItem("baymax_token");
            const response = await fetch(`http://localhost:5000/api/google-fit/disconnect`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ user_id: userId })
            });

            if (response.ok) {
                setIsConnected(false);
                setConnectionInfo(null);
                toast({
                    title: "Disconnected",
                    description: "Google Fit has been disconnected"
                });
            }
        } catch (error) {
            toast({
                title: "Disconnect Failed",
                description: "Failed to disconnect Google Fit",
                variant: "destructive"
            });
        }
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const token = localStorage.getItem("baymax_token");
            const response = await fetch(`http://localhost:5000/api/google-fit/sync`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ user_id: userId, days: 7 })
            });

            if (response.ok) {
                const data = await response.json();
                toast({
                    title: "Sync Complete!",
                    description: `Synced ${data.data_summary.heart_rate_readings} heart rate readings, ${data.data_summary.sleep_sessions} sleep sessions, and more`
                });
                checkConnectionStatus();
                if (onSyncComplete) onSyncComplete();
            } else {
                throw new Error("Sync failed");
            }
        } catch (error) {
            toast({
                title: "Sync Failed",
                description: "Failed to sync Google Fit data",
                variant: "destructive"
            });
        } finally {
            setIsSyncing(false);
        }
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center h-32">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Watch className="w-5 h-5" />
                    Google Fit Connection
                </CardTitle>
                <CardDescription>
                    Connect your wearable devices to automatically sync health data
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {!isConnected ? (
                    <>
                        <Alert>
                            <Watch className="h-4 w-4" />
                            <AlertTitle>Connect Your Wearables</AlertTitle>
                            <AlertDescription>
                                Sync data from Fitbit, smartwatches, fitness trackers, and more through Google Fit.
                                No manual entry needed!
                            </AlertDescription>
                        </Alert>

                        <Button onClick={handleConnect} className="w-full" size="lg">
                            <Watch className="w-4 h-4 mr-2" />
                            Connect Google Fit
                        </Button>

                        <div className="text-xs text-muted-foreground space-y-1">
                            <p>✓ Heart rate monitoring</p>
                            <p>✓ Sleep tracking</p>
                            <p>✓ Steps & activity</p>
                            <p>✓ Calories & weight</p>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex items-center justify-between p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                <div>
                                    <p className="font-semibold text-sm">Connected</p>
                                    <p className="text-xs text-muted-foreground">
                                        {connectionInfo?.last_sync
                                            ? `Last synced: ${new Date(connectionInfo.last_sync).toLocaleString()}`
                                            : 'Never synced'}
                                    </p>
                                </div>
                            </div>
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                                Active
                            </Badge>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                onClick={handleSync}
                                disabled={isSyncing}
                                className="flex-1"
                            >
                                {isSyncing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Syncing...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Sync Now
                                    </>
                                )}
                            </Button>
                            <Button
                                onClick={handleDisconnect}
                                variant="outline"
                                className="flex-1"
                            >
                                <XCircle className="w-4 h-4 mr-2" />
                                Disconnect
                            </Button>
                        </div>

                        <Alert>
                            <AlertDescription className="text-xs">
                                💡 Data syncs automatically. Click "Sync Now" to manually update.
                            </AlertDescription>
                        </Alert>
                    </>
                )}
            </CardContent>
        </Card>
    );
};

export default GoogleFitConnect;
