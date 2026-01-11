import React, { useEffect, useMemo, useState } from "react";
import {
  Library, Plus, FolderPlus, Upload, CreditCard,
  Users, Barcode, LayoutDashboard, FileText, Settings as SettingsIcon,
  HelpCircle, LogOut, Search, SlidersHorizontal,
  ArrowDown, LayoutGrid, Bookmark, BookOpen
} from "lucide-react";
import { getBooks } from "./api/books";
import SettingsPage from "./pages/Settings";
import SupportPage from "./pages/Support";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function loadLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveLS(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function NavItem({ icon, label, active = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full text-left relative flex items-center gap-4 px-4 py-2 cursor-pointer transition-colors group",
        active ? "text-[color:var(--accent)]" : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
      ].join(" ")}
    >
      <span className={active ? "text-[color:var(--accent)]" : "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"}>
        {icon}
      </span>
      <span className="text-[15px] font-medium tracking-wide">{label}</span>
      {active && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[color:var(--accent)] rounded-r-md" />}
    </button>
  );
}

function BookCard({ book }) {
  return (
    <div className="group flex flex-col">
      <div className="relative aspect-[1/1.5] w-full mb-3 shadow-card group-hover:shadow-card-hover transition-all duration-300 rounded-[2px] overflow-hidden bg-gray-100">
        <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
        <div className="absolute bottom-0 left-2">
          <div className="relative">
            <Bookmark size={28} className="text-gray-400/80 fill-gray-400/80" strokeWidth={0} />
            <Bookmark size={28} className="text-white absolute top-0.5 left-0" strokeWidth={1.5} />
          </div>
        </div>
      </div>

      <div className="pr-2">
        <h3 className="font-bold text-[color:var(--text-primary)] text-[15px] leading-tight mb-1 line-clamp-2" title={book.title}>
          {book.title}
        </h3>
        <p className="text-sm text-[color:var(--text-secondary)] line-clamp-1">{book.author}</p>
        {book.quantity === 0 && <p className="text-xs text-red-500 font-bold mt-1">Out of Stock</p>}
      </div>
    </div>
  );
}

// Tailwind needs to "see" the possible grid classes in source.
// Keep these literal strings.
const GRID_CLASS_BY_COLS = {
  3: "xl:grid-cols-3",
  4: "xl:grid-cols-4",
  5: "xl:grid-cols-5",
  6: "xl:grid-cols-6",
  7: "xl:grid-cols-7",
  8: "xl:grid-cols-8",
  9: "xl:grid-cols-9",
  10:"xl:grid-cols-10",
};

export default function App() {
  const [activePage, setActivePage] = useState("library"); // library | settings | support

  // Settings (persisted)
  const [theme, setTheme] = useState(() => loadLS("ui.theme", "teal"));
  const [darkMode, setDarkMode] = useState(() => loadLS("ui.darkMode", false));
  const [booksPerLine, setBooksPerLine] = useState(() => clamp(loadLS("ui.booksPerLine", 5), 3, 10));

  // Library state
  const [searchTerm, setSearchTerm] = useState("");
  const [books, setBooks] = useState([]);

  // Apply theme + dark mode
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    if (darkMode) root.classList.add("dark");
    else root.classList.remove("dark");

    saveLS("ui.theme", theme);
    saveLS("ui.darkMode", darkMode);
  }, [theme, darkMode]);

  useEffect(() => {
    const v = clamp(booksPerLine, 3, 10);
    if (v !== booksPerLine) setBooksPerLine(v);
    saveLS("ui.booksPerLine", v);
  }, [booksPerLine]);

  useEffect(() => {
    getBooks().then(setBooks);
  }, []);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return books;
    return books.filter(
      (b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)
    );
  }, [books, searchTerm]);

  const gridColsClass = GRID_CLASS_BY_COLS[booksPerLine] ?? "xl:grid-cols-5";

  return (
    <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-primary)]">
      <div className="flex min-h-screen font-sans">
        {/* Sidebar */}
        <aside className="w-64 bg-[color:var(--sidebar-bg)] border-r border-[color:var(--border)] flex flex-col fixed h-full z-20">
          <div className="h-20 flex items-center px-8 gap-3">
            <BookOpen className="w-8 h-8" strokeWidth={2} />
            <span className="text-3xl font-light tracking-tight">libib</span>
          </div>

          <nav className="flex-1 px-4 space-y-8 overflow-y-auto py-4">
            <div className="space-y-1">
              <NavItem icon={<Library size={20} />} label="Library" active={activePage === "library"} onClick={() => setActivePage("library")} />
              <NavItem icon={<Plus size={20} />} label="Add Items" onClick={() => alert("Placeholder: Add Items")} />
              <NavItem icon={<FolderPlus size={20} />} label="Add Collection" onClick={() => alert("Placeholder: Add Collection")} />
              <NavItem icon={<Upload size={20} />} label="Publish" onClick={() => alert("Placeholder: Publish")} />
            </div>

            <div className="space-y-1">
              <NavItem icon={<CreditCard size={20} />} label="Lending" onClick={() => alert("Placeholder: Lending")} />
              <NavItem icon={<Users size={20} />} label="Managers" onClick={() => alert("Placeholder: Managers")} />
              <NavItem icon={<Barcode size={20} />} label="Barcodes" onClick={() => alert("Placeholder: Barcodes")} />
            </div>

            <div className="space-y-1">
              <NavItem icon={<LayoutDashboard size={20} />} label="Dashboards" onClick={() => alert("Placeholder: Dashboards")} />
              <NavItem icon={<FileText size={20} />} label="Reports" onClick={() => alert("Placeholder: Reports")} />
            </div>
          </nav>

          <div className="p-4 space-y-1 bg-[color:var(--sidebar-bg)] border-t border-[color:var(--border)]">
            <NavItem icon={<SettingsIcon size={20} />} label="Settings" active={activePage === "settings"} onClick={() => setActivePage("settings")} />
            <NavItem icon={<HelpCircle size={20} />} label="Support" active={activePage === "support"} onClick={() => setActivePage("support")} />
            <NavItem icon={<LogOut size={20} />} label="Logout" onClick={() => alert("Placeholder: Logout")} />
          </div>
        </aside>

        {/* Main */}
        <main className="ml-64 flex-1 px-12 py-8 max-w-[1600px]">
          {activePage === "settings" && (
            <SettingsPage
              theme={theme}
              setTheme={setTheme}
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              booksPerLine={booksPerLine}
              setBooksPerLine={setBooksPerLine}
            />
          )}

          {activePage === "support" && <SupportPage />}

          {activePage === "library" && (
            <>
              {/* Top search */}
              <div className="flex justify-between items-start mb-16">
                <div className="flex items-center gap-4 w-full max-w-xl">
                  <Search className="w-6 h-6" />
                  <input
                    type="text"
                    placeholder="Start Searching..."
                    className="w-full bg-transparent border-none focus:ring-0 text-xl placeholder:text-[color:var(--text-secondary)] font-light outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="flex items-center rounded-full pl-5 pr-1 py-1 gap-3 bg-[color:var(--active-bg)]">
                  <span className="text-sm font-semibold">Count's Library</span>
                  <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white bg-gray-800">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="avatar" />
                  </div>
                </div>
              </div>

              {/* My Books bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
                <div className="flex items-center rounded-lg p-1.5 pr-4 bg-[color:var(--active-bg)]">
                  <div className="px-3 text-2xl font-bold">My Books</div>
                  <span className="bg-[color:var(--panel-bg)] border border-[color:var(--border)] text-[color:var(--text-secondary)] px-2 py-0.5 rounded text-xs font-bold shadow-sm">
                    {filtered.length}
                  </span>
                  <div className="ml-2">
                    <ArrowDown size={16} className="opacity-60 rotate-[-90deg]" />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 bg-[color:var(--panel-bg)] border border-[color:var(--border)] rounded-md text-[color:var(--text-secondary)] text-sm font-medium shadow-sm hover:bg-[color:var(--active-bg)]">
                    <LayoutGrid size={16} />
                    <span>Cover</span>
                  </button>

                  <button className="flex items-center gap-2 px-4 py-2 bg-[color:var(--panel-bg)] border border-[color:var(--border)] rounded-md text-[color:var(--text-secondary)] text-sm font-medium shadow-sm hover:bg-[color:var(--active-bg)]">
                    <span>Title</span>
                    <ArrowDown size={14} className="opacity-60" />
                  </button>

                  <button className="flex items-center gap-2 px-5 py-2 bg-[color:var(--accent)] hover:bg-[color:var(--accent-hover)] text-white rounded-md text-sm font-bold shadow-sm transition-colors">
                    <SlidersHorizontal size={16} />
                    <span>Filters</span>
                  </button>
                </div>
              </div>

              {/* A-Z row */}
              <div className="flex justify-between text-xs font-bold opacity-70 mb-8 px-1 select-none tracking-widest text-[color:var(--text-secondary)]">
                {"ABCDEFGHIJKLMNOPQRSTUVWXYZ#ALL".split("").map((ch, idx) => (
                  <span
                    key={ch}
                    className={[
                      "cursor-pointer transition-colors",
                      idx === 0 ? "text-[color:var(--accent)]" : "hover:text-[color:var(--accent)]"
                    ].join(" ")}
                  >
                    {ch}
                  </span>
                ))}
              </div>

              <h2 className="text-2xl font-bold mb-8 text-[color:var(--accent)]">A</h2>

              {/* Grid with adjustable columns */}
              <div
                className={[
                  "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
                  gridColsClass,
                  "gap-x-10 gap-y-14",
                ].join(" ")}
              >
                {filtered.map((b) => (
                  <BookCard key={b.stock_id} book={b} />
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
