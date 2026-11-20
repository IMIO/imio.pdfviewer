import { useEffect, useRef, useState } from "react";

// The smallest zone side, in points. A smaller drag adds no zone.
const MIN_SIZE = 10;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

// The box between two points.
const boxOf = (start, end) => ({
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
});

// CSS position of a box in points, at the scale of the page.
const place = (box, scale) => ({
    left: box.x * scale,
    top: box.y * scale,
    width: box.width * scale,
    height: box.height * scale,
});

const round = (value) => Math.round(value * 100) / 100;

// The signature zones of one page, above the text layer. In draw mode, a
// pointer drag on the page adds a zone.
const ZoneLayer = ({ number, size, scale, zones, drawing, onAdd, onRemove, t }) => {
    const layerRef = useRef(null);
    const startRef = useRef(null);
    const [draft, setDraft] = useState(null);

    // In draw mode, the viewer does not get the touches of this page:
    // no pinch zoom and no double tap.
    useEffect(() => {
        const layer = layerRef.current;
        if (!drawing || !layer) {
            return undefined;
        }
        const stop = (event) => event.stopPropagation();
        const types = ["touchstart", "touchmove", "touchend", "touchcancel"];
        types.forEach((type) => layer.addEventListener(type, stop));
        return () => types.forEach((type) => layer.removeEventListener(type, stop));
    }, [drawing]);

    // The point of the event in points from the top-left corner of the page.
    const pointOf = (event) => {
        const rect = layerRef.current.getBoundingClientRect();
        return {
            x: clamp((event.clientX - rect.left) / scale, 0, size.width),
            y: clamp((event.clientY - rect.top) / scale, 0, size.height),
        };
    };

    const onPointerDown = (event) => {
        if (!drawing || event.button !== 0) {
            return;
        }
        // No text selection and no scroll.
        event.preventDefault();
        try {
            event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
            // A synthetic event has no active pointer. The drag still works on the page.
        }
        startRef.current = pointOf(event);
        setDraft(boxOf(startRef.current, startRef.current));
    };

    const onPointerMove = (event) => {
        if (startRef.current) {
            setDraft(boxOf(startRef.current, pointOf(event)));
        }
    };

    const onPointerUp = (event) => {
        if (!startRef.current) {
            return;
        }
        const box = boxOf(startRef.current, pointOf(event));
        startRef.current = null;
        setDraft(null);
        if (box.width >= MIN_SIZE && box.height >= MIN_SIZE) {
            onAdd({ page: number, ...box });
        }
    };

    const onPointerCancel = () => {
        startRef.current = null;
        setDraft(null);
    };

    return (
        <div
            ref={layerRef}
            className={["pdf-viewer-zones", drawing && "pdf-viewer-zones-drawing"]
                .filter(Boolean)
                .join(" ")}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
        >
            {zones.map((zone) => (
                <div
                    key={zone.key}
                    className="pdf-viewer-zone"
                    style={place(zone, scale)}
                    data-tag-id={zone.id}
                    data-x={round(zone.x)}
                    data-y={round(zone.y)}
                    data-width={Math.round(zone.width)}
                    data-height={Math.round(zone.height)}
                >
                    <span className="pdf-viewer-zone-label">
                        {zone.id} {Math.round(zone.width)}×{Math.round(zone.height)}
                    </span>
                    <button
                        type="button"
                        className="pdf-viewer-zone-remove"
                        aria-label={t("Remove the zone ${id}", { id: zone.id })}
                        title={t("Remove the zone ${id}", { id: zone.id })}
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={() => onRemove(zone.key)}
                    >
                        ×
                    </button>
                </div>
            ))}
            {draft && (
                <div className="pdf-viewer-zone pdf-viewer-zone-draft" style={place(draft, scale)} />
            )}
        </div>
    );
};

export default ZoneLayer;
