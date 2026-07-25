'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface OrderItem {
  id: number;
  design: string;
  garment: string;
  size: string;
  quantity: number;
  price: number;
}

interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  created_at: string;
  status: string;
  order_items: OrderItem[];
}

export default function KDSPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadOrders() {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .neq('status', 'completed')
      .order('created_at', { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setOrders(data || []);
    setLoading(false);
  }


  useEffect(() => {

    loadOrders();


    const channel = supabase
      .channel('kds-orders')

      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },

        () => {
          loadOrders();
        }

      )

      .subscribe();


    return () => {
      supabase.removeChannel(channel);
    };

  }, []);


  async function updateStatus(
    id: number,
    status: string
  ) {

    await supabase
      .from('orders')
      .update({ status })
      .eq('id', id);


    loadOrders();

  }


  const columns = [
    {
      key: 'waiting',
      title: 'Waiting',
      button: 'START PRESSING',
      next: 'pressing',
      color: 'bg-red-600'
    },

    {
      key: 'pressing',
      title: 'Pressing',
      button: 'PACK IT UP',
      next: 'packing',
      color: 'bg-orange-500'
    },

    {
      key: 'packing',
      title: 'Packing',
      button: 'READY',
      next: 'ready',
      color: 'bg-yellow-500'
    },

    {
      key: 'ready',
      title: 'Ready',
      button: 'COMPLETE',
      next: 'completed',
      color: 'bg-green-600'
    }
  ];


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading KDS...
      </div>
    );
  }
      return (
      <div className="min-h-screen bg-[#FFC5D3] p-4 text-black">

        <div className="flex justify-between items-center mb-5">
          <h1 className="text-3xl font-bold">
            Front Porch Faith Apparel Co.
          </h1>

          <div className="bg-white rounded-lg px-4 py-2 shadow">
            Active Orders: {orders.length}
          </div>
        </div>


        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

          {columns.map((column) => {

            const columnOrders = orders.filter(
              (order) =>
                (order.status || "waiting").toLowerCase() === column.key
            );


            return (

              <div
                key={column.key}
                className="bg-white/40 rounded-xl overflow-hidden shadow"
              >

                <div
                  className={`${column.color} text-white font-bold p-3 flex justify-between`}
                >
                  <span>
                    {column.title}
                  </span>

                  <span>
                    {columnOrders.length}
                  </span>

                </div>


                <div className="p-3 space-y-4">

                  {columnOrders.length === 0 && (

                    <p className="text-center text-gray-500">
                      No orders
                    </p>

                  )}



                  {columnOrders.map((order) => (

                    <div
                      key={order.id}
                      className="bg-white rounded-lg shadow p-4"
                    >

                      <div className="flex justify-between border-b pb-2 mb-3">

                        <div>

                          <h2 className="font-bold text-xl">
                            Order #{order.order_number}
                          </h2>


                          <p className="font-bold text-sm">
                            {order.order_items?.reduce(
                              (total, item) =>
                                total + item.quantity,
                              0
                            )} ITEMS
                          </p>

                        </div>


                        <span className="text-sm text-gray-500">
                          {new Date(
                            order.created_at
                          ).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>

                      </div>



                      <div className="space-y-3">

                        {order.order_items?.map((item) => (

                          <div
                            key={item.id}
                            className="border-b pb-2"
                          >

                            <p className="font-bold text-lg">
                              Design #{item.design}
                            </p>


                            <p>
                              {item.garment}
                            </p>


                            <p>
                              Size: {item.size}
                            </p>


                            <p>
                              Quantity: {item.quantity}
                            </p>

                          </div>

                        ))}

                      </div>



                      <button
                        onClick={() =>
                          updateStatus(
                            order.id,
                            column.next
                          )
                        }

                        className={`mt-4 w-full rounded-lg ${column.color} text-white font-bold py-3`}
                      >

                        {column.button}

                      </button>


                    </div>

                  ))}


                </div>

              </div>

            );

          })}

        </div>

      </div>
    );
}