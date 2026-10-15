import type { ComponentProps } from 'react';
import { Popover as PopoverPrimitive } from 'radix-ui';
import { motion } from 'motion/react';
import { cn } from '@/shared/utils/cn';
import { usePrefersReducedMotion } from '@/shared/hooks/usePrefersReducedMotion';

type Props = Omit<ComponentProps<typeof PopoverPrimitive.Content>, 'asChild'>;

export function PopoverContent({ className, children, ...props }: Props) {
    const reducedMotion = usePrefersReducedMotion();
    return (
        <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content asChild {...props}>
                <motion.div
                    data-slot="popover-content"
                    className={cn(
                        'z-50 max-h-(--radix-popover-content-available-height) w-80 max-w-[calc(100vw-24px)] overflow-y-auto border-2 border-border bg-popover p-4 text-popover-foreground focus-visible:outline-2 focus-visible:outline-ring',
                        className,
                    )}
                    initial={{
                        opacity: reducedMotion ? 1 : 0,
                        y: reducedMotion ? 0 : 4,
                    }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                        duration: reducedMotion ? 0 : 0.12,
                        ease: 'easeOut',
                    }}
                >
                    {children}
                </motion.div>
            </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
    );
}
