// Translations of the "imio.pdfviewer" domain. Plone gives the catalog URL on
// the body (data-i18ncatalogurl), as for mockup. This loader waits for the
// catalog, so the viewer shows translated labels at the first render.

const DOMAIN = "imio.pdfviewer";

const interpolate = (text, keywords = {}) =>
    text.replace(/\$\{(\w+)\}/g, (match, key) =>
        key in keywords ? String(keywords[key]) : match,
    );

export const loadTranslations = async (doc = document) => {
    let catalog = {};
    const url = doc.body?.dataset.i18ncatalogurl;
    if (url) {
        const params = new URLSearchParams({
            domain: DOMAIN,
            language: doc.documentElement.lang || "en",
        });
        try {
            const response = await fetch(`${url}?${params}`);
            if (response.ok) {
                catalog = (await response.json()) || {};
            }
        } catch {
            // Without the catalog, the viewer shows the English messages.
        }
    }
    return (msgid, keywords) => interpolate(catalog[msgid] || msgid, keywords);
};
