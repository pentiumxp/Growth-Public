import { clean } from "../../utils/string.js";
import { interactionKey } from "./SubmissionPanel.js";

const AUDIO_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/ogg"
];

function supportsRecordingMimeType(rootRef = {}, mimeType = "") {
  const mediaRecorder = rootRef.MediaRecorder;
  if (!mediaRecorder || typeof mediaRecorder.isTypeSupported !== "function") return false;
  try {
    return mediaRecorder.isTypeSupported(mimeType);
  } catch (error) {
    return false;
  }
}

function audioPlaybackSupport(rootRef = {}, mimeType = "") {
  if (!rootRef.document || typeof rootRef.document.createElement !== "function") return "";
  try {
    const audio = rootRef.document.createElement("audio");
    if (!audio || typeof audio.canPlayType !== "function") return "";
    return clean(audio.canPlayType(mimeType));
  } catch (error) {
    return "";
  }
}

function canPlayAudioMimeType(rootRef = {}, mimeType = "") {
  const support = audioPlaybackSupport(rootRef, mimeType);
  return support === "probably" || support === "maybe";
}

export function preferredAudioMimeType(rootRef = {}) {
  const mediaRecorder = rootRef.MediaRecorder;
  if (!mediaRecorder || typeof mediaRecorder.isTypeSupported !== "function") return "";
  const recordable = AUDIO_MIME_CANDIDATES.filter((type) => supportsRecordingMimeType(rootRef, type));
  return recordable.find((type) => canPlayAudioMimeType(rootRef, type)) || recordable[0] || "";
}

export function audioPlaybackWarning(rootRef = {}, mimeType = "") {
  return audioPlaybackSupport(rootRef, mimeType) === "unsupported"
    ? "录音已保存，但当前浏览器不能直接回放此音频格式。请重新录音；如果仍失败，可以先提交文字作答。"
    : "";
}

export function audioFileSuffix(mimeType = "") {
  const type = clean(mimeType).toLowerCase();
  if (type.includes("mp4")) return "m4a";
  if (type.includes("ogg")) return "ogg";
  return "webm";
}

function recordingKey(taskCardId = "", kind = "submission") {
  return interactionKey(taskCardId, kind || "submission");
}

function stopRecordingStream(recording = {}) {
  try {
    if (recording.stream && typeof recording.stream.getTracks === "function") {
      recording.stream.getTracks().forEach((track) => track.stop());
    }
  } catch (error) {
    // Best-effort cleanup only.
  }
}

function revokeRecordingUrl(rootRef = {}, recording = {}) {
  const urlApi = rootRef.URL || globalThis.URL;
  if (recording.url && urlApi && typeof urlApi.revokeObjectURL === "function") {
    try {
      urlApi.revokeObjectURL(recording.url);
    } catch (error) {
      // Best-effort cleanup only.
    }
  }
}

function audioFileName(kind = "submission", mimeType = "", now = () => Date.now()) {
  return `growth-${clean(kind) || "audio"}-${now()}.${audioFileSuffix(mimeType)}`;
}

export function createAudioRecorderController({
  root = globalThis,
  state = {},
  render,
  now = () => Date.now(),
  readBlobAsBase64
} = {}) {
  state.learningGrowthRecordings = state.learningGrowthRecordings || {};

  function renderState() {
    if (typeof render === "function") render(state);
  }

  function clearRecording(taskCardId = "", kind = "submission") {
    const key = recordingKey(taskCardId, kind);
    const recording = state.learningGrowthRecordings[key];
    if (!recording) return;
    if (recording.timerId && typeof root.clearInterval === "function") root.clearInterval(recording.timerId);
    if (recording.recorder && recording.status === "recording" && typeof recording.recorder.stop === "function") {
      try {
        recording.recorder.stop();
      } catch (error) {
        // The recorder may already be stopped by the browser.
      }
    }
    stopRecordingStream(recording);
    revokeRecordingUrl(root, recording);
    delete state.learningGrowthRecordings[key];
  }

  function clearAllRecordings() {
    Object.keys(state.learningGrowthRecordings || {}).forEach((key) => {
      const separator = key.lastIndexOf(":");
      clearRecording(key.slice(0, separator), key.slice(separator + 1));
    });
  }

  async function startRecording(taskCardId = "", kind = "submission") {
    const cardId = clean(taskCardId);
    const recordKind = clean(kind) || "submission";
    const key = recordingKey(cardId, recordKind);
    const mediaRecorder = root.MediaRecorder;
    if (!mediaRecorder || !root.navigator?.mediaDevices || typeof root.navigator.mediaDevices.getUserMedia !== "function") {
      state.learningGrowthRecordings[key] = { status: "unsupported", message: "当前浏览器不支持录音" };
      renderState();
      return;
    }
    clearRecording(cardId, recordKind);
    state.learningGrowthRecordings[key] = { status: "requesting", message: "正在请求麦克风" };
    renderState();
    try {
      const stream = await root.navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = preferredAudioMimeType(root);
      const recorder = new mediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks = [];
      const startedAt = now();
      const recording = {
        status: "recording",
        message: "录音中",
        recorder,
        stream,
        chunks,
        mimeType: recorder.mimeType || mimeType || "audio/webm",
        startedAt,
        elapsedMs: 0
      };
      state.learningGrowthRecordings[key] = recording;
      recorder.addEventListener("dataavailable", (event = {}) => {
        if (event.data && event.data.size > 0) chunks.push(event.data);
      });
      recorder.addEventListener("stop", () => {
        if (recording.timerId && typeof root.clearInterval === "function") root.clearInterval(recording.timerId);
        stopRecordingStream(recording);
        const durationMs = Math.max(0, now() - startedAt);
        const BlobCtor = root.Blob || globalThis.Blob;
        const blob = new BlobCtor(chunks, { type: recording.mimeType });
        const playbackWarning = blob.size > 0 ? audioPlaybackWarning(root, recording.mimeType || blob.type) : "";
        revokeRecordingUrl(root, recording);
        const urlApi = root.URL || globalThis.URL;
        Object.assign(recording, {
          status: blob.size > 0 ? "ready" : "error",
          message: blob.size > 0 ? playbackWarning || "录音已准备" : "录音为空，请重新录",
          blob: blob.size > 0 ? blob : null,
          url: blob.size > 0 && urlApi && typeof urlApi.createObjectURL === "function" ? urlApi.createObjectURL(blob) : "",
          playbackError: Boolean(playbackWarning),
          durationMs,
          elapsedMs: durationMs,
          name: audioFileName(recordKind, recording.mimeType, now),
          recorder: null,
          stream: null,
          timerId: 0
        });
        renderState();
      });
      recording.timerId = typeof root.setInterval === "function"
        ? root.setInterval(() => {
          recording.elapsedMs = Math.max(0, now() - startedAt);
          renderState();
        }, 1000)
        : 0;
      recorder.start();
      renderState();
    } catch (error) {
      state.learningGrowthRecordings[key] = {
        status: "error",
        message: error?.message || "录音启动失败"
      };
      renderState();
    }
  }

  function stopRecording(taskCardId = "", kind = "submission") {
    const key = recordingKey(taskCardId, kind);
    const recording = state.learningGrowthRecordings[key];
    if (!recording || recording.status !== "recording" || !recording.recorder) return;
    recording.status = "stopping";
    recording.message = "正在保存录音";
    try {
      recording.recorder.stop();
    } catch (error) {
      recording.status = "error";
      recording.message = error?.message || "录音停止失败";
      stopRecordingStream(recording);
    }
    renderState();
  }

  function handleRecordingPlaybackError(taskCardId = "", kind = "submission") {
    const key = recordingKey(taskCardId, kind);
    const recording = state.learningGrowthRecordings[key];
    if (!recording || recording.status !== "ready" || recording.playbackError) return;
    recording.playbackError = true;
    recording.message = "录音已保存，但当前浏览器无法回放。请重新录音；如果再次失败，可以先提交文字作答。";
    renderState();
  }

  function toggleRecording(taskCardId = "", kind = "submission") {
    const key = recordingKey(taskCardId, kind);
    const recording = state.learningGrowthRecordings[key];
    if (recording?.status === "recording") {
      stopRecording(taskCardId, kind);
      return;
    }
    startRecording(taskCardId, kind).catch((error) => {
      state.learningGrowthRecordings[key] = { status: "error", message: error?.message || String(error) };
      renderState();
    });
  }

  async function audioPayloadFromRecording(recording = {}, kind = "submission") {
    if (!recording.blob) return null;
    if (typeof readBlobAsBase64 !== "function") {
      throw new Error("audio_blob_reader_unavailable");
    }
    const dataBase64 = await readBlobAsBase64(recording.blob);
    return {
      dataBase64,
      name: recording.name || audioFileName(kind, recording.mimeType, now),
      mime: recording.mimeType || recording.blob.type || "audio/webm",
      durationMs: Number(recording.durationMs || recording.elapsedMs || 0) || 0
    };
  }

  return {
    audioPayloadFromRecording,
    clearAllRecordings,
    clearRecording,
    handleRecordingPlaybackError,
    startRecording,
    stopRecording,
    toggleRecording
  };
}
