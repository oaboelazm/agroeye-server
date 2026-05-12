import React, { useState } from "react";
import { Bell, Check, Trash2, Info, AlertTriangle, XCircle, Clock } from "lucide-react";
import { Button } from "../ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../ui/sheet";
import { cn } from "../ui/utils";
import { motion, AnimatePresence } from "motion/react";
import { formatDistanceToNow } from "date-fns";
import { useAppData } from "../../contexts/AppDataContext";

export function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markNotificationAsRead } = useAppData();

  const getIcon = (type: string) => {
    switch (type) {
      case "alert": return <XCircle className="h-4 w-4 text-red-500" />;
      case "warning": return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "info": return <Info className="h-4 w-4 text-blue-500" />;
      default: return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative transition-all hover:bg-muted">
          <Bell className="h-5 w-5" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute top-2 right-2 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-background"
              />
            )}
          </AnimatePresence>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base">Notifications</SheetTitle>
            {unreadCount > 0 && (
              <span className="text-xs text-muted-foreground">{unreadCount} unread</span>
            )}
          </div>
        </SheetHeader>

        <div className="overflow-y-auto h-full pb-8">
          <AnimatePresence>
            {notifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center text-muted-foreground">
                <Bell className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <motion.div
                  key={notif.notification_id}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "p-4 flex items-start gap-3 cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/50 group",
                    notif.is_read === 0 ? "bg-emerald-500/5" : ""
                  )}
                  onClick={() => {
                    if (notif.is_read === 0) {
                      markNotificationAsRead(notif.notification_id);
                    }
                  }}
                >
                  <div className="mt-0.5 p-1.5 rounded-full bg-background border border-border/50 shrink-0">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn("text-sm leading-none truncate", notif.is_read === 0 ? "font-medium text-foreground" : "text-muted-foreground")}>
                        {notif.message}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center whitespace-nowrap shrink-0">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDistanceToNow(new Date(notif.sent_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  {notif.is_read === 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-emerald-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        markNotificationAsRead(notif.notification_id);
                      }}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  )}
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  );
}
