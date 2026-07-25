'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type definition for an Order (adjust fields if your database column names differ)
interface Order {
  id: string | number;
  created_at: string;
  customer_name?: string;
  items?: string | string[];
  total_price?: number;
  status: string;
}

export default function KDSPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch initial active orders and subscribe to Realtime updates
  useEffect(() => {
    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .neq('status', 'completed') // Hide completed orders
        .order('created_at', { ascending: true }); // Oldest orders first

      if (error) {
        console.error('Error fetching orders:', error);
      } else {
        setOrders(data || []);
      }
      setLoading(false);
    };

    fetchOrders();

    // Set up Supabase Realtime Subscription
    const channel = supabase
      .channel('kds_realtime_orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = payload.new as Order;
          // Add new order to screen if it isn't completed
          if (newOrder.status !== 'completed') {
            setOrders((prev) => [...prev, newOrder]);
          }
        }
      )
      .subscribe();

    // Cleanup subscription when leaving the page
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 2. Function to mark order as completed in Supabase and clear from screen
  const clearOrder = async (orderId: string | number) => {
    // Optimistically update local UI immediately so the UI responds fast
    setOrders((prev) => prev.filter((order) => order.id !== orderId));

    const { error } = await supabase
      .from('orders')
      .update({ status: 'completed' })
      .eq('id', orderId);

    if (error) {
      console.error('Failed to update status in Supabase:', error);
      alert('Could not update order status on server. Please refresh.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center text-xl">
        Loading KDS...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
        <h1 className="text-3xl font-bold tracking-wide text-white">Kitchen Display System</h1>
        <div className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700 text-sm">
          Active Orders: <span className="font-bold text-green-400">{orders.length}</span>
        </div>
      </div>

      {/* Empty State */}
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
          <p className="text-2xl font-medium">All clear! No pending orders.</p>
        </div>
      ) : (
        /* Orders Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex flex-col justify-between shadow-lg"
            >
              <div>
                {/* Order Top Bar */}
                <div className="flex justify-between items-start mb-3 border-b border-slate-700 pb-2">
                  <span className="text-lg font-bold text-white">Order #{order.id}</span>
                  <span className="text-xs text-slate-400">
                    {new Date(order.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {/* Customer Name */}
                {order.customer_name && (
                  <p className="text-sm font-semibold text-amber-400 mb-3">
                    Customer: {order.customer_name}
                  </p>
                )}

                {/* Order Items */}
                <div className="text-slate-200 text-base mb-4 space-y-1">
                  {Array.isArray(order.items) ? (
                    order.items.map((item, idx) => <p key={idx}>• {item}</p>)
                  ) : (
                    <p>• {order.items || 'Standard Order'}</p>
                  )}
                </div>
              </div>

              {/* Complete / Bump Button */}
              <button
                onClick={() => clearOrder(order.id)}
                className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-150 shadow-md"
              >
                Complete Order ✓
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}