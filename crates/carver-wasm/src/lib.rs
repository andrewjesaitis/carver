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
}
