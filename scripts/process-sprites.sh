#!/bin/bash
# Auto-crop whitespace and downscale sprites to 48x48 (good size for canvas rendering)
# Uses macOS sips + ImageMagick-free approach via pngjs

SPRITE_DIR="sprite"
OUT_DIR="public/sprites"

mkdir -p "$OUT_DIR"

echo "Processing sprites from $SPRITE_DIR → $OUT_DIR"
echo ""

for f in "$SPRITE_DIR"/hair_*.png "$SPRITE_DIR"/face_*.png "$SPRITE_DIR"/body_*.png; do
  [ -f "$f" ] || continue
  base=$(basename "$f")
  echo "Processing: $base"

  # Use sips to:
  # 1. Trim/crop to content bounds isn't directly supported, so we'll use the node script
  node scripts/crop-and-resize.js "$f" "$OUT_DIR/$base"
done

echo ""
echo "Done! Processed sprites in $OUT_DIR/"
