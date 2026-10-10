# ESP32 smart board: design review (2026-10-10)

Four specialists (hardware/power, firmware/Bluetooth, audio/lighting, ride integration) reviewed ESP32-PLAN.md and ESP32-SHOPPING-TH.md, discussed with each other, and a lead reviewer wrote this joint verdict. Nothing was tested on hardware; numbers marked est. are estimates. The specialists' own positions are summarised at the end.

## 1. Overall verdict
Keep the design (phone streams music to the ESP32, the board makes the lights, a USB-powered UGREEN transmitter sends the sound on to the user's speaker pair). GO, but NOT straight to a permanent install: solder a socketed board, test on the desk, mount only after a 30-minute run on the power bank. Fixes: flatter box, safer power wiring, power switch, sealed strip, about 15 cheap extra parts, and the light delay changed to only the hop after the board. Cost rises by about 300-500 THB. Biggest unknown: whether the UGREEN plays to both speakers as a stereo pair and reconnects reliably.

## 2. Decisions
| Part / decision | Verdict | Agreed choice | Why |
|---|---|---|---|
| ESP32-WROVER-E 8 MB | KEEP | as listed | only the original ESP32 has Bluetooth audio; PSRAM allows a 0.5 s sound buffer |
| Spare Node32s board | optional | spare only | less memory |
| A2DP sink + BLE remote on one chip | KEEP | Bluedroid only (not NimBLE); Wi-Fi off while riding; update mode for OTA | Espressif a2dp_gatts_coex example |
| PCM5102 + UGREEN 60300 + speaker pair | KEEP | backup: second ESP32 as transmitter | only route to the speakers without a microphone; one ESP32 cannot be sink and source (checked in ESP-IDF source) |
| HOCO E151 | REMOVE | | own battery lasts about 4 h as transmitter |
| Light delay | CHANGE | only the hop after the board (est. 150-300 ms), timed by audio sample count; tap-along calibration per speaker setup; optional 0.5 s PSRAM buffer for lookahead | the board hears each sound before the speakers play it |
| Volume | CHANGE | applied after analysis | lights stay the same at any volume |
| LED driving | CHANGE | DAC on I2S0, LEDs on I2S1 DMA (NeoPixelBus) GPIO13, 100-120 fps, own dithering, strip dark at boot, 1.8 A cap, brightness ramps over 2-3 frames | no flicker under Bluetooth load |
| Strip WS2812B 60/m 2 m | CHANGE version | IP65 clear coat (not silicone tube); optional clear aluminium channel at 30-45 degrees | bare IP30 gets ruined by grit |
| 74AHCT125 | KEEP in a 14-pin socket | fallback: first-pixel + 1N4001 diode trick | not sold on Thai Shopee |
| Orsen E53 bank | KEEP | strap to deck; never charge while riding | worst case about 2.4 A of 3 A |
| Power cable from bank | ADD | thick 20 AWG USB-A male cable under 30 cm; star wiring (LED power separate from ESP32/audio ground) | voltage drop and hum |
| Fuse | REPLACE | mini blade fuse holder + 3 A | glass fuse clips loosen |
| Power switch | ADD | sealed toggle or KCD1 rocker, 6 A or more, after the bank cable | easy on/off |
| Enclosure | REPLACE | flat plastic box about 150x80x30 mm between the trucks | deck est. 75-90 mm above ground |
| MPU-6050 | KEEP | on foam in the box | |
| JST-SM | KEEP + strain relief | plus 2-pin pair for the far-end power feed | vibration |
| Mic auto-sync | LATER (build 2) | spare header GPIO 4/18/19 | |
| Behaviour | ADD | ride scene about 1 s after power-on with no phone (white-ish front, red rear 20 LEDs, brake works); music drop goes back to the ride scene; strobe/police only when stopped; run-time counter; night volume cap; IMU failure = 3 amber blinks | safety |
| Updates | ADD | button reboots into Wi-Fi update mode at http://192.168.4.1; panel-mount USB-C outside the box | no need to open the box |

Pins: DAC BCK/LRCK/DIN 26/25/27 (PCM5102 SCK pad to GND, jumpers set), LED data 13, IMU SDA/SCL 21/22 (INT 34), button 32, 5 V sag sense 35 (100k/100k + 100 nF), spare 4/18/19. Avoid 6-11, 16/17, 0/2/5/12/15.

## 3. Shopping list changes (estimated prices)
- REMOVE: HOCO E151, glass fuse, 100x68x50 box, (spare Node32s optional).
- REPLACE: strip with the IP65 clear-coat variant (est. +50-150 THB, not confirmed on the listing); box with a flat ABS box about 150x80x30 (est. 60-120 THB, not found yet; search "กล่อง ABS 150x80x30").
- ADD: USB-A male 20 AWG cable (40-60), mini blade fuse holder + 3 A fuses (40-60), sealed toggle or KCD1 rocker 6 A+ (20-40), panel push button (15-20), panel-mount USB-C extension (40-60), 5.08 mm screw terminals x3 (20-30), small parts: 14-pin IC socket, 330 ohm x2, 100k x2, 100 nF x4, 470 uF x1, 1N4001 (50-80), 2-pin plug pair (15), low-profile header sockets (20), mounting supplies: cable glands or silicone, heat shrink, zip ties, VHB tape, foam, 2 Velcro straps + EVA pad (150-250), optional clear aluminium channel (100-200), optional ground-loop isolator only if hum appears (overseas 100-200).
- REQUIRED: KWS-10VA USB meter (99), the first test tool.
- Not found in Thailand: 74AHCT125 (overseas or diode trick), the flat box, the ground-loop isolator.
- New total: about 2,100-2,500 THB plus shipping (est. 65-78 USD).

## 4. Staged plan (on the desk until step 6)
0. Measure deck-to-ground height, send a deck photo. When the meter arrives, measure the CURRENT strip at full white and full red.
1. Board alone (1 evening): 30 minutes of music from the phone plus Bluefy commands. PASS: no dropouts, remote works, free memory above 50 KB, reconnects after a power cycle.
2. Sound path (1 evening): add DAC + UGREEN + speakers; "forget" the speakers on the iPhone first. PASS: plays (stereo or main speaker), reconnects within about 10 s on 10 power cycles, no hum, slow-motion click test gives the delay and it stays the same after reconnects.
3. LEDs on the bank (1-2 evenings): 30 minutes of music, no flicker, total under about 2.4 A, at least 4.6 V at the ESP32, bank never switches off (also with LEDs dark), no buzz during a strobe test.
4. Brake + ride scene (1 evening): ride scene about 1 s after switch-on with no phone; push-and-stop triggers the brake; knocking the box does not.
5. Full 30 minutes in the closed box on the bank; nothing hot; then tap-along calibration.
6. Mount (dad: power and fuse): box clears the ground under the rider's weight; wires fixed every 10 cm away from wheels and trucks; slow parking-lot ride, then 30 minutes.

## 5. Honest expectations
- Brightness: somewhat brighter and much punchier, NOT 2x (same 120 LEDs, limited by the bank). Gains come from no milky diffuser, sparse full-power effects, and cyan/amber/pink colours.
- Sync: lights on the beat within about 10-20 ms once calibrated (est.); beat finding can still misjudge odd or changing tempos.
- Delay: pause, skip and volume feel about 0.3-0.5 s late (est.), about 1 s with the optional buffer; the lights do not lag the sound.
- Run time: about 4-6 h normal, about 2.5 h worst case (est.); no low-battery warning, watch the app timer.
- Effort: firmware about 2-4 weeks of evenings (Claude); user + dad about 4-6 evenings testing and building; adds about 450 g.
- Risk: if the UGREEN cannot run the speaker pair well, the fallback is a second ESP32 as transmitter, or one speaker.

## 6. Questions before ordering (most important first)
1. Deck type, a side photo, the deck-underside-to-ground height in the middle, the distance between the trucks.
2. OK with a 1-2 week desk-test phase before mounting?
3. Where the speakers ride (on you, in a bag, on the board)?
4. Strip look: IP65 clear coat, or bare strip in an aluminium channel?
5. Strobe/police only when stopped: OK?
6. 2,100-2,500 THB including one overseas part (or the diode trick): OK?
7. Worth 0.5 s extra pause/skip delay for the sound buffer?
After the parts arrive: does the UGREEN pair with both speakers as stereo, or only the main one?

## Specialist positions (summaries)

### hw-engineer
hw-engineer final position (summary saved by the main session)
GO for hardware with changes. Key: new strip will NOT be much brighter (same 120 LEDs, same chip; light follows current; bank 15 W, ~2.2 A left for LEDs; 1.8 A cap = ~25-28% of full white). Gains come from no milky diffuser, effects lighting few LEDs fully, saturated colours. Wording: "somewhat brighter, much punchier, not 2x". Zero-cost first test: USB meter on current MELK strip at full white/red.
KEEP: WS2812B 5V 60/m 2m (GRB order); no WS2815/SK6812 build 1; Orsen/Eloop E53 (should not cut off: >=0.25 A draw; confirm with meter); 74AHCT125 socketed (OE to GND, unused inputs GND, 100 nF, 330 ohm out, data <30 cm twisted with GND, GPIO13); 1000 uF at strip; power both strip ends 18 AWG; DAC+UGREEN route.
CHANGE/ADD: (1) USB-A male thick power cable (20 AWG, <=30 cm) - missing, breakout #7 only for transmitter; (2) star wiring, LED power straight from bank cable, separate from ESP32/DAC ground; hum test; optional 3.5 mm ground-loop isolator (not on Shopee TH); (3) 3 A mini blade fuse inline on LED branch (glass clips loosen); (4) 5.08 mm screw terminals for power; (5) 470 uF + 100 nF at ESP32 5V; (6) 100k/100k + 100 nF to GPIO35 sag sense; (7) no power switch, off = unplug bank cable (strip idle ~0.12 A); (8) JST-SM ok but strain relief/hot glue; screw-lock waterproof 3-pin better; 2-pin pair for far-end feed; (9) strip IP65 clear drip-coat instead of bare IP30 (agreed with audio-light-designer); (10) fallback shifter: sacrificial pixel with 1N4001 (no 74HCT125 in Shopee TH); 74HC125/BSS138 not reliable; (11) vibration: foam, stranded wire, strap bank; (12) ESP32 USB-C reachable, unplug bank when USB connected, panel button GPIO32; (13) spare mic header GPIO4/18/19; (14) PCM5102 SCK to GND, jumpers.
Missing parts: USB-A male cable, DIP-14 socket, 330 ohm x2, 100k x2, 100 nF x4, 470 uF x1, screw terminals x3, mini blade fuse holder + 3 A fuses, 2-pin connector pair, panel button, 1N4001, glands/silicone, heat shrink/hot glue/zip ties/VHB/foam, optional ground-loop isolator.
Numbers: cap 1.8 A (raise to 2.2-2.3 A only if meter < 2.7 A total and >= 4.5 V at ESP32); brightness ramp 2-3 frames; blank at boot; light delay only downstream hop 150-300 ms.
Open: current MELK strip draw; E53 cut-off/sag; UGREEN current; hum; ESP32 USB diode; OneAudio IP65 variant price.
ride-integrator did not reply to hw-engineer either.

ADDENDUM (after ride-integrator replied):
- Power switch now accepted: sealed toggle with boot or KCD1 mini rocker >= 6 A in the 5 V feed after the bank cable, on the box side. Not a USB inline-switch cable (thin), not a 16 mm latching push switch (AC rating, chatter).
- Enclosure: deck underside est. 75-90 mm above ground (ride-integrator estimate) -> box must be ~25-30 mm tall, not 50 mm. Solder dev boards with short male headers or low-profile machined-pin sockets; DIP socket OK for 74AHCT125; plastic box only; UGREEN inside, flat.
- Rail margin: worst ~2.4 A of 3 A port (LED 1.8 + idle 0.12 + ESP32 0.25 + TX ~0.15 + DAC/IMU 0.05); risk is sag -> thick cable, 470 uF, firmware cap under 4.6 V.
- Ground-loop isolator only if the strobe test buzzes; star wiring main fix.
- Agreed cost with added parts ~2,100-2,400 THB (65-75 USD); strap bank, don't charge while riding; fix wires every 10 cm away from trucks/wheels; strip inboard of deck edge.
- TOP open question: user to measure deck-to-ground height and send a deck photo.

### fw-engineer
fw-engineer final position (summary saved by the main session; the full text was in the hand-back)
GO for the architecture, but change sync timing, LED driving and updates; not straight to a permanent build.
Verified: one ESP32 cannot be A2DP sink+source (ESP-IDF btc_av.c single role); A2DP sink + BLE GATT coexist (Espressif a2dp_gatts_coex example); esp_a2d_sink_set_delay_value exists (IDF 5.1+); NeoPixelBus unmaintained, I2S1 jitter issue #751.
KEEP: WROVER-E, Bluedroid only, Wi-Fi off while riding; PCM5102 + UGREEN 60300 for build 1 (fallback: second ESP32 as A2DP source fed by I2S; rejected Pi Zero 2 W, LE Audio, BK/QCC modules); BLE GATT remote from Bluefy, board runs on its own, unencrypted characteristics; MPU-6050 I2C 400 kHz 200 Hz DLPF; AVRCP volume.
CHANGE: (1) light delay = only the hop after the board (DAC->transmitter->TWS, est. 150-300 ms), timestamp features by DAC sample index, delay feature frames not audio; optional PSRAM audio delay 0.5 s for lookahead; report delay to iOS. (2) volume as digital gain after analysis, 3-6 dB headroom. (3) LEDs on I2S1 DMA (NeoPixelBus), DAC on I2S0; fallback led_strip SPI, last resort RMT core 1; 100-120 fps, slew-limited brightness, 1.8 A cap, blank strip at boot. (4) drop NimBLE. (5) pins: DAC 26/25/27, LED 13 via 74AHCT125, IMU 21/22 (+INT 34), button 32, rail sense 35 (100k/100k+100nF), spare mic 4/18/19; PCM5102 SCK bridged to GND. (6) core 0 BT, core 1 DSP/LED/IMU/BLE queue; brownout on, reset reason in NVS, watchdog, default red tail light. (7) OTA: button/BLE reboots into Wi-Fi AP-only update mode at http://192.168.4.1; min_spiffs partitions; USB-C reachable from outside the box. (8) calibration tap-along + 10 ms nudge per speaker setup in NVS. (9) desk development first; solder socketed perfboard OK; mount after 30-minute bench pass.
Open: UGREEN latency/reconnect with TWS; iOS delay report; iPhone with audio+BLE same device; NeoPixelBus I2S1 stability; latency drift across reconnects (slow-mo video test).
Agreements: hw-engineer (pins, rail sense, 2x100k + panel button), audio-light-designer (feature frames, 250 ms future window, 0.5 s PSRAM delay, no mic build 1, gain after analysis). ride-integrator did not reply to its asks (panel button, external USB-C).

UPDATE (third hand-back, after ride-integrator replied):
- ESP32-A2DP with Arduino core 3.x needs AudioTools I2SStream output.
- Panel-mount USB-C on the box (~40-60 THB), ride-integrator agrees; hw and ride-integrator agree with no straight-to-permanent install.
- Boot: blank strip, ride scene (soft front, red tail, brake on rear ~20 LEDs) and brake live ~1 s after power-on before Bluetooth; gravity calibration from an app step.
- Fallbacks: music drop / 1-2 s silence fades to ride scene; IMU error = 3 amber blinks + app flag.
- Strobes/police blocked while moving (IMU vibration level), never default.
- Run-time counter in the app (bank gives no low-battery warning); night volume cap.
- Open: guide must tell user to forget the speakers on the iPhone (speakers might grab the phone directly; board cannot detect a missing transmitter, one-way analog link); reconnect time 3-8 s assumed; heap > 50 KB gate.

### audio-light-designer
audio-light-designer final position (summary saved by the main session)
GO. The board holds every sample before the speakers play it -> lights can land exactly on beats (or 10-20 ms early). Brightness: "somewhat brighter, much punchier, not 2x".
KEEP: transmitter path (iPhone streams to one BT audio device only; copying to board otherwise means mic, rejected); WROVER (1024-pt FFT ~0.5 ms, ~4% of a core, verified ESP-DSP); WS2812B 60/m 2 m; port sticky tempo lock + smoothed phase from index.html.
CHANGE/ADD: (1) time lights by sample count (agreed fw); (2) delay as lookahead (~250 ms future frames), effects pre-roll 30-60 ms rise, aim 10-20 ms early; (3) optional PSRAM audio delay 0.5 s (pause/skip feel 0.5 s late; volume applied at output stays instant); (4) pipeline: mono, ~11 kHz, 1024-pt FFT every 128 samples, spectral-flux beats + bass envelope, tempo over 6-8 s, sections (calm/build/drop/break), 64-byte feature frames (8 bands, bass env, beat strength/time, kick/snare/hat, beat/bar pos, BPM/conf, section, L/R loudness, silence); (5) LEDs I2S1 NeoPixelBus GPIO13, FastLED colour math only, 100-120 fps, own dithering/gamma, brightness jumps over 2-3 frames; (6) IP65 clear epoxy strip (agreed hw), optional clear aluminium channel angled 30-45 deg, strip inboard above lowest truck point; (7) 1.8 A cap; (8) calibration: per speaker setup offset in flash, tap 8x in Bluefy + +-10 ms; no re-tap per reconnect; mic auto-sync build 2; (9) look rules: changes follow music (bars/sections/drops) never timers; big hits every 2nd beat above ~110-115 BPM, sparkles every beat; soft attacks; rear 20 LEDs always red tail (brighter braking), front white-ish; hard strobes/Police only when stationary (IMU); night volume cap preset.
Signature effects: Kick Comet (arrives on next beat), Bass Breath, Drop Burst (build sparkle creep, dim before drop, centre-out burst), Music Fire (Fire2012 bass sparks), Hi-hat Sparkle + Stereo Split layer.
Brightness: cyan/amber/magenta-pink/lime punch more per mA than pure blue/deep red; measure MELK strip with KWS-10VA first.
Risks: UGREEN codec/TWS unverified (assume SBC, 150-300 ms); delay drift across reconnects (slow-mo click test, mic in build 2 if drift); hum (star wiring, isolator if buzz). Questions for user: deck type; where speakers ride.

### ride-integrator
ride-integrator final position (summary saved by the main session; all three teammates agreed)
GO architecture; NO-GO straight-to-permanent (solder socketed perfboard OK; desk test with USB logs; mount after 30-minute bench pass; dad does soldering/power/fuse).
KEEP: WROVER sink + BLE from Bluefy -> PCM5102 -> UGREEN 60300 -> TWS speakers (no simpler route without mic; mic rejected for wheel rumble); off-the-shelf WLED/mic controllers rejected (no BT audio); board-mounted MAX98357A amp+speaker only plan B; Orsen E53 10000 mAh (load >= 0.3 A always, ~2.4 A of 3 A), remove to charge, never charge while riding; MPU-6050 in box, 2 m WS2812B 120 LEDs, shifter, fuse.
CHANGE: (1) enclosure ~150x80x30 mm flat plastic (deck underside est. 75-90 mm above ground; 50 mm box hits speed bumps), between trucks with bank beside it; short headers/low-profile sockets; UGREEN inside flat; nothing below box; search "กล่อง ABS 150x80x30" (not found yet). (2) power switch: sealed toggle with boot or KCD1 rocker >= 6 A after bank lead; momentary button pair/update/reset; panel-mount USB-C extension ~40-60 THB. (3) bank: 2 Velcro straps on EVA pad or slim pouch screwed to deck; wires fixed every 10 cm away from kingpin/bushings/wheel path; strain relief. (4) strip IP65 or IP30 in 30-45 deg clear aluminium channel, inboard of deck edge, higher than lowest point of box/trucks, inboard over trucks; rounded end caps, screws; brightness expectation: no milky diffuser + sparse effects, not 2x. (5) hw additions (20 AWG USB-A male lead, ATM blade fuse, screw terminals, far-end feed pair, glands/silicone, IC socket, R/C, optional isolator). (6) safety behaviour: boots into ride scene without phone (white-ish front, red tail rear 20 LEDs brighter on brake), brake live ~1 s after power-on, music drop -> ride scene, IMU fail -> 3 amber blinks, run-time counter, police/strobes only when parked, night volume cap; no Thai rule found banning red/blue on skateboards (judgement call). (7) calibration at home with speaker near board, tap-to-beat fallback; INMP441 build 2.
COST: list ~1,800-2,000 THB; with additions ~2,100-2,500 THB (~65-78 USD), in budget; all Thai Shopee except 74AHCT125 (overseas; fallback 1N4001 diode trick).
UX guide items: start order speakers+TWS -> board switch -> UGREEN reconnects -> iPhone reconnects (est. 3-8 s); forget speakers on iPhone; charge by removing bank; added weight ~450 g; no heat issue but keep bank out of sun/car.
OPEN QUESTIONS: (1) deck type + side photo + deck-underside-to-ground height at middle + wheelbase; (2) where speakers ride; (3) OK with short desk-test phase before mounting; (4) OK with police/strobes only when parked; (5) after parts arrive: does UGREEN pair with TWS as stereo or only main speaker.

## User decisions (2026-10-10)
- Desk test first: YES (solder now, test on the table, mount after the 30-minute run passes).
- Speakers ride ON THE RIDER (clipped to a belt or strap). Proposed: INMP441 mic in the box for automatic delay calibration (hold a speaker next to the board, board plays a click and measures the round trip), not for live listening.
- Strip: BARE strip in a clear aluminium channel angled 30-45 degrees (add the channel, about 100-200 THB est., 2 m, with end caps and screws; the strip variant can be IP30 bare).
- Strobe/Police: ALLOWED WHILE RIDING (user's choice). Firmware keeps a setting for it; default ride scene stays non-strobing.
- Deck underside to ground: about 100 mm (user, 2026-10-10). A 30 mm flat box leaves about 70 mm clearance.
- Still needed before ordering: deck type, side photo, distance between the trucks.
