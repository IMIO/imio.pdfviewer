// Webpack entry point for module federation.
// Keep the dynamic import: it is the async boundary for the shared modules.
export default import("./bundle");
