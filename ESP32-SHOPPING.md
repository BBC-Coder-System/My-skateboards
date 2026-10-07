# ESP32 smart board: shopping list (draft, 2026-10-07)

Decisions from the user: buy in Thailand (Shopee / Lazada / local electronics shops), budget about 60-120 USD, soldering help from the user's dad (an electrician) and a plug-together design preferred, new brighter strip wanted, features: Bluetooth audio in from the phone + music-reactive lights + sound to the user's own Bluetooth speaker + brake light, bigger power bank, dry smooth roads, user wants to go straight to a permanent build.

IMPORTANT: prices are rough estimates in USD (not looked up; Thai shop prices will differ, check Shopee/Lazada). Several design points are NOT verified on hardware (see ESP32-PLAN.md): one ESP32 cannot be an A2DP sink and source at once, so sound goes out through a DAC + Bluetooth transmitter plug; BLE control alongside A2DP; LED flicker under radio load. Build and test on the table (same parts, one evening) before gluing anything to the board.

| # | Part | Search words | Est. USD | Notes |
|---|------|--------------|----------|-------|
| 1 | ESP32 dev board with PSRAM, ORIGINAL chip | "ESP32-WROVER-E development board 8MB PSRAM" (WROVER, NOT S3/C3/C6) | 8-12 | Only the original ESP32 has classic Bluetooth audio. Buy 2 if cheap (spare). |
| 2 | Motion sensor | "GY-521 MPU-6050" | 2-4 | For the brake light. Fixed rigidly to the deck box. |
| 3 | I2S DAC | "PCM5102A DAC module I2S 3.5mm" | 5-8 | ESP32 sends decoded audio here, 3.5 mm line out. |
| 4 | Bluetooth audio transmitter with line-in | "Bluetooth 5.0 transmitter receiver 3.5mm AUX" (TX mode, USB powered; aptX LL only helps if the speaker supports it) | 8-15 | Takes the DAC's line output and sends it to the user's speaker. Adds a second Bluetooth hop (delay; lights are delayed to match). Pairing/mode switch handled by its own button. |
| 5 | 3.5 mm audio cable, short, right-angle | "3.5mm AUX cable 20cm" | 1-2 | DAC -> transmitter. |
| 6 | LED strip, WS2812B 5 V, 60 LEDs/m, 2 m | "WS2812B 5V 60LED/m 2m IP30" or "IP65 clear sleeve" | 8-15 | Choose a CLEAR or no diffuser (white silicone eats about a third to a half of the light) if brightness matters. At a fixed current cap, more LEDs per metre does NOT give more total light, so 60/m is fine. Optional: SK6812 RGBW for brighter white. Buy a 30-LED piece too for the first bench test (or just test with the new strip). |
| 7 | Level shifter | "74AHCT125 level shifter module" or "SN74HCT245 module" | 1-3 | 3.3 V data to 5 V strip. Plus a 330-470 ohm resistor in the data line. |
| 8 | Capacitor 1000 uF 10 V (or 16 V) | "1000uF 16V electrolytic" | 0.5 | Across 5 V and GND at the strip input. |
| 9 | Fuse | "inline blade fuse holder 3A" or resettable fuse | 2 | Safety between the bank and everything. |
| 10 | Power bank 10000 mAh, 5 V 3 A out (USB-A), ideally with an "always on / low current mode" | "power bank 10000mAh 22.5W" ; check it gives plain 5 V on USB-A | 15-25 | Replaces the 5000 mAh bank. Some banks switch off at low current; the firmware may need a small keep-alive load. |
| 11 | USB-A (or USB-C) breakout with screw terminals | "USB A female breakout screw terminal" | 2-3 | Takes 5 V and GND from the bank to the board and strip. |
| 12 | Wire: 20-22 AWG silicone (signals), 18 AWG (power), heat shrink | "silicone wire 18AWG 22AWG", "heat shrink assorted" | 4-6 | Power also goes to the FAR end of the strip (injection) to avoid reddish fading. |
| 13 | Connectors: JST-SM 3-pin pairs, screw terminal blocks, female header sockets, perfboard | "JST SM 3 pin connector", "screw terminal block 5.08", "female header 2.54", "perfboard 5x7" | 5-8 | Plug-together style: sockets on the perfboard for ESP32/DAC/IMU/level shifter, JST for the strip. |
| 14 | Enclosure + glands | "ABS waterproof junction box 100x68x50", "PG7 cable gland" | 5-8 | Dry roads: a simple box is enough. Foam tape + VHB/double-sided tape for vibration. |
| 15 | USB power meter (recommended) | "USB tester voltage current meter" | 4-8 | Measure real current and run time. A multimeter is also needed (dad). |

Estimated total: roughly 70-115 USD (estimate). Skip #15 and a spare ESP32 to save about 15 USD.

Tools (borrow from the dad): soldering iron, solder, wire strippers, multimeter, small screwdrivers, hot glue.

Things to confirm before ordering
- The user's Bluetooth speaker model (does it support aptX LL? does it stay paired to a transmitter?).
- The new strip listing names the chip (WS2812B) and says 5 V; check colour order in reviews.
- The power bank outputs a plain 5 V at 2-3 A on USB-A and does not shut off at low current.
- The ESP32 board is the ORIGINAL chip (WROVER/WROOM), not S3/C3.

Build order (do not skip): (1) ESP32 on the table: Bluetooth audio from the phone + BLE control from Bluefy, 10 minutes of clean music; (2) add DAC and transmitter, listen on the speaker, measure delay; (3) LEDs with level shifter, capacitor, fuse, capped current from the bank; (4) IMU brake light; (5) solder, box and mount.
