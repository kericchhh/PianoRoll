import type * as React from 'react';
import { cn } from '@/shared/utils/cn';

export function ContextMenuShortcut({
    className,
    ...props
}: React.ComponentProps<'span'>) {
    return (
        <span
            data-slot="context-menu-shortcut"
            className={cn(
                'ml-auto text-xs tracking-widest text-muted-foreground',
                className,
            )}
            {...props}
        />
    );
}
