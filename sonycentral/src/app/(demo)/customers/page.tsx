'use client';

import { useEffect, useState } from "react";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useRequireAuth } from "@/hooks/use-require-auth";

export default function CustomersPage() {
  useRequireAuth();
  const [summary, setSummary] = useState<{ total: number; old_customers: number; new_customers: number }>({ total: 0, old_customers: 0, new_customers: 0 });
  const [loading, setLoading] = useState(true);
  const [commonCustomers, setCommonCustomers] = useState<any[]>([]);
  const [loadingCommon, setLoadingCommon] = useState(true);

  useEffect(() => {
    async function fetchSummary() {
      setLoading(true);
      const res = await fetch("/api/stores");
      if (res.ok) {
        const stores = await res.json();
        // Sum total, old, and new customers from all stores
        let total = 0;
        let old_customers = 0;
        let new_customers = 0;
        for (const store of stores) {
          total += store.total_customers || 0;
          old_customers += store.old_customers || 0;
          new_customers += store.new_customers || 0;
        }
        setSummary({ total, old_customers, new_customers });
      }
      setLoading(false);
    }
    fetchSummary();
  }, []);

  useEffect(() => {
    async function fetchCommonCustomers() {
      setLoadingCommon(true);
      const res = await fetch("/api/customers/common");
      if (res.ok) {
        setCommonCustomers(await res.json());
      }
      setLoadingCommon(false);
    }
    fetchCommonCustomers();
  }, []);

  return (
    <ContentLayout title="Customers">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">
              {summary?.total ?? 0}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Old Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">
              {summary?.old_customers ?? 0}
            </span>
            <div className="text-xs text-muted-foreground mt-1">(Joined &gt; 30 days ago)</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>New Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">
              {summary?.new_customers ?? 0}
            </span>
            <div className="text-xs text-muted-foreground mt-1">(Joined in last 30 days)</div>
          </CardContent>
        </Card>
      </div>
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Common Customers (across multiple stores)</h2>
        {loadingCommon ? (
          <div>Loading common customers...</div>
        ) : (
          <div className="auto">
            <div className="max-h-96 w-full overflow-y-auto">
              <table className="min-w-full bg-white dark:bg-zinc-900 rounded-lg shadow overflow-y-auto">
              <thead className="sticky top-0 bg-white dark:bg-zinc-900">
                <tr className="border-b">
                  <th className="px-4 py-2 text-left">Sr. No.</th>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">No. of Stores</th>
                </tr>
              </thead>
              <tbody className="overflow-y-auto">
                {commonCustomers.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-4">No common customers found.</td></tr>
                ) : (
                  commonCustomers.map((customer, idx) => (
                    <tr
                      key={customer.email}
                      className="border-b hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <td className="px-4 py-2">{idx + 1}</td>
                      <td className="px-4 py-2">{customer.name}</td>
                      <td className="px-4 py-2">{customer.email}</td>
                      <td className="px-4 py-2">{customer.store_count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>
    </ContentLayout>
  );
} 