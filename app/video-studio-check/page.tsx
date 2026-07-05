"use client";

// Temporary debug harness for VideoStudioView — no auth, no Supabase needed.
// Delete after verification.

import VideoStudioView from "@/components/admin/views/marketing/VideoStudioView";

export default function VideoStudioCheckPage() {
  return (
    <div className="mx-auto max-w-5xl p-6">
      <VideoStudioView />
    </div>
  );
}
