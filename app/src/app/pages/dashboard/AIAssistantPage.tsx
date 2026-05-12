import React, { useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { Bot, Send, Sparkles, Plus, Lightbulb } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

interface Message {
  role: "user" | "ai";
  content: string;
  timestamp: Date;
}

export function AIAssistantPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async (text?: string) => {
    const q = text || query;
    if (!q.trim()) return;
    setMessages((prev) => [...prev, { role: "user", content: q, timestamp: new Date() }]);
    setQuery("");
    setIsTyping(true);

    // In a production system, this would call /ai/decide endpoint
    // For now, show that AI integration is pending
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: "AI analysis is available when connected to the AgroEye decision engine. Please ensure your backend AI service is running.",
          timestamp: new Date(),
        },
      ]);
    }, 1000);
  };

  const initials = user?.username?.slice(0, 2).toUpperCase() || "AG";

  return (
    <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden">
      <div className="flex-1 flex flex-col bg-background/50 relative">
        <ScrollArea className="flex-1 p-4 md:p-8">
          <div className="max-w-3xl mx-auto space-y-6 pb-20">
            {messages.length === 0 && !isTyping && (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                <div className="p-4 rounded-full bg-emerald-500/10 mb-4">
                  <Sparkles className="h-8 w-8 text-emerald-500" />
                </div>
                <h2 className="text-xl font-semibold mb-2">AI Insights</h2>
                <p className="text-sm text-muted-foreground max-w-md">
                  Ask about your farm data, sensor readings, or request irrigation recommendations.
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "ai" && (
                  <Avatar className="w-8 h-8 border border-emerald-500/30 bg-emerald-500/10">
                    <AvatarFallback><Sparkles className="w-4 h-4 text-emerald-500" /></AvatarFallback>
                  </Avatar>
                )}
                <div className="flex flex-col gap-1 max-w-[80%]">
                  <div
                    className={`px-4 py-3 rounded-2xl text-sm ${
                      msg.role === "user"
                        ? "bg-emerald-600 text-white rounded-tr-sm"
                        : "bg-card border border-border/50 shadow-sm rounded-tl-sm leading-relaxed text-foreground"
                    }`}
                  >
                    {msg.content}
                  </div>
                  <span className={`text-[10px] text-muted-foreground ${msg.role === "user" ? "text-right pr-1" : "text-left pl-1"}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {msg.role === "user" && (
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-emerald-500/10 text-emerald-500">{initials}</AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-4 justify-start">
                <Avatar className="w-8 h-8 border border-emerald-500/30 bg-emerald-500/10">
                  <AvatarFallback><Sparkles className="w-4 h-4 text-emerald-500" /></AvatarFallback>
                </Avatar>
                <div className="px-4 py-4 rounded-2xl bg-card border border-border/50 shadow-sm rounded-tl-sm flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-emerald-500/50 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-emerald-500/50 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-emerald-500/50 rounded-full animate-bounce"></div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 md:p-6 border-t border-border/50 bg-background/80 backdrop-blur-md shrink-0">
          <div className="max-w-3xl mx-auto">
            {messages.length === 0 && (
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-none">
                <Button variant="outline" size="sm" onClick={() => handleSend("Show latest sensor readings")} className="h-8 text-xs bg-card/50 border-border/50 rounded-full shrink-0">
                  <Lightbulb className="w-3 h-3 mr-2 text-yellow-500" />
                  Latest readings
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleSend("Summarize farm status")} className="h-8 text-xs bg-card/50 border-border/50 rounded-full shrink-0">
                  <Lightbulb className="w-3 h-3 mr-2 text-yellow-500" />
                  Farm summary
                </Button>
              </div>
            )}

            <div className="relative flex items-end shadow-sm rounded-xl border border-border/50 bg-card overflow-hidden focus-within:ring-1 focus-within:ring-emerald-500 transition-all">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask about your farm data..."
                className="min-h-[56px] w-full bg-transparent border-none px-4 py-4 text-sm focus-visible:ring-0"
              />
              <Button
                onClick={() => handleSend()}
                size="icon"
                className={`absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg transition-colors ${
                  query.trim() ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
