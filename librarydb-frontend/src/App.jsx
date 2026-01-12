import React, { useEffect, useMemo, useState } from "react";
import {
  Library,
  Pencil,
  FolderPlus,
  Upload,
  CreditCard,
  Users,
  Barcode,
  LayoutDashboard,
  FileText,
  Settings as SettingsIcon,
  HelpCircle,
  LogOut,
  Search,
  SlidersHorizontal,
  ArrowDown,
  LayoutGrid,
  Bookmark,
} from "lucide-react";
import EditStock from "./pages/EditStock";
import { getBooks } from "./api/books";
import SettingsPage from "./pages/Settings";
import SupportPage from "./pages/Support";
import BookDetailsModal from "./components/BookDetailsModal";
import FiltersPanel from "./components/FiltersPanel";

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

function firstLetterOf(title) {
  const t = (title || "").trim();
  if (!t) return "#";
  const ch = t[0].toUpperCase();
  return ch >= "A" && ch <= "Z" ? ch : "#";
}

function normalizeYear(publishDate) {
  const m = String(publishDate || "").match(/(\d{4})/);
  return m ? Number(m[1]) : null;
}

function NavItem({ icon, label, active = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full text-left relative flex items-center gap-4 px-4 py-2 cursor-pointer transition-colors group rounded-md",
        active
          ? "text-[color:var(--accent)] bg-[color:var(--active-bg)]"
          : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--active-bg)]",
      ].join(" ")}
    >
      <span
        className={
          active
            ? "text-[color:var(--accent)]"
            : "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"
        }
      >
        {icon}
      </span>
      <span className="text-[15px] font-medium tracking-wide">{label}</span>
      {active && (
        <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-[color:var(--accent)] rounded-r-md" />
      )}
    </button>
  );
}

function BookCard({ book }) {
  return (
    <div className="group flex flex-col">
      <div className="relative aspect-[1/1.5] w-full mb-3 shadow-card group-hover:shadow-card-hover transition-all duration-300 rounded-[4px] overflow-hidden bg-gray-100">
        <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
        <div className="absolute bottom-0 left-2">
          <div className="relative">
            <Bookmark size={28} className="text-gray-400/80 fill-gray-400/80" strokeWidth={0} />
            <Bookmark size={28} className="text-white absolute top-0.5 left-0" strokeWidth={1.5} />
          </div>
        </div>
      </div>

      <div className="pr-2 min-h-[64px]">
        <h3 className="font-bold text-[color:var(--text-primary)] text-[15px] leading-tight mb-1 line-clamp-2" title={book.title}>
          {book.title}
        </h3>
        <p className="text-sm text-[color:var(--text-secondary)] line-clamp-1" title={book.author}>
          {book.author}
        </p>
        {book.quantity === 0 && <p className="text-xs text-red-500 font-bold mt-1">Out of Stock</p>}
      </div>
    </div>
  );
}

const GRID_CLASS_BY_COLS = {
  3: "xl:grid-cols-3",
  4: "xl:grid-cols-4",
  5: "xl:grid-cols-5",
  6: "xl:grid-cols-6",
  7: "xl:grid-cols-7",
  8: "xl:grid-cols-8",
  9: "xl:grid-cols-9",
  10: "xl:grid-cols-10",
};

const LETTERS = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""), "#", "ALL"];

export default function App() {
  const [activePage, setActivePage] = useState("library"); // library | stock | settings | support

  const [theme, setTheme] = useState(() => loadLS("ui.theme", "teal"));
  const [darkMode, setDarkMode] = useState(() => loadLS("ui.darkMode", false));
  const [booksPerLine, setBooksPerLine] = useState(() => clamp(loadLS("ui.booksPerLine", 5), 3, 10));

  const [searchTerm, setSearchTerm] = useState("");
  const [books, setBooks] = useState([]);

  const [activeLetter, setActiveLetter] = useState("ALL");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);

  const [filters, setFilters] = useState({
    onlyInStock: false,
    minCondition: 1,
    author: "",
    publisher: "",
    subject: "",
  });

  const [sortBy, setSortBy] = useState("title"); // title | author | year | condition
  const [sortDir, setSortDir] = useState("asc"); // asc | desc

  const [loadError, setLoadError] = useState("");

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

  async function refresh() {
    setLoadError("");
    try {
      const list = await getBooks();
      setBooks(list);
    } catch (e) {
      setLoadError(String(e?.message || e));
      setBooks([]);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    const result = books
      .filter((b) => {
        if (!q) return true;
        return (
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          (b.isbn || "").toLowerCase().includes(q)
        );
      })
      .filter((b) => (activeLetter === "ALL" ? true : firstLetterOf(b.title) === activeLetter))
      .filter((b) => (filters.onlyInStock ? (b.quantity ?? 0) > 0 : true))
      .filter((b) => (b.condition ?? 1) >= filters.minCondition)
      .filter((b) => (filters.author ? b.author === filters.author : true))
      .filter((b) => (filters.publisher ? b.publisher === filters.publisher : true))
      .filter((b) => {
        if (!filters.subject) return true;
        const subs = b.subjects || [];
        return subs.includes(filters.subject);
      });

    const dir = sortDir === "asc" ? 1 : -1;

    return [...result].sort((a, b) => {
      const av =
        sortBy === "title"
          ? a.title
          : sortBy === "author"
            ? a.author
            : sortBy === "year"
              ? (normalizeYear(a.publish_date) ?? 0)
              : (a.condition ?? 0);

      const bv =
        sortBy === "title"
          ? b.title
          : sortBy === "author"
            ? b.author
            : sortBy === "year"
              ? (normalizeYear(b.publish_date) ?? 0)
              : (b.condition ?? 0);

      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [books, searchTerm, activeLetter, filters, sortBy, sortDir]);

  const gridColsClass = GRID_CLASS_BY_COLS[booksPerLine] ?? "xl:grid-cols-5";

  const StockPlaceholder = () => (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold mb-2 text-[color:var(--text-primary)]">Edit stock</h1>
      <p className="text-sm text-[color:var(--text-secondary)] mb-4">
        Backend is connected. Next: implement CRUD UI for /api/stock/set and OpenLibrary autofill.
      </p>

      <button
        type="button"
        onClick={refresh}
        className="px-4 py-2 rounded-md bg-[color:var(--accent)] hover:bg-[color:var(--accent-hover)] text-white font-semibold"
      >
        Refresh library data
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-primary)]">
      <div className="flex min-h-screen font-sans">
        <aside className="w-64 bg-[color:var(--sidebar-bg)] border-r border-[color:var(--border)] flex flex-col fixed h-full z-20">
          <div className="h-20 flex items-center px-6 gap-3 border-b border-[color:var(--border)]">
            <div className="w-10 h-10 rounded-lg bg-[color:var(--accent)] text-white flex items-center justify-center font-black">
              DB
            </div>
            <div className="leading-tight">
              <div className="text-lg font-semibold text-[color:var(--text-primary)]">LibraryDB</div>
              <div className="text-xs text-[color:var(--text-secondary)]">Placeholder brand</div>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-8 overflow-y-auto py-4">
            <div className="space-y-1">
              <NavItem icon={<Library size={20} />} label="Library" active={activePage === "library"} onClick={() => setActivePage("library")} />
              <NavItem icon={<Pencil size={20} />} label="Edit stock" active={activePage === "stock"} onClick={() => setActivePage("stock")} />
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

        <main className="ml-64 flex-1 px-10 py-8 w-full">
          <div className="mx-auto max-w-[1600px]">
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

            {activePage === "stock" && <EditStock onSaved={refresh} />}

            {activePage === "library" && (
              <>
                <div className="flex justify-between items-start mb-12">
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

                  <div className="flex items-center rounded-full pl-5 pr-1 py-1 gap-3 bg-[color:var(--active-bg)] border border-[color:var(--border)]">
                    <span className="text-sm font-semibold">Count&apos;s Library</span>
                    <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white bg-gray-800">
                      <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="avatar" />
                    </div>
                  </div>
                </div>

                {loadError && (
                  <div className="mb-6 rounded-lg border border-red-300 bg-red-50 text-red-800 px-4 py-3">
                    <div className="font-semibold">Backend error</div>
                    <div className="text-sm">{loadError}</div>
                    <div className="text-sm mt-2">
                      Check VITE_API_BASE_URL and that your PHP server allows CORS.
                    </div>
                  </div>
                )}

                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                  <div className="flex items-center rounded-lg p-1.5 pr-4 bg-[color:var(--active-bg)] border border-[color:var(--border)]">
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

                    <div className="flex items-center gap-2">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-3 py-2 bg-[color:var(--panel-bg)] border border-[color:var(--border)] rounded-md text-sm text-[color:var(--text-primary)]"
                      >
                        <option value="title">Title</option>
                        <option value="author">Author</option>
                        <option value="year">Year</option>
                        <option value="condition">Condition</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                        className="flex items-center gap-2 px-4 py-2 bg-[color:var(--panel-bg)] border border-[color:var(--border)] rounded-md text-[color:var(--text-secondary)] text-sm font-medium shadow-sm hover:bg-[color:var(--active-bg)]"
                        title="Toggle sort direction"
                      >
                        <span>{sortDir === "asc" ? "Asc" : "Desc"}</span>
                        <ArrowDown size={14} className={sortDir === "asc" ? "opacity-60 rotate-180" : "opacity-60"} />
                      </button>
                    </div>

                    <button
                      onClick={() => setIsFiltersOpen(true)}
                      className="flex items-center gap-2 px-5 py-2 bg-[color:var(--accent)] hover:bg-[color:var(--accent-hover)] text-white rounded-md text-sm font-bold shadow-sm transition-colors"
                    >
                      <SlidersHorizontal size={16} />
                      <span>Filters</span>
                    </button>
                  </div>
                </div>

                <div className="flex justify-between text-xs font-bold opacity-70 mb-6 px-1 select-none tracking-widest text-[color:var(--text-secondary)]">
                  {LETTERS.map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setActiveLetter(ch)}
                      className={[
                        "cursor-pointer transition-colors",
                        ch === activeLetter ? "text-[color:var(--accent)]" : "hover:text-[color:var(--accent)]",
                      ].join(" ")}
                      title={ch === "ALL" ? "All" : ch}
                    >
                      {ch}
                    </button>
                  ))}
                </div>

                <h2 className="text-2xl font-bold mb-8 text-[color:var(--accent)]">
                  {activeLetter === "ALL" ? "All books" : activeLetter}
                </h2>

                <div className={["grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5", gridColsClass, "gap-x-8 gap-y-12 items-start"].join(" ")}>
                  {filtered.map((b) => (
                    <button key={b.stock_id} type="button" onClick={() => setSelectedBook(b)} className="text-left focus:outline-none">
                      <div className="rounded-md hover:bg-[color:var(--active-bg)] p-2 -m-2 transition-colors">
                        <BookCard book={b} />
                      </div>
                    </button>
                  ))}
                </div>

                <FiltersPanel
                  open={isFiltersOpen}
                  onClose={() => setIsFiltersOpen(false)}
                  books={books}
                  filters={filters}
                  setFilters={setFilters}
                />

                <BookDetailsModal open={!!selectedBook} book={selectedBook} onClose={() => setSelectedBook(null)} />
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
