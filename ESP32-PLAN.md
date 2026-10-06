# ESP32 controller: plan (future project, not started)

Status: idea only (2026-10-02). The phone app stays as it is. Decision after the test rounds: the phone is the wrong place to sense music and board motion
(it sits in a pocket at an unknown angle, GPS speed from Bluefy is null/slow, the sound goes air -> mic -> Bluetooth -> strip, 100-200 ms late).
A small controller ON the board with its own microphone and motion sensor fixes the cause for music, brake light, airtime, carve and velocity together.

## What it would do
- Drive the same 3-wire addressable strip directly (5 V, GND, data), so effects can differ along the strip (real chase, per-LED fire, Tron trails). The MELK-OA10 can only do one colour at a time or its built-in effects.
- Microphone on the board: beat/volume analysis in milliseconds, no phone, YouTube Music keeps playing, works with the phone locked.
- Motion sensor fixed to the deck: braking = deceleration along a known axis, jumps/landings, lean. No GPS guessing, no phone orientation problem.
- Phone only picks scenes. Cellular internet is untouched.

## Parts (rough list, prices not checked; guess under about 30 USD total)
- ESP32 dev board (ESP32-WROOM-32 or ESP32-S3).
- I2S MEMS microphone: INMP441 (or SPH0645).
- IMU: MPU-6050 is cheap and common; an ICM-42688 / LSM6DS3 module is quieter. (I2C)
- Level shifter for the data line: 74AHCT125 (or at least a 330 ohm resistor in series; 3.3 V data to a 5 V strip often works but is not guaranteed).
- 1000 uF capacitor across the strip's 5 V and GND, a small fuse if you like, USB-C or screw-terminal power breakout, perfboard, wire, heat shrink, a small enclosure.
- Optional: GPS module (NEO-6M / NEO-M8N) for real speed. Not needed for braking.

## Firmware routes
A. WLED (ready-made, recommended first): big effect library with per-LED effects, audio-reactive usermod (mic FFT), Wi-Fi access point mode (the board makes its own network; the phone joins it; iOS keeps using cellular for the internet), presets/scenes, brightness and power limiter (important: 120 LEDs at full white can pull several amps; a 5000 mAh bank cannot supply that, so cap the current in WLED).
   Brake light and Airtime need a small custom usermod using the IMU (a few dozen lines: read acceleration along the forward axis, trigger a red preset or effect).
B. Custom firmware (Arduino + FastLED/NeoPixelBus + NimBLE): full control and Bluetooth, so the existing Board Lights web app in Bluefy could keep working. Most work.

Web app question: https pages (GitHub Pages) cannot call an http:// device or ws:// (mixed content). Ways around it: (1) use WLED's own page, (2) upload our own UI page to the ESP32 and open http://4.3.2.1 (everything served from the board, works offline), (3) route B with Bluetooth.

## Steps
0. Identify the strip: LED chip (WS2812B/SK6812/WS2811/etc.; printed next to the LEDs), LED count (about 2 m, so roughly 60-120), which wire is data (look for DI/DO arrows and 5V/GND labels on the pads; do NOT guess; swapping 5 V onto data can kill the first LED). A photo of the connector and pads is enough for me to read.
1. ESP32 + WLED + strip on a breadboard with a bench power supply or the power bank. Prove the strip lights with per-LED effects. The MELK controller stays as the fallback (just move the 3-pin connector back).
2. Add the microphone; enable the audio-reactive usermod; judge the beat feel at your speakers.
3. Add the IMU; write the brake/airtime usermod; test on a table by tilting and shaking, then on the board.
4. Mount (IMU rigid on the deck, mic away from wind and wheel noise with a foam cover), waterproof, vibration-proof (hot glue/strain relief on the connectors), enclosure.
5. Port the good parts of the Board Lights UI (scenes, styles) to the board's page or to WLED presets.

## Risks / things to check first
- Power: the strip plus ESP32 must stay within what the power bank can deliver; use the WLED current limit; add the capacitor.
- Vibration breaks solder joints and loose jumper wires: use soldered perfboard, not a breadboard, for the real install.
- The microphone hears wheels and wind: needs a foam cover and a high-pass; the beat detector in WLED handles some of it.
- Wi-Fi access point mode: the phone must join the board's network each time; iOS may warn "no internet" but keeps cellular.
- Water and falls: enclosure, conformal coating or silicone on the strip ends.
- Time: realistically a few evenings to get step 3 working.

## Questions for the user when starting
- Photo of the strip's connector/pads and of any text near the LEDs (chip and wire labels).
- How the strip is powered now (5000 mAh USB-C bank through adapters) and whether to keep it.
- Whether to keep the MELK controller in the loop or replace it fully.

---
## Update 2026-10-07: "smart board" design after three research reports (mostly from forum/doc summaries; NOT tested on hardware)

User idea: the iPhone is only the remote. It plays YouTube Music / Spotify over Bluetooth to the BOARD (the board is a Bluetooth speaker), the board analyses the decoded audio for lights and plays the sound to a speaker.

Findings
- Chip: only the ORIGINAL ESP32 (WROOM-32 / WROVER) has classic Bluetooth audio. S2/S3/C3/C6/H2 do not. Prefer WROVER (PSRAM).
- One ESP32 cannot be an A2DP sink and an A2DP source at the same time (forum threads and the pschatzmann ESP32-A2DP library offer one role only; unverified whether newest ESP-IDF changed this). So "phone -> board -> Bluetooth speaker" needs a second device.
- Ways to get sound out of the board: (1) I2S DAC (PCM5102) + cable to a powered speaker/amp (simplest, lowest delay); (2) DAC + line-in Bluetooth transmitter plug (some have aptX LL); (3) two ESP32s (sink -> I2S -> source; DIY, clock drift/buffering); (4) Raspberry Pi class computer with BlueZ (heavier). Dual-role Bluetooth modules: no hobbyist-usable one found.
- Delay: two Bluetooth hops are roughly 300-500 ms (estimate); the board knows the audio before it plays, so delay the LEDs/lights to match, with a calibration offset slider (about +-20-30 ms accuracy, estimate). iPhone sends SBC/AAC; the library decodes SBC (fine). Apply AVRCP volume in software.
- Control: phone -> board over BLE GATT from Bluefy using the existing HTTPS web app (an Espressif example runs A2DP sink + BLE GATT server together). Keep Wi-Fi OFF while music plays (A2DP + Wi-Fi share the radio: dropouts). An https page cannot call an http board (mixed content).
- Software: stock WLED has Bluetooth disabled and its audio input is hard-wired to I2S/ADC mic, so it is NOT a drop-in base. Custom firmware (Arduino-ESP32 or IDF): ESP32-A2DP (pschatzmann) + arduinoFFT/esp-dsp + FastLED or NeoPixelBus (I2S/DMA output to avoid LED flicker; RMT flickers under radio load) + effects ported/borrowed from WLED and from this web app. Fallback proven in a WLED forum thread: two ESP32s, one for A2DP + analysis sending events over UART, one running WLED.
- WLED's own beat detection is basic (bin threshold, 100 ms gap; no tempo/drop). Our section/tempo code in index.html can be ported.
- Brake light on a fixed deck mount: calibrate gravity at rest, project acceleration on the forward axis, low-pass 5-10 Hz, threshold about -0.15..-0.3 g for 80-150 ms with hysteresis, gate by sustained speed. Airtime = |a| below about 0.3 g for 100+ ms. IMU: MPU-6050 ok; ICM-42688/BMI270 quieter. Closest existing project: intentfulmotion hw-amp (ESP32 lighting controller with accelerometer; not inspected).
- Power: strip worst case about 60 mA per LED (60-120 LEDs: 3.6-7 A) is far beyond a 5000 mAh bank; cap to about 1.5 A (FastLED setMaxPowerInVoltsAndMilliamps) = roughly 2-3.5 h (estimate). Some banks switch off at low current; inject power at both strip ends; capacitor, 74AHCT125 level shifter, fuse.
- Effort: 2-4 weeks of evenings for beat/band effects plus brake light; tempo/drop polish open-ended. Biggest risks: radio coexistence, LED flicker under load, beat-detection quality, IMU vibration noise, speaker delay calibration.

Staged plan (stop/go at each step)
1. Bench: ESP32 WROVER as A2DP sink + BLE GATT from Bluefy; stream YouTube Music 10 min; go if clean audio and free heap above about 50 KB.
2. Add PCM5102 DAC + cable to a speaker; add FFT and print beats; measure delay; decide transmitter plug vs cable.
3. LEDs: level shifter, capacitor, fuse, I2S/DMA LED driver, capped brightness, run from the bank while measuring current and run time.
4. Port effects + scenes; add IMU brake light/airtime; BLE remote in the web app.
5. Enclosure, mount, 30-minute ride test.
Question for the user before buying: wired speaker/amp acceptable for stage 2 (recommended), or must the sound reach the speaker wirelessly (then a transmitter plug, or two ESP32s)?
