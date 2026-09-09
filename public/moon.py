import os
import numpy as np
from PIL import Image

# 1. Configuration
INPUT_IMAGE_PATH = "moon_isolated.png"  # Path to your uploaded PNG
OUTPUT_DIR = "lunar_cycle_30_png"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 2. Load original image and isolate the disk boundary
raw_img = Image.open(INPUT_IMAGE_PATH).convert("RGBA")
w, h = raw_img.size
rgba_arr = np.asarray(raw_img, dtype=np.float32) / 255.0

rgb = rgba_arr[..., :3]
src_alpha = rgba_arr[..., 3]

# Identify the exact moon disk pixels
if np.any(src_alpha < 1.0):
    disc_mask = src_alpha > 0.05
else:
    luminance = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
    disc_mask = luminance > 0.02

# 3. Fit geometry strictly to the existing moon circle
y_indices, x_indices = np.where(disc_mask)
min_y, max_y = y_indices.min(), y_indices.max()
min_x, max_x = x_indices.min(), x_indices.max()

cx = (min_x + max_x) / 2.0
cy = (min_y + max_y) / 2.0
radius = ((max_x - min_x) + (max_y - min_y)) / 4.0

# 4. Generate 3D surface normals
y_grid, x_grid = np.indices((h, w), dtype=np.float32)
nx = (x_grid - cx) / radius
ny = (y_grid - cy) / radius
r2 = nx**2 + ny**2

# Keep only the pixels that are physically part of the moon disk
moon_pixels = disc_mask & (r2 <= 1.0)

nz = np.zeros_like(nx)
nz[moon_pixels] = np.sqrt(np.maximum(0.0, 1.0 - r2[moon_pixels]))
N = np.stack([nx, -ny, nz], axis=-1)

# 5. Render all 30 days
total_days = 30
synodic_period = 29.530588

for day in range(1, total_days + 1):
    # Orbit angle: Day 1 ~ New Moon, Day 15 ~ Full Moon, Day 30 ~ Waning Crescent
    phase_angle = ((day - 1) / synodic_period) * 2.0 * np.pi

    # Light vector sweeping left-to-right across the sphere
    lx = np.sin(phase_angle)
    ly = 0.0
    lz = -np.cos(phase_angle)
    L = np.array([lx, ly, lz], dtype=np.float32)

    # Calculate spherical illumination
    dot_product = np.sum(N * L, axis=-1)
    direct_light = np.clip(dot_product, 0.0, 1.0)

    # 1.0 on the lit side, 0.0 (pure black) on the shadowed side
    illumination = direct_light * moon_pixels

    # Multiply source colors by illumination:
    # Lit side = original details, Unlit side = black
    out_rgb = rgb * illumination[..., None]

    # Alpha remains identical to the original moon disk
    # (Inside the moon disk stays opaque, outside stays transparent)
    out_alpha = np.where(moon_pixels, src_alpha, 0.0)

    # Stack RGBA channels and save PNG
    out_rgba = np.dstack([out_rgb, out_alpha])
    out_arr = np.clip(out_rgba * 255.0, 0, 255).astype(np.uint8)

    filename = os.path.join(OUTPUT_DIR, f"day_{day:02d}.png")
    Image.fromarray(out_arr, mode="RGBA").save(filename, format="PNG")
    print(f"Exported: {filename}")

print(f"\nFinished! All 30 PNGs have been created in: {OUTPUT_DIR}")