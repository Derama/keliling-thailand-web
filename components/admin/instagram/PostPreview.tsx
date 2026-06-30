"use client";

import { forwardRef } from "react";
import { FORMAT_SIZES, type PostData, type PostFormat, type TemplateId } from "@/lib/admin/instagram";
import { TEMPLATES } from "@/components/admin/instagram/templates";

/**
 * Renders the active template at full 1080px size inside a scaled wrapper.
 * The forwarded ref points at the FULL-SIZE node so export captures 1080px.
 */
const PostPreview = forwardRef<
  HTMLDivElement,
  { data: PostData; format: PostFormat; templateId: TemplateId; maxWidth?: number }
>(function PostPreview({ data, format, templateId, maxWidth = 360 }, ref) {
  const { w, h } = FORMAT_SIZES[format];
  const scale = maxWidth / w;
  const { Component } = TEMPLATES[templateId];
  return (
    <div style={{ width: maxWidth, height: h * scale }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: w, height: h }}>
        <div ref={ref}>
          <Component data={data} format={format} />
        </div>
      </div>
    </div>
  );
});

export default PostPreview;
