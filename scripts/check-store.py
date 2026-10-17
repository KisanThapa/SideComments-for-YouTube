"""Check local Web Store deliverables; does not certify policy approval."""

import json
from pathlib import Path
import struct
from zipfile import ZipFile


def require(condition, message):
    if not condition:
        raise ValueError(message)


def check_png(file, size, alpha=False):
    data = file.read_bytes()
    require(data[:8] == b"\x89PNG\r\n\x1a\n", f"Not a PNG: {file}")
    require(struct.unpack(">II", data[16:24]) == size, f"Wrong image dimensions: {file}")
    if alpha:
        require(data[25] == 6, f"Expected RGBA image: {file}")


def main():
    root = Path(__file__).resolve().parent.parent
    manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    package = json.loads((root / "package.json").read_text(encoding="utf-8"))
    require(manifest["manifest_version"] == 3, "Expected Manifest V3")
    require(manifest["version"] == package["version"], "Package versions disagree")
    require(0 < len(manifest["description"]) <= 132, "Description must be 1–132 characters")
    require(manifest["permissions"] == ["storage"], "Review changed permissions and disclosures")
    require(not manifest.get("host_permissions"), "Review newly added host permissions")
    require(not manifest.get("web_accessible_resources"), "Review exposed resources")
    require(manifest["content_scripts"][0]["matches"] == ["https://www.youtube.com/*"], "Review changed site access")
    for size in [16, 32, 48, 128]:
        check_png(root / f"icons/icon{size}.png", (size, size), alpha=size == 128)
    check_png(root / "store/assets/promo-small.png", (440, 280))
    for name in ["normal", "theater"]:
        check_png(root / f"store/assets/screenshot-{name}.png", (1280, 800))
    for name in ["LISTING.md", "PRIVACY-ANSWERS.md", "SUBMISSION.md"]:
        require((root / "store" / name).is_file(), f"Missing store document: {name}")

    expected = {"manifest.json", "content.js", "content.css", "popup.html", "popup.js", "popup.css", "privacy.html"}
    expected.update(manifest["icons"].values())
    archive = root / "dist" / f"sidecomments-for-youtube-{manifest['version']}.zip"
    with ZipFile(archive) as zipped:
        require(zipped.testzip() is None, "ZIP integrity failed")
        require(set(zipped.namelist()) == expected, "ZIP must contain exactly the runtime files, with manifest at root")
        for name in expected:
            require(zipped.read(name) == (root / name).read_bytes(), f"Stale packaged file: {name}")
    print(f"Local checks passed: MV3, description, permissions, 7 PNGs, store documents, {len(expected)} packaged files.")
    print("Publisher registration, public privacy URL, dashboard choices, and Google review remain external steps.")


if __name__ == "__main__":
    main()
