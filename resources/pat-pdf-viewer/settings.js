// Options of the PDF viewer. The built-in defaults come first, then the site
// settings, then the options of the pattern element.

// The optional buttons of the toolbar. The page buttons always show.
export const BUTTONS = ["download", "print", "rotate", "fit", "zoom", "fullscreen"];
export const DISPLAY_MODES = ["continuous", "single"];

export const DEFAULTS = {
    display: "continuous",
    buttons: BUTTONS,
};

// The server writes the site settings in this element of the page head.
const SETTINGS_ID = "imio-pdfviewer-settings";

export const readSiteSettings = (doc = document) => {
    const script = doc.getElementById(SETTINGS_ID);
    if (!script) {
        return {};
    }
    try {
        return JSON.parse(script.textContent) || {};
    } catch {
        return {};
    }
};

// A list from a JSON array or from a text like "download zoom" or "download, zoom".
const toList = (value) => {
    if (Array.isArray(value)) {
        return value;
    }
    if (typeof value === "string") {
        return value.split(/[\s,]+/).filter(Boolean);
    }
    return null;
};

// Keep the valid options only.
const clean = ({ display, buttons } = {}) => {
    const result = {};
    if (DISPLAY_MODES.includes(display)) {
        result.display = display;
    }
    const list = toList(buttons);
    if (list) {
        result.buttons = list.filter((name) => BUTTONS.includes(name));
    }
    return result;
};

// Merge the option sources. A later source wins.
export const resolveOptions = (...sources) =>
    Object.assign({}, DEFAULTS, ...sources.map((source) => clean(source || {})));
