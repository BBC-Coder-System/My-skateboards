# ESP32 smart board: shopping list v3 (Shopee Thailand, checked 2026-10-11)

Made by a build-planner + parts-sourcer team, then reviewed part by part by Claude (why each part, what can be replaced or improved). Design: see ESP32-REVIEW.md and ESP32-REVIEW-2.md (Option D: the phone plays to your speakers as today; a small "beat node" at the speaker sends the beats to the board; the old audio path is an optional Plan B kit).

How to read this:
- Everything is on Shopee Thailand. Nothing was added to a cart or bought.
- Prices are from 2026-10-11 and change. "Reviews read" = written reviews were opened and showed no problems; "page opened" = rating/stock/variant checked; "search only" = seen in search results only (check the page before paying).
- Built for someone with no electrical experience: the main board uses SCREW TERMINALS (no soldering); a few small boards come with loose pins that your dad solders (marked "dad solders"). Your dad also checks the power wiring and fuse before first power-on.

## Order 1: ModuleMore (Phuket, 17.2k shop ratings, Shopee-recommended, free shipping) = one package, about 590 THB
| # | Part | Pick / variant | THB | Checked | Link |
|---|------|----------------|-----|---------|------|
| 1 | ESP32 board (original ESP32 chip, 30 pins, USB-C) | "[ESP32 CH340]" | 62 | 5.0, 14 reviews, reviews read | https://shopee.co.th/product/39044974/19276954601 |
| 2 | 30-pin screw-terminal base for the board | | 90 | 5.0, 25 reviews, reviews read | https://shopee.co.th/product/39044974/28672911391 |
| 3 | ESP32-S3 SuperMini (brain of the beat node) | | 222 | 5.0, 7 reviews, page opened | https://shopee.co.th/product/39044974/50958962092 |
| 4 | INMP441 microphone (ear of the beat node) | | 69 | 5.0, 10 reviews, reviews read | https://shopee.co.th/product/39044974/55908470443 |
| 5 | GY-521 MPU-6050 motion sensor | | 85 | 5.0, 39 reviews, reviews read, only 9 in stock | https://shopee.co.th/product/39044974/3245259685 |
| 6 | JST-SM 3-pin plug pair x2 | 3-pin | 30 | 5.0, 405 sold, search only | https://shopee.co.th/product/39044974/6053907315 |
| 7 | JST-SM 2-pin plug pair x2 | 2-pin | 20 | 5.0, 167 sold, search only | https://shopee.co.th/product/39044974/3170980942 |
| 8 | Dupont jumper wires (female-female and male-female, 20 cm) | F-F and M-F | 15 | 5.0, 454 sold, search only | https://shopee.co.th/product/39044974/26900378249 |
Ask the seller in chat before paying: "Does the screw-terminal base (#2) fit the ESP32 CH340 30-pin board (#1)?" (row spacing must match; the base is 26 mm between rows).
Do NOT buy the KY-003 hall module from this shop (its circuit would feed 5 V into the ESP32).

## Order 2: AEI.th (Bangkok, very large shop) = one package, about 260 THB
| # | Part | Pick / variant | THB | Checked | Link |
|---|------|----------------|-----|---------|------|
| 9 | USB power meter KWS-10VA (REQUIRED first test tool) | | 99 | search only | https://shopee.co.th/product/117988183/2664975166 |
| 10 | ABS box IP66 with mounting ears | "158x90x46 with ears" variant | about 99 (34-99) | 4.9, 1.1k reviews, page opened | https://shopee.co.th/product/117988183/22445129080 |
| 11 | KCD1 rocker power switch, 6 A | 2-pin on/off | 29 | 4.9, 6k+ sold, search only | https://shopee.co.th/product/117988183/15416126651 |
| 12 | Heat-shrink tube set | | 24 | 5.0, 5k+ sold, search only | https://shopee.co.th/product/117988183/28503560356 |
| 13 | Resistor 300 ohm, 1/4 W (for the LED data line) | value "300" | 8 | 4.9, 20k+ sold, search only | https://shopee.co.th/product/117988183/21662553225 |

## Order 3: CyberMartTH (Bangkok)
| # | Part | THB | Checked | Link |
|---|------|-----|---------|------|
| 14 | Bare A3144 hall sensor (wheel speed for the brake light) | 15 | 5.0, 38 sold, search only | https://shopee.co.th/product/603297687/27516452346 |

## Single-item orders (each is the best-rated Thai option found)
| # | Part | Pick / variant | THB | Checked | Link |
|---|------|----------------|-----|---------|------|
| 15 | LED strip WS2812B 5 V, 60 LEDs/m, 2 m (OneAudio) | "IP30 2M 60LED/m" | 205 | 4.9, 426 reviews, page opened 2026-10-09 | https://shopee.co.th/product/1219087673/29650594166 |
| 16 | Power bank Orsen/Eloop E53 10000 mAh (2 USB-A ports, 5 V 3 A, Thai safety mark) | "E53 10000mAh" | 599 | 4.9, 2.9k reviews, page opened 2026-10-09 | https://shopee.co.th/product/375419813/15491998680 |
| 17 | Aluminium corner channel 16x16 mm, 1 m, frosted cover, end caps, clips (Seasa_shop) | buy 5 pieces (shop minimum); you need 2 | about 195 | 4.9, 144 reviews, reviews read | https://shopee.co.th/product/261023917/17825204882 |
| 18 | Neodymium magnets 8x3 mm, pack of 10 (Magnet QJ) | | 45 | 4.9, 981 reviews, reviews read | https://shopee.co.th/product/114605751/3217251722 |
| 19 | Lever connectors (Wago 221-413 style), pack of 5 | | 78 | 4.9, 6k+ sold, search only | https://shopee.co.th/product/78446469/28052758723 |
| 20 | Inline mini blade fuse holders, waterproof, 16 AWG, pack of 5 | (buy 3 A mini blade fuses too, see below) | 95 | 4.9, 1k+ sold, search only | https://shopee.co.th/product/29622604/4303012246 |
| 21 | USB-A male cable with bare wire ends, 22 AWG | "male, 0.3 m" | 31 | 4.9, 3k+ sold, search only | https://shopee.co.th/product/299857/28076721187 |
| 22 | Capacitor 1000 uF, pack of 5 | "16V" | 20 | search only | https://shopee.co.th/product/1688451461/41728558385 |
Also: 3 A mini blade fuses (any car-parts shop or auto section of a hardware store, a few baht each), VHB double-sided tape, 2 velcro straps, zip ties with screw-in mounts, a few short wood screws (never longer than the deck is thick, about 11-13 mm) - from a hardware store or your dad.

## Plan B audio test kit (optional, only if the beat node is not good enough)
| # | Part | THB | Link |
|---|------|-----|------|
| B1 | PCM5102 audio board (CyberMartTH; dad solders pins and 4 jumpers) | 110 | https://shopee.co.th/product/603297687/45162675538 |
| B2 | UGREEN 60300 Bluetooth transmitter (Shopee Mall, 4.9, 556 reviews) | 179 | https://shopee.co.th/product/10822/15450933039 |
It plugs into the power bank's second USB-A port, so the USB-A socket board from the old list is not needed.

## Tools (borrow from dad first)
Small screwdriver set with a 2-3 mm flat blade, wire stripper, cutter, lighter or heat gun for heat-shrink, hacksaw for the channel, soldering iron and multimeter (dad). The USB meter (#9) is the one tool to buy.

## Totals (estimates)
- Main build (orders 1-3 + single items #15-22): about 2,150-2,250 THB plus some shipping (several shops ship free).
- Beat-node battery: reuse your existing 5000 mAh power bank (0 THB). If it switches itself off with the small load, buy a slim bank (Xiaomi Ultra Slim 5000 mAh, 1,090 THB, https://shopee.co.th/product/984058892/26973098411, or a cheaper one that the meter shows stays on at about 0.1 A).
- Plan B kit: +289 THB.
- Within the 2,000-4,000 THB budget.

## Review of every part: why it is needed, and what was replaced or improved
Brain and wiring
1. ESP32 board (#1): the brain. It drives the LEDs, talks to your iPhone over Bluetooth (the Bluefy app is the remote), receives the beats from the beat node by radio (ESP-NOW), reads the sensors and runs the brake light. It must be an ORIGINAL ESP32 (not S2/S3/C3) so the Plan B audio path stays possible. IMPROVED: the 30-pin board (62 THB) replaces the 288 THB WROVER, because only this board has a matching screw-terminal base from the same Thai shop; it has every pin we need. The WROVER is only needed if Plan B runs out of memory.
2. Screw-terminal base (#2): lets you connect every wire with a screwdriver: no soldering, and wires can be undone if you make a mistake. It replaces the perfboard + sockets + soldering of the old plan.
3. Dupont wires (#8): ready-made wires with push-on ends, to connect the motion sensor and the hall sensor to the screw terminals without soldering.
4. Lever connectors (#19): join or split power wires by lifting a lever, pushing the wire in, and closing it. The power from the bank has to go to three places (the board, the start of the strip, the far end of the strip). REPLACES soldering power wires together.
5. JST-SM plug pairs (#6, #7): plugs between the box and the strip, so the strip can be unplugged and the box taken off. The 2-pin pairs feed power to the far end of the strip (stops the far end turning reddish).
6. Resistor 300 ohm (#13): sits in the LED data wire and protects the first LED and the ESP32 pin from spikes. IMPROVED: replaces the 74AHCT125 level-shifter chip (not sold in Thailand). With a short data wire (15 cm or less) the strip normally accepts the ESP32's 3.3 V signal; if it flickers, dad adds one diode to the first LED (a known trick), so no overseas part is needed.
7. Capacitor 1000 uF (#22): a small electricity "buffer" at the start of the strip. When the lights suddenly jump to bright, it smooths the surge so the board does not restart and the bank does not cut out. Mind the stripe (minus side).

Lights
8. LED strip (#15): the lights. Same type and LED count as your current strip (120 LEDs over 2 m) but bare, with no milky silicone diffuser, so it is brighter on the road. Plugs in with its JST connector.
9. Aluminium channel (#17): protects the strip from stones and grit, keeps it straight, and helps cool it. CHANGED: no clear-cover or 45-degree channel exists in Thailand; this 16x16 mm corner channel comes with a frosted cover (lets about 85% of the light through). Keep the cover on for protection, or leave it off for full brightness. Dad cuts it to length with a hacksaw.

Sensors
10. Hall sensor + magnets (#14, #18): the new brake light. Two or three magnets glued into one wheel pass the sensor on the truck; the board counts them and knows your real speed. When the speed drops fast, the brake light turns on. This is far more reliable than motion sensing (bike brake lights that only use motion sensors are known to trigger randomly). IMPROVED: the bare A3144 is used, not the KY-003 module, because the module would push 5 V into the ESP32.
11. Motion sensor GY-521 (#5): jumps (airtime), carves, confirming the brake, and knowing if the board is moving. Kept because it is cheap and adds effects; the brake no longer depends on it alone. Dad solders its pins.

Beat node (the small unit at your speaker)
12. ESP32-S3 SuperMini (#3) + INMP441 microphone (#4): the "ear". It sits in a foam cup against your speaker grille, hears exactly what you hear, finds the beats and sends them to the board. This keeps your music path the same as today (phone to speakers), so music never depends on the board. S3 chosen over C3 because the C3 is too slow for audio analysis. Dad solders both boards' pins (or buy the pre-soldered INMP441 for 110 THB: https://shopee.co.th/product/167942403/22320059357).
13. Beat-node battery: IMPROVED: reuse your old 5000 mAh bank instead of buying the 1,090 THB Xiaomi. Test it with the USB meter first: some banks switch off when the load is very small (about 0.1 A).

Power and safety
14. Power bank (#16): powers the board and lights. 10000 mAh at 5 V 3 A, with the Thai safety mark; about 4-6 hours of normal use (estimate). It has 2 USB-A ports, so the Plan B transmitter can plug straight into it.
15. USB-A cable with bare ends (#21): takes power out of the bank into the box. Short (30 cm) so little voltage is lost; your dad connects its two wires (red = +5 V, black = ground) to the fuse and switch.
16. Fuse holder + 3 A fuse (#20): if anything shorts (a wire rubs through), the fuse blows instead of wires getting hot. Blade fuses do not shake loose like glass ones. The pack has 5 holders; you need 1, spares are fine.
17. Power switch (#11): turns everything off without unplugging (the strip still uses a little power when dark). Mounted on the side of the box.
18. USB meter (#9): shows volts and amps. Used to check the bank never cuts out, how much power the lights use, and whether the beat-node bank stays on. It is the main safety and testing tool.
19. Box (#10): holds the board, sensors and wiring under the deck. CHANGED/FLAG: the team wanted a 30 mm tall box, but none is sold in Thailand and the board on its screw base is about 30 mm tall by itself. This box is 46 mm tall, so with your 100 mm deck height about 54 mm stays under it: fine on smooth roads, but take kerbs and big speed bumps slowly or carry the board. A flatter box from a local electronics shop is an upgrade if you find one.
20. Heat-shrink (#12): covers bare joints (for example the Dupont ends on the hall sensor legs) so nothing can short.

Removed from the old list (and why)
- 74AHCT125 level shifter: not in Thailand; replaced by the resistor (and the diode trick if needed).
- WROVER board: replaced by the 30-pin board + screw base (only needed for Plan B memory, optional).
- PCM5102, UGREEN, 3.5 mm cable, USB socket board, ground-loop isolator: moved to the optional Plan B kit (Option D does not send music through the board).
- Perfboard, header sockets, screw terminals, IC socket: replaced by the screw-terminal base.
- KY-003 hall module, BSS138 shifters, ESP32-C3, glass fuses, bare LiPo cells and TP4056 chargers, breadboards in the final build: unsafe or unsuitable.
- Xiaomi bank: replaced by reusing your 5000 mAh bank (buy only if the meter shows it switches off).

## Safety rules for build and riding
- Your dad checks the power wiring (bank -> fuse -> switch -> board and strip) and polarity (red = +5 V) before the first power-on.
- Always switch off before plugging or unplugging the strip or any wire.
- Never charge the banks while riding; keep them out of the sun and out of a parked car.
- Fix wires every 10 cm, away from the wheels and trucks; no wet roads.
- Desk test first (see ESP32-REVIEW.md, section 4), then mount.
