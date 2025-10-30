"use client";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import Link from "next/link";
import { useRequireAuth } from "@/hooks/use-require-auth";

export default function AccountPage() {
  useRequireAuth();
  const [admin, setAdmin] = useState<{ name: string; email: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  useEffect(() => {
    async function fetchAdmin() {
      const res = await fetch("/api/admin/me");
      if (res.ok) {
        const data = await res.json();
        setAdmin(data);
        setName(data.name);
      }
    }
    fetchAdmin();
  }, []);
  const initials = admin?.name
    ? admin.name.split(" ").map((n) => n[0]).join("").toUpperCase()
    : "A";
  return (
    <ContentLayout title="Account">
      {admin === null ? (
        <div className="flex justify-center items-center min-h-[200px]">
          {/* <Loader className="w-8 h-8" /> */}
        </div>
      ) : (
        <div className="w-full max-w-md mx-auto mt-10 bg-white dark:bg-zinc-800 rounded-lg shadow sm:p-8 p-4 flex flex-col items-center">
          <Avatar className="h-20 w-20 mb-4">
            <AvatarImage src="#" alt="Avatar" />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          {editing ? (
            <div className="w-full flex flex-col items-center mb-2">
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="mb-2 text-center border rounded px-3 py-2 w-full"
                type="text"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => { setEditing(false); setName(admin?.name || ""); }}>Cancel</Button>
                <Button size="sm" onClick={async () => {
                  // Save new name to DB
                  await fetch("/api/admin/me", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, email: admin?.email }),
                  });
                  setEditing(false);
                  setAdmin(a => a ? { ...a, name } : null);
                }}>Save</Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center mb-2">
              <span className="text-xl font-semibold mr-2">{admin?.name || "Admin"}</span>
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit Name</Button>
            </div>
          )}
          <div className="mb-4 text-zinc-500 dark:text-zinc-300">{admin?.email || "admin@example.com"}</div>
          <Button variant="secondary">Change Password</Button>
        </div>
      )}
    </ContentLayout>
  );
}
