import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Upload, Image as ImageIcon, Loader2, AlertCircle, Camera } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import ReactMarkdown from "react-markdown";

interface ImageAnalysisProps {
    userId: string;
}

const ImageAnalysis: React.FC<ImageAnalysisProps> = ({ userId: _userId }) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [description, setDescription] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [analysisImageUrl, setAnalysisImageUrl] = useState<string | null>(null);
    const { toast } = useToast();

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            toast({
                title: "Invalid File Type",
                description: "Please upload a PNG, JPEG, GIF, or WebP image",
                variant: "destructive"
            });
            return;
        }

        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
            toast({
                title: "File Too Large",
                description: "Maximum file size is 10MB",
                variant: "destructive"
            });
            return;
        }

        setSelectedFile(file);

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleCameraCapture = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });

            // Create video element
            const video = document.createElement('video');
            video.srcObject = stream;
            video.play();

            // Wait for video to be ready
            await new Promise((resolve) => {
                video.onloadedmetadata = resolve;
            });

            // Create canvas and capture frame
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(video, 0, 0);

            // Stop camera
            stream.getTracks().forEach(track => track.stop());

            // Convert to blob
            canvas.toBlob((blob) => {
                if (blob) {
                    const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
                    setSelectedFile(file);
                    setPreviewUrl(canvas.toDataURL('image/jpeg'));
                }
            }, 'image/jpeg');

        } catch (error) {
            toast({
                title: "Camera Access Denied",
                description: "Please allow camera access to capture images",
                variant: "destructive"
            });
        }
    };

    const handleAnalyze = async () => {
        if (!selectedFile) {
            toast({
                title: "No Image Selected",
                description: "Please select an image to analyze",
                variant: "destructive"
            });
            return;
        }

        setIsAnalyzing(true);
        setAnalysis(null);

        try {
            const formData = new FormData();
            formData.append('image', selectedFile);
            formData.append('description', description);

            const token = localStorage.getItem("baymax_token");
            const response = await fetch("http://localhost:5000/api/image-analysis/analyze", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Analysis failed");
            }

            const result = await response.json();
            setAnalysis(result.analysis);
            setAnalysisImageUrl(`http://localhost:5000${result.image_url}`);

            toast({
                title: "Analysis Complete",
                description: "Your image has been analyzed successfully"
            });

        } catch (error) {
            console.error("Analysis error:", error);
            toast({
                title: "Analysis Failed",
                description: error instanceof Error ? error.message : "Failed to analyze image",
                variant: "destructive"
            });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleReset = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        setDescription("");
        setAnalysis(null);
        setAnalysisImageUrl(null);
    };

    return (
        <div className="space-y-6">
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Medical Image Analysis</AlertTitle>
                <AlertDescription>
                    Upload images of rashes, wounds, or other visible symptoms for AI-powered analysis.
                    This is NOT a diagnosis - always consult a healthcare professional.
                </AlertDescription>
            </Alert>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Upload Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ImageIcon className="w-5 h-5" />
                            Upload Image
                        </CardTitle>
                        <CardDescription>
                            Take a photo or upload an image of the affected area
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="image-upload">Select Image</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="image-upload"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    className="flex-1"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={handleCameraCapture}
                                    title="Use Camera"
                                >
                                    <Camera className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {previewUrl && (
                            <div className="space-y-2">
                                <Label>Preview</Label>
                                <div className="relative aspect-video rounded-lg overflow-hidden border border-border bg-muted">
                                    <img
                                        src={previewUrl}
                                        alt="Preview"
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Textarea
                                id="description"
                                placeholder="Describe your symptoms, when they started, any pain or discomfort..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={4}
                            />
                        </div>

                        <div className="flex gap-2">
                            <Button
                                onClick={handleAnalyze}
                                disabled={!selectedFile || isAnalyzing}
                                className="flex-1"
                            >
                                {isAnalyzing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Analyzing...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4 mr-2" />
                                        Analyze Image
                                    </>
                                )}
                            </Button>
                            <Button
                                onClick={handleReset}
                                variant="outline"
                                disabled={isAnalyzing}
                            >
                                Reset
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Analysis Results */}
                <Card>
                    <CardHeader>
                        <CardTitle>Analysis Results</CardTitle>
                        <CardDescription>
                            AI-powered assessment of your image
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!analysis && !isAnalyzing && (
                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                <ImageIcon className="w-12 h-12 mb-4 opacity-50" />
                                <p className="text-sm">Upload and analyze an image to see results</p>
                            </div>
                        )}

                        {isAnalyzing && (
                            <div className="flex flex-col items-center justify-center h-64">
                                <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                                <p className="text-sm text-muted-foreground">Analyzing your image...</p>
                            </div>
                        )}

                        {analysis && (
                            <div className="space-y-4">
                                {analysisImageUrl && (
                                    <div className="aspect-video rounded-lg overflow-hidden border border-border">
                                        <img
                                            src={analysisImageUrl}
                                            alt="Analyzed"
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                )}
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                    <ReactMarkdown>{analysis}</ReactMarkdown>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ImageAnalysis;
