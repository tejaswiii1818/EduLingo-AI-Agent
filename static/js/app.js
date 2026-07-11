/**
 * EduLingo AI Agent — app.js
 *
 * Modules:
 *   1. Sidebar (mobile toggle + overlay)
 *   2. Active nav-link highlight
 *   3. Document upload  (dashboard page)
 *   4. Translate page
 *   5. Summarize page
 *   6. Explain page
 *   7. Ask (RAG) page
 *   8. Quiz page
 *   9. History page
 *  10. AI Chat page
 *  11. Placeholder card feedback (dashboard)
 * ══════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  // ── Session storage key shared across pages ──────────────────────────────
  // localStorage is used so the session_id survives page refreshes, browser
  // restarts, and navigation between Flask routes.
  var SESSION_KEY = "edulingo_session";

  function saveSession(data) {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(data));
    } catch (_) { /* storage quota exceeded or private-mode restriction */ }
  }

  function loadSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }

  function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch (_) { }
  }

  /* ══════════════════════════════════════════════════════════════════════
     1. SIDEBAR
     ══════════════════════════════════════════════════════════════════════ */

  var sidebarToggle = document.getElementById("sidebarToggle");
  var sidebar       = document.getElementById("sidebar");
  var overlay       = document.getElementById("sidebarOverlay");

  function openSidebar() {
    sidebar.classList.add("open");
    if (overlay) overlay.style.display = "block";
  }

  function closeSidebar() {
    sidebar.classList.remove("open");
    if (overlay) overlay.style.display = "none";
  }

  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", function () {
      sidebar.classList.contains("open") ? closeSidebar() : openSidebar();
    });
  }

  if (overlay) overlay.addEventListener("click", closeSidebar);

  /* ══════════════════════════════════════════════════════════════════════
     2. ACTIVE NAV LINK
     ══════════════════════════════════════════════════════════════════════ */

  var activeSlug = document.body.dataset.active || "dashboard";

  document.querySelectorAll(".sidebar-nav .nav-link").forEach(function (link) {
    if (link.dataset.page === activeSlug) link.classList.add("active");
  });

  /* ══════════════════════════════════════════════════════════════════════
     3. DOCUMENT UPLOAD MODULE  (dashboard only)
     ══════════════════════════════════════════════════════════════════════ */

  var dropZone       = document.getElementById("dropZone");
  var fileInput      = document.getElementById("fileInput");
  var fileInfo       = document.getElementById("fileInfo");
  var fileInfoName   = document.getElementById("fileInfoName");
  var fileInfoSize   = document.getElementById("fileInfoSize");
  var clearFileBtn   = document.getElementById("clearFile");
  var uploadBtn      = document.getElementById("uploadBtn");
  var uploadProgress = document.getElementById("uploadProgress");
  var progressBar    = document.getElementById("uploadProgressBar");
  var progressLabel  = document.getElementById("uploadProgressLabel");
  var successBox     = document.getElementById("uploadSuccess");
  var successMsg     = document.getElementById("uploadSuccessMsg");
  var errorBox       = document.getElementById("uploadError");
  var errorMsg       = document.getElementById("uploadErrorMsg");
  var docResultRow   = document.getElementById("docResultRow");
  var statFiles      = document.getElementById("stat-files");

  if (dropZone) {
    var selectedFile  = null;
    var ALLOWED_EXTS  = /\.(pdf|docx|pptx|txt)$/i;
    var MAX_BYTES     = 50 * 1024 * 1024;

    function formatSize(bytes) {
      if (bytes < 1024)        return bytes + " B";
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
      return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    }

    function clearUploadAlerts() {
      successBox.classList.add("d-none");
      errorBox.classList.add("d-none");
    }

    function showUploadError(msg) {
      errorMsg.textContent = msg;
      errorBox.classList.remove("d-none");
      successBox.classList.add("d-none");
    }

    function showUploadSuccess(msg) {
      successMsg.textContent = msg;
      successBox.classList.remove("d-none");
      errorBox.classList.add("d-none");
    }

    function selectFile(file) {
      clearUploadAlerts();
      if (!ALLOWED_EXTS.test(file.name)) {
        showUploadError("Unsupported file type. Please upload a PDF, DOCX, PPTX, or TXT file.");
        return;
      }
      if (file.size > MAX_BYTES) {
        showUploadError("File exceeds the 50 MB limit. Please choose a smaller file.");
        return;
      }
      selectedFile = file;
      fileInfoName.textContent = file.name;
      fileInfoSize.textContent = formatSize(file.size);
      fileInfo.classList.remove("d-none");
      uploadBtn.disabled = false;
      uploadProgress.classList.add("d-none");
      progressLabel.classList.add("d-none");
      progressBar.style.width = "0%";
    }

    function clearSelection() {
      selectedFile = null;
      fileInput.value = "";
      fileInfo.classList.add("d-none");
      uploadBtn.disabled = true;
      clearUploadAlerts();
      uploadProgress.classList.add("d-none");
      progressLabel.classList.add("d-none");
      progressBar.style.width = "0%";
    }

    function animateUploadProgress(targetPct, onDone) {
      var current = parseInt(progressBar.style.width) || 0;
      var step    = (targetPct - current) / 20;
      uploadProgress.classList.remove("d-none");
      progressLabel.classList.remove("d-none");
      progressLabel.textContent = "Uploading…";
      var interval = setInterval(function () {
        current = Math.min(current + Math.max(step, 0.5), targetPct);
        progressBar.style.width = current + "%";
        progressBar.setAttribute("aria-valuenow", Math.round(current));
        if (current >= targetPct) {
          clearInterval(interval);
          if (onDone) onDone();
        }
      }, 25);
    }

    function performUpload() {
      if (!selectedFile) return;
      clearUploadAlerts();
      uploadBtn.disabled = true;
      var formData = new FormData();
      formData.append("file", selectedFile);
      animateUploadProgress(80, null);
      fetch("/api/upload", { method: "POST", body: formData })
        .then(function (r) {
          return r.json().then(function (d) { return { status: r.status, data: d }; });
        })
        .then(function (result) {
          animateUploadProgress(100, function () { progressLabel.textContent = "Done"; });
          if (result.data.success) {
            onUploadSuccess(result.data);
          } else {
            showUploadError(result.data.error || "Upload failed. Please try again.");
            uploadBtn.disabled = false;
          }
        })
        .catch(function () {
          progressBar.style.width = "0%";
          uploadProgress.classList.add("d-none");
          progressLabel.classList.add("d-none");
          showUploadError("Network error — could not reach the server. Please try again.");
          uploadBtn.disabled = false;
        });
    }

    function onUploadSuccess(data) {
      showUploadSuccess(
        '"' + data.filename + '" uploaded successfully — ' +
        data.word_count.toLocaleString() + " words" +
        (data.pages > 0 ? ", " + data.pages + " pages" : "") + "."
      );
      document.getElementById("docResultName").textContent    = data.filename;
      document.getElementById("docResultType").textContent    = data.file_type;
      document.getElementById("docResultPages").textContent   = data.pages > 0 ? data.pages : "—";
      document.getElementById("docResultWords").textContent   = data.word_count.toLocaleString();
      document.getElementById("docResultSession").textContent = data.session_id;
      docResultRow.classList.remove("d-none");
      if (statFiles) statFiles.textContent = (parseInt(statFiles.textContent) || 0) + 1;

      // Persist session for cross-page use
      saveSession(data);
      clearSelection();
    }

    fileInput.addEventListener("change", function () {
      if (fileInput.files.length > 0) selectFile(fileInput.files[0]);
    });
    clearFileBtn.addEventListener("click", clearSelection);
    uploadBtn.addEventListener("click", performUpload);

    dropZone.addEventListener("dragover",  function (e) { e.preventDefault(); dropZone.classList.add("drag-over"); });
    dropZone.addEventListener("dragleave", function (e) { if (!dropZone.contains(e.relatedTarget)) dropZone.classList.remove("drag-over"); });
    dropZone.addEventListener("drop", function (e) {
      e.preventDefault();
      dropZone.classList.remove("drag-over");
      if (e.dataTransfer.files.length > 0) selectFile(e.dataTransfer.files[0]);
    });
    dropZone.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); }
    });

    // Restore session indicator if a doc was uploaded this browser session
    var existing = loadSession();
    if (existing && docResultRow) {
      document.getElementById("docResultName").textContent    = existing.filename;
      document.getElementById("docResultType").textContent    = existing.file_type;
      document.getElementById("docResultPages").textContent   = existing.pages > 0 ? existing.pages : "—";
      document.getElementById("docResultWords").textContent   = existing.word_count.toLocaleString();
      document.getElementById("docResultSession").textContent = existing.session_id;
      docResultRow.classList.remove("d-none");
    }
  } // end upload module

  /* ══════════════════════════════════════════════════════════════════════
     4. TRANSLATE PAGE
     ══════════════════════════════════════════════════════════════════════ */

  var translateBtn = document.getElementById("translateBtn");

  if (translateBtn) {
    var session         = loadSession();
    var selectedLang    = null;
    var translatedText  = "";
    var translatedFile  = "";

    var tlSessionLoaded  = document.getElementById("tl-session-loaded");
    var tlSessionMissing = document.getElementById("tl-session-missing");
    var tlSessionFname   = document.getElementById("tl-session-filename");
    var tlSessionWords   = document.getElementById("tl-session-words");
    var tlSessionType    = document.getElementById("tl-session-type");
    var tlProgress       = document.getElementById("tl-progress");
    var tlProgressBar    = document.getElementById("tl-progress-bar");
    var tlProgressLabel  = document.getElementById("tl-progress-label");
    var tlError          = document.getElementById("tl-error");
    var tlErrorMsg       = document.getElementById("tl-error-msg");
    var tlResultEmpty    = document.getElementById("tl-result-empty");
    var tlResultPanel    = document.getElementById("tl-result-panel");
    var tlResultLang     = document.getElementById("tl-result-lang-name");
    var tlModeBadge      = document.getElementById("tl-mode-badge");
    var tlOutput         = document.getElementById("tl-output");
    var tlWordCount      = document.getElementById("tl-word-count");
    var tlSourceFilename = document.getElementById("tl-source-filename");
    var tlCopyBtn        = document.getElementById("tl-copy-btn");
    var tlDownloadBtn    = document.getElementById("tl-download-btn");

    /* ── Restore session info ──────────────────────────────────────────── */
    if (session) {
      tlSessionLoaded.classList.remove("d-none");
      tlSessionMissing.classList.add("d-none");
      tlSessionFname.textContent = session.filename;
      tlSessionWords.textContent = session.word_count.toLocaleString();
      tlSessionType.textContent  = session.file_type;
    } else {
      tlSessionLoaded.classList.add("d-none");
      tlSessionMissing.classList.remove("d-none");
      translateBtn.disabled = true;
    }

    /* ── Language selection ────────────────────────────────────────────── */
    document.querySelectorAll(".lang-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".lang-btn").forEach(function (b) { b.classList.remove("selected"); });
        btn.classList.add("selected");
        selectedLang = btn.dataset.lang;
        translateBtn.disabled = !session;
      });
    });

    /* ── Progress animation ────────────────────────────────────────────── */
    function animateTlProgress(targetPct, onDone) {
      var current = parseFloat(tlProgressBar.style.width) || 0;
      var step    = (targetPct - current) / 24;
      tlProgress.classList.remove("d-none");
      tlProgressLabel.classList.remove("d-none");
      tlProgressLabel.textContent = "Translating…";
      var iv = setInterval(function () {
        current = Math.min(current + Math.max(step, 0.4), targetPct);
        tlProgressBar.style.width = current + "%";
        if (current >= targetPct) { clearInterval(iv); if (onDone) onDone(); }
      }, 30);
    }

    /* ── Show translate error ──────────────────────────────────────────── */
    function showTlError(msg) {
      tlErrorMsg.textContent = msg;
      tlError.classList.remove("d-none");
    }

    function hideTlError() {
      tlError.classList.add("d-none");
    }

    /* ── Main translate action ─────────────────────────────────────────── */
    translateBtn.addEventListener("click", function () {
      if (!session || !selectedLang) return;

      hideTlError();
      translateBtn.disabled = true;
      tlResultPanel.classList.add("d-none");
      tlResultEmpty.classList.remove("d-none");

      animateTlProgress(75, null);

      fetch("/api/translate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          session_id:      session.session_id,
          target_language: selectedLang,
        }),
      })
        .then(function (r) {
          return r.json().then(function (d) { return { status: r.status, data: d }; });
        })
        .then(function (result) {
          animateTlProgress(100, function () {
            tlProgressLabel.textContent = "Done";
          });

          tlProgress.classList.add("d-none");
          tlProgressLabel.classList.add("d-none");

          translateBtn.disabled = false;

          if (result.data.success) {
            onTranslateSuccess(result.data);
          } else {
            showTlError(result.data.error || "Translation failed. Please try again.");
          }
        })
        .catch(function () {
          tlProgress.classList.add("d-none");
          tlProgressLabel.classList.add("d-none");
          showTlError("Network error — could not reach the server. Please try again.");
          translateBtn.disabled = false;
        });
    });

    /* ── Handle successful translation ────────────────────────────────── */
    function onTranslateSuccess(data) {
      translatedText = data.translated_text;
      translatedFile = data.saved_file;

      tlResultEmpty.classList.add("d-none");
      tlResultPanel.classList.remove("d-none");

      tlResultLang.textContent     = data.target_language;
      tlOutput.textContent         = translatedText;
      tlWordCount.textContent      = data.word_count.toLocaleString();
      tlSourceFilename.textContent = data.filename;

      var isWatsonx = data.mode === "watsonx";
      tlModeBadge.textContent  = isWatsonx ? "watsonx.ai" : "Demo";
      tlModeBadge.className    = "mode-badge " + (isWatsonx ? "mode-badge-watsonx" : "mode-badge-demo");
    }

    /* ── Copy button ───────────────────────────────────────────────────── */
    tlCopyBtn.addEventListener("click", function () {
      if (!translatedText) return;
      navigator.clipboard.writeText(translatedText).then(function () {
        tlCopyBtn.classList.add("copied");
        tlCopyBtn.innerHTML = '<i class="bi bi-clipboard-check"></i> Copied';
        setTimeout(function () {
          tlCopyBtn.classList.remove("copied");
          tlCopyBtn.innerHTML = '<i class="bi bi-clipboard"></i> Copy';
        }, 2000);
      }).catch(function () {
        /* clipboard API unavailable — silently ignore */
      });
    });

    /* ── Download button ───────────────────────────────────────────────── */
    tlDownloadBtn.addEventListener("click", function () {
      if (!translatedText) return;
      var blob = new Blob([translatedText], { type: "text/plain;charset=utf-8" });
      var url  = URL.createObjectURL(blob);
      var a    = document.createElement("a");
      a.href     = url;
      a.download = translatedFile || ("translation_" + (selectedLang || "output") + ".txt");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

  } // end translate module

  /* ══════════════════════════════════════════════════════════════════════
     5. SUMMARIZE PAGE
     ══════════════════════════════════════════════════════════════════════ */

  var summarizeBtn = document.getElementById("summarizeBtn");

  if (summarizeBtn) {
    var smSession      = loadSession();
    var smSummaryText  = "";
    var smKeyPoints    = [];
    var smSavedFile    = "";

    var smSessionLoaded  = document.getElementById("sm-session-loaded");
    var smSessionMissing = document.getElementById("sm-session-missing");
    var smSessionFname   = document.getElementById("sm-session-filename");
    var smSessionWords   = document.getElementById("sm-session-words");
    var smSessionType    = document.getElementById("sm-session-type");
    var smProgress       = document.getElementById("sm-progress");
    var smProgressBar    = document.getElementById("sm-progress-bar");
    var smProgressLabel  = document.getElementById("sm-progress-label");
    var smError          = document.getElementById("sm-error");
    var smErrorMsg       = document.getElementById("sm-error-msg");
    var smResultEmpty    = document.getElementById("sm-result-empty");
    var smResultPanel    = document.getElementById("sm-result-panel");
    var smModeBadge      = document.getElementById("sm-mode-badge");
    var smSummaryEl      = document.getElementById("sm-summary-text");
    var smKeyPointsEl    = document.getElementById("sm-key-points");
    var smWordCount      = document.getElementById("sm-word-count");
    var smSourceFilename = document.getElementById("sm-source-filename");
    var smCopyBtn        = document.getElementById("sm-copy-btn");
    var smDownloadBtn    = document.getElementById("sm-download-btn");
    var smClearBtn       = document.getElementById("sm-clear-btn");

    /* ── Restore session info ──────────────────────────────────────────── */
    if (smSession) {
      smSessionLoaded.classList.remove("d-none");
      smSessionMissing.classList.add("d-none");
      smSessionFname.textContent = smSession.filename;
      smSessionWords.textContent = smSession.word_count.toLocaleString();
      smSessionType.textContent  = smSession.file_type;
      summarizeBtn.disabled = false;
    } else {
      smSessionLoaded.classList.add("d-none");
      smSessionMissing.classList.remove("d-none");
      summarizeBtn.disabled = true;
    }

    /* ── Progress animation ────────────────────────────────────────────── */
    function animateSmProgress(targetPct, onDone) {
      var current = parseFloat(smProgressBar.style.width) || 0;
      var step    = (targetPct - current) / 24;
      smProgress.classList.remove("d-none");
      smProgressLabel.classList.remove("d-none");
      smProgressLabel.textContent = "Analysing document…";
      var iv = setInterval(function () {
        current = Math.min(current + Math.max(step, 0.4), targetPct);
        smProgressBar.style.width = current + "%";
        if (current >= targetPct) {
          clearInterval(iv);
          if (onDone) onDone();
        }
      }, 30);
    }

    /* ── Show / hide error ─────────────────────────────────────────────── */
    function showSmError(msg) {
      smErrorMsg.textContent = msg;
      smError.classList.remove("d-none");
    }

    function hideSmError() { smError.classList.add("d-none"); }

    /* ── Render result panel ───────────────────────────────────────────── */
    function renderSummary(data) {
      smSummaryText  = data.summary;
      smKeyPoints    = data.key_points || [];
      smSavedFile    = data.saved_file || "";

      smResultEmpty.classList.add("d-none");
      smResultPanel.classList.remove("d-none");

      // Mode badge
      var isWatsonx = data.mode === "watsonx";
      smModeBadge.textContent = isWatsonx ? "watsonx.ai" : "Demo";
      smModeBadge.className   = "mode-badge " + (isWatsonx ? "mode-badge-watsonx" : "mode-badge-demo");

      // Summary paragraph
      smSummaryEl.textContent = smSummaryText;

      // Key points list
      smKeyPointsEl.innerHTML = "";
      smKeyPoints.forEach(function (kp) {
        var li = document.createElement("li");
        li.textContent = kp;
        smKeyPointsEl.appendChild(li);
      });

      smWordCount.textContent      = data.word_count.toLocaleString();
      smSourceFilename.textContent = data.filename;
    }

    /* ── Clear result ──────────────────────────────────────────────────── */
    function clearSmResult() {
      smSummaryText = "";
      smKeyPoints   = [];
      smSavedFile   = "";
      smResultPanel.classList.add("d-none");
      smResultEmpty.classList.remove("d-none");
      smProgress.classList.add("d-none");
      smProgressLabel.classList.add("d-none");
      smProgressBar.style.width = "0%";
      hideSmError();
    }

    /* ── Generate button click ─────────────────────────────────────────── */
    summarizeBtn.addEventListener("click", function () {
      if (!smSession) return;

      hideSmError();
      summarizeBtn.disabled = true;
      smResultPanel.classList.add("d-none");

      // Show spinner in the right panel while waiting
      smResultEmpty.classList.remove("d-none");
      smResultEmpty.innerHTML =
        '<div class="sm-spinner">' +
          '<div class="sm-spinner-ring"></div>' +
          '<span>Generating summary…</span>' +
        '</div>';

      animateSmProgress(80, null);

      fetch("/api/summarize", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ session_id: smSession.session_id }),
      })
        .then(function (r) {
          return r.json().then(function (d) { return { status: r.status, data: d }; });
        })
        .then(function (result) {
          animateSmProgress(100, function () {
            smProgressLabel.textContent = "Done";
          });

          smProgress.classList.add("d-none");
          smProgressLabel.classList.add("d-none");

          // Restore static empty-state markup in case we need it again
          smResultEmpty.innerHTML =
            '<i class="bi bi-journal-text"></i>' +
            '<p>Summary will appear here once generated.</p>';

          summarizeBtn.disabled = false;

          if (result.data.success) {
            renderSummary(result.data);
          } else {
            smResultEmpty.classList.remove("d-none");
            showSmError(result.data.error || "Summarization failed. Please try again.");
          }
        })
        .catch(function () {
          smProgress.classList.add("d-none");
          smProgressLabel.classList.add("d-none");
          smResultEmpty.innerHTML =
            '<i class="bi bi-journal-text"></i>' +
            '<p>Summary will appear here once generated.</p>';
          smResultEmpty.classList.remove("d-none");
          showSmError("Network error — could not reach the server. Please try again.");
          summarizeBtn.disabled = false;
        });
    });

    /* ── Copy button ───────────────────────────────────────────────────── */
    smCopyBtn.addEventListener("click", function () {
      if (!smSummaryText) return;
      var fullText = "SUMMARY\n\n" + smSummaryText +
        (smKeyPoints.length ? "\n\nKEY POINTS\n\n" + smKeyPoints.map(function (k) { return "- " + k; }).join("\n") : "");
      navigator.clipboard.writeText(fullText).then(function () {
        smCopyBtn.classList.add("copied");
        smCopyBtn.innerHTML = '<i class="bi bi-clipboard-check"></i> Copied';
        setTimeout(function () {
          smCopyBtn.classList.remove("copied");
          smCopyBtn.innerHTML = '<i class="bi bi-clipboard"></i> Copy';
        }, 2000);
      }).catch(function () { /* clipboard unavailable */ });
    });

    /* ── Download button ───────────────────────────────────────────────── */
    smDownloadBtn.addEventListener("click", function () {
      if (!smSummaryText) return;
      var content =
        "SUMMARY\n\n" + smSummaryText +
        (smKeyPoints.length ? "\n\nKEY POINTS\n\n" + smKeyPoints.map(function (k) { return "- " + k; }).join("\n") : "");
      var blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      var url  = URL.createObjectURL(blob);
      var a    = document.createElement("a");
      a.href     = url;
      a.download = smSavedFile || "summary.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

    /* ── Clear button ──────────────────────────────────────────────────── */
    smClearBtn.addEventListener("click", clearSmResult);

  } // end summarize module

  /* ══════════════════════════════════════════════════════════════════════
     6. EXPLAIN PAGE
     ══════════════════════════════════════════════════════════════════════ */

  var explainBtn = document.getElementById("explainBtn");

  if (explainBtn) {
    var exSession     = loadSession();
    var exSections    = [];
    var exSavedFile   = "";
    var exFlatText    = "";

    var exSessionLoaded  = document.getElementById("ex-session-loaded");
    var exSessionMissing = document.getElementById("ex-session-missing");
    var exSessionFname   = document.getElementById("ex-session-filename");
    var exSessionWords   = document.getElementById("ex-session-words");
    var exSessionType    = document.getElementById("ex-session-type");
    var exProgress       = document.getElementById("ex-progress");
    var exProgressBar    = document.getElementById("ex-progress-bar");
    var exProgressLabel  = document.getElementById("ex-progress-label");
    var exError          = document.getElementById("ex-error");
    var exErrorMsg       = document.getElementById("ex-error-msg");
    var exResultEmpty    = document.getElementById("ex-result-empty");
    var exResultPanel    = document.getElementById("ex-result-panel");
    var exModeBadge      = document.getElementById("ex-mode-badge");
    var exSectionsEl     = document.getElementById("ex-sections");
    var exWordCount      = document.getElementById("ex-word-count");
    var exSourceFilename = document.getElementById("ex-source-filename");
    var exCopyBtn        = document.getElementById("ex-copy-btn");
    var exDownloadBtn    = document.getElementById("ex-download-btn");
    var exClearBtn       = document.getElementById("ex-clear-btn");

    /* ── Session info ──────────────────────────────────────────────────── */
    if (exSession) {
      exSessionLoaded.classList.remove("d-none");
      exSessionMissing.classList.add("d-none");
      exSessionFname.textContent = exSession.filename;
      exSessionWords.textContent = exSession.word_count.toLocaleString();
      exSessionType.textContent  = exSession.file_type;
      explainBtn.disabled = false;
    } else {
      exSessionLoaded.classList.add("d-none");
      exSessionMissing.classList.remove("d-none");
      explainBtn.disabled = true;
    }

    /* ── Progress animation ────────────────────────────────────────────── */
    function animateExProgress(targetPct, onDone) {
      var current = parseFloat(exProgressBar.style.width) || 0;
      var step    = (targetPct - current) / 24;
      exProgress.classList.remove("d-none");
      exProgressLabel.classList.remove("d-none");
      exProgressLabel.textContent = "Analysing document…";
      var iv = setInterval(function () {
        current = Math.min(current + Math.max(step, 0.4), targetPct);
        exProgressBar.style.width = current + "%";
        if (current >= targetPct) { clearInterval(iv); if (onDone) onDone(); }
      }, 30);
    }

    /* ── Error helpers ─────────────────────────────────────────────────── */
    function showExError(msg) { exErrorMsg.textContent = msg; exError.classList.remove("d-none"); }
    function hideExError()    { exError.classList.add("d-none"); }

    /* ── Build flat text for copy / download ───────────────────────────── */
    function buildFlatText(sections) {
      return sections.map(function (s) {
        var lines = [s.heading.toUpperCase(), ""];
        lines.push(s.paragraph);
        if (s.bullets && s.bullets.length) {
          lines.push("");
          s.bullets.forEach(function (b) { lines.push("  • " + b); });
        }
        return lines.join("\n");
      }).join("\n\n");
    }

    /* ── Render sections into DOM ──────────────────────────────────────── */
    function renderSections(sections) {
      exSectionsEl.innerHTML = "";
      sections.forEach(function (sec, idx) {
        var div = document.createElement("div");
        div.className = "ex-section";

        var heading = document.createElement("div");
        heading.className = "ex-section-heading";
        heading.innerHTML = '<i class="bi bi-bookmark-fill"></i>' + escapeHtml(sec.heading);
        div.appendChild(heading);

        var body = document.createElement("div");
        body.className = "ex-section-body";

        if (sec.paragraph) {
          var para = document.createElement("div");
          para.className = "ex-section-para";
          para.textContent = sec.paragraph;
          body.appendChild(para);
        }

        if (sec.bullets && sec.bullets.length) {
          var ul = document.createElement("ul");
          ul.className = "ex-section-bullets";
          sec.bullets.forEach(function (b) {
            var li = document.createElement("li");
            li.textContent = b;
            ul.appendChild(li);
          });
          body.appendChild(ul);
        }

        div.appendChild(body);
        exSectionsEl.appendChild(div);
      });
    }

    /* ── Clear result ──────────────────────────────────────────────────── */
    function clearExResult() {
      exSections  = [];
      exFlatText  = "";
      exSavedFile = "";
      exResultPanel.classList.add("d-none");
      exResultEmpty.classList.remove("d-none");
      exResultEmpty.innerHTML =
        '<i class="bi bi-lightbulb"></i>' +
        '<p>Chapter-wise explanation will appear here.</p>';
      exProgress.classList.add("d-none");
      exProgressLabel.classList.add("d-none");
      exProgressBar.style.width = "0%";
      hideExError();
    }

    /* ── Generate button ───────────────────────────────────────────────── */
    explainBtn.addEventListener("click", function () {
      if (!exSession) return;

      hideExError();
      explainBtn.disabled = true;
      exResultPanel.classList.add("d-none");
      exResultEmpty.classList.remove("d-none");
      exResultEmpty.innerHTML =
        '<div class="sm-spinner">' +
          '<div class="sm-spinner-ring" style="border-top-color:var(--teal);"></div>' +
          '<span>Generating explanation…</span>' +
        '</div>';

      animateExProgress(80, null);

      fetch("/api/explain", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ session_id: exSession.session_id }),
      })
        .then(function (r) {
          return r.json().then(function (d) { return { status: r.status, data: d }; });
        })
        .then(function (result) {
          animateExProgress(100, function () { exProgressLabel.textContent = "Done"; });

          exProgress.classList.add("d-none");
          exProgressLabel.classList.add("d-none");

          exResultEmpty.innerHTML =
            '<i class="bi bi-lightbulb"></i>' +
            '<p>Chapter-wise explanation will appear here.</p>';

          explainBtn.disabled = false;

          if (result.data.success) {
            exSections  = result.data.sections || [];
            exSavedFile = result.data.saved_file || "";
            exFlatText  = buildFlatText(exSections);

            exResultEmpty.classList.add("d-none");
            exResultPanel.classList.remove("d-none");

            var isWatsonx = result.data.mode === "watsonx";
            exModeBadge.textContent = isWatsonx ? "watsonx.ai" : "Demo";
            exModeBadge.className   = "mode-badge " + (isWatsonx ? "mode-badge-watsonx" : "mode-badge-demo");

            renderSections(exSections);

            exWordCount.textContent      = result.data.word_count.toLocaleString();
            exSourceFilename.textContent = result.data.filename;
          } else {
            exResultEmpty.classList.remove("d-none");
            showExError(result.data.error || "Explanation failed. Please try again.");
          }
        })
        .catch(function () {
          exProgress.classList.add("d-none");
          exProgressLabel.classList.add("d-none");
          exResultEmpty.innerHTML =
            '<i class="bi bi-lightbulb"></i>' +
            '<p>Chapter-wise explanation will appear here.</p>';
          exResultEmpty.classList.remove("d-none");
          showExError("Network error — could not reach the server. Please try again.");
          explainBtn.disabled = false;
        });
    });

    /* ── Copy button ───────────────────────────────────────────────────── */
    exCopyBtn.addEventListener("click", function () {
      if (!exFlatText) return;
      navigator.clipboard.writeText(exFlatText).then(function () {
        exCopyBtn.classList.add("copied");
        exCopyBtn.innerHTML = '<i class="bi bi-clipboard-check"></i> Copied';
        setTimeout(function () {
          exCopyBtn.classList.remove("copied");
          exCopyBtn.innerHTML = '<i class="bi bi-clipboard"></i> Copy';
        }, 2000);
      }).catch(function () { /* clipboard unavailable */ });
    });

    /* ── Download button ───────────────────────────────────────────────── */
    exDownloadBtn.addEventListener("click", function () {
      if (!exFlatText) return;
      var blob = new Blob([exFlatText], { type: "text/plain;charset=utf-8" });
      var url  = URL.createObjectURL(blob);
      var a    = document.createElement("a");
      a.href     = url;
      a.download = exSavedFile || "explanation.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

    /* ── Clear button ──────────────────────────────────────────────────── */
    exClearBtn.addEventListener("click", clearExResult);

  } // end explain module

  /* ══════════════════════════════════════════════════════════════════════
     7. ASK (RAG) PAGE
     ══════════════════════════════════════════════════════════════════════ */

  var askQuestionBtn = document.getElementById("askQuestionBtn");

  if (askQuestionBtn) {
    var askSession         = loadSession();
    var askMessages        = [];
    var askHistoryKey      = null;
    var askLoadingBubble   = null;

    var askSessionLoaded   = document.getElementById("ask-session-loaded");
    var askSessionMissing  = document.getElementById("ask-session-missing");
    var askSessionFname    = document.getElementById("ask-session-filename");
    var askSessionWords    = document.getElementById("ask-session-words");
    var askSessionType     = document.getElementById("ask-session-type");
    var askQuestionInput   = document.getElementById("askQuestionInput");
    var clearChatBtn       = document.getElementById("clearChatBtn");
    var askProgress        = document.getElementById("ask-progress");
    var askProgressBar     = document.getElementById("ask-progress-bar");
    var askProgressLabel   = document.getElementById("ask-progress-label");
    var askError           = document.getElementById("ask-error");
    var askErrorMsg        = document.getElementById("ask-error-msg");
    var askChatEmpty       = document.getElementById("askChatEmpty");
    var askChatMessages    = document.getElementById("askChatMessages");
    var askSourceFilename  = document.getElementById("ask-source-filename");

    function getAskHistoryKey(sessionId) {
      return "edulingo_ask_history:" + sessionId;
    }

    function loadAskHistory() {
      if (!askHistoryKey) return [];
      try {
        var raw = sessionStorage.getItem(askHistoryKey);
        return raw ? JSON.parse(raw) : [];
      } catch (_) {
        return [];
      }
    }

    function saveAskHistory() {
      if (!askHistoryKey) return;
      try {
        sessionStorage.setItem(askHistoryKey, JSON.stringify(askMessages));
      } catch (_) { }
    }

    function clearAskHistory() {
      if (!askHistoryKey) return;
      try {
        sessionStorage.removeItem(askHistoryKey);
      } catch (_) { }
    }

    function setAskProgress(targetPct, labelText, onDone) {
      var current = parseFloat(askProgressBar.style.width) || 0;
      var step    = (targetPct - current) / 24;
      askProgress.classList.remove("d-none");
      askProgressLabel.classList.remove("d-none");
      askProgressLabel.textContent = labelText;
      var iv = setInterval(function () {
        current = Math.min(current + Math.max(step, 0.4), targetPct);
        askProgressBar.style.width = current + "%";
        if (current >= targetPct) {
          clearInterval(iv);
          if (onDone) onDone();
        }
      }, 30);
    }

    function showAskError(msg) {
      askErrorMsg.textContent = msg;
      askError.classList.remove("d-none");
    }

    function hideAskError() {
      askError.classList.add("d-none");
    }

    function syncAskControls() {
      var hasSession = !!askSession;
      var hasText = askQuestionInput.value.trim().length > 0;
      askQuestionBtn.disabled = !hasSession || !hasText || !!askLoadingBubble;
      clearChatBtn.disabled = !hasSession || askMessages.length === 0 || !!askLoadingBubble;
      askQuestionInput.disabled = !hasSession || !!askLoadingBubble;
    }

    function renderAskChat() {
      askChatMessages.innerHTML = "";

      if (!askMessages.length) {
        askChatMessages.classList.add("d-none");
        askChatEmpty.classList.remove("d-none");
      } else {
        askChatEmpty.classList.add("d-none");
        askChatMessages.classList.remove("d-none");
        askMessages.forEach(function (message) {
          var bubble = document.createElement("div");
          bubble.className = "ask-message ask-message-" + message.role;

          var meta = document.createElement("div");
          meta.className = "ask-message-meta";
          meta.textContent = message.role === "user" ? "You" : "AI Assistant";

          var body = document.createElement("div");
          body.className = "ask-message-body";
          body.textContent = message.content;

          bubble.appendChild(meta);
          bubble.appendChild(body);
          askChatMessages.appendChild(bubble);
        });
      }
    }

    function appendAskMessage(role, content) {
      askMessages.push({ role: role, content: content });
      saveAskHistory();
      renderAskChat();
      syncAskControls();
      askChatMessages.scrollTop = askChatMessages.scrollHeight;
    }

    function insertLoadingBubble() {
      var bubble = document.createElement("div");
      bubble.className = "ask-message ask-message-assistant ask-message-loading";

      var meta = document.createElement("div");
      meta.className = "ask-message-meta";
      meta.textContent = "AI Assistant";

      var body = document.createElement("div");
      body.className = "ask-message-body";
      body.innerHTML =
        '<div class="sm-spinner ask-spinner">' +
          '<div class="sm-spinner-ring ask-spinner-ring"></div>' +
          '<span>Thinking…</span>' +
        '</div>';

      bubble.appendChild(meta);
      bubble.appendChild(body);
      askChatMessages.appendChild(bubble);
      askChatEmpty.classList.add("d-none");
      askChatMessages.classList.remove("d-none");
      askChatMessages.scrollTop = askChatMessages.scrollHeight;
      return bubble;
    }

    function restoreAskSessionState() {
      if (askSession) {
        askHistoryKey = getAskHistoryKey(askSession.session_id);
        askMessages = loadAskHistory();
        askSessionLoaded.classList.remove("d-none");
        askSessionMissing.classList.add("d-none");
        askSessionFname.textContent = askSession.filename;
        askSessionWords.textContent = askSession.word_count.toLocaleString();
        askSessionType.textContent  = askSession.file_type;
        askSourceFilename.textContent = askSession.filename;
        askQuestionInput.disabled = false;
        askQuestionBtn.disabled = true;
        clearChatBtn.disabled = askMessages.length === 0;
      } else {
        askHistoryKey = null;
        askMessages = [];
        askSessionLoaded.classList.add("d-none");
        askSessionMissing.classList.remove("d-none");
        askSourceFilename.textContent = "";
        askQuestionInput.disabled = true;
        askQuestionBtn.disabled = true;
        clearChatBtn.disabled = true;
      }

      renderAskChat();
      syncAskControls();
    }

    function clearAskConversation() {
      askMessages = [];
      clearAskHistory();
      askQuestionInput.value = "";
      askLoadingBubble = null;
      renderAskChat();
      hideAskError();
      askProgress.classList.add("d-none");
      askProgressLabel.classList.add("d-none");
      askProgressBar.style.width = "0%";
      syncAskControls();
    }

    restoreAskSessionState();

    askQuestionInput.addEventListener("input", syncAskControls);
    askQuestionInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!askQuestionBtn.disabled) askQuestionBtn.click();
      }
    });

    askQuestionBtn.addEventListener("click", function () {
      if (!askSession) {
        showAskError("No document has been uploaded yet. Upload a document first.");
        return;
      }

      var question = askQuestionInput.value.trim();
      if (!question) {
        showAskError("Please enter a question before asking.");
        return;
      }

      hideAskError();
      askQuestionBtn.disabled = true;
      clearChatBtn.disabled = true;
      askQuestionInput.disabled = true;
      setAskProgress(70, "Thinking…", null);
      askLoadingBubble = insertLoadingBubble();

      var payload = {
        session_id: askSession.session_id,
        question: question,
        conversation: askMessages.slice(-8),
      };

      fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(function (r) {
          return r.json().then(function (d) { return { status: r.status, data: d }; });
        })
        .then(function (result) {
          setAskProgress(100, "Done", function () { askProgressLabel.textContent = "Done"; });

          if (askLoadingBubble && askLoadingBubble.parentNode) {
            askLoadingBubble.parentNode.removeChild(askLoadingBubble);
          }
          askLoadingBubble = null;

          if (result.data.success) {
            appendAskMessage("user", question);
            appendAskMessage("assistant", result.data.answer);
            askQuestionInput.value = "";
            askQuestionInput.focus();
            askSourceFilename.textContent = result.data.filename || askSession.filename;
          } else {
            showAskError(result.data.error || "Answer generation failed. Please try again.");
          }

          syncAskControls();
        })
        .catch(function () {
          if (askLoadingBubble && askLoadingBubble.parentNode) {
            askLoadingBubble.parentNode.removeChild(askLoadingBubble);
          }
          askLoadingBubble = null;
          askProgress.classList.add("d-none");
          askProgressLabel.classList.add("d-none");
          showAskError("Network error — could not reach the server. Please try again.");
          askQuestionInput.disabled = false;
          syncAskControls();
        });
    });

    clearChatBtn.addEventListener("click", function () {
      clearAskConversation();
      askQuestionInput.focus();
    });
  }

  /* ══════════════════════════════════════════════════════════════════════
     8. QUIZ PAGE
     ══════════════════════════════════════════════════════════════════════ */

  var generateQuizBtn = document.getElementById("generateQuizBtn");

  if (generateQuizBtn) {
    var quizSession       = loadSession();
    var quizId            = "";
    var quizQuestions     = [];
    var quizSubmitted     = false;

    var quizSessionLoaded  = document.getElementById("quiz-session-loaded");
    var quizSessionMissing = document.getElementById("quiz-session-missing");
    var quizSessionFname   = document.getElementById("quiz-session-filename");
    var quizSessionWords   = document.getElementById("quiz-session-words");
    var quizSessionType    = document.getElementById("quiz-session-type");
    var quizProgress       = document.getElementById("quiz-progress");
    var quizProgressBar    = document.getElementById("quiz-progress-bar");
    var quizProgressLabel  = document.getElementById("quiz-progress-label");
    var quizError          = document.getElementById("quiz-error");
    var quizErrorMsg       = document.getElementById("quiz-error-msg");
    var quizResultEmpty    = document.getElementById("quiz-result-empty");
    var quizResultPanel    = document.getElementById("quiz-result-panel");
    var quizModeBadge      = document.getElementById("quiz-mode-badge");
    var quizQuestionCount  = document.getElementById("quiz-question-count");
    var quizSourceFilename = document.getElementById("quiz-source-filename");
    var quizQuestionsEl    = document.getElementById("quiz-questions");
    var quizScoreCard      = document.getElementById("quiz-score-card");
    var quizScoreValue     = document.getElementById("quiz-score-value");
    var quizScorePercent   = document.getElementById("quiz-score-percentage");
    var quizScoreMessage   = document.getElementById("quiz-score-message");
    var submitQuizBtn      = document.getElementById("submitQuizBtn");
    var resetQuizBtn       = document.getElementById("resetQuizBtn");

    function setQuizProgress(targetPct, labelText, onDone) {
      var current = parseFloat(quizProgressBar.style.width) || 0;
      var step    = (targetPct - current) / 24;
      quizProgress.classList.remove("d-none");
      quizProgressLabel.classList.remove("d-none");
      quizProgressLabel.textContent = labelText;
      var iv = setInterval(function () {
        current = Math.min(current + Math.max(step, 0.4), targetPct);
        quizProgressBar.style.width = current + "%";
        if (current >= targetPct) {
          clearInterval(iv);
          if (onDone) onDone();
        }
      }, 30);
    }

    function showQuizError(msg) {
      quizErrorMsg.textContent = msg;
      quizError.classList.remove("d-none");
    }

    function hideQuizError() {
      quizError.classList.add("d-none");
    }

    function clearQuizResult() {
      quizId = "";
      quizQuestions = [];
      quizSubmitted = false;
      quizQuestionsEl.innerHTML = "";
      quizResultPanel.classList.add("d-none");
      quizResultEmpty.classList.remove("d-none");
      quizResultEmpty.innerHTML =
        '<i class="bi bi-patch-question-fill"></i>' +
        '<p>Your quiz will appear here once generated.</p>';
      quizScoreCard.classList.add("d-none");
      quizScoreValue.textContent = "";
      quizScorePercent.textContent = "";
      quizScoreMessage.textContent = "";
      quizProgress.classList.add("d-none");
      quizProgressLabel.classList.add("d-none");
      quizProgressBar.style.width = "0%";
      hideQuizError();
      submitQuizBtn.disabled = true;
      resetQuizBtn.disabled = true;
      generateQuizBtn.disabled = !quizSession;
    }

    function syncQuizSelections() {
      quizQuestionsEl.querySelectorAll(".quiz-question-card").forEach(function (card) {
        card.querySelectorAll(".quiz-option").forEach(function (option) {
          var input = option.querySelector('input[type="radio"]');
          option.classList.toggle("selected", input.checked);
        });
      });
    }

    function renderQuiz(questions) {
      quizQuestionsEl.innerHTML = "";

      questions.forEach(function (question, index) {
        var card = document.createElement("div");
        card.className = "quiz-question-card";
        card.dataset.questionId = question.id;

        var header = document.createElement("div");
        header.className = "quiz-question-header";

        var title = document.createElement("div");
        title.className = "quiz-question-title";
        title.textContent = (index + 1) + ". " + question.question;
        header.appendChild(title);

        var meta = document.createElement("div");
        meta.className = "quiz-question-meta";
        meta.textContent = "Single choice";
        header.appendChild(meta);

        card.appendChild(header);

        var options = document.createElement("div");
        options.className = "quiz-options";

        ["A", "B", "C", "D"].forEach(function (letter) {
          var label = document.createElement("label");
          label.className = "quiz-option";

          var input = document.createElement("input");
          input.type = "radio";
          input.name = "quiz-" + question.id;
          input.value = letter;

          var badge = document.createElement("span");
          badge.className = "quiz-option-badge";
          badge.textContent = letter;

          var text = document.createElement("span");
          text.className = "quiz-option-text";
          text.textContent = question.options[letter] || "";

          label.appendChild(input);
          label.appendChild(badge);
          label.appendChild(text);
          options.appendChild(label);
        });

        card.appendChild(options);
        quizQuestionsEl.appendChild(card);
      });

      quizQuestionsEl.querySelectorAll('input[type="radio"]').forEach(function (input) {
        input.addEventListener("change", syncQuizSelections);
      });

      syncQuizSelections();
    }

    function applyQuizResults(results) {
      var resultMap = {};
      results.forEach(function (item) {
        resultMap[item.question_id] = item;
      });

      quizQuestionsEl.querySelectorAll(".quiz-question-card").forEach(function (card) {
        var questionId = card.dataset.questionId;
        var evaluation = resultMap[questionId];
        if (!evaluation) return;

        card.classList.toggle("correct", evaluation.is_correct);
        card.classList.toggle("incorrect", !evaluation.is_correct);

        card.querySelectorAll(".quiz-option").forEach(function (option) {
          var input = option.querySelector('input[type="radio"]');
          var letter = input.value;
          input.disabled = true;
          option.classList.remove("correct", "incorrect");
          if (letter === evaluation.correct_answer) option.classList.add("correct");
          if (evaluation.selected && letter === evaluation.selected && evaluation.selected !== evaluation.correct_answer) {
            option.classList.add("incorrect");
          }
        });
      });
    }

    if (quizSession) {
      quizSessionLoaded.classList.remove("d-none");
      quizSessionMissing.classList.add("d-none");
      quizSessionFname.textContent = quizSession.filename;
      quizSessionWords.textContent = quizSession.word_count.toLocaleString();
      quizSessionType.textContent  = quizSession.file_type;
      generateQuizBtn.disabled = false;
    } else {
      quizSessionLoaded.classList.add("d-none");
      quizSessionMissing.classList.remove("d-none");
      generateQuizBtn.disabled = true;
    }

    clearQuizResult();

    generateQuizBtn.addEventListener("click", function () {
      if (!quizSession) {
        showQuizError("No document has been uploaded yet. Upload a document first.");
        return;
      }

      hideQuizError();
      generateQuizBtn.disabled = true;
      submitQuizBtn.disabled = true;
      resetQuizBtn.disabled = true;
      quizResultPanel.classList.add("d-none");
      quizResultEmpty.classList.remove("d-none");
      quizResultEmpty.innerHTML =
        '<div class="sm-spinner">' +
          '<div class="sm-spinner-ring"></div>' +
          '<span>Generating quiz…</span>' +
        '</div>';

      setQuizProgress(80, "Generating quiz…", null);

      fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: quizSession.session_id }),
      })
        .then(function (r) {
          return r.json().then(function (d) { return { status: r.status, data: d }; });
        })
        .then(function (result) {
          setQuizProgress(100, "Done", function () { quizProgressLabel.textContent = "Done"; });

          quizProgress.classList.add("d-none");
          quizProgressLabel.classList.add("d-none");

          quizResultEmpty.innerHTML =
            '<i class="bi bi-patch-question-fill"></i>' +
            '<p>Your quiz will appear here once generated.</p>';

          if (result.data.success) {
            quizId = result.data.quiz_id;
            quizQuestions = result.data.questions || [];

            if (quizQuestions.length !== 5) {
              clearQuizResult();
              showQuizError("The quiz service returned an unexpected result. Please try again.");
              generateQuizBtn.disabled = !quizSession;
              return;
            }

            quizModeBadge.textContent = result.data.mode === "watsonx" ? "watsonx.ai" : "Demo";
            quizModeBadge.className = "mode-badge " + (result.data.mode === "watsonx" ? "mode-badge-watsonx" : "mode-badge-demo");
            quizQuestionCount.textContent = quizQuestions.length;
            quizSourceFilename.textContent = result.data.filename;

            renderQuiz(quizQuestions);
            quizResultEmpty.classList.add("d-none");
            quizResultPanel.classList.remove("d-none");
            submitQuizBtn.disabled = false;
            resetQuizBtn.disabled = false;
            generateQuizBtn.disabled = false;
          } else {
            clearQuizResult();
            showQuizError(result.data.error || "Quiz generation failed. Please try again.");
          }
        })
        .catch(function () {
          quizProgress.classList.add("d-none");
          quizProgressLabel.classList.add("d-none");
          quizResultEmpty.innerHTML =
            '<i class="bi bi-patch-question-fill"></i>' +
            '<p>Your quiz will appear here once generated.</p>';
          showQuizError("Network error — could not reach the server. Please try again.");
          generateQuizBtn.disabled = !quizSession;
        });
    });

    submitQuizBtn.addEventListener("click", function () {
      if (!quizSession || !quizId || !quizQuestions.length) {
        showQuizError("Generate a quiz before submitting it.");
        return;
      }

      hideQuizError();
      submitQuizBtn.disabled = true;
      generateQuizBtn.disabled = false;
      setQuizProgress(70, "Scoring quiz…", null);

      var answers = {};
      quizQuestions.forEach(function (question) {
        var selected = quizQuestionsEl.querySelector('input[name="quiz-' + question.id + '"]:checked');
        answers[question.id] = selected ? selected.value : "";
      });

      fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: quizSession.session_id,
          quiz_id: quizId,
          answers: answers,
        }),
      })
        .then(function (r) {
          return r.json().then(function (d) { return { status: r.status, data: d }; });
        })
        .then(function (result) {
          setQuizProgress(100, "Done", function () { quizProgressLabel.textContent = "Done"; });

          if (result.data.success) {
            applyQuizResults(result.data.results || []);
            quizScoreCard.classList.remove("d-none");
            quizScoreValue.textContent = result.data.score + "/" + result.data.total_questions;
            quizScorePercent.textContent = result.data.percentage + "%";
            quizScoreMessage.textContent = result.data.performance_message;
            submitQuizBtn.disabled = true;
            resetQuizBtn.disabled = false;
          } else {
            showQuizError(result.data.error || "Quiz submission failed. Please try again.");
            submitQuizBtn.disabled = false;
          }
        })
        .catch(function () {
          quizProgress.classList.add("d-none");
          quizProgressLabel.classList.add("d-none");
          showQuizError("Network error — could not reach the server. Please try again.");
          submitQuizBtn.disabled = false;
        });
    });

    resetQuizBtn.addEventListener("click", function () {
      clearQuizResult();
    });
  }

  /* ══════════════════════════════════════════════════════════════════════
     8. HISTORY PAGE
     ══════════════════════════════════════════════════════════════════════ */

  var historyList = document.getElementById("historyList");

  if (historyList) {
    fetch("/api/history")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.success || !data.history.length) return; // empty state shown by default

        var historyEmpty = document.getElementById("historyEmpty");
        historyEmpty.classList.add("d-none");
        historyList.classList.remove("d-none");

        data.history.forEach(function (item) {
          var isTrans   = item.type === "translation";
          var isSummary = item.type === "summary";
          var isExplain = item.type === "explanation";
          var isQuiz    = item.type === "quiz";
          var iconClass = isTrans ? "bg-blue-soft" : isSummary ? "bg-purple-soft" : isExplain ? "bg-teal-soft" : isQuiz ? "bg-orange-soft" : "bg-green-soft";
          var icon      = isTrans ? "bi-translate"  : isSummary ? "bi-journal-text" : isExplain ? "bi-lightbulb-fill" : isQuiz ? "bi-patch-question-fill" : "bi-lightbulb";
          var typeLabel = isTrans ? "Translation" : isSummary ? "Summary" : isExplain ? "Explanation" : isQuiz ? "Quiz" : item.type;
          var modeBadge = item.mode === "watsonx"
            ? '<span class="mode-badge mode-badge-watsonx">watsonx.ai</span>'
            : '<span class="mode-badge mode-badge-demo">Demo</span>';
          var langMeta  = isTrans && item.target_language
            ? '<span><i class="bi bi-translate me-1"></i>' + escapeHtml(item.target_language) + '</span>'
            : isQuiz
              ? '<span><i class="bi bi-patch-question-fill me-1"></i>' + escapeHtml((item.score || 0) + '/' + (item.total_questions || 0) + ' correct') + '</span>'
              : '<span>' + escapeHtml(typeLabel) + '</span>';
          var countMeta = isQuiz
            ? '<span>' + (item.percentage || 0) + '%</span>'
            : '<span>' + item.word_count.toLocaleString() + ' words</span>';

          var el = document.createElement("div");
          el.className = "history-item";
          el.innerHTML =
            '<div class="history-item-icon ' + iconClass + '">' +
              '<i class="bi ' + icon + '"></i>' +
            '</div>' +
            '<div class="history-item-body">' +
              '<div class="history-item-title">' + escapeHtml(item.filename) + '</div>' +
              '<div class="history-item-meta">' +
                langMeta +
                countMeta +
                '<span>' + escapeHtml(item.timestamp) + '</span>' +
                modeBadge +
              '</div>' +
              '<div class="history-item-preview">' + escapeHtml(item.preview || "") + '</div>' +
            '</div>';
          historyList.appendChild(el);
        });
      })
      .catch(function () { /* leave empty state */ });
  }

  /* ── HTML escape helper ─────────────────────────────────────────────── */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ══════════════════════════════════════════════════════════════════════
     7. PLACEHOLDER CARD FEEDBACK  (dashboard)
     ══════════════════════════════════════════════════════════════════════ */

  document.querySelectorAll(".feature-card[data-coming-soon]").forEach(function (card) {
    card.addEventListener("click", function () {
      var title = card.querySelector(".card-title");
      if (!title) return;
      var original = title.textContent;
      title.textContent = "Coming soon!";
      setTimeout(function () { title.textContent = original; }, 1200);
    });
  });

  /* ══════════════════════════════════════════════════════════════════════
     10. AI CHAT PAGE
     ══════════════════════════════════════════════════════════════════════ */

  var chatSendBtn = document.getElementById("chatSendBtn");

  if (chatSendBtn) {
    var chatSession        = loadSession();
    var chatMessages       = [];
    var chatHistoryKey     = null;
    var chatLoadingBubble  = null;

    var chatSessionLoaded  = document.getElementById("chat-session-loaded");
    var chatSessionMissing = document.getElementById("chat-session-missing");
    var chatSessionFname   = document.getElementById("chat-session-filename");
    var chatSessionWords   = document.getElementById("chat-session-words");
    var chatSessionType    = document.getElementById("chat-session-type");
    var chatMessageInput   = document.getElementById("chatMessageInput");
    var chatClearBtn       = document.getElementById("chatClearBtn");
    var chatProgress       = document.getElementById("chat-progress");
    var chatProgressBar    = document.getElementById("chat-progress-bar");
    var chatProgressLabel  = document.getElementById("chat-progress-label");
    var chatError          = document.getElementById("chat-error");
    var chatErrorMsg       = document.getElementById("chat-error-msg");
    var chatChatEmpty      = document.getElementById("chatChatEmpty");
    var chatChatMessages   = document.getElementById("chatChatMessages");
    var chatSourceFilename = document.getElementById("chat-source-filename");

    function getChatHistoryKey(sessionId) {
      return "edulingo_chat_history:" + sessionId;
    }

    function loadChatHistory() {
      if (!chatHistoryKey) return [];
      try {
        var raw = sessionStorage.getItem(chatHistoryKey);
        return raw ? JSON.parse(raw) : [];
      } catch (_) {
        return [];
      }
    }

    function saveChatHistory() {
      if (!chatHistoryKey) return;
      try {
        sessionStorage.setItem(chatHistoryKey, JSON.stringify(chatMessages));
      } catch (_) { }
    }

    function clearChatHistory() {
      if (!chatHistoryKey) return;
      try {
        sessionStorage.removeItem(chatHistoryKey);
      } catch (_) { }
    }

    function setChatProgress(targetPct, labelText, onDone) {
      var current = parseFloat(chatProgressBar.style.width) || 0;
      var step    = (targetPct - current) / 24;
      chatProgress.classList.remove("d-none");
      chatProgressLabel.classList.remove("d-none");
      chatProgressLabel.textContent = labelText;
      var iv = setInterval(function () {
        current = Math.min(current + Math.max(step, 0.4), targetPct);
        chatProgressBar.style.width = current + "%";
        if (current >= targetPct) {
          clearInterval(iv);
          if (onDone) onDone();
        }
      }, 30);
    }

    function showChatError(msg) {
      chatErrorMsg.textContent = msg;
      chatError.classList.remove("d-none");
    }

    function hideChatError() {
      chatError.classList.add("d-none");
    }

    function syncChatControls() {
      var hasSession = !!chatSession;
      var hasText = chatMessageInput.value.trim().length > 0;
      chatSendBtn.disabled = !hasSession || !hasText || !!chatLoadingBubble;
      chatClearBtn.disabled = !hasSession || chatMessages.length === 0 || !!chatLoadingBubble;
      chatMessageInput.disabled = !hasSession || !!chatLoadingBubble;
    }

    function renderChatMessages() {
      chatChatMessages.innerHTML = "";

      if (!chatMessages.length) {
        chatChatMessages.classList.add("d-none");
        chatChatEmpty.classList.remove("d-none");
      } else {
        chatChatEmpty.classList.add("d-none");
        chatChatMessages.classList.remove("d-none");
        chatMessages.forEach(function (message) {
          var bubble = document.createElement("div");
          bubble.className = "ask-message ask-message-" + message.role;

          var meta = document.createElement("div");
          meta.className = "ask-message-meta";
          meta.textContent = message.role === "user" ? "You" : "AI Assistant";

          var body = document.createElement("div");
          body.className = "ask-message-body";
          body.textContent = message.content;

          bubble.appendChild(meta);
          bubble.appendChild(body);
          chatChatMessages.appendChild(bubble);
        });
      }
    }

    function appendChatMessage(role, content) {
      chatMessages.push({ role: role, content: content });
      saveChatHistory();
      renderChatMessages();
      syncChatControls();
      chatChatMessages.scrollTop = chatChatMessages.scrollHeight;
    }

    function insertChatLoadingBubble() {
      var bubble = document.createElement("div");
      bubble.className = "ask-message ask-message-assistant ask-message-loading";

      var meta = document.createElement("div");
      meta.className = "ask-message-meta";
      meta.textContent = "AI Assistant";

      var body = document.createElement("div");
      body.className = "ask-message-body";
      body.innerHTML =
        '<div class="sm-spinner ask-spinner">' +
          '<div class="sm-spinner-ring ask-spinner-ring"></div>' +
          '<span>Thinking\u2026</span>' +
        '</div>';

      bubble.appendChild(meta);
      bubble.appendChild(body);
      chatChatMessages.appendChild(bubble);
      chatChatEmpty.classList.add("d-none");
      chatChatMessages.classList.remove("d-none");
      chatChatMessages.scrollTop = chatChatMessages.scrollHeight;
      return bubble;
    }

    function restoreChatSessionState() {
      if (chatSession) {
        chatHistoryKey = getChatHistoryKey(chatSession.session_id);
        chatMessages = loadChatHistory();
        chatSessionLoaded.classList.remove("d-none");
        chatSessionMissing.classList.add("d-none");
        chatSessionFname.textContent = chatSession.filename;
        chatSessionWords.textContent = chatSession.word_count.toLocaleString();
        chatSessionType.textContent  = chatSession.file_type;
        chatSourceFilename.textContent = chatSession.filename;
        chatMessageInput.disabled = false;
        chatSendBtn.disabled = true;
        chatClearBtn.disabled = chatMessages.length === 0;
      } else {
        chatHistoryKey = null;
        chatMessages = [];
        chatSessionLoaded.classList.add("d-none");
        chatSessionMissing.classList.remove("d-none");
        chatSourceFilename.textContent = "";
        chatMessageInput.disabled = true;
        chatSendBtn.disabled = true;
        chatClearBtn.disabled = true;
      }

      renderChatMessages();
      syncChatControls();
    }

    function clearChatConversation() {
      chatMessages = [];
      clearChatHistory();
      chatMessageInput.value = "";
      chatLoadingBubble = null;
      renderChatMessages();
      hideChatError();
      chatProgress.classList.add("d-none");
      chatProgressLabel.classList.add("d-none");
      chatProgressBar.style.width = "0%";
      syncChatControls();
    }

    restoreChatSessionState();

    chatMessageInput.addEventListener("input", syncChatControls);
    chatMessageInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!chatSendBtn.disabled) chatSendBtn.click();
      }
    });

    chatSendBtn.addEventListener("click", function () {
      if (!chatSession) {
        showChatError("No document has been uploaded yet. Upload a document first.");
        return;
      }

      var message = chatMessageInput.value.trim();
      if (!message) {
        showChatError("Please enter a message before sending.");
        return;
      }

      hideChatError();
      chatSendBtn.disabled = true;
      chatClearBtn.disabled = true;
      chatMessageInput.disabled = true;
      setChatProgress(70, "Thinking\u2026", null);
      chatLoadingBubble = insertChatLoadingBubble();

      var payload = {
        session_id: chatSession.session_id,
        message: message,
        conversation: chatMessages.slice(-10),
      };

      fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(function (r) {
          return r.json().then(function (d) { return { status: r.status, data: d }; });
        })
        .then(function (result) {
          setChatProgress(100, "Done", function () { chatProgressLabel.textContent = "Done"; });

          if (chatLoadingBubble && chatLoadingBubble.parentNode) {
            chatLoadingBubble.parentNode.removeChild(chatLoadingBubble);
          }
          chatLoadingBubble = null;

          if (result.data.success) {
            appendChatMessage("user", message);
            appendChatMessage("assistant", result.data.answer);
            chatMessageInput.value = "";
            chatMessageInput.focus();
            chatSourceFilename.textContent = result.data.filename || chatSession.filename;
          } else {
            showChatError(result.data.error || "AI request failed. Please try again.");
          }

          syncChatControls();
        })
        .catch(function () {
          if (chatLoadingBubble && chatLoadingBubble.parentNode) {
            chatLoadingBubble.parentNode.removeChild(chatLoadingBubble);
          }
          chatLoadingBubble = null;
          chatProgress.classList.add("d-none");
          chatProgressLabel.classList.add("d-none");
          showChatError("Network error \u2014 could not reach the server. Please try again.");
          chatMessageInput.disabled = false;
          syncChatControls();
        });
    });

    chatClearBtn.addEventListener("click", function () {
      clearChatConversation();
      chatMessageInput.focus();
    });
  }

})();
