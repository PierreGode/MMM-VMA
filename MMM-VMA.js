/* global Module */

Module.register("MMM-VMA", {
  defaults: {
    language: "sv",
    counties: [],
    allCounties: true,
    includeTestVma: false,
    updateInterval: 15 * 60 * 1000, // 15 minutes
    retryDelay: 5 * 60 * 1000,
    maxAlerts: 5,
    fadeSpeed: 1000,
    timeFormat: "relative", // "relative" | "absolute"
    absoluteTimeOptions: {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short"
    },
    showUpdatedTime: true,
    showAreas: true,
    showEmptyMessage: true,
    emptyMessage: {
      sv: "Inga aktiva VMA",
      en: "No active public warnings"
    },
    loadingMessage: {
      sv: "Hämtar meddelanden…",
      en: "Loading alerts…"
    },
    errorMessage: {
      sv: "Kunde inte hämta VMA",
      en: "Failed to load VMA alerts"
    }
  },

  requiresVersion: "2.22.0",

  start() {
    this.alerts = [];
    this.loaded = false;
    this.error = null;
    this.sendSocketNotification("VMA_CONFIG", this.config);
  },

  getStyles() {
    return ["MMM-VMA.css"];
  },

  getTranslations() {
    return {
      en: "translations/en.json",
      sv: "translations/sv.json"
    };
  },

  getDom() {
    const wrapper = document.createElement("div");
    wrapper.className = "mmm-vma";

    if (!this.loaded) {
      wrapper.classList.add("loading");
      wrapper.textContent = this.getLocalizedText(this.config.loadingMessage);
      return wrapper;
    }

    if (this.error) {
      wrapper.classList.add("error");
      wrapper.textContent = this.getLocalizedText(this.config.errorMessage);
      const details = document.createElement("div");
      details.className = "error-details";
      details.textContent = this.error.message || "";
      wrapper.appendChild(details);
      return wrapper;
    }

    if (!this.alerts.length) {
      if (!this.config.showEmptyMessage) {
        wrapper.classList.add("empty");
        return wrapper;
      }
      wrapper.classList.add("empty");
      wrapper.textContent = this.getLocalizedText(this.config.emptyMessage);
      return wrapper;
    }

    const list = document.createElement("div");
    list.className = "vma-list";

    this.alerts.slice(0, this.config.maxAlerts).forEach((alert) => {
      list.appendChild(this.renderAlert(alert));
    });

    wrapper.appendChild(list);
    return wrapper;
  },

  renderAlert(alert) {
    const container = document.createElement("article");
    container.className = "vma-entry";
    if (alert.isTest) {
      container.classList.add("vma-entry-test");
    }

    const header = document.createElement("header");
    header.className = "vma-header";

    const title = document.createElement("h3");
    title.className = "vma-headline";
    title.textContent = alert.headline || this.translate("NO_HEADLINE");
    header.appendChild(title);

    const meta = document.createElement("div");
    meta.className = "vma-meta";

    const published = document.createElement("span");
    published.className = "vma-time";
    published.textContent = this.formatTimestamp(alert.published);
    meta.appendChild(published);

    if (this.config.showUpdatedTime && alert.updated && alert.updated !== alert.published) {
      const updated = document.createElement("span");
      updated.className = "vma-time vma-updated";
      updated.textContent = `${this.translate("UPDATED")}: ${this.formatTimestamp(alert.updated)}`;
      meta.appendChild(updated);
    }

    if (alert.isTest) {
      const badge = document.createElement("span");
      badge.className = "vma-badge";
      badge.textContent = this.translate("TEST_VMA");
      meta.appendChild(badge);
    }

    if (alert.senderName) {
      const sender = document.createElement("span");
      sender.className = "vma-sender";
      sender.textContent = alert.senderName;
      meta.appendChild(sender);
    }

    header.appendChild(meta);
    container.appendChild(header);

    if (alert.preamble) {
      const preamble = document.createElement("div");
      preamble.className = "vma-preamble";
      this.appendParagraphs(preamble, alert.preamble);
      container.appendChild(preamble);
    }

    if (alert.bodyText) {
      const body = document.createElement("div");
      body.className = "vma-body";
      this.appendParagraphs(body, alert.bodyText);
      container.appendChild(body);
    }

    if (this.config.showAreas && alert.areas.length) {
      const areas = document.createElement("ul");
      areas.className = "vma-areas";
      alert.areas.forEach((area) => {
        const item = document.createElement("li");
        item.textContent = area;
        areas.appendChild(item);
      });
      container.appendChild(areas);
    }

    if (alert.web) {
      const link = document.createElement("a");
      link.className = "vma-link";
      link.href = alert.web;
      link.textContent = this.translate("MORE_INFO");
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      container.appendChild(link);
    }

    return container;
  },

  appendParagraphs(container, text = "") {
    if (!text) {
      return;
    }
    const trimmed = text.replace(/\r\n/g, "\n").trim();
    if (!trimmed) {
      return;
    }

    trimmed
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
      .forEach((paragraph) => {
        const p = document.createElement("p");
        p.innerHTML = this.escapeHtml(paragraph).replace(/\n/g, "<br>");
        container.appendChild(p);
      });
  },

  escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  formatTimestamp(value) {
    if (!value) {
      return "";
    }
    const date = new Date(value);
    if (this.config.timeFormat === "absolute") {
      const options = Object.assign(
        {
          hour: "2-digit",
          minute: "2-digit",
          day: "2-digit",
          month: "short"
        },
        this.config.absoluteTimeOptions || {}
      );
      return new Intl.DateTimeFormat(this.config.language || "sv", options).format(date);
    }

    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const diffMinutes = Math.round(diff / 60000);
    const absMinutes = Math.abs(diffMinutes);

    const relativeTime = (value, unit) => {
      const formatter = new Intl.RelativeTimeFormat(this.config.language || "sv", {
        numeric: "auto"
      });
      return formatter.format(value, unit);
    };

    if (absMinutes < 60) {
      return relativeTime(diffMinutes, "minute");
    }

    const diffHours = Math.round(diff / 3600000);
    if (Math.abs(diffHours) < 24) {
      return relativeTime(diffHours, "hour");
    }

    const diffDays = Math.round(diff / 86400000);
    return relativeTime(diffDays, "day");
  },

  getLocalizedText(map) {
    if (!map) {
      return "";
    }
    const language = (this.config.language || "sv").toLowerCase();
    if (map[language]) {
      return map[language];
    }
    const short = language.split("-")[0];
    if (map[short]) {
      return map[short];
    }
    if (map.default) {
      return map.default;
    }
    const fallbackKey = Object.keys(map)[0];
    return map[fallbackKey];
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "VMA_DATA") {
      this.loaded = true;
      this.error = null;
      this.alerts = payload.alerts || [];
      this.updateDom(this.config.fadeSpeed);
    } else if (notification === "VMA_ERROR") {
      this.loaded = true;
      this.error = payload;
      this.alerts = [];
      this.updateDom(this.config.fadeSpeed);
    }
  },

  suspend() {
    this.sendSocketNotification("VMA_PAUSE");
  },

  resume() {
    this.sendSocketNotification("VMA_RESUME");
  }
});
