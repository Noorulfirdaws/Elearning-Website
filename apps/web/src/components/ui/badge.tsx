import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        primary: 'border border-primary/20 bg-primary/10 text-primary',
        blue: 'border border-[hsl(var(--brand-blue)/0.2)] bg-[hsl(var(--brand-blue)/0.1)] text-brand-blue',
        outline: 'border border-border text-foreground/70',
        muted: 'bg-secondary text-secondary-foreground',
      },
    },
    defaultVariants: { variant: 'primary' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
