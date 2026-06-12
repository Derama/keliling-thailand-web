import type { Metadata } from "next";
import BlogIndexContent from "@/components/BlogIndexContent";
import { getAllPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Tips & Itinerary Thailand",
  description:
    "Panduan, itinerary, dan tips liburan Thailand untuk rombongan Indonesia — ditulis dari pengalaman tim Keliling Thailand di lapangan.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndexPage() {
  return <BlogIndexContent posts={getAllPosts()} />;
}
