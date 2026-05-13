import React, { useState, useRef, useCallback, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import {
  Send, Sparkles, Lightbulb, StopCircle, Plus,
  ChevronDown, Clock,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";

interface Message {
  role: "user" | "ai";
  content: string;
  timestamp: Date;
}

interface SuggestionItem {
  title: string;
  subtitle: string;
  prompt: string;
}

interface SessionItem {
  session_id: number;
  start_time: string;
  message_count: number;
  preview: string;
}

function cleanContent(text: string): string {
  return text.replace(/<br\s*\/?>/gi, "\n");
}

function isRTL(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

export function AIAssistantPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [showSessionList, setShowSessionList] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, []);

  const ensureSession = useCallback(async (): Promise<number> => {
    if (currentSessionId) return currentSessionId;
    try {
      const res = await api.ai.createSession();
      setCurrentSessionId(res.session_id);
      return res.session_id;
    } catch {
      return 0;
    }
  }, [currentSessionId]);

  const loadSessions = useCallback(async () => {
    try {
      const res = await api.ai.listSessions();
      setSessions(res.sessions || []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const switchSession = useCallback(async (sessionId: number) => {
    setLoadingSession(true);
    setCurrentSessionId(sessionId);
    setSuggestions([]);
    try {
      const res = await api.ai.getSessionMessages(sessionId);
      setMessages(
        (res.messages || []).map((m) => ({
          role: m.sender === "user" ? "user" : "ai" as "user" | "ai",
          content: m.message_text,
          timestamp: new Date(m.timestamp),
        })),
      );
    } catch {
      setMessages([]);
    } finally {
      setLoadingSession(false);
      setShowSessionList(false);
      scrollToBottom();
    }
  }, [scrollToBottom]);

  const newSession = useCallback(() => {
    setCurrentSessionId(null);
    setMessages([]);
    setSuggestions([]);
    setStreamingContent("");
  }, []);

  const saveMessage = useCallback(async (sessionId: number, sender: string, text: string) => {
    if (!sessionId || !text) return;
    try {
      await api.ai.addSessionMessage(sessionId, sender, text);
    } catch {
      // silent
    }
  }, []);

  const loadSuggestions = useCallback(async (userText: string) => {
    setIsLoadingSuggestions(true);
    try {
      const res = await api.ai.getSuggestions({ userText });
      setSuggestions(res.suggestions || []);
    } catch {
      setSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  const handleSend = useCallback(async (text?: string) => {
    const q = text || query;
    if (!q.trim() || isStreaming) return;

    setQuery("");
    setSuggestions([]);
    const userMsg: Message = { role: "user", content: q, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);
    setStreamingContent("");

    const tokenBuffer: string[] = [];

    const cancel = api.ai.askStream(
      { question: q },
      {
          onToken: (token) => {
            tokenBuffer.push(token);
            setStreamingContent(tokenBuffer.join("").replace(/^\s+/, ""));
            scrollToBottom();
          },
          onDone: async (fullAnswer, _meta) => {
            setIsStreaming(false);
            setStreamingContent("");

            const trimmed = fullAnswer.replace(/^\s+/, "").replace(/\s+$/, "");
          const aiMsg: Message = { role: "ai", content: trimmed, timestamp: new Date() };
          setMessages((prev) => [...prev, aiMsg]);
          scrollToBottom();

          const sid = await ensureSession();
          if (sid) {
            await saveMessage(sid, "user", q);
            await saveMessage(sid, "bot", trimmed);
            loadSessions();
          }
          loadSuggestions(q);
        },
        onError: (error) => {
          setIsStreaming(false);
          setStreamingContent("");
          const errMsg: Message = {
            role: "ai",
            content: `Error: ${error}`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errMsg]);
          scrollToBottom();
        },
      },
    );

    cancelRef.current = cancel;
  }, [query, isStreaming, scrollToBottom, loadSuggestions, ensureSession, saveMessage, loadSessions]);

  const handleCancel = useCallback(() => {
    cancelRef.current?.();
    cancelRef.current = null;
    setIsStreaming(false);
    setStreamingContent("");
  }, []);

  const handleSuggestionClick = useCallback((prompt: string) => {
    setQuery(prompt);
    setSuggestions([]);
    inputRef.current?.focus();
  }, []);

  const handleQuickPrompt = useCallback((prompt: string) => {
    handleSend(prompt);
  }, [handleSend]);

  const initials = user?.username?.slice(0, 2).toUpperCase() || "AG";
  const userName = user?.username || "User";

  const activeSession = sessions.find((s) => s.session_id === currentSessionId);

  return (
    <div className="flex h-[calc(100vh-96px)] w-full overflow-hidden">
      <div className="flex-1 flex flex-col bg-background/50 relative">
        {/* Session bar */}
        <div className="shrink-0 flex items-center gap-2 px-4 md:px-8 pt-3 pb-1">
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSessionList(!showSessionList)}
              className="h-8 text-xs border-border/50 rounded-lg"
            >
              <Clock className="w-3 h-3 mr-1.5 text-muted-foreground" />
              {activeSession
                ? new Date(activeSession.start_time).toLocaleDateString()
                : "Current chat"}
              <ChevronDown className="w-3 h-3 ml-1.5 text-muted-foreground" />
            </Button>
            {showSessionList && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSessionList(false)} />
                <div className="absolute top-full left-0 mt-1 w-72 bg-popover border border-border/50 rounded-xl shadow-lg z-20 max-h-72 overflow-y-auto">
                  <div className="p-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={newSession}
                      className="w-full justify-start text-xs h-8 mb-1"
                    >
                      <Plus className="w-3 h-3 mr-2" />
                      New chat
                    </Button>
                    {sessions.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-3">No previous sessions</p>
                    )}
                    {sessions.map((s) => (
                      <Button
                        key={s.session_id}
                        variant="ghost"
                        size="sm"
                        onClick={() => switchSession(s.session_id)}
                        className={`w-full justify-start text-left text-xs h-auto py-2 leading-tight ${
                          s.session_id === currentSessionId ? "bg-accent" : ""
                        }`}
                      >
                        <div className="truncate flex-1 min-w-0">
                          <div className="truncate font-medium">
                            {s.preview
                              ? s.preview.slice(0, 50) + (s.preview.length > 50 ? "..." : "")
                              : "Empty session"}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(s.start_time).toLocaleDateString()} · {s.message_count} messages
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          {currentSessionId && (
            <Button variant="ghost" size="sm" onClick={newSession} className="h-8 text-xs">
              <Plus className="w-3 h-3 mr-1" />
              New
            </Button>
          )}
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 min-h-0 px-4 md:px-8">
          <div className="max-w-3xl mx-auto space-y-6 pb-4">
            {loadingSession ? (
              <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mr-2" />
                Loading session...
              </div>
            ) : messages.length === 0 && !isStreaming ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                <div className="p-4 rounded-full bg-emerald-500/10 mb-4">
                  <Sparkles className="h-8 w-8 text-emerald-500" />
                </div>
                <h2 className="text-xl font-semibold mb-2">AgroAssist</h2>
                <p className="text-sm text-muted-foreground max-w-md">
                  Ask about your farm data, sensor readings, or request event recommendations.
                </p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i}>
                  <div className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "ai" && (
                      <Avatar className="w-8 h-8 border border-emerald-500/30 bg-emerald-500/10">
                        <AvatarFallback><Sparkles className="w-4 h-4 text-emerald-500" /></AvatarFallback>
                      </Avatar>
                    )}
                    <div className="flex flex-col gap-1 max-w-[80%]">
                      {msg.role === "ai" ? (
                        <div className="px-4 py-3 rounded-2xl text-sm bg-card border border-border/50 shadow-sm rounded-tl-sm leading-relaxed text-foreground prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-pre:my-2 prose-code:px-1 prose-code:py-0.5 prose-code:bg-muted prose-code:rounded prose-code:text-xs" dir={isRTL(msg.content) ? "rtl" : undefined}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {cleanContent(msg.content)}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div className="px-4 py-3 rounded-2xl text-sm bg-emerald-600 text-white rounded-tr-sm whitespace-pre-wrap">
                          {msg.content}
                        </div>
                      )}
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
                </div>
              ))
            )}

            {isStreaming && (
              <div className="flex gap-4 justify-start">
                <Avatar className="w-8 h-8 border border-emerald-500/30 bg-emerald-500/10">
                  <AvatarFallback><Sparkles className="w-4 h-4 text-emerald-500" /></AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1 max-w-[80%]">
                  {streamingContent ? (
                    <div className="px-4 py-3 rounded-2xl text-sm bg-card border border-border/50 shadow-sm rounded-tl-sm leading-relaxed text-foreground prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-pre:my-2 prose-code:px-1 prose-code:py-0.5 prose-code:bg-muted prose-code:rounded prose-code:text-xs" dir={isRTL(streamingContent) ? "rtl" : undefined}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {cleanContent(streamingContent)}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="px-4 py-3 rounded-2xl text-sm bg-card border border-border/50 shadow-sm rounded-tl-sm leading-relaxed text-foreground">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-500/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-1.5 h-1.5 bg-emerald-500/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1.5 h-1.5 bg-emerald-500/50 rounded-full animate-bounce" />
                      </span>
                    </div>
                  )}
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

        {/* Suggestions bar — fixed above input */}
        {suggestions.length > 0 && !isStreaming && (
          <div className="shrink-0 px-4 md:px-8 pb-2">
            <div className="max-w-3xl mx-auto">
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {suggestions.map((s, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuggestionClick(s.prompt)}
                    className="h-auto py-2 px-3 text-xs bg-card/50 border-border/50 rounded-xl shrink-0 max-w-[220px] text-left leading-snug"
                  >
                    <Lightbulb className="w-3 h-3 mr-1.5 text-yellow-500 shrink-0 mt-0.5" />
                    <span className="truncate">{s.title}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Input bar */}
        <div className="shrink-0 px-4 md:px-6 pb-4 md:pb-6 border-t border-border/50 bg-background/80 backdrop-blur-md">
          <div className="max-w-3xl mx-auto pt-3">
            {/* Quick prompts when no messages */}
            {messages.length === 0 && !isStreaming && suggestions.length === 0 && (
              <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none">
                <Button variant="outline" size="sm" onClick={() => handleQuickPrompt("Show latest sensor readings")} className="h-8 text-xs bg-card/50 border-border/50 rounded-full shrink-0">
                  <Lightbulb className="w-3 h-3 mr-2 text-yellow-500" />
                  Latest readings
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleQuickPrompt("Summarize farm status")} className="h-8 text-xs bg-card/50 border-border/50 rounded-full shrink-0">
                  <Lightbulb className="w-3 h-3 mr-2 text-yellow-500" />
                  Farm summary
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleQuickPrompt("What events schedule do you recommend?")} className="h-8 text-xs bg-card/50 border-border/50 rounded-full shrink-0">
                  <Lightbulb className="w-3 h-3 mr-2 text-yellow-500" />
                  Event advice
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
