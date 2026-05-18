const target = process.env.BACKEND_URL || "http://localhost:8080";

const PROXY_CONFIG = {
  "/api": {
    "target": target,
    "secure": false
  }
};

module.exports = PROXY_CONFIG;