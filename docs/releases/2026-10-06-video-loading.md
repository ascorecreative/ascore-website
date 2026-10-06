# Smaller desktop video and visible playback recovery

Baseline: `12a9952fb9f16b225b7e0314f792d11e10732376` on `codex/ascore-cloud-hero-portals`. This release changes the desktop MP4, OriginalVideoHero loading/retry behavior, its CSS, and the normal generated frontend output. Hero/3D source, mobile MP4, course storefront, Node/backend configuration and payment/delivery gates are unchanged.

## Evidence and scope

The user's affected Incognito tab displayed a blank video after an ordinary refresh and one Play click. The supplied Console screenshot showed only a Three.js Clock deprecation warning, not a media exception. A public MP4 read returned HTTP 200 and matching source bytes but transferred only 4,328,537 of 12,191,340 bytes before a 30-second timeout. This supports reducing video transfer and improving buffering presentation; it does not confirm the cause of that browser's playback failure. The source already had front-loaded metadata, so late metadata was not the identified bottleneck.

## Media quality

The desktop asset decreases from 12,191,340 to 1,694,685 bytes (86.10%). The new MP4 is 1280 × 720, H.264 Main level 3.1 / avc1, yuv420p / BT.709, with front-loaded `moov` metadata. It retains the full 411 frames at 30000/1001 fps, approximately 13.714 seconds, and the original 16:9 aspect ratio. Video encoding uses libx264 slow, CRF 24, a 1.0 Mbit/s maximum video rate and a two-second GOP. The AAC LC stereo 48 kHz stream is copied without re-encoding; decoded audio hashes match exactly.

All-frame SSIM against the source resized with Lanczos to the output resolution is 0.995516. Five paired frames at 0.5, 2.5, 5.5, 8.5 and 12.5 seconds were visually inspected, including typography, color transitions and detailed portfolio imagery. No sequence, framing or content differences were observed. This metric assesses encoding at 720p, not retention of the original 1080p pixel detail. The original is retained byte-for-byte in `media-source/hero-video-original.mp4`, outside public/dist; a second safety copy and frame comparisons are in the local QA folder. The public derivative does not claim to retain the source's signed metadata.

The normal desktop source uses `/hero-video.mp4?v=web-20261006` so existing browser cache entries do not retain the large asset. The public path remains compatible with the older legacy hero. The mobile MP4 is unchanged.

## Playback presentation

`loadeddata` and `canplay` now initiate playback without revealing the video. The poster remains visible until a presented video-frame callback confirms advancing media time; browsers without that API use advancing `timeupdate` with decoded data and active playback. Pending loads show an accessible “Loading video…” status and retain Play. Waiting/stalls restore the poster. Failed media requests show a Retry button and explanation; a native pause event cannot erase that media-error state. Retry reloads a failed media element inside the trusted click. Pause/resume, muted inline playback, lazy loading and reduced-motion manual entry remain supported.

## Verification and publication

Six focused checks passed: installed Chrome decoded-but-interrupted autoplay with native manual recovery, a held media response with visible loading/poster, a persistent HTTP 503 followed by native retry recovery, native playback and pause/resume at 144,284 bytes/s with 80 ms latency, unchanged mobile playback, and WebKit reduced-motion first manual entry. The final lower-bitrate asset subsequently passed the sustained installed-Chrome check (media time 0.221 → 6.993 seconds during an eight-second sample at the same transfer rate), pause/resume and WebKit first manual play. Some buffering remains possible. No page errors occurred. These isolated local checks do not prove playback in the user’s actual tab. Results are recorded in `2026-10-06-video-loading-browser.json`. Lint, the normal production build and whitespace checks passed; the existing three lint warnings and deferred-3D bundle advisory remain. The existing two static-server tests passed, covering media ranges and compression behavior. No broader backend matrix is required because no server source or runtime configuration changes.

Publish through the existing Git branch and normal npm ci / npm run build / Node hosting workflow, or its tracked dist output. Hosting-side automatic deployment configuration cannot be inspected through restricted Hostinger access. The user authorized production publication; no Hostinger controls or File Manager are used. A Git push alone is not proof of deployment or of playback in the affected tab. Verify public asset bytes and attempt ordinary playback in that existing Incognito tab separately; stop if public access returns 403, and do not change the disabled JavaScript/security setting.
