"use client";

import DocumentLibraryView from "@/components/admin/views/DocumentLibraryView";
import BrochureBuilderView, {
  type BrochureDraft,
} from "@/components/admin/views/BrochureBuilderView";
import {
  DEFAULT_FLEET,
  DEFAULT_META,
  DEFAULT_NOTES,
} from "@/lib/admin/brochure";

export default function BrochureLibraryView() {
  return (
    <DocumentLibraryView<BrochureDraft>
      kind="brochure"
      heading="Brosur"
      description="Brosur tersimpan. Buka untuk lanjut menyunting, atau buat baru."
      newLabel="+ Brosur baru"
      emptyLabel="Belum ada brosur tersimpan."
      createDraft={() => ({
        meta: DEFAULT_META,
        cities: [],
        fleet: DEFAULT_FLEET,
        hotels: [],
        attractions: [],
        notes: DEFAULT_NOTES,
        libraryId: null,
      })}
      renderBuilder={(id, onExit) => (
        <BrochureBuilderView templateId={id} onExit={onExit} />
      )}
    />
  );
}
