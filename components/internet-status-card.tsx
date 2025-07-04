"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Wifi, WifiOff } from "lucide-react";

declare global {
  interface Window {
    __APP_OFFLINE?: boolean;
  }
}

export default function InternetStatusBanner() {
  const [online, setOnline] = useState(true);
  const [showOnline, setShowOnline] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      const isOnline = navigator.onLine;
      setOnline(isOnline);
      if (typeof window !== 'undefined') {
        window.__APP_OFFLINE = !isOnline;
      }
      if (isOnline) {
        setShowOnline(true);
        setTimeout(() => setShowOnline(false), 2000);
      }
    };
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    updateStatus();
    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  if (online && !showOnline) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-end justify-end">
      <Card
        className={`rounded-full px-4 py-2 shadow-lg border border-border flex items-center gap-2 text-sm transition-colors duration-300 backdrop-blur-md
          ${online ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}
        style={{ minWidth: 140 }}
        aria-live="polite"
      >
        {online ? (
          <Wifi className="w-4 h-4 text-success" />
        ) : (
          <WifiOff className="w-4 h-4 text-destructive" />
        )}
        <span className="font-medium">
          {online ? 'You are online' : 'No internet connection'}
        </span>
      </Card>
    </div>
  );
}
