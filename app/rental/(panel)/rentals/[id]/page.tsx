import RentalDetail from "@/components/rental/RentalDetail";

export default async function RentalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RentalDetail rentalId={id} />;
}
