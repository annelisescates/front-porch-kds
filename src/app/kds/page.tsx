'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Safe Supabase Client Initialization
const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase env vars missing in current context.');
    return null;
  }
  return createClient(supabaseUrl, supabaseAnonKey);
};

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
    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    // 1. Fetch initial active orders
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

    // 2. Realtime subscription for INSERTs and UPDATEs
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
              setOrders((prev) => prev.filter((o) => o.id !== updatedOrder.id));
            } else {
              setOrders((prev) =>
                prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateOrderStatus = async (orderId: string | number, nextStatus: string) => {
    const supabase = getSupabaseClient();
    
    // Optimistic UI update
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status: nextStatus } : order
      )
    );

    if (supabase) {
      const { error } = await supabase
        .from('orders')
        .update({ status: nextStatus })
        .eq('id', orderId);

      if (error) {
        console.error('Failed to update status in Supabase:', error);
        alert('Could not update order status on server. Please refresh.');
      }
    }
  };

  const bumpOrder = async (orderId: string | number) => {
    const supabase = getSupabaseClient();

    // Optimistically remove from screen
    setOrders((prev) => prev.filter((order) => order.id !== orderId));

    if (supabase) {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', orderId);

      if (error) {
        console.error('Failed to bump order in Supabase:', error);
        alert('Could not bump order. Please refresh.');
      }
    }
  };

  const filterByStatus = (status: string) =>
    orders.filter((o) => (o.status || 'waiting').toLowerCase() === status);

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-black flex items-center justify-center text-xl font-medium">
        Loading Order Display System...
      </div>
    );
  }

  const columns = [
    {
      key: 'waiting',
      title: 'Waiting',
      bgHeader: 'bg-red-600',
      bgColumn: 'bg-red-500/10',
      borderColumn: 'border-red-200',
      borderCard: 'border-red-300',
      btnBg: 'bg-red-600 hover:bg-red-700',
      btnText: 'BEGIN ORDER →',
      nextStatus: 'pressing',
    },
    {
      key: 'pressing',
      title: 'Pressing',
      bgHeader: 'bg-amber-600',
      bgColumn: 'bg-amber-500/10',
      borderColumn: 'border-amber-200',
      borderCard: 'border-amber-300',
      btnBg: 'bg-amber-600 hover:bg-amber-700',
      btnText: 'PACK IT UP! →',
      nextStatus: 'packing',
    },
    {
      key: 'packing',
      title: 'Packing',
      bgHeader: 'bg-yellow-600',
      bgColumn: 'bg-yellow-500/10',
      borderColumn: 'border-yellow-200',
      borderCard: 'border-yellow-300',
      btnBg: 'bg-yellow-600 hover:bg-yellow-700',
      btnText: 'READY FOR PICKUP→',
      nextStatus: 'ready',
    },
    {
      key: 'ready',
      title: 'Ready for Pickup',
      bgHeader: 'bg-emerald-600',
      bgColumn: 'bg-emerald-500/10',
      borderColumn: 'border-emerald-200',
      borderCard: 'border-emerald-300',
      btnBg: 'bg-emerald-600 hover:bg-emerald-700',
      btnText: 'COMPLETE ✓',
      nextStatus: 'completed',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-black p-4 flex flex-col">
      {/* Top Header */}
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-black">
          Front Porch Faith Apparel Co.
        </h1>
        <div className="bg-gray-100 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 font-medium">
          Active Orders: <span className="font-bold text-emerald-600">{orders.length}</span>
        </div>
      </div>

      {/* 4-Column Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
        {columns.map((col) => {
          const colOrders = filterByStatus(col.key);

          return (
            <div
              key={col.key}
              className={`${col.bgColumn} border ${col.borderColumn} rounded-xl flex flex-col overflow-hidden shadow-sm`}
            >
              {/* Column Header */}
              <div className={`${col.bgHeader} px-4 py-3 text-white font-bold flex justify-between items-center`}>
                <span>{col.title}</span>
                <span className="bg-black/20 text-xs px-2.5 py-1 rounded-full text-white font-semibold">
                  {colOrders.length}
                </span>
              </div>

              {/* Column Content Area */}
              <div className="p-3 flex-1 overflow-y-auto space-y-3">
                {colOrders.length === 0 ? (
                  <div className="text-center text-gray-400 py-8 text-sm italic font-medium">
                    No orders
                  </div>
                ) : (
                  colOrders.map((order) => (
                    <div
                      key={order.id}
                      className={`bg-white border ${col.borderCard} rounded-lg p-4 flex flex-col justify-between shadow-md text-black`}
                    >
                      <div>
                        {/* Order Header */}
                        <div className="flex justify-between items-start mb-2 border-b border-gray-100 pb-2">
                          <span className="font-bold text-black text-base">
                            Order #{order.id}
                          </span>
                          <span className="text-xs text-gray-500 font-medium">
                            {new Date(order.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {/* Customer Name */}
                        {order.customer_name && (
                          <p className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                            Customer: <span className="text-black">{order.customer_name}</span>
                          </p>
                        )}

                        {/* Items List */}
                        <div className="text-gray-900 text-sm mb-4 space-y-1 font-medium">
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