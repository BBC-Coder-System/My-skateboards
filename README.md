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
5. ❌ **2026-09-30 feedback: Fire 2 doesn't work.** The strip only cycled colours and brightness/speed did nothing, so the LotusLamp X effect/brightness/speed commands are wrong for this strip. Waiting for `probe2.html` results to pick the right versions, then fix `CMD.mode/speed/bright` and Fire 2.
   **Fire 2 · Living flame** (Flow tab): runs a warm built-in effect that varies along the strip (#214 Orange flame by default; also #220, #233, #222) while the phone flickers the strip's brightness and gusts its flow speed. Depends on the new effect/brightness/speed commands above. If brightness doesn't work, the flame still moves but won't flicker.
6. Stability fixes for disconnects and frozen strobes. Check whether the drop counter in the status pill keeps climbing.
7. **Music** (phone mic) and **Motion** tabs: it's unknown whether Bluefy grants mic and motion access.

---

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

### From the LotusLamp X app. Built into index.html, not yet confirmed

| Action | Bytes | App source |
|---|---|---|
| Built-in effect NN (0–233) | `7e0703 NN 06ffff00ef` | `setSymphonyMode` |
| Effect speed SS (1–100) | `7e0702 SS ffffff00ef` | `speed` |
| Brightness BB (0–100) | `7e0401 BB 01ff0201ef` | `setRGBBrightness` (last two bytes are app type 02 / version 01) |
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

### Built-in effect list

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
