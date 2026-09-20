# AirBoard MVP

Prototype web/mobile: webcam + MediaPipe Hand Landmarker + virtual ink. Drawing and local recognition do not require an API key. Optional cloud refinement uses the separately deployed Worker in `api/` and asks the user for consent before sending cropped ink.

The first camera session includes a three-step calibration coach. It learns a local pinch/release profile and shows live framing feedback; the profile never leaves the device and can be replaced from the side menu.

## Gestures

- Move index finger: pointer
- Pinch index + thumb: draw
- Release pinch: end stroke
- Toolbar: undo, clear, mirror, PNG
- AI Board: tap a recognized glyph to choose an alternative or delete it

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

## Privacy and cloud refinement

Camera frames are processed on-device. Math/text modes can send cropped handwriting, nearby recognized characters and stroke coordinates to the configured AI Worker after explicit consent. API keys remain in the Worker; never put them in browser JavaScript.

See `api/README.md` for Worker configuration, origin restrictions and production rate limiting.

## Quality checks

```bash
npm run check
npm test
```

## Suggested next milestones

- Session mode with reusable lesson/meeting presets
- Rich semantic ink: LaTeX blocks and editable shapes
- Voice context to improve recognition
- Session recap and shareable lesson artifacts
- Board anchoring / perspective and presenter compositing
- Record/export WebM
- Desktop virtual camera output for Zoom/Meet/Teams
