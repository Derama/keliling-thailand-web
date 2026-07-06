import AgreementDoc from "@/components/rental/AgreementDoc";

export default async function RentalAgreementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AgreementDoc rentalId={id} />;
}
