import React from "react";

const THEMES = [
  { id: "teal", label: "Teal (Default)" },
  { id: "cream", label: "Cream" },
  { id: "lavender", label: "Lavender" },
  { id: "forest", label: "Forest" },
  { id: "sunset", label: "Sunset" },
  { id: "ocean", label: "Ocean" },
  { id: "rose", label: "Rose" },
  { id: "mono", label: "Mono" },
];

export default function Settings({
  theme,
  setTheme,
  darkMode,
  setDarkMode,
  booksPerLine,
  setBooksPerLine,
}) {
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold mb-6 text-[color:var(--text-primary)]">Settings</h1>

      {/* Color scheme */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2 text-[color:var(--text-primary)]">Color scheme</h2>
        <p className="text-sm mb-4 text-[color:var(--text-secondary)]">
          Changes accent colors (buttons/highlights) and the sidebar background.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {THEMES.map((t) => {
            const selected = t.id === theme;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={[
                  "border rounded-lg p-4 text-left transition-colors",
                  selected
                    ? "border-[color:var(--accent)] bg-[color:var(--active-bg)]"
                    : "border-[color:var(--border)] hover:bg-[color:var(--active-bg)]",
                ].join(" ")}
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-[color:var(--text-primary)]">{t.label}</div>
                  <span
                    className="inline-block w-6 h-6 rounded"
                    style={{
                      background:
                        t.id === "teal" ? "#26c6da" :
                        t.id === "cream" ? "#d4a373" :
                        t.id === "lavender" ? "#8b5cf6" :
                        t.id === "forest" ? "#2f855a" :
                        t.id === "sunset" ? "#f97316" :
                        t.id === "ocean" ? "#2563eb" :
                        t.id === "rose" ? "#e11d48" :
                        "#111827",
                    }}
                    title="Accent preview"
                  />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Dark mode */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2 text-[color:var(--text-primary)]">Dark mode</h2>

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={darkMode}
            onChange={(e) => setDarkMode(e.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-[color:var(--text-primary)]">Enable dark mode</span>
        </label>
      </section>

      {/* Books per line */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2 text-[color:var(--text-primary)]">Books per line</h2>
        <p className="text-sm mb-4 text-[color:var(--text-secondary)]">
          Choose how many books appear in a row (3–10). Cards automatically shrink/grow to fit.
        </p>

        <div className="flex items-center gap-4">
          <input
            type="range"
            min={3}
            max={10}
            value={booksPerLine}
            onChange={(e) => setBooksPerLine(Number(e.target.value))}
            className="w-full"
          />
          <div className="min-w-12 text-center font-mono text-[color:var(--text-primary)]">
            {booksPerLine}
          </div>
        </div>
      </section>
    </div>
  );
}
