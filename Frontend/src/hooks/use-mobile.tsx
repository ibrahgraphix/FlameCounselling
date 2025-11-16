// src/hooks/use-mobile.tsx
import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * Returns true when window width is less than MOBILE_BREAKPOINT.
 * Initializes to false (safe for SSR/hydration) and updates on mount.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = React.useState<boolean>(false);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    // initial value on mount
    check();
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    // Prefer addEventListener if available
    const handler = () => check();
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", handler);
    } else if (typeof (mql as any).addListener === "function") {
      (mql as any).addListener(handler);
    }

    window.addEventListener("resize", handler);

    return () => {
      if (typeof mql.removeEventListener === "function") {
        mql.removeEventListener("change", handler);
      } else if (typeof (mql as any).removeListener === "function") {
        (mql as any).removeListener(handler);
      }
      window.removeEventListener("resize", handler);
    };
  }, []);

  return isMobile;
}

export default useIsMobile;
