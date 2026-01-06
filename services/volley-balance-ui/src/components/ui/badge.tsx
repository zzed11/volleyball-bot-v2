import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // Position badges
        setter: "border-transparent bg-volleyball-orange text-accent-foreground",
        outside_hitter: "border-transparent bg-volleyball-navy text-primary-foreground",
        middle_blocker: "border-transparent bg-team-c text-primary-foreground",
        opposite: "border-transparent bg-volleyball-warning text-foreground",
        libero: "border-transparent bg-volleyball-navy-light text-primary-foreground",
        universal: "border-transparent bg-muted text-muted-foreground",
        // Gender badges
        male: "border-transparent bg-volleyball-navy/20 text-volleyball-navy",
        female: "border-transparent bg-volleyball-orange/20 text-volleyball-orange",
        // Team badges
        teamA: "border-transparent bg-team-a text-primary-foreground",
        teamB: "border-transparent bg-team-b text-accent-foreground",
        teamC: "border-transparent bg-team-c text-primary-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
