use std::process::Command;
use tauri_build::Attributes;

fn main() {
    // docs.rs mounts the source tree read-only; tauri_build writes to gen/schemas/ which would panic.
    if std::env::var_os("DOCS_RS").is_some() {
        println!("cargo:rustc-cfg=docsrs");
        return;
    }

    // When installing from git (e.g. `cargo install --git`), the `dist` directory
    // is not present because it is gitignored. Build the frontend if necessary.
    if !std::path::Path::new("dist").exists() && std::path::Path::new("package.json").exists() {
        println!("cargo:warning=dist directory missing; building frontend...");

        let npm = if cfg!(windows) { "npm.cmd" } else { "npm" };

        let status = Command::new(npm)
            .args(["ci"])
            .status()
            .expect("failed to run npm ci");

        if !status.success() {
            panic!("npm ci failed with status: {}", status);
        }

        let status = Command::new(npm)
            .args(["run", "build"])
            .status()
            .expect("failed to run npm run build");

        if !status.success() {
            panic!("npm run build failed with status: {}", status);
        }
    }

    tauri_build::try_build(Attributes::new().capabilities_path_pattern("gen")).unwrap()
}
