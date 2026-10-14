#!/usr/bin/env python3
"""Build the static portfolio HTML from reusable component partials.

Usage: python3 build.py
The generated index.html is committed so GitHub Pages can serve the site directly.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "src" / "index.template.html"
OUTPUT = ROOT / "index.html"
INCLUDE_RE = re.compile(r"<!--\s*include:\s*([^\s]+)\s*-->")

def expand(text: str, parent: Path) -> str:
    def replace(match: re.Match) -> str:
        target = (ROOT / "src" / match.group(1)).resolve()
        if not target.is_file():
            raise FileNotFoundError(f"Missing HTML component: {target}")
        return expand(target.read_text(encoding="utf-8"), ROOT / "src" )
    previous = None
    while previous != text:
        previous = text
        text = INCLUDE_RE.sub(replace, text)
    return text

OUTPUT.write_text(expand(SOURCE.read_text(encoding="utf-8"), SOURCE.parent), encoding="utf-8")
print(f"Built {OUTPUT.name} from reusable HTML components.")
