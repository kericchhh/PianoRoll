import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/utils/cn';
import { Slot } from 'radix-ui';

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 border border-transparent text-sm font-bold whitespace-nowrap transition-colors duration-100 outline-none disabled:pointer-events-none disabled:cursor-default disabled:text-muted-foreground disabled:opacity-40 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-foreground active:bg-accent',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-foreground active:bg-destructive/80',
        outline:
          'border-input bg-transparent text-foreground hover:border-foreground hover:bg-foreground hover:text-background active:bg-primary active:text-primary-foreground',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground active:bg-primary active:text-primary-foreground',
        ghost:
          'hover:bg-accent hover:text-accent-foreground active:bg-primary active:text-primary-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        xs: "h-6 gap-1 px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: 'h-8 gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 px-6 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-xs': "size-6 [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button };
