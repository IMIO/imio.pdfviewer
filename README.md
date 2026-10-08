# imio.pdfviewer

A PDF viewer for Plone 6 Classic UI, shipped as a
[patternslib](https://patternslib.com/) pattern: `pat-pdf-viewer`.

The viewer renders the pages with [pdf.js](https://mozilla.github.io/pdf.js/)
in a React component, with a toolbar: download, print, previous and next page,
rotation, full width, zoom and full screen. It comes from
[plonemeeting.portal.core](https://github.com/IMIO/plonemeeting.portal.core)
(Délibérations.be) and keeps its layout, markup and behaviour.

## Usage

Install the add-on (`imio.pdfviewer:default` profile), then add the pattern
to a template:

```html
<!-- Preferred: the link also works without JavaScript. -->
<div class="pat-pdf-viewer">
  <a href="https://site/doc/@@download/file/name.pdf">Télécharger le document</a>
</div>

<!-- Or the explicit option. Use the JSON notation: it is safe for any URL. -->
<div class="pat-pdf-viewer" data-pat-pdf-viewer='{"url": "https://site/doc.pdf"}'></div>
```

The `url` option has priority over the child link. See
[the pattern documentation](resources/pat-pdf-viewer/documentation.md).

Requirements on the page:

- The PDF is on the same origin as the page, or its server sends CORS headers.
- Bootstrap and the [Bootstrap Icons](https://icons.getbootstrap.com/) font
  (`bi bi-*` classes) are loaded. Plone 6 Classic loads Bootstrap. The
  Barceloneta theme does **not** load the Bootstrap Icons font:
  `plonetheme.deliberations` does. Without the font, the toolbar buttons have
  no icons.

The pattern brings its own stylesheet (the `.pdf-viewer*` rules).

To try the viewer on a site where the add-on is installed, open
`@@pdfviewer-demo?url=<URL of a PDF>`.

## Why Module Federation

The `plone` bundle (mockup) is a webpack Module Federation **host**. When the
DOM is ready, it finds each `window.__patternslib_mf__*` global, initialises
that remote (this runs our `registry.register(...)`), and then scans the DOM
for `pat-*` classes. The packages in the `dependencies` of `package.json`, and
those of patternslib and mockup, become **shared singletons**: there is one
pattern registry, one jQuery, one React and one pdf.js for all the remotes on
the page.

This add-on is such a remote. Its Plone bundle (`plone.bundles/imio.pdfviewer`)
points to `imio.pdfviewer-remote.min.js`. The chunks, the pdf.js worker and the
spinner resolve relative to that script (webpack `publicPath: "auto"`), so a
`++plone++imio.pdfviewer` resource directory is all the add-on needs.

`@patternslib/patternslib` and `@plone/mockup` are pinned to the versions of
`plone.staticresources` in the target Plone release (Plone 6.2.2:
`plone.staticresources` 3.0.6, `@plone/mockup` 5.6.10,
`@patternslib/patternslib` 9.10.7). Shared singletons check the version: with
a major mismatch, the remote falls back to its own copy.

## Development

The built bundle is in `src/imio/pdfviewer/browser/static/bundles/` and is
committed: installing the Python package does not need Node.js. CI rebuilds it
and fails if the committed files are not up to date.

JavaScript (Node.js 20 or later):

```sh
npm install
npm test            # Jest
npm run lint        # ESLint
npm start           # demo page and bundle on http://localhost:3001
npm run build       # writes static/bundles/: commit the result
```

To use the `npm start` bundle in a Plone site, enable the
`plone.bundles/imio.pdfviewer-devserver` registry record and disable
`plone.bundles/imio.pdfviewer` (Site Setup > Resource Registries).

Python (uses [uv](https://docs.astral.sh/uv/)):

```sh
make install        # virtualenv with Plone and the test dependencies
make test           # pytest
make create-site    # Plone site with the add-on installed
make start          # http://localhost:8080
make check          # format and lint
```

`make help` lists all the targets, including `js-build`, `js-start` and
`js-test`.

### Dependency patches

`webpack.config.js` patches two dependencies at build time, with
`webpack/replace-loader.js`:

- `@mikecousins/react-pdf`: the CDN fallback for the pdf.js worker is removed.
  The viewer always gives the worker URL, so the bundle makes no request to
  `cdnjs.cloudflare.com`.
- `pdfjs-dist`: a Node.js only `import.meta.url` gets a fixed value. Without it,
  webpack writes the absolute path of the build machine into the bundle.

The build fails if a patched text is not found after an upgrade.

## License

GPL version 2. See [LICENSE.md](LICENSE.md).
