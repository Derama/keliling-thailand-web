"use client";

import DocumentLibraryView from "@/components/admin/views/DocumentLibraryView";
import InvoiceBuilderView, {
  type InvoiceDraft,
} from "@/components/admin/views/InvoiceBuilderView";

export default function InvoiceLibraryView() {
  return (
    <DocumentLibraryView<InvoiceDraft>
      kind="invoice"
      heading="Invoice"
      description="Invoice tersimpan. Buka untuk lanjut menyunting, atau buat baru."
      newLabel="+ Invoice baru"
      emptyLabel="Belum ada invoice tersimpan."
      createDraft={() => ({}) as InvoiceDraft}
      renderBuilder={(id, onExit) => (
        <InvoiceBuilderView templateId={id} onExit={onExit} />
      )}
    />
  );
}
