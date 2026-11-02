"use client";

import { useEffect, useState } from "react";

/** The world's sound switch, brought up to the bar once the world has scrolled out of view, where the hero's own Sound
 *  button can no longer be reached. It stands in for that button: it shows the same on or off, and a click on it is a
 *  click on that one, inside the same tap, which is what lets the browser start the sound. */
export default function SoundToggle() {
  const [shown, setShown] = useState(false);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const src = document.querySelector<HTMLButtonElement>(".hero .sound-btn"),
      hero = src?.closest(".hero");
    if (!src || !hero) return;
    const read = () => setOn(src.getAttribute("aria-pressed") === "true");
    read();
    const mo = new MutationObserver(read);
    mo.observe(src, { attributes: true, attributeFilter: ["aria-pressed"] });
    const io = new IntersectionObserver(([e]) => setShown(!e.isIntersecting));
    io.observe(hero);
    return () => {
      mo.disconnect();
      io.disconnect();
    };
  }, []);

  return (
    <button
      type="button"
      className={shown ? "sound-toggle shown" : "sound-toggle"}
      aria-label="Sound"
      aria-pressed={on}
      title={on ? "Sound on" : "Sound off"}
      onClick={() => document.querySelector<HTMLButtonElement>(".hero .sound-btn")?.click()}
    />
  );
}
