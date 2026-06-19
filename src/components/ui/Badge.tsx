import { HTMLAttributes } from "react";
import { cn } from "./Button";

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "success"
    | "warning"
    | "danger"
    | "secondary"
    | "outline";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn("ui-badge", `ui-badge-${variant}`, className)}
      {...props}
    />
  );
}
