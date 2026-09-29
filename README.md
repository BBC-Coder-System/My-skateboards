# My-skateboards

Web controller for the MELK-OA10 LED strip under my skateboard. Open in **Bluefy** on iPhone:
https://bbc-coder-system.github.io/My-skateboards/

- `index.html`: the controller (colours, flows, flash, music, motion, built-in effects, favourites)
- `probe.html`: guided protocol finder used to confirm the commands
- `test.html`, `phase3-test.html`: earlier experiments

## Protocol (service FFF0, write char FFF3, write-without-response)

Confirmed on the strip with `probe.html`:

| Action | Bytes |
|---|---|
| Wake-up after connect | `7e0783`, then `7e0404` |
| Power on / off | `7e0404f00001ff00ef` / `7e0404000000ff00ef` |
| Colour | `7e070503 RR GG BB 10ef` |
| Built-in effect (older form) | `7e0503 NN 03ffff00ef` (NN=156 moved along the strip) |

From the LotusLamp X Android app (v5.19.14), which treats `MELK-OA…` names as a SYMPHONY (addressable) device. Not yet confirmed on the strip:

| Action | Bytes |
|---|---|
| Built-in effect NN (0–233) | `7e0703 NN 06ffff00ef` |
| Effect speed SS (1–100) | `7e0702 SS ffffff00ef` |
| Brightness BB (0–100) | `7e0401 BB 01ff0201ef` |
| LED count N (10–1000) | `7e0721 LL HH 00ff00ef` (N low byte, high byte) |
| Wire order | `7e0781 a b c ff00ef` (R=1 G=2 B=3, e.g. GRB = `02 01 03`) |

All frames are 9 bytes: `7E len cmd p1 p2 p3 p4 p5 EF`, with unused parameters padded as `FF … 00`. The 234 effect names and numbers are in `SY_MODES` in `index.html`.

Streaming colour updates stays smooth at about 15–20 per second.
