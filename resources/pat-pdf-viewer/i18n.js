// Translations of the "imio.pdfviewer" domain. Plone gives the catalog URL on
// the body (data-i18ncatalogurl), as for mockup. This loader waits for the
// catalog, so the viewer shows translated labels at the first render. It waits
// TIMEOUT at most.

const DOMAIN = "imio.pdfviewer";
// Maximum time in milliseconds for the request and the body of the catalog.
const TIMEOUT = 3000;

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
        let timer;
        try {
            // The abort also stops a body that is not complete.
            const controller = new AbortController();
            timer = setTimeout(() => controller.abort(), TIMEOUT);
            const response = await fetch(`${url}?${params}`, {
                signal: controller.signal,
            });
            if (response.ok) {
                catalog = (await response.json()) || {};
            }
        } catch {
            // After an error or after the time limit, the viewer shows the
            // English messages.
        } finally {
            clearTimeout(timer);
        }
    }
    return (msgid, keywords) => interpolate(catalog[msgid] || msgid, keywords);
};
