function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(body);
  return true;
}

function sendError(response, error) {
  const statusCode = error.statusCode || 500;
  return sendJson(response, statusCode, {
    ok: false,
    error: {
      code: error.code || "internal_error",
      message: error.expose ? error.message : "Internal error"
    }
  });
}

function routeError(code, message, statusCode = 400) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  error.expose = true;
  return error;
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (_error) {
    throw routeError("invalid_json", "Request body must be valid JSON", 400);
  }
}

function bearerFrom(headers) {
  const value = String(headers.authorization || "");
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

module.exports = {
  bearerFrom,
  readJson,
  routeError,
  sendError,
  sendJson
};
