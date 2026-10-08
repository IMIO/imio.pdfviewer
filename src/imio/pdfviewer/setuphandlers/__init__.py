from plone.base.interfaces.installable import INonInstallable
from zope.interface import implementer


@implementer(INonInstallable)
class HiddenProfiles:
    def getNonInstallableProfiles(self):
        """Hide the uninstall profile from site creation and the installer."""
        return [
            "imio.pdfviewer:uninstall",
        ]
