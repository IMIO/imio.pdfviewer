# pat-pdf-viewer

## Description

Shows a PDF document in the page: the pages, their text (selectable, read by
screen readers) and their links, with a toolbar: download, print, page
navigation, rotation, fit to width or to page, zoom and full screen.

The pattern mounts a React component that renders the pages with
[pdf.js](https://mozilla.github.io/pdf.js/) through
[react-pdf](https://github.com/wojtekmaj/react-pdf). pdf.js and its worker
load from the bundle, never from a CDN.

## Documentation

Give the URL of the PDF in a child link (preferred) or in the `url` option.

```html
<!-- Preferred: the link also works without JavaScript. -->
<div class="pat-pdf-viewer">
  <a href="https://site/doc/@@download/file/name.pdf">Download the document</a>
</div>

<!-- Or the explicit option. Use the JSON notation: it is safe for any URL. -->
<div class="pat-pdf-viewer" data-pat-pdf-viewer='{"url": "https://site/doc.pdf"}'></div>
```

The `url` option has priority over the child link. Without a URL, the pattern
logs a warning and does nothing. The viewer replaces the content of the
element. In a browser that cannot run the viewer, the child link stays.

The PDF must be on the same origin as the page, or the server must send CORS
headers: pdf.js downloads it with `fetch`.

The options come from three places. A later place wins:

1. the defaults of the pattern;
2. the site settings (Site Setup > Add-on configuration > PDF viewer);
3. the options of the element.

```html
<div class="pat-pdf-viewer"
     data-pat-pdf-viewer='{"display": "single", "buttons": ["download", "zoom"]}'>
  <a href="/doc.pdf">Download the document</a>
</div>

<!-- The same options in the patternslib notation -->
<div class="pat-pdf-viewer" data-pat-pdf-viewer="display: single; buttons: download zoom">
  <a href="/doc.pdf">Download the document</a>
</div>
```

The viewer is a box with a fixed height (the `--pdf-viewer-height` custom
property, `85dvh` by default). The pages scroll inside it.

Keyboard: when the focus is in the viewer, `+` and `-` zoom. In `single`
mode, the arrows and the page keys change the page. In `continuous` mode,
they scroll.

Touch screens: a pinch zooms the PDF, not the page. A double tap fits the
page width, or zooms in when the page width already fits.

### Options reference

| Property | Default value | Values | Type | Description |
| -------- | ------------- | ------ | ---- | ----------- |
| url | `null` | | String | URL of the PDF. If empty, the first child `<a href>` is used. |
| display | `continuous` | `continuous`, `single` | String | `continuous`: all the pages, one under the other. `single`: one page at a time. |
| buttons | `download print rotate fit zoom fullscreen` | these names | List | The optional buttons of the toolbar. A JSON list, or names separated by spaces or commas. The page buttons always show. |
