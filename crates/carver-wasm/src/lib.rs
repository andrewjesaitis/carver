// crates/carver-wasm/src/lib.rs

// wasm_bindgen is the bridge between Rust and JavaScript.
// The #[wasm_bindgen] attribute marks functions that JS can call.
use wasm_bindgen::prelude::*;
use std::collections::HashSet;

/// Converts RGBA pixels to single-channel greyscale using luminance weights.
/// Input: &[u8] of RGBA pixels (4 bytes per pixel).
/// Output: Vec<u8> of greyscale values (1 byte per pixel).
fn greyscale(pixels: &[u8], width: u32, height: u32) -> Vec<u8> {
    let len = (width * height) as usize;
    let mut grey = Vec::with_capacity(len); // pre-allocate, like malloc(len)
    for i in 0..len {
        let base = i * 4; // each pixel is 4 bytes: R, G, B, A
        let r = pixels[base] as f64;
        let g = pixels[base + 1] as f64;
        let b = pixels[base + 2] as f64;
        // Same luminance weights as the TS version
        grey.push((0.21 * r + 0.72 * g + 0.07 * b).round() as u8);
    }
    grey
}

/// Computes gradient magnitude using forward differences, matching the TS simpleGradient.
/// Boundary: left column (x=0) and top row (y=0) are treated as zero-gradient.
fn simple_gradient(grey: &[u8], width: u32, height: u32) -> Vec<u8> {
    let w = width as usize;
    let h = height as usize;
    let mut grad = vec![0u8; w * h]; // vec![value; count] — like calloc
    for y in 0..h {
        for x in 0..w {
            let idx = y * w + x;
            // Matches TS: x > 0 && y > 0 collapses both boundary conditions
            let (lidx, uidx) = if x > 0 && y > 0 {
                (y * w + (x - 1), (y - 1) * w + x)
            } else {
                (idx, idx) // self-reference → dx=0, dy=0
            };
            let dx = grey[idx] as f64 - grey[lidx] as f64;
            let dy = grey[idx] as f64 - grey[uidx] as f64;
            // & 0xff clamps to byte range, matching TS `Math.sqrt(...) & 0xff`
            grad[idx] = ((dx * dx + dy * dy).sqrt() as u32 & 0xff) as u8;
        }
    }
    grad
}

/// Computes gradient magnitude using the Sobel operator, matching the TS sobelGradient.
/// Negative flat indices return NaN (like JS Uint8ClampedArray undefined), which propagates
/// through the convolution sum and produces 0 via `NaN & 0xff = 0`. Positive out-of-bounds
/// indices also return NaN. Positive in-bounds indices return the actual grey value —
/// including wrap-around reads, which match TS Uint8ClampedArray behavior exactly.
fn sobel_gradient(grey: &[u8], width: u32, height: u32) -> Vec<u8> {
    let w = width as usize;
    let h = height as usize;
    let len = grey.len() as isize;
    let mut grad = vec![0u8; w * h];

    let kernel_x: [[f64; 3]; 3] = [[-1.0, 0.0, 1.0], [-2.0, 0.0, 2.0], [-1.0, 0.0, 1.0]];
    let kernel_y: [[f64; 3]; 3] = [[-1.0, -2.0, -1.0], [0.0, 0.0, 0.0], [1.0, 2.0, 1.0]];

    // Mirrors TS Uint8ClampedArray: negative or beyond-length flat index → NaN (undefined in JS).
    // Positive in-bounds → read value (including row-wrap, matching TS flat-array access).
    let get = |x: isize, y: isize| -> f64 {
        let idx = y * w as isize + x;
        if idx < 0 || idx >= len {
            f64::NAN
        } else {
            grey[idx as usize] as f64
        }
    };

    // Note: TS iterates x outer, y inner for Sobel — we match that order
    for x in 0..w {
        for y in 0..h {
            let xi = x as isize;
            let yi = y as isize;
            let dx = kernel_x[0][0] * get(xi - 1, yi - 1)
                + kernel_x[0][1] * get(xi, yi - 1)
                + kernel_x[0][2] * get(xi + 1, yi - 1)
                + kernel_x[1][0] * get(xi - 1, yi)
                + kernel_x[1][1] * get(xi, yi)
                + kernel_x[1][2] * get(xi + 1, yi)
                + kernel_x[2][0] * get(xi - 1, yi + 1)
                + kernel_x[2][1] * get(xi, yi + 1)
                + kernel_x[2][2] * get(xi + 1, yi + 1);
            let dy = kernel_y[0][0] * get(xi - 1, yi - 1)
                + kernel_y[0][1] * get(xi, yi - 1)
                + kernel_y[0][2] * get(xi + 1, yi - 1)
                + kernel_y[1][0] * get(xi - 1, yi)
                + kernel_y[1][1] * get(xi, yi)
                + kernel_y[1][2] * get(xi + 1, yi)
                + kernel_y[2][0] * get(xi - 1, yi + 1)
                + kernel_y[2][1] * get(xi, yi + 1)
                + kernel_y[2][2] * get(xi + 1, yi + 1);
            // NaN.sqrt() = NaN, NaN as u32 = 0, so NaN & 0xff = 0 — matches TS `NaN & 0xff = 0`
            let mag = ((dx * dx + dy * dy).sqrt() as u32) & 0xff;
            grad[y * w + x] = mag as u8;
        }
    }
    grad
}

/// Builds a cumulative cost matrix via dynamic programming.
/// Vertical: costs accumulate top→bottom. Horizontal: costs accumulate left→right.
/// Stored flat in column-major order: index = x * height + y.
fn compute_cost_matrix(grad: &[u8], width: u32, height: u32, orientation: &str) -> Vec<CostCell> {
    let w = width as usize;
    let h = height as usize;
    let mut cm: Vec<CostCell> = vec![CostCell { cost: 255, min_neighbor: None }; w * h];

    // Column-major index, matching TS costMatrix[x][y]
    let idx = |x: usize, y: usize| -> usize { x * h + y };
    // Row-major gradient access
    let grad_at = |x: usize, y: usize| -> u32 { grad[y * w + x] as u32 };

    // Find the minimum-cost neighbor for cell (x, y).
    // Tie-breaking: strict < means equal costs prefer the last candidate (matches TS).
    let get_min_neighbor =
        |x: usize, y: usize, cm: &[CostCell]| -> Option<(u32, u32)> {
            let mut candidates: Vec<(u32, u32, u32)> = Vec::new(); // (nx, ny, cost)
            if orientation == "vertical" {
                if y == 0 {
                    return None;
                }
                if x > 0 {
                    candidates.push((x as u32 - 1, y as u32 - 1, cm[idx(x - 1, y - 1)].cost));
                }
                candidates.push((x as u32, y as u32 - 1, cm[idx(x, y - 1)].cost));
                if x < w - 1 {
                    candidates.push((x as u32 + 1, y as u32 - 1, cm[idx(x + 1, y - 1)].cost));
                }
            } else {
                if x == 0 {
                    return None;
                }
                if y > 0 {
                    candidates.push((x as u32 - 1, y as u32 - 1, cm[idx(x - 1, y - 1)].cost));
                }
                candidates.push((x as u32 - 1, y as u32, cm[idx(x - 1, y)].cost));
                if y < h - 1 {
                    candidates.push((x as u32 - 1, y as u32 + 1, cm[idx(x - 1, y + 1)].cost));
                }
            }
            // reduce: a.2 < b.2 ? a : b — equal costs pick b (later/rightward/downward)
            candidates
                .into_iter()
                .reduce(|a, b| if a.2 < b.2 { a } else { b })
                .map(|(nx, ny, _)| (nx, ny))
        };

    if orientation == "vertical" {
        // Row by row, top to bottom
        for y in 0..h {
            for x in 0..w {
                let g = grad_at(x, y);
                let mn = get_min_neighbor(x, y, &cm);
                let cost = g + mn.map_or(0, |(nx, ny)| cm[idx(nx as usize, ny as usize)].cost);
                cm[idx(x, y)] = CostCell { cost, min_neighbor: mn };
            }
        }
    } else {
        // Column by column, left to right
        for x in 0..w {
            for y in 0..h {
                let g = grad_at(x, y);
                let mn = get_min_neighbor(x, y, &cm);
                let cost = g + mn.map_or(0, |(nx, ny)| cm[idx(nx as usize, ny as usize)].cost);
                cm[idx(x, y)] = CostCell { cost, min_neighbor: mn };
            }
        }
    }
    cm
}

/// Finds the lowest-energy seam by building the cost matrix, then backtracking
/// from the minimum-cost cell on the terminal edge.
/// Returns seam points from terminal edge back to base edge.
fn find_seam(grad: &[u8], width: u32, height: u32, orientation: &str) -> Vec<(u32, u32)> {
    let w = width as usize;
    let h = height as usize;
    let cm = compute_cost_matrix(grad, width, height, orientation);
    let idx = |x: usize, y: usize| -> usize { x * h + y };

    // Find minimum cost on the terminal edge
    // Tie-breaking matches TS: strict <, equal prefers later index
    let (mut x, mut y) = if orientation == "vertical" {
        // Bottom edge: y = h-1
        (0..w)
            .map(|x| (x, h - 1, cm[idx(x, h - 1)].cost))
            .reduce(|a, b| if a.2 < b.2 { a } else { b })
            .map(|(x, y, _)| (x, y))
            .unwrap()
    } else {
        // Right edge: x = w-1
        (0..h)
            .map(|y| (w - 1, y, cm[idx(w - 1, y)].cost))
            .reduce(|a, b| if a.2 < b.2 { a } else { b })
            .map(|(x, y, _)| (x, y))
            .unwrap()
    };

    // Backtrack from terminal edge to base edge
    let steps = if orientation == "vertical" { h } else { w };
    let mut seam = Vec::with_capacity(steps);
    let mut pos = steps - 1;
    while pos > 0 {
        seam.push((x as u32, y as u32));
        // .unwrap() is safe: non-base cells always have a min_neighbor
        let (nx, ny) = cm[idx(x, y)].min_neighbor.unwrap();
        x = nx as usize;
        y = ny as usize;
        pos -= 1;
    }
    seam.push((x as u32, y as u32));
    seam
}

/// Removes a seam from the data, returning a buffer one pixel narrower or shorter.
/// Works with any channel count: 4 for RGBA pixels, 1 for single-channel gradient.
/// Like memcpy-ing rows/columns while skipping the seam pixel each time.
fn rip_seam(
    data: &[u8],
    width: u32,
    height: u32,
    seam: &[(u32, u32)],
    orientation: &str,
    channels: usize,
) -> Vec<u8> {
    let w = width as usize;
    let h = height as usize;
    // Build a set of flat pixel indices to skip (like the TS Set)
    let seam_set: HashSet<usize> = seam
        .iter()
        .map(|&(sx, sy)| sy as usize * w + sx as usize)
        .collect();

    let (new_w, new_h) = if orientation == "vertical" {
        (w - 1, h)
    } else {
        (w, h - 1)
    };
    let mut result = vec![0u8; new_w * new_h * channels];

    if orientation == "vertical" {
        // Row by row: copy all pixels except the seam pixel
        for y in 0..h {
            let mut tgt_x = 0;
            for x in 0..w {
                if seam_set.contains(&(y * w + x)) {
                    continue;
                }
                let src = (y * w + x) * channels;
                let dst = (y * new_w + tgt_x) * channels;
                result[dst..dst + channels].copy_from_slice(&data[src..src + channels]);
                tgt_x += 1;
            }
        }
    } else {
        // Column by column: copy all pixels except the seam pixel
        for x in 0..w {
            let mut tgt_y = 0;
            for y in 0..h {
                if seam_set.contains(&(y * w + x)) {
                    continue;
                }
                let src = (y * w + x) * channels;
                let dst = (tgt_y * new_w + x) * channels;
                result[dst..dst + channels].copy_from_slice(&data[src..src + channels]);
                tgt_y += 1;
            }
        }
    }
    result
}

/// Internal resize that returns (pixels, final_width, final_height) for testability.
fn resize_inner(
    pixels: &[u8],
    width: u32,
    height: u32,
    derivative: &str,
    target_width: u32,
    target_height: u32,
) -> (Vec<u8>, u32, u32) {
    let mut img = pixels.to_vec(); // clone the input
    let mut w = width;
    let mut h = height;

    // Compute gradient once, then rip it alongside the image each iteration
    let grey = greyscale(pixels, w, h);
    let mut grad = match derivative {
        "simple" => simple_gradient(&grey, w, h),
        _ => sobel_gradient(&grey, w, h), // default to sobel, like TS
    };

    // Remove vertical seams until target width
    while w > target_width {
        let seam = find_seam(&grad, w, h, "vertical");
        img = rip_seam(&img, w, h, &seam, "vertical", 4);
        grad = rip_seam(&grad, w, h, &seam, "vertical", 1);
        w -= 1;
    }

    // Remove horizontal seams until target height
    while h > target_height {
        let seam = find_seam(&grad, w, h, "horizontal");
        img = rip_seam(&img, w, h, &seam, "horizontal", 4);
        grad = rip_seam(&grad, w, h, &seam, "horizontal", 1);
        h -= 1;
    }

    (img, w, h)
}

/// Public entry point callable from JavaScript via wasm-bindgen.
/// Takes RGBA pixels as a Uint8Array, returns resized RGBA pixels as a Uint8Array.
/// JS computes output dimensions as min(input, target) for each axis.
#[wasm_bindgen]
pub fn resize(
    pixels: &[u8],
    width: u32,
    height: u32,
    derivative: &str,
    target_width: u32,
    target_height: u32,
) -> Vec<u8> {
    resize_inner(pixels, width, height, derivative, target_width, target_height).0
}

/// One cell in the cumulative cost matrix.
/// `cost`: cumulative energy cost to reach this pixel along the minimum-cost path.
/// `min_neighbor`: (x, y) of the predecessor cell, or None for the base edge.
#[derive(Debug, Clone, PartialEq)]
struct CostCell {
    cost: u32,
    min_neighbor: Option<(u32, u32)>,
}

// The test fixture from src/algorithm/carver.test.ts — a 4×4 RGBA image.
#[cfg(test)]
mod tests {
    use super::*;

    // 4×4 RGBA test image (64 bytes = 16 pixels × 4 channels)
    const TEST_PIXELS: [u8; 64] = [
        238, 226, 86, 255, 255, 252, 96, 255, 255, 255, 109, 255, 255, 255, 117, 255,
        84, 83, 58, 255, 131, 131, 80, 255, 151, 150, 76, 255, 196, 193, 68, 255,
        73, 75, 77, 255, 68, 69, 76, 255, 41, 43, 55, 255, 30, 25, 17, 255,
        28, 28, 26, 255, 28, 29, 25, 255, 0, 0, 17, 255, 159, 138, 26, 255,
    ];

    #[test]
    fn test_greyscale() {
        let result = greyscale(&TEST_PIXELS, 4, 4);
        let expected: Vec<u8> = vec![
            219, 242, 245, 245,
            81, 127, 145, 185,
            75, 69, 43, 25,
            28, 29, 1, 135,
        ];
        assert_eq!(result, expected);
    }

    // Expected single-channel gradient values extracted from the TS test's RGBA output
    #[test]
    fn test_simple_gradient() {
        let grey = greyscale(&TEST_PIXELS, 4, 4);
        let result = simple_gradient(&grey, 4, 4);
        let expected: Vec<u8> = vec![
            0, 0, 0, 0,
            0, 123, 101, 72,
            0, 58, 105, 161,
            0, 40, 50, 173,
        ];
        assert_eq!(result, expected);
    }

    #[test]
    fn test_sobel_gradient() {
        let grey = greyscale(&TEST_PIXELS, 4, 4);
        let result = sobel_gradient(&grey, 4, 4);
        let expected: Vec<u8> = vec![
            0, 0, 0, 0,
            0, 190, 32, 252,
            35, 137, 186, 0,
            0, 0, 0, 0,
        ];
        assert_eq!(result, expected);
    }

    // Sobel gradient as single-channel — used as input for cost matrix and seam tests
    const SOBEL_GRAD: [u8; 16] = [
        0, 0, 0, 0,
        0, 190, 32, 252,
        35, 137, 186, 0,
        0, 0, 0, 0,
    ];

    #[test]
    fn test_compute_cost_matrix_vertical() {
        let cm = compute_cost_matrix(&SOBEL_GRAD, 4, 4, "vertical");
        // Spot-check key cells (column-major: index = x * h + y)
        assert_eq!(cm[0 * 4 + 0], CostCell { cost: 0, min_neighbor: None }); // (0,0)
        assert_eq!(cm[0 * 4 + 1], CostCell { cost: 0, min_neighbor: Some((1, 0)) }); // (0,1)
        assert_eq!(cm[0 * 4 + 2], CostCell { cost: 35, min_neighbor: Some((0, 1)) }); // (0,2)
        assert_eq!(cm[1 * 4 + 1], CostCell { cost: 190, min_neighbor: Some((2, 0)) }); // (1,1)
        assert_eq!(cm[2 * 4 + 1], CostCell { cost: 32, min_neighbor: Some((3, 0)) }); // (2,1)
        assert_eq!(cm[3 * 4 + 2], CostCell { cost: 32, min_neighbor: Some((2, 1)) }); // (3,2)
        assert_eq!(cm[3 * 4 + 3], CostCell { cost: 32, min_neighbor: Some((3, 2)) }); // (3,3)
    }

    #[test]
    fn test_compute_cost_matrix_horizontal() {
        let cm = compute_cost_matrix(&SOBEL_GRAD, 4, 4, "horizontal");
        assert_eq!(cm[0 * 4 + 0], CostCell { cost: 0, min_neighbor: None }); // (0,0)
        assert_eq!(cm[0 * 4 + 2], CostCell { cost: 35, min_neighbor: None }); // (0,2)
        assert_eq!(cm[1 * 4 + 0], CostCell { cost: 0, min_neighbor: Some((0, 1)) }); // (1,0)
        assert_eq!(cm[1 * 4 + 2], CostCell { cost: 137, min_neighbor: Some((0, 3)) }); // (1,2)
        assert_eq!(cm[3 * 4 + 1], CostCell { cost: 252, min_neighbor: Some((2, 0)) }); // (3,1)
        assert_eq!(cm[3 * 4 + 3], CostCell { cost: 0, min_neighbor: Some((2, 3)) }); // (3,3)
    }

    #[test]
    fn test_find_seam_vertical() {
        let result = find_seam(&SOBEL_GRAD, 4, 4, "vertical");
        let expected: Vec<(u32, u32)> = vec![(3, 3), (3, 2), (2, 1), (3, 0)];
        assert_eq!(result, expected);
    }

    #[test]
    fn test_find_seam_horizontal() {
        let result = find_seam(&SOBEL_GRAD, 4, 4, "horizontal");
        let expected: Vec<(u32, u32)> = vec![(3, 3), (2, 3), (1, 3), (0, 3)];
        assert_eq!(result, expected);
    }

    #[test]
    fn test_rip_seam_vertical() {
        let seam: Vec<(u32, u32)> = vec![(2, 3), (3, 2), (2, 1), (3, 0)];
        let result = rip_seam(&TEST_PIXELS, 4, 4, &seam, "vertical", 4);
        let expected: Vec<u8> = vec![
            238, 226, 86, 255, 255, 252, 96, 255, 255, 255, 109, 255,
            84, 83, 58, 255, 131, 131, 80, 255, 196, 193, 68, 255,
            73, 75, 77, 255, 68, 69, 76, 255, 41, 43, 55, 255,
            28, 28, 26, 255, 28, 29, 25, 255, 159, 138, 26, 255,
        ];
        assert_eq!(result, expected);
    }

    #[test]
    fn test_rip_seam_horizontal() {
        let seam: Vec<(u32, u32)> = vec![(3, 0), (2, 0), (1, 0), (0, 1)];
        let result = rip_seam(&TEST_PIXELS, 4, 4, &seam, "horizontal", 4);
        let expected: Vec<u8> = vec![
            238, 226, 86, 255, 131, 131, 80, 255, 151, 150, 76, 255, 196, 193, 68, 255,
            73, 75, 77, 255, 68, 69, 76, 255, 41, 43, 55, 255, 30, 25, 17, 255,
            28, 28, 26, 255, 28, 29, 25, 255, 0, 0, 17, 255, 159, 138, 26, 255,
        ];
        assert_eq!(result, expected);
    }

    #[test]
    fn test_resize_vertical() {
        // Resize 4×4 → 3×4 (remove 1 vertical seam)
        let (result, rw, rh) = resize_inner(&TEST_PIXELS, 4, 4, "sobel", 3, 4);
        assert_eq!(rw, 3);
        assert_eq!(rh, 4);
        assert_eq!(result.len(), 3 * 4 * 4); // 3×4 pixels × 4 channels
    }

    #[test]
    fn test_resize_noop_when_at_target() {
        // Target equals input — should return identical data
        let (result, rw, rh) = resize_inner(&TEST_PIXELS, 4, 4, "sobel", 4, 4);
        assert_eq!(rw, 4);
        assert_eq!(rh, 4);
        assert_eq!(result, TEST_PIXELS.to_vec());
    }

    #[test]
    fn test_resize_both_dimensions() {
        // Resize 4×4 → 3×3 (remove seams in both directions)
        let (result, rw, rh) = resize_inner(&TEST_PIXELS, 4, 4, "sobel", 3, 3);
        assert_eq!(rw, 3);
        assert_eq!(rh, 3);
        assert_eq!(result.len(), 3 * 3 * 4);
    }
}
