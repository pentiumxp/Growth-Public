"use strict";

const path = require("node:path");
const {
  cleanString,
  normalizeRecordType,
  numberValue
} = require("./core");

function audioEvidenceFromRaw(raw = {}, fallbackDigest = "") {
  const nested = raw.raw && typeof raw.raw === "object" ? raw.raw.audio : null;
  const audio = raw.audio && typeof raw.audio === "object" ? raw.audio : nested;
  if (!audio || typeof audio !== "object") {
    return fallbackDigest ? { digest: fallbackDigest } : null;
  }
  return Object.assign({}, audio, fallbackDigest && !audio.digest ? { digest: fallbackDigest } : {});
}

function publicAudio(recordType, recordId, raw = {}, fallbackDigest = "") {
  const audio = audioEvidenceFromRaw(raw, fallbackDigest);
  if (!audio) return null;
  const id = cleanString(recordId);
  const type = normalizeRecordType(recordType);
  if (!id || !type) return null;
  const name = path.basename(cleanString(audio.name || audio.fileName || audio.filename));
  const digest = cleanString(audio.digest || audio.audioDigest || fallbackDigest);
  if (!name && !digest) return null;
  return {
    kind: "audio",
    name: name || "learning-audio",
    mime: cleanString(audio.mime || audio.type) || "application/octet-stream",
    size: numberValue(audio.size),
    durationMs: numberValue(audio.durationMs || audio.duration_ms),
    digest,
    url: `/api/v1/growth/audio/${type}s/${encodeURIComponent(id)}`
  };
}

function audioMimeForPlayback(audio = {}, filePath = "") {
  const explicit = cleanString(audio.mime || audio.type);
  if (explicit && explicit !== "application/octet-stream") return explicit;
  const ext = path.extname(filePath || cleanString(audio.name || audio.fileName || audio.filename)).toLowerCase();
  if (ext === ".mp3") return "audio/mpeg";
  if (ext === ".m4a" || ext === ".aac") return "audio/mp4";
  if (ext === ".wav") return "audio/wav";
  if (ext === ".webm") return "audio/webm";
  if (ext === ".ogg" || ext === ".opus") return "audio/ogg";
  return explicit || "application/octet-stream";
}

module.exports = {
  audioEvidenceFromRaw,
  audioMimeForPlayback,
  publicAudio
};
