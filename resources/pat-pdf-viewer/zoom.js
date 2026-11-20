// Scales of the PDF viewer. At scale 1, one PDF point is one CSS pixel.

export const ZOOM_LEVELS = [
    0.25, 0.33, 0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4,
];
export const MIN_SCALE = ZOOM_LEVELS[0];
export const MAX_SCALE = ZOOM_LEVELS.at(-1);

// Mobile browsers refuse a canvas larger than 4096 x 4096 pixels.
const MAX_CANVAS_PIXELS = 4096 * 4096;
// Two scales closer than this are the same zoom level.
const TOLERANCE = 0.01;

export const clampScale = (scale) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));

// The first zoom level above the scale.
export const zoomIn = (scale) =>
    ZOOM_LEVELS.find((level) => level > scale + TOLERANCE) ?? Math.max(scale, MAX_SCALE);

// The first zoom level below the scale.
export const zoomOut = (scale) =>
    ZOOM_LEVELS.findLast((level) => level < scale - TOLERANCE) ??
    Math.min(scale, MIN_SCALE);

// Size in CSS pixels of a page, with its own rotation and the rotation of the viewer.
export const pageBox = (size, rotation, scale) => {
    const turned = (size.rotate + rotation) % 180 !== 0;
    return {
        width: (turned ? size.height : size.width) * scale,
        height: (turned ? size.width : size.height) * scale,
    };
};

// The page with the largest width after rotation.
export const widestPage = (sizes, rotation) =>
    sizes.reduce((widest, size) =>
        pageBox(size, rotation, 1).width > pageBox(widest, rotation, 1).width ? size : widest,
    );

// The scale that shows the full page width ("page-width") or the full page
// ("page-fit") in the box.
export const fitScale = (mode, size, rotation, box) => {
    if (!size || box.width <= 0 || box.height <= 0) {
        return 1;
    }
    const page = pageBox(size, rotation, 1);
    const byWidth = box.width / page.width;
    return mode === "page-width" ? byWidth : Math.min(byWidth, box.height / page.height);
};

// Pixel ratio of a canvas: the ratio of the device, lower when the canvas is too large.
export const renderPixelRatio = (width, height, deviceRatio = 1) =>
    Math.min(deviceRatio, Math.sqrt(MAX_CANVAS_PIXELS / Math.max(1, width * height)));
