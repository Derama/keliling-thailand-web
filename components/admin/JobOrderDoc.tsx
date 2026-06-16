"use client";

import { useState } from "react";
import {
  LOVE_BANGKOK,
  passengerRowCount,
  type JobOrderData,
} from "@/lib/admin/jobOrder";

// Love Bangkok brand colors (red + royal blue), matching their letterhead.
const NAVY = "#1C2E73";
const YELLOW = "#E2231A";

/** Plain <img> that falls back to a neutral bordered box if the file is missing. */
function AssetImg({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        className={`grid place-items-center rounded border border-dashed border-gray-300 text-[9px] text-gray-400 ${className ?? ""}`}
      >
        {alt}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- user-supplied asset with onError fallback
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

/** One labelled cell in the info grid: Thai label, English/ID label, value. */
function InfoCell({
  thai,
  en,
  value,
  className,
}: {
  thai: string;
  en: string;
  value?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-0.5 bg-white p-2 ${className ?? ""}`}>
      <span className="text-[11px] leading-tight text-gray-500">{thai}</span>
      <span className="text-[11px] font-semibold leading-tight text-[#1C2E73]">
        {en}
      </span>
      {value !== undefined && (
        <span className="mt-0.5 text-[12px] font-bold text-[#1C2E73]">
          {value || " "}
        </span>
      )}
    </div>
  );
}

export default function JobOrderDoc(data: JobOrderData) {
  const paxRows = passengerRowCount(data.totalPax);

  return (
    <div className="print-doc mx-auto max-w-3xl bg-white shadow-sm">
      {/* Header banner — Love Bangkok (licensed operator) */}
      <div
        className="flex items-center justify-between gap-4 px-6 py-4"
        style={{
          background: `linear-gradient(90deg, ${NAVY} 0%, ${NAVY} 60%, ${YELLOW} 100%)`,
        }}
      >
        <AssetImg
          src={LOVE_BANGKOK.logo}
          alt="Love Bangkok"
          className="h-16 w-16 shrink-0 rounded-full bg-white object-contain p-1"
        />
        <h1 className="text-right text-xl font-extrabold leading-tight tracking-wide text-white sm:text-2xl">
          ใบสั่งงานมัคคุเทศก์
        </h1>
      </div>

      <div className="space-y-4 px-6 py-5">
        {/* Job order no + date */}
        <div className="flex flex-wrap gap-x-10 gap-y-1 text-sm">
          <div>
            <span className="text-gray-500">ใบสั่งงานเลขที่ / Job Order No. </span>
            <span className="font-bold text-[#1C2E73]">
              {data.jobOrderNo || " "}
            </span>
          </div>
          <div>
            <span className="text-gray-500">วันที่ / Date </span>
            <span className="font-bold text-[#1C2E73]">
              {data.date || " "}
            </span>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-px bg-gray-300">
          <InfoCell thai="ชื่อบริษัทนำเที่ยว" en="Travel Agent" value={data.travelAgent} />
          <InfoCell thai="ผู้ติดต่อฉุกเฉิน" en="Emergency Contact" value={LOVE_BANGKOK.emergencyContact} />
          <InfoCell thai="ชื่อมัคคุเทศก์" en="Guide Name" value="" />
          <InfoCell thai="ใบอนุญาตเลขที่" en="License No." value={LOVE_BANGKOK.licenseNo} />
          <InfoCell thai="หมายเลขบัตรประชาชน" en="ID Card Number" value="" />
          <InfoCell thai="โทรศัพท์" en="Phone Number" value={LOVE_BANGKOK.phone} />
          <InfoCell thai="ป้ายรถทะเบียน" en="Car Register" value="" />
          <InfoCell thai="หมายเลขโทรศัพท์ด่วน" en="Urgent Call" value={LOVE_BANGKOK.urgentCall} />
          <InfoCell thai="เวลาเดินทางถึงประเทศไทย" en="Waktu Kedatangan" value="" />
          <InfoCell thai="โรงแรมในพัทยา" en="Hotel Pattaya" value={data.hotelPattaya} />
          <InfoCell thai="เวลาเดินทางกลับจากประเทศไทย" en="Waktu Kepulangan" value="" />
          <InfoCell thai="โรงแรมในกรุงเทพฯ" en="Hotel Bangkok" value={data.hotelBangkok} />
          <InfoCell thai="จำนวนผู้เข้าพัก" en="Total Pax" value={data.totalPax} />
          <InfoCell thai="ประเภทเตียง" en="Bed Type" value={data.bedType} />
        </div>

        {/* Itinerary table */}
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr style={{ backgroundColor: "#EEF2FA" }} className="text-[#1C2E73]">
              <th className="border border-gray-300 px-2 py-2 text-left font-semibold">
                วัน/เดือน/ปี<br />Date
              </th>
              <th className="border border-gray-300 px-2 py-2 text-left font-semibold">
                รายการนำเที่ยว<br />Itinerary
              </th>
              <th className="border border-gray-300 px-2 py-2 font-semibold">Lunch</th>
              <th className="border border-gray-300 px-2 py-2 font-semibold">Dinner</th>
              <th className="border border-gray-300 px-2 py-2 font-semibold">Hotel</th>
            </tr>
          </thead>
          <tbody>
            {data.days.map((d) => (
              <tr key={d.id}>
                <td className="border border-gray-300 px-2 py-2 text-center font-semibold">
                  {d.date || " "}
                </td>
                <td className="border border-gray-300 px-2 py-2">
                  {d.itinerary || " "}
                </td>
                <td className="border border-gray-300 px-2 py-2 text-center">
                  {d.lunch || " "}
                </td>
                <td className="border border-gray-300 px-2 py-2 text-center">
                  {d.dinner || " "}
                </td>
                <td className="border border-gray-300 px-2 py-2 text-center">
                  {d.hotel || " "}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Passenger table */}
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr style={{ backgroundColor: "#EEF2FA" }} className="text-[#1C2E73]">
              <th className="border border-gray-300 px-2 py-2 font-semibold">
                ลำดับ<br />No.
              </th>
              <th className="border border-gray-300 px-2 py-2 font-semibold">
                ชื่อ<br />Name
              </th>
              <th className="border border-gray-300 px-2 py-2 font-semibold">
                หมายเลขหนังสือเดินทาง<br />Passport
              </th>
              <th className="border border-gray-300 px-2 py-2 font-semibold">
                สัญชาติ<br />Nationality
              </th>
              <th className="border border-gray-300 px-2 py-2 font-semibold">
                หมายเหตุ<br />Remark
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: paxRows }, (_, i) => (
              <tr key={i}>
                <td className="border border-gray-300 px-2 py-3 text-center">
                  {i + 1}
                </td>
                <td className="border border-gray-300 px-2 py-3">&nbsp;</td>
                <td className="border border-gray-300 px-2 py-3">&nbsp;</td>
                <td className="border border-gray-300 px-2 py-3">&nbsp;</td>
                <td className="border border-gray-300 px-2 py-3">&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Signatures */}
        <div className="flex items-end justify-between gap-8 pt-6 text-sm">
          <div className="space-y-8">
            <div>
              <p className="text-gray-500">มัคคุเทศก์ลงนาม</p>
              <p className="font-semibold text-[#1C2E73]">Guide&apos;s Signature</p>
              <p className="mt-6 border-t border-dotted border-gray-400 pt-1">&nbsp;</p>
            </div>
            <div>
              <p className="text-gray-500">ผู้มีอำนาจลงนาม</p>
              <p className="font-semibold text-[#1C2E73]">Authorized Signature</p>
              <p className="mt-6 border-t border-dotted border-gray-400 pt-1">&nbsp;</p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-gray-500">ประทับตราบริษัท</p>
            <p className="font-semibold text-[#1C2E73]">Company&apos;s Seal</p>
            <AssetImg
              src={LOVE_BANGKOK.seal}
              alt="Company Seal"
              className="mt-2 h-24 w-24 object-contain"
            />
          </div>
        </div>
      </div>

      {/* Footer banner */}
      <div
        className="mt-2 space-y-0.5 px-6 py-4 text-[12px] text-white"
        style={{
          background: `linear-gradient(90deg, ${YELLOW} 0%, ${NAVY} 45%, ${NAVY} 100%)`,
        }}
      >
        <p className="font-bold">{LOVE_BANGKOK.footerPhone}</p>
        <p>{LOVE_BANGKOK.email}</p>
        <p className="text-white/85">{LOVE_BANGKOK.address}</p>
      </div>
    </div>
  );
}
