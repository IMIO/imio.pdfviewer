# pat-pdf-viewer

## Description

Shows a PDF document in the page: the pages, their text (selectable, read by
screen readers) and their links, with a toolbar: download, print, page
navigation, rotation, fit to width or to page, zoom and full screen.

A PDF can have a text version in HTML, for a PDF that is a scan. The viewer
then has two tabs: the PDF and its text version.

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
element. In a browser that cannot run the viewer, a frame explains the
problem and gives a button to download the PDF.

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
they scroll. These keys do nothing in the text version.

Touch screens: a pinch zooms the PDF, not the page. A double tap fits the
page width, or zooms in when the page width already fits.

### Text version

A scan has no text: a screen reader cannot read it. The page can give a text
version of the PDF, in HTML. The viewer then shows two tabs, "Document" (the
PDF) and "Text version". Without a text version, the viewer has no tabs.

There are two sources. Use one of them, or the two together.

**In the page.** Put the HTML in a child element of the pattern element, with
the `data-pdf-viewer-text` attribute:

```html
<div class="pat-pdf-viewer">
  <a href="/doc.pdf">Download the document</a>
  <div data-pdf-viewer-text>
    <section aria-label="Page 1">
      <h2>Decision of the council</h2>
      <p>…</p>
    </section>
  </div>
</div>
```

- The element is a direct child of the pattern element. The viewer uses the
  first one. An element without text is not a text version.
- Without JavaScript, the text is content of the page: a search engine and a
  screen reader get it.
- With JavaScript, the viewer moves the element into the "Text version" tab.
  The element keeps its attributes (`lang`, `class`…) and its content.
- A link in the text is never the PDF link. The PDF link is the first
  `<a href>` outside the text element.
- In a browser that cannot run the viewer, the text stays in the page, after
  the frame with the download button.

**From a URL.** Give the URL of the text in the `text-url` option:

```html
<div class="pat-pdf-viewer" data-pat-pdf-viewer='{"text-url": "/doc/@@text-version"}'>
  <a href="/doc.pdf">Download the document</a>
</div>
```

- The viewer sends a `GET` request with the cookies of the page and the
  header `Accept: text/html`.
- The URL must be on the origin of the page. The viewer refuses another
  origin.
- The response has a status 200 to 299. Its body is an HTML fragment in
  UTF-8. A full HTML document also works: the viewer takes the content of
  its `<body>`. Plone puts the fragment of a view in `<html>` and `<body>`
  elements.
- The request starts when the reader opens the "Text version" tab for the
  first time.
- After an error or an empty response, the tab says that the text version
  cannot be loaded and shows a "Try again" button. The PDF tab still works.

**The two together.** For a long document, put the first pages in the page
and give the full text in `text-url`. The tab shows the text of the page
first. Under it, a "Load the full text" button gets the text of the URL. This
text replaces the text of the page.

The viewer inserts the HTML as it is. It has no sanitiser: the server must
give safe HTML. A `<script>` in the text of a URL does not run.

The PDF tab opens first. The browser keeps the last tab of the reader
(`localStorage`, key `imio.pdfviewer.tab`, value `pdf` or `text`) for all the
viewers of the site. When the text tab opens first, the PDF loads only when
the reader opens its tab.

In the "Text version" tab, the toolbar shows only the download and print
buttons of the PDF. Keyboard: on a tab, the left and right arrows, `Home` and
`End` select another tab.

The text scrolls in the viewer. A table that is too wide scrolls
horizontally in the tab. The viewer does not change the headings and the
sections of the HTML. A line separates two `<section>` elements that follow
each other, for example two pages.

Class names for a theme:

| Class | Element |
| ----- | ------- |
| `pdf-viewer-text-active` | On `.pdf-viewer`, while the text tab is open. |
| `pdf-viewer-header` | The tab list and the toolbar. It sticks to the top of the window. |
| `pdf-viewer-tabs`, `pdf-viewer-tab` | The tab list (`role="tablist"`) and a tab. The selected tab has `aria-selected="true"`. |
| `pdf-viewer-text-panel` | The panel of the text tab. It scrolls. |
| `pdf-viewer-text` | The column with the HTML of the text version. |
| `pdf-viewer-text-more` | The loading message, the error message and the button, under the text. |
| `pdf-viewer-text-load` | The "Load the full text" and "Try again" button. |

### Options reference

| Property | Default value | Values | Type | Description |
| -------- | ------------- | ------ | ---- | ----------- |
| url | `null` | | String | URL of the PDF. If empty, the first child `<a href>` is used. |
| display | `continuous` | `continuous`, `single` | String | `continuous`: all the pages, one under the other. `single`: one page at a time. |
| buttons | `download print rotate fit zoom fullscreen` | these names | List | The optional buttons of the toolbar. A JSON list, or names separated by spaces or commas. The page buttons always show. |
| text-url | `null` | | String | URL of an HTML fragment with the text version of the PDF, on the origin of the page. See "Text version". |
