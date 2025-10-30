"use client";

import Link from "next/link";
import { LayoutGrid, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export function UserNav() {
  const [admin, setAdmin] = useState<{ name: string; email: string } | null>(null);
  const router = useRouter();
  useEffect(() => {
    async function fetchAdmin() {
      // Get email from localStorage or another source
      const email = typeof window !== 'undefined' ? localStorage.getItem('admin_email') : null;
      if (!email) return; // Or handle as not logged in
      const res = await fetch(`/api/admin/me?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        setAdmin(data);
      }
    }
    fetchAdmin();
  }, []);
  const initials = admin?.name
    ? admin.name.split(" ").map((n) => n[0]).join("").toUpperCase()
    : "A";

  async function handleSignOut() {
    // Clear chat history from localStorage and sessionStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('chatMessages');
      sessionStorage.removeItem('chatMessages'); // <-- Add this line
      sessionStorage.removeItem('chatId');
    }
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <DropdownMenu>
      <TooltipProvider disableHoverableContent>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="relative h-8 w-8 rounded-full"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src="#" alt="Avatar" />
                  <AvatarFallback className="bg-transparent">{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">Profile</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{admin?.name || "Admin"}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {admin?.email || "admin@example.com"}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="hover:cursor-pointer" asChild>
            <Link href="/dashboard" className="flex items-center">
              <LayoutGrid className="w-4 h-4 mr-3 text-muted-foreground" />
              Dashboard
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="hover:cursor-pointer" asChild>
            <Link href="/account" className="flex items-center">
              <User className="w-4 h-4 mr-3 text-muted-foreground" />
              Account
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="hover:cursor-pointer" onClick={handleSignOut}>
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
