import { AlertTriangle, Phone } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SOSModalProps {
    isOpen: boolean;
    onClose: () => void;
    heartRate: number;
}

const SOSModal = ({ isOpen, onClose, heartRate }: SOSModalProps) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md border-red-500 border-2 bg-red-50 dark:bg-red-950/20">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-500">
                        <AlertTriangle className="h-6 w-6 animate-pulse" />
                        <DialogTitle className="text-2xl font-bold">EMERGENCY ALERT</DialogTitle>
                    </div>
                    <DialogDescription className="text-foreground font-medium pt-2">
                        Abnormal heart rate detected: {heartRate} BPM
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="bg-background rounded-lg p-4 border shadow-sm">
                        <h3 className="font-semibold text-sm text-muted-foreground uppercase mb-2">Medical ID</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-muted-foreground">Blood Type</p>
                                <p className="font-bold">O+</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Allergies</p>
                                <p className="font-bold text-red-600">Penicillin, Peanuts</p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-xs text-muted-foreground">Conditions</p>
                                <p className="font-bold">Asthma, Hypertension</p>
                            </div>
                        </div>
                    </div>

                    <Button className="w-full bg-red-600 hover:bg-red-700 text-white h-12 text-lg animate-pulse">
                        <Phone className="mr-2 h-5 w-5" />
                        Call Emergency Contacts
                    </Button>

                    <Button variant="ghost" onClick={onClose} className="w-full text-muted-foreground">
                        I'm okay, dismiss alert
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default SOSModal;
