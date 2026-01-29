export const metadata = {
  title: "Contact | Steven",
  description: "Get in touch via the contact form.",
};
import ContactForm from "../../components/ContactForm";

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Contact</h1>
      <p className="mt-3 max-w-2xl text-zinc-600 dark:text-zinc-400">Leave a note and I’ll get back to you.</p>
      <div className="mt-6 max-w-2xl">
        <ContactForm />
      </div>
    </div>
  );
}
