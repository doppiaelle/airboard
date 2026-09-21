# AirBoard MVP

Prototype web/mobile: webcam + MediaPipe Hand Landmarker + virtual ink. Drawing and local recognition do not require an API key. Optional cloud refinement uses the separately deployed Worker in `api/` and asks the user for consent before sending cropped ink.

The first camera session includes a visual calibration coach with animated hand examples. It learns a local pinch/release profile, shows live framing feedback and ends with a quick gesture recap; the profile never leaves the device and the guide can be reopened from the side menu.

Session Mode groups a lesson, meeting or brainstorm into one local timeline. Mark important moments to capture the board (never the camera), then keep the session in the on-device archive or download a standalone HTML report with the final board.

## Gestures

- Move index finger: pointer
- Pinch index + thumb: draw
- Release pinch: end stroke
- Toolbar: undo, clear, mirror, PNG
- AI Board: tap a recognized glyph to choose an alternative or delete it
- Session Mode: timer, board checkpoints, local archive and shareable report

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

### Test a branch before merging

1. Open **Actions → Deploy AirBoard to GitHub Pages**.
2. Select **Run workflow**.
3. Choose the branch to test and start the workflow.
4. Open the URL reported by the deployment job.

GitHub Pages provides one public site per repository, not isolated public PR previews. A manual branch deployment therefore replaces the current Pages content temporarily. To restore production, run the same workflow again with `main`; pushes to `main` also deploy automatically.

## Mobile

Open the Pages URL in Safari/Chrome, grant camera permission, and keep your hand fully visible. You can add the site to the home screen; a minimal PWA manifest/service worker is included.

## Architecture

`Camera -> MediaPipe Hand Landmarker -> pinch gesture -> stabilized fingertip -> vector strokes -> canvas overlay`

## Privacy and cloud refinement

Camera frames are processed on-device. Math/text modes can send cropped handwriting, nearby recognized characters and stroke coordinates to the configured AI Worker after explicit consent. API keys remain in the Worker; never put them in browser JavaScript.

See `api/README.md` for Worker configuration, origin restrictions and production rate limiting.

Session titles, goals, checkpoint images and reports are stored in the browser with IndexedDB. They are not uploaded by AirBoard. Clearing the browser's site data removes the local session archive.

## Quality checks

```bash
npm run check
npm test
```

## Suggested next milestones

- Reusable session templates and agenda presets
- Rich semantic ink: LaTeX blocks and editable shapes
- Voice context to improve recognition
- Session recap and shareable lesson artifacts
- Board anchoring / perspective and presenter compositing
- Record/export WebM
- Desktop virtual camera output for Zoom/Meet/Teams
