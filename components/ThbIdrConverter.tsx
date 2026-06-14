"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/LanguageContext";
import { convertThbToIdr } from "@/lib/currency";
import { waLink } from "@/lib/site";

type RateStatus = "loading" | "ready" | "unavailable";

export default function ThbIdrConverter() {
  const { language, t } = useLanguage();
  const copy = t.fleet.converter;
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState("");
  const [rateStatus, setRateStatus] = useState<RateStatus>("loading");
  const rateEdited = useRef(false);

  useEffect(() => {
    let active = true;

    fetch("/api/fx")
      .then((response) => (response.ok ? response.json() : { rate: null }))
      .then((data) => {
        if (!active) return;
        if (typeof data.rate !== "number") {
          setRateStatus("unavailable");
          return;
        }

        if (!rateEdited.current) {
          setRate(String(Math.round(data.rate * 100) / 100));
        }
        setRateStatus("ready");
      })
      .catch(() => {
        if (active) setRateStatus("unavailable");
      });

    return () => {
      active = false;
    };
  }, []);

  const converted = convertThbToIdr(Number(amount), Number(rate));
  const idrLocale = language === "id" ? "id-ID" : "en-US";
  const formattedResult =
    converted === null
      ? null
      : new Intl.NumberFormat(idrLocale, {
          style: "currency",
          currency: "IDR",
          maximumFractionDigits: 0,
        }).format(converted);

  const rateStatusText =
    rateStatus === "loading"
      ? copy.loadingRate
      : rateStatus === "ready"
        ? copy.suggestedRate
        : copy.unavailableRate;

  return (
    <section
      className="mx-auto mt-10 max-w-3xl rounded-2xl border border-[#1B2A4A]/15 bg-white p-6 text-center sm:p-8"
      aria-labelledby="thb-idr-converter"
    >
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B28716]">
        {copy.eyebrow}
      </p>
      <h2
        id="thb-idr-converter"
        className="mt-2 text-2xl font-extrabold text-[#1B2A4A] sm:text-3xl"
      >
        {copy.title}
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-600">
        {copy.subtitle}
      </p>

      <div className="mx-auto mt-6 grid max-w-2xl gap-4 sm:grid-cols-2">
        <label className="text-left">
          <span className="mb-2 block text-sm font-bold text-[#1B2A4A]">
            {copy.amountLabel}
          </span>
          <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-[#FEF9EC] focus-within:border-[#B28716] focus-within:ring-2 focus-within:ring-[#F5C518]/20">
            <span className="grid place-items-center px-4 font-bold text-[#B28716]">
              ฿
            </span>
            <input
              type="number"
              min="0"
              step="1"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder={copy.amountPlaceholder}
              className="min-w-0 flex-1 bg-transparent px-1 py-3 font-semibold text-[#1B2A4A] outline-none"
            />
          </div>
        </label>

        <label className="text-left">
          <span className="mb-2 block text-sm font-bold text-[#1B2A4A]">
            {copy.rateLabel}
          </span>
          <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-[#FEF9EC] focus-within:border-[#B28716] focus-within:ring-2 focus-within:ring-[#F5C518]/20">
            <span className="grid place-items-center px-3 text-xs font-bold text-[#1B2A4A]">
              IDR
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={rate}
              onChange={(event) => {
                rateEdited.current = true;
                setRate(event.target.value);
              }}
              placeholder={copy.ratePlaceholder}
              className="min-w-0 flex-1 bg-transparent px-1 py-3 font-semibold text-[#1B2A4A] outline-none"
            />
          </div>
          <span
            className={`mt-2 block text-xs ${
              rateStatus === "unavailable" ? "text-amber-700" : "text-gray-500"
            }`}
          >
            {rateStatusText}
          </span>
        </label>
      </div>

      <div className="mx-auto mt-6 max-w-2xl rounded-xl bg-[#1B2A4A] px-5 py-5 text-[#FEF9EC]">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#F5C518]">
          {copy.resultLabel}
        </p>
        {formattedResult ? (
          <output
            aria-live="polite"
            className="mt-2 block text-3xl font-extrabold tabular-nums"
          >
            {formattedResult}
          </output>
        ) : (
          <p className="mt-2 text-sm text-[#FEF9EC]/70">{copy.emptyResult}</p>
        )}
      </div>

      <p className="mx-auto mt-5 max-w-xl text-xs leading-5 text-gray-500">
        {copy.disclaimer}
      </p>
      <a
        href={waLink(copy.waMessage)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-6 py-3 text-sm font-extrabold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#1EAF54] hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#25D366]/25 active:translate-y-0"
      >
        <svg
          aria-hidden="true"
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12.04 2a9.84 9.84 0 0 0-8.4 14.96L2 22l5.18-1.61A9.97 9.97 0 1 0 12.04 2Zm0 17.95a8.1 8.1 0 0 1-4.13-1.13l-.3-.18-3.07.96 1-2.99-.2-.31a8.05 8.05 0 1 1 6.7 3.65Zm4.44-6.03c-.24-.12-1.44-.71-1.66-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2a7.25 7.25 0 0 1-1.34-1.66c-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.19-.47-.39-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.58.18 1.1.16 1.51.1.46-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z" />
        </svg>
        {copy.contactButton}
      </a>
    </section>
  );
}
