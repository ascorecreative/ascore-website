# Desktop video recovery

Baseline: 5a1c3b2519b8d19082f94cacae4a402546f2ab72 on codex/ascore-cloud-hero-portals. Only OriginalVideoHero playback recovery and its generated frontend output change. The existing Git/Node workflow is retained; no hosting controls, File Manager, backend configuration, payment/delivery gates, course behavior or private assets change.

## Reproduction

Isolated installed Chrome and Playwright WebKit on this Mac decode and play the unchanged desktop MP4 with normal muted autoplay. Its video sample entry is avc1 / H.264 Main, level 4.1, with mp4a audio. The user's own browser/profile and website-specific autoplay settings were not inspected; an unrelated Ads Manager Chrome session was left untouched. This does not establish the exact cause in that personal browser.

The confirmed component defect is its silent interrupted-autoplay recovery: when play rejects AbortError, the video can be fully decoded (readyState 4), paused at currentTime 0, with no Play control. This reproduces in both engines by injecting an interrupted autoplay outcome, while allowing native playback only for a trusted control click. The original UI requires playing, paused-by-user or a non-Abort blocked state before it renders the button, so that visitor has no recovery action. Normal autoplay and ordinary NotAllowedError recovery work in the old build; those were not claimed as reproduced failures.

The state effect also pauses the media on every cleanup, including the state update caused by a manual Play click. Before measurements show a second play request restarting an already paused element in the same click. It usually recovers locally, but creates an avoidable cancellation. The fix removes that state-change cancellation; actual inactive, hidden and manually paused states still pause, and unmount cleanup remains.

## Change

Play is now available while the active video chapter is idle, buffering, blocked or interrupted. The unobtrusive keyboard-accessible pause presentation while playing is retained. Playing state follows the media's playing event, not its earlier play event; waiting/error and a genuine playback stall restore recovery. The video element mounts without a source/poster download until the existing lazy-load condition. Manual first entry attaches the source and invokes muted inline play synchronously inside the trusted click, including reduced-motion standalone mode. Browser autoplay policy is respected.

The MP4 bytes, posters, 3D hero, animation clips/layout, mobile source selection and synchronized mobile mask remain unchanged.

## Checks

- Six desktop cases passed: normal autoplay, injected NotAllowedError and injected persistent AbortError, in installed Chrome and WebKit. Non-user autoplay remains blocked in policy simulations; native playback advances after a trusted click. Before/after screenshots show the missing control restored. These are controlled failure simulations, not evidence that the user's Safari preferences caused the failure.
- Six lifecycle cases passed: desktop/mobile keyboard pause/resume and scroll exit/re-entry in both engines, plus first-click reduced-motion manual playback in both engines. No early video source/download or automatic reduced-motion video request occurs.
- Normal build and lint pass with the three existing lint warnings and existing deferred-3D chunk advisory. Backend code is unchanged; its previous 38-test result is not presented as a new run for this frontend-only release.
- An initial ordinary live-video request timed out. One normal retry returned HTTP 206, Content-Type video/mp4, Content-Range bytes 0-1023/12191340 and exactly 1,024 bytes. Live full playback and release propagation are verified separately from Git publication when public access permits.

Evidence is in 2026-10-06-video-browser.json; local scripts/screenshots are under /tmp/ascore-performance-qa/video-*. No existing Chrome tabs/profile were connected to or modified.
