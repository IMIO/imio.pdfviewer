// Load the SVG markup of a Plone icon from @@iconresolver.
// Plone gives the site URL on the body (data-portal-url). Each icon loads one time.

const cache = new Map();

export const resolveIcon = (name, doc = document) => {
    if (!cache.has(name)) {
        const base = doc.body?.dataset.portalUrl;
        const request = base
            ? fetch(`${base}/@@iconresolver/${name}`)
                  .then((response) => (response.ok ? response.text() : ""))
                  .catch(() => "")
            : Promise.resolve("");
        cache.set(name, request);
    }
    return cache.get(name);
};
