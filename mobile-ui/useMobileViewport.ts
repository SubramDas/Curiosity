import { useEffect, useState } from "react";

/** Follow the visible browser area so the keyboard cannot cover the composer. */
export function useMobileViewport() {
  const [viewport, setViewport] = useState({
    height: window.innerHeight,
    top: 0,
    keyboardOpen: false,
  });
  useEffect(() => {
    const visible = window.visualViewport;
    function update() {
      const height = visible?.height ?? window.innerHeight;
      const focused = document.activeElement;
      const editing =
        focused instanceof HTMLInputElement ||
        focused instanceof HTMLTextAreaElement;
      setViewport({
        height,
        top: visible?.offsetTop ?? 0,
        keyboardOpen: editing && window.innerHeight - height > 120,
      });
    }
    update();
    visible?.addEventListener("resize", update);
    visible?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    return () => {
      visible?.removeEventListener("resize", update);
      visible?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
    };
  }, []);
  return viewport;
}
