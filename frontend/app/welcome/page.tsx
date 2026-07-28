"use client";

import { useEffect } from "react";

/** The landing now lives at the root; keep this path working. */
export default function WelcomeRedirect() {
  useEffect(() => { window.location.replace("/"); }, []);
  return null;
}
