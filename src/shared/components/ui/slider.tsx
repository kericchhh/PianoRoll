import type { ComponentProps } from 'react';
import { Slider as SliderPrimitive } from 'radix-ui';
import { cn } from '@/shared/utils/cn';

type Props = ComponentProps<typeof SliderPrimitive.Root> & {
    label: string;
    trackClassName?: string;
    rangeClassName?: string;
    thumbProps?: ComponentProps<typeof SliderPrimitive.Thumb>;
};

export function Slider({
    className,
    label,
    trackClassName,
    rangeClassName,
    thumbProps,
    ...props
}: Props) {
    return (
        <SliderPrimitive.Root
            data-slot="slider"
            className={cn(
                'relative flex w-full touch-none items-center select-none data-[orientation=vertical]:h-full data-[orientation=vertical]:w-5 data-[orientation=vertical]:flex-col',
                className,
            )}
            {...props}
        >
            <SliderPrimitive.Track
                className={cn(
                    'relative h-1 w-full grow bg-muted data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1',
                    trackClassName,
                )}
            >
                <SliderPrimitive.Range
                    className={cn(
                        'absolute bg-primary data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full',
                        rangeClassName,
                    )}
                />
            </SliderPrimitive.Track>
            <SliderPrimitive.Thumb
                aria-label={label}
                {...thumbProps}
                className={cn(
                    'block size-3 border border-foreground bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-40',
                    thumbProps?.className,
                )}
            />
        </SliderPrimitive.Root>
    );
}
