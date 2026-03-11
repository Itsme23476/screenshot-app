mod commands;

use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::capture::take_screenshot,
            commands::capture::get_displays,
            commands::clipboard::copy_image_to_clipboard,
            commands::file::save_image_to_disk,
        ])
        .setup(|app| {
            // ── System Tray ──
            let capture_item = MenuItem::with_id(app, "capture", "Take Screenshot", true, None::<&str>)?;
            let dashboard_item = MenuItem::with_id(app, "dashboard", "Settings & History", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit SnapShot", true, None::<&str>)?;

            let menu = Menu::with_items(app, &[&capture_item, &dashboard_item, &quit_item])?;

            let _tray = TrayIconBuilder::new()
                .icon(Image::from_bytes(include_bytes!("../icons/32x32.png"))?)
                .menu(&menu)
                .tooltip("SnapShot – Click to capture")
                .on_menu_event(|app: &tauri::AppHandle, event| match event.id.as_ref() {
                    "capture" => {
                        let _ = app.emit("start-capture", ());
                    }
                    "dashboard" => {
                        let _ = app.emit("show-dashboard", ());
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray: &tauri::tray::TrayIcon, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let _ = tray.app_handle().emit("start-capture", ());
                    }
                })
                .build(app)?;

            // ── Hide main window from dock (it only lives in the tray) ──
            #[cfg(target_os = "macos")]
            {
                app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            }

            // ── Create overlay window (hidden by default) ──
            let _overlay = WebviewWindowBuilder::new(app, "overlay", WebviewUrl::App("/overlay".into()))
                .title("SnapShot Overlay")
                .transparent(true)
                .decorations(false)
                .always_on_top(true)
                .visible(false)
                .resizable(false)
                .skip_taskbar(true)
                .build()?;

            Ok(())
        })
        .on_window_event(|window, event| {
            // Prevent the main window from actually closing; just hide it
            if let WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
