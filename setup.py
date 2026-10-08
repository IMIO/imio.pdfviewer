"""Shim so that the package can be a zc.buildout develop egg.

The metadata lives in pyproject.toml. zc.buildout's develop runs setup.py
directly, so a PEP 517 only package fails there. check-python-versions reads
setup.py statically, so the two arguments below repeat pyproject.toml.
"""

from setuptools import setup


setup(
    python_requires=">=3.12,<3.15",
    classifiers=[
        "Programming Language :: Python",
        "Programming Language :: Python :: 3.12",
        "Programming Language :: Python :: 3.13",
        "Programming Language :: Python :: 3.14",
    ],
)
