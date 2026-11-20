"""Print the signature tags of a PDF, as imio.esign reads them.

Usage:
    uvx --with jsonschema python spike/check_tags.py [--json] file.pdf

The text check is the check of imio.esign: plain pdftotext, all the
whitespace removed, the tag regex and the JSON schema. pdftotext -bbox gives
the top-left corner of each tag, in points from the top-left corner of the
CropBox of its page. The exit code is 1 when a tag is malformed.
"""

from jsonschema import Draft4Validator
from jsonschema import ValidationError
from xml.etree import ElementTree

import argparse
import json
import re
import subprocess
import sys


TAG_RE = re.compile(r"\{\{#(.*?)#\}\}", re.DOTALL)
WHITESPACE_RE = re.compile(r"\s+")
POSITIVE_INT_STRING = {"type": "string", "pattern": "^[1-9][0-9]*$"}
TAG_VALIDATOR = Draft4Validator({
    "required": ["ID", "Size"],
    "additionalProperties": False,
    "properties": {
        "ID": {"type": "string", "pattern": "^(Signer[1-9][0-9]*|SCEAU)$"},
        "Size": {
            "type": "object",
            "required": ["Height", "Width"],
            "additionalProperties": False,
            "properties": {
                "Height": POSITIVE_INT_STRING,
                "Width": POSITIVE_INT_STRING,
            },
        },
    },
})
XHTML = "{http://www.w3.org/1999/xhtml}"


def esign_payloads(data):
    """Return the tag payloads that imio.esign finds in the PDF data."""
    text = subprocess.run(
        ["pdftotext", "-q", "-enc", "UTF-8", "-", "-"],  # noqa: S607
        input=data,
        capture_output=True,
        check=True,
    ).stdout.decode("utf-8")
    return TAG_RE.findall(WHITESPACE_RE.sub("", text))


def positioned_tags(data):
    """Return (payload, page, x, y) for each tag that pdftotext -bbox finds.

    A tag can be in more than one word. Its corner is the left of its first
    word and the top of its highest word.
    """
    xml = subprocess.run(
        ["pdftotext", "-q", "-bbox", "-cropbox", "-enc", "UTF-8", "-", "-"],  # noqa: S607
        input=data,
        capture_output=True,
        check=True,
    ).stdout
    found = []
    pages = ElementTree.fromstring(xml).iter(f"{XHTML}page")  # noqa: S314
    for number, page in enumerate(pages, start=1):
        words = list(page.iter(f"{XHTML}word"))
        text = ""
        owners = []
        for index, word in enumerate(words):
            part = WHITESPACE_RE.sub("", word.text or "")
            text += part
            owners += [index] * len(part)
        for match in TAG_RE.finditer(text):
            used = [words[i] for i in sorted(set(owners[match.start() : match.end()]))]
            found.append((
                match.group(1),
                number,
                float(used[0].get("xMin")),
                min(float(word.get("yMin")) for word in used),
            ))
    return found


def check(path):
    """Return the tags of the PDF at `path`, in the order of imio.esign."""
    with open(path, "rb") as pdf:
        data = pdf.read()
    positions = positioned_tags(data)
    tags = []
    for payload in esign_payloads(data):
        tag = {"tag": "{{#" + payload + "#}}", "valid": True, "error": None}
        try:
            value = json.loads("{" + payload + "}")
            TAG_VALIDATOR.validate(value)
            tag.update(id=value["ID"], height=value["Size"]["Height"])
            tag.update(width=value["Size"]["Width"])
        except (ValueError, ValidationError) as error:
            tag.update(valid=False, error=str(error).splitlines()[0])
        place = next((p for p in positions if p[0] == payload), None)
        if place:
            positions.remove(place)
            tag.update(page=place[1], x=round(place[2], 2), y=round(place[3], 2))
        tags.append(tag)
    return tags


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("pdf")
    parser.add_argument("--json", action="store_true", help="print JSON")
    args = parser.parse_args()
    tags = check(args.pdf)
    if args.json:
        print(json.dumps(tags, indent=2))
    else:
        print(f"{args.pdf}: {len(tags)} tag(s)")
        for tag in tags:
            state = "valid" if tag["valid"] else f"MALFORMED ({tag['error']})"
            where = (
                f"page {tag['page']}, top-left x={tag['x']} y={tag['y']} pt"
                if "page" in tag
                else "no position (outside the CropBox?)"
            )
            size = f"{tag['width']}x{tag['height']} pt" if tag["valid"] else tag["tag"]
            print(f"  {tag.get('id', '?'):8} {size:14} {state:6}  {where}")
    return 1 if any(not tag["valid"] for tag in tags) else 0


if __name__ == "__main__":
    sys.exit(main())
