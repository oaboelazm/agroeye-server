import React, { useState } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Bot, Send, Sparkles, Paperclip, Plus, Lightbulb, Search, Image as ImageIcon } from "lucide-react";

export function AIAssistantPage() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([
    { role: "ai", content: "Hello Jane! I've been monitoring Alpha Greenhouse Complex today. I noticed a 5% drop in soil moisture in Sector A over the last 4 hours, but everything else looks stable. How can I assist you?" }
  ]);

  const handleSend = () => {
    if (!query.trim()) return;
    setMessages(prev => [...prev, { role: "user", content: query }]);
    setQuery("");
    
    // Mock response
    setTimeout(() => {
      setMessages(prev => [...prev, { role: "ai", content: "Based on the sensor logs for Sector A, the drop in moisture correlates with the higher-than-average ambient temperature recorded at 2:00 PM. I recommend scheduling an early irrigation cycle of 500L for Sector A to compensate before nightfall." }]);
    }, 1000);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden">
      {/* Sidebar History */}
      <div className="w-64 border-r border-border/50 bg-card/30 flex flex-col hidden md:flex shrink-0">
        <div className="p-4 border-b border-border/50">
          <Button variant="outline" className="w-full justify-start gap-2 bg-background/50 border-border">
            <Plus className="w-4 h-4" />
            New Session
          </Button>
        </div>
        <div className="p-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground" />
            <Input placeholder="Search history..." className="h-8 pl-8 text-xs bg-muted/50 border-none" />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            <p className="text-xs font-medium text-muted-foreground px-2 py-1 mt-2">Today</p>
            <SessionItem title="Sector A Moisture Drop" active />
            <SessionItem title="Blight Detection Review" />
            
            <p className="text-xs font-medium text-muted-foreground px-2 py-1 mt-4">Previous 7 Days</p>
            <SessionItem title="Weekly Yield Forecast" />
            <SessionItem title="Gateway Offline Troubleshooting" />
            <SessionItem title="Optimal pH for Tomatoes" />
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-background/50 relative">
        {/* Background Graphic */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none">
           <Bot className="w-96 h-96" />
        </div>

        <ScrollArea className="flex-1 p-4 md:p-8">
          <div className="max-w-3xl mx-auto space-y-6 pb-20">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'ai' && (
                  <Avatar className="w-8 h-8 border border-emerald-500/30 bg-emerald-500/10">
                    <AvatarFallback><Sparkles className="w-4 h-4 text-emerald-500" /></AvatarFallback>
                  </Avatar>
                )}
                
                <div className={`px-4 py-3 rounded-2xl max-w-[80%] text-sm ${
                  msg.role === 'user' 
                    ? 'bg-emerald-600 text-white rounded-tr-sm' 
                    : 'bg-card border border-border/50 shadow-sm rounded-tl-sm leading-relaxed'
                }`}>
                  {msg.content}
                </div>

                {msg.role === 'user' && (
                  <Avatar className="w-8 h-8">
                    <AvatarImage src="https://i.pravatar.cc/150?u=a042581f4e29026704d" />
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 md:p-6 border-t border-border/50 bg-background/80 backdrop-blur-md shrink-0">
          <div className="max-w-3xl mx-auto">
            {messages.length < 2 && (
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                <Button variant="outline" size="sm" className="h-8 text-xs bg-card/50 border-border/50 rounded-full">
                  <Lightbulb className="w-3 h-3 mr-2 text-yellow-500" />
                  Analyze crop health
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs bg-card/50 border-border/50 rounded-full">
                  <Lightbulb className="w-3 h-3 mr-2 text-yellow-500" />
                  Summarize daily alerts
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs bg-card/50 border-border/50 rounded-full">
                  <Lightbulb className="w-3 h-3 mr-2 text-yellow-500" />
                  Compare Sector A and B
                </Button>
              </div>
            )}
            
            <div className="relative flex items-end shadow-sm rounded-xl border border-border/50 bg-card overflow-hidden focus-within:ring-1 focus-within:ring-emerald-500 transition-all">
              <Button variant="ghost" size="icon" className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground">
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="absolute left-10 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground">
                <ImageIcon className="h-4 w-4" />
              </Button>
              <Input 
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Ask AgroEye AI about your farm data..." 
                className="min-h-[56px] w-full bg-transparent border-none pl-20 pr-14 py-4 text-sm focus-visible:ring-0"
              />
              <Button 
                onClick={handleSend}
                size="icon" 
                className={`absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg transition-colors ${query.trim() ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-muted text-muted-foreground'}`}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-center text-[10px] text-muted-foreground mt-2">
              AgroEye AI can make mistakes. Please verify important agricultural decisions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SessionItem({ title, active }: { title: string, active?: boolean }) {
  return (
    <button className={`w-full text-left px-3 py-2 text-sm rounded-md truncate transition-colors ${active ? 'bg-emerald-500/10 text-emerald-500 font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
      {title}
    </button>
  );
}
