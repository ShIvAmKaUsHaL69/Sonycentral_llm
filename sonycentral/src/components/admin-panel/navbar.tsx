'use client';

import { ModeToggle } from "@/components/mode-toggle";
import { UserNav } from "@/components/admin-panel/user-nav";
import { SheetMenu } from "@/components/admin-panel/sheet-menu";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { NotificationButton } from "@/components/admin-panel/NotificationButton";

interface NavbarProps {
  title: string;
}

export function Navbar({ title }: NavbarProps) {
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetch("/api/stores")
      .then((res) => res.json())
      .then((data) => setStores(data));
  }, []);

  async function handleSync() {
    setSyncing(true);
    let success = false;
    let error = null;
    if (selectedStore) {
      const store = stores.find((s) => s.store_id === selectedStore);
      if (store && store.shop_url) {
        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shopUrl: store.shop_url })
        });
        success = res.ok;
        if (!res.ok) error = (await res.json()).message || 'Sync failed';
      } else {
        error = 'Store or shop url missing';
      }
    } else {
      const res = await fetch("/api/sync", { method: "GET" });
      success = res.ok;
      if (!res.ok) error = (await res.json()).message || 'Sync failed';
    }
    setSyncing(false);
    if (success) {
      alert('Store sync successful!');
    } else if (error) {
      alert('Sync error: ' + error);
    }
  }

  return (
    <header className="sticky top-0 z-10 w-full bg-background/95 shadow backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:shadow-secondary">
      <div className="mx-4 sm:mx-8 flex h-14 items-center">
        <div className="flex items-center space-x-4 lg:space-x-0">
          <SheetMenu />
          <h1 className="font-bold">{title}</h1>
        </div>
        <div className="flex flex-1 items-center justify-end gap-2">
          <select
            className="border rounded px-3 py-2 min-w-[200px]"
            value={selectedStore}
            onChange={e => setSelectedStore(e.target.value)}
          >
            <option value="">All Stores</option>
            {stores.map((store) => (
              <option key={store.store_id} value={store.store_id}>{store.store_name}</option>
            ))}
          </select>
          <Button
            variant="outline"
            className="px-4 py-2"
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? 'Syncing...' : 'Store Sync'}
          </Button>
          <ModeToggle />
          <NotificationButton />
          <UserNav />
        </div>
      </div>
    </header>
  );
}
