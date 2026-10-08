from imio.pdfviewer import PACKAGE_NAME
from pathlib import Path
from plone.base.interfaces.resources import IBundleRegistry
from plone.registry.interfaces import IRegistry
from zope.component import getUtility

import imio.pdfviewer
import pytest


BUNDLE = "++plone++imio.pdfviewer/bundles/imio.pdfviewer-remote.min.js"
BUNDLES_DIR = Path(imio.pdfviewer.__file__).parent / "browser" / "static" / "bundles"


@pytest.fixture
def bundles(integration):
    registry = getUtility(IRegistry)
    return registry.collectionOfInterface(IBundleRegistry, prefix="plone.bundles")


class TestSetupInstall:
    def test_addon_installed(self, installer):
        assert installer.is_product_installed(PACKAGE_NAME) is True

    def test_browserlayer(self, browser_layers):
        from imio.pdfviewer.interfaces import IImioPdfviewerLayer

        assert IImioPdfviewerLayer in browser_layers

    def test_latest_version(self, profile_last_version):
        assert profile_last_version(f"{PACKAGE_NAME}:default") == "1000"

    def test_bundle_registered(self, bundles):
        bundle = bundles["imio.pdfviewer"]
        assert bundle.enabled is True
        assert bundle.jscompilation == BUNDLE

    def test_devserver_bundle_disabled(self, bundles):
        bundle = bundles["imio.pdfviewer-devserver"]
        assert bundle.enabled is False
        assert bundle.jscompilation.startswith("http://localhost:3001/")

    def test_bundle_traversable(self, portal):
        resource = portal.restrictedTraverse(BUNDLE)
        with open(resource.path, "rb") as bundle:
            assert b"__patternslib_mf__imiopdfviewer" in bundle.read()


class TestBundleFiles:
    @pytest.mark.parametrize(
        "pattern",
        [
            "imio.pdfviewer.min.js",
            "pdf.worker.min.*.mjs",
            "ajax-spinner.*.svg",
            "chunks/*.min.js",
        ],
    )
    def test_asset_shipped(self, pattern):
        assert list(BUNDLES_DIR.glob(pattern))

    def test_no_cdn_url(self):
        """The pdf.js worker loads from the bundle, never from cdnjs."""
        for path in BUNDLES_DIR.rglob("*"):
            if path.is_file():
                assert b"cdnjs" not in path.read_bytes(), path
