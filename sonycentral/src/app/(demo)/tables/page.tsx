"use client";
import { useEffect, useState } from "react";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Button } from "@/components/ui/button";
import { useRequireAuth } from "@/hooks/use-require-auth";

export default function TablesPage() {
  useRequireAuth();
  const [stores, setStores] = useState([]);
  const [tables, setTables] = useState<string[]>([]);
  const [selectedStore, setSelectedStore] = useState("");
  const [selectedTable, setSelectedTable] = useState("");
  const [rows, setRows] = useState([]);
  const [showRows, setShowRows] = useState(5);
  const [page, setPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Fetch stores and tables on mount
  useEffect(() => {
    fetch("/api/stores").then(res => res.json()).then(setStores);
    fetch("/api/tables/list").then(res => res.json()).then(data => {
      setTables(Array.isArray(data) ? data : []);
    });
  }, []);

  // Fetch table data when selection changes
  useEffect(() => {
    if (!selectedTable) return;
    fetchTableData();
    // eslint-disable-next-line
  }, [selectedTable, selectedStore, showRows, page]);

  function fetchTableData() {
    setLoading(true);
    const params = new URLSearchParams({
      table: selectedTable,
      limit: String(showRows),
      page: String(page),
    });
    if (selectedStore) params.append("store_id", selectedStore);
    fetch(`/api/tables/view?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        setRows(data.rows || []);
        setLoading(false);
        setTotalRows(data.rows?.length < showRows ? (page - 1) * showRows + (data.rows?.length || 0) : page * showRows + 1);
      });
  }

  const handleDbSync = async () => {
    setSyncing(true);
    await fetchTableData();
    setSyncing(false);
  };

  // Get table columns
  const columns = rows[0] ? Object.keys(rows[0]) : [];
  const totalPages = Math.max(1, Math.ceil(totalRows / showRows));

  return (
    <ContentLayout title="Tables">
      <div className="flex flex-wrap gap-4 items-center mb-6">
        <select
          className="border rounded px-3 py-2"
          value={selectedStore}
          onChange={e => { setSelectedStore(e.target.value); setPage(1); }}
        >
          <option value="">All Stores</option>
          {stores.map((store: any) => (
            <option key={store.store_id} value={store.store_id}>{store.store_name}</option>
          ))}
        </select>
        <select
          className="border rounded px-3 py-2"
          value={selectedTable}
          onChange={e => { setSelectedTable(e.target.value); setPage(1); }}
        >
          <option value="">Select Table</option>
          {Array.isArray(tables) && tables.map((table: string) => (
            <option key={table} value={table}>{table}</option>
          ))}
        </select>
        <Button onClick={handleDbSync} disabled={syncing}>
          {syncing ? 'Syncing...' : 'DB Sync'}
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <label htmlFor="showRows">Show rows:</label>
          <select
            id="showRows"
            className="border rounded px-2 py-1"
            value={showRows}
            onChange={e => { setShowRows(Number(e.target.value)); setPage(1); }}
          >
            {[5, 10, 20, 50].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="overflow-x-auto bg-white dark:bg-zinc-900 rounded-lg shadow">
        {loading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center">No data found.</div>
        ) : (
          <table className="min-w-full overflow-y-auto">
            <thead className="sticky top-0 bg-white dark:bg-zinc-900">
              <tr>
                {columns.map(col => (
                  <th
                    key={col}
                    className={
                      `px-4 py-2 text-left border-b ` +
                      (col === 'handle' ? 'min-w-[200px]' : '') +
                      (col === 'title' ? 'min-w-[250px]' : '') +
                      (col === 'name' ? 'min-w-[200px]' : '')
                    }
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="overflow-y-auto">
              {rows.map((row, idx) => (
                <tr key={idx} className="border-b hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  {columns.map(col => (
                    <td
                      key={col}
                      className={
                        `px-4 py-2 ` +
                        (col === 'handle' ? 'min-w-[200px]' : '') +
                        (col === 'title' ? 'min-w-[250px]' : '') +
                        (col === 'name' ? 'min-w-[200px]' : '')
                      }
                    >
                      {row[col]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {/* Pagination */}
      <div className="flex justify-between items-center mt-4">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </Button>
        <span>Page {page} of {totalPages}</span>
        <Button
          variant="outline"
          size="sm"
          disabled={rows.length < showRows}
          onClick={() => setPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </ContentLayout>
  );
}
