import React, { useState, useRef, useCallback } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { Send, Sparkles, Lightbulb, StopCircle } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";

interface Message {
  role: "user" | "ai";
  content: string;
  timestamp: Date;
  suggestions?: Array<{ title: string; subtitle: string; prompt: string }>;
}

export function AIAssistantPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, []);

  const loadSuggestions = useCallback(async (userText: string) => {
    setIsLoadingSuggestions(true);
    try {
      const res = await api.ai.getSuggestions({ userText });
      if (res.suggestions && res.suggestions.length > 0) {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === "ai") {
            updated[updated.length - 1] = { ...last, suggestions: res.suggestions };
          }
          return updated;
        });
      }
    } catch {
      // silently fail — suggestions are optional
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  const handleSend = useCallback(async (text?: string) => {
    const q = text || query;
    if (!q.trim() || isStreaming) return;

    setQuery("");
    setMessages((prev) => [...prev, { role: "user", content: q, timestamp: new Date() }]);
    setIsStreaming(true);
    setStreamingContent("");

    const tokenBuffer: string[] = [];

    const cancel = api.ai.askStream(
      { question: q },
      {
        onToken: (token) => {
          tokenBuffer.push(token);
          setStreamingContent(tokenBuffer.join(""));
          scrollToBottom();
        },
        onDone: (fullAnswer, _meta) => {
          setIsStreaming(false);
          setStreamingContent("");
          const msg: Message = { role: "ai", content: fullAnswer, timestamp: new Date() };
          setMessages((prev) => [...prev, msg]);
          loadSuggestions(q);
          scrollToBottom();
        },
        onError: (error) => {
          setIsStreaming(false);
          setStreamingContent("");
          const msg: Message = {
            role: "ai",
            content: `Error: ${error}`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, msg]);
          scrollToBottom();
        },
      },
    );

    cancelRef.current = cancel;
  }, [query, isStreaming, scrollToBottom, loadSuggestions]);

  const handleCancel = useCallback(() => {
    cancelRef.current?.();
    cancelRef.current = null;
    setIsStreaming(false);
    setStreamingContent("");
  }, []);

  const handleSuggestionClick = useCallback((prompt: string) => {
    setQuery(prompt);
    inputRef.current?.focus();
  }, []);

  const handleQuickPrompt = useCallback((prompt: string) => {
    handleSend(prompt);
  }, [handleSend]);

  const initials = user?.username?.slice(0, 2).toUpperCase() || "AG";
  const userName = user?.username || "User";

  return (
    <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden">
      <div className="flex-1 flex flex-col bg-background/50 relative">
        <ScrollArea className="flex-1 p-4 md:p-8">
          <div className="max-w-3xl mx-auto space-y-6 pb-20">
            {messages.length === 0 && !isStreaming && (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                <div className="p-4 rounded-full bg-emerald-500/10 mb-4">
                  <Sparkles className="h-8 w-8 text-emerald-500" />
                </div>
                <h2 className="text-xl font-semibold mb-2">AgroAssist</h2>
                <p className="text-sm text-muted-foreground max-w-md">
                  Ask about your farm data, sensor readings, or request irrigation recommendations.
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i}>
                <div className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "ai" && (
                    <Avatar className="w-8 h-8 border border-emerald-500/30 bg-emerald-500/10">
                      <AvatarFallback><Sparkles className="w-4 h-4 text-emerald-500" /></AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex flex-col gap-1 max-w-[80%]">
                    <div
                      className={`px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap ${
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

                {msg.role === "ai" && msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="flex gap-2 mt-3 ml-12 overflow-x-auto pb-2 scrollbar-none">
                    {msg.suggestions.map((s, si) => (
                      <Button
                        key={si}
                        variant="outline"
                        size="sm"
                        onClick={() => handleSuggestionClick(s.prompt)}
                        className="h-auto py-2 px-3 text-xs bg-card/50 border-border/50 rounded-xl shrink-0 max-w-[200px] text-left leading-snug"
                      >
                        <Lightbulb className="w-3 h-3 mr-1.5 text-yellow-500 shrink-0 mt-0.5" />
                        <span className="truncate">{s.title}</span>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isStreaming && (
              <div className="flex gap-4 justify-start">
                <Avatar className="w-8 h-8 border border-emerald-500/30 bg-emerald-500/10">
                  <AvatarFallback><Sparkles className="w-4 h-4 text-emerald-500" /></AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1 max-w-[80%]">
                  <div className="px-4 py-3 rounded-2xl text-sm bg-card border border-border/50 shadow-sm rounded-tl-sm leading-relaxed text-foreground whitespace-pre-wrap">
                    {streamingContent || (
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-500/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-1.5 h-1.5 bg-emerald-500/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1.5 h-1.5 bg-emerald-500/50 rounded-full animate-bounce" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {isLoadingSuggestions && !isStreaming && (
              <div className="flex gap-2 ml-12">
                <span className="text-xs text-muted-foreground animate-pulse">Generating suggestions...</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        <div className="p-4 md:p-6 border-t border-border/50 bg-background/80 backdrop-blur-md shrink-0">
          <div className="max-w-3xl mx-auto">
            {messages.length === 0 && (
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-none">
                <Button variant="outline" size="sm" onClick={() => handleQuickPrompt("Show latest sensor readings")} className="h-8 text-xs bg-card/50 border-border/50 rounded-full shrink-0">
                  <Lightbulb className="w-3 h-3 mr-2 text-yellow-500" />
                  Latest readings
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleQuickPrompt("Summarize farm status")} className="h-8 text-xs bg-card/50 border-border/50 rounded-full shrink-0">
                  <Lightbulb className="w-3 h-3 mr-2 text-yellow-500" />
                  Farm summary
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleQuickPrompt("What irrigation schedule do you recommend?")} className="h-8 text-xs bg-card/50 border-border/50 rounded-full shrink-0">
                  <Lightbulb className="w-3 h-3 mr-2 text-yellow-500" />
                  Irrigation advice
                </Button>
              </div>
            )}

            <div className="relative flex items-end shadow-sm rounded-xl border border-border/50 bg-card overflow-hidden focus-within:ring-1 focus-within:ring-emerald-500 transition-all">
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (isStreaming) handleCancel();
                    else handleSend();
                  }
                }}
                placeholder={`Ask about your farm data, ${userName}...`}
                className="min-h-[56px] w-full bg-transparent border-none px-4 py-4 text-sm focus-visible:ring-0 pr-14"
                disabled={isStreaming}
              />
              {isStreaming ? (
                <Button
                  onClick={handleCancel}
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg bg-red-500 hover:bg-red-600 text-white"
                  title="Stop generating"
                >
                  <StopCircle className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={() => handleSend()}
                  size="icon"
                  className={`absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg transition-colors ${
                    query.trim() ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
