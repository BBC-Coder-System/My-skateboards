# My-skateboards: Board Lights

A phone web app that controls the addressable LED strip (about 2 m, **MELK-OA10** controller) mounted under my skateboard. It replaces the official **Lotus Lantern X** app, whose effects were too limited.

**Open it in the Bluefy browser on iPhone:**
https://bbc-coder-system.github.io/My-skateboards/
(Safari and Chrome on iPhone have no Web Bluetooth. Add `?v=N` to the URL to skip a cached copy after an update.)

> **Coming back to this project? Read [Current status](#current-status) and [Next steps](#next-steps) first.**

---

## Files

| File | What it is |
|---|---|
| `index.html` | **The app.** Single file, no build step. Everything (UI, BLE, effects, the 234-effect table) is inside. |
| `probe2.html` | Effect Command Finder: tests versions of the built-in effect, speed and brightness commands (on a moving effect and on a solid colour). Created because Fire 2 showed the LotusLamp X versions of these commands **don't work** on the strip (effect #214 just cycled colours; brightness and speed did nothing). |
| `probe3.html` | Fire Finder: tests hidden scenes FIRE (24) and CANDLELIGHT (4), brightness/speed on them, and whether switching Red↔Yellow Marquee keeps the dots moving. |
| `probe.html` | Guided protocol finder: taps through command variants and asks "did the strip do X?". This is how the first commands were confirmed. Reuse this pattern for any new command that needs checking. |
| `vendor/NoSleep.min.js` | NoSleep.js v0.12.0 (MIT). Keeps the iPhone screen awake in Ride mode. Stored locally so it works with no signal. |
| `test.html`, `phase3-test.html` | Early experiments. Kept for reference only. |

Deploy = push to `main`. GitHub Pages serves the repo root. No build.

---

## Current status

_Last updated 2026-09-30._

### Working on the real strip (confirmed by me)
- Connect in Bluefy, power on/off, solid colours (RGB order correct)
- Phone-driven effects (Flow / Flash tabs): smooth at about 15–20 updates/s
- Brightness slider without lag (writes are paced, see [How the app works](#how-the-app-works))

### Built but NOT yet confirmed on the strip. Waiting for my feedback
1. **Built-in effects with LotusLamp X names** (Built-in tab, 234 effects, new command `7e0703 NN 06…`). If they don't change the strip → Settings → *Built-in effect command* → *Older style* (the older command is proven to work).
2. **Strip-level brightness and speed** for built-in effects.
3. **Strip setup** (Settings): LED count and wire order. Still need to find the real LED count. Tap *Set LED count*, then watch the "Red Tail" test run end to end.
4. **Ride mode** (keeps the screen awake) and the **phone-lock hand-off** (switches the strip to a built-in effect when the phone locks).
5. **Fire 3 · Blaze** (Flow tab, new). Red marquee body + flicker/wind, plus split-second orange/amber/yellow **flares** across the whole strip every 1–5 s. The flare hides the marquee restart when it comes back, sometimes as the Yellow marquee (#208). Sliders: Flow speed, Flicker, Wind, Flares, Yellow flames. Feedback: the first version's flares "looked like camera flashes". Now they're **soft**: 0.5–1 s glow from a dim ember (`EMBER`) up to a red-orange/orange peak at 45–75% and back down (no whites, no double flash), with the ember colour sent before the brightness change. **Waiting for my verdict on the soft flares.**
   Why it's built this way (probe3, 2026-09-30): **scenes don't work on this controller** (even Forest, which LotusLamp X offers, did nothing), a moving effect **can't be recoloured**, and **switching effects restarts the pattern** (Red↔Yellow marquee swap "jumps"). Marquee #205 was my favourite base, but red alone didn't sell fire.
   **Fire 2 · Living flame** now defaults to Red marquee. Earlier notes: second attempt. First version failed (only cycled colours) because its flame effects were all in the "Other" category this strip doesn't have. probe2.html then confirmed the effect/speed/brightness commands are right. Now the base is #155 R-W-R Flow by default (choices: 156, 161, 25, 31, 89, 95, 135, 205, 200). The top Speed slider multiplies the flow speed. **Waiting for me to say which base looks most like fire**, then make it the default and tune flicker.
6. Stability fixes for disconnects and frozen strobes. Check whether the drop counter in the status pill keeps climbing.
7. **Music** (phone mic) and **Motion** tabs: it's unknown whether Bluefy grants mic and motion access.

---

### Music (built 2026-09-30, not yet tried on the strip)

My music is mostly **YouTube Music**. The strip's own mic is ruled out (it's under the board and would hear wheel rumble), and pointing a speaker at the phone mic is impractical. iOS doesn't let any app (web or native) read another app's audio, so the Music tab has three sources:
- **👆 Tempo** (default, for YouTube Music/Spotify): tap the beat 4+ times → BPM + phase lock. Synthesised kick/hat signal drives the effects. −/+ BPM, ½×/2×, nudge ±25 ms. The TAP button flashes on each beat to check the sync.
- **🎵 Player**: plays audio files from the Files app through `<audio>` → Web Audio analyser → speaker. **Sync delay** slider (default 200 ms) holds the analysis back to match Bluetooth speaker latency. The song list isn't saved across reloads (browser file access).
- **🎤 Mic**: the old phone-mic mode.
- **🎧 Auto-listen** (Tempo panel, added 2026-09-30 because I don't want to tap): the phone mic is used only to *find* the tempo and beat phase; the lights keep running on the steady beat grid, so noise can't cause random flashes. Mic → bass/mid/treble biquads → ScriptProcessor (sample-accurate; the first version polled an analyser on a 10 ms timer and locked onto harmonics like 150/82/167 for a 124 BPM track) → per-band normalised onset envelope, 8 s window at 100 Hz → autocorrelation 70–180 BPM scored with its 2× and ½× periods + mild prior around 115 → comb filter for phase. Same tempo: blend 30%/s. New tempo: must win 3 estimates in a row (song change) *and* the current tempo must stop fitting (`curFit` < 0.8), which stops flipping between metrical levels. The sample clock is re-anchored to `performance.now()` (dropped blocks made tempo read ~1% fast). `S.beatOffset` (default −60 ms, adjusted by Earlier/Later and remembered) shifts every lock. Test on a synthetic 124→100 BPM track with heavy wind noise via Chrome's fake mic: 124.3–124.5 locked after 6 s, 99.9–100.0 six seconds after the change. **Not yet tried on the real board: does Bluefy allow the mic, and does it hold up with real wind?** Tapping switches Auto-listen off.
- **Tempo timing (fixed 2026-09-30 after "uneven / wobbly" feedback, music from another device):** beats used to reach the strip 0–150+ ms late at random (30 ms sampler → next ~67 ms engine frame → rate-limit wait). Now the engine uses a self-correcting frame scheduler whose frames are **locked to the beat grid** (whole number of frames per beat, `nextFrameTime`), tempo is computed on those exact frame times, and **beat frames are `urgent`** (skip the pacing gap). Measured: pulses 1–16 ms after the beat (was 0–66 ms in the same test). Tapping uses a least-squares fit over up to 12 taps plus whole-BPM snap: average error 0.38 BPM with 8 taps (old median-gap method: 1.16).
- Beat detection = onset (sudden bass rise vs. its usual rise). The first version compared bass *level* to its average and **never fired on loud bass-heavy music**, which a real-time test caught.
- New effect **Built-in on the beat**: runs a moving built-in effect (default 7-colour running #103) and pumps strip brightness (plus an optional speed kick) on each beat.

**Native iPhone app?** Asked 2026-09-30. It would fix effects stopping when the phone locks and remove the need for Bluefy, but **not** YouTube Music audio. The only route is a ReplayKit screen-broadcast extension (Control Center, red indicator, some apps mute capture, unproven with YouTube Music). It needs a Mac + Xcode (I'm on Windows) or cloud builds, plus a $99/yr Apple developer account (free signing expires every 7 days). Decision: stay web for now.

### Diagnostics log (2026-09-30)

⚙ Settings → Diagnostics keeps a running log (last 200 lines, survives reloads): CONNECTED / DROP / RECONNECTED / GAVE UP, WRITE-TIMEOUT / WRITE-ERROR, effect changes, power, screen locked/back, brake on/off, GPS errors, and a status line every minute. Each connection line carries the context: effect, brightness, hardware brightness, update rate, packets per second, seconds connected, ms since the last write, music source, brake state and screen state. **Copy log** puts it (plus a header with build, device, browser) on the clipboard to paste to Claude. This replaces the idea of testing against the strip from the laptop: **don't script Bluetooth on the laptop** (it blue-screened once, 0x139, right after such a test; see the memory note). Laptop finding before that: all Flash effects ran 20 s with zero drops and pure-black strobing to 100% was fine, so the phone-side Flash drops point at the power bank/adapters or the phone's Bluetooth link.

### Music upgrade after "doesn't work like the official app" (2026-09-30, not yet tried on the strip)

Feedback: compared with the official Phone MIC and Device MIC, ours (Tempo tap, Tempo + Auto-listen, Phone mic) felt **late, didn't follow the music, less lively, too weak or too harsh**. What LotusLamp X actually does for a non-"drums" strip like MELK-OA10 (`SYPhoneMicFragment`, `SYMusicFragment`, `AudioToRGB`): phone mic / player → **random colour per update, brightness = loudness (5–100%), black when quiet**, sent as `7E 07 05 03 RR GG BB 20 EF` (last byte **0x20** = "music colour", ours was 0x10). `setDrums` is only for names containing `~`. Device mic = the strip's own modes 128–135 (`7e0703 MM 04ffff00ef`, sensitivity `7e0706 SS ffffff00ef`).
What changed:
- **Automatic gain per band** (`agcNorm`: divide by a ~10 s decaying peak, 15% noise gate), so quiet and loud sources look the same (test: a track at 6% volume gave the same brightness range as full volume). Old fixed gains were the "too weak / too harsh". Default sensitivities are now 1.0.
- **Music colour flag 0x20** on colour frames of music effects (Settings → Music colour packets to switch back to 0x10 if it looks wrong).
- **Lower latency** in Phone mic / Player: analyser smoothing 0.5 → 0.15, and a detected beat immediately runs a frame (`kickFrame`) instead of waiting up to ~67 ms.
- New effect **Party (official style)**: random colour every update (or every beat), brightness follows loudness, no colour churn in silence.
- **Tempo + Auto-listen is now a hybrid**: exact beat timing from the grid, but each beat's strength (learned per position in the 4-beat bar from the 220 ms after each beat) and the mids/highs follow the real sound, and the lights calm down when the music stops. **Tap-only Tempo can't hear the music, so it can't follow dynamics** by design.
- New source **🎙 Strip**: the controller's own mic modes (Energy/Rhythm/Spectrum/Scroll 1 and 2) + sensitivity. No Bluetooth delay, moves along the strip, keeps running with the phone locked, but hears the wheels. Commands from the app, **not yet confirmed on the strip**.

### Brake light (built 2026-09-30, not yet ridden)

Motion tab → 🛑 Brake light. Cruising = the current effect plays normally; when speed drops fast the strip turns full-brightness red (Style: 3 blinks then solid, or solid), and the effect is restored afterwards. Works over solid colours, phone-driven effects, built-ins and Fire 2/3/beat effects (it sets full brightness, then `restoreOutput()` puts everything back). Never pure black (see the disconnect note).
- **GPS** (`watchPosition`, `coords.speed`, distance fallback): brake when speed was ≥ 2 m/s (7 km/h) and slowing ≥ `brakeThr()` m/s² (Sensitivity 7 → 1.7; 10 → 1.0; 1 → 3.2), or stopped. GPS is ~1 Hz, so alone it's 0–1 s late.
- **Fast mode** (default on): motion sensor + GPS. At every GPS fix the phone's mean linear acceleration is regressed on the GPS acceleration → learns the phone's "forward" axis with no calibration (decays 3% per informative fix so a shifting phone is re-learned; sanity ratio 0.5–1.8). Then forward deceleration < 1.2× threshold for 150 ms while GPS speed ≥ 2 m/s → brake. Simulated: axis learned to within 0.01 of the truth; hard brake detected after **242 ms vs 740 ms** with GPS only; 0 false alarms in 8 s of noisy cruising.
- Release: 0.9 s after braking stops (min 1.3 s on), 4 s after coming to a stop, or if GPS goes silent for 5 s.
- Needs the page alive: **screen on (Ride mode)**, location allowed for Bluefy, motion access (tap Ride mode or the toggle). GPS speed accuracy, Bluefy's location permission and how well fast mode works with a phone in a pocket are **untested on the real board**. Try: ride, brake hard, check the speed readout and whether the light lags. If fast mode false-alarms, set it to GPS only.

### Flash tab disconnect loop (2026-09-30)

All Flash effects (Strobe, Police, Alternate/Random, Heartbeat) made the strip disconnect and reconnect repeatedly. Flow effects were fine. Power: 5000 mAh USB-C power bank → C-to-C L adapter → C-to-A adapter → strip's USB-A plug. Suspects: (1) the controller mishandles colour 0,0,0 and resets; (2) the power bank cuts out at near-zero load or on big current swings. Fix so far: `colorHex` never sends pure black; it sends a faint glow (`DARK_FLOOR` = 4) of the last lit colour. **If drops continue**, especially on Alternate (which never goes black), it's power: test at 40% brightness, then try another power bank or a direct cable.

## Next steps

Agreed order (from "what can we take from LotusLamp X"):

1. ~~Strip setup: LED count + wire order~~ (done, waiting for the test above)
2. **Device-mic rhythm modes.** Use the controller's own microphone. 8 modes, run on the strip, keep working with the phone locked. Commands already decoded below ([next feature](#decoded-but-not-built-yet)). Build as a new section on the Music tab.
3. **Carousel.** The strip cycles through up to 6 effects on its own (`AUTO_CAROUSEL`, cmd `0x16`). Payload not decoded yet. Starting point: `BlePackagingDevice.java` near the `AUTO_CAROUSEL` sender.
4. **Custom effects stored on the strip (per-LED "Scene DIY").** ⚠ LotusLamp X does *not* enable this for MELK-OA, so the firmware probably lacks it. Only worth a quick probe test. Format if tried: start `7E 32 lenHi lenLo sumLo sumHi FF FF EF`, colour packets `7E 33 R G B R G B idx` (2 LEDs each), end `7E 34 mode gradient speed FF FF FF EF`. Modes 0 static, 1 breathe, 2 strobe, 3/4 flow, 5/6 close/open, 7/8 chase, 9/10 stacking. Commands `START_SET_SCENE_DIY` (0x32), `SET_SCENE_DIY_COLOR` (0x33), `END_SET_SCENE_DIY` (0x34), `SET_POINT_COLOR` (0x58). This is the most work and gives the most: my own moving effects running with the phone locked.
5. Small: read the strip's status notifications on connect so the UI matches the real state.

Skip: timers, the built-in music player, groups, horn mode (not useful on a skateboard).

Longer-term idea if phone-driven effects must keep running with the phone locked: an ESP32 on the board running effects by itself.

---

## Protocol

BLE service `0000fff0-…`, write characteristic `0000fff3-…`, write-without-response. Every frame is 9 bytes:

```
7E  len  cmd  p1 p2 p3 p4 p5  EF      unused params padded FF … 00
```

`len` is `07` for almost everything (`04` for the power and brightness forms below). The device name as seen in Bluefy is `MELK-OA10   17`. On connect the app sends the wake-up `7e0783`, then `7e0404`.

### Confirmed on the strip (probe.html)

| Action | Bytes |
|---|---|
| Power on / off | `7e0404f00001ff00ef` / `7e0404000000ff00ef` |
| Colour | `7e070503 RR GG BB 10ef` |
| Built-in effect, older form | `7e0503 NN 03ffff00ef` (NN=`9c`=156 moved along the strip) |

These did **not** work in the probe: brightness `7e04010a01ffff00ef`, `7e04010affffff00ef`, `7e00010a00000000ef`; speed `7e0402…`.

### From the LotusLamp X app. Effect, speed and brightness ✅ confirmed with probe2.html (2026-09-30)

| Action | Bytes | App source |
|---|---|---|
| Built-in effect NN (0–212 on this strip) ✅ | `7e0703 NN 06ffff00ef` | `setSymphonyMode` |
| Effect speed SS (1–100) ✅ | `7e0702 SS ffffff00ef` | `speed` |
| Brightness BB (0–100) ✅ on effects and solid colours | `7e0401 BB 01ff0201ef` | `setRGBBrightness` (last two bytes are app type 02 / version 01) |
| LED count N (10–1000) | `7e0721 LL HH 00ff00ef` (low byte first) | `pointSetting` |
| Wire order | `7e0781 a b c ff00ef`, R=1 G=2 B=3 (GRB → `02 01 03`) | `lineOrder` |

### Decoded but not built yet

For step 2 (device-mic rhythm):

| Action | Bytes | App source |
|---|---|---|
| Device mic on / off | `7e0707 01 ffffff00ef` / `7e0707 00 ffffff00ef` | `setMicOpen` |
| Mic rhythm mode MM | `7e0703 MM 04ffff00ef` | `symphonyMicRhythmMode` |
| Mic sensitivity SS | `7e0706 SS ffffff00ef` | `sens` |

Mic modes (`ELKSymphonyMicRhythmMode`): 128 Energy 1, 129 Rhythm 1, 130 Spectrum 1, 131 Scroll 1, 132 Energy 2, 133 Rhythm 2, 134 Spectrum 2, 135 Scroll 2. The order in which the app sends on / mode / sensitivity isn't checked yet. See `ui/symphony/SYMicFragment.java`. Build a probe-style yes/no test for these first.

### Scenes (not built yet)

LotusLamp X sends `7e0731 SS 07ffff00ef` (`setSymphonyScene`). For MELK-OA it offers only Party 6, Romantic 9, Rainbow 11, Forest 17, Lightning 25 (screen `SYInternalFragment`; also effects 199 and 212, and `setMonochrome`). The full `ELKSymphonyScene` list also has Sunrise 1, Sunset 2, Birthday 3, Candlelight 4, Fireworks 5, Dating 7, Starry sky 8, Disco 10, Movie 12, Christmas 13, Flowing 14, Sleeping 15, Ocean 16, Reading 18, Working 19, Dazzle 20, Gentle 21, Wedding 22, Snow 23, **Fire 24**, Valentine 26, Halloween 27, Warning 28, Running 100, Time machine 150. **probe3 result: none of them work on this controller** (17 Forest, 24 Fire, 4 Candlelight all "no change"). Don't spend more time on scenes.

### Built-in effect list

**The "Other" category (213–233) is NOT available on this strip.** LotusLamp X only shows it when the first two digits of the device name are ≥ 21 (`isSupportedOtherSpecialMode`); ours is "MELK-OA**10** 17". Sending one of those numbers makes the strip fall back to cycling colours, and brightness then does nothing. The app hides "Other" automatically based on the connected name.

234 effects in 9 categories, stored as `SY_MODES` in `index.html` (copied from the app's `sy_mode_name_*_array` / `sy_mode_cmd_*_array` resources): Basic 47, Running 34, Run back 34, Water 18, Tail 16, Flow 24, Transition 20, Open/close 20, Other 21. Numbers are 0–233 with no gaps. I fixed one mislabelled pair in the app's data (178 / 180). Old app numbering "#m" = effect `128 + m` (so old #28 = 156 "R-W-R Flow Back").

---

## How the app works

Things that look odd but are deliberate:

- **Write pacing + coalescing** (`pump()`): the controller only handles about 17–20 packets/s. Writes-without-response resolve instantly on the phone, so unpaced slider drags queued up and lagged. Now there's one write in flight, a minimum gap of `1000/fps` ms, commands queued in order, and colours/brightness/speed are "latest value wins" (`pendingColor`).
- **Write watchdog**: 600 ms timeout so a stuck write can't freeze the queue.
- **Adaptive rate**: default 15 updates/s. Each unexpected disconnect lowers it by 2 (min 10). The status pill shows the drop count.
- **Flash rate caps** (`maxRate`): every on/off phase must last at least 2 frames, otherwise strobes alias into a solid colour. The cap accounts for the Speed multiplier.
- **Brightness**: phone-driven colours are dimmed by scaling RGB (squared curve). Built-in effects use the strip's brightness command. It's reset to 100 when leaving a built-in so the two don't stack.
- **Fire 2 / effects with `start` + `drive`**: instead of streaming one colour, these start a built-in effect as the base (`start`) and then adjust strip brightness/speed every tick (`drive`). This is the only way to get variation along the strip: **LotusLamp X offers no per-LED Scene DIY for MELK-OA** (`LPHelper.isSupportedScenesDIY` lists only MELK-OD/OE/OF/OG/OH and a few others). Fire 1 · Flicker is the original whole-strip version.
- **iPhone lock**: iOS freezes the page, so phone-driven effects stop. Two answers: *Ride mode* (NoSleep + black overlay that swallows pocket taps, hold the ring 1.5 s to exit) and the *lock hand-off* (on `visibilitychange`/`pagehide`, send the chosen built-in effect immediately, bypassing the pacing timer).
- **Auto-reconnect** with backoff, then re-send the wake-up and the current state.
- **Storage** (localStorage, per phone): `fps`, `bright`, `params`, `favs`, `fxStars`, `fxCat`, `hwSpeed`, `legacyFx`, `lockAction2`, `lockFx`, `pixels`, `wires`. The controller can't be read back (yet), so the LED count shown is "last set from this phone".

### Testing without the strip

Headless Chrome on the PC with a fake `navigator.bluetooth` that records every written packet. Inject a stub script at the start of `<head>` and a test script at the end, then run `chrome --headless=new --virtual-time-budget=20000 --dump-dom` and read the result out of a `<pre>`. This catches wrong bytes and runtime errors. Real behaviour (timing, iOS lock, Bluefy permissions) still needs a ride.

---

## Reverse-engineering notes

- The iPhone app is "Lotus Lantern X". Its Android twin that supports MELK devices is **LotusLamp X** (`com.szelk.ledlamppro`, v5.19.14, from APKPure). The plain "Lotus Lantern" (`wl.smartled`) app has **no** MELK support. Don't use it.
- Decompiled with **jadx 1.5.6** plus a portable Temurin JRE 21 (nothing installed system-wide). `--no-res` for code, `--no-src` for resources (`res/values/arrays.xml`, `strings.xml`).
- Key places in the decompiled code:
  - `util/LPHelper.java`: device name → type. `MELK-O…` without W/WCT → `SYMPHONY` (30).
  - `ble/device/connect/BlePackagingDevice.java`: every command sender (`setSymphonyMode`, `speed`, `setRGBBrightness`, `pointSetting`, `lineOrder`, `symphonyMicRhythmMode`, …).
  - `ble/achieve/E1Achieve.java`: 9-byte frame builder (`len` 7 by default, 4 for brightness).
  - `AppConstant.java`: `ElkCMD` command codes, `BleDeviceType`, mic rhythm modes.
  - `ui/symphony/`: the screens for this strip type (mode, mic, DIY, scene, timing).
- Also useful: [Tech-Morph/Lotus-Lantern-HA](https://github.com/Tech-Morph/Lotus-Lantern-HA), [dave-code-ruiz/elkbledom](https://github.com/dave-code-ruiz/elkbledom).

---

## Working notes

- I don't read hex. To confirm a new command, give me a tap-and-answer page (like `probe.html`) instead of asking for byte codes.
- Push to `main` after each change (it deploys). Remind me to reload with `?v=N`.
- Custom phone-driven effects change the whole strip at once. Anything that moves along the strip comes from built-in effects (or, later, Scene DIY).
