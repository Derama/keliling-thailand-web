"use client";

import Image from "next/image";
import { btnCls } from "@/components/admin/ui";

/** Branded A4-ish frame for printable docs with a no-print print button. */
export default function PrintDoc({
  title,
  docNumber,
  children,
}: {
  title: string;
  docNumber: string;
  children: React.ReactNode;
}) {
  return (
    <div className="print-doc mx-auto max-w-3xl space-y-6 rounded-xl bg-white p-8 shadow-sm">
      <div className="flex items-start justify-between border-b-4 border-[#F5C518] pb-4">
        <div className="flex items-center gap-3">
          <Image
            src="/Logo.png"
            alt="Keliling Thailand"
            width={56}
            height={43}
            priority
          />
          <div>
            <p className="text-xl font-bold text-[#1B2A4A]">Keliling Thailand</p>
            <p className="text-xs text-gray-500">
              Private tours &amp; vehicle charter — kelilingthailand.com
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-bold uppercase tracking-wide text-[#1B2A4A]">
            {title}
          </p>
          <p className="text-sm text-gray-600">{docNumber}</p>
        </div>
      </div>
      {children}
      <button onClick={() => window.print()} className={`${btnCls} no-print`}>
        Print / Simpan PDF
      </button>
    </div>
  );
}
