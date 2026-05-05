import { useState, useEffect, useRef, useCallback } from "react";

const BOOKS_SEED = [
  { id: 1, title: "Introduction to Python", author: "John Smith", category: "Technology", price: 450, copies: 5, status: "active" },
  { id: 2, title: "Data Structures 101", author: "Maria Santos", category: "Technology", price: 380, copies: 3, status: "active" },
  { id: 3, title: "Philippine History", author: "Jose Reyes", category: "History", price: 300, copies: 4, status: "active" },
  { id: 4, title: "Calculus Made Easy", author: "Ana Cruz", category: "Math", price: 500, copies: 2, status: "active" },
  { id: 5, title: "World Literature", author: "Elena Bautista", category: "Literature", price: 350, copies: 6, status: "active" },
  { id: 6, title: "Biology Fundamentals", author: "Marco Dela Cruz", category: "Science", price: 420, copies: 3, status: "active" },
  { id: 7, title: "Introduction to Economics", author: "Lita Gomez", category: "Social", price: 390, copies: 2, status: "active" },
];

const USERS_SEED = [
  { id: 1, username: "admin", email: "admin@library.com", password: "admin123", role: "librarian" },
  { id: 2, username: "staff1", email: "staff@library.com", password: "staff123", role: "staff" },
  { id: 3, username: "student1", email: "student@library.com", password: "student123", role: "student" },
  { id: 4, username: "teacher1", email: "teacher@library.com", password: "teacher123", role: "teacher" },
];

const BORROWS_SEED = [
  { id: 1, userId: 3, bookId: 1, status: "borrowed", borrowedAt: "2025-04-20", dueDate: "2025-04-27", returnedAt: null, penalty: 0 },
  { id: 2, userId: 4, bookId: 3, status: "returned", borrowedAt: "2025-04-10", dueDate: "2025-04-17", returnedAt: "2025-04-15", penalty: 0 },
  { id: 3, userId: 3, bookId: 5, status: "overdue", borrowedAt: "2025-04-01", dueDate: "2025-04-08", returnedAt: null, penalty: 70 },
  { id: 4, userId: 4, bookId: 2, status: "borrowed", borrowedAt: "2025-04-25", dueDate: "2025-05-02", returnedAt: null, penalty: 0 },
];

const REQUESTS_SEED = [
  { id: 1, studentId: 3, bookId: 4, status: "pending", requestDate: "2025-04-30" },
  { id: 2, studentId: 3, bookId: 6, status: "approved", requestDate: "2025-04-22" },
];

const RESERVATIONS_SEED = [
  { id: 1, userId: 3, bookId: 7, status: "pending", reservedAt: "2025-04-28" },
];

const CATEGORY_COLORS = {
  Technology: "#185FA5", History: "#0F6E56", Math: "#854F0B",
  Literature: "#993C1D", Science: "#3B6D11", Social: "#993556", Other: "#534AB7",
};

function useLibraryData() {
  const [books, setBooks] = useState(BOOKS_SEED);
  const [users, setUsers] = useState(USERS_SEED);
  const [borrows, setBorrows] = useState(BORROWS_SEED);
  const [requests, setRequests] = useState(REQUESTS_SEED);
  const [reservations, setReservations] = useState(RESERVATIONS_SEED);

  const getUser = (id) => users.find(u => u.id === id);
  const getBook = (id) => books.find(b => b.id === id);

  const addBook = (book) => {
    const newBook = { ...book, id: Date.now(), status: "active" };
    setBooks(prev => [...prev, newBook]);
    return newBook;
  };
  const updateBook = (id, data) => setBooks(prev => prev.map(b => b.id === id ? { ...b, ...data } : b));
  const archiveBook = (id) => setBooks(prev => prev.map(b => b.id === id ? { ...b, status: b.status === "archived" ? "active" : "archived" } : b));

  const addUser = (user) => {
    const newUser = { ...user, id: Date.now() };
    setUsers(prev => [...prev, newUser]);
    return newUser;
  };

  const submitBorrowRequest = (studentId, bookId) => {
    const req = { id: Date.now(), studentId, bookId, status: "pending", requestDate: new Date().toISOString().split("T")[0] };
    setRequests(prev => [...prev, req]);
  };

  const approveRequest = (reqId) => {
    const req = requests.find(r => r.id === reqId);
    if (!req) return;
    const due = new Date(); due.setDate(due.getDate() + 7);
    const borrow = { id: Date.now(), userId: req.studentId, bookId: req.bookId, status: "borrowed", borrowedAt: new Date().toISOString().split("T")[0], dueDate: due.toISOString().split("T")[0], returnedAt: null, penalty: 0 };
    setBorrows(prev => [...prev, borrow]);
    setRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: "approved" } : r));
    setBooks(prev => prev.map(b => b.id === req.bookId ? { ...b, copies: Math.max(0, b.copies - 1) } : b));
  };

  const declineRequest = (reqId) => setRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: "declined" } : r));

  const returnBook = (borrowId) => {
    setBorrows(prev => prev.map(b => {
      if (b.id !== borrowId) return b;
      const today = new Date().toISOString().split("T")[0];
      setBooks(bks => bks.map(bk => bk.id === b.bookId ? { ...bk, copies: bk.copies + 1 } : bk));
      return { ...b, status: "returned", returnedAt: today };
    }));
  };

  const addReservation = (userId, bookId) => {
    const res = { id: Date.now(), userId, bookId, status: "pending", reservedAt: new Date().toISOString().split("T")[0] };
    setReservations(prev => [...prev, res]);
  };

  return { books, users, borrows, requests, reservations, getUser, getBook, addBook, updateBook, archiveBook, addUser, submitBorrowRequest, approveRequest, declineRequest, returnBook, addReservation };
}

// ─── MINI BAR CHART ───────────────────────────────────────
function MiniBar({ data, color = "#185FA5", height = 48 }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height }}>
      {data.map((d, i) => (
        <div key={i} title={`${d.label}: ${d.value}`} style={{ flex: 1, background: color, opacity: 0.15 + 0.85 * (d.value / max), borderRadius: "2px 2px 0 0", height: `${Math.max(4, (d.value / max) * 100)}%`, transition: "height .3s" }} />
      ))}
    </div>
  );
}

// ─── STAT CARD ────────────────────────────────────────────
function StatCard({ label, value, sub, color = "#185FA5", chart }) {
  return (
    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 600, color: "var(--color-text-primary)", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{sub}</div>}
      {chart && <MiniBar data={chart} color={color} />}
    </div>
  );
}

// ─── BADGE ────────────────────────────────────────────────
function Badge({ label, type = "info" }) {
  const styles = {
    borrowed: { bg: "#E6F1FB", color: "#185FA5" },
    returned: { bg: "#EAF3DE", color: "#3B6D11" },
    overdue: { bg: "#FCEBEB", color: "#A32D2D" },
    pending: { bg: "#FAEEDA", color: "#854F0B" },
    approved: { bg: "#EAF3DE", color: "#3B6D11" },
    declined: { bg: "#FCEBEB", color: "#A32D2D" },
    archived: { bg: "#F1EFE8", color: "#5F5E5A" },
    active: { bg: "#EAF3DE", color: "#3B6D11" },
    info: { bg: "#E6F1FB", color: "#185FA5" },
    success: { bg: "#EAF3DE", color: "#3B6D11" },
    warning: { bg: "#FAEEDA", color: "#854F0B" },
    danger: { bg: "#FCEBEB", color: "#A32D2D" },
  };
  const s = styles[type] || styles.info;
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600, display: "inline-block" }}>{label}</span>
  );
}

// ─── MODAL ────────────────────────────────────────────────
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-secondary)", width: "min(520px, 95vw)", maxHeight: "80vh", overflow: "auto", padding: "1.5rem" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--color-text-secondary)", padding: 4 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── INPUT ────────────────────────────────────────────────
function Field({ label, value, onChange, type = "text", options }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4, fontWeight: 500 }}>{label}</label>
      {options ? (
        <select value={value} onChange={e => onChange(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 14 }}>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 14, boxSizing: "border-box" }} />
      )}
    </div>
  );
}

// ─── AI CHATBOT ───────────────────────────────────────────
function AIChatbot({ db, currentUser, onClose }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I'm your Library Assistant. Ask me about books, your borrows, reservations, or anything about the library!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const buildContext = () => {
    const activeBooks = db.books.filter(b => b.status !== "archived");
    const myBorrows = db.borrows.filter(b => b.userId === currentUser.id && b.status === "borrowed");
    const myReqs = db.requests.filter(r => r.studentId === currentUser.id && r.status === "pending");
    const totalBorrowed = db.borrows.filter(b => b.status === "borrowed").length;
    const overdue = db.borrows.filter(b => b.status === "overdue").length;
    const pendingReqs = db.requests.filter(r => r.status === "pending").length;

    return `You are a helpful library assistant for a school Library Management System in the Philippines. 
Current user: ${currentUser.username} (${currentUser.role})
Today: ${new Date().toLocaleDateString("en-PH", { dateStyle: "long" })}

Library stats:
- Total active books: ${activeBooks.length}
- Currently borrowed system-wide: ${totalBorrowed}
- Overdue books: ${overdue}
- Pending borrow requests: ${pendingReqs}

Available books (sample):
${activeBooks.slice(0, 7).map(b => `- "${b.title}" by ${b.author} (${b.category}) — ₱${b.price}, ${b.copies} copies`).join("\n")}

${currentUser.role === "student" || currentUser.role === "teacher" ? `
User's current borrows:
${myBorrows.length === 0 ? "None" : myBorrows.map(b => { const bk = db.books.find(x => x.id === b.bookId); return `- "${bk?.title}" due ${b.dueDate}`; }).join("\n")}

User's pending requests:
${myReqs.length === 0 ? "None" : myReqs.map(r => { const bk = db.books.find(x => x.id === r.bookId); return `- "${bk?.title}"`; }).join("\n")}
` : ""}

Respond helpfully, concisely, and in a friendly tone. If asked about specific data you don't have, acknowledge the limitation. For recommendations, use the available book data. Keep responses under 150 words unless detail is needed.`;
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: buildContext(),
          messages: history.slice(-10),
        }),
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "Sorry, I couldn't process that.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I'm having trouble connecting right now. Please try again." }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, width: 360, height: 500, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-lg)", boxShadow: "0 4px 24px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", zIndex: 900 }}>
      <div style={{ padding: "12px 16px", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#185FA5", borderRadius: "var(--border-radius-lg) var(--border-radius-lg) 0 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>📚</div>
          <div>
            <div style={{ color: "#fff", fontWeight: 500, fontSize: 13 }}>Library Assistant</div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>AI-powered</div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.8)", cursor: "pointer", fontSize: 18, padding: 4 }}>×</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "82%", padding: "8px 12px", borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px", background: m.role === "user" ? "#185FA5" : "var(--color-background-secondary)", color: m.role === "user" ? "#fff" : "var(--color-text-primary)", fontSize: 13, lineHeight: 1.5 }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ padding: "8px 12px", borderRadius: "12px 12px 12px 2px", background: "var(--color-background-secondary)", fontSize: 13, color: "var(--color-text-secondary)" }}>Thinking…</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: "10px 12px", borderTop: "0.5px solid var(--color-border-tertiary)", display: "flex", gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Ask about books, borrows…" style={{ flex: 1, padding: "7px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 13 }} />
        <button onClick={send} disabled={loading || !input.trim()} style={{ background: "#185FA5", border: "none", borderRadius: "var(--border-radius-md)", padding: "7px 14px", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 500, opacity: loading || !input.trim() ? 0.5 : 1 }}>Send</button>
      </div>
    </div>
  );
}

// ─── ANALYTICS VIEW ───────────────────────────────────────
function AnalyticsView({ db }) {
  const totalBooks = db.books.filter(b => b.status !== "archived").length;
  const totalBorrowed = db.borrows.filter(b => b.status === "borrowed").length;
  const totalOverdue = db.borrows.filter(b => b.status === "overdue").length;
  const totalReturned = db.borrows.filter(b => b.status === "returned").length;
  const totalPenalties = db.borrows.reduce((s, b) => s + (b.penalty || 0), 0);
  const pendingReqs = db.requests.filter(r => r.status === "pending").length;

  const catMap = {};
  db.borrows.forEach(b => {
    const bk = db.books.find(x => x.id === b.bookId);
    if (bk) { catMap[bk.category] = (catMap[bk.category] || 0) + 1; }
  });
  const catData = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  const maxCat = Math.max(...catData.map(d => d[1]), 1);

  const bookBorrowCount = {};
  db.borrows.forEach(b => { bookBorrowCount[b.bookId] = (bookBorrowCount[b.bookId] || 0) + 1; });
  const topBooks = Object.entries(bookBorrowCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, count]) => {
    const bk = db.books.find(x => x.id === Number(id));
    return { title: bk?.title || "Unknown", count };
  });

  const weeklyChart = [
    { label: "Mon", value: 2 }, { label: "Tue", value: 5 }, { label: "Wed", value: 3 },
    { label: "Thu", value: 7 }, { label: "Fri", value: 4 }, { label: "Sat", value: 1 }, { label: "Sun", value: 0 },
  ];

  return (
    <div style={{ padding: "0 1.5rem 2rem" }}>
      <h2 style={{ fontSize: 16, fontWeight: 500, margin: "0 0 1.25rem" }}>Analytics Overview</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: "1.5rem" }}>
        <StatCard label="Active Books" value={totalBooks} sub="in circulation" color="#185FA5" chart={weeklyChart} />
        <StatCard label="Borrowed Now" value={totalBorrowed} sub="active loans" color="#0F6E56" />
        <StatCard label="Overdue" value={totalOverdue} sub="need attention" color="#A32D2D" />
        <StatCard label="Total Returned" value={totalReturned} sub="all time" color="#3B6D11" />
        <StatCard label="Penalties" value={`₱${totalPenalties.toFixed(0)}`} sub="outstanding" color="#854F0B" />
        <StatCard label="Pending Requests" value={pendingReqs} sub="awaiting approval" color="#534AB7" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: "1.5rem" }}>
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem" }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Borrows by category</div>
          {catData.length === 0 ? <div style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>No data yet</div> : catData.map(([cat, count]) => (
            <div key={cat} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                <span style={{ color: "var(--color-text-secondary)" }}>{cat}</span>
                <span style={{ fontWeight: 500 }}>{count}</span>
              </div>
              <div style={{ height: 6, background: "var(--color-background-tertiary)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(count / maxCat) * 100}%`, background: CATEGORY_COLORS[cat] || "#534AB7", borderRadius: 3, transition: "width .4s" }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem" }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Top borrowed books</div>
          {topBooks.length === 0 ? <div style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>No data yet</div> : topBooks.map((b, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#E6F1FB", color: "#185FA5", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1, fontSize: 12, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</div>
              <Badge label={`${b.count}x`} type="info" />
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem" }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Weekly borrow activity</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
          {weeklyChart.map((d, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ width: "100%", background: "#185FA5", borderRadius: "3px 3px 0 0", height: `${Math.max(4, (d.value / 7) * 70)}px`, opacity: 0.7, transition: "height .3s" }} />
              <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>{d.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── LIBRARIAN BOOKS VIEW ─────────────────────────────────
function LibrarianBooks({ db }) {
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editBook, setEditBook] = useState(null);
  const [form, setForm] = useState({ title: "", author: "", category: "", price: "", copies: "" });

  const filtered = db.books.filter(b => {
    const q = search.toLowerCase();
    return (b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)) &&
      (filterCat === "all" || b.category === filterCat);
  });

  const categories = [...new Set(db.books.map(b => b.category))];

  const handleAdd = () => {
    if (!form.title || !form.author) return;
    db.addBook({ title: form.title, author: form.author, category: form.category || "Other", price: parseFloat(form.price) || 0, copies: parseInt(form.copies) || 1 });
    setForm({ title: "", author: "", category: "", price: "", copies: "" });
    setAddOpen(false);
  };

  const handleEdit = () => {
    db.updateBook(editBook.id, { title: form.title, author: form.author, category: form.category, price: parseFloat(form.price), copies: parseInt(form.copies) });
    setEditBook(null);
  };

  const openEdit = (book) => {
    setForm({ title: book.title, author: book.author, category: book.category, price: String(book.price), copies: String(book.copies) });
    setEditBook(book);
  };

  return (
    <div style={{ padding: "0 1.5rem 2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>Books</h2>
        <button onClick={() => { setForm({ title: "", author: "", category: "", price: "", copies: "" }); setAddOpen(true); }} style={{ background: "#185FA5", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", padding: "7px 14px", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>+ Add Book</button>
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title or author…" style={{ flex: 1, padding: "7px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 13 }} />
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ padding: "7px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 13 }}>
          <option value="all">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 0.7fr 0.7fr 1fr", padding: "6px 12px", fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          <span>Title</span><span>Author</span><span>Category</span><span>Copies</span><span>Price</span><span>Actions</span>
        </div>
        {filtered.map(book => (
          <div key={book.id} style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 0.7fr 0.7fr 1fr", padding: "10px 12px", background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", alignItems: "center", gap: 4 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{book.title}</div>
              {book.status === "archived" && <Badge label="archived" type="archived" />}
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{book.author}</div>
            <div><span style={{ fontSize: 11, background: "#E6F1FB", color: "#185FA5", padding: "2px 7px", borderRadius: 4, fontWeight: 600 }}>{book.category}</span></div>
            <div style={{ fontSize: 13 }}>{book.copies}</div>
            <div style={{ fontSize: 13 }}>₱{book.price}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => openEdit(book)} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", cursor: "pointer", color: "var(--color-text-primary)" }}>Edit</button>
              <button onClick={() => db.archiveBook(book.id)} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", cursor: "pointer", color: "var(--color-text-secondary)" }}>{book.status === "archived" ? "Restore" : "Archive"}</button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-secondary)", fontSize: 13 }}>No books found.</div>}
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add New Book">
        <Field label="Title" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} />
        <Field label="Author" value={form.author} onChange={v => setForm(f => ({ ...f, author: v }))} />
        <Field label="Category" value={form.category} onChange={v => setForm(f => ({ ...f, category: v }))} options={["Technology","History","Math","Literature","Science","Social","Other"].map(c => ({ value: c, label: c }))} />
        <Field label="Price (₱)" value={form.price} onChange={v => setForm(f => ({ ...f, price: v }))} type="number" />
        <Field label="Number of Copies" value={form.copies} onChange={v => setForm(f => ({ ...f, copies: v }))} type="number" />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={() => setAddOpen(false)} style={{ padding: "7px 14px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", cursor: "pointer", fontSize: 13 }}>Cancel</button>
          <button onClick={handleAdd} style={{ padding: "7px 14px", borderRadius: "var(--border-radius-md)", border: "none", background: "#185FA5", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>Add Book</button>
        </div>
      </Modal>

      <Modal open={!!editBook} onClose={() => setEditBook(null)} title="Edit Book">
        <Field label="Title" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} />
        <Field label="Author" value={form.author} onChange={v => setForm(f => ({ ...f, author: v }))} />
        <Field label="Category" value={form.category} onChange={v => setForm(f => ({ ...f, category: v }))} options={["Technology","History","Math","Literature","Science","Social","Other"].map(c => ({ value: c, label: c }))} />
        <Field label="Price (₱)" value={form.price} onChange={v => setForm(f => ({ ...f, price: v }))} type="number" />
        <Field label="Number of Copies" value={form.copies} onChange={v => setForm(f => ({ ...f, copies: v }))} type="number" />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={() => setEditBook(null)} style={{ padding: "7px 14px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", cursor: "pointer", fontSize: 13 }}>Cancel</button>
          <button onClick={handleEdit} style={{ padding: "7px 14px", borderRadius: "var(--border-radius-md)", border: "none", background: "#185FA5", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>Save Changes</button>
        </div>
      </Modal>
    </div>
  );
}

// ─── STAFF REQUESTS VIEW ──────────────────────────────────
function StaffRequests({ db }) {
  const pending = db.requests.filter(r => r.status === "pending");
  return (
    <div style={{ padding: "0 1.5rem 2rem" }}>
      <h2 style={{ fontSize: 16, fontWeight: 500, margin: "0 0 1rem" }}>Borrow Requests</h2>
      {pending.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-secondary)", fontSize: 13 }}>No pending requests.</div>
      ) : pending.map(req => {
        const student = db.getUser(req.studentId);
        const book = db.getBook(req.bookId);
        return (
          <div key={req.id} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{book?.title}</div>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>Requested by <strong>{student?.username}</strong> on {req.requestDate}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => db.approveRequest(req.id)} style={{ padding: "6px 14px", borderRadius: "var(--border-radius-md)", border: "none", background: "#0F6E56", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 500 }}>Approve</button>
              <button onClick={() => db.declineRequest(req.id)} style={{ padding: "6px 14px", borderRadius: "var(--border-radius-md)", border: "0.5px solid #A32D2D", background: "transparent", color: "#A32D2D", cursor: "pointer", fontSize: 12, fontWeight: 500 }}>Decline</button>
            </div>
          </div>
        );
      })}
      <h2 style={{ fontSize: 16, fontWeight: 500, margin: "1.5rem 0 1rem" }}>All Transactions</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr", padding: "6px 12px", fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 500, textTransform: "uppercase" }}>
          <span>Book</span><span>Borrower</span><span>Status</span><span>Borrowed</span><span>Due</span>
        </div>
        {db.borrows.slice().reverse().map(b => {
          const book = db.getBook(b.bookId);
          const user = db.getUser(b.userId);
          return (
            <div key={b.id} style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr", padding: "10px 12px", background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", alignItems: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{book?.title}</div>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{user?.username}</div>
              <div><Badge label={b.status} type={b.status} /></div>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{b.borrowedAt}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{b.dueDate}</span>
                {b.status === "borrowed" && <button onClick={() => db.returnBook(b.id)} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", cursor: "pointer", color: "var(--color-text-primary)" }}>Return</button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── STUDENT/TEACHER BROWSE ────────────────────────────────
function BrowseBooks({ db, currentUser }) {
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [toast, setToast] = useState(null);
  const MAX_BORROW = currentUser.role === "teacher" ? Infinity : 3;

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const myBorrows = db.borrows.filter(b => b.userId === currentUser.id && b.status === "borrowed");
  const myPending = db.requests.filter(r => r.studentId === currentUser.id && r.status === "pending");
  const myReservations = db.reservations.filter(r => r.userId === currentUser.id && r.status === "pending");

  const categories = [...new Set(db.books.filter(b => b.status !== "archived").map(b => b.category))];
  const filtered = db.books.filter(b => {
    const q = search.toLowerCase();
    return b.status !== "archived" &&
      (b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)) &&
      (filterCat === "all" || b.category === filterCat);
  });

  const handleBorrow = (book) => {
    const alreadyBorrowed = myBorrows.some(b => b.bookId === book.id);
    const alreadyRequested = myPending.some(r => r.bookId === book.id);
    if (alreadyBorrowed || alreadyRequested) { showToast("Already borrowed or requested.", "warning"); return; }
    if ((myBorrows.length + myPending.length) >= MAX_BORROW) { showToast(`Borrow limit reached (${MAX_BORROW}).`, "warning"); return; }
    db.submitBorrowRequest(currentUser.id, book.id);
    showToast("Borrow request submitted!");
  };

  const handleReserve = (book) => {
    if (myReservations.some(r => r.bookId === book.id)) { showToast("Already reserved.", "warning"); return; }
    db.addReservation(currentUser.id, book.id);
    showToast("Book reserved!");
  };

  return (
    <div style={{ padding: "0 1.5rem 2rem" }}>
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, padding: "10px 18px", borderRadius: "var(--border-radius-md)", background: toast.type === "success" ? "#0F6E56" : "#854F0B", color: "#fff", fontSize: 13, fontWeight: 500, zIndex: 1100, boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }}>{toast.msg}</div>
      )}
      <h2 style={{ fontSize: 16, fontWeight: 500, margin: "0 0 1rem" }}>Browse Books</h2>
      {currentUser.role === "student" && (
        <div style={{ background: "#E6F1FB", borderRadius: "var(--border-radius-md)", padding: "8px 12px", fontSize: 12, color: "#185FA5", marginBottom: 12 }}>
          Active borrows: {myBorrows.length} / {MAX_BORROW} · Pending requests: {myPending.length}
        </div>
      )}
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title or author…" style={{ flex: 1, padding: "7px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 13 }} />
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ padding: "7px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 13 }}>
          <option value="all">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {filtered.map(book => {
          const borrowed = myBorrows.some(b => b.bookId === book.id);
          const requested = myPending.some(r => r.bookId === book.id);
          const reserved = myReservations.some(r => r.bookId === book.id);
          return (
            <div key={book.id} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ width: "100%", height: 6, borderRadius: 3, background: CATEGORY_COLORS[book.category] || "#534AB7", opacity: 0.7 }} />
              <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>{book.title}</div>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>by {book.author}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, background: "#E6F1FB", color: "#185FA5", padding: "2px 7px", borderRadius: 4, fontWeight: 600 }}>{book.category}</span>
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{book.copies} copies</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#185FA5" }}>₱{book.price}</div>
              {borrowed ? <Badge label="You borrowed" type="success" /> :
                requested ? <Badge label="Request pending" type="pending" /> :
                  reserved ? <Badge label="Reserved" type="info" /> : (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => handleBorrow(book)} disabled={book.copies === 0} style={{ flex: 1, padding: "6px 0", borderRadius: "var(--border-radius-md)", border: "none", background: book.copies > 0 ? "#185FA5" : "#B4B2A9", color: "#fff", fontSize: 12, cursor: book.copies > 0 ? "pointer" : "default", fontWeight: 500 }}>Borrow</button>
                      <button onClick={() => handleReserve(book)} style={{ flex: 1, padding: "6px 0", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, cursor: "pointer", color: "var(--color-text-primary)" }}>Reserve</button>
                    </div>
                  )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MY BORROWS VIEW ──────────────────────────────────────
function MyBorrows({ db, currentUser }) {
  const myBorrows = db.borrows.filter(b => b.userId === currentUser.id);
  const myPending = db.requests.filter(r => r.studentId === currentUser.id);
  const myReservations = db.reservations.filter(r => r.userId === currentUser.id);
  const totalPenalty = myBorrows.reduce((s, b) => s + (b.penalty || 0), 0);
  const cleared = myBorrows.filter(b => b.status === "borrowed" || b.status === "overdue").length === 0 && totalPenalty === 0;

  return (
    <div style={{ padding: "0 1.5rem 2rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "1.5rem" }}>
        <div style={{ background: cleared ? "#EAF3DE" : "#FCEBEB", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem" }}>
          <div style={{ fontWeight: 500, fontSize: 14, color: cleared ? "#3B6D11" : "#A32D2D" }}>{cleared ? "✓ Clearance: Cleared" : "✗ Clearance: Not Cleared"}</div>
          {!cleared && totalPenalty > 0 && <div style={{ fontSize: 12, marginTop: 4, color: "#A32D2D" }}>Outstanding penalty: ₱{totalPenalty.toFixed(2)}</div>}
        </div>
        <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem" }}>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Active borrows</div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>{myBorrows.filter(b => b.status === "borrowed").length}{currentUser.role === "student" && " / 3"}</div>
        </div>
      </div>

      <h3 style={{ fontSize: 14, fontWeight: 500, margin: "0 0 10px" }}>Borrowed Books</h3>
      {myBorrows.filter(b => b.status === "borrowed" || b.status === "overdue").length === 0
        ? <div style={{ color: "var(--color-text-secondary)", fontSize: 13, marginBottom: 20 }}>No active borrows.</div>
        : myBorrows.filter(b => b.status === "borrowed" || b.status === "overdue").map(b => {
          const bk = db.getBook(b.bookId);
          const overdue = new Date(b.dueDate) < new Date();
          return (
            <div key={b.id} style={{ background: "var(--color-background-primary)", border: `0.5px solid ${overdue ? "#F09595" : "var(--color-border-tertiary)"}`, borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{bk?.title}</div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>Due: {b.dueDate} {overdue && <span style={{ color: "#A32D2D", fontWeight: 600 }}>— OVERDUE</span>}</div>
                {b.penalty > 0 && <div style={{ fontSize: 12, color: "#A32D2D", marginTop: 2 }}>Penalty: ₱{b.penalty}</div>}
              </div>
              <Badge label={b.status} type={b.status} />
            </div>
          );
        })}

      <h3 style={{ fontSize: 14, fontWeight: 500, margin: "1rem 0 10px" }}>Borrow Requests</h3>
      {myPending.length === 0 ? <div style={{ color: "var(--color-text-secondary)", fontSize: 13, marginBottom: 20 }}>No requests.</div>
        : myPending.map(r => {
          const bk = db.getBook(r.bookId);
          return (
            <div key={r.id} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "10px 14px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13 }}>{bk?.title}</span>
              <Badge label={r.status} type={r.status} />
            </div>
          );
        })}

      <h3 style={{ fontSize: 14, fontWeight: 500, margin: "1rem 0 10px" }}>Reservations</h3>
      {myReservations.length === 0 ? <div style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>No reservations.</div>
        : myReservations.map(r => {
          const bk = db.getBook(r.bookId);
          return (
            <div key={r.id} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "10px 14px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13 }}>{bk?.title}</span>
              <Badge label={r.status} type={r.status} />
            </div>
          );
        })}
    </div>
  );
}

// ─── USERS MANAGEMENT ─────────────────────────────────────
function UsersView({ db }) {
  return (
    <div style={{ padding: "0 1.5rem 2rem" }}>
      <h2 style={{ fontSize: 16, fontWeight: 500, margin: "0 0 1rem" }}>System Users</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {db.users.map(u => (
          <div key={u.id} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#E6F1FB", color: "#185FA5", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 13, flexShrink: 0 }}>{u.username[0].toUpperCase()}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{u.username}</div>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{u.email}</div>
            </div>
            <Badge label={u.role} type={u.role === "librarian" ? "info" : u.role === "staff" ? "pending" : "success"} />
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
              {db.borrows.filter(b => b.userId === u.id && b.status === "borrowed").length} active borrows
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────
function Login({ onLogin, onRegister }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (db) => {
    const user = USERS_SEED.find(u => u.username === username && u.password === password);
    if (user) { setError(""); onLogin(user); }
    else setError("Invalid username or password.");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-background-tertiary)" }}>
      <div style={{ width: 360, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "2rem" }}>
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📚</div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 4px", color: "var(--color-text-primary)" }}>Library System</h1>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Sign in to continue</div>
        </div>
        {error && <div style={{ background: "#FCEBEB", color: "#A32D2D", borderRadius: "var(--border-radius-md)", padding: "8px 12px", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <Field label="Username" value={username} onChange={setUsername} />
        <Field label="Password" value={password} onChange={setPassword} type="password" />
        <button onClick={handleLogin} style={{ width: "100%", padding: "9px", borderRadius: "var(--border-radius-md)", border: "none", background: "#185FA5", color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer", marginBottom: 10 }}>Sign In</button>
        <button onClick={onRegister} style={{ width: "100%", padding: "9px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 14, cursor: "pointer", color: "var(--color-text-primary)" }}>Create Account</button>
        <div style={{ marginTop: "1.25rem", padding: "10px 12px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", fontSize: 11, color: "var(--color-text-secondary)" }}>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>Test accounts:</div>
          <div>admin / admin123 (Librarian)</div>
          <div>staff1 / staff123 (Staff)</div>
          <div>student1 / student123 (Student)</div>
          <div>teacher1 / teacher123 (Teacher)</div>
        </div>
      </div>
    </div>
  );
}

// ─── REGISTER ─────────────────────────────────────────────
function Register({ db, onBack }) {
  const [form, setForm] = useState({ username: "", email: "", password: "", role: "student" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handle = () => {
    if (!form.username || !form.email || !form.password) { setError("All fields required."); return; }
    if (USERS_SEED.some(u => u.username === form.username)) { setError("Username already taken."); return; }
    USERS_SEED.push({ id: Date.now(), ...form });
    setSuccess(true);
  };

  if (success) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-background-tertiary)" }}>
      <div style={{ textAlign: "center", background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "2rem", width: 360 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
        <h2 style={{ margin: "0 0 8px", fontWeight: 500 }}>Account created!</h2>
        <p style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>You can now log in with your credentials.</p>
        <button onClick={onBack} style={{ padding: "8px 24px", borderRadius: "var(--border-radius-md)", border: "none", background: "#185FA5", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>Go to Login</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-background-tertiary)" }}>
      <div style={{ width: 360, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "2rem" }}>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 4px" }}>Create Account</h1>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Student & Teacher registration</div>
        </div>
        {error && <div style={{ background: "#FCEBEB", color: "#A32D2D", borderRadius: "var(--border-radius-md)", padding: "8px 12px", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <Field label="Username" value={form.username} onChange={v => setForm(f => ({ ...f, username: v }))} />
        <Field label="Email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} type="email" />
        <Field label="Password" value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} type="password" />
        <Field label="Role" value={form.role} onChange={v => setForm(f => ({ ...f, role: v }))} options={[{ value: "student", label: "Student" }, { value: "teacher", label: "Teacher" }]} />
        <button onClick={handle} style={{ width: "100%", padding: "9px", borderRadius: "var(--border-radius-md)", border: "none", background: "#185FA5", color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer", marginBottom: 10 }}>Register</button>
        <button onClick={onBack} style={{ width: "100%", padding: "9px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 14, cursor: "pointer", color: "var(--color-text-primary)" }}>Back to Login</button>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("login"); // login | register | app
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [chatOpen, setChatOpen] = useState(false);
  const db = useLibraryData();

  const handleLogin = (user) => { setCurrentUser(user); setScreen("app"); setActiveTab("dashboard"); };
  const handleLogout = () => { setCurrentUser(null); setScreen("login"); setChatOpen(false); };

  const NAV = {
    librarian: [
      { id: "dashboard", label: "Dashboard", icon: "⊞" },
      { id: "books", label: "Books", icon: "📚" },
      { id: "users", label: "Users", icon: "👥" },
      { id: "analytics", label: "Analytics", icon: "📊" },
    ],
    staff: [
      { id: "dashboard", label: "Dashboard", icon: "⊞" },
      { id: "requests", label: "Requests", icon: "📋" },
      { id: "analytics", label: "Analytics", icon: "📊" },
    ],
    student: [
      { id: "dashboard", label: "Dashboard", icon: "⊞" },
      { id: "browse", label: "Browse", icon: "🔍" },
      { id: "mybooks", label: "My Books", icon: "📖" },
    ],
    teacher: [
      { id: "dashboard", label: "Dashboard", icon: "⊞" },
      { id: "browse", label: "Browse", icon: "🔍" },
      { id: "mybooks", label: "My Books", icon: "📖" },
    ],
  };

  const renderDashboard = () => {
    if (!currentUser) return null;
    const role = currentUser.role;
    const totalBorrowed = db.borrows.filter(b => b.status === "borrowed").length;
    const overdue = db.borrows.filter(b => b.status === "overdue").length;
    const pendingReqs = db.requests.filter(r => r.status === "pending").length;
    const myBorrows = db.borrows.filter(b => b.userId === currentUser.id && b.status === "borrowed").length;

    return (
      <div style={{ padding: "0 1.5rem 2rem" }}>
        <div style={{ marginBottom: "1.25rem" }}>
          <h2 style={{ fontSize: 16, fontWeight: 500, margin: "0 0 4px" }}>Welcome back, {currentUser.username} 👋</h2>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", textTransform: "capitalize" }}>{currentUser.role} Dashboard</div>
        </div>
        {(role === "librarian" || role === "staff") && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: "1.5rem" }}>
            <StatCard label="Active Books" value={db.books.filter(b => b.status !== "archived").length} color="#185FA5" />
            <StatCard label="Borrowed" value={totalBorrowed} color="#0F6E56" />
            <StatCard label="Overdue" value={overdue} color="#A32D2D" />
            <StatCard label="Pending" value={pendingReqs} color="#854F0B" />
          </div>
        )}
        {(role === "student" || role === "teacher") && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: "1.5rem" }}>
            <StatCard label="My Borrows" value={`${myBorrows}${role === "student" ? " / 3" : ""}`} color="#185FA5" />
            <StatCard label="My Requests" value={db.requests.filter(r => r.studentId === currentUser.id && r.status === "pending").length} color="#854F0B" />
            <StatCard label="Reservations" value={db.reservations.filter(r => r.userId === currentUser.id && r.status === "pending").length} color="#534AB7" />
          </div>
        )}
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem" }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Recent activity</div>
          {db.borrows.slice(-5).reverse().map(b => {
            const bk = db.getBook(b.bookId);
            const user = db.getUser(b.userId);
            return (
              <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{bk?.title}</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{user?.username} · {b.borrowedAt}</div>
                </div>
                <Badge label={b.status} type={b.status} />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (screen === "login") return <Login onLogin={handleLogin} onRegister={() => setScreen("register")} />;
  if (screen === "register") return <Register db={db} onBack={() => setScreen("login")} />;

  const role = currentUser?.role;
  const navItems = NAV[role] || [];

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--color-background-tertiary)" }}>
      {/* Sidebar */}
      <div style={{ width: 220, background: "var(--color-background-primary)", borderRight: "0.5px solid var(--color-border-tertiary)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "1.25rem 1rem 1rem", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#185FA5" }}>📚 LibrarySys</div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2, textTransform: "capitalize" }}>{role} Portal</div>
        </div>
        <nav style={{ flex: 1, padding: "0.75rem 0.75rem" }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: "var(--border-radius-md)", border: "none", background: activeTab === item.id ? "#E6F1FB" : "transparent", color: activeTab === item.id ? "#185FA5" : "var(--color-text-secondary)", cursor: "pointer", fontSize: 13, fontWeight: activeTab === item.id ? 500 : 400, marginBottom: 2, textAlign: "left" }}>
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              {item.label}
              {item.id === "requests" && db.requests.filter(r => r.status === "pending").length > 0 && (
                <span style={{ marginLeft: "auto", background: "#A32D2D", color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 10, fontWeight: 600 }}>{db.requests.filter(r => r.status === "pending").length}</span>
              )}
            </button>
          ))}
        </nav>
        <div style={{ padding: "0.75rem", borderTop: "0.5px solid var(--color-border-tertiary)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", marginBottom: 4 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#E6F1FB", color: "#185FA5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{currentUser.username[0].toUpperCase()}</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{currentUser.username}</div>
              <div style={{ fontSize: 10, color: "var(--color-text-secondary)", textTransform: "capitalize" }}>{currentUser.role}</div>
            </div>
          </div>
          <button onClick={handleLogout} style={{ width: "100%", padding: "7px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "transparent", cursor: "pointer", fontSize: 12, color: "var(--color-text-secondary)", textAlign: "left" }}>Sign out</button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ padding: "1.5rem 1.5rem 0", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 1rem", color: "var(--color-text-primary)" }}>
            {navItems.find(n => n.id === activeTab)?.label || "Dashboard"}
          </h1>
          <button onClick={() => setChatOpen(c => !c)} style={{ marginBottom: "1rem", padding: "7px 14px", borderRadius: "var(--border-radius-md)", border: "none", background: "#185FA5", color: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
            💬 AI Assistant
          </button>
        </div>

        {activeTab === "dashboard" && renderDashboard()}
        {activeTab === "books" && <LibrarianBooks db={db} />}
        {activeTab === "users" && <UsersView db={db} />}
        {activeTab === "analytics" && <AnalyticsView db={db} />}
        {activeTab === "requests" && <StaffRequests db={db} />}
        {activeTab === "browse" && <BrowseBooks db={db} currentUser={currentUser} />}
        {activeTab === "mybooks" && <MyBorrows db={db} currentUser={currentUser} />}
      </div>

      {chatOpen && <AIChatbot db={db} currentUser={currentUser} onClose={() => setChatOpen(false)} />}
    </div>
  );
}
