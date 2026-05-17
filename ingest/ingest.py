import os
import shutil
import subprocess
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor, as_completed

IMAGES = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".gif"}

INPUT_DIR = Path(".")
OUTPUT_DIR = Path("../src/cats")


def is_valid_image(file: Path) -> bool:
    if not file.is_file():
        return False

    if file.name.startswith("._"):
        return False

    if file.name == ".DS_Store":
        return False

    return file.suffix.lower() in IMAGES


def process_file(file: Path):
    output = OUTPUT_DIR / f"{file.stem}.gif"

    print(f"processing: {file} -> {output}")

    subprocess.run(
        ["magick", str(file), "-auto-orient", "-strip", str(output)], check=True
    )

    return file


def main():
    if shutil.which("magick") is None:
        print("ImageMagick is not installed")
        print("install with brew install imagemagick")
        exit(1)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    files = [f for f in INPUT_DIR.iterdir() if is_valid_image(f)]

    if not files:
        print("no valid cat photos found")
        return

    processed_files = []

    workers = os.cpu_count() or 4

    with ProcessPoolExecutor(max_workers=workers) as executor:
        futures = {executor.submit(process_file, file): file for file in files}

        for future in as_completed(futures):
            file = futures[future]

            try:
                processed = future.result()
                processed_files.append(processed)
            except Exception as e:
                print(f"failed processing {file}: {e}")

    print("")
    print(f"finished processing {len(processed_files)} cat photos")

    confirm = (
        input("\ndelete original source images from ingest folder? (y/N): ")
        .strip()
        .lower()
    )

    if confirm == "y":
        for file in processed_files:
            try:
                file.unlink()
                print(f"deleted: {file}")
            except Exception as e:
                print(f"failed deleting {file}: {e}")

        print("original cat evidence destroyed")
    else:
        print("original cat photos preserved")


# main()
# needed for stupid python parallelism
if __name__ == "__main__":
    main()
