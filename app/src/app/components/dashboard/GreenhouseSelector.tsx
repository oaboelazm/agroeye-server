import React, { useState } from "react";
import { Search, MapPin, Activity, CheckCircle2, ChevronDown } from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Input } from "../ui/input";
import { useMockData, Farm } from "../../contexts/MockDataContext";
import { motion, AnimatePresence } from "motion/react";

export function GreenhouseSelector() {
  const { farms, activeFarmId, setActiveFarmId } = useMockData();
  const [searchQuery, setSearchQuery] = useState("");
  const activeFarm = farms.find(f => f.id === activeFarmId);

  const filteredFarms = farms.filter(farm => 
    farm.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    farm.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getFarmStatus = (farm: Farm) => {
    // Determine status from devices
    const devices = farm.fields.flatMap(f => f.devices);
    const offline = devices.filter(d => d.status === "offline").length;
    if (offline > 0) return { type: "warning", label: `${offline} offline`, color: "text-amber-500" };
    return { type: "good", label: "All online", color: "text-emerald-500" };
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-3 bg-background/50 border-border/50 hover:bg-muted/50 transition-all h-12 w-[240px] justify-between shadow-sm group">
          <div className="flex flex-col items-start text-left flex-1 min-w-0">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Active Farm</span>
            <span className="text-sm font-medium leading-none truncate w-full text-foreground group-hover:text-emerald-500 transition-colors">
              {activeFarm?.name || "Select Farm"}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[320px] p-2 overflow-hidden bg-card/95 backdrop-blur-xl border-border/50 shadow-xl rounded-xl">
        <div className="relative mb-2 px-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search farms..." 
            className="pl-9 bg-muted/50 border-none focus-visible:ring-1 h-9 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="max-h-[300px] overflow-y-auto pr-1 space-y-1 scrollbar-thin">
          <AnimatePresence>
            {filteredFarms.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="p-4 text-center text-sm text-muted-foreground"
              >
                No farms found.
              </motion.div>
            ) : (
              filteredFarms.map(farm => {
                const status = getFarmStatus(farm);
                const isActive = farm.id === activeFarmId;
                
                return (
                  <motion.div
                    key={farm.id}
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                  >
                    <DropdownMenuItem 
                      onClick={() => setActiveFarmId(farm.id)} 
                      className={`cursor-pointer rounded-lg p-3 transition-all ${isActive ? 'bg-emerald-500/10 border-emerald-500/20' : 'hover:bg-muted border-transparent'} border`}
                    >
                      <div className="flex flex-col w-full gap-2">
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col">
                            <span className={`font-semibold ${isActive ? 'text-emerald-500' : 'text-foreground'}`}>{farm.name}</span>
                            <span className="text-xs text-muted-foreground flex items-center mt-1">
                              <MapPin className="h-3 w-3 mr-1 opacity-70" /> {farm.location}
                            </span>
                          </div>
                          {isActive && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                        </div>
                        
                        <div className="flex items-center gap-3 text-xs mt-1 bg-background/50 rounded-md p-1.5 border border-border/50">
                          <div className="flex items-center gap-1">
                            <Activity className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">{farm.fields.length} Fields</span>
                          </div>
                          <div className={`flex items-center gap-1 ${status.color}`}>
                            <div className={`h-1.5 w-1.5 rounded-full ${status.type === 'warning' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                            <span>{status.label}</span>
                          </div>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
        
        <DropdownMenuSeparator className="my-2" />
        <DropdownMenuItem className="justify-center text-xs text-emerald-500 font-medium cursor-pointer py-2">
          View All Farms
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
