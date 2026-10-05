# Desktop motion and loading repair

Baseline: d584ee533fbed590694d54ecd857a45bb4c8e844 on codex/ascore-cloud-hero-portals. The existing Git workflow and normal Node/Vite build are retained. No hosting controls, File Manager, secrets, SMTP, database configuration, payment activation or private PDFs are involved.

## Reproduction and diagnosis

On the live throttled desktop homepage, the 3D renderer arrived after hydration, but the model was still not ready at the initial 12-second sample. The poster and unlinked labels remained through the first two scroll samples; the real 3D scene appeared later. A permanent freeze after readiness did not reproduce locally: forward/reverse scroll, the work deck, statement rotation and footer motion worked in the previous build. This release addresses delayed readiness and the premature poster handoff rather than removing the intended motion.

Profiling confirmed that the 191,112-byte model only starts downloading after the lazy renderer finishes downloading/parsing. The old Node static server does not negotiate compression; the live CDN already compresses text, but the model is delivered uncompressed and fixed public assets use no-cache. Fonts are discovered through CSS imports. Course HTML contains an empty app container, so content and hero image discovery wait for the course script. These are distinct observable bottlenecks, not a database or email issue.

## Changes

- Start model preload alongside the lazy renderer, respecting reduced motion and the existing motion/WebGL query overrides. Retain the poster until the first rendered WebGL frame. Geometry, clips, scroll distance, lighting, desktop layout and mobile styles remain intact.
- Discover the identical font stylesheets directly from the document head, with preconnects, instead of through a CSS waterfall.
- Prerender all four course routes from the existing templates. Content and navigation work before JavaScript arrives; cart actions enable only as the existing script attaches. Existing AED 50 pricing, cart feedback, validation and gated FREE order behavior remain.
- Generate Brotli/gzip representations at build time, serve negotiated static encodings and retain uncompressed MP4 range playback. The final model representation is 57,873 bytes (70% smaller); decoded bytes match the unchanged approved model.
- Add conditional ETags, immutable content-versioned course JS/CSS and five-minute public-image/model caching. API and protected PDF responses retain their existing security/cache handling; portal shells remain no-cache/noindex.

## Comparable measurements

Chrome on this Mac, 3 Mbps down, 100 ms RTT, four-times CPU throttling, cache disabled. Mobile is a viewport emulation, not a physical-phone result. These are one matched local before/after run; timing varies with network and GPU conditions.

| Viewport / page | Largest paint before | Largest paint after | Early resource transfer before | After |
| --- | ---: | ---: | ---: | ---: |
| Desktop homepage | 3.172 s | 2.212 s | 1,831,290 B | 741,348 B |
| Mobile homepage | 1.968 s | 0.984 s | 1,831,290 B | 741,348 B |
| Desktop courses | 1.136 s | 0.840 s | 288,164 B | 245,469 B |
| Mobile courses | 1.128 s | 0.808 s | 288,164 B | 245,469 B |

The model now downloads concurrently with the renderer. Course first paint itself did not improve in this sample (desktop 368 to 412 ms, mobile 364 to 424 ms), while content independence, hero paint and repeat navigation improved. Final model compression was strengthened after measurement from 64,144 to 57,873 bytes; the table retains the conservative measured sample. Live CDN compression means local percentage gains should not be presented as measured live gains.

## Validation

Normal production build passes; the pre-existing deferred-3D chunk advisory remains. Lint passes with the three existing warnings. All 38 backend tests pass, including static encoding negotiation, q=0 handling, ETag/HEAD/304, MP4 ranges, API gates and portal noindex. A final focused static-serving check covers the final header ordering.

Rendered Chrome and WebKit checks passed at desktop 1440x900 and mobile 390x844: real scene readiness, moving linked labels at three scroll phases and reverse scroll, icon animation, advancing original-video time, homepage course CTA, all four course routes, cart feedback/restoration, invalid email, FREE zero-value quote, disabled payment/delivery, public-page/portal navigation, reduced motion with no renderer/model/video fetch, and usable course content with JavaScript disabled. Repeat course JS/CSS/images transferred zero bytes from browser cache. No production order or email was created.

Machine-readable evidence: 2026-10-05-performance-measurements.json and 2026-10-05-rendered-motion.json. Local screenshots and raw profiles are in /tmp/ascore-performance-qa. Public propagation and rendered live verification are separate from Git push and are reported with the final commit.

## Hosting workflow

Pull codex/ascore-cloud-hero-portals through the existing Git integration, run the normal npm ci / npm run build / Node start workflow, or consume its tracked dist output. Keep existing production runtime settings. Do not choose build:static or alter delivery/authentication/database gates. Generated compressed representations are regenerated on every build. A Git push alone does not prove hosting deployment.
