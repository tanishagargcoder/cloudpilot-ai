"use client";
import { useEffect } from "react";

export function KeepAlive() {
  useEffect(() => {
    const ping = () => 
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/ping`).catch(() => {});
    ping();
    const iv = setInterval(ping, 600000);
    return () => clearInterval(iv);
  }, []);
  return null;
}