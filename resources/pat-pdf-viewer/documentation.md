# pat-pdf-viewer

## Description

Shows a PDF document in the page, with a toolbar: download, print, page
navigation, rotation, full width, zoom and full screen.

The pattern mounts a React component that renders the pages with
[pdf.js](https://mozilla.github.io/pdf.js/) through
[`@mikecousins/react-pdf`](https://github.com/mikecousins/react-pdf-js).
The pdf.js worker loads from the bundle, never from a CDN.

## Documentation

Give the URL of the PDF in a child link (preferred) or in the `url` option.

```html
<!-- Preferred: the link also works without JavaScript. -->
<div class="pat-pdf-viewer">
  <a href="https://site/doc/@@download/file/name.pdf">Télécharger le document</a>
</div>

<!-- Or the explicit option. Use the JSON notation: it is safe for any URL. -->
<div class="pat-pdf-viewer" data-pat-pdf-viewer='{"url": "https://site/doc.pdf"}'></div>
```

The `url` option has priority over the child link. Without a URL, the pattern
logs a warning and does nothing. The viewer replaces the content of the element.

The PDF must be on the same origin as the page, or the server must send CORS
headers: pdf.js downloads it with `fetch`.

The toolbar uses Bootstrap classes (`btn`, `btn-group`, `border-end`) and the
[Bootstrap Icons](https://icons.getbootstrap.com/) font (`bi bi-*`). The pattern
does not include them: the page must load them.

### Options reference

| Property | Default value | Values | Type   | Description                                       |
| -------- | ------------- | ------ | ------ | ------------------------------------------------- |
| url      | `null`        |        | String | URL of the PDF. If empty, the first child `<a href>` is used. |
