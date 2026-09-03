(() => {
  "use strict";

  const STORAGE_KEY = "promptforge-history-v1";
  const THEME_KEY = "promptforge-theme-v1";
  const STARTER_IDEA = "Créer une PWA de planning familial installable sur iPhone et Android, avec une vue semaine, des notifications et des données sauvegardées localement.";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const els = {
    idea: $("#idea"),
    ideaCount: $("#idea-count"),
    projectType: $("#project-type"),
    taskType: $("#task-type"),
    stack: $("#stack"),
    projectState: $("#project-state"),
    constraints: $("#constraints"),
    technicalContext: $("#technical-context"),
    generate: $("#generate-button"),
    output: $("#prompt-output"),
    originalTokens: $("#original-tokens"),
    optimizedTokens: $("#optimized-tokens"),
    savingsPercent: $("#savings-percent"),
    savingsLabel: $("#savings-label"),
    qualityScore: $("#quality-score"),
    qualityBar: $("#quality-bar"),
    qualityTags: $("#quality-tags"),
    targetLabel: $("#target-label"),
    finalCharCount: $("#final-char-count"),
    analysisGrid: $("#analysis-grid"),
    resultStatus: $("#result-status"),
    historyCount: $("#history-count"),
    historyList: $("#history-list"),
    toast: $("#toast"),
    composerView: $("#composer-view"),
    historyView: $("#history-view"),
    guideView: $("#guide-view"),
    resultCard: $("#result-card")
  };

  const state = {
    target: "ChatGPT",
    mode: "compact",
    current: null,
    history: loadHistory(),
    toastTimer: null
  };

  const projectProfiles = {
    "PWA": {
      label: "PWA installable",
      deliverable: "une interface responsive et installable, un manifest web, un service worker hors ligne, les icônes et les instructions de lancement/build"
    },
    "APK Android": {
      label: "application Android / APK",
      deliverable: "un projet Android compilable, l’arborescence des fichiers, les écrans principaux, les permissions nécessaires et les étapes pour générer l’APK"
    },
    "Electron": {
      label: "application Electron",
      deliverable: "une application Electron fonctionnelle avec séparation main/preload/renderer, configuration sécurisée et étapes de lancement/package"
    },
    "Autre": {
      label: "application logicielle",
      deliverable: "les fichiers nécessaires, une structure claire et les étapes exactes pour tester le résultat"
    }
  };

  const taskProfiles = {
    "Créer": "Construis une première version fonctionnelle et directement testable.",
    "Corriger": "Diagnostique la cause avant de proposer le correctif le plus petit et le plus sûr.",
    "Améliorer": "Conserve les fonctions et contraintes existantes ; améliore uniquement ce qui est demandé.",
    "Analyser": "Réalise un audit priorisé, puis propose des actions concrètes et vérifiables."
  };

  const targetDirectives = {
    ChatGPT: "Travaille de façon structurée et donne du code prêt à copier.",
    Claude: "Commence par une synthèse courte, puis regroupe les modifications par fichier.",
    Gemini: "Va à l’essentiel et recommande une solution unique quand plusieurs options sont possibles.",
    Cursor: "Commence par la liste des fichiers à modifier, puis fournis les changements directement applicables.",
    Autre: "Reste structuré, concret et directement exploitable."
  };

  const fillerPatterns = [
    /\bbonjour\s*[!,]?/gi,
    /\bsalut\s*[!,]?/gi,
    /\bs?il te plaît\b/gi,
    /\bsvp\b/gi,
    /\best[- ]ce que tu peux\b/gi,
    /\bpeux[- ]tu\b/gi,
    /\bpourrais[- ]tu\b/gi,
    /\bje voudrais que tu\b/gi,
    /\bj'aimerais que tu\b/gi,
    /\bfais[- ]moi\b/gi,
    /\baide[- ]moi à\b/gi
  ];

  function loadHistory() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.slice(0, 30) : [];
    } catch {
      return [];
    }
  }

  function persistHistory() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.history.slice(0, 30)));
    } catch {
      showToast("L’historique ne peut pas être enregistré sur cet appareil.");
    }
  }

  function cleanText(value) {
    let result = String(value || "")
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ")
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/\r\n?/g, "\n");
    fillerPatterns.forEach((pattern) => { result = result.replace(pattern, " "); });
    return result
      .split("\n")
      .map((line) => line.replace(/^[\s>*•–—-]+/, "").replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function estimateTokens(text) {
    const value = String(text || "").trim();
    return value ? Math.max(1, Math.ceil(value.length / 4)) : 0;
  }

  function limitLine(text, max = 700) {
    const value = cleanText(text);
    return value.length > max ? `${value.slice(0, max - 1).trim()}…` : value;
  }

  function selectedContext() {
    return {
      stack: limitLine(els.stack.value, 500),
      projectState: limitLine(els.projectState.value, 500),
      constraints: limitLine(els.constraints.value, 1200),
      technical: limitLine(els.technicalContext.value, 1200)
    };
  }

  function getProjectProfile() {
    return projectProfiles[els.projectType.value] || projectProfiles.Autre;
  }

  function buildPrompt() {
    const rawIdea = els.idea.value.trim();
    const idea = limitLine(rawIdea, 5000);
    const cleanedIdea = cleanText(idea);
    const context = selectedContext();
    const project = els.projectType.value;
    const task = els.taskType.value;
    const profile = getProjectProfile();
    const directive = targetDirectives[state.target] || targetDirectives.Autre;
    const lines = [
      `RÔLE : ingénieur logiciel senior spécialisé en ${profile.label}.`,
      `OBJECTIF : ${cleanedIdea || "Clarifier le besoin et proposer une première solution."}`,
      `PROJET : ${profile.label}. ACTION : ${task}.`,
      "",
      "CONTEXTE UTILE :"
    ];

    if (context.stack) lines.push(`- Technologies / stack : ${context.stack}`);
    if (context.projectState) lines.push(`- État actuel : ${context.projectState}`);
    if (context.technical) lines.push(`- Erreur, fichier ou résultat attendu : ${context.technical}`);
    if (!context.stack && !context.projectState && !context.technical) lines.push("- Aucun contexte technique supplémentaire ; choisis l’option la plus simple et explique ton hypothèse.");

    lines.push("", "CONTRAINTES :");
    if (context.constraints) lines.push(`- ${context.constraints.replace(/\n+/g, "\n- ")}`);
    lines.push("- Répondre en français, sans répéter ma demande.");

    lines.push("", "LIVRABLE :");
    lines.push(`- ${profile.deliverable}.`);
    lines.push(`- ${taskProfiles[task]}`);

    if (state.mode === "expert") {
      lines.push(
        "",
        "MÉTHODE DE RÉPONSE :",
        `- ${directive}`,
        "- Commence par les hypothèses ou les questions bloquantes (maximum 3).",
        "- Donne ensuite un plan court, puis les fichiers complets ou les modifications exactes.",
        "- Indique comment tester et comment vérifier que le résultat répond à l’objectif.",
        "- Ne supprime aucune fonction existante sans le signaler."
      );
    } else {
      lines.push("", `RÉPONSE : ${directive} Explique brièvement comment tester le résultat.`);
    }

    return {
      prompt: lines.join("\n").replace(/\n{3,}/g, "\n\n").trim(),
      rawIdea,
      cleanedIdea,
      context,
      project,
      task,
      profile
    };
  }

  function qualityFor(data) {
    let score = 28;
    if (data.cleanedIdea.length >= 45) score += 24;
    else if (data.cleanedIdea.length >= 20) score += 15;
    if (data.project) score += 12;
    if (data.context.stack) score += 9;
    if (data.context.projectState) score += 7;
    if (data.context.constraints) score += 10;
    if (data.context.technical) score += 7;
    return Math.min(98, score);
  }

  function qualityTags(data) {
    const tags = [];
    if (data.cleanedIdea.length >= 20) tags.push("Objectif clair");
    if (data.project) tags.push("Projet ciblé");
    if (data.context.constraints) tags.push("Contraintes isolées");
    if (data.context.stack) tags.push("Stack précisée");
    tags.push("Livrable explicite");
    return tags.slice(0, 5);
  }

  function renderMetrics(data) {
    const original = estimateTokens([data.rawIdea, data.context.stack, data.context.projectState, data.context.constraints, data.context.technical].filter(Boolean).join("\n"));
    const optimized = estimateTokens(els.output.value);
    const delta = original ? Math.round(((original - optimized) / original) * 100) : 0;
    if (state.current) state.current.delta = delta;
    els.originalTokens.textContent = String(original);
    els.optimizedTokens.textContent = String(optimized);
    if (delta >= 0) {
      els.savingsPercent.textContent = `${delta} %`;
      els.savingsLabel.textContent = delta ? "de texte en moins" : "même volume";
      els.savingsPercent.parentElement.classList.add("savings");
    } else {
      els.savingsPercent.textContent = `+${Math.abs(delta)} %`;
      els.savingsLabel.textContent = "de cadrage ajouté";
      els.savingsPercent.parentElement.classList.remove("savings");
    }
    const score = qualityFor(data);
    els.qualityScore.textContent = `${score}/100`;
    els.qualityBar.style.width = `${score}%`;
    els.qualityTags.innerHTML = qualityTags(data).map((tag) => `<span class="quality-tag">${escapeHtml(tag)}</span>`).join("");
    els.targetLabel.textContent = state.target;
    els.finalCharCount.textContent = `${els.output.value.length.toLocaleString("fr-FR")} caractères`;
  }

  function renderAnalysis(data) {
    const removed = data.rawIdea.length - data.cleanedIdea.length;
    const reductionText = removed > 12
      ? `${removed} caractères de politesse et de répétitions retirés avant la structuration.`
      : "La formulation était déjà directe ; elle a surtout été structurée.";
    const contextText = data.context.stack || data.context.projectState || data.context.constraints || data.context.technical
      ? "Les informations facultatives ont été placées dans un bloc séparé pour éviter de noyer l’objectif."
      : "Tu peux ajouter une stack ou une contrainte si la première réponse reste trop générale.";
    const savings = typeof state.current?.delta === "number" ? state.current.delta : 0;
    const savingsText = savings >= 0
      ? `Le prompt est ${savings}% plus court que le brouillon fourni.`
      : `Le cadrage ajoute ${Math.abs(savings)}% de texte ; il vise à éviter les allers-retours et les réponses hors sujet.`;
    const next = data.task === "Corriger"
      ? "Colle ensuite le message d’erreur exact et le fichier concerné."
      : data.task === "Créer"
        ? "Si l’IA te pose une question, réponds uniquement à celle-ci puis renvoie le même prompt."
        : "Après la première réponse, demande uniquement la modification suivante. " + targetDirectives[state.target];

    const cards = [
      ["✂", "Nettoyage", reductionText],
      ["⊞", "Structure", "Objectif, contexte, contraintes et livrable sont séparés pour que l’IA sache quoi faire en premier."],
      ["≈", "Volume", savingsText],
      ["→", "Suite conseillée", next],
      ["◎", "Contexte", contextText]
    ];
    els.analysisGrid.innerHTML = cards.map(([icon, title, text]) => `<article class="analysis-card"><span class="analysis-icon" aria-hidden="true">${icon}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p></article>`).join("");
  }

  function generatePrompt({ silent = false } = {}) {
    const data = buildPrompt();
    if (!data.rawIdea.trim()) {
      if (!silent) showToast("Décris ton idée avant de lancer l’optimisation.");
      els.idea.focus();
      return;
    }
    els.output.value = data.prompt;
    state.current = { ...data, prompt: data.prompt, target: state.target, mode: state.mode, createdAt: new Date().toISOString() };
    renderMetrics(data);
    renderAnalysis(data);
    els.resultStatus.textContent = silent ? "Aperçu prêt" : "Prompt mis à jour";
    if (!silent) {
      els.resultCard.scrollIntoView({ behavior: "smooth", block: "start" });
      showToast("Prompt optimisé. Tu peux le modifier avant de le copier.");
    }
  }

  function updateIdeaCount() {
    els.ideaCount.textContent = `${els.idea.value.length.toLocaleString("fr-FR")} / 6 000 caractères`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  }

  function formatDate(value) {
    try {
      return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
    } catch {
      return "récemment";
    }
  }

  function saveCurrentPrompt() {
    if (!state.current || !els.output.value.trim()) {
      showToast("Génère d’abord un prompt à enregistrer.");
      return;
    }
    const record = {
      id: state.current.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: makeTitle(state.current.cleanedIdea || els.idea.value),
      target: state.target,
      project: state.current.project,
      task: state.current.task,
      mode: state.mode,
      idea: els.idea.value,
      prompt: els.output.value,
      context: selectedContext(),
      createdAt: new Date().toISOString()
    };
    state.current.id = record.id;
    state.history = [record, ...state.history.filter((item) => item.id !== record.id)].slice(0, 30);
    persistHistory();
    renderHistory();
    els.resultStatus.textContent = "Enregistré dans l’historique";
    showToast("Prompt enregistré sur cet appareil.");
  }

  function makeTitle(text) {
    const clean = cleanText(text).replace(/[.!?]+$/, "").trim();
    if (!clean) return "Prompt sans titre";
    return clean.length > 66 ? `${clean.slice(0, 63).trim()}…` : clean;
  }

  function renderHistory() {
    els.historyCount.textContent = String(state.history.length);
    if (!state.history.length) {
      els.historyList.innerHTML = `<div class="history-empty"><div><strong>Aucun prompt enregistré</strong><span>Utilise « Enregistrer » après une génération pour le retrouver ici.</span></div></div>`;
      return;
    }
    els.historyList.innerHTML = state.history.map((item) => `
      <article class="history-card" data-history-id="${escapeHtml(item.id)}">
        <div class="history-main">
          <div class="history-title">${escapeHtml(item.title)}</div>
          <div class="history-meta"><span>${escapeHtml(item.target || "IA")}</span><span>${escapeHtml(item.project || "Projet")}</span><span>${escapeHtml(item.task || "")}</span><span>${escapeHtml(formatDate(item.createdAt))}</span></div>
          <p class="history-preview">${escapeHtml(item.prompt || "")}</p>
        </div>
        <div class="history-actions"><button class="secondary-button" type="button" data-history-action="load" data-history-id="${escapeHtml(item.id)}">Charger</button><button class="icon-button bordered" type="button" data-history-action="delete" data-history-id="${escapeHtml(item.id)}" aria-label="Supprimer ce prompt" title="Supprimer">×</button></div>
      </article>`).join("");
  }

  function loadRecord(record) {
    els.idea.value = record.idea || "";
    els.projectType.value = record.project || "PWA";
    els.taskType.value = record.task || "Créer";
    state.target = record.target || "ChatGPT";
    state.mode = record.mode || "compact";
    setChoice("target", state.target);
    setMode(state.mode);
    const context = record.context || {};
    els.stack.value = context.stack || "";
    els.projectState.value = context.projectState || "";
    els.constraints.value = context.constraints || "";
    els.technicalContext.value = context.technical || "";
    updateIdeaCount();
    generatePrompt({ silent: true });
    switchView("composer");
    showToast("Prompt chargé dans le composeur.");
  }

  function deleteRecord(id) {
    state.history = state.history.filter((item) => item.id !== id);
    persistHistory();
    renderHistory();
    showToast("Prompt supprimé.");
  }

  function clearHistory() {
    if (!state.history.length) return;
    state.history = [];
    persistHistory();
    renderHistory();
    showToast("Historique vidé.");
  }

  async function copyPrompt() {
    const text = els.output.value.trim();
    if (!text) { showToast("Aucun prompt à copier."); return; }
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      els.output.focus();
      els.output.select();
      document.execCommand("copy");
      els.output.setSelectionRange(0, 0);
    }
    els.resultStatus.textContent = "Copié dans le presse-papiers";
    showToast("Prompt copié. Il est prêt à être collé dans l’IA.");
  }

  function downloadPrompt() {
    const text = els.output.value.trim();
    if (!text) { showToast("Génère un prompt avant de le télécharger."); return; }
    const title = makeTitle(els.idea.value).toLowerCase().replace(/[^a-z0-9àâçéèêëîïôûùüÿñæœ -]/gi, "").replace(/\s+/g, "-").slice(0, 44) || "prompt-optimise";
    const header = `# Prompt optimisé — ${makeTitle(els.idea.value)}\n\n> Cible : ${state.target} · Projet : ${els.projectType.value} · Mode : ${state.mode === "expert" ? "expert" : "compact"}\n\n`;
    const blob = new Blob([header + text + "\n"], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("Fichier Markdown téléchargé.");
  }

  function setChoice(choice, value) {
    if (choice === "target") state.target = value;
    $$(`[data-choice="${choice}"]`).forEach((button) => {
      const selected = button.dataset.value === value;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  function setMode(value) {
    state.mode = value;
    $$("#mode-choices .segment").forEach((button) => {
      const selected = button.dataset.value === value;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  function switchView(viewName) {
    const views = { composer: els.composerView, history: els.historyView, guide: els.guideView };
    Object.entries(views).forEach(([name, view]) => {
      const active = name === viewName;
      view.hidden = !active;
      view.classList.toggle("is-active", active);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showToast(message) {
    clearTimeout(state.toastTimer);
    els.toast.textContent = message;
    els.toast.classList.add("is-visible");
    state.toastTimer = setTimeout(() => els.toast.classList.remove("is-visible"), 3200);
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* mode local sans stockage disponible */ }
  }

  function toggleResultTab(name) {
    const promptTab = $("[data-result-tab=prompt]");
    const analysisTab = $("[data-result-tab=analysis]");
    const promptActive = name === "prompt";
    promptTab.classList.toggle("is-active", promptActive);
    analysisTab.classList.toggle("is-active", !promptActive);
    promptTab.setAttribute("aria-selected", String(promptActive));
    analysisTab.setAttribute("aria-selected", String(!promptActive));
    $("#prompt-result").hidden = !promptActive;
    $("#analysis-result").hidden = promptActive;
  }

  function bindEvents() {
    els.idea.addEventListener("input", updateIdeaCount);
    els.generate.addEventListener("click", () => generatePrompt());
    els.output.addEventListener("input", () => {
      if (state.current) state.current.prompt = els.output.value;
      if (state.current) renderMetrics(state.current);
    });
    els.projectType.addEventListener("change", () => { if (state.current) generatePrompt({ silent: true }); });
    els.taskType.addEventListener("change", () => { if (state.current) generatePrompt({ silent: true }); });
    $("#target-choices").addEventListener("click", (event) => {
      const button = event.target.closest("[data-choice=target]");
      if (!button) return;
      setChoice("target", button.dataset.value);
      if (state.current) generatePrompt({ silent: true });
    });
    $("#mode-choices").addEventListener("click", (event) => {
      const button = event.target.closest(".segment");
      if (!button) return;
      setMode(button.dataset.value);
      if (state.current) generatePrompt({ silent: true });
    });
    $$(".example-chip").forEach((button) => button.addEventListener("click", () => {
      els.idea.value = button.dataset.example || "";
      updateIdeaCount();
      generatePrompt();
    }));
    $$('[data-view]').forEach((button) => button.addEventListener("click", () => switchView(button.dataset.view)));
    $$('[data-result-tab]').forEach((button) => button.addEventListener("click", () => toggleResultTab(button.dataset.resultTab)));
    $("[data-action=clear-idea]").addEventListener("click", () => { els.idea.value = ""; updateIdeaCount(); els.idea.focus(); });
    $("[data-action=copy-prompt]").addEventListener("click", copyPrompt);
    $("[data-action=download-prompt]").addEventListener("click", downloadPrompt);
    $("[data-action=save-prompt]").addEventListener("click", saveCurrentPrompt);
    $("[data-action=clear-history]").addEventListener("click", clearHistory);
    $("[data-action=toggle-theme]").addEventListener("click", () => applyTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light"));
    els.historyList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-history-action]");
      if (!button) return;
      const id = button.dataset.historyId;
      const record = state.history.find((item) => item.id === id);
      if (button.dataset.historyAction === "load" && record) loadRecord(record);
      if (button.dataset.historyAction === "delete") deleteRecord(id);
    });
    document.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        generatePrompt();
      }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "c") {
        event.preventDefault();
        copyPrompt();
      }
    });
  }

  function init() {
    const storedTheme = (() => { try { return localStorage.getItem(THEME_KEY); } catch { return null; } })();
    applyTheme(storedTheme === "light" ? "light" : "dark");
    els.idea.value = STARTER_IDEA;
    updateIdeaCount();
    renderHistory();
    bindEvents();
    generatePrompt({ silent: true });
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
    }
  }

  init();
})();
