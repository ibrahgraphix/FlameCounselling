import * as React from "react";
import { cn } from "@/lib/utils";
import { useDetectDarkMode } from "./card";

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => {
  const isDark = useDetectDarkMode();
  return (
    <div className="overflow-x-auto">
      <table
        ref={ref}
        className={cn(
          "w-full caption-bottom text-sm border",
          isDark
            ? "border-gray-600 text-gray-300"
            : "border-gray-200 text-gray-700",
          className
        )}
        {...props}
      />
    </div>
  );
});

Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => {
  const isDark = useDetectDarkMode();
  return (
    <thead
      ref={ref}
      className={cn(isDark ? "bg-gray-800" : "bg-white", className)}
      {...props}
    />
  );
});

TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => {
  const isDark = useDetectDarkMode();
  return (
    <tbody
      ref={ref}
      className={cn(
        "divide-y",
        isDark ? "divide-gray-600" : "divide-gray-200",
        className
      )}
      {...props}
    />
  );
});

TableBody.displayName = "TableBody";

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => {
  const isDark = useDetectDarkMode();
  return (
    <tr
      ref={ref}
      className={cn(
        isDark ? "hover:bg-gray-700" : "hover:bg-gray-50",
        className
      )}
      {...props}
    />
  );
});

TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => {
  const isDark = useDetectDarkMode();
  return (
    <th
      ref={ref}
      className={cn(
        "h-12 px-4 text-left align-middle font-medium",
        isDark ? "text-gray-300" : "text-gray-700",
        "[&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  );
});

TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => {
  const isDark = useDetectDarkMode();
  return (
    <td
      ref={ref}
      className={cn(
        "px-4 py-2 align-middle",
        isDark ? "text-gray-300" : "text-gray-700",
        className
      )}
      {...props}
    />
  );
});

TableCell.displayName = "TableCell";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => {
  const isDark = useDetectDarkMode();
  return (
    <tfoot
      ref={ref}
      className={cn(isDark ? "bg-gray-800" : "bg-white", className)}
      {...props}
    />
  );
});

TableFooter.displayName = "TableFooter";

export {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableFooter,
};
