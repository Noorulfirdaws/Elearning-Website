import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Bouton — Design System NoorAcademie.
 * Coins arrondis, ombres douces, transitions premium, micro-interaction au clic.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold rounded-xl transition-all duration-300 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] select-none [&_svg]:size-[1.15em] [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground shadow-soft hover:shadow-glow hover:-translate-y-0.5',
        blue: 'bg-brand-blue text-white shadow-soft hover:shadow-glow-blue hover:-translate-y-0.5',
        outline:
          'border border-border bg-card text-foreground shadow-soft hover:bg-secondary hover:-translate-y-0.5',
        ghost: 'text-foreground/70 hover:text-foreground hover:bg-secondary',
        subtle: 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
        white:
          'bg-white text-slate-900 shadow-soft hover:shadow-card hover:-translate-y-0.5',
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        md: 'h-11 px-5 text-sm',
        lg: 'h-12 px-6 text-[15px]',
        xl: 'h-14 px-8 text-base',
        icon: 'h-11 w-11',
      },
      shape: {
        default: 'rounded-xl',
        pill: 'rounded-full',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md', shape: 'default' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, shape, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, shape }), className)}
      {...props}
    />
  )
);
Button.displayName = 'Button';

export { buttonVariants };
