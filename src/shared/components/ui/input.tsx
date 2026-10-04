import * as React from 'react';
import { cn } from '@/shared/utils/cn';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-9 w-full min-w-0 border-0 border-b-2 border-input bg-background px-3 py-1 text-base tabular-nums transition-colors duration-100 outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-bold file:text-foreground placeholder:text-muted-foreground hover:border-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40 md:text-sm',
        'focus-visible:border-ring aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
