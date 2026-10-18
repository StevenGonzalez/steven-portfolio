/** A heading's text as the id its section is linked by: "Why lite mode didn't help" becomes
 *  "why-lite-mode-didnt-help". Letters and digits from any script are kept, other punctuation is dropped. */
export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}
