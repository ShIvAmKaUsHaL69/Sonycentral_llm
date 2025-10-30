'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useRequireAuth() {
  const router = useRouter();
  useEffect(() => {
    async function check() {
      const res = await fetch("/api/session");
      const data = await res.json();
      if (!data.loggedIn) {
        router.replace("/login");
      }
    }
    check();
  }, [router]);
} 