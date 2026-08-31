"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Supabase (@supabase/ssr) refreshes the session on every request, so it never
// expires on its own. This enforces an inactivity timeout: after IDLE_MS with no
// user activity, sign out and bounce to /login.
const IDLE_MS = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];

export function SessionTimeout() {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function logout() {
      try {
        await supabase.auth.signOut();
      } finally {
        router.replace("/login?timeout=1");
      }
    }

    function reset() {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(logout, IDLE_MS);
    }

    // Reset at most once per 5s so continuous activity isn't costly.
    let last = 0;
    function onActivity() {
      const now = Date.now();
      if (now - last < 5000) return;
      last = now;
      reset();
    }

    ACTIVITY_EVENTS.forEach((e) =>
      window.addEventListener(e, onActivity, { passive: true })
    );
    reset();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
    };
  }, [router]);

  return null;
}
