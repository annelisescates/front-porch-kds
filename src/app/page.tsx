"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Home() {
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [design, setDesign] = useState("");
  const [garment, setGarment] = useState("");
  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState(1);

  const [items, setItems] = useState<any[]>([]);

  const prices: Record<string, number> = {
    "Comfort Colors Tee": 25,
    Crewneck: 35,
  };

  function addItem() {
    if (!design || !garment || !size) {
      alert("Please choose design, garment, and size.");
      return;
    }

    const newItem = {
      design,
      garment,
      size,
      quantity,
      price: prices[garment] * quantity,
    };

    setItems([...items, newItem]);

    setDesign("");
    setGarment("");
    setSize("");
    setQuantity(1);
  }

  function removeItem(index: number) {
    const updatedItems = items.filter((_, itemIndex) => itemIndex !== index);
    setItems(updatedItems);
  }

  const total = items.reduce((sum, item) => sum + item.price, 0);

  async function getNextOrderNumber() {
    const { data: event, error: fetchError } = await supabase
      .from("events")
      .select("*")
      .limit(1)
      .single();

    if (fetchError || !event) {
      alert(`Error fetching event: ${fetchError?.message || "No event found"}`);
      return null;
    }

    const currentNum = event.next_order_number ?? 1;
    const orderNumber = String(currentNum).padStart(3, "0");

    const { error: updateError } = await supabase
      .from("events")
      .update({ next_order_number: currentNum + 1 })
      .eq("id", event.id);

    if (updateError) {
      alert(`Error updating order counter: ${updateError.message}`);
      return null;
    }

    return {
      orderNumber,
      eventId: event.id,
    };
  }

  async function sendOrder() {
    setIsSubmitting(true);

    try {
      const orderInfo = await getNextOrderNumber();
      if (!orderInfo) {
        setIsSubmitting(false);
        return;
      }

      const { orderNumber, eventId } = orderInfo;

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          event_id: eventId,
          customer_name: customerName,
          phone: phone,
          notes: notes,
          total: total,
          payment_method: paymentMethod,
          status: "WAITING",
        })
        .select()
        .single();

      if (orderError) {
        alert(`Order creation failed: ${orderError.message}`);
        setIsSubmitting(false);
        return;
      }

      const orderItems = items.map((item) => ({
        order_id: order.id,
        design: item.design,
        garment: item.garment,
        size: item.size,
        quantity: item.quantity,
        price: item.price,
      }));

      const { error: itemError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemError) {
        alert(`Failed to save items: ${itemError.message}`);
        setIsSubmitting(false);
        return;
      }

      alert(`Order #${orderNumber} created!`);

      // Reset Form State
      setItems([]);
      setCustomerName("");
      setPhone("");
      setNotes("");
      setPaymentMethod("");
      setShowConfirmation(false);
    } catch (err: any) {
      alert(`Unexpected error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  function formatPhone(value: string) {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) {
      return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
    }
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
  }

  function handleOpenConfirmation() {
    if (!customerName) {
      alert("Please enter customer name.");
      return;
    }
    if (!phone) {
      alert("Please enter phone number.");
      return;
    }
    if (items.length === 0) {
      alert("Please add at least one item.");
      return;
    }
    if (!paymentMethod) {
      alert("Please select a payment method.");
      return;
    }
    setShowConfirmation(true);
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow">
        <h1 className="text-3xl font-bold">Front Porch Faith Apparel Co.</h1>
        <p className="mb-8 text-gray-600">Pop-Up Order System</p>

        {/* Customer Info */}
        <h2 className="mb-3 text-xl font-bold">Customer Information</h2>
        <input
          className="mb-3 w-full rounded border p-3"
          placeholder="Customer Name"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
        />
        <input
          className="mb-6 w-full rounded border p-3"
          placeholder="Phone Number"
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
        />

        {/* Add Item Form */}
        <h2 className="mb-3 text-xl font-bold">Add Item</h2>

        <p className="font-semibold">Design</p>
        <div className="mb-5 grid grid-cols-6 gap-2">
          {Array.from({ length: 11 }, (_, i) => (
            <button
              key={i}
              onClick={() => setDesign(String(i + 1))}
              className={`rounded p-3 ${
                design === String(i + 1)
                  ? "bg-black text-white"
                  : "bg-gray-200"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <p className="font-semibold">Garment</p>
        <div className="mb-5 grid grid-cols-2 gap-3">
          {Object.keys(prices).map((item) => (
            <button
              key={item}
              onClick={() => setGarment(item)}
              className={`rounded p-3 ${
                garment === item ? "bg-black text-white" : "bg-gray-200"
              }`}
            >
              {item}
              <br />${prices[item]}
            </button>
          ))}
        </div>

        <p className="font-semibold">Size</p>
        <div className="mb-5 grid grid-cols-7 gap-2">
          {["S", "M", "L", "XL", "2XL", "3XL", "4XL"].map((item) => (
            <button
              key={item}
              onClick={() => setSize(item)}
              className={`rounded p-3 ${
                size === item ? "bg-black text-white" : "bg-gray-200"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <p className="font-semibold">Quantity</p>
        <div className="mb-6 flex items-center gap-4">
          <button
            className="rounded bg-gray-200 px-4 py-2"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
          >
            -
          </button>
          <span>{quantity}</span>
          <button
            className="rounded bg-gray-200 px-4 py-2"
            onClick={() => setQuantity(quantity + 1)}
          >
            +
          </button>
        </div>

        <button
          onClick={addItem}
          className="mb-8 w-full rounded-xl bg-black p-4 font-bold text-white"
        >
          ADD ITEM
        </button>

        {/* Current Order Summary */}
        <h2 className="text-xl font-bold">Current Order</h2>
        {items.length === 0 ? (
          <p className="my-3 italic text-gray-500">No items added yet.</p>
        ) : (
          items.map((item, index) => (
            <div key={index} className="my-3 rounded bg-gray-100 p-4">
              <strong>Design #{item.design}</strong>
              <br />
              {item.garment}
              <br />
              Size: {item.size}
              <br />
              Qty: {item.quantity}
              <br />${item.price}
              <button
                onClick={() => removeItem(index)}
                className="mt-3 block rounded bg-red-500 px-4 py-2 text-white"
              >
                REMOVE
              </button>
            </div>
          ))
        )}

        <h2 className="mt-6 text-2xl font-bold">Total: ${total}</h2>

        <textarea
          className="mt-6 w-full rounded border p-3"
          placeholder="Order Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <h2 className="mt-6 text-xl font-bold">Payment Method</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            onClick={() => setPaymentMethod("Square")}
            className={`rounded p-4 font-bold ${
              paymentMethod === "Square"
                ? "bg-black text-white"
                : "bg-gray-200"
            }`}
          >
            Square
          </button>
          <button
            onClick={() => setPaymentMethod("Cash")}
            className={`rounded p-4 font-bold ${
              paymentMethod === "Cash" ? "bg-black text-white" : "bg-gray-200"
            }`}
          >
            Cash
          </button>
        </div>

        <button
          onClick={handleOpenConfirmation}
          className="mt-8 w-full rounded-xl bg-black p-4 text-lg font-bold text-white"
        >
          REVIEW & SEND ORDER
        </button>
      </div>

      {/* POP-UP MODAL OVERLAY */}
      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-2xl font-bold text-gray-900">Confirm Order</h2>
            <hr className="my-3" />

            <div className="space-y-2 text-gray-700">
              <p><strong>Customer:</strong> {customerName}</p>
              <p><strong>Phone:</strong> {phone}</p>
              <p>
                <strong>Items:</strong>{" "}
                {items.reduce((sum, item) => sum + item.quantity, 0)} items total
              </p>
              <p><strong>Payment:</strong> {paymentMethod}</p>
              <p className="text-xl font-bold text-black">
                <strong>Total:</strong> ${total}
              </p>
              {notes && (
                <p className="text-sm text-gray-500">
                  <strong>Notes:</strong> {notes}
                </p>
              )}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowConfirmation(false)}
                disabled={isSubmitting}
                className="rounded-xl bg-gray-200 p-3 font-bold text-gray-800 disabled:opacity-50"
              >
                CANCEL
              </button>
              <button
                onClick={sendOrder}
                disabled={isSubmitting}
                className="rounded-xl bg-black p-3 font-bold text-white disabled:opacity-50"
              >
                {isSubmitting ? "SENDING..." : "CONFIRM & SEND"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}