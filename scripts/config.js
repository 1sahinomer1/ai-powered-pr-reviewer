// AI PR Reviewer Configuration
// Override via environment variables

export const config = {
    // OpenAI Settings
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || "0.2"),
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || "2000"),

    // Review Settings
    maxFilesPerReview: parseInt(process.env.MAX_FILES || "15"),
    enableInlineComments: process.env.ENABLE_INLINE !== "false",
    enableGeneralComment: process.env.ENABLE_GENERAL !== "false",

    // Language: "en" (English), "tr" (Turkish), "de" (German), "es" (Spanish), etc.
    language: process.env.REVIEW_LANGUAGE || "en",

    // File filters (comma-separated extensions to ignore)
    ignoreExtensions: (process.env.IGNORE_EXTENSIONS || ".md,.txt,.json,.lock").split(","),
};

// Language prompts
export const languagePrompts = {
    en: {
        systemPrompt: "You are a code review bot. Always respond with valid JSON array only. No markdown.",
        reviewInstructions: "Return a JSON array of comments. Each comment MUST have: \"position\" (use ONLY from valid positions), \"body\" (your feedback). Only comment on significant issues: bugs, security, performance problems. If no issues, return empty array []. Maximum 3 comments per file.",
        generalSystemPrompt: "You are a concise PR reviewer.",
        generalInstructions: "Provide a high-level summary:\n- Overall code quality assessment (1-2 sentences)\n- Key concerns if any\n- Positive aspects\n\nKeep it short (max 150 words). Use bullet points."
    },
    tr: {
        systemPrompt: "Sen bir kod inceleme botusun. Sadece geçerli JSON array döndür. Markdown kullanma. body alanını MUTLAKA TÜRKÇE yaz.",
        reviewInstructions: "JSON formatında yorum dizisi döndür. Her yorum şunları içermeli: \"position\" (sadece geçerli pozisyonlardan), \"body\" (TÜRKÇE geri bildirimin). Sadece önemli sorunlara yorum yap: bug'lar, güvenlik, performans problemleri. Sorun yoksa boş dizi [] döndür. Dosya başına maksimum 3 yorum. YORUMLARI TÜRKÇE YAZ.",
        generalSystemPrompt: "Sen özlü bir PR inceleyicisisin. MUTLAKA TÜRKÇE yanıt ver.",
        generalInstructions: "Üst düzey bir özet sun:\n- Genel kod kalitesi değerlendirmesi (1-2 cümle)\n- Varsa önemli sorunlar\n- Olumlu yönler\n\nKısa tut (maksimum 150 kelime). Madde işaretleri kullan. TÜRKÇE YAZ."
    },
    de: {
        systemPrompt: "Du bist ein Code-Review-Bot. Antworte nur mit gültigem JSON-Array. Kein Markdown.",
        reviewInstructions: "Gib ein JSON-Array mit Kommentaren zurück. Jeder Kommentar MUSS enthalten: \"position\" (nur gültige Positionen), \"body\" (dein Feedback). Kommentiere nur wichtige Probleme: Bugs, Sicherheit, Performance. Bei keinen Problemen leeres Array [] zurückgeben. Maximal 3 Kommentare pro Datei.",
        generalSystemPrompt: "Du bist ein präziser PR-Reviewer. Antworte auf Deutsch.",
        generalInstructions: "Gib eine Zusammenfassung:\n- Gesamte Code-Qualität (1-2 Sätze)\n- Wichtige Bedenken\n- Positive Aspekte\n\nKurz halten (max 150 Wörter). Aufzählungspunkte verwenden."
    }
};
