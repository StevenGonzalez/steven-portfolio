"use client";

/** Opens the browser's print dialog, where the résumé can be printed or saved as a PDF. */
export default function PrintButton() {
  return (
    <button type="button" className="quiet-btn print-btn" onClick={() => window.print()}>
      Print or save as PDF
    </button>
  );
}
