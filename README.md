# AirBoard MVP

Prototype web/mobile: webcam + MediaPipe Hand Landmarker + virtual ink. No backend and no API key required.

## Gestures
- Move index finger: pointer
- Pinch index + thumb: draw
- Release pinch: end stroke
- Toolbar: undo, clear, mirror, PNG

## Local test
Camera APIs need a secure context. `localhost` is accepted by modern browsers.

```bash
python3 -m http.server 8080
```
Open `http://localhost:8080`.

## Deploy with GitHub Pages
1. Create an empty GitHub repository.
2. Unzip this project into the repository root.
3. Commit/push to branch `main`.
4. In GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
5. Open the URL shown by the `Deploy AirBoard to GitHub Pages` Action.

GitHub Pages provides HTTPS, which is required for camera access on phones.

## Mobile
Open the Pages URL in Safari/Chrome, grant camera permission, and keep your hand fully visible. You can add the site to the home screen; a minimal PWA manifest/service worker is included.

## Architecture
`Camera -> MediaPipe Hand Landmarker -> pinch gesture -> stabilized fingertip -> vector strokes -> canvas overlay`

## Important MVP limitation
This version implements the hard real-time interaction layer, not handwriting-to-text AI yet. The next step should add a small backend endpoint that receives completed stroke groups or a cropped ink image and returns structured recognition (text / LaTeX / shape). Do not put permanent AI API keys in browser JavaScript.

## Suggested next milestones
- Smart recognition: text + LaTeX + shapes
- Voice context to improve recognition
- Board anchoring / perspective and presenter compositing
- Record/export WebM
- Desktop virtual camera output for Zoom/Meet/Teams
