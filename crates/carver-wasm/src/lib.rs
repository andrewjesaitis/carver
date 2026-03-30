// crates/carver-wasm/src/lib.rs

// wasm_bindgen is the bridge between Rust and JavaScript.
// The #[wasm_bindgen] attribute marks functions that JS can call.
use wasm_bindgen::prelude::*;

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
}
