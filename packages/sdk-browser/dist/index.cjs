"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  captureException: () => captureException,
  captureMessage: () => captureMessage,
  init: () => init,
  installGlobalHandlers: () => installGlobalHandlers
});
module.exports = __toCommonJS(index_exports);

// src/utils.ts
function safeStringify(obj, maxLength = 5e4) {
  const seen2 = /* @__PURE__ */ new WeakSet();
  const json = JSON.stringify(obj, (_key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen2.has(value)) return "[Circular]";
      seen2.add(value);
    }
    if (typeof value === "string" && value.length > 1e4) {
      return value.slice(0, 1e4) + "\u2026[truncated]";
    }
    return value;
  });
  if (json && json.length > maxLength) {
    return json.slice(0, maxLength) + "\u2026[truncated]";
  }
  return json ?? "{}";
}
function normalizeError(input) {
  if (input instanceof Error) {
    return {
      message: input.message || String(input),
      stack: input.stack ?? null
    };
  }
  if (typeof input === "string") {
    return { message: input, stack: null };
  }
  return { message: String(input), stack: null };
}
function parseTopFrame(stack) {
  if (!stack) return "";
  const lines = stack.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (line.startsWith("at ")) {
      return line;
    }
  }
  return lines[1] ?? lines[0] ?? "";
}
function buildContext(extras) {
  const ctx = {};
  if (typeof window !== "undefined") {
    ctx.url = window.location.href;
    ctx.userAgent = navigator.userAgent;
    ctx.language = navigator.language;
    ctx.viewport = { width: window.innerWidth, height: window.innerHeight };
  }
  if (extras) {
    Object.assign(ctx, extras);
  }
  return ctx;
}

// src/transport.ts
var SDK_NAME = "@smart-error-tracker/browser";
var SDK_VERSION = "0.1.0";
async function sendEvent(baseUrl, apiKey, payload, timeoutMs, debug) {
  const fullPayload = {
    ...payload,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    sdk: { name: SDK_NAME, version: SDK_VERSION }
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const body = safeStringify(fullPayload);
    const res = await fetch(`${baseUrl}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey
      },
      body,
      signal: controller.signal
    });
    if (!res.ok && debug) {
      console.warn(`[SET SDK] Event rejected: ${res.status}`);
    }
  } catch (err) {
    if (debug) {
      console.warn("[SET SDK] Failed to send event:", err);
    }
  } finally {
    clearTimeout(timer);
  }
}

// src/dedupe.ts
var seen = /* @__PURE__ */ new Map();
var MAX_CACHE = 200;
function isDuplicate(signature, intervalMs) {
  const now = Date.now();
  const last = seen.get(signature);
  if (last && now - last < intervalMs) {
    return true;
  }
  if (seen.size >= MAX_CACHE) {
    const oldest = [...seen.entries()].sort((a, b) => a[1] - b[1])[0];
    if (oldest) seen.delete(oldest[0]);
  }
  seen.set(signature, now);
  return false;
}

// src/index.ts
var _config = null;
var _handlersInstalled = false;
function warn(msg) {
  if (_config?.debug !== false) {
    console.warn(`[SET SDK] ${msg}`);
  }
}
function getConfig() {
  if (!_config) {
    warn("SDK not initialized. Call init() first.");
  }
  return _config;
}
function init(config) {
  _config = {
    dedupeIntervalMs: 2e3,
    timeoutMs: 5e3,
    debug: true,
    ...config
  };
  if (_config.debug) {
    console.log("[SET SDK] Initialized", {
      baseUrl: _config.baseUrl,
      environment: _config.environment,
      release: _config.release
    });
  }
}
function captureException(error, extras) {
  const config = getConfig();
  if (!config) return;
  const { message, stack } = normalizeError(error);
  const signature = `${message}|${parseTopFrame(stack)}`;
  if (isDuplicate(signature, config.dedupeIntervalMs)) {
    if (config.debug) warn(`Duplicate dropped: ${message}`);
    return;
  }
  sendEvent(config.baseUrl, config.apiKey, {
    source: "frontend",
    message,
    stack,
    context: buildContext(extras),
    environment: config.environment ?? null,
    releaseVersion: config.release ?? null,
    level: "error"
  }, config.timeoutMs, config.debug);
}
function captureMessage(message, options) {
  const config = getConfig();
  if (!config) return;
  const signature = `msg|${message}`;
  if (isDuplicate(signature, config.dedupeIntervalMs)) {
    if (config.debug) warn(`Duplicate dropped: ${message}`);
    return;
  }
  sendEvent(config.baseUrl, config.apiKey, {
    source: "frontend",
    message,
    stack: null,
    context: buildContext(options?.extras),
    environment: config.environment ?? null,
    releaseVersion: config.release ?? null,
    level: options?.level ?? "info"
  }, config.timeoutMs, config.debug);
}
function installGlobalHandlers() {
  const config = getConfig();
  if (!config) return;
  if (_handlersInstalled) {
    warn("Global handlers already installed.");
    return;
  }
  if (typeof window === "undefined") {
    warn("Not a browser environment, skipping global handlers.");
    return;
  }
  window.addEventListener("error", (event) => {
    captureException(event.error ?? event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });
  window.addEventListener("unhandledrejection", (event) => {
    captureException(event.reason ?? "Unhandled Promise Rejection");
  });
  _handlersInstalled = true;
  if (config.debug) {
    console.log("[SET SDK] Global handlers installed (error + unhandledrejection)");
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  captureException,
  captureMessage,
  init,
  installGlobalHandlers
});
