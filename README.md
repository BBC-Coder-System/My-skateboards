# My-skateboards

Web controller for the MELK-OA10 LED strip under my skateboard. Open in **Bluefy** on iPhone:
https://bbc-coder-system.github.io/My-skateboards/

- `index.html`: the controller (colours, flows, flash, music, motion, built-in effects, favourites)
- `probe.html`: guided protocol finder used to confirm the commands
- `test.html`, `phase3-test.html`: earlier experiments

## Confirmed protocol (service FFF0, write char FFF3, write-without-response)

| Action | Bytes |
|---|---|
| Wake-up after connect | `7e0783`, then `7e0404` |
| Power on / off | `7e0404f00001ff00ef` / `7e0404000000ff00ef` |
| Colour | `7e070503 RR GG BB 10ef` |
| Built-in effect n | `7e0503 (80+n) 03ffff00ef` (#28 moves along the strip) |
| Brightness | no working command found, so the app scales RGB |
| Effect speed | `7e0402 SS ffffff00ef`, unconfirmed |

Streaming colour updates stays smooth at about 17–20 per second.
