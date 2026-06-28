"use client";

// Placeholder shells for the Marketing panel. Real functionality lands in
// follow-up tasks: blog/SEO editor, leads list, and the Instagram studio
// (content generator + caption generator + content planner).

function Placeholder({
  title,
  desc,
}: {
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
      <p className="text-lg font-semibold text-[#1B2A4A]">{title}</p>
      <p className="mt-2 text-sm text-gray-500">{desc}</p>
      <span className="mt-4 inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">
        Segera hadir
      </span>
    </div>
  );
}

export function BlogView() {
  return (
    <Placeholder
      title="Blog & SEO"
      desc="Kelola artikel blog dan konten SEO."
    />
  );
}

export function InstagramStudioView() {
  return (
    <Placeholder
      title="Instagram Studio"
      desc="Generator konten, caption, dan perencana posting video & foto."
    />
  );
}
