(function registerGrowthCardInteractionController(root) {
  const AUDIO_MIME_CANDIDATES = [
    "audio/mp4",
    "audio/aac",
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg"
  ];

  function cleanValue(value) {
    return String(value ?? "").trim();
  }

  function supportsRecordingMimeType(rootRef, mimeType) {
    const type = cleanValue(mimeType);
    const mediaRecorder = rootRef.MediaRecorder;
    if (!type || !mediaRecorder || typeof mediaRecorder.isTypeSupported !== "function") return false;
    try {
      return Boolean(mediaRecorder.isTypeSupported(type));
    } catch (error) {
      return false;
    }
  }

  function audioPlaybackSupport(rootRef, mimeType) {
    const type = cleanValue(mimeType);
    if (!type) return "unknown";
    let audio = null;
    try {
      if (typeof rootRef.Audio === "function") audio = new rootRef.Audio();
      else if (rootRef.document && typeof rootRef.document.createElement === "function") audio = rootRef.document.createElement("audio");
    } catch (error) {
      audio = null;
    }
    if (!audio || typeof audio.canPlayType !== "function") return "unknown";
    const support = cleanValue(audio.canPlayType(type));
    return support === "probably" || support === "maybe" ? "supported" : "unsupported";
  }

  function canPlayAudioMimeType(rootRef, mimeType) {
    return audioPlaybackSupport(rootRef, mimeType) !== "unsupported";
  }

  function preferredAudioMimeType(rootRef = root) {
    const mediaRecorder = rootRef.MediaRecorder;
    if (!mediaRecorder || typeof mediaRecorder.isTypeSupported !== "function") return "";
    const recordable = AUDIO_MIME_CANDIDATES.filter((type) => supportsRecordingMimeType(rootRef, type));
    return recordable.find((type) => canPlayAudioMimeType(rootRef, type)) || recordable[0] || "";
  }

  function audioPlaybackWarning(rootRef, mimeType) {
    return audioPlaybackSupport(rootRef, mimeType) === "unsupported"
      ? "录音已保存，但当前浏览器不能直接回放此音频格式。请重新录音；如果仍失败，可以先提交文字作答。"
      : "";
  }

  function audioFileSuffix(mimeType) {
    const type = cleanValue(mimeType).toLowerCase();
    if (type.includes("mp4") || type.includes("m4a")) return "m4a";
    if (type.includes("aac")) return "aac";
    if (type.includes("ogg") || type.includes("opus")) return "ogg";
    return "webm";
  }

  function createGrowthCardInteractionController({
    api,
    pageState,
    model,
    viewModel,
    renderShell,
    refreshCard,
    getCurrentWorkspaceId
  } = {}) {
    function clean(value) {
      return String(value ?? "").trim();
    }

    function cssEscape(value) {
      if (root.CSS && typeof root.CSS.escape === "function") return root.CSS.escape(String(value || ""));
      return String(value || "").replace(/["\\]/g, "\\$&");
    }

    function interactionKey(taskCardId, kind) {
      return `${clean(taskCardId)}:${clean(kind)}`;
    }

    function setMessage(taskCardId, kind, message) {
      const key = interactionKey(taskCardId, kind);
      if (!key || key === ":") return;
      pageState.learningGrowthInteractionMessages[key] = clean(message);
    }

    function recordingKey(taskCardId, kind) {
      return interactionKey(taskCardId, kind || "submission");
    }

    function taskCardById(taskCardId) {
      const id = clean(taskCardId);
      if (!id) return null;
      const cards = []
        .concat(model.overview?.programs?.taskCards || [])
        .concat(model.overview?.programs?.executableTasks || [])
        .concat(model.overview?.board?.cards || []);
      return cards.find((card) => clean(card?.taskCardId || card?.id) === id) || null;
    }

    function workspaceIdForTaskCard(taskCardId, explicitWorkspaceId = "") {
      return clean(explicitWorkspaceId)
        || clean(taskCardById(taskCardId)?.workspaceId)
        || clean(pageState.cardGeneration?.selectedWorkspaceId)
        || clean(pageState.cardGeneration?.context?.target?.workspaceId)
        || clean(getCurrentWorkspaceId?.());
    }

    function revokeRecordingUrl(recording = {}) {
      if (recording.url && typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
        try {
          URL.revokeObjectURL(recording.url);
        } catch (error) {
          // Best-effort cleanup only.
        }
      }
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

    function clearRecording(taskCardId, kind) {
      const key = recordingKey(taskCardId, kind);
      const recording = pageState.learningGrowthRecordings[key];
      if (!recording) return;
      if (recording.timerId) root.clearInterval(recording.timerId);
      if (recording.recorder && recording.status === "recording" && typeof recording.recorder.stop === "function") {
        try {
          recording.recorder.stop();
        } catch (error) {
          // The recorder may already be stopped by the browser.
        }
      }
      stopRecordingStream(recording);
      revokeRecordingUrl(recording);
      delete pageState.learningGrowthRecordings[key];
    }

    function clearAllRecordings() {
      Object.keys(pageState.learningGrowthRecordings || {}).forEach((key) => {
        const separator = key.lastIndexOf(":");
        clearRecording(key.slice(0, separator), key.slice(separator + 1));
      });
    }

    function audioFileName(kind, mimeType) {
      return `growth-${clean(kind) || "audio"}-${Date.now()}.${audioFileSuffix(mimeType)}`;
    }

    function blobToBase64(blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error || new Error("audio_read_failed"));
        reader.onload = () => {
          const value = String(reader.result || "");
          resolve(value.includes(",") ? value.slice(value.indexOf(",") + 1) : value);
        };
        reader.readAsDataURL(blob);
      });
    }

    async function audioPayloadFromRecording(recording = {}, kind = "submission") {
      if (!recording.blob) return null;
      const dataBase64 = await blobToBase64(recording.blob);
      return {
        dataBase64,
        name: recording.name || audioFileName(kind, recording.mimeType),
        mime: recording.mimeType || recording.blob.type || "audio/webm",
        durationMs: Number(recording.durationMs || recording.elapsedMs || 0) || 0
      };
    }

    async function startRecording(taskCardId, kind = "submission") {
      const cardId = clean(taskCardId);
      const recordKind = clean(kind) || "submission";
      const key = recordingKey(cardId, recordKind);
      const mediaRecorder = root.MediaRecorder;
      if (!mediaRecorder || !root.navigator?.mediaDevices || typeof root.navigator.mediaDevices.getUserMedia !== "function") {
        pageState.learningGrowthRecordings[key] = { status: "unsupported", message: "当前浏览器不支持录音" };
        renderShell();
        return;
      }
      clearRecording(cardId, recordKind);
      pageState.learningGrowthRecordings[key] = { status: "requesting", message: "正在请求麦克风" };
      renderShell();
      try {
        const stream = await root.navigator.mediaDevices.getUserMedia({ audio: true });
        const mimeType = preferredAudioMimeType(root);
        const recorder = new mediaRecorder(stream, mimeType ? { mimeType } : undefined);
        const chunks = [];
        const startedAt = Date.now();
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
        pageState.learningGrowthRecordings[key] = recording;
        recorder.addEventListener("dataavailable", (event) => {
          if (event.data && event.data.size > 0) chunks.push(event.data);
        });
        recorder.addEventListener("stop", () => {
          if (recording.timerId) root.clearInterval(recording.timerId);
          stopRecordingStream(recording);
          const durationMs = Math.max(0, Date.now() - startedAt);
          const blob = new Blob(chunks, { type: recording.mimeType });
          const playbackWarning = blob.size > 0 ? audioPlaybackWarning(root, recording.mimeType || blob.type) : "";
          revokeRecordingUrl(recording);
          Object.assign(recording, {
            status: blob.size > 0 ? "ready" : "error",
            message: blob.size > 0 ? playbackWarning || "录音已准备" : "录音为空，请重新录",
            blob: blob.size > 0 ? blob : null,
            url: blob.size > 0 && typeof URL !== "undefined" && typeof URL.createObjectURL === "function" ? URL.createObjectURL(blob) : "",
            playbackError: Boolean(playbackWarning),
            durationMs,
            elapsedMs: durationMs,
            name: audioFileName(recordKind, recording.mimeType),
            recorder: null,
            stream: null,
            timerId: 0
          });
          renderShell();
        });
        recording.timerId = root.setInterval(() => {
          recording.elapsedMs = Math.max(0, Date.now() - startedAt);
          renderShell();
        }, 1000);
        recorder.start();
        renderShell();
      } catch (error) {
        pageState.learningGrowthRecordings[key] = {
          status: "error",
          message: error.message || "录音启动失败"
        };
        renderShell();
      }
    }

    function stopRecording(taskCardId, kind = "submission") {
      const key = recordingKey(taskCardId, kind);
      const recording = pageState.learningGrowthRecordings[key];
      if (!recording || recording.status !== "recording" || !recording.recorder) return;
      recording.status = "stopping";
      recording.message = "正在保存录音";
      try {
        recording.recorder.stop();
      } catch (error) {
        recording.status = "error";
        recording.message = error.message || "录音停止失败";
        stopRecordingStream(recording);
      }
      renderShell();
    }

    function handleRecordingPlaybackError(taskCardId, kind = "submission") {
      const key = recordingKey(taskCardId, kind);
      const recording = pageState.learningGrowthRecordings[key];
      if (!recording || recording.status !== "ready" || recording.playbackError) return;
      recording.playbackError = true;
      recording.message = "录音已保存，但当前浏览器无法回放。请重新录音；如果再次失败，可以先提交文字作答。";
      renderShell();
    }

    function toggleRecording(taskCardId, kind = "submission") {
      const key = recordingKey(taskCardId, kind);
      const recording = pageState.learningGrowthRecordings[key];
      if (recording?.status === "recording") {
        stopRecording(taskCardId, kind);
        return;
      }
      startRecording(taskCardId, kind).catch((error) => {
        pageState.learningGrowthRecordings[key] = { status: "error", message: error.message || String(error) };
        renderShell();
      });
    }

    function mergeCardFromWriteResult(result = {}, taskCardId, workspaceId) {
      if (!result.card) return;
      const card = viewModel.normalizeCard(Object.assign({}, result.card, {
        workspaceId: result.card.workspaceId || result.card.workspace_id || workspaceId
      }));
      const cacheKey = `${workspaceIdForTaskCard(taskCardId, workspaceId)}:${clean(card.taskCardId || taskCardId)}`;
      model.detailCache.set(cacheKey, card);
    }

    function submissionTextForCard(taskCardId, form) {
      const id = clean(taskCardId);
      const draft = pageState.learningGrowthTeachingDrafts[id] || {};
      const quickInput = form.querySelector(`[data-learning-growth-teaching-draft="${cssEscape(id)}"][data-field="quickCheckText"]`);
      const guided = clean(draft.guidedPracticeText);
      const quick = clean(quickInput?.value || draft.quickCheckText);
      return [
        guided ? `跟做：${guided}` : "",
        quick ? `检查：${quick}` : ""
      ].filter(Boolean).join("\n\n");
    }

    function setSubmissionBusy(taskCardId, value) {
      const id = clean(taskCardId);
      pageState.learningGrowthSubmissionBusy[id] = Boolean(value);
      pageState.learningGrowthTeachingCheckBusy[id] = Boolean(value);
    }

    async function refreshEvaluation(taskCardId, workspaceId = "") {
      const cardId = clean(taskCardId);
      const targetWorkspaceId = workspaceIdForTaskCard(cardId, workspaceId);
      pageState.learningGrowthEvaluationBusy[cardId] = true;
      setMessage(cardId, "evaluation", "正在请求一次批改处理。");
      renderShell();
      try {
        await api.processGrowthEvaluations(targetWorkspaceId, 3);
        setMessage(cardId, "evaluation", "批改状态已刷新。");
      } catch (error) {
        setMessage(cardId, "evaluation", `批改暂未完成：${error.message || String(error)}`);
      } finally {
        pageState.learningGrowthEvaluationBusy[cardId] = false;
      }
      await refreshCard(cardId, targetWorkspaceId);
    }

    async function submitEvidence(form) {
      const cardId = clean(form.dataset.learningGrowthSubmissionForm || form.dataset.learningGrowthTeachingCheckForm);
      if (!cardId) return;
      const workspaceId = workspaceIdForTaskCard(cardId, form.dataset.workspaceId);
      const text = submissionTextForCard(cardId, form);
      const recording = pageState.learningGrowthRecordings[recordingKey(cardId, "submission")] || {};
      if (!text && !recording.blob) {
        setMessage(cardId, "submission", "请先写一点作答，或录一段作答音频。");
        renderShell();
        return;
      }
      setSubmissionBusy(cardId, true);
      setMessage(cardId, "submission", "正在提交作答。");
      renderShell();
      try {
        const audio = await audioPayloadFromRecording(recording, "submission");
        const payload = {
          text,
          author: "learner",
          stage: "final",
          source: "growth-plugin-card-ui"
        };
        if (audio) payload.audio = audio;
        const result = await api.submitGrowthCardEvidence(cardId, payload, workspaceId);
        mergeCardFromWriteResult(result, cardId, workspaceId);
        setMessage(cardId, "submission", "作答已提交，正在刷新批改。");
        await refreshEvaluation(cardId, workspaceId);
        clearRecording(cardId, "submission");
      } catch (error) {
        setMessage(cardId, "submission", error.message || String(error));
        renderShell();
      } finally {
        setSubmissionBusy(cardId, false);
        renderShell();
      }
    }

    async function submitReflection(form) {
      const cardId = clean(form.dataset.learningGrowthReflectionForm);
      if (!cardId) return;
      const workspaceId = workspaceIdForTaskCard(cardId, form.dataset.workspaceId);
      const text = clean(form.querySelector(`[data-learning-growth-reflection-text="${cssEscape(cardId)}"]`)?.value || pageState.learningGrowthReflectionDrafts[cardId]?.text);
      const recording = pageState.learningGrowthRecordings[recordingKey(cardId, "reflection")] || {};
      if (!text && !recording.blob) {
        setMessage(cardId, "reflection", "请先写一句反思，或录一段反思音频。");
        renderShell();
        return;
      }
      pageState.learningGrowthReflectionBusy[cardId] = true;
      setMessage(cardId, "reflection", "正在提交反思。");
      renderShell();
      try {
        const audio = await audioPayloadFromRecording(recording, "reflection");
        const payload = {
          text,
          author: "learner",
          source: "growth-plugin-card-ui"
        };
        if (audio) payload.audio = audio;
        const result = await api.submitGrowthCardReflection(cardId, payload, workspaceId);
        mergeCardFromWriteResult(result, cardId, workspaceId);
        clearRecording(cardId, "reflection");
        delete pageState.learningGrowthReflectionDrafts[cardId];
        setMessage(cardId, "reflection", "反思已提交。");
        await refreshCard(cardId, workspaceId);
      } catch (error) {
        setMessage(cardId, "reflection", error.message || String(error));
        renderShell();
      } finally {
        pageState.learningGrowthReflectionBusy[cardId] = false;
        renderShell();
      }
    }

    return {
      clearAllRecordings,
      clearRecording,
      handleRecordingPlaybackError,
      refreshEvaluation,
      setMessage,
      submitEvidence,
      submitReflection,
      toggleRecording,
      workspaceIdForTaskCard
    };
  }

  root.HermesGrowthCardInteractionController = {
    createGrowthCardInteractionController,
    __test: {
      audioPlaybackSupport,
      canPlayAudioMimeType,
      preferredAudioMimeType
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
