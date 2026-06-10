const fs = require("node:fs");
const path = require("node:path");

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8"
};

function handleStaticRoute(request, response, url) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return false;
  }
  const publicRoot = path.join(process.cwd(), "public");
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.normalize(path.join(publicRoot, pathname));
  if (!filePath.startsWith(publicRoot)) {
    return false;
  }
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return false;
  }
  response.writeHead(200, {
    "content-type": MIME_TYPES[path.extname(filePath)] || "application/octet-stream",
    "cache-control": "no-store"
  });
  if (request.method === "HEAD") {
    response.end();
  } else {
    response.end(fs.readFileSync(filePath));
  }
  return true;
}

module.exports = { handleStaticRoute };
