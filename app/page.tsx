import Link from "next/link";

// Temporary shell — replaced with the full homepage in Task 3.
export default function Home() {
  return (
    <section className="min-h-[60vh] flex flex-col items-center justify-center gap-4 pt-16">
      <h1 className="text-3xl font-extrabold text-[#1B2A4A]">Keliling Thailand</h1>
      <Link href="/tours" className="underline text-[#1B2A4A]">
        Tours
      </Link>
    </section>
  );
}
