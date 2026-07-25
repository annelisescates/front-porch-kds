'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type definition for an Order
interface Order {
  id: string | number;
  created_at: string;
  customer_name?: string;
  items?: string | string[];
  total_price?: number;
  status: string; // 'waiting' | 'pressing' | 'packing' | 'ready' | 'completed'
}

export default function KDSPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch initial active orders (all active stages, excluding 'completed')
    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .neq('status', 'completed')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching orders:', error);
      } else {
        setOrders(data || []);
      }
      setLoading(false);
    };

    fetchOrders();

    // 2. Set up Realtime listener catching INSERTs and UPDATEs to 'orders'
    const channel = supabase
      .channel('kds_realtime_orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.log('Realtime payload received:', payload);

          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as Order;
            if (newOrder.status !== 'completed') {
              setOrders((prev) => {
                if (prev.some((order) => order.id === newOrder.id)) return prev;
                return [...prev, newOrder];
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new as Order;
            if (updatedOrder.status === 'completed') {
              // Remove if completed by another device
              setOrders((prev) => prev.filter((o) => o.id !== updatedOrder.id));
            } else {
              // Update status in local state
              setOrders((prev) =>
                prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
              );
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Supabase Realtime Connection Status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Move order to the next stage in Supabase
  const updateOrderStatus = async (orderId: string | number, nextStatus: string) => {
    // Optimistic UI update
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status: nextStatus } : order
      )
    );

    const { error } = await supabase
      .from('orders')
      .update({ status: nextStatus })
      .eq('id', orderId);

    if (error) {
      console.error('Failed to update status in Supabase:', error);
      alert('Could not update order status on server. Please refresh.');
    }
  };

  // Complete & Bump order off the screen
  const bumpOrder = async (orderId: string | number) => {
    // Optimistically remove from screen
    setOrders((prev) => prev.filter((order) => order.id !== orderId));

    const { error } = await supabase
      .from('orders')
      .update({ status: 'completed' })
      .eq('id', orderId);

    if (error) {
      console.error('Failed to bump order in Supabase:', error);
      alert('Could not bump order. Please refresh.');
    }
  };

  // Helper functions for stage columns
  const filterByStatus = (status: string) =>
    orders.filter((o) => (o.status || 'waiting').toLowerCase() === status);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center text-xl font-medium">
        Loading Kitchen Display System...
      </div>
    );
  }

  const columns = [
    {
      key: 'waiting',
      title: 'Waiting',
      bgHeader: 'bg-red-600',
      borderCard: 'border-red-500/50',
      btnBg: 'bg-red-600 hover:bg-red-500',
      btnText: 'Move to Pressing →',
      nextStatus: 'pressing',
    },
    {
      key: 'pressing',
      title: 'Pressing',
      bgHeader: 'bg-amber-600',
      borderCard: 'border-amber-500/50',
      btnBg: 'bg-amber-600 hover:bg-amber-500',
      btnText: 'Move to Packing →',
      nextStatus: 'packing',
    },
    {
      key: 'packing',
      title: 'Packing',
      bgHeader: 'bg-yellow-600',
      borderCard: 'border-yellow-500/50',
      btnBg: 'bg-yellow-600 hover:bg-yellow-500',
      btnText: 'Mark Ready →',
      nextStatus: 'ready',
    },
    {
      key: 'ready',
      title: 'Ready for Pickup',
      bgHeader: 'bg-emerald-600',
      borderCard: 'border-emerald-500/50',
      btnBg: 'bg-emerald-600 hover:bg-emerald-500',
      btnText: 'Bump / Complete ✓',
      nextStatus: 'completed',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 flex flex-col">
      {/* Top Header */}
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
        <h1 className="text-2xl md:text-3xl font-bold tracking-wide text-white">
          Kitchen Display System
        </h1>
        <div className="bg-slate-900 px-4 py-2 rounded-lg border border-slate-800 text-sm">
          Active Orders: <span className="font-bold text-emerald-400">{orders.length}</span>
        </div>
      </div>

      {/* 4-Column Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
        {columns.map((col) => {
          const colOrders = filterByStatus(col.key);

          return (
            <div
              key={col.key}
              className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden"
            >
              {/* Column Header */}
              <div className={`${col.bgHeader} px-4 py-3 text-white font-bold flex justify-between items-center`}>
                <span>{col.title}</span>
                <span className="bg-black/30 text-xs px-2.5 py-1 rounded-full">
                  {colOrders.length}
                </span>
              </div>

              {/* Column Content */}
              <div className="p-3 flex-1 overflow-y-auto space-y-3">
                {colOrders.length === 0 ? (
                  <div className="text-center text-slate-600 py-8 text-sm italic">
                    No orders
                  </div>
                ) : (
                  colOrders.map((order) => (
                    <div
                      key={order.id}
                      className={`bg-slate-800 border ${col.borderCard} rounded-lg p-4 flex flex-col justify-between shadow-md`}
                    >
                      <div>
                        {/* Order Header */}
                        <div className="flex justify-between items-start mb-2 border-b border-slate-700/60 pb-2">
                          <span className="font-bold text-white text-base">
                            Order #{order.id}
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(order.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {/* Customer Name */}
                        {order.customer_name && (
                          <p className="text-xs font-semibold text-amber-300 mb-2">
                            Customer: {order.customer_name}
                          </p>
                        )}

                        {/* Items */}
                        <div className="text-slate-200 text-sm mb-4 space-y-1">
                          {Array.isArray(order.items) ? (
                            order.items.map((item, idx) => (
                              <p key={idx}>• {item}</p>
                            ))
                          ) : (
                            <p>• {order.items || 'Standard Order'}</p>
                          )}
                        </div>
                      </div>

                      {/* Action Button */}
                      {col.key === 'ready' ? (
                        <button
                          onClick={() => bumpOrder(order.id)}
                          className={`w-full mt-2 ${col.btnBg} text-white font-bold py-2.5 px-3 rounded-lg text-sm transition-colors duration-150 shadow-sm`}
                        >
                          {col.btnText}
                        </button>
                      ) : (
                        <button
                          onClick={() => updateOrderStatus(order.id, col.nextStatus)}
                          className={`w-full mt-2 ${col.btnBg} text-white font-bold py-2.5 px-3 rounded-lg text-sm transition-colors duration-150 shadow-sm`}
                        >
                          {col.btnText}
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}