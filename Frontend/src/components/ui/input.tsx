import * as React from "react";
import { cn } from "@/lib/utils";
import { useDetectDarkMode } from "./card";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    const isDark = useDetectDarkMode();
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border px-3 py-2 text-base placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          isDark
            ? "border-gray-600 bg-gray-800 text-gray-300 focus-visible:ring-teal-500"
            : "border-gray-200 bg-white text-gray-700 focus-visible:ring-teal-500",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input };
