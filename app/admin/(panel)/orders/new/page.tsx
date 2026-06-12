import OrderForm from "@/components/admin/OrderForm";

export default function NewOrderPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-[#1B2A4A]">Order baru</h1>
      <OrderForm order={null} />
    </div>
  );
}
