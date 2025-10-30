"use client";
import Link from "next/link";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { useSidebar } from "@/hooks/use-sidebar";
import { useStore } from "@/hooks/use-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/hooks/use-require-auth";

export default function DashboardPage() {
  useRequireAuth();
  const router = useRouter();
  useEffect(() => {
    // Removed session check for unprotected access
  }, [router]);
  const sidebar = useStore(useSidebar, (x) => x);
  const [totals, setTotals] = useState({ stores: 0, customers: 0, orders: 0 });
  const [stores, setStores] = useState<Array<{ store_id: string; store_name: string; shop_url: string }>>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [shopUrl, setShopUrl] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [adding, setAdding] = useState(false);
  const [sales, setSales] = useState<any[]>([]);
  const [loadingTotals, setLoadingTotals] = useState(true);

  useEffect(() => {
    async function fetchTotals() {
      setLoadingTotals(true);
      // Fetch stores
      const storesRes = await fetch("/api/stores");
      const storesData = await storesRes.json();
      setStores(storesData);
      const totalStores = storesData.length;
      // Sum customers and orders from all stores
      const totalCustomers = storesData.reduce((a: number, s: any) => a + (s.total_customers || 0), 0);
      const totalOrders = storesData.reduce((a: number, s: any) => a + (s.total_orders || 0), 0);
      setTotals({ stores: totalStores, customers: totalCustomers, orders: totalOrders });
      setLoadingTotals(false);
    }
    fetchTotals();
    // Fetch sales data
    fetch("/api/stores/sales").then(res => res.json()).then(setSales);
  }, []);
  
  if (!sidebar) return null;
  const { settings, setSettings } = sidebar;

  async function handleAddStore(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    // Add store
    const addRes = await fetch("/api/stores/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopUrl, accessToken }),
    });
    // Sync store only if add was successful
    if (addRes.ok) {
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopUrl, accessToken }),
      });
    }
    setAdding(false);
    setAddOpen(false);
    setShopUrl("");
    setAccessToken("");
    // Refresh dashboard data
    const storesRes = await fetch("/api/stores");
    const storesData = await storesRes.json();
    setStores(storesData);
    setTotals({
      stores: storesData.length,
      customers: storesData.reduce((a: number, s: any) => a + (s.total_customers || 0), 0),
      orders: storesData.reduce((a: number, s: any) => a + (s.total_orders || 0), 0),
    });
  }

  return (
    <ContentLayout title="Dashboard">
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
        <Button onClick={() => setAddOpen(true)} variant="default" size="lg" className="font-bold shadow-lg border-2 border-blue-600 bg-blue-600 hover:bg-blue-700 text-white">Add Store</Button>
        <TooltipProvider>
          <div className="flex justify-end gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="disable-sidebar"
                    onCheckedChange={(x) => setSettings({ disabled: x })}
                    checked={settings.disabled}
                  />
                  <Label htmlFor="disable-sidebar">Disable Sidebar</Label>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Hide sidebar</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>
      {addOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30 p-2">
          <form onSubmit={handleAddStore} className="bg-white dark:bg-zinc-900 sm:p-8 p-4 rounded shadow w-full max-w-md flex flex-col gap-4">
            <h2 className="text-xl font-bold mb-2">Add Store</h2>
            <label>Shop URL</label>
            <input
              type="text"
              value={shopUrl}
              onChange={e => setShopUrl(e.target.value)}
              className="border rounded px-3 py-2"
              required
            />
            <label>Access Token</label>
            <input
              type="text"
              value={accessToken}
              onChange={e => setAccessToken(e.target.value)}
              className="border rounded px-3 py-2"
              required
            />
            <div className="flex gap-2 mt-4">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)} disabled={adding}>Cancel</Button>
              <Button type="submit" disabled={adding}>{adding ? "Adding..." : "Add Store"}</Button>
            </div>
          </form>
        </div>
      )}
      {/* Sales Chart */}
      {sales.length > 0 && (
        <div className="mb-8 w-full">
          <h2 className="text-lg font-bold mb-2">Sales by Store</h2>
          <div className="flex flex-col gap-2">
            {sales.map((s, i) => (
              <div key={s.store_id + s.currency} className="flex items-center gap-2">
                <span className="w-40 truncate">{s.store_name} ({s.currency || '-'})</span>
                <div className="flex-1 bg-gray-200 dark:bg-zinc-800 rounded h-4 relative">
                  <div
                    className="bg-blue-500 h-4 rounded"
                    style={{ width: `${Math.max(5, (s.total_sales / Math.max(...sales.map(x => x.total_sales || 1))) * 100)}%` }}
                  />
                </div>
                <span className="ml-2 font-mono">{Number(s.total_sales).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8 w-full">
        <Card>
          <CardHeader>
            <CardTitle>Total Stores</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">{loadingTotals ? '-' : totals.stores}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">{loadingTotals ? '-' : totals.customers}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">{loadingTotals ? '-' : totals.orders}</span>
          </CardContent>
        </Card>
      </div>
      {/* Store List Table */}
      <div className="overflow-x-auto w-full">
        <table className="min-w-full bg-white dark:bg-zinc-900 rounded-lg shadow text-sm sm:text-base">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-2 text-left">Sr. No.</th>
              <th className="px-4 py-2 text-left min-w-[200px]">Store Name</th>
              <th className="px-4 py-2 text-left min-w-[250px]">Store URL</th>
            </tr>
          </thead>
          <tbody>
            {stores.map((store, idx) => (
              <tr
                key={store.store_id || store.shop_url || idx}
                className="border-b hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <td className="px-4 py-2">{idx + 1}</td>
                <td className="px-4 py-2 min-w-[200px]">{store.store_name || store.shop_url || 'N/A'}</td>
                <td className="px-4 py-2 min-w-[250px]">
                  <a
                    href={store.shop_url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {store.shop_url || 'N/A'}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ContentLayout>
  );
}
