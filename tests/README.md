# Board Lights regression tests

63 tests / ~375 assertions that run the real `index.html` in headless Chrome against a **fake strip** (`stub.js` replaces `navigator.bluetooth`; **no real Bluetooth is ever used**; do not run anything here against real hardware or the laptop's Bluetooth adapter).

```
cd tests
npm install puppeteer-core            # once
node run-all.js                       # everything (~2.5 minutes), exit code 1 on failure
node run-all.js "brake"               # only tests whose name contains "brake"
```
Environment variables: `INDEX_HTML` (another copy of index.html), `CHROME` (path to chrome.exe), `PUPPETEER_CORE` (path to a puppeteer-core install).

Covers: connect/drop/reconnect, every packet byte against README.md, the write pump (latest-wins slots, gaps, urgent beats), music marker and update rates, phone-lock hand-off, brake light (GPS and fast motion mode), strip setup, pulse division, follow-the-volume, effects (valid packets only, no black, no backlog on a slow strip), localStorage defaults and migrations, and the diagnostics log. Every test also fails on any uncaught JS error or console warning.

Run it before every push. A test that fails only sometimes is a timing problem in the test or a real race; the power-off test once exposed a real one (a stale colour frame sent after the OFF packet).
