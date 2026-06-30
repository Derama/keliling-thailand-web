"use client";

import { useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { btnCls, ErrorNote } from "@/components/admin/ui";

type Job = {
  id: string;
  name: string;
  /** Original page count, set after the source PDF loads. */
  pages: number;
  status: "ready" | "trimming" | "done" | "error";
  error?: string;
  /** Trimmed result, held in memory until the admin downloads it. */
  blobUrl?: string;
  outName?: string;
};

function newId() {
  return Math.random().toString(36).slice(2);
}

function trimmedName(name: string) {
  return name;
}

/**
 * Upload one or more downloaded PDFs and strip the final page from each, then
 * download the result. Runs entirely in the browser via pdf-lib — nothing is
 * uploaded to a server. Used for documents whose last page prints blank or is
 * an unwanted trailing sheet.
 */
export default function PdfTrimmerView() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Source bytes are kept alongside each job in a map so trimming never needs
  // the original File again (the input is cleared after selection).
  const bytesRef = useRef<Map<string, ArrayBuffer>>(new Map());

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    const added: Job[] = [];
    for (const file of Array.from(files)) {
      const job: Job = { id: newId(), name: file.name, pages: 0, status: "ready" };
      try {
        const bytes = await file.arrayBuffer();
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        job.pages = doc.getPageCount();
        if (job.pages < 2) {
          job.status = "error";
          job.error = "PDF hanya 1 halaman — tidak bisa dipangkas.";
        } else {
          bytesRef.current.set(job.id, bytes);
        }
      } catch {
        job.status = "error";
        job.error = "Gagal membaca PDF (mungkin rusak atau terenkripsi).";
      }
      added.push(job);
    }
    setJobs((prev) => [...prev, ...added]);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function runTrim(job: Job) {
    const bytes = bytesRef.current.get(job.id);
    if (!bytes) return;
    setJobs((prev) =>
      prev.map((j) => (j.id === job.id ? { ...j, status: "trimming" } : j))
    );
    try {
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      doc.removePage(doc.getPageCount() - 1);
      const out = await doc.save();
      const blob = new Blob([out as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setJobs((prev) =>
        prev.map((j) =>
          j.id === job.id
            ? { ...j, status: "done", blobUrl: url, outName: trimmedName(j.name) }
            : j
        )
      );
    } catch {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === job.id
            ? { ...j, status: "error", error: "Gagal memangkas PDF." }
            : j
        )
      );
    }
  }

  function trimAll() {
    jobs.filter((j) => j.status === "ready").forEach(runTrim);
  }

  function remove(id: string) {
    const job = jobs.find((j) => j.id === id);
    if (job?.blobUrl) URL.revokeObjectURL(job.blobUrl);
    bytesRef.current.delete(id);
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }

  const pending = jobs.filter((j) => j.status === "ready").length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[#1B2A4A]">PDF Trimmer</h2>
        <p className="mt-1 text-sm text-gray-500">
          Unggah PDF yang sudah diunduh, lalu pangkas halaman terakhirnya. Diproses
          di browser — file tidak dikirim ke server.
        </p>
      </div>

      <ErrorNote message={error} />

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          onChange={(e) => addFiles(e.target.files)}
          className="block text-sm text-gray-600 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[#1B2A4A] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-[#27406b]"
        />
        {pending > 0 && (
          <button onClick={trimAll} className={btnCls}>
            Pangkas semua ({pending})
          </button>
        )}
      </div>

      {jobs.length > 0 && (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200">
          {jobs.map((job) => (
            <li
              key={job.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#1B2A4A]">
                  {job.name}
                </p>
                <p className="text-xs text-gray-500">
                  {job.status === "error"
                    ? job.error
                    : job.status === "done"
                      ? `${job.pages} → ${job.pages - 1} halaman`
                      : `${job.pages} halaman`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {job.status === "ready" && (
                  <button
                    onClick={() => runTrim(job)}
                    className="rounded-lg bg-[#F5C518] px-3 py-1.5 text-sm font-medium text-[#1B2A4A] hover:brightness-95"
                  >
                    Pangkas
                  </button>
                )}
                {job.status === "trimming" && (
                  <span className="text-sm text-gray-400">Memproses…</span>
                )}
                {job.status === "done" && job.blobUrl && (
                  <a
                    href={job.blobUrl}
                    download={job.outName}
                    className="rounded-lg bg-[#25D366] px-3 py-1.5 text-sm font-medium text-white hover:brightness-95"
                  >
                    Unduh
                  </a>
                )}
                <button
                  onClick={() => remove(job.id)}
                  className="rounded-lg px-2 py-1.5 text-sm text-gray-400 hover:text-red-600"
                  aria-label="Hapus"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
