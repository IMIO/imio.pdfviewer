import { useLayoutEffect, useState } from "react";

// A CSS length in pixels. A value that is not a number gives 0.
const px = (value) => parseFloat(value) || 0;

// Size of the content box of an element: without padding and scroll bar.
const measure = (el) => {
    const style = getComputedStyle(el);
    return {
        width: el.clientWidth - px(style.paddingLeft) - px(style.paddingRight),
        height: el.clientHeight - px(style.paddingTop) - px(style.paddingBottom),
    };
};

// Follow the content size of the element in `ref`.
export const useBoxSize = (ref) => {
    const [size, setSize] = useState({ width: 0, height: 0 });

    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) {
            return undefined;
        }
        const update = () => {
            const next = measure(el);
            setSize((previous) =>
                previous.width === next.width && previous.height === next.height
                    ? previous
                    : next,
            );
        };
        update();
        if (typeof ResizeObserver === "undefined") {
            return undefined;
        }
        const observer = new ResizeObserver(update);
        observer.observe(el);
        return () => observer.disconnect();
    }, [ref]);

    return size;
};
