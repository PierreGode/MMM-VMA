#!/usr/bin/env node
const fetch = require("node-fetch");
const { HttpsProxyAgent } = require("https-proxy-agent");

const proxyUrl =
  process.env.HTTPS_PROXY ||
  process.env.https_proxy ||
  process.env.HTTP_PROXY ||
  process.env.http_proxy ||
  null;
const proxyAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : null;

const BASE_URL = "https://api.krisinformation.se/v3";
const endpoints = [
  {
    name: "Active VMAs",
    url: BASE_URL + "/vmas",
    description: "Important public warnings"
  },
  {
    name: "Test VMAs",
    url: BASE_URL + "/testvmas",
    description: "Test warnings (should normally be empty)"
  },
  {
    name: "Push entities",
    url: BASE_URL + "/pushentities?includeTestVma=true",
    description: "Aggregated feed used by Krisinformation push services"
  }
];

async function probe(endpoint) {
  const response = await fetch(endpoint.url, {
    headers: {
      "User-Agent": "MMM-VMA Endpoint Test/1.0"
    },
    agent: proxyAgent || undefined
  });

  const contentType = response.headers.get("content-type") || "";
  let payload;
  if (contentType.includes("application/json")) {
    payload = await response.json();
  } else {
    payload = await response.text();
  }

  return {
    status: response.status,
    ok: response.ok,
    payload
  };
}

(async () => {
  const results = [];
  for (const endpoint of endpoints) {
    process.stdout.write("\nTesting " + endpoint.name + " (" + endpoint.description + ")...");
    try {
      const result = await probe(endpoint);
      let summary;
      if (Array.isArray(result.payload)) {
        summary = result.payload.length + " items";
      } else if (result.payload && typeof result.payload === "object") {
        summary = Object.keys(result.payload).length + " keys";
      } else if (typeof result.payload === "string") {
        summary = Math.min(result.payload.length, 80) + " chars";
      } else {
        summary = String(result.payload);
      }
      process.stdout.write(
        " " + result.status + " " + (result.ok ? "OK" : "FAIL") + " (" + summary + ")"
      );
      results.push({ endpoint: endpoint.name, ok: result.ok });
    } catch (error) {
      process.stdout.write(" ERROR (" + error.message + ")");
      results.push({ endpoint: endpoint.name, ok: false, error: error.message });
    }
  }

  const failed = results.filter((item) => !item.ok);
  process.stdout.write("\n\n");
  if (failed.length) {
    console.error(failed.length + " endpoint(s) failed.");
    process.exitCode = 1;
  } else {
    console.log("All endpoints responded successfully.");
  }
})();
