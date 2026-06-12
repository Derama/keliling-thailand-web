"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageContext";
import type { BlogPostMeta } from "@/lib/blog";

const DATE_LOCALES = { id: "id-ID", en: "en-US", th: "th-TH" } as const;

export default function BlogIndexContent({ posts }: { posts: BlogPostMeta[] }) {
  const { t, language } = useLanguage();

  return (
    <main className="pt-16">
      <section className="bg-[#1B2A4A] text-white">
        <div className="max-w-6xl mx-auto px-4 py-14">
          <h1 className="text-3xl sm:text-4xl font-extrabold">{t.blog.title}</h1>
          <p className="text-white/80 mt-2 max-w-2xl">{t.blog.subtitle}</p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-12">
        {posts.length === 0 ? (
          <p className="text-gray-500">{t.blog.empty}</p>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col"
              >
                <div className="relative h-48">
                  <Image
                    src={post.cover}
                    alt={post.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  {post.category && (
                    <span className="absolute top-3 left-3 bg-[#F5C518] text-[#1B2A4A] text-xs font-bold px-3 py-1 rounded-full">
                      {post.category}
                    </span>
                  )}
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <p className="text-xs text-gray-500 mb-2">
                    {new Date(post.date).toLocaleDateString(DATE_LOCALES[language], {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <h2 className="font-bold text-[#1B2A4A] leading-snug mb-2">
                    {post.title}
                  </h2>
                  <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                    {post.description}
                  </p>
                  <span className="mt-auto text-sm font-semibold text-[#1B2A4A] group-hover:text-[#F5C518] transition-colors">
                    {t.blog.readMore} →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
