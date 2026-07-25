"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type OrderItem = {
  id: string;
  design: string;
  garment: string;
  size: string;
  quantity: number;
};

type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  notes: string;
  status: "WAITING" | "PRESSING" | "READY" | "PICKED_UP";
  created_at: string;
  order_items: OrderItem[];
};

export default function KDSPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  // Fetch initial orders & listen for live changes from Supabase
  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel("realtime-kds")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchOrders() {
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: true });

    if (!error && data) {
      setOrders(data as Order[]);
    }
  }

  async function updateStatus(
    orderId: string,
    newStatus: Order["status"]
  ) {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) {
      alert(`Failed to update status: ${error.message}`);
    } else {
      fetchOrders();
    }
  }

  const columns: {
    label: string;
    status: Order["status"];
    bgTint: string;
    borderColor: string;
    badgeBg: string;
    badgeText: string;
  }[] = [
    {
      label: "Waiting",
      status: "WAITING",
      bgTint: "bg-red-500/10",
      borderColor: "border-red-400",
      badgeBg: "bg-red-100",
      badgeText: "text-red-700",
    },
    {
      label: "Pressing",
      status: "PRESSING",
      bgTint: "bg-amber-500/10",
      borderColor: "border-amber-400",
      badgeBg: "bg-amber-100",
      badgeText: "text-amber-800",
    },
    {
      label: "Ready for Pickup",
      status: "READY",
      bgTint: "bg-emerald-500/10",
      borderColor: "border-emerald-400",
      badgeBg: "bg-emerald-100",
      badgeText: "text-emerald-800",
    },
    {
      label: "Picked Up",
      status: "PICKED_UP",
      bgTint: "bg-gray-500/10",
      borderColor: "border-gray-300",
      badgeBg: "bg-gray-200",
      badgeText: "text-gray-700",
    },
  ];

  return (
    <main className="min-h-screen bg-gray-100 p-6 text-gray-900">
      <header className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-3xl font-bold">Front Porch Faith Apparel Co.</h1>
          <p className="text-gray-600">Pop-Up Order Display System</p>
        </div>
        <span className="rounded-full bg-green-100 px-4 py-1.5 text-xs font-bold text-green-800">
          ● REALTIME CONNECTED
        </span>
      </header>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
        {columns.map((col) => {
          const colOrders = orders.filter((o) => o.status === col.status);

          return (
            <div
              key={col.status}
              className={`flex flex-col rounded-2xl border ${col.borderColor} ${col.bgTint} p-4 shadow-sm`}
            >
              {/* Column Header */}
              <div className="mb-4 flex items-center justify-between border-b border-gray-200/60 pb-3">
                <h2 className="text-lg font-bold tracking-tight text-gray-900">
                  {col.label}
                </h2>
                <span
                  className={`rounded-full px-3 py-0.5 text-xs font-bold ${col.badgeBg} ${col.badgeText}`}
                >
                  {colOrders.length}
                </span>
              </div>

              {/* Order Cards Container */}
              <div className="flex-1 space-y-4 overflow-y-auto">
                {colOrders.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <span className="text-2xl font-black text-black">
                        #{order.order_number}
                      </span>
                      <span className="text-sm font-semibold text-gray-700">
                        {order.customer_name}
                      </span>
                    </div>

                    {/* Order Items */}
                    <div className="my-3 space-y-2">
                      {order.order_items?.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-lg bg-gray-50 p-3 text-sm border border-gray-100"
                        >
                          <p className="font-bold text-gray-900">
                            Design #{item.design} — {item.garment}
                          </p>
                          <p className="mt-1 text-gray-600">
                            Size: <span className="font-bold text-black">{item.size}</span> | Qty: <span className="font-bold text-black">{item.quantity}</span>
                          </p>
                        </div>
                      ))}
                    </div>

                    {order.notes && (
                      <p className="mb-3 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900 border border-amber-200">
                        <strong>Note:</strong> {order.notes}
                      </p>
                    )}

                    {/* Stage Buttons */}
                    <div className="mt-4">
                      {col.status === "WAITING" && (
                        <button
                          onClick={() => updateStatus(order.id, "PRESSING")}
                          className="w-full rounded-xl bg-black p-3 font-bold text-white transition hover:bg-gray-800"
                        >
                          START PRESSING ➔
                        </button>
                      )}
                      {col.status === "PRESSING" && (
                        <button
                          onClick={() => updateStatus(order.id, "READY")}
                          className="w-full rounded-xl bg-black p-3 font-bold text-white transition hover:bg-gray-800"
                        >
                          MARK READY ➔
                        </button>
                      )}
                      {col.status === "READY" && (
                        <button
                          onClick={() => updateStatus(order.id, "PICKED_UP")}
                          className="w-full rounded-xl bg-gray-200 p-3 font-bold text-gray-800 transition hover:bg-gray-300"
                        >
                          MARK PICKED UP ✓
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {colOrders.length === 0 && (
                  <p className="py-10 text-center text-sm italic text-gray-400">
                    No orders
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}