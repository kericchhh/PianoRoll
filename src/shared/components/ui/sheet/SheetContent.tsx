import type { ComponentProps } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Dialog as SheetPrimitive } from 'radix-ui';
import { cn } from '@/shared/utils/cn';
import { usePrefersReducedMotion } from '@/shared/hooks/usePrefersReducedMotion';

type Props = Omit<ComponentProps<typeof SheetPrimitive.Content>, 'asChild'> & {
    open: boolean;
};

export function SheetContent({ open, className, children, ...props }: Props) {
    const reducedMotion = usePrefersReducedMotion();
    const transition = {
        duration: reducedMotion ? 0 : 0.2,
        ease: 'easeOut' as const,
    };

    return (
        <AnimatePresence>
            {open && (
                <SheetPrimitive.Portal key="sheet" forceMount>
                    <SheetPrimitive.Overlay asChild forceMount>
                        <motion.div
                            data-slot="sheet-overlay"
                            className="fixed inset-0 z-50 bg-black/60"
                            initial={{ opacity: reducedMotion ? 1 : 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={transition}
                        />
                    </SheetPrimitive.Overlay>
                    <SheetPrimitive.Content asChild forceMount {...props}>
                        <motion.div
                            data-slot="sheet-content"
                            className={cn(
                                'fixed inset-y-0 left-0 z-50 flex w-80 max-w-full flex-col overflow-y-auto border-r-2 border-border bg-secondary text-foreground',
                                className,
                            )}
                            initial={{ x: reducedMotion ? 0 : '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: reducedMotion ? 0 : '-100%' }}
                            transition={transition}
                        >
                            {children}
                        </motion.div>
                    </SheetPrimitive.Content>
                </SheetPrimitive.Portal>
            )}
        </AnimatePresence>
    );
}
