"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Customer, Order, OrderStatus } from "@/lib/admin/types";
import { ORDER_STATUSES, STATUS_LABELS, STATUS_COLORS } from "@/lib/admin/types";
import { Field, inputCls, btnCls, btnSecondaryCls, ErrorNote } from "@/components/admin/ui";
import DateField from "@/components/admin/DateField";
import PlaceAutocomplete from "@/components/admin/PlaceAutocomplete";
import ItineraryBuilderView from "@/components/admin/views/ItineraryBuilderView";
import CustomerSelect from "@/components/admin/CustomerSelect";
import InvoiceBuilderView from "@/components/admin/views/InvoiceBuilderView";
import JobOrderBuilderView from "@/components/admin/views/JobOrderBuilderView";

// Create-mode wizard: Detail → Itinerary → Invoice → Job Order. The order row is
// inserted when leaving step 0 so each builder has an id to attach its doc to.
const WIZARD_STEPS = ["Detail Order", "Itinerary", "Invoice", "Job Order"] as const;

interface Draft {
  customer_id: string;
  status: OrderStatus;
  trip_start: string;
  trip_end: string;
  pax: string;
  pickup_location: string;
  vehicle: string;
  driver_name: string;
  itinerary: string;
}

function toDraft(o: Order | null): Draft {
  return {
    customer_id: o?.customer_id ?? "",
    status: o?.status ?? "inquiry",
    trip_start: o?.trip_start ?? "",
    trip_end: o?.trip_end ?? "",
    pax: o?.pax != null ? String(o.pax) : "",
    pickup_location: o?.pickup_location ?? "",
    vehicle: o?.vehicle ?? "",
    driver_name: o?.driver_name ?? "",
    itinerary: o?.itinerary ?? "",
  };
}

export default function OrderForm({
  order,
  onSaved,
  onCreated,
  formId,
  hideSubmit = false,
}: {
  order: Order | null;
  /** Called after a successful update so the parent page can refetch. */
  onSaved?: () => void;
  /**
   * Called once the create wizard finishes. When provided (modal mode) the
   * parent closes the modal instead of the form routing to the order detail.
   */
  onCreated?: () => void;
  /** Edit mode: id on the <form> so a button elsewhere can submit it. */
  formId?: string;
  /** Edit mode: hide the built-in submit (the parent renders its own). */
  hideSubmit?: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => toDraft(order));
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [newCustomer, setNewCustomer] = useState(false);
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custCity, setCustCity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Create-mode only: builders need a saved order to attach docs to. Leaving the
  // detail step inserts the order and keeps its id here, so further steps target
  // the same row instead of duplicating.
  const [createdId, setCreatedId] = useState<string | null>(null);
  // Wizard position: 0 = detail, 1 = itinerary, 2 = invoice, 3 = job order.
  const [step, setStep] = useState(0);
  // Keep-alive: a builder step mounts the first time it's opened and then stays
  // mounted (just hidden) so stepping back shows the in-memory draft — not a
  // freshly reseeded builder that drops an unflushed library pick.
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set());
  // Navigate + mark the target visited in one go (no effect → no cascading render).
  function goToStep(n: number) {
    setStep(n);
    if (n >= 1)
      setVisitedSteps((prev) => (prev.has(n) ? prev : new Set(prev).add(n)));
  }
  const isCreate = !order;
  // The order id that builders + the final save should target.
  const activeId = order?.id ?? createdId;

  useEffect(() => {
    createClient()
      .from("customers")
      .select("*")
      .order("name")
      .then(({ data }) => setCustomers(data ?? []));
  }, []);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  // Resolve the customer id, creating a new customer first if needed. On a
  // fresh customer, flip the form to that customer so we never re-insert it.
  async function resolveCustomerId(
    supabase: ReturnType<typeof createClient>
  ): Promise<string | null> {
    if (newCustomer) {
      const { data, error } = await supabase
        .from("customers")
        .insert({
          name: custName,
          phone: custPhone || null,
          origin_city: custCity || null,
        })
        .select("id")
        .single();
      if (error) {
        setError(`Gagal membuat customer: ${error.message}`);
        return null;
      }
      setNewCustomer(false);
      set("customer_id", data.id);
      return data.id;
    }
    if (!draft.customer_id) {
      setError("Pilih customer atau buat baru.");
      return null;
    }
    return draft.customer_id;
  }

  function buildRow(customerId: string) {
    return {
      customer_id: customerId,
      status: draft.status,
      trip_start: draft.trip_start || null,
      trip_end: draft.trip_end || null,
      pax: draft.pax ? Number(draft.pax) : null,
      pickup_location: draft.pickup_location || null,
      vehicle: draft.vehicle || null,
      driver_name: draft.driver_name || null,
      itinerary: draft.itinerary || null,
    };
  }

  // Insert a new order, returning its id. order_number is assigned atomically by
  // a BEFORE INSERT trigger (assign_order_number) — see 007-doc-numbering.sql.
  async function createOrder(): Promise<string | null> {
    const supabase = createClient();
    const customerId = await resolveCustomerId(supabase);
    if (!customerId) return null;
    const { data, error } = await supabase
      .from("orders")
      .insert(buildRow(customerId))
      .select("id")
      .single();
    if (error) {
      setError(`Gagal membuat order: ${error.message}`);
      return null;
    }
    return data.id;
  }

  // Persist the detail step: update when the order already exists (e.g. the user
  // stepped back and edited), otherwise insert. Returns the active order id.
  async function commitDetails(): Promise<string | null> {
    setError(null);
    const supabase = createClient();
    if (activeId) {
      const customerId = await resolveCustomerId(supabase);
      if (!customerId) return null;
      const { error } = await supabase
        .from("orders")
        .update(buildRow(customerId))
        .eq("id", activeId);
      if (error) {
        setError(`Gagal menyimpan: ${error.message}`);
        return null;
      }
      return activeId;
    }
    const id = await createOrder();
    if (id) setCreatedId(id);
    return id;
  }

  // Detail "Lanjut": save the order, then advance to the itinerary step.
  async function nextFromDetail() {
    if (busy) return;
    setBusy(true);
    const id = await commitDetails();
    setBusy(false);
    if (id) goToStep(1);
  }

  // Finish the wizard from any builder step.
  function finishWizard() {
    if (onCreated) onCreated();
    else if (activeId) router.push(`/admin/orders/${activeId}`);
  }

  // Edit mode: a flat trip form that updates the existing order in place.
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId || busy) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const customerId = await resolveCustomerId(supabase);
    if (!customerId) {
      setBusy(false);
      return;
    }
    const { error } = await supabase
      .from("orders")
      .update(buildRow(customerId))
      .eq("id", activeId);
    setBusy(false);
    if (error) {
      setError(`Gagal menyimpan: ${error.message}`);
      return;
    }
    onSaved?.();
  }

  // ── Shared sections ───────────────────────────────────────────
  const customerSection = (
    <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="font-semibold text-[#1B2A4A]">Customer</h2>
      {!newCustomer ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
          <div className="flex-1">
            <Field label="Customer">
              <CustomerSelect
                value={draft.customer_id}
                customers={customers}
                onChange={(v) => set("customer_id", v)}
              />
            </Field>
          </div>
          <button
            type="button"
            onClick={() => setNewCustomer(true)}
            className="self-start text-sm font-medium text-blue-600 hover:underline sm:self-auto sm:pb-2"
          >
            + Customer baru
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Nama">
            <input
              required
              value={custName}
              onChange={(e) => setCustName(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="WhatsApp">
            <input
              value={custPhone}
              onChange={(e) => setCustPhone(e.target.value)}
              className={inputCls}
              placeholder="628…"
            />
          </Field>
          <Field label="Kota asal">
            <input
              value={custCity}
              onChange={(e) => setCustCity(e.target.value)}
              className={inputCls}
            />
          </Field>
          <button
            type="button"
            onClick={() => setNewCustomer(false)}
            className="text-left text-sm text-gray-500 hover:underline"
          >
            ← pilih customer lama
          </button>
        </div>
      )}
    </section>
  );

  const tripSection = (
    <section className="h-full space-y-3 rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="font-semibold text-[#1B2A4A]">Trip</h2>
      <Field label="Status">
        <div className="flex flex-wrap gap-2">
          {ORDER_STATUSES.map((s) => {
            const active = draft.status === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => set("status", s)}
                aria-pressed={active}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  active
                    ? `${STATUS_COLORS[s]} ring-2 ring-[#1B2A4A]/25`
                    : "bg-white text-gray-500 ring-1 ring-gray-200 hover:bg-gray-50 hover:text-gray-700"
                }`}
              >
                {STATUS_LABELS[s]}
              </button>
            );
          })}
        </div>
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Mulai">
          <DateField
            value={draft.trip_start}
            onChange={(v) => {
              set("trip_start", v);
              // Keep end ≥ start: bump an earlier end up to the new start.
              if (v && draft.trip_end && draft.trip_end < v) set("trip_end", v);
            }}
          />
        </Field>
        <Field label="Selesai">
          <DateField
            value={draft.trip_end}
            min={draft.trip_start || undefined}
            onChange={(v) => set("trip_end", v)}
          />
        </Field>
        <Field label="Jumlah pax">
          <input
            type="number"
            min="1"
            value={draft.pax}
            onChange={(e) => set("pax", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Lokasi jemput">
          <PlaceAutocomplete
            value={draft.pickup_location}
            onChange={(v) => set("pickup_location", v)}
            placeholder="Hotel, bandara, atau landmark…"
          />
        </Field>
        <Field label="Kendaraan">
          <input
            value={draft.vehicle}
            onChange={(e) => set("vehicle", e.target.value)}
            className={inputCls}
            placeholder="Van Commuter, dst."
          />
        </Field>
        <Field label="Nama sopir">
          <input
            value={draft.driver_name}
            onChange={(e) => set("driver_name", e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>
    </section>
  );

  // ── Edit mode: flat trip form ─────────────────────────────────
  if (!isCreate) {
    return (
      <form id={formId} onSubmit={onSubmit} className="h-full max-w-3xl space-y-6">
        {tripSection}
        <ErrorNote message={error} />
        {!hideSubmit && (
          <button type="submit" disabled={busy} className={btnCls}>
            {busy ? "Menyimpan…" : "Simpan perubahan"}
          </button>
        )}
      </form>
    );
  }

  // ── Create mode: wizard ───────────────────────────────────────
  const stepper = (
    <WizardStepper
      steps={WIZARD_STEPS}
      current={step}
      canJump={(i) => i === 0 || !!activeId}
      onJump={goToStep}
    />
  );

  // Detail step is a compact form — center it so it doesn't strand in the wide
  // modal. Builder steps fill the width (they need it for the live preview).
  if (step === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        {stepper}
        {customerSection}
        {tripSection}
        <ErrorNote message={error} />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={nextFromDetail}
            disabled={busy}
            className={`${btnCls} disabled:opacity-50`}
          >
            {busy ? "Menyimpan…" : "Lanjut → Itinerary"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {stepper}

      {step >= 1 && activeId && (
        <div className="space-y-5">
          {visitedSteps.has(1) && (
            <div className={step === 1 ? "" : "hidden"}>
              <ItineraryBuilderView orderId={activeId} />
            </div>
          )}
          {visitedSteps.has(2) && (
            <div className={step === 2 ? "" : "hidden"}>
              <InvoiceBuilderView orderId={activeId} />
            </div>
          )}
          {visitedSteps.has(3) && (
            <div className={step === 3 ? "" : "hidden"}>
              <JobOrderBuilderView orderId={activeId} />
            </div>
          )}

          <div className="no-print flex items-center justify-between gap-3 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={() => goToStep(step - 1)}
              className={btnSecondaryCls}
            >
              ← {WIZARD_STEPS[step - 1]}
            </button>
            <div className="flex items-center gap-3">
              {step < WIZARD_STEPS.length - 1 && (
                <button
                  type="button"
                  onClick={() => goToStep(step + 1)}
                  className={btnSecondaryCls}
                >
                  Lanjut → {WIZARD_STEPS[step + 1]}
                </button>
              )}
              <button type="button" onClick={finishWizard} className={btnCls}>
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Wizard step indicator ───────────────────────────────────────
function WizardStepper({
  steps,
  current,
  canJump,
  onJump,
}: {
  steps: readonly string[];
  current: number;
  canJump: (i: number) => boolean;
  onJump: (i: number) => void;
}) {
  return (
    <ol className="no-print flex flex-wrap items-center gap-2 text-sm">
      {steps.map((label, i) => {
        const active = i === current;
        const done = i < current;
        const jumpable = canJump(i);
        return (
          <li key={label} className="flex items-center gap-2">
            <button
              type="button"
              disabled={!jumpable}
              onClick={() => jumpable && onJump(i)}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 font-medium transition ${
                active
                  ? "bg-[#1B2A4A] text-white"
                  : done
                    ? "bg-[#1B2A4A]/10 text-[#1B2A4A] hover:bg-[#1B2A4A]/20"
                    : "text-gray-400"
              } ${jumpable ? "cursor-pointer" : "cursor-default"}`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                  active
                    ? "bg-[#F5C518] text-[#1B2A4A]"
                    : done
                      ? "bg-[#1B2A4A] text-white"
                      : "bg-gray-200 text-gray-500"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              {label}
            </button>
            {i < steps.length - 1 && (
              <span className="text-gray-300" aria-hidden>
                →
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
