'use client';

import { ContentLayout } from "@/components/admin-panel/content-layout";

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
import { useNotificationStore } from '@/store/notificationStore';

export default function DashboardClient() {
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
  const [syncComplete, setSyncComplete] = useState(false);
  const [fetchingProgress, setFetchingProgress] = useState(0);
  const [insertionProgress, setInsertionProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<'idle' | 'fetching' | 'inserting'>('idle');
  const setSyncProgress = useNotificationStore.getState().setSyncProgress;

  useEffect(() => {
    async function fetchTotals() {
      // Fetch stores
      const storesRes = await fetch("/api/stores");
      const storesData = await storesRes.json();
      setStores(storesData);
      const totalStores = storesData.length;
      // Sum customers and orders from all stores
      let totalCustomers = 0;
      let totalOrders = 0;
      for (const store of storesData) {
        totalCustomers += store.total_customers || 0;
        totalOrders += store.total_orders || 0;
      }
      setTotals({ stores: totalStores, customers: totalCustomers, orders: totalOrders });
    }
    fetchTotals();
    // Fetch sales data
    fetch("/api/stores/sales").then(res => res.json()).then(setSales);
  }, []);
  
  // Debug progress states
  useEffect(() => {
    console.log('Progress states changed:', { currentPhase, adding, fetchingProgress, insertionProgress });
  }, [currentPhase, adding, fetchingProgress, insertionProgress]);
  
  if (!sidebar) return null;
  const { settings, setSettings } = sidebar;

  async function handleAddStore(e: React.FormEvent) {
    e.preventDefault();
    console.log('=== ADD STORE PROCESS STARTED ===');
    console.log('Form submitted with:', { shopUrl, accessToken });
    
    // Set initial states
    setAdding(true);
    setCurrentPhase('fetching');
    setFetchingProgress(0);
    setInsertionProgress(0);
    
    console.log('States set:', { adding: true, currentPhase: 'fetching', fetchingProgress: 0, insertionProgress: 0 });
    
    // Force a delay to ensure state updates are visible
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Delay completed, starting API calls...');
    
    try {
      // Add store
      setFetchingProgress(10);
      console.log('Making API call to /api/stores/add...');
      
      const addResponse = await fetch("/api/stores/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopUrl, accessToken }),
      });
      
      console.log('Add store response status:', addResponse.status);
      console.log('Add store response ok:', addResponse.ok);
      
      if (!addResponse.ok) {
        const errorData = await addResponse.json().catch(() => ({}));
        console.log('Add store error data:', errorData);
        throw new Error(errorData.message || 'Failed to add store');
      }
      
      const addResult = await addResponse.json();
      console.log('Add store result:', addResult);
      
      setFetchingProgress(30);
      
      // Sync store with progress
      const tables = [
        'products', 'product_variants', 'customers', 'orders', 'order_items',
        'order_fulfillments', 'order_billing', 'order_shipping', 'order_transactions',
        'order_returns', 'sku_mapping', 'order_customer', 'order_item_properties'
      ];
      
      setFetchingProgress(50);
      setSyncProgress({ active: true, percent: 0, currentTable: 'starting', message: 'Starting sync...' });
      
      console.log('Making API call to /api/sync...');
      
      // Simulate progress for each table (since actual sync is backend, we update after fetch)
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopUrl, accessToken }),
      });
      
      console.log('Sync response status:', res.status);
      console.log('Sync response ok:', res.ok);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to sync store');
      }
      
      setFetchingProgress(80);
      
      const result = await res.json();
      console.log('Sync API result:', result);
      
      setFetchingProgress(100);
      setCurrentPhase('inserting');
      
      console.log('Starting insertion phase with tables:', tables);
      
      // After fetch, update progress for each table based on summary with delays
      const totalTables = tables.length;
      for (let idx = 0; idx < totalTables; idx++) {
        const table = tables[idx];
        const progress = Math.round(((idx + 1) / totalTables) * 100);
        
        console.log(`Processing table ${idx + 1}/${totalTables}: ${table} (${progress}%)`);
        
        setInsertionProgress(progress);
        setSyncProgress({
          active: true,
          percent: progress,
          currentTable: table,
          message: `Inserting into ${table.replace(/_/g, ' ')}`
        });
        
        // Add a small delay to make progress visible
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      setSyncProgress({ active: false, percent: 100, currentTable: 'done', message: 'Sync complete!' });
      setInsertionProgress(100);
      setCurrentPhase('idle');
      
      const addNotification = useNotificationStore.getState().addNotification;
      console.log('=== NOTIFICATION HANDLING ===');
      console.log('Result:', result);
      console.log('Result summary:', result.summary);
      console.log('Result errors:', result.errors);
      
      // Handle notifications
      if (result.errors && result.errors.length > 0) {
        console.log('Adding error notification for sync interruption');
        addNotification({
          type: 'error',
          message: 'Sync was interrupted!',
          timestamp: new Date()
        });
        Object.entries(result.summary || {}).forEach(([table, count]) => {
          if ((count as number) > 0) {
            console.log(`Adding success notification for ${table}: ${count}`);
            addNotification({
              type: 'success',
              message: `${count} ${table} inserted successfully before interruption`,
              table,
              timestamp: new Date()
            });
          }
        });
        result.errors.forEach((err: any) => {
          console.log(`Adding error notification for ${err.type}: ${err.error}`);
          addNotification({
            type: 'error',
            message: `Error inserting ${err.type}: ${err.error}`,
            table: err.type,
            timestamp: new Date()
          });
        });
      } else {
        console.log('Adding success notification for sync completion');
        addNotification({
          type: 'success',
          message: result.message || 'Sync completed successfully!',
          timestamp: new Date()
        });
        Object.entries(result.summary || {}).forEach(([table, count]) => {
          if ((count as number) > 0) {
            console.log(`Adding success notification for ${table}: ${count}`);
            addNotification({
              type: 'success',
              message: `${count} ${table} inserted`,
              table,
              timestamp: new Date()
            });
          }
        });
      }

      // Notify about skipped counts if present
      if (result.skipped) {
        const { orders = 0, variants_no_sku = 0 } = result.skipped as any;
        if (orders > 0) {
          addNotification({
            type: 'info',
            message: `${orders} orders were skipped due to insert errors`,
            table: 'orders',
            timestamp: new Date()
          });
        }
        if (variants_no_sku > 0) {
          addNotification({
            type: 'info',
            message: `${variants_no_sku} variants skipped (missing SKU)`,
            table: 'product_variants',
            timestamp: new Date()
          });
        }
      }
      
      // Check if notifications were added
      const currentNotifications = useNotificationStore.getState().notifications;
      console.log('Current notifications after adding:', currentNotifications);
      
      setAdding(false);
      setSyncComplete(true);
      setTimeout(() => setSyncComplete(false), 3000);
      setTimeout(() => setSyncProgress(null), 2000);
      
      // Refresh dashboard data
      const storesRes = await fetch("/api/stores");
      const storesData = await storesRes.json();
      setStores(storesData);
      setTotals({
        stores: storesData.length,
        customers: storesData.reduce((a: any, s: any) => a + (s.total_customers || 0), 0),
        orders: storesData.reduce((a: any, s: any) => a + (s.total_orders || 0), 0),
      });
      
      // Close form and reset after everything is complete
      console.log('Process complete, keeping form open for 5 seconds to show progress...');
      
      // Keep form open longer to see progress bars
      setTimeout(() => {
        setAddOpen(false);
        setShopUrl("");
        setAccessToken("");
        setCurrentPhase('idle');
        setFetchingProgress(0);
        setInsertionProgress(0);
        console.log('Form closed and reset');
      }, 5000);
      
    } catch (error) {
      console.error('Error adding store:', error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      
      setAdding(false);
      setCurrentPhase('idle');
      setFetchingProgress(0);
      setInsertionProgress(0);
      
      // Show error notification
      const addNotification = useNotificationStore.getState().addNotification;
      addNotification({
        type: 'error',
        message: `Failed to add store: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      });
    }
  }

  return (
    <ContentLayout title="Dashboard">
      {/* Test Buttons for Debugging */}
      <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Debug Tools</h3>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setCurrentPhase('fetching');
              setFetchingProgress(50);
              setInsertionProgress(25);
              setTimeout(() => {
                setCurrentPhase('idle');
                setFetchingProgress(0);
                setInsertionProgress(0);
              }, 3000);
            }}
            size="sm"
            variant="outline"
          >
            Test Progress
          </Button>
          
          <Button
            onClick={() => {
              const addNotification = useNotificationStore.getState().addNotification;
              addNotification({
                type: 'success',
                message: 'Test notification - Store added successfully!',
                timestamp: new Date()
              });
              console.log('Test notification added');
            }}
            size="sm"
            variant="outline"
          >
            Test Notification
          </Button>
          
          <Button
            onClick={() => {
              console.log('Current notifications:', useNotificationStore.getState().notifications);
            }}
            size="sm"
            variant="outline"
          >
            Log Notifications
          </Button>
        </div>
      </div>
      
      <div className="flex justify-between mb-4">
        <Button onClick={() => setAddOpen(true)} variant="secondary">Add Store</Button>
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
      
      {/* Dashboard Progress Bar - Always Visible During Process */}
      {(currentPhase === 'fetching' || currentPhase === 'inserting' || adding) && (
        <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentPhase === 'fetching' ? 'bg-blue-500 animate-pulse' : 
                currentPhase === 'inserting' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              }`}>
                <span className="text-white text-sm font-bold">
                  {currentPhase === 'fetching' ? '🔄' : currentPhase === 'inserting' ? '📊' : '⏳'}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold">
                  {currentPhase === 'fetching' ? 'Fetching Store Data' : 
                   currentPhase === 'inserting' ? 'Inserting Data' : 'Processing...'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {currentPhase === 'fetching' ? 'Downloading data from Shopify' : 
                   currentPhase === 'inserting' ? 'Saving data to database' : 'Initializing...'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                {currentPhase === 'fetching' ? `${fetchingProgress}%` : 
                 currentPhase === 'inserting' ? `${insertionProgress}%` : '0%'}
              </div>
              <div className="text-xs text-muted-foreground">Complete</div>
            </div>
          </div>
          
          {/* Main Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-4 mb-4">
            <div 
              className={`h-4 rounded-full transition-all duration-500 ease-out ${
                currentPhase === 'fetching' ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 
                currentPhase === 'inserting' ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gray-300'
              }`}
              style={{ 
                width: currentPhase === 'fetching' ? `${fetchingProgress}%` : 
                       currentPhase === 'inserting' ? `${insertionProgress}%` : '0%' 
              }}
            />
          </div>
          
          {/* Phase Indicator */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 ${currentPhase === 'fetching' ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
                <div className={`w-3 h-3 rounded-full ${currentPhase === 'fetching' ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'}`} />
                <span>Fetching Data</span>
              </div>
              <div className={`flex items-center gap-2 ${currentPhase === 'inserting' ? 'text-green-600 font-semibold' : 'text-gray-400'}`}>
                <div className={`w-3 h-3 rounded-full ${currentPhase === 'inserting' ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                <span>Inserting Data</span>
              </div>
            </div>
            
            {/* Current Table Info */}
            {currentPhase === 'inserting' && (
              <div className="text-sm font-medium text-green-600">
                Table {Math.ceil(insertionProgress / 7.69)} of 13
              </div>
            )}
          </div>
          
          {/* Status Message */}
          <div className="mt-3 p-2 bg-white dark:bg-zinc-800 rounded border">
            <div className="text-xs font-mono text-gray-600 dark:text-gray-300">
              Status: {currentPhase === 'fetching' ? 'Downloading from Shopify API' : 
                      currentPhase === 'inserting' ? 'Processing database operations' : 'Ready'}
            </div>
          </div>
        </div>
      )}
      
      {/* Success/Error Status */}
      {syncComplete && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">✓</span>
            </div>
            <div>
              <h3 className="font-semibold text-green-800 dark:text-green-200">Sync Completed Successfully!</h3>
              <p className="text-sm text-green-600 dark:text-green-300">Store data has been synchronized and is ready to use.</p>
            </div>
          </div>
        </div>
      )}
      {addOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30">
          <form onSubmit={handleAddStore} className="bg-white dark:bg-zinc-900 p-8 rounded shadow w-full max-w-md flex flex-col gap-4">
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
            
            {/* Progress Bars */}
            <div className="space-y-4 mt-4">
              {/* Main Progress Bar */}
              {(currentPhase === 'fetching' || currentPhase === 'inserting') && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      {currentPhase === 'fetching' ? '🔄 Fetching Store Data' : '📊 Inserting Data'}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {currentPhase === 'fetching' ? `${fetchingProgress}%` : `${insertionProgress}%`}
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-2 mb-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ease-out ${
                        currentPhase === 'fetching' ? 'bg-blue-500' : 'bg-green-500'
                      }`}
                      style={{ 
                        width: currentPhase === 'fetching' ? `${fetchingProgress}%` : `${insertionProgress}%` 
                      }}
                    />
                  </div>
                  
                  {/* Phase Indicator */}
                  <div className="flex items-center gap-3 text-xs">
                    <div className={`flex items-center gap-1 ${currentPhase === 'fetching' ? 'text-blue-600' : 'text-gray-400'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${currentPhase === 'fetching' ? 'bg-blue-500' : 'bg-gray-300'}`} />
                      <span>Fetching</span>
                    </div>
                    <div className={`flex items-center gap-1 ${currentPhase === 'inserting' ? 'text-green-600' : 'text-gray-400'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${currentPhase === 'inserting' ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span>Inserting</span>
                    </div>
                  </div>
                  
                  {/* Current Table Info */}
                  {currentPhase === 'inserting' && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      Processing: {Math.ceil(insertionProgress / 7.69)} of 13 tables
                    </div>
                  )}
                </div>
              )}
              
              {/* Detailed Progress Bars */}
              <div className="space-y-3">
                {/* Fetching Progress */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-left">Fetching</span>
                    <span className="text-xs text-muted-foreground">
                      {currentPhase === 'idle' ? 'Ready' : `${fetchingProgress}%`}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full transition-all duration-300 ease-out ${
                        currentPhase === 'fetching' ? 'bg-blue-500' : 'bg-gray-300 dark:bg-zinc-600'
                      }`}
                      style={{ width: currentPhase === 'idle' ? '0%' : `${fetchingProgress}%` }}
                    />
                  </div>
                </div>
                
                {/* Insertion Progress */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-left">Inserting</span>
                    <span className="text-xs text-muted-foreground">
                      {currentPhase === 'idle' ? 'Ready' : `${insertionProgress}%`}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full transition-all duration-300 ease-out ${
                        currentPhase === 'inserting' ? 'bg-green-500' : 'bg-gray-300 dark:bg-zinc-600'
                      }`}
                      style={{ width: currentPhase === 'idle' ? '0%' : `${insertionProgress}%` }}
                    />
                  </div>
                </div>
              </div>
              
              {/* Debug Info */}
              {adding && (
                <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <div className="grid grid-cols-2 gap-2">
                    <div>Phase: <span className="font-mono">{currentPhase}</span></div>
                    <div>Fetching: <span className="font-mono">{fetchingProgress}%</span></div>
                    <div>Inserting: <span className="font-mono">{insertionProgress}%</span></div>
                    <div>Status: <span className="font-mono">{adding ? 'Active' : 'Idle'}</span></div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-2 mt-4">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)} disabled={adding}>
                Cancel
              </Button>
              <Button type="submit" disabled={adding} className={adding ? "opacity-50 cursor-not-allowed" : ""}>
                {adding ? "Adding..." : "Add Store"}
              </Button>
            </div>
          </form>
        </div>
      )}
      {/* Floating Progress Indicator - Always Visible */}
      {(currentPhase === 'fetching' || currentPhase === 'inserting' || adding) && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-white dark:bg-zinc-900 border-2 border-blue-300 dark:border-blue-600 rounded-lg shadow-lg z-50 px-6 py-4 min-w-[300px]">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
              currentPhase === 'fetching' ? 'bg-blue-500 animate-spin' : 
              currentPhase === 'inserting' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
            }`}>
              <span className="text-white text-xs">
                {currentPhase === 'fetching' ? '🔄' : currentPhase === 'inserting' ? '📊' : '⏳'}
              </span>
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm">
                {currentPhase === 'fetching' ? 'Fetching Store Data' : 
                 currentPhase === 'inserting' ? 'Inserting Data' : 'Processing...'}
              </div>
              <div className="text-xs text-muted-foreground">
                {currentPhase === 'fetching' ? `${fetchingProgress}% complete` : 
                 currentPhase === 'inserting' ? `${insertionProgress}% complete` : 'Initializing...'}
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ease-out ${
                currentPhase === 'fetching' ? 'bg-blue-500' : 
                currentPhase === 'inserting' ? 'bg-green-500' : 'bg-gray-300'
              }`}
              style={{ 
                width: currentPhase === 'fetching' ? `${fetchingProgress}%` : 
                       currentPhase === 'inserting' ? `${insertionProgress}%` : '0%' 
              }}
            />
          </div>
        </div>
      )}
      
      {syncComplete && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded shadow z-50">
          Sync Complete
        </div>
      )}
      {/* Sales Chart */}
      {sales.length > 0 && (
        <div className="mb-8">
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Total Stores</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">{totals.stores}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">{totals.customers}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">{totals.orders}</span>
          </CardContent>
        </Card>
      </div>
      {/* Store List Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white dark:bg-zinc-900 rounded-lg shadow">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-2 text-left">Sr. No.</th>
              <th className="px-4 py-2 text-left">Store Name</th>
              <th className="px-4 py-2 text-left">Store URL</th>
            </tr>
          </thead>
          <tbody>
            {stores.map((store, idx) => (
              <tr
                key={store.store_id || store.shop_url || idx}
                className="border-b hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <td className="px-4 py-2">{idx + 1}</td>
                <td className="px-4 py-2">{store.store_name || store.shop_url || 'N/A'}</td>
                <td className="px-4 py-2">
                  {store.shop_url ? (() => {
                    let cleanUrl = store.shop_url.trim().replace(/^https?:\/\//, '').replace(/^\/+/, '');
                    return (
                      <a
                        href={`https://${cleanUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {cleanUrl}
                      </a>
                    );
                  })() : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ContentLayout>
  );
} 