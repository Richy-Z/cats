#!/usr/bin/env bash

set -euo pipefail

OUTPUT_DIR="../src/cats"
mkdir -p "$OUTPUT_DIR"

processed_files=()

for file in *; do
    [ -f "$file" ] || continue

    case "${file,,}" in
        *.jpg|*.jpeg|*.png|*.webp|*.heic|*.gif)
            ;;
        *)
            echo "skipping non image: $file"
            continue
            ;;
    esac

    filename="$(basename "$file")"
    name="${filename%.*}"
    output="$OUTPUT_DIR/${name}.gif"

    echo "processing: $file -> $output"

    magick "$file" \
        -strip \
        "$output"

    processed_files+=("$file")
done

echo ""
echo "finished processing ${#processed_files[@]} cat photos"

if [ ${#processed_files[@]} -eq 0 ]; then
    exit 0
fi

echo ""
read -p "delete original source images from ingest folder? (y/N): " confirm

if [[ "$confirm" =~ ^[Yy]$ ]]; then
    for file in "${processed_files[@]}"; do
        rm "$file"
        echo "deleted: $file"
    done

    echo "original cat evidence destroyed"
else
    echo "original cat photos preserved"
fi