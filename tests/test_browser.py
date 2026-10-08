from pathlib import Path

import imio.pdfviewer
import pytest


PDF_URL = "https://example.org/doc/@@download/file/report.pdf"
BUNDLES_DIR = Path(imio.pdfviewer.__file__).parent / "browser" / "static" / "bundles"


@pytest.fixture
def anon(request_factory):
    session = request_factory(api=False)
    session.headers["Accept"] = "text/html"
    return session


class TestDemoView:
    def test_renders_the_pattern(self, anon):
        response = anon.get("/@@pdfviewer-demo", params={"url": PDF_URL})

        assert response.status_code == 200
        assert '<div class="pat-pdf-viewer">' in response.text
        assert f'href="{PDF_URL}"' in response.text

    def test_loads_the_bundle(self, anon):
        response = anon.get("/@@pdfviewer-demo")

        assert (
            "++plone++imio.pdfviewer/bundles/imio.pdfviewer-remote.min.js"
            in response.text
        )


class TestStaticResources:
    def test_remote_entry(self, anon):
        response = anon.get(
            "/++plone++imio.pdfviewer/bundles/imio.pdfviewer-remote.min.js"
        )

        assert response.status_code == 200
        assert "javascript" in response.headers["Content-Type"]

    def test_worker_is_javascript(self, anon):
        """pdf.js starts the worker as a module: it needs a JavaScript MIME type."""
        worker = next(BUNDLES_DIR.glob("pdf.worker.min.*.mjs")).name
        response = anon.get(f"/++plone++imio.pdfviewer/bundles/{worker}")

        assert response.status_code == 200
        assert "javascript" in response.headers["Content-Type"]
