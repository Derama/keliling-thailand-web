import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Rental", template: "%s | Rental Keliling Thailand" },
  robots: { index: false, follow: false },
};

export default function RentalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="min-h-screen w-full bg-gray-50">{children}</div>;
}
