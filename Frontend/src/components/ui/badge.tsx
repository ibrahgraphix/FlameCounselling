import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[linear-gradient(135deg,#1e3a8a_0%,#3b82f6_100%)] text-white hover:opacity-90 dark:bg-[linear-gradient(135deg,#1e3a8a_0%,#3b82f6_100%)] dark:text-white",
        secondary:
          "border-transparent bg-teal-300 text-teal-900 hover:bg-teal-400 dark:bg-teal-700 dark:text-teal-100",
        destructive:
          "border-transparent bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:text-white",
        outline:
          "border border-gray-200 bg-transparent text-gray-700 dark:border-gray-600 dark:text-gray-300",
        success:
          "border-transparent bg-green-500 text-white hover:bg-green-600 dark:bg-green-500 dark:text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
