"""Build a runtime-only extension ZIP with Python's standard library."""

import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo


def main():
    root = Path(__file__).resolve().parent.parent
    manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    files = {"manifest.json", "popup.js", "popup.css", "privacy.html"}
    files.add(manifest["action"]["default_popup"])
    files.update(manifest["icons"].values())
    files.update(manifest["action"]["default_icon"].values())
    for entry in manifest["content_scripts"]:
        files.update(entry.get("js", []))
        files.update(entry.get("css", []))

    # Validate the complete allowlist before creating the archive.
    for name in files:
        source = (root / name).resolve()
        if not source.is_relative_to(root) or not source.is_file():
            raise ValueError(f"Missing or invalid extension asset: {name}")

    output = root / "dist" / f"sidecomments-for-youtube-{manifest['version']}.zip"
    output.parent.mkdir(exist_ok=True)
    with ZipFile(output, "w", ZIP_DEFLATED) as archive:
        for name in sorted(files):
            # Fixed timestamps and permissions keep identical inputs repeatable.
            info = ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            archive.writestr(info, (root / name).read_bytes())

    with ZipFile(output) as archive:
        if archive.testzip() is not None:
            raise ValueError("ZIP integrity check failed")
    print(f"Built {output.relative_to(root)} ({len(files)} extension files)")


if __name__ == "__main__":
    main()
