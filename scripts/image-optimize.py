#!/usr/bin/env python3
"""Audit and create non-destructive optimized previews for DREAMLAND images.

The script never overwrites production images. Audit mode only writes a CSV
report. Optimization mode writes copies under the selected output directory.
"""

from __future__ import annotations

import argparse
import csv
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Sequence

try:
    from PIL import Image, ImageOps
except ImportError as error:  # pragma: no cover - dependency guard
    raise SystemExit(
        "Pillow is required. Run: py -m pip install -r requirements-image-tools.txt"
    ) from error

SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


@dataclass(frozen=True)
class ImageRecord:
    path: Path
    relative_path: Path
    width: int
    height: int
    bytes: int
    format: str

    @property
    def megapixels(self) -> float:
        return self.width * self.height / 1_000_000

    @property
    def kilobytes(self) -> float:
        return self.bytes / 1024


def iter_image_paths(root: Path) -> Iterable[Path]:
    for path in sorted(root.rglob("*")):
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS:
            yield path


def inspect_image(path: Path, root: Path) -> ImageRecord | None:
    try:
        with Image.open(path) as image:
            width, height = image.size
            image_format = image.format or path.suffix.lstrip(".").upper()
    except Exception as error:  # Keep the audit running when one asset is bad.
        print(f"[warning] unable to inspect {path}: {error}", file=sys.stderr)
        return None

    return ImageRecord(
        path=path,
        relative_path=path.relative_to(root),
        width=width,
        height=height,
        bytes=path.stat().st_size,
        format=image_format,
    )


def audit(root: Path) -> list[ImageRecord]:
    records: list[ImageRecord] = []
    for path in iter_image_paths(root):
        record = inspect_image(path, root)
        if record:
            records.append(record)
    return records


def write_report(records: Sequence[ImageRecord], report_path: Path) -> None:
    report_path.parent.mkdir(parents=True, exist_ok=True)
    with report_path.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.writer(file)
        writer.writerow(
            [
                "path",
                "format",
                "width",
                "height",
                "megapixels",
                "size_kb",
                "priority",
                "recommendation",
            ]
        )

        for record in records:
            priority, recommendation = recommendation_for(record)
            writer.writerow(
                [
                    record.relative_path.as_posix(),
                    record.format,
                    record.width,
                    record.height,
                    f"{record.megapixels:.2f}",
                    f"{record.kilobytes:.1f}",
                    priority,
                    recommendation,
                ]
            )


def recommendation_for(record: ImageRecord) -> tuple[str, str]:
    if record.bytes > 700 * 1024 or max(record.width, record.height) > 2400:
        return "P0", "compress and resize before the next release"
    if record.bytes > 350 * 1024 or max(record.width, record.height) > 1600:
        return "P1", "include in the first optimization batch"
    if record.bytes > 180 * 1024:
        return "P2", "review visual quality against a WebP quality 76 copy"
    return "OK", "keep current asset"


def resize_for_width(image: Image.Image, width: int) -> Image.Image:
    if image.width <= width:
        return image.copy()

    height = max(1, round(image.height * width / image.width))
    return image.resize((width, height), Image.Resampling.LANCZOS)


def prepare_image(image: Image.Image) -> Image.Image:
    image = ImageOps.exif_transpose(image)

    if image.mode in {"RGBA", "LA"}:
        return image.convert("RGBA")
    if image.mode == "P" and "transparency" in image.info:
        return image.convert("RGBA")
    return image.convert("RGB")


def output_target(
    output_root: Path,
    relative_path: Path,
    width: int,
) -> Path:
    stem = relative_path.stem
    return (
        output_root
        / relative_path.parent
        / f"{stem}-{width}.webp"
    )


def optimize_record(
    record: ImageRecord,
    output_root: Path,
    widths: Sequence[int],
    quality: int,
) -> list[Path]:
    created: list[Path] = []

    with Image.open(record.path) as source:
        source_image = prepare_image(source)

        for width in widths:
            optimized = resize_for_width(source_image, width)
            target = output_target(
                output_root,
                record.relative_path,
                width,
            )
            target.parent.mkdir(parents=True, exist_ok=True)
            optimized.save(
                target,
                format="WEBP",
                quality=quality,
                method=6,
            )
            created.append(target)

    return created


def select_sample(
    records: Sequence[ImageRecord],
    sample_size: int,
) -> list[ImageRecord]:
    ranked = sorted(
        records,
        key=lambda record: (
            record.bytes,
            record.width * record.height,
        ),
        reverse=True,
    )
    return ranked[:sample_size] if sample_size > 0 else ranked


def print_summary(records: Sequence[ImageRecord]) -> None:
    total_bytes = sum(record.bytes for record in records)
    p0 = sum(1 for record in records if recommendation_for(record)[0] == "P0")
    p1 = sum(1 for record in records if recommendation_for(record)[0] == "P1")

    print(f"Images audited: {len(records)}")
    print(f"Total source size: {total_bytes / 1024 / 1024:.2f} MB")
    print(f"P0 assets: {p0}")
    print(f"P1 assets: {p1}")

    if records:
        largest = max(records, key=lambda record: record.bytes)
        print(
            "Largest asset: "
            f"{largest.relative_path.as_posix()} "
            f"({largest.kilobytes:.1f} KB, "
            f"{largest.width}x{largest.height})"
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Audit images and optionally create non-destructive responsive "
            "WebP previews."
        )
    )
    parser.add_argument(
        "--root",
        type=Path,
        default=Path("images"),
        help="Image source directory (default: images)",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=Path("reports/image-audit.csv"),
        help="CSV audit report path",
    )
    parser.add_argument(
        "--optimize",
        action="store_true",
        help="Create optimized copies; source files are never overwritten",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("_image-optimization-preview"),
        help="Output directory for optimized copies",
    )
    parser.add_argument(
        "--sample",
        type=int,
        default=20,
        help="Number of largest assets to process (0 means all)",
    )
    parser.add_argument(
        "--widths",
        type=int,
        nargs="+",
        default=[360, 720, 960],
        help="Responsive widths to generate",
    )
    parser.add_argument(
        "--quality",
        type=int,
        default=76,
        help="WebP quality, 1-100 (default: 76)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = args.root.resolve()

    if not root.is_dir():
        print(f"Image directory does not exist: {root}", file=sys.stderr)
        return 2

    if not 1 <= args.quality <= 100:
        print("--quality must be between 1 and 100", file=sys.stderr)
        return 2

    widths = sorted({width for width in args.widths if width > 0})
    if not widths:
        print("At least one positive width is required", file=sys.stderr)
        return 2

    records = audit(root)
    write_report(records, args.report)
    print_summary(records)
    print(f"Audit report: {args.report}")

    if not args.optimize:
        print("Audit only. Add --optimize to create preview copies.")
        return 0

    chosen = select_sample(records, max(0, args.sample))
    created_count = 0
    before_bytes = sum(record.bytes for record in chosen)

    for record in chosen:
        created = optimize_record(
            record,
            args.output,
            widths,
            args.quality,
        )
        created_count += len(created)

    output_bytes = sum(
        path.stat().st_size
        for path in args.output.rglob("*.webp")
        if path.is_file()
    )

    print(f"Source assets sampled: {len(chosen)}")
    print(f"Responsive previews created: {created_count}")
    print(f"Sample source size: {before_bytes / 1024 / 1024:.2f} MB")
    print(f"Preview output size: {output_bytes / 1024 / 1024:.2f} MB")
    print(f"Preview directory: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
