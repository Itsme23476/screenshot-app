use base64::{engine::general_purpose, Engine as _};
use image::ImageFormat;
use std::path::PathBuf;

#[tauri::command]
pub fn save_image_to_disk(base64_data: String, file_path: String, format: String) -> Result<String, String> {
    let bytes = general_purpose::STANDARD
        .decode(&base64_data)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    let img = image::load_from_memory_with_format(&bytes, ImageFormat::Png)
        .map_err(|e| format!("Failed to load image: {}", e))?;

    let path = PathBuf::from(&file_path);

    // Create parent directories if they don't exist
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    let output_format = match format.to_lowercase().as_str() {
        "jpg" | "jpeg" => ImageFormat::Jpeg,
        "bmp" => ImageFormat::Bmp,
        _ => ImageFormat::Png,
    };

    img.save_with_format(&path, output_format)
        .map_err(|e| format!("Failed to save image: {}", e))?;

    Ok(path.to_string_lossy().to_string())
}
