import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import type React from "react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-gray-700 group-[.toaster]:border-gray-200 group-[.toaster]:shadow-lg dark:group-[.toaster]:bg-gray-800 dark:group-[.toaster]:text-gray-300 dark:group-[.toaster]:border-gray-600",
          description:
            "group-[.toast]:text-gray-600/80 dark:group-[.toast]:text-gray-400/80",
          actionButton:
            "group-[.toast]:bg-[linear-gradient(135deg,#1e3a8a_0%,#3b82f6_100%)] group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-teal-300 group-[.toast]:text-teal-900 dark:group-[.toast]:bg-teal-700 dark:group-[.toast]:text-teal-100",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
