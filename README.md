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
4. **Ride mode** (keeps the screen awake) is untested. ✅ **Phone-lock hand-off confirmed 2026-09-30:** with the lock effect set to Magic Forward (#1), the strip showed a slow rainbow for the whole 112 s the iPhone was locked, and the Bluetooth link stayed up.
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

### Follow the volume + new music effects (2026-09-30)

Feedback after the fast-write fix: lag was random + choppy + constant delay (all consistent with 3–5 acknowledged writes/s); "when the song gets quieter the lights should **dim with the volume**"; favourite = **one colour, or one built-in effect, that glows and dims with the music**, plus new effects "for style and aesthetic".
- **Loudness: Follow the volume (default) / Auto level** in the Music tab (+ Reset volume reference). The analyser's byte values are on a **decibel scale** (0..1 = 70 dB), so simple ratios barely moved when the volume dropped (16 dB quieter looked ~25% lower). Follow mode works in dB: reference = loudest recent level easing down ~0.18 dB/s, output = 10^(dB/32) (16 dB quieter ≈ a third as bright, ~35 dB below = silence). Test (10 s loud / 10 s quiet at −16.5 dB, Volume pulse): follow: loud avg 89 / quiet 33; auto: 132 / 109.
- New effects: **Glow drift** (palette drifts slowly — Aurora/Sunset/Neon/Ember/Ocean — brightness glows with loudness, lift on beats) and **Twin pulse** (two colours swap on each beat with a glide, bar-start hits harder).
- Volume pulse roughness is now 2.7 (was 11.6 at the start of the rework).

### Regression suite (2026-10-01)

`tests/` holds an automated suite (63 tests, 375 assertions, ~2.5 min) built by a QA agent: the real index.html in headless Chrome against a fake strip, **no real Bluetooth**. Run it before every push (`tests/README.md`). Its first real catch (when I ran it myself): **a stale colour frame could be sent right after the power-off command** (a frame computed just before was still queued, and on some controllers a colour command could switch the strip back on) → `togglePower` now clears the pending frame and brightness/speed slots, and the pump sends no frames while the power is off (build "review3").

### More review fixes (2026-10-01, build "review2")

Second batch from the same review, each verified in the simulator: **audio after a lock** (iOS reports the AudioContext as `interrupted`, not `suspended`; it is now resumed whenever it is not running and created inside the tap); **favourites** are merged over today's effect defaults and cloned (a parameter added later used to be `undefined` → NaN bytes, and moving a slider silently edited the saved favourite; unknown effect ids are ignored); **lock hand-off keeps your brightness** (phone-driven effects dim in RGB and keep the strip at 100%, so the hand-off now sends the brightness first and restores 100% on return; an 'Other' lock effect the strip doesn't have falls back to #156); **Built-in speed slider** is now sent when a built-in is chosen; **a drop is counted once** and drops around a screen lock no longer lower the update rates for good; the log's throttle works for error lines; **the microphone is released** when Auto-listen is off (iOS mic indicator), the idle audio sampler no longer runs when nothing listens, Auto-listen can't start two timers, the ride wake lock is released, motion permission can't add two listeners, commands queued while disconnected are dropped on reconnect, a slow permission prompt can't override a later choice, and the log copy fallback works on iOS.

### Fixes from the agent code review (2026-10-01, build "review1")

A fresh-eyes review agent found these; each was reproduced before fixing: (1) after tapping **Disconnect** the status pill could never reconnect (`userDisconnect` blocked the loop; only a reload helped) → `onPillTap` clears it; (2) **at 8–12% brightness the chosen colour was replaced by the last lit colour** (the black-glow rule triggered for any max channel < 4, not only true black; red at 10% after cyan sent cyan) → dim colours are scaled up to the floor, only true black uses the last lit colour; (3) Auto-listen's tempo blend changed `S.bpm` without re-anchoring `tempo.t0`, so the beat phase jumped as time passed (0.45 beat after 5 min for a 0.09 BPM change) → phase is kept continuous; (4) **speed commands starved behind brightness** (the slots share one gap and brightness outranked speed: Fire winds/slider speed and the speed restore after a kick never went out; committed version: no speed packet in 1.8 s, fixed: 0.39 s) → a speed command that has waited 250 ms goes first; (5) `tick()` cleared the beat `urgent` flag when the pulse sat in a slot → condition now includes the slots.

### Queue backlog: stale brightness/speed commands (2026-10-01)

User theory: off-beat landings happen mostly with effects that include dimming; the phone is sending effect data while the beat pulse gets stuck behind it in the queue, so the pulse arrives late. **Confirmed as a design flaw:** brightness and speed commands went through a strict FIFO (`cmdQueue`), none dropped even when superseded, and the strip digests them slowly (LotusLamp X spaces them 100 ms apart; only music colour frames go 10 ms apart). Built-in on the beat and the Fire effects sent ~12–15 of them per second. Modelled strip (100 ms per brightness/speed command, 4 ms per colour): old code → backlog grew without bound (waits of 19–25 s in the simulation); new code → 6 slow commands/s and waits of 0.14 s (p50) / 0.23 s (p95), bounded. The 100 ms is an assumption from the official app's spacing, not measured on the strip.
Fix (build "queue"): brightness and speed are **latest-wins slots** (`slot.bright`, `slot.speed`; a newer value replaces an unsent older one), gated to `S.slowGap` (default **120 ms**, Settings → Dimming gap; in the slow-strip model 50 ms → unbounded backlog, 90 ms → right at the limit with waits creeping to ~1 s, 140 ms → stable at 0.1–0.17 s), priority brightness > colour frame > speed; a beat's brightness pulse (`urgent`) ignores the gap and goes first. Log music line adds `writeMs=p50/p95/max` (how long each write took to hand off) and `slowCmds/s`. **Pulse on now also works for Phone mic and Player** (`detDiv`: median gap of detected onsets as the tempo estimate, hits on the louder of the alternating onsets, bass reshaped into one pulse per hit; simulated 124 BPM: hits 41 → 21 with Auto); the control moved out of the Tempo panel into the shared area.

### Pulse on every 2nd beat (2026-10-01)

User finding: on fast songs, pressing ½× (140 → 70 BPM) makes the lights "handle it much better": it keeps the feel of the beat but each effect hits much harder. With Auto-listen on, ½× is undone when the detector re-locks, so it is now a proper setting: Tempo panel → **Pulse on** (Auto / Every beat / Every 2nd / Every 4th). `beatDiv()`: tempo stays exact, only every Nth beat is a hit (`audio.beat`/`beatCount`, so Beat hop hue steps and Twin pulse swaps also happen per hit), and the synthetic pulse is shaped over the divided period (`hfrac = (x − lastHitIdx)/div`) so each one lasts twice as long at half time. **Auto** (retuned 2026-10-01 after the user found Auto "flashes along the beat much closer and corrects itself fast when it goes off beat", and that anything above ~100 BPM goes off-beat too often): ≥100 BPM → every 2nd beat, <95 → every beat, 95–100 keep the last choice, ≥180 → every 4th. Which beats are the hits follows the louder beats of the bar learned in hybrid mode (`tempo.hitPhase`). Tempo mode only (Phone mic and Player pulse on detected onsets). Simulated 124 BPM with Auto-listen: every beat = 4.0 reversals/s, every 2nd = 2.0/s with lower roughness (mpulse 6.0 → 4.0). The log's music line shows `div=`.

### Beats landing late / too fast: the official app's pacing (2026-09-30)

User feedback on Tests 1–3: lights try to land on every beat but seem too fast at 124–140 BPM and keep up better at 100 BPM, sometimes off-beat; quiet/loud contrast is visible; Glow drift/Twin pulse look good and follow the music but are not smooth when looked at directly (fine as a reflection on the ground); acknowledged writes "couldn't catch up at all", fast writes "much better but far from perfect"; user suspects the strip can't handle that many signals. **Decompiled LotusLamp X (`BlePackagingDevice.modifyDelayTime`/`command`) spaces normal colour commands 100 ms apart but colour commands sent with the music marker (`…20 EF`, `isColorCMD = false`) only 10 ms apart.** So the controller is built to take music colours far faster than ordinary ones, and our ~20/s (50 ms steps) was probably too *slow*, not too fast.
Changes (build "musicfps"): separate **Music update rate** (Settings, default 30/s, 15–60; `effFps()`), used only when the 0x20 marker is on (with the normal marker music effects are capped at ~12/s like the official app's normal colours); automatic back-off (−5/s after 3 write timeouts in 10 s, −10/s after a drop); experimental **Fast colours for every effect** switch (0x20 + music rate for all streamed colour effects; may smooth Rainbow/Fire/etc.); hybrid tempo mids/highs are low-passed (0.12 s attack / 0.3 s release) so each hat/snare no longer adds a bump, and `audio.level` weights the beat more (0.85 bass); pump slack 4 ms. Simulated 124 BPM (before → after): Volume pulse 14.7 → 27 packets/s, roughness 4.2 → 2–3, exactly one pulse per beat (4.0–4.1 reversals/s), peak brightness 97 → 143. **To verify on the phone:** compare 20 / 30 / 45 / 60 music frames/s with the test track and read `pps` and any `WRITE-TIMEOUT` in the log.

### Test 1 result on the iPhone (2026-09-30 23:21–23:26, build "follow") and the follow-up fixes

Same test track, Tempo + Auto-listen, Volume pulse, write=fast, fps 20. **Good:** pps 18.5–19.3 (was 3–5), no drops, no write timeouts; tempo 124.6 → 109.6 → 100.0 → 139.3–139.6 → 124.5, re-locking within ~8–10 s each time. **Problems:** (1) around 23:23:00 a broadband spike lifted the volume reference (0.22/0.10/0.05 → 0.50/0.54/0.41) and the strip stayed nearly dark (sentAvg 8–33) for ~1 minute while it eased back; (2) in the loud/quiet section the brightness rose slowly (46 → 108) and never alternated, and `calm` didn't alternate either, so the phone's mic path shows **no loud/quiet differences** (raw mids ~0.03 = about −98 dB, at the analyser's floor). Suspects: iOS microphone processing and/or a Windows sound enhancement on the laptop (Loudness Equalization); not yet distinguished.
Fixes (build "robust"): the follow-mode reference now **rises with a 1.5 s time constant** (a 120 ms noise burst moves it ~8% instead of ~51% in the simulation); **Mic gain** setting (default +12 dB, a gain in front of the analyser only) lifts quiet music off the floor; the music log line now reports `raw10sMax`, `raw10sAvg` (per band over the last 10 s), `ref` and `micGain` instead of single instantaneous samples, so the next run can show whether loud and quiet sections differ at the phone's mic. Simulated mic without any level processing shows the expected difference (mids max 0.70 loud vs 0.47 quiet), so the app logic is fine.

### Root cause of the remaining music lag (2026-09-30 22:04 log from the iPhone)

Test-track run (`test-audio/board-lights-test-track.wav`, Tempo + Auto-listen, Volume pulse): **tempo detection was excellent** (124.3–124.6 for the 124 BPM parts, 109.5 for 110, 100.0, 139.6, back to 124; re-lock 8–13 s after each change). But **`pps` was 3–5** with ~45 `WRITE-TIMEOUT` lines in 4 minutes: **acknowledged writes take ~250 ms (sometimes >600 ms) each on the iPhone**, so only ~4 colour updates reached the strip per second (also why Built-in on the beat's brightness pulses looked unreactive). A simulated strip with 250 ms acks reproduces it: 3 packets/s acknowledged vs 14.5/s fast. **Bluetooth write mode now defaults to Fast** (write without response; iOS flow-controls it itself). Acknowledged mode stays as an option. The music log line now also shows `sentAvg/Max` (brightness of the colours actually sent), `rawBands` (before automatic gain), `agcPeak` and `calm` to diagnose the "volume dropped but brightness stayed the same" observation.

### Test track for music checks (local file, not in git)

`test-audio/board-lights-test-track.wav` (generated by a script, 3:55, ignored via .gitignore). Play it from the laptop's own speakers at low volume with the phone next to them, Music → Tempo → Auto-listen on, then Copy log and compare with the truth below (the log's `music` lines are every 10 s):
- 0:00–0:05 silence · **A 0:05–0:50** 124 BPM full range (kick accents 1 / .6 / .85 / .6 per bar) · silence
- **B 0:55–1:40** 110 BPM **mids only** (no bass; simulates small speakers, the case that made Spectrum green) · silence
- **C 1:45–2:15** 100 BPM, **2:15–2:45** 140 BPM (tempo change; check the re-lock time)
- **D 2:50–3:50** 124 BPM alternating loud (0:10) / quiet (0:10) three times (check that the automatic gain keeps effects full-range)

### Music effects smoothing rework (2026-09-30)

Feedback on the music upgrade: Auto-listen works well; Volume pulse and Beat strobe "jaggy, laggy, stuttery"; Beat hop's colour changes not smooth; Spectrum "almost always green" (laptop speakers = mids only); Built-in on the beat "didn't react to the song, only speed changed"; Party "just keeps changing colours". Causes and fixes:
- Effects faded by a fixed factor **per frame** (×0.6, ×0.85…), only 2–3 visible steps at ~20 fps and uneven when frames are late → now **time-based envelopes** (`follow`/`decay`/`frameDt`: fast attack, slower release in real seconds).
- Beat hop and Party jumped hue instantly → hue now **glides** (time constant 0.08–0.12 s, adjustable). Party defaults to a new colour **every beat** (the constant "official" mode is an option, limited to every 150 ms).
- Spectrum showed the mids as a level → **whitened bands** (each band vs its own ~4 s average), so sustained mids sit low and only what changes lights up.
- Built-in on the beat: pulse floor 30% → 8% with a 1.8 gamma; the old 30–100% swing is barely visible on LEDs.
- Test on a synthetic 124 BPM track through Auto-listen (before → after): Volume pulse roughness 11.6 → 5.0; Beat hop roughness 20.6 → 12.2 and biggest hue step per 50 ms 120° → 34°; Party hue steps over 40° per second 12.4 → 1.5; Spectrum green-dominant 9% → 5% with red/blue now sharing the load, roughness 25.8 → 23.6; Built-in on the beat brightness range 39–100 → 5–100. **Beat strobe is unchanged** (its flash is sharp by design; the metric can't tell).
- New Settings → **Bluetooth write mode** (acknowledged vs fast) to A/B whether acknowledged writes (~2 connection intervals each on iOS) cause the remaining stutter. Music lines in the diagnostics log every 10 s (`music … bpm= auto=locked conf= beats/10s= level= bands= pps=`) so a test track with a known tempo can be checked against what the phone detected.

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

All Flash effects (Strobe, Police, Alternate/Random, Heartbeat) made the strip disconnect and reconnect repeatedly. Flow effects were fine. Power: 5000 mAh USB-C power bank → C-to-C L adapter → C-to-A adapter → strip's USB-A plug. Suspects: (1) the controller mishandles colour 0,0,0 and resets; (2) the power bank cuts out at near-zero load or on big current swings. Fix so far: `colorHex` never sends pure black; it sends a faint glow (`DARK_FLOOR` = 4) of the last lit colour. **Result 2026-09-30 21:03 (diagnostics log from the iPhone):** Strobe, Police, Alternate and Heartbeat ran back to back for ~1 min at update rate 20 with **no drops and no write timeouts** (one connection, up 57 s), and the user reported noticeably faster response overall. Promising but short: keep the log on and watch for drops over longer use. The power-bank test can wait unless drops return. **If drops continue**, especially on Alternate (which never goes black), it's power: test at 40% brightness, then try another power bank or a direct cable.

### Stage 1 (build `2026-10-01 ride1`): Ride home screen + layout cleanup
- New first tab **Ride**: Now playing, favourites as big tiles (4 starter picks until you star something), Brake and Music one-tap toggles, big Dim/Bright slider, power + **Start riding** (Ride mode).
- Tabs renamed: Ride, Colour, Flow, Flash, Music, Brake (was Motion), Strip (was Built-in). Every effect tile has a star (☆/★) to add/remove it from favourites.
- Settings is now a full-screen sheet with folds: Everyday (lock behaviour, night dimmer, disconnect), Your strip, Music speed, Fix problems (advanced; "Dimming gap" is now "Fade pacing"), Diagnostics. All element IDs kept.
- Effect settings are a bottom sheet with a collapse button. Music tab: tuning controls folded away. Connection banner + dimmed controls when offline. Night dimmer veil. Pinch zoom allowed, 44 px minimum tap targets, aria labels.
- Test status: 63 tests/375 assertions pass; layout checked by screenshots at 390x844 (no horizontal overflow).

### Stage 2 (build scenes1): Scenes
- Ride tab has a Scenes grid (Night Ride, Blaze, Party, Sunset cruise, Neon Alley, Storm, Police, Parked glow). A scene sets effect + brightness (+ brake light). Hold a tile 0.7 s to overwrite it with what is playing now (stored in localStorage sceneOv, marked with a pencil). Scenes whose effect does not exist are skipped, so new styles just add entries to SCENE_DEFS.

### Stage 3 (build styles1): Neon Tube + Storm (Flow tab)
- Neon Tube: glowing sign with a faint hum, random stutter bursts every few seconds (minimum stutter length scales with the update rate so it stays visible). Storm: slowly swelling violet sky, 2-4 lightning hits per strike in blue-violet (never white), last hit the biggest.

### Stage 4 (build ride-aware1): Velocity + Airtime (Brake tab)
- Velocity (needs GPS; selecting it also switches the brake light on, they share one GPS watch): cyan -> blue -> violet -> magenta -> red with speed, pulse quickens with speed, short brightness kick on a forward push. Indoors (no GPS fix) it stays calm cyan.
- Airtime (motion): while |acceleration| < 3.5 m/s2 for 120 ms+ it drains to a faint violet glow; landing (>14 m/s2) blasts orange-red and decays in ~0.35 s, the landing frame is sent urgent.
- Tests are simulated-clock tests; the real behaviour on a ride is untested.

### Stage 5 (build stage5): Aurora, Synthwave, Carve, Parked glow
- Aurora and Synthwave are new Flow effects; Carve (Brake tab, motion) flushes magenta/cyan by turn side using the gyro turn rate about the gravity axis (there is a Left/Right swap in its settings because the sign depends on how the phone sits). Scenes added: Aurora cruise, Synthwave, Carve.
- Parked glow (Idle Governor): Settings > Everyday > Parked glow (default Off). After the board is still (GPS speed under 1 m/s, else motion energy) for 5/15/60 s, colour effects fade to dim amber, then a faint heartbeat every 10 s after 2 minutes; moving snaps back. Music effects and built-ins are not touched. Needs GPS (brake light / Velocity on) or motion to know it is still; otherwise it never dims.
- NOT built, on purpose: Tron Runner (needs a verified blue/cyan and orange running built-in; the strip's known running modes are only red/yellow/7-colour, so it would be guesswork on hardware) and glove gestures in Ride mode (needs on-board tuning). Both are candidates once you have tested what exists.

### Test round 1 findings and fixes (builds stage5b-5d)
- Storm: dark sky + random strikes + between-strike gimmicks (cloud flickers, drifting violet/deep-blue cloud colour, sky swell after big strikes). Very dark violet read as RED on this strip, so the sky is bluer and brighter now and red is capped under blue. Aurora and Synthwave redesigned (Aurora: curtains out of near-darkness; Synthwave: hard colour hits). Old saved params for these three are reset once (styleV).
- Parked glow: style (breathing/flashing/heartbeat/steady), colour, brightness, cycle, Start after (3 s-1 min), optional Dimmer after. Choosing an effect counts as activity, so a new effect shows for the Start-after time. Live Sees: line in Settings shows what it thinks (GPS km/h or motion).
- REAL BUG found in a phone log: Bluefy gives GPS speed as null, and  is TRUE in JavaScript, so the position-based fallback never ran. Brake light only worked when iOS happened to supply a speed (moving fast enough), and Velocity stayed one colour. Fixed: null counts as missing, the fallback is seeded from the first fix, and movement inside the GPS noise reads as standing still. Every fix is logged ('GPS fix' lines, 5 s throttle).

### Test round 2 (builds stage5e-5f)
- Brake light fired about a minute after sitting down. Cause: GPS speed worked out step by step from jittery positions (10 m accuracy looked like running), and an old reading stayed valid after the fixes stopped. Now: speed = net movement over 2.5-6 s (movement inside the GPS noise reads as standing still), and after 6 s without a fix the speed is unknown (no braking off an old reading).
- Scene overwrite is now harder to trigger by accident: hold 1.2 s and confirm. Settings has Reset scenes. (A user saw Storm turn into Synthwave: most likely a long tap overwrote the tile; tab switching itself was checked and keeps the right effect.)
- Known flake: the test brake over Living flame occasionally fails in the full run under load and passes alone.

### Smooth fades (build smooth1)
- Why slow fades looked rougher than the official B-P Gradual: the official effect runs INSIDE the strip (its own fast, fine blending), while a phone effect is a stream of 8-bit colour packets over Bluetooth: normal packets (marker 0x10, about 100 ms blending) at 13-15/s, with Bluetooth timing jitter, and at low brightness one 8-bit step is a big jump (4 -> 5 is +25 percent).
- Now by default flow and motion colour effects use the fast marker (0x20, the one music uses, blended in ~10 ms) at the music rate (30/s) with error-diffusion dithering on the colour, which gives about 10-bit smoothness. Flashes, built-in-driven effects (Fire 2/3, Living flame) and solid colours are unchanged. Settings > Fix problems > Music speed > All effects switches back (Music only) or goes further (Every effect). It cannot fully match the official built-ins (they never touch Bluetooth while running, and survive the phone locking); for the very smoothest fades use the Strip tab gradual effects.

### Pocket mode and new music effects (build pocket1)
Setup: one speaker blasts the song at the phone in the pocket, a second speaker is for the rider. Three helper agents researched it (their scripts live in the job tmp folder: pocket, musicfx, musicux).
- Pocket mode (Music tab button, also a link on the Ride tab): sets Beat lock (Tempo source + Auto-listen), follow-volume, Pulse-on Auto, starts the motion sensor, starts a music effect if none is playing. It re-cuts the bands for muffled sound (bass 30-150, mid 150-600, high 600-1500 Hz), measures levels above a slowly tracked noise floor (rumble reads dark, music bright), and ignores microphone onsets that coincide with a jolt on the motion sensor (pavement joints looked like a beat in simulation: tempo lock 85 -> 98 percent).
- Mic watchdog (every 1.5 s in Pocket mode): resumes a suspended audio engine and restarts a dead mic track, with MIC / MIC LOST lines in the log. Auto-listen is re-armed by the next tap on a music effect if it was on last time (iOS needs a tap to start audio).
- New music effects: Sidechain pump, Kick snap, Bass lava, Bar accent, Kick heartbeat, Build and drop. Build and drop and Kick heartbeat use a section detector (breakdown / build / drop; logs SECTION lines). Measured on a synthetic track: breakdowns and the first drop are found even in a simulated pocket, builds only once the snare roll starts, and a kick returning after a break can fire a false drop.
- Not built yet (from the reports): the tap-along Calibrate flow and one unified 'Lights timing' slider (Sync delay, Earlier/Later and Beat offset still have opposite signs), strip-mic hand-off when the phone locks, Genre palette and auto palette per song, Song arc, Call and response, Bar painter.
- All simulation-based; not tested in a real pocket. iOS mic processing is already switched off in startMic (echoCancellation, noiseSuppression, autoGainControl false).

### Music pauses when the mic starts (builds pocket2-3)
- User finding: music plays from the SAME iPhone (YouTube Music) to Bluetooth speakers; turning on Auto-listen or Pocket mode (microphone) pauses the music. Cause: iOS puts a page that records into a play-and-record audio session, which interrupts other apps' audio. A web page cannot capture another app's audio, so the mic is the only way to hear it.
- Tested on the phone with navigator.audioSession: the type is already play-and-record before the mic starts; forcing ambient makes the mic fail ("AudioSession category is not compatible with audio capture"). So there is NO web workaround; the experiment setting was removed (the AUDIO SESSION log lines stay).
- Conflict-free ways: the Strip mic source (the controller's own microphone, no phone audio used, also survives locking; put a speaker near the controller), play the music from a second device (then the phone mic just listens), or the Player source (songs inside the page).

### Sticky Auto-listen lock (build sticky1)
- Evidence: video + log of Jackson Wang - Okay (true 120 BPM). Strip follows the app preview within one 30 fps frame (about 0 ms), so Bluetooth/queue are NOT the off-beat cause. The log showed Auto-listen locked 119.8-120.7 for about 2 min, then wandered 106, 104, 96, 131, 93 (confidence 1-3) with the song unchanged, then back to 117.6: a new tempo was accepted after only 3 similar guesses in a row, even at low confidence.
- Fix: once locked, a different tempo needs 6 estimates in a row, each with confidence of at least 2.5 and the current tempo no longer fitting (curFit under 0.6); weak or ambiguous guesses subtract from the count. A real song change still takes about 6-8 s. Covered by a unit test of autoApply.

### Beat-only Volume pulse and timing log (build beatonly1)
- Video 6279 (120 fps) + log: tempo right (flash grid 1.003 s = 119.7 BPM) and average offset about 0 ms, but individual flashes scatter about +-100 ms. Suspected cause: Volume pulse adds mid/treble loudness (the mic hears almost no bass), not just the grid.
- Volume pulse has a new setting Reacts to: Beat only (steadier) uses only the grid pulse. The 10 s music log line now has hitInt (median interval of fired pulses +- spread) and phaseErr (Auto-listen's measured beat phase error, avg and absolute), so off-beat can be measured without video.

### Smoother beat phase (build phase1)
- Logs for current vs Beat only showed the same phase error (about 100 ms typical) and pulse-interval wobble in both, so the scatter is Auto-listen's noisy phase readings, not the effect. Beat only had a lower sentAvg (about 63 vs 100 ms) but a few tempo dips.
- Fix: the grid phase now follows the median of the last 5 readings, ignores under 20 ms, and moves 15 percent per second (was 30 percent of every reading). A lasting shift still wins within about 10 s.

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
