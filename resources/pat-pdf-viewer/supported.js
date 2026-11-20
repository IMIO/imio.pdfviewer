// Check the features that the viewer needs. A browser without one of them
// gets the download frame and does not load the viewer code.
const FEATURES = [
    // pdf.js copies data between the page and its worker.
    () => typeof structuredClone === "function",
    // The viewer code.
    () => typeof Array.prototype.findLast === "function",
    // The toolbar layout.
    () => typeof CSS !== "undefined" && CSS.supports("container-type", "inline-size"),
];

export const isSupported = () =>
    FEATURES.every((check) => {
        try {
            return check();
        } catch {
            return false;
        }
    });
