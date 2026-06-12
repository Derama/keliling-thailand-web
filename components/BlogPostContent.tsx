"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageContext";
import { cityNames } from "@/lib/translations";
import { waLink, fillTemplate } from "@/lib/site";
import { cheapestPrice } from "@/lib/tours";
import type { BlogPostMeta } from "@/lib/blog";

const DATE_LOCALES = { id: "id-ID", en: "en-US", th: "th-TH" } as const;

// Post bodies are written in Indonesian only (the SEO audience); the
// surrounding chrome still follows the selected language.
export default function BlogPostContent({
  post,
  html,
}: {
  post: BlogPostMeta;
  html: string;
}) {
  const { t, language } = useLanguage();
  const waMessage = fillTemplate(t.blog.waMessage, { title: post.title });

  return (
    <main className="pt-16">
      <article className="max-w-3xl mx-auto px-4 py-10">
        <Link
          href="/blog"
          className="text-sm font-semibold text-gray-500 hover:text-[#1B2A4A]"
        >
          ← {t.blog.back}
        </Link>

        <header className="mt-4 mb-6">
          <div className="flex items-center gap-3 text-xs mb-3">
            {post.category && (
              <span className="bg-[#F5C518] text-[#1B2A4A] font-bold px-3 py-1 rounded-full">
                {post.category}
              </span>
            )}
            <time dateTime={post.date} className="text-gray-500">
              {new Date(post.date).toLocaleDateString(DATE_LOCALES[language], {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </time>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1B2A4A] leading-tight">
            {post.title}
          </h1>
        </header>

        {post.cover && (
          <div className="relative h-64 sm:h-96 rounded-2xl overflow-hidden mb-8">
            <Image
              src={post.cover}
              alt={post.title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>
        )}

        <div className="blog-prose" dangerouslySetInnerHTML={{ __html: html }} />

        {post.cities.length > 0 && (
          <aside className="mt-10">
            <h2 className="font-bold text-[#1B2A4A] mb-3">{t.blog.relatedTours}</h2>
            <div className="flex flex-wrap gap-3">
              {post.cities.map((cityId) => (
                <Link
                  key={cityId}
                  href={`/tours/${cityId}`}
                  className="rounded-full border-2 border-[#F5C518] px-4 py-2 text-sm font-semibold text-[#1B2A4A] hover:bg-[#F5C518]/10 transition-colors"
                >
                  {cityNames[cityId]}
                  {cheapestPrice(cityId) != null && (
                    <span className="text-gray-500 font-normal">
                      {" "}
                      · {t.common.from} {cheapestPrice(cityId)!.toLocaleString()}{" "}
                      {t.common.thb}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </aside>
        )}

        <div className="mt-12 rounded-2xl bg-[#1B2A4A] text-white p-8 text-center">
          <h2 className="text-xl font-bold">{t.blog.ctaTitle}</h2>
          <p className="text-white/80 mt-1 mb-5">{t.blog.ctaSubtitle}</p>
          <a
            href={waLink(waMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="whatsapp-btn justify-center"
          >
            {t.common.whatsapp}
          </a>
        </div>
      </article>
    </main>
  );
}
