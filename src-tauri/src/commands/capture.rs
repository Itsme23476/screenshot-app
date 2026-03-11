use base64::{engine::general_purpose, Engine as _};
use image::ImageFormat;
use serde::Serialize;
use std::io::Cursor;
use xcap::Monitor;

#[derive(Debug, Serialize)]
pub struct DisplayInfo {
    pub id: u32,
    pub name: String,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub scale_factor: f32,
    pub is_primary: bool,
}

#[derive(Debug, Serialize)]
pub struct CaptureResult {
    pub base64: String,
    pub width: u32,
    pub height: u32,
}

#[tauri::command]
pub fn get_displays() -> Result<Vec<DisplayInfo>, String> {
    let monitors = Monitor::all().map_err(|e| format!("Failed to get monitors: {}", e))?;

    let displays: Vec<DisplayInfo> = monitors
        .iter()
        .enumerate()
        .map(|(i, m)| DisplayInfo {
            id: m.id().unwrap_or(0),
            name: m.name().unwrap_or_else(|_| "Unknown".to_string()),
            x: m.x().unwrap_or(0),
            y: m.y().unwrap_or(0),
            width: m.width().unwrap_or(1920),
            height: m.height().unwrap_or(1080),
            scale_factor: m.scale_factor().unwrap_or(1.0),
            is_primary: i == 0, // first monitor is typically primary
        })
        .collect();

    Ok(displays)
}

#[tauri::command]
pub fn take_screenshot(
    x: i32,
    y: i32,
    width: u32,
    height: u32,
    monitor_id: u32,
) -> Result<CaptureResult, String> {
    let monitors = Monitor::all().map_err(|e| format!("Failed to get monitors: {}", e))?;

    // Find the target monitor
    let monitor = monitors
        .iter()
        .find(|m| m.id().unwrap_or(0) == monitor_id)
        .or_else(|| monitors.first())
        .ok_or("No monitors found")?;

    // Capture the full monitor
    let full_image = monitor
        .capture_image()
        .map_err(|e| format!("Failed to capture screen: {}", e))?;

    let scale = monitor.scale_factor().unwrap_or(1.0);
    let mx = monitor.x().unwrap_or(0);
    let my = monitor.y().unwrap_or(0);

    // Scale coordinates to actual pixel coordinates
    let sx = (((x - mx) as f32) * scale) as u32;
    let sy = (((y - my) as f32) * scale) as u32;
    let sw = ((width as f32) * scale) as u32;
    let sh = ((height as f32) * scale) as u32;

    // Clamp to image bounds
    let img_w = full_image.width();
    let img_h = full_image.height();
    let sx = sx.min(img_w.saturating_sub(1));
    let sy = sy.min(img_h.saturating_sub(1));
    let sw = sw.min(img_w - sx);
    let sh = sh.min(img_h - sy);

    if sw == 0 || sh == 0 {
        return Err("Selection area is too small".to_string());
    }

    // Crop to the selected region
    let cropped = image::DynamicImage::ImageRgba8(full_image)
        .crop_imm(sx, sy, sw, sh);

    // Encode as PNG to base64
    let mut buffer = Cursor::new(Vec::new());
    cropped
        .write_to(&mut buffer, ImageFormat::Png)
        .map_err(|e| format!("Failed to encode image: {}", e))?;

    let base64_str = general_purpose::STANDARD.encode(buffer.get_ref());

    Ok(CaptureResult {
        base64: base64_str,
        width: cropped.width(),
        height: cropped.height(),
    })
}
