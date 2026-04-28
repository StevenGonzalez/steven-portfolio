import { Dispatch, MutableRefObject, SetStateAction, useEffect } from "react";
import { GameMode } from "./core";

type UseArcadeKeyboardControlsArgs = {
  setMode: Dispatch<SetStateAction<GameMode>>;
  modeRef: MutableRefObject<GameMode>;
  keysRef: MutableRefObject<Set<string>>;
  dashQueuedRef: MutableRefObject<boolean>;
};

const CONTROL_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "ShiftLeft", "ShiftRight"]);

export function useArcadeKeyboardControls({ setMode, modeRef, keysRef, dashQueuedRef }: UseArcadeKeyboardControlsArgs) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (CONTROL_KEYS.has(event.code)) {
        event.preventDefault();
      }
      if (event.code === "Space") {
        setMode((current) => (current === "running" ? "paused" : current === "paused" ? "running" : current));
        return;
      }
      if ((event.code === "ShiftLeft" || event.code === "ShiftRight") && !event.repeat && modeRef.current === "running") {
        dashQueuedRef.current = true;
      }
      keysRef.current.add(event.code);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      keysRef.current.delete(event.code);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [dashQueuedRef, keysRef, modeRef, setMode]);
}
