"use client";

import DocumentLibraryView from "@/components/admin/views/DocumentLibraryView";
import JobOrderBuilderView from "@/components/admin/views/JobOrderBuilderView";
import type { JobOrderData } from "@/lib/admin/jobOrder";

export default function JobOrderLibraryView() {
  return (
    <DocumentLibraryView<JobOrderData>
      kind="joborder"
      heading="Job Order"
      description="Job order tersimpan. Buka untuk lanjut menyunting, atau buat baru."
      newLabel="+ Job order baru"
      emptyLabel="Belum ada job order tersimpan."
      createDraft={() => ({}) as JobOrderData}
      renderBuilder={(id, onExit) => (
        <JobOrderBuilderView templateId={id} onExit={onExit} />
      )}
    />
  );
}
