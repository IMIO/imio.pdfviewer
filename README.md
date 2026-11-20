# imio.pdfviewer

A PDF viewer for Plone 6 Classic UI, shipped as a
[patternslib](https://patternslib.com/) pattern: `pat-pdf-viewer`.

The viewer renders the pages with [pdf.js](https://mozilla.github.io/pdf.js/)
through [react-pdf](https://github.com/wojtekmaj/react-pdf). It has a text
layer (selection, screen readers), clickable links, continuous or single-page
display, fit to width or to page, zoom, rotation, print, download and full
screen. On touch screens, a pinch zooms the PDF.

## Usage

Install the add-on (`imio.pdfviewer:default` profile), then add the pattern
to a template:

```html
<div class="pat-pdf-viewer">
  <a href="https://site/doc/@@download/file/name.pdf">Download the document</a>
</div>
```

The options (`url`, `display`, `buttons`) are in
[the pattern documentation](resources/pat-pdf-viewer/documentation.md).

To try the viewer on a site, open
`@@pdfviewer-demo?url=<URL of a PDF>&display=single&buttons=zoom`
(`display` and `buttons` are optional).

## Site settings

Site Setup > Add-on configuration > PDF viewer: the default display mode and
the toolbar buttons. The options of an element replace them.

## Look

The pattern brings neutral styles in the `imio-pdfviewer` cascade layer. A
rule outside a layer has priority, so a theme can change any rule. The
simplest way is to set these custom properties on `.pdf-viewer`:

| Property | Use |
|---|---|
| `--pdf-viewer-height` | Height of the viewer (default `85dvh`). |
| `--pdf-viewer-color` | Text and icon color. |
| `--pdf-viewer-bg` | Background around the pages. |
| `--pdf-viewer-border` | Border of the viewer. |
| `--pdf-viewer-radius` | Corner radius of the viewer and of the buttons. |
| `--pdf-viewer-gap` | Space around and between the pages. |
| `--pdf-viewer-toolbar-bg` | Background of the toolbar. |
| `--pdf-viewer-toolbar-border` | Line under the toolbar. |
| `--pdf-viewer-sticky-top` | Space above the toolbar when it sticks to the top of the window, for a fixed site header (default `0`). |
| `--pdf-viewer-button-hover-bg` | Background of a button under the pointer. |
| `--pdf-viewer-divider` | Line between the groups of toolbar buttons. |
| `--pdf-viewer-focus` | Color of the focus outline. |
| `--pdf-viewer-page-shadow` | Shadow of a page. |
| `--pdf-viewer-page-radius` | Corner radius of a page. |
| `--pdf-viewer-fullscreen-z-index` | Stack level of the full screen when the browser refuses the Fullscreen API. |
| `--pdf-viewer-download-bg` | Background of the download button in the fallback frame. |
| `--pdf-viewer-download-color` | Text color of that button. |

Bootstrap styles all links and buttons outside a layer. So the color, the
underline and the corners of the toolbar buttons are set outside the layer
too, with `.pdf-viewer .pdf-viewer-button`: change them with the properties.

Without these properties, the viewer uses the Bootstrap variables of the
page (`--bs-body-color`, `--bs-tertiary-bg`…), so `data-bs-theme="dark"`
works.

The icons come from the Plone icon resolver (`@@iconresolver`). A site can
change an icon with the `plone.icon.<name>` registry records.

## Translations

The labels use the `imio.pdfviewer` domain. The pattern loads the catalog
from `@@plonejsi18n`, in the language of the page. The package has a French
catalog.

## Browser support

pdf.js comes from its legacy build: Safari 18 (iOS 18), Chrome 125 and
later. The pattern checks a few features first. A browser without them,
or a browser that cannot load the viewer code, gets a frame that explains
the problem, with a button to download the PDF. A PDF that cannot load
gets the same frame.

## Why Module Federation

The `plone` bundle (mockup) is a webpack Module Federation **host**. When the
DOM is ready, it finds each `window.__patternslib_mf__*` global, initialises
that remote (this runs our `registry.register(...)`), and then scans the DOM
for `pat-*` classes. The packages in the `dependencies` of `package.json`, and
those of patternslib and mockup, become **shared singletons**: there is one
pattern registry, one jQuery and one React for all the remotes on the page.

This add-on is such a remote. Its Plone bundle (`plone.bundles/imio.pdfviewer`)
points to `imio.pdfviewer-remote.min.js`. The chunks, the pdf.js worker and the
spinner resolve relative to that script (webpack `publicPath: "auto"`), so a
`++plone++imio.pdfviewer` resource directory is all the add-on needs. No file
loads from a CDN.

The build also copies resources of `pdfjs-dist` into `bundles/pdfjs/`: the
CMaps (`cmaps/`), the standard fonts (`standard_fonts/`), the CMYK color
profile (`iccs/`) and the JBIG2, CCITT and JPEG 2000 image decoders (`wasm/`).
pdf.js loads a file from there only when a PDF needs it.

`@patternslib/patternslib` and `@plone/mockup` are pinned to the versions of
`plone.staticresources` in the target Plone release (Plone 6.2.2:
`@plone/mockup` 5.6.10, `@patternslib/patternslib` 9.10.7). Shared singletons
check the version: with a major mismatch, the remote falls back to its own copy.

### One React for all the iMio add-ons

The iMio add-ons share one React. Each one shares `react`, `react-dom`,
`react-dom/client` and `react/jsx-runtime` (`shared_react` in
`webpack.config.js`), and keeps `react` and `react-dom` at the same version.
The page takes the highest version of each entry, so `react` and
`react-dom/client` always have the same version, also when two add-ons have
different patch versions. An add-on that shares only `react` and `react-dom`
breaks this rule: its `react-dom/client` stays in its own bundle and can have
another version than the shared `react` (React error #527). All the iMio
add-ons use the same React major version.

`react-pdf` and `pdfjs-dist` are not shared: pdf.js must have the version of
the worker in this bundle. They are pinned to exact versions: `pdfjs-dist`
must be the version that `react-pdf` requires. Upgrade them together.

## Development

The built bundle is in `src/imio/pdfviewer/browser/static/bundles/` and is
committed: installing the Python package does not need Node.js. CI rebuilds it
and fails if the committed files are not up to date.

JavaScript (Node.js 22.13 or later):

```sh
npm install
npm test            # Jest
npm run lint        # ESLint
npm start           # static demo and bundle on http://localhost:3001 (no icons: they come from Plone)
npm run build       # writes static/bundles/: commit the result
```

To use the `npm start` bundle in a Plone site, enable the
`plone.bundles/imio.pdfviewer-devserver` registry record and disable
`plone.bundles/imio.pdfviewer` (Site Setup > Resource Registries).

Python (uses [uv](https://docs.astral.sh/uv/)):

```sh
make install        # virtualenv with Plone and the test dependencies
make test           # pytest
make create-site    # Plone site with the add-on and a sample PDF (DELETE_EXISTING=1 to recreate it)
make start          # http://localhost:8080
make check          # format and lint
```

End-to-end tests (Cypress, against the site of `make create-site`):

```sh
make start          # in another terminal
npm run build
npm run e2e -- --browser chrome     # or: npm run e2e:open
```

`make help` lists all the targets.

### Dependency patch

`webpack.config.js` patches `pdfjs-dist` at build time, with
`webpack/replace-loader.js`: a Node.js only `import.meta.url` gets a fixed
value. Without it, webpack writes the absolute path of the build machine into
the bundle. The build fails if the patched text is not found after an upgrade.

## License

GPL version 2. See [LICENSE.md](LICENSE.md).
