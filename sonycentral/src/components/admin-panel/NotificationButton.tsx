"use client";

import { Bell } from "lucide-react";
import { useNotificationStore } from "@/store/notificationStore";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";

function formatTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function NotificationButton() {
  const notifications = useNotificationStore((s) => s.notifications);
  const clearNotifications = useNotificationStore((s) => s.clearNotifications);
  const unreadCount = notifications.length;

  return (
    <DropdownMenu>
      <TooltipProvider disableHoverableContent>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="relative h-8 w-8 rounded-full p-0 flex items-center justify-center"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full transform translate-x-1/2 -translate-y-1/2">
                    {unreadCount}
                  </span>
                )}
                <span className="sr-only">Notifications</span>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">Notifications</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto" align="end" forceMount>
        <DropdownMenuLabel className="font-semibold flex justify-between items-center">
          Notifications
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="ml-2 px-2 py-0 h-6 text-xs" onClick={clearNotifications}>
              Clear All
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <DropdownMenuItem disabled className="text-center text-muted-foreground">No notifications</DropdownMenuItem>
        ) : (
          notifications.slice().reverse().map((n) => (
            <DropdownMenuItem key={n.id} className="flex flex-col items-start py-2 gap-1 cursor-default select-text">
              <div className="flex items-center gap-2">
                {n.type === "error" && <span className="w-2 h-2 rounded-full bg-red-500 inline-block" title="Error" />}
                {n.type === "success" && <span className="w-2 h-2 rounded-full bg-green-500 inline-block" title="Success" />}
                {n.type === "info" && <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" title="Info" />}
                <span className="font-medium text-sm">{n.message}</span>
              </div>
              {n.table && (
                <span className="text-xs text-muted-foreground">Table: {n.table}</span>
              )}
              <span className="text-xs text-muted-foreground">{formatTime(n.timestamp)}</span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 