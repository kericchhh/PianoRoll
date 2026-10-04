import { useEffect, useState, type RefObject } from 'react';

type Size = { width: number; height: number };

export function useElementSize(
  ref: RefObject<HTMLElement | null>,
  initial: Size,
) {
  const [size, setSize] = useState(initial);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const width = Math.floor(entry.contentRect.width);
      const height = Math.floor(entry.contentRect.height);
      if (width <= 0 || height <= 0) return;
      setSize((previous) =>
        previous.width === width && previous.height === height
          ? previous
          : { width, height },
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}
