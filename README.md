# MMM-VMA

MMM-VMA is a production ready [MagicMirror²](https://magicmirror.builders/) module that shows the latest
**Viktigt Meddelande till Allmänheten (VMA)** alerts published by
[Krisinformation.se](https://www.krisinformation.se/). The module consumes the official V3 API and can
optionally surface test alerts so that you are prepared for Sweden's recurring public warning tests.


## Requirements

- MagicMirror² `v2.22.0` or later.
- Node.js 16+ (MagicMirror² currently ships with Node.js 18 LTS).
- Internet access to reach `https://api.krisinformation.se/`.

## Installation

1. Change into your MagicMirror `modules` directory:

   ```bash
   cd ~/MagicMirror/modules
   ```

2. Clone this repository:

   ```bash
   git clone https://github.com/your-user/MMM-VMA.git
   ```

3. Install the Node.js dependencies inside the module folder:

   ```bash
   cd MMM-VMA
   npm install
   ```

4. Add the module to the `modules` section of your `config/config.js` file:

   ```js
   {
     module: "MMM-VMA",
     position: "top_left",
     config: {
       language: "sv",
       counties: ["Stockholms län"],
       includeTestVma: false,
       timeFormat: "relative"
     }
   }
   ```

5. Restart MagicMirror².

## Configuration

| Option              | Type      | Default                | Description |
|---------------------|-----------|------------------------|-------------|
| `language`          | `string`  | `"sv"`                 | Language hint passed to the API and used for formatting timestamps. Accepts IETF language tags such as `"sv"` or `"en"`. |
| `counties`          | `string[]`| `[]`                    | Optional list of county names to filter alerts. When empty, all alerts are returned. Example: `["Stockholms län", "Uppsala län"]`. |
| `allCounties`       | `boolean` | `true`                  | Mirrors the API parameter. When `true` an empty `counties` array means “all counties”, otherwise “no counties”. |
| `includeTestVma`    | `boolean` | `false`                 | Include messages from the `/v3/testvmas` endpoint (useful ahead of the quarterly tests). |
| `updateInterval`    | `number`  | `15 * 60 * 1000`        | Polling frequency in milliseconds. Minimum practical value is 60 000 ms (1 minute). |
| `retryDelay`        | `number`  | `5 * 60 * 1000`         | Delay before retrying after a failed request, in milliseconds. |
| `maxAlerts`         | `number`  | `5`                     | Maximum number of alerts rendered at once. |
| `fadeSpeed`         | `number`  | `1000`                  | Animation speed (ms) for DOM updates. |
| `timeFormat`        | `string`  | `"relative"`           | Set to `"absolute"` for e.g. `03 Feb 13:37`. |
| `absoluteTimeOptions` | `object` | `{ hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" }` | Overrides passed to `Intl.DateTimeFormat` when `timeFormat` is `"absolute"`. |
| `showUpdatedTime`   | `boolean` | `true`                  | Displays the updated timestamp when different from published. |
| `showAreas`         | `boolean` | `true`                  | Toggles the chip style list of affected areas (counties, municipalities, etc.). |
| `showEmptyMessage`  | `boolean` | `true`                  | Hide or show the “no active VMA” placeholder. |
| `emptyMessage`      | `object`  | `{ sv: "Inga aktiva VMA", en: "No active public warnings" }` | Customise the placeholder text. Keys can be full (`sv-SE`) or short (`sv`) language codes. |
| `loadingMessage`    | `object`  | `{ sv: "Hämtar meddelanden…", en: "Loading alerts…" }` | Customise the loading indicator. |
| `errorMessage`      | `object`  | `{ sv: "Kunde inte hämta VMA", en: "Failed to load VMA alerts" }` | Customise the error headline. |


## Features

- ✅ Polls the official Krisinformation V3 endpoints for active and test VMA alerts.
- ✅ County aware filtering so you only see messages that matter to your location.
- ✅ Localised timestamps with optional relative mode (`just now`, `3 hours ago`, …).
- ✅ Graceful error handling with automatic retries and helpful UI states.
- ✅ Lightweight styling that matches the MagicMirror aesthetic



## Troubleshooting

- **No alerts are shown** – Active VMAs are rare. Enable `includeTestVma: true` in your config to visualise
  the layout using historical test messages.
- **County filtering returns nothing** – Make sure the county names match Krisinformation's spelling
  (for example `"Värmlands län"`). Leave `counties` empty to show all alerts.
- **Firewall or proxy issues** – Ensure outbound HTTPS traffic to `api.krisinformation.se` is allowed. You can
  manually run `npm test` to confirm connectivity. The module and endpoint probe honour the standard
  `HTTPS_PROXY` / `HTTP_PROXY` environment variables used by MagicMirror².

## License

[MIT](LICENSE)

Krisinformation's content is licensed under their respective terms. Respect the upstream API usage guidelines.
