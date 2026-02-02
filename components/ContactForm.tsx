"use client";

import { useState } from "react";

export default function ContactForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("success");
      form.reset();
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-5">
      <div>
        <label className="block text-sm text-zinc-700 dark:text-zinc-300">Name</label>
        <input name="name" required className="focus-accent mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100" />
      </div>
      <div>
        <label className="block text-sm text-zinc-700 dark:text-zinc-300">Email</label>
        <input type="email" name="email" required className="focus-accent mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100" />
      </div>
      <div>
        <label className="block text-sm text-zinc-700 dark:text-zinc-300">Message</label>
        <textarea name="message" required rows={5} className="focus-accent mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100" />
      </div>
      <button disabled={status === "loading"} className="focus-accent inline-flex items-center justify-center rounded-full bg-zinc-900 px-5 py-2 text-sm text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200">
        {status === "loading" ? "Sending…" : "Send Message"}
      </button>
      {status === "success" && (
        <p className="text-sm text-emerald-600">Thanks! Your message was sent.</p>
      )}
      {status === "error" && error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </form>
  );
}
