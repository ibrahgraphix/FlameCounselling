import * as React from "react";
import { cn } from "@/lib/utils";

const gradient = "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)";

function useDetectDarkMode() {
  const [isDark, setIsDark] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const htmlHasDark = document.documentElement.classList.contains("dark");
      if (htmlHasDark) return true;
      const ls = localStorage.getItem("theme");
      if (ls === "dark") return true;
      return false;
    } catch {
      return false;
    }
  });

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const update = () => {
      try {
        const htmlHasDark = document.documentElement.classList.contains("dark");
        const ls = localStorage.getItem("theme");
        setIsDark(Boolean(htmlHasDark || ls === "dark"));
      } catch {
        // ignore
      }
    };

    // watch for <html> class changes
    let mo: MutationObserver | null = null;
    try {
      mo = new MutationObserver(() => update());
      mo.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
    } catch {
      mo = null;
    }

    // listen for cross-tab localStorage changes
    const onStorage = (ev: StorageEvent) => {
      if (!ev) return;
      if (ev.key === "theme") update();
    };
    try {
      window.addEventListener("storage", onStorage);
    } catch {}

    // ensure initial sync
    update();

    return () => {
      try {
        if (mo) mo.disconnect();
      } catch {}
      try {
        window.removeEventListener("storage", onStorage);
      } catch {}
    };
  }, []);

  return isDark;
}

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { style?: React.CSSProperties }
>(({ className, style, children, ...props }, ref) => {
  const isDark = useDetectDarkMode();

  const borderRadius =
    (style && (style as React.CSSProperties).borderRadius) || "1rem";

  const base = cn(
    "rounded-2xl border shadow-md transition-all duration-200 overflow-hidden",
    isDark ? "text-gray-300 border-gray-600" : "text-gray-700 border-gray-200",
    className
  );

  // Use a two-layer background: [inner background], [gradient border]
  // plus a transparent border so the gradient shows. backgroundClip ensures
  // the inner background is clipped to padding-box and the gradient sits in border-box.
  const mergedStyle: React.CSSProperties = {
    borderRadius,
    overflow: "hidden",
    // First layer is the inner background, second layer is the gradient border.
    backgroundImage: isDark
      ? `linear-gradient( var(--inner-dark, #1f2937), var(--inner-dark, #1f2937) ), ${gradient}`
      : `linear-gradient( var(--inner-light, #ffffff), var(--inner-light, #ffffff) ), ${gradient}`,
    backgroundOrigin: "padding-box, border-box",
    backgroundClip: "padding-box, border-box",
    border: "1px solid transparent",
    // ensure callers can still override styles passed in
    ...(style as React.CSSProperties),
  };

  return (
    <div ref={ref} className={base} style={mergedStyle} {...props}>
      {children}
    </div>
  );
});
Card.displayName = "Card";

/** CardHeader */
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const isDark = useDetectDarkMode();
  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col space-y-1.5 p-6",
        isDark ? "text-gray-300" : "",
        className
      )}
      {...props}
    />
  );
});
CardHeader.displayName = "CardHeader";

/** CardTitle */
const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, style, ...props }, ref) => {
  const titleStyle: React.CSSProperties = {
    background: gradient,
    WebkitBackgroundClip: "text",
    color: "transparent",
    ...(style as React.CSSProperties),
  };
  return (
    <h3
      ref={ref}
      className={cn(
        "text-2xl font-semibold leading-none tracking-tight",
        className
      )}
      style={titleStyle}
      {...props}
    />
  );
});
CardTitle.displayName = "CardTitle";

/** CardDescription */
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const isDark = useDetectDarkMode();
  return (
    <p
      ref={ref}
      className={cn(
        "text-sm",
        isDark ? "text-gray-400" : "text-gray-600",
        className
      )}
      {...props}
    />
  );
});
CardDescription.displayName = "CardDescription";

/** CardContent */
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />;
});
CardContent.displayName = "CardContent";

/** CardFooter */
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const isDark = useDetectDarkMode();
  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center p-6 pt-0",
        isDark ? "text-gray-300" : "",
        className
      )}
      {...props}
    />
  );
});
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  useDetectDarkMode,
};
