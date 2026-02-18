import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Send, Bot, User, Loader2, Sparkles, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import VoiceInput from "./VoiceInput";
import { analyzeSentiment } from "@/utils/sentiment";
import { Badge } from "@/components/ui/badge";

type Message = {
  role: "user" | "assistant";
  content: string;
};

interface AIChatInterfaceProps {
  userId: string;
}

// const CHAT_URL = ... // Removed

const AIChatInterface = ({ userId: _userId }: AIChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm NeuraPulse, your personal healthcare companion. How are you feeling today? You can describe any symptoms, ask health questions, or just chat about your wellness."
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentMood, setCurrentMood] = useState<{ mood: string; color: string } | null>(null);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Analyze sentiment whenever user adds a message
  useEffect(() => {
    const lastUserMessage = [...messages].reverse().find(m => m.role === "user");
    if (lastUserMessage) {
      const result = analyzeSentiment(lastUserMessage.content);
      setCurrentMood({ mood: result.mood, color: result.color });
    }
  }, [messages]);

  // Stop speech when component unmounts or voice is disabled
  useEffect(() => {
    if (!isVoiceEnabled) {
      window.speechSynthesis.cancel();
    }
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [isVoiceEnabled]);

  const speakText = (text: string) => {
    if (!isVoiceEnabled) return;

    // React's strict mode might cause double invokes, so cancel first
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Try to find a good voice
    const voices = window.speechSynthesis.getVoices();
    // Prefer Google US English or Microsoft David/Zira (common stable voices)
    const preferredVoice = voices.find(v =>
      v.name.includes("Google US English") ||
      v.name.includes("David") ||
      v.name.includes("Samantha")
    );

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    // Adjust rate/pitch for Baymax-like feel (slightly slower/deeper if possible, but keeping it natural)
    utterance.rate = 0.9;
    utterance.pitch = 1.0;

    window.speechSynthesis.speak(utterance);
  };

  const streamChat = async (userMessages: Message[]) => {
    // Use the api client but handles streaming manually or use fetch directly for stream
    // Since we need to read the stream, fetch directly is better, but allow it to use the new endpoint
    const token = localStorage.getItem("neurapulse_token");

    const response = await fetch("http://localhost:5000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ messages: userMessages }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantContent += content;
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant" && prev.length > 1) {
                return prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, content: assistantContent } : m
                );
              }
              return [...prev, { role: "assistant", content: assistantContent }];
            });
          }
        } catch {
          // If parsing fails, maybe it wasn't a complete line or valid JSON
          // But strict SSE usually guarantees lines. 
          // Ignoring for robustness.
          // textBuffer = line + "\n" + textBuffer; // Retry? No, SSE lines are distinct.
        }
      }
    }

    // Speak the full response after streaming is done
    if (assistantContent) {
      speakText(assistantContent);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // Stop him from talking over the user
    window.speechSynthesis.cancel();

    const userMessage: Message = { role: "user", content: input.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      await streamChat(updatedMessages.filter(m => m.role === "user" || m.content !== messages[0].content));
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Chat Error",
        description: error instanceof Error ? error.message : "Failed to get response",
        variant: "destructive",
      });
      // Remove the failed message attempt
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceTranscript = (transcript: string) => {
    setInput((prev) => prev + (prev ? " " : "") + transcript);
  };

  return (
    <div className="flex flex-col h-[600px] relative">
      {/* Header Toolbar (Voice Toggle) */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          variant="ghost"
          size="sm"
          className={cn("h-8 w-8 p-0", isVoiceEnabled ? "text-primary" : "text-muted-foreground")}
          onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
          title={isVoiceEnabled ? "Mute Voice" : "Enable Voice Assistant"}
        >
          {isVoiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </Button>
      </div>

      <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
        <div className="space-y-4 pb-4 mt-6">
          {/* Added mt-6 to avoid overlap with absolute voice button */}
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex gap-3",
                message.role === "user" ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                message.role === "user" ? "bg-primary" : "bg-accent"
              )}>
                {message.role === "user" ? (
                  <User className="w-4 h-4 text-primary-foreground" />
                ) : (
                  <Bot className="w-4 h-4 text-accent-foreground" />
                )}
              </div>
              <div className={cn(
                "max-w-[80%] rounded-xl p-4",
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              )}>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-accent">
                <Bot className="w-4 h-4 text-accent-foreground" />
              </div>
              <div className="bg-secondary rounded-xl p-4">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Mood Indicator */}
      {currentMood && (
        <div className="px-4 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t flex justify-end">
          <Badge className={cn("animate-in fade-in zoom-in duration-300", currentMood.color)}>
            <Sparkles className="w-3 h-3 mr-1" />
            Mood: {currentMood.mood}
          </Badge>
        </div>
      )}

      {/* Input Area */}
      <div className="flex gap-2 pt-4 border-t border-border">
        <VoiceInput onTranscript={handleVoiceTranscript} disabled={isLoading} />
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Describe your symptoms or ask a health question..."
          disabled={isLoading}
          className="flex-1"
        />
        <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
};

export default AIChatInterface;
