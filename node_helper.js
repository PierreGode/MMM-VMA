const NodeHelper = require("node_helper");
const fetch = require("node-fetch");
const { HttpsProxyAgent } = require("https-proxy-agent");

const BASE_URL = "https://api.krisinformation.se/v3";

module.exports = NodeHelper.create({
  start() {
    this.fetchTimer = null;
    this.isSuspended = false;
    this.config = null;
    const proxyUrl =
      process.env.HTTPS_PROXY ||
      process.env.https_proxy ||
      process.env.HTTP_PROXY ||
      process.env.http_proxy ||
      null;
    this.proxyAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : null;
  },

  stop() {
    if (this.fetchTimer) {
      clearTimeout(this.fetchTimer);
      this.fetchTimer = null;
    }
  },

  socketNotificationReceived(notification, payload) {
    switch (notification) {
      case "VMA_CONFIG":
        this.config = payload;
        this.isSuspended = false;
        this.scheduleNextFetch(0);
        break;
      case "VMA_PAUSE":
        this.isSuspended = true;
        if (this.fetchTimer) {
          clearTimeout(this.fetchTimer);
          this.fetchTimer = null;
        }
        break;
      case "VMA_RESUME":
        if (!this.config) {
          break;
        }
        if (!this.isSuspended) {
          break;
        }
        this.isSuspended = false;
        this.scheduleNextFetch(0);
        break;
      default:
        break;
    }
  },

  scheduleNextFetch(delay = null) {
    if (!this.config) {
      return;
    }

    const baseInterval = typeof delay === "number" ? delay : this.config.updateInterval;
    const fallbackInterval = this.config.updateInterval || 15 * 60 * 1000;
    const interval = Math.max(0, Number.isFinite(baseInterval) ? baseInterval : fallbackInterval);

    if (this.fetchTimer) {
      clearTimeout(this.fetchTimer);
    }

    this.fetchTimer = setTimeout(() => {
      this.fetchTimer = null;
      if (this.isSuspended) {
        return;
      }
      this.fetchData().catch((error) => {
        this.sendSocketNotification("VMA_ERROR", { message: error.message || "Unknown error" });
        const retryDelay = Math.min(
          this.config.retryDelay || 5 * 60 * 1000,
          this.config.updateInterval || 15 * 60 * 1000
        );
        this.scheduleNextFetch(retryDelay);
      });
    }, interval);
  },

  async fetchData() {
    const alerts = await this.loadAlerts();
    this.sendSocketNotification("VMA_DATA", { alerts });
    this.scheduleNextFetch(this.config.updateInterval);
  },

  async loadAlerts() {
    const params = this.buildQuery();
    const url = `${BASE_URL}/vmas${params}`;
    const alertsResponse = await this.request(url);
    const alerts = Array.isArray(alertsResponse) ? alertsResponse : [];

    let combined = alerts;
    if (this.config.includeTestVma) {
      const testUrl = `${BASE_URL}/testvmas${params}`;
      const testResponse = await this.request(testUrl);
      const testAlerts = Array.isArray(testResponse) ? testResponse : [];
      combined = [...alerts, ...testAlerts.map((item) => ({ ...item, IsTest: true }))];
    }

    const normalized = combined.map((entry) => this.normalizeEntry(entry));
    normalized.sort((a, b) => new Date(b.published) - new Date(a.published));
    return normalized;
  },

  buildQuery() {
    const searchParams = new URLSearchParams();
    if (this.config.language) {
      searchParams.set("language", this.config.language);
    }
    const counties = Array.isArray(this.config.counties) ? this.config.counties.filter(Boolean) : [];
    if (counties.length) {
      searchParams.set("counties", counties.join(","));
      if (typeof this.config.allCounties !== "undefined") {
        searchParams.set("allCounties", this.config.allCounties ? "true" : "false");
      }
    } else if (typeof this.config.allCounties !== "undefined") {
      searchParams.set("allCounties", this.config.allCounties ? "true" : "false");
    }

    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : "";
  },

  async request(url) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "MMM-VMA/1.0 (+https://magicmirror.builders/)"
      },
      agent: this.proxyAgent || undefined
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    return response.json();
  },

  normalizeEntry(entry) {
    const published = entry.Published || entry.Updated;
    const updated = entry.Updated || entry.Published;

    const areas = Array.isArray(entry.Area)
      ? entry.Area.map((area) => area.Description).filter(Boolean)
      : [];

    const preamble = entry.Preamble || entry.PushMessage || "";
    const bodyText = entry.BodyText || "";

    return {
      identifier: entry.Identifier || null,
      headline: entry.Headline || null,
      preamble: preamble,
      bodyText: bodyText,
      published: published ? new Date(published).toISOString() : null,
      updated: updated ? new Date(updated).toISOString() : null,
      senderName: entry.SenderName || entry.Source || null,
      areas,
      web: entry.Web || null,
      language: entry.Language || this.config.language,
      isTest: Boolean(entry.IsTest)
    };
  }
});
