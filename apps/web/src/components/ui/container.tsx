import * as React from 'react';
import { cn } from '@/lib/utils';

/** Conteneur centré, largeur max cohérente sur tout le site. */
export function Container({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8', className)}
      {...props}
    />
  );
}

/** Section verticale avec espacement généreux (design respirant). */
export function Section({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return <section className={cn('py-20 sm:py-28', className)} {...props} />;
}
