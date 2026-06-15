# Generated art tools

`postprocess_batch1.sh` rebuilds the Batch 1 harbour texture maps from the selected albedo PNGs in `assets/textures/harbour/`.

Run from the repository root:

```sh
tools/gen/postprocess_batch1.sh
```

The script uses local ImageMagick plus Python/Pillow when available. It writes 512x512 optimized PNG albedo, normal, ORM, and window emissive assets.
