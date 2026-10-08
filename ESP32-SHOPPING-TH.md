# ESP32 smart board: Shopee Thailand shopping list, version 2 (checked 2026-10-09)

Prices, ratings, review counts and stock below are what each product page showed on 2026-10-09 (they change). Nothing was added to a cart or bought. Link format: https://shopee.co.th/product/SHOP_ID/ITEM_ID (choose the variant named in "Pick" on the page). "Opened" = I opened the product page and read price, rating, reviews, variants and stock. "Search only" = only the search-result line was seen (listed honestly below). I could not read the text of the reviews, only the star rating and the count.

Design reminder: original ESP32 board (Bluetooth audio in from the phone + BLE remote from Bluefy) -> PCM5102 DAC -> 3.5 mm cable -> Bluetooth transmitter plug (powered from a USB-A socket) -> the paired speakers. WS2812B strip through a level shifter. MPU-6050 for the brake light. 10000 mAh bank for power.

## Opened and verified (Thai sellers)

| # | Part | Pick | Price | Seller facts (page, 2026-10-09) | Link |
|---|------|------|-------|----------------------------------|------|
| 1 | ESP32 board (main), ORIGINAL chip with 8 MB PSRAM | "บอร์ด ESP32-DevKitC ESP32-WROVER แบบ USB Type-C with PSRAM 8MB" (Phuket, shop "Module More") | 288 | 5.0 stars from 22 reviews, 101 sold, Shopee-recommended shop, 36 in stock, free shipping, 30-day shop guarantee. Description: ESP32-WROVER-E, 8 MB PSRAM, 4 MB flash, Bluetooth 4.2 BR/EDR + BLE, Type-C. I earlier said the seller had no ratings: that was a page that had not finished loading, sorry. | https://shopee.co.th/product/39044974/26023625600 |
| 1b | ESP32 spare / cheaper fallback (no PSRAM) | "ESP32 WiFi Node32s ESP-WROOM-32" (Bangkok, "AEI.th"), pick the 38-pin variant with Type-C or USB cable | 178-274 depending on variant | 4.9 stars from 6.3k reviews, 40k+ sold, Shopee-recommended-plus shop, free shipping. Many A2DP projects run on this chip, but there is less memory headroom than #1. | https://shopee.co.th/product/117988183/2053436592 |
| 2 | Motion sensor | "โมดูล GY-521 MPU-6050" (Bangkok) | 67 | 5.0 stars, 20 reviews, 212 sold, Shopee-recommended shop, free shipping. Pins included. | https://shopee.co.th/product/634411534/43473246555 |
| 3 | I2S DAC | "PCM5102 DAC Module GY-PCM5102 I2S Stereo" (Bangkok, CyberMartTH) | 110 | 5.0 stars, 9 reviews, 57 sold, 19 in stock, "stock Thailand", line-out 3.5 mm jack, pins and jumper wires included. | https://shopee.co.th/product/603297687/45162675538 |
| 4 | Bluetooth transmitter plug | UGREEN 2-in-1 transmitter/receiver 5.1, model 60300, USB-A powered (Shopee Mall, Bangkok) | 179 (was 279) | Shopee Mall (official store), 4.9 stars, 556 reviews, 3k+ sold, 15-day returns, free AUX 3.5 mm cable included in the box per the listing, TX/RX switch. No internal battery (powers from the USB-A socket). | https://shopee.co.th/product/10822/15450933039 |
| 4b | Alternative transmitter | HOCO E151 (Fulfilled by Shopee) | 158 | 4.9 stars, 288 reviews, 1k+ sold, Bluetooth 5.4, BUT it has its own battery (4 h as transmitter) so it is not a good fit for long rides; backup only. | https://shopee.co.th/product/63204119/56903905617 |
| 5 | LED strip WS2812B, 5 V, 60 LEDs/m, 2 m | "OneAudio (พร้อมส่งในประเทศไทย) LED Strip WS2812B RGB 60 Leds/M", pick "IP30 2M 60LED/m" (black or white PCB) (Pathum Thani, OneAudio.th) | 205 (list 503) | 4.9 stars, 426 reviews, 3k+ sold, Shopee-recommended shop with 31.4k shop ratings, free shipping, COD. Bare IP30 (no sleeve) = brightest. Listing states 5 V and WS2812B and shows a 3-wire connector. The 1 m listing from MASSMORE (4.9 stars, 49 reviews, 495 sold, 149 baht per metre, only 9 in stock) is a fallback, but it is sold per metre. | https://shopee.co.th/product/1219087673/29650594166 |
| 6 | Power bank 10000 mAh with USB-A | "Orsen by Eloop" listing, pick the "E53 10000mAh" variant (Bangkok, official Orsen/Eloop shop) | 599 (range 599-1,259 by model) | 4.9 stars, 2.9k reviews, 10k+ sold, Thai safety mark (มอก. 2879-2560) and 1-year warranty shown. The manual lists USB-A at 5 V 3 A (also 9 V/12 V when negotiated), total 20 W, 141.5 x 68 x 15.5 mm, 228 g. It is NOT confirmed whether it switches off at a low load: test with the USB tester. | https://shopee.co.th/product/375419813/15491998680 |
| 7 | USB-A female breakout (to feed 5 V to the transmitter) | "โมดูล USB-C, USB-A Female Breakout Board 2.54mm Header", pick TYPE A (Chonburi) | 40-45 | 5.0 stars, 11 reviews, 76 sold, 21 in stock. The screw-terminal one I listed before (Warmhomezj) has only 1 sale: dropped. | https://shopee.co.th/product/43897637/18594826376 |
| 8 | Enclosure 100x68x50 mm | "กล่องอเนกประสงค์ 100x68x50 mm กันน้ำ" (Rayong) | 45 | 5.0 stars, 11 reviews, 90 sold, 8 in stock. Waterproof rating not stated: seal the cable holes with silicone. | https://shopee.co.th/product/76886102/16363643515 |

## Search only (not opened, low risk parts; check the page before paying)

| # | Part | Pick | Price | Link |
|---|------|------|-------|------|
| 9 | Capacitor 1000 uF 16 V, pack of 5 (Bangkok) | choose the 16V variant | 20 | https://shopee.co.th/product/1688451461/41728558385 |
| 10 | Fuse with holder and wires (Samut Prakan) | choose a 3 A fuse | 21 | https://shopee.co.th/product/38654794/23875553145 |
| 11 | JST-SM 3-pin plug pair with wire, 20 cm (Phuket); buy 2-3 | 3-pin male-female | 15 each | https://shopee.co.th/product/39044974/6053907315 |
| 12 | Perfboard 9x15 cm (Khon Kaen) | pick the 9x15 size | 15 | https://shopee.co.th/product/459630043/13651193245 |
| 13 | Female header sockets 2.54 mm (Bangkok) | single row | 15 | https://shopee.co.th/product/57748591/18094482913 |
| 14 | Silicone wire 16-24 AWG, per metre (Rayong) | 18 AWG for power, 22-24 AWG for signals | 8-14 per metre | https://shopee.co.th/product/2276019/8212232398 |
| 15 | USB power meter KWS-10VA (Bangkok), recommended | | 99 | https://shopee.co.th/product/117988183/2664975166 |

## Not found from a Thai seller (overseas allowed)

| # | Part | Pick | Price | Link / note |
|---|------|------|-------|-------------|
| 16 | Level shifter 74AHCT125 | "SN74AHCT125N" DIP-14, pack of 5 [overseas] (search only, not opened). No Thai 74HCT125 / 74AHCT125 / 74HCT245 chip was found on Shopee after four keyword tries. | 55 | https://shopee.co.th/product/190910272/45216855533 . Needs a 14-pin IC socket (any electronics shop, Pantip Plaza / ETT style shops). Ask the electrician dad: the part is common in electronics shops. |

## Not needed any more
- Separate 3.5 mm cable: the UGREEN transmitter includes one (check the box). If it is missing, this right-angle cable was found: https://shopee.co.th/product/1576600151/44029838276 (47 baht, search only).

## Estimated total
About 1,800-2,000 baht (about 55-60 USD) with the picks above (ESP32 WROVER 288 + MPU 67 + DAC 110 + transmitter 179 + strip 205 + power bank 599 + USB breakout 45 + box 45 + shifter 55 + small parts about 200). Add 100-300 baht for shipping/spares. Heat shrink, VHB/foam tape, an IC socket and soldering tools come from a hardware/electronics shop or your dad.

## Open checks before paying
1. Strip page: choose "IP30 2M 60LED/m" in black or white PCB variant, quantity 1.
2. Power bank page: choose "E53 10000mAh" and confirm the price is about 599; it has a USB-A port.
3. Transmitter: after it arrives, test that it reconnects to your speakers after a power cycle.
4. WROVER: GPIO 16 and 17 are used by the PSRAM and cannot be used for other things (the firmware plan accounts for this).
