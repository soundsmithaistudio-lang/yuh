# Packaging the app with PyInstaller

Use PyInstaller to bundle the FastAPI backend and the front-end assets so the desktop launcher can run everything from a single binary.

## Prepare the environment

1. Install dependencies (FastAPI, Uvicorn, and any model/runtime requirements):

   ```bash
   pip install fastapi uvicorn pydantic
   ```

## Build the executable

Run PyInstaller from the repository root so the data paths are resolved correctly:

```bash
pyinstaller \
  --name "lambeck-llm" \
  --onefile \
  --noconfirm \
  --clean \
  --add-data "index.html:." \
  --add-data "app.js:." \
  --add-data "styles.css:." \
  --add-data "styles_chatgpt.css:." \
  --add-data "styles_old.css:." \
  --add-data "app_old.js:." \
  --add-data "index_old.html:." \
  desktop_launcher.py
```

- The `--add-data` flags ensure the front-end files are extracted into the temporary directory referenced by `sys._MEIPASS`, which keeps the `/static` mount working for CSS and JS.
- Include any additional assets (such as model files) with extra `--add-data` entries if the application needs them at runtime.

## Running the bundle

After the build completes, launch the generated binary (found in `dist/`) directly. The launcher will start the FastAPI server and open the UI in the default browser, serving files from the extracted bundle directory.
