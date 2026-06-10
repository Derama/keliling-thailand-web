import type { Metadata } from "next";
import TestimonyContent from "@/components/TestimonyContent";

export const metadata: Metadata = {
  title: "Testimoni",
  description: "Cerita nyata dari rombongan yang sudah jalan bersama Keliling Thailand.",
};

export default function TestimonyPage() {
  return <TestimonyContent />;
}
