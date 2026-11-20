import { useEffect, useState } from "react";
import { Page } from "react-pdf";
import ZoneLayer from "./ZoneLayer";
import { pageBox, renderPixelRatio } from "./zoom";

const pageNumber = (el) => Number(el.dataset.pageNumber);

// Numbers of the pages near the visible part of the viewport.
// Without IntersectionObserver, all the pages are near.
const useNearPages = (viewportRef, count) => {
    const [near, setNear] = useState(() => new Set());

    useEffect(() => {
        const viewport = viewportRef.current;
        // react-pdf also sets data-page-number on its page. Select the boxes only.
        const boxes = viewport ? [...viewport.querySelectorAll(".pdf-viewer-page")] : [];
        if (typeof IntersectionObserver === "undefined") {
            setNear(new Set(boxes.map(pageNumber)));
            return undefined;
        }
        const observer = new IntersectionObserver(
            (entries) =>
                setNear((previous) => {
                    const next = new Set(previous);
                    for (const entry of entries) {
                        if (entry.isIntersecting) {
                            next.add(pageNumber(entry.target));
                        } else {
                            next.delete(pageNumber(entry.target));
                        }
                    }
                    return next;
                }),
            // Render the pages up to one viewport height above and below.
            { root: viewport, rootMargin: "100% 0px" },
        );
        boxes.forEach((box) => observer.observe(box));
        return () => observer.disconnect();
    }, [viewportRef, count]);

    return near;
};

// The page boxes. A box has the size of its page, so the scroll bar is
// correct before the pages render. The "single" mode shows the current page only.
// With `tags`, a page without rotation shows its signature zones.
const Pages = ({ viewportRef, sizes, display, page, scale, rotation, tags = null }) => {
    const single = display === "single";
    const numbers = single ? [page] : sizes.map((size, index) => index + 1);
    const near = useNearPages(viewportRef, single ? 0 : sizes.length);

    return numbers.map((number) => {
        const size = sizes[number - 1];
        const { width, height } = pageBox(size, rotation, scale);
        return (
            <div
                key={number}
                className="pdf-viewer-page"
                data-page-number={number}
                style={{ width, height }}
            >
                {(single || near.has(number)) && (
                    <Page
                        pageNumber={number}
                        scale={scale}
                        rotate={(size.rotate + rotation) % 360}
                        devicePixelRatio={renderPixelRatio(
                            width,
                            height,
                            window.devicePixelRatio,
                        )}
                        loading=""
                    />
                )}
                {tags && rotation === 0 && size.rotate === 0 && (
                    <ZoneLayer
                        number={number}
                        size={size}
                        scale={scale}
                        zones={tags.zones.filter((zone) => zone.page === number)}
                        drawing={tags.drawing}
                        onAdd={tags.onAdd}
                        onRemove={tags.onRemove}
                        t={tags.t}
                    />
                )}
            </div>
        );
    });
};

export default Pages;
