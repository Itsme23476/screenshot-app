use arboard::Clipboard;
use base64::{engine::general_purpose, Engine as _};
use image::ImageFormat;
use std::io::Cursor;

#[tauri::command]
pub fn copy_image_to_clipboard(base64_data: String) -> Result<(), String> {
    let bytes = general_purpose::STANDARD
        .decode(&base64_data)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    let img = image::load_from_memory_with_format(&bytes, ImageFormat::Png)
        .map_err(|e| format!("Failed to load image: {}", e))?;

    let rgba = img.to_rgba8();
    let (w, h) = rgba.dimensions();

    let img_data = arboard::ImageData {
        width: w as usize,
        height: h as usize,
        bytes: std::borrow::Cow::Owned(rgba.into_raw()),
    };

    let mut clipboard = Clipboard::new().map_err(|e| format!("Failed to access clipboard: {}", e))?;

    clipboard
        .set_image(img_data)
        .map_err(|e| format!("Failed to copy to clipboard: {}", e))?;

    Ok(())
}
