"""
Library Management System - Python CLI Version
Converted from PHP MVC source code
Uses SQLite (no external database needed)
"""

import sqlite3
import os
import sys
import getpass
from datetime import datetime, timedelta, date
from typing import Optional


# ─────────────────────────────────────────────
#  DATABASE SETUP
# ─────────────────────────────────────────────
DB_FILE = "library.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS roles (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT UNIQUE NOT NULL,
    email      TEXT NOT NULL,
    password   TEXT NOT NULL,
    role_id    INTEGER NOT NULL REFERENCES roles(id),
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS books (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    title        TEXT NOT NULL,
    author       TEXT NOT NULL,
    category     TEXT,
    price        REAL DEFAULT 0,
    total_copies INTEGER DEFAULT 1,
    status       TEXT DEFAULT NULL,   -- NULL=active, 'archived'
    created_at   TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS borrows (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    book_id     INTEGER NOT NULL REFERENCES books(id),
    status      TEXT DEFAULT 'borrowed',   -- borrowed | returned | overdue
    borrowed_at TEXT DEFAULT (datetime('now')),
    due_date    TEXT,
    returned_at TEXT,
    penalty_amount REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS borrow_requests (
    request_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id   INTEGER NOT NULL REFERENCES users(id),
    book_id      INTEGER NOT NULL REFERENCES books(id),
    status       TEXT DEFAULT 'pending',   -- pending | approved | declined
    request_date TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reservations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    book_id     INTEGER NOT NULL REFERENCES books(id),
    status      TEXT DEFAULT 'pending',
    reserved_at TEXT DEFAULT (datetime('now'))
);
"""

SEED = """
INSERT OR IGNORE INTO roles (name) VALUES ('librarian'), ('staff'), ('student'), ('teacher');

INSERT OR IGNORE INTO users (username, email, password, role_id)
VALUES
  ('admin',    'admin@library.com',    'admin123',    (SELECT id FROM roles WHERE name='librarian')),
  ('staff1',   'staff@library.com',    'staff123',    (SELECT id FROM roles WHERE name='staff')),
  ('student1', 'student@library.com',  'student123',  (SELECT id FROM roles WHERE name='student')),
  ('teacher1', 'teacher@library.com',  'teacher123',  (SELECT id FROM roles WHERE name='teacher'));

INSERT OR IGNORE INTO books (title, author, category, price, total_copies)
VALUES
  ('Introduction to Python',   'John Smith',    'Technology', 450.00, 5),
  ('Data Structures 101',      'Maria Santos',  'Technology', 380.00, 3),
  ('Philippine History',       'Jose Reyes',    'History',    300.00, 4),
  ('Calculus Made Easy',       'Ana Cruz',      'Math',       500.00, 2),
  ('World Literature',         'Elena Bautista','Literature', 350.00, 6),
  ('Biology Fundamentals',     'Marco Dela Cruz','Science',   420.00, 3),
  ('Introduction to Economics','Lita Gomez',    'Social',     390.00, 2);
"""


def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_db()
    conn.executescript(SCHEMA)
    conn.executescript(SEED)
    conn.commit()
    conn.close()


# ─────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────
def clear():
    os.system("cls" if os.name == "nt" else "clear")


def header(title: str):
    width = 60
    print("=" * width)
    print(f"  {title}".center(width))
    print("=" * width)


def pause():
    input("\nPress Enter to continue...")


def fmt_date(dt_str: Optional[str]) -> str:
    if not dt_str:
        return "—"
    try:
        dt = datetime.fromisoformat(dt_str)
        return dt.strftime("%b %d, %Y")
    except Exception:
        return dt_str


def is_overdue(due_date_str: Optional[str]) -> bool:
    if not due_date_str:
        return False
    try:
        due = datetime.fromisoformat(due_date_str).date()
        return date.today() > due
    except Exception:
        return False


def table(rows, columns: list[tuple[str, str]], max_col_width: int = 28):
    """
    columns = list of (header_label, row_key)
    """
    col_widths = [max(len(h), max((len(str(r[k] or "")[:max_col_width])
                  for r in rows), default=len(h)))
                  for h, k in columns]
    sep = "+-" + "-+-".join("-" * w for w in col_widths) + "-+"
    hdr = "| " + " | ".join(h.ljust(col_widths[i]) for i, (h, _) in enumerate(columns)) + " |"
    print(sep)
    print(hdr)
    print(sep)
    for r in rows:
        row_line = "| " + " | ".join(
            str(r[k] or "")[:max_col_width].ljust(col_widths[i])
            for i, (_, k) in enumerate(columns)
        ) + " |"
        print(row_line)
    print(sep)
    print(f"  {len(rows)} record(s)")


# ─────────────────────────────────────────────
#  AUTH
# ─────────────────────────────────────────────
def login() -> Optional[dict]:
    clear()
    header("LIBRARY MANAGEMENT SYSTEM")
    print("\n  Welcome! Please log in.\n")
    username = input("  Username: ").strip()
    password = getpass.getpass("  Password: ").strip()

    conn = get_db()
    row = conn.execute("""
        SELECT u.*, r.name AS role
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.username = ?
    """, (username,)).fetchone()
    conn.close()

    if row and row["password"] == password:
        return dict(row)

    print("\n  ❌  Invalid username or password.")
    pause()
    return None


def register():
    clear()
    header("REGISTER NEW ACCOUNT")
    username = input("  Username: ").strip()
    email    = input("  Email: ").strip()
    password = getpass.getpass("  Password: ").strip()
    print("  Roles: student | teacher")
    role     = input("  Role: ").strip().lower()

    if role not in ("student", "teacher"):
        print("  ❌  Invalid role. Only 'student' or 'teacher' allowed.")
        pause()
        return

    conn = get_db()
    existing = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
    if existing:
        print("  ❌  Username already taken.")
        conn.close()
        pause()
        return

    role_row = conn.execute("SELECT id FROM roles WHERE name = ?", (role,)).fetchone()
    if not role_row:
        print("  ❌  Role not found.")
        conn.close()
        pause()
        return

    conn.execute(
        "INSERT INTO users (username, email, password, role_id) VALUES (?, ?, ?, ?)",
        (username, email, password, role_row["id"])
    )
    conn.commit()
    conn.close()
    print("\n  ✅  Registered successfully! You can now log in.")
    pause()


# ─────────────────────────────────────────────
#  LIBRARIAN DASHBOARD
# ─────────────────────────────────────────────
def librarian_menu(user: dict):
    while True:
        clear()
        conn = get_db()
        total_books   = conn.execute("SELECT COUNT(*) FROM books").fetchone()[0]
        total_borrowed= conn.execute("SELECT COUNT(*) FROM borrows WHERE status='borrowed'").fetchone()[0]
        total_reserved= conn.execute("SELECT COUNT(*) FROM reservations WHERE status='pending'").fetchone()[0]
        total_archived= conn.execute("SELECT COUNT(*) FROM books WHERE status='archived'").fetchone()[0]
        conn.close()

        header(f"LIBRARIAN DASHBOARD — {user['username']}")
        print(f"\n  📚 Total Books    : {total_books}")
        print(f"  📖 Currently Borrowed: {total_borrowed}")
        print(f"  📌 Reservations   : {total_reserved}")
        print(f"  🗄  Archived Books : {total_archived}")
        print()
        print("  [1] View Books")
        print("  [2] Add Book")
        print("  [3] Edit Book")
        print("  [4] Archive / Unarchive Book")
        print("  [5] Inventory")
        print("  [6] Profile")
        print("  [0] Logout")
        choice = input("\n  Choose: ").strip()

        if choice == "1":   lib_view_books()
        elif choice == "2": lib_add_book()
        elif choice == "3": lib_edit_book()
        elif choice == "4": lib_archive_menu()
        elif choice == "5": lib_inventory()
        elif choice == "6": show_profile(user)
        elif choice == "0": break


def lib_view_books():
    clear()
    header("ACTIVE BOOKS")
    conn = get_db()
    rows = conn.execute("""
        SELECT id, title, author, category, price, total_copies
        FROM books WHERE status IS NULL OR status != 'archived'
        ORDER BY title
    """).fetchall()
    conn.close()
    if not rows:
        print("  No books found.")
    else:
        table(rows, [("ID","id"),("Title","title"),("Author","author"),
                     ("Category","category"),("Copies","total_copies")])
    pause()


def lib_add_book():
    clear()
    header("ADD NEW BOOK")
    title    = input("  Title    : ").strip()
    author   = input("  Author   : ").strip()
    category = input("  Category : ").strip()
    try:
        price  = float(input("  Price    : ").strip())
        copies = int(input("  Copies   : ").strip())
    except ValueError:
        print("  ❌  Invalid number input.")
        pause()
        return

    conn = get_db()
    conn.execute(
        "INSERT INTO books (title, author, category, price, total_copies) VALUES (?, ?, ?, ?, ?)",
        (title, author, category, price, copies)
    )
    conn.commit()
    conn.close()
    print("\n  ✅  Book added successfully!")
    pause()


def lib_edit_book():
    clear()
    header("EDIT BOOK")
    lib_view_books()
    try:
        book_id = int(input("  Enter Book ID to edit: ").strip())
    except ValueError:
        print("  ❌  Invalid ID.")
        pause()
        return

    conn = get_db()
    book = conn.execute("SELECT * FROM books WHERE id = ?", (book_id,)).fetchone()
    if not book:
        print("  ❌  Book not found.")
        conn.close()
        pause()
        return

    print(f"\n  Editing: {book['title']} (leave blank to keep current)")
    title    = input(f"  Title    [{book['title']}]: ").strip() or book['title']
    author   = input(f"  Author   [{book['author']}]: ").strip() or book['author']
    category = input(f"  Category [{book['category']}]: ").strip() or book['category']
    price_in = input(f"  Price    [{book['price']}]: ").strip()
    copies_in= input(f"  Copies   [{book['total_copies']}]: ").strip()
    price    = float(price_in) if price_in else book['price']
    copies   = int(copies_in) if copies_in else book['total_copies']

    conn.execute("""
        UPDATE books SET title=?, author=?, category=?, price=?, total_copies=?
        WHERE id=?
    """, (title, author, category, price, copies, book_id))
    conn.commit()
    conn.close()
    print("\n  ✅  Book updated successfully!")
    pause()


def lib_archive_menu():
    clear()
    header("ARCHIVE / UNARCHIVE BOOK")
    conn = get_db()
    rows = conn.execute("SELECT id, title, author, status FROM books ORDER BY title").fetchall()
    conn.close()
    table(rows, [("ID","id"),("Title","title"),("Author","author"),("Status","status")])

    try:
        book_id = int(input("\n  Enter Book ID: ").strip())
    except ValueError:
        pause(); return

    conn = get_db()
    book = conn.execute("SELECT * FROM books WHERE id=?", (book_id,)).fetchone()
    if not book:
        print("  ❌  Book not found."); conn.close(); pause(); return

    if book["status"] == "archived":
        conn.execute("UPDATE books SET status=NULL WHERE id=?", (book_id,))
        print("  ✅  Book unarchived.")
    else:
        conn.execute("UPDATE books SET status='archived' WHERE id=?", (book_id,))
        print("  ✅  Book archived.")
    conn.commit()
    conn.close()
    pause()


def lib_inventory():
    clear()
    header("INVENTORY")
    conn = get_db()

    print("\n  --- ACTIVE BOOKS ---")
    active = conn.execute("""
        SELECT id, title, author, total_copies FROM books
        WHERE status IS NULL OR status != 'archived' ORDER BY title
    """).fetchall()
    table(active, [("ID","id"),("Title","title"),("Author","author"),("Copies","total_copies")])

    print("\n  --- CURRENTLY BORROWED ---")
    borrowed = conn.execute("""
        SELECT b.id, bk.title, u.username, b.due_date, b.status
        FROM borrows b
        JOIN books bk ON bk.id = b.book_id
        JOIN users u ON u.id = b.user_id
        WHERE b.status = 'borrowed' ORDER BY b.due_date
    """).fetchall()
    table(borrowed, [("ID","id"),("Book","title"),("Borrower","username"),
                     ("Due Date","due_date"),("Status","status")])

    print("\n  --- RESERVATIONS ---")
    reserved = conn.execute("""
        SELECT r.id, bk.title, u.username, r.reserved_at
        FROM reservations r
        JOIN books bk ON bk.id = r.book_id
        JOIN users u ON u.id = r.user_id
        WHERE r.status = 'pending' ORDER BY r.reserved_at
    """).fetchall()
    table(reserved, [("ID","id"),("Book","title"),("Reserved By","username"),("Date","reserved_at")])

    print("\n  --- ARCHIVED BOOKS ---")
    archived = conn.execute("SELECT id, title, author FROM books WHERE status='archived'").fetchall()
    table(archived, [("ID","id"),("Title","title"),("Author","author")])

    conn.close()
    pause()


# ─────────────────────────────────────────────
#  STAFF DASHBOARD
# ─────────────────────────────────────────────
def staff_menu(user: dict):
    while True:
        clear()
        conn = get_db()
        borrowed  = conn.execute("SELECT COUNT(*) FROM borrows WHERE status='borrowed'").fetchone()[0]
        pending   = conn.execute("SELECT COUNT(*) FROM borrow_requests WHERE status='pending'").fetchone()[0]
        overdue   = conn.execute("""SELECT COUNT(*) FROM borrows
                                    WHERE status='borrowed' AND due_date < datetime('now')""").fetchone()[0]
        conn.close()

        header(f"STAFF DASHBOARD — {user['username']}")
        print(f"\n  📖 Currently Borrowed : {borrowed}")
        print(f"  📋 Pending Requests   : {pending}")
        print(f"  ⚠️  Overdue           : {overdue}")
        print()
        print("  [1] Borrow Requests")
        print("  [2] All Transactions")
        print("  [3] Profile")
        print("  [0] Logout")
        choice = input("\n  Choose: ").strip()

        if choice == "1":   staff_borrow_requests(user)
        elif choice == "2": staff_transactions()
        elif choice == "3": show_profile(user)
        elif choice == "0": break


def staff_borrow_requests(user: dict):
    while True:
        clear()
        header("PENDING BORROW REQUESTS")
        conn = get_db()
        requests = conn.execute("""
            SELECT br.request_id, bk.title, u.username, br.request_date, br.status
            FROM borrow_requests br
            JOIN books bk ON bk.id = br.book_id
            JOIN users u ON u.id = br.student_id
            WHERE br.status = 'pending'
            ORDER BY br.request_date DESC
        """).fetchall()

        if not requests:
            print("\n  No pending requests.")
            conn.close()
            pause()
            return

        table(requests, [("Req ID","request_id"),("Book","title"),
                          ("User","username"),("Date","request_date")])

        print("\n  [A] Approve  [R] Reject  [0] Back")
        action = input("  Choose: ").strip().upper()
        if action == "0":
            conn.close(); break
        elif action in ("A", "R"):
            try:
                req_id = int(input("  Enter Request ID: ").strip())
            except ValueError:
                conn.close(); continue

            req = conn.execute("""
                SELECT * FROM borrow_requests WHERE request_id=? AND status='pending'
            """, (req_id,)).fetchone()

            if not req:
                print("  ❌  Request not found or already processed.")
                conn.close(); pause(); continue

            if action == "A":
                # Insert borrow record
                due = (datetime.now() + timedelta(days=7)).isoformat()
                conn.execute("""
                    INSERT INTO borrows (user_id, book_id, borrowed_at, due_date, status)
                    VALUES (?, ?, datetime('now'), ?, 'borrowed')
                """, (req["student_id"], req["book_id"], due))
                # Decrement copy
                conn.execute("""
                    UPDATE books SET total_copies = MAX(total_copies-1, 0) WHERE id=?
                """, (req["book_id"],))
                conn.execute("UPDATE borrow_requests SET status='approved' WHERE request_id=?", (req_id,))
                print("  ✅  Request approved!")
            else:
                conn.execute("UPDATE borrow_requests SET status='declined' WHERE request_id=?", (req_id,))
                print("  ✅  Request declined.")

            conn.commit()
            conn.close()
            pause()
        else:
            conn.close()


def staff_transactions():
    clear()
    header("ALL BORROW TRANSACTIONS")
    conn = get_db()
    rows = conn.execute("""
        SELECT b.id, bk.title, u.username, b.status, b.borrowed_at, b.due_date, b.returned_at
        FROM borrows b
        JOIN books bk ON bk.id = b.book_id
        JOIN users u ON u.id = b.user_id
        ORDER BY b.borrowed_at DESC
    """).fetchall()
    conn.close()
    table(rows, [("ID","id"),("Book","title"),("Borrower","username"),
                 ("Status","status"),("Borrowed","borrowed_at"),("Due","due_date")])
    pause()


# ─────────────────────────────────────────────
#  STUDENT DASHBOARD
# ─────────────────────────────────────────────
MAX_BORROW = 3


def student_menu(user: dict):
    while True:
        clear()
        conn = get_db()
        borrowed_count = conn.execute("""
            SELECT COUNT(*) FROM borrows WHERE user_id=? AND status='borrowed'
        """, (user["id"],)).fetchone()[0]
        reserved_count = conn.execute("""
            SELECT COUNT(*) FROM reservations WHERE user_id=? AND status='pending'
        """, (user["id"],)).fetchone()[0]
        conn.close()

        header(f"STUDENT DASHBOARD — {user['username']}")
        print(f"\n  📖 Active Borrows     : {borrowed_count} / {MAX_BORROW}")
        print(f"  📌 Pending Reservations: {reserved_count}")
        print()
        print("  [1] Browse Books")
        print("  [2] My Borrows")
        print("  [3] My Reservations")
        print("  [4] Clearance Status")
        print("  [5] Profile")
        print("  [0] Logout")
        choice = input("\n  Choose: ").strip()

        if choice == "1":   student_browse_books(user)
        elif choice == "2": student_borrows(user)
        elif choice == "3": student_reservations(user)
        elif choice == "4": student_clearance(user)
        elif choice == "5": show_profile(user)
        elif choice == "0": break


def student_browse_books(user: dict):
    clear()
    header("BROWSE BOOKS")
    search = input("  Search (title/author, blank=all): ").strip()
    conn = get_db()
    like = f"%{search}%"
    rows = conn.execute("""
        SELECT b.id, b.title, b.author, b.category, b.total_copies,
               br.id AS borrow_id,
               r.id AS reservation_id
        FROM books b
        LEFT JOIN borrows br ON br.book_id = b.id AND br.user_id = ? AND br.status='borrowed'
        LEFT JOIN reservations r ON r.book_id = b.id AND r.user_id = ? AND r.status='pending'
        WHERE (b.status IS NULL OR b.status != 'archived')
          AND (b.title LIKE ? OR b.author LIKE ?)
        ORDER BY b.title
    """, (user["id"], user["id"], like, like)).fetchall()
    conn.close()

    if not rows:
        print("  No books found."); pause(); return

    # Annotate availability
    display = []
    for r in rows:
        avail = "Available" if r["total_copies"] > 0 else "No copies"
        if r["borrow_id"]:   avail = "You borrowed"
        if r["reservation_id"]: avail = "You reserved"
        display.append({**dict(r), "avail": avail})

    table(display, [("ID","id"),("Title","title"),("Author","author"),
                    ("Copies","total_copies"),("Status","avail")])

    print("\n  [B] Request Borrow  [R] Reserve  [0] Back")
    action = input("  Choose: ").strip().upper()
    if action == "0": return

    try:
        book_id = int(input("  Enter Book ID: ").strip())
    except ValueError:
        pause(); return

    conn = get_db()
    book = conn.execute("SELECT * FROM books WHERE id=? AND (status IS NULL OR status!='archived')",
                        (book_id,)).fetchone()
    if not book:
        print("  ❌  Book not found."); conn.close(); pause(); return

    if action == "B":
        # Check limits
        active = conn.execute("""
            SELECT COUNT(*) FROM borrows WHERE user_id=? AND status='borrowed'
        """, (user["id"],)).fetchone()[0]
        pending_req = conn.execute("""
            SELECT COUNT(*) FROM borrow_requests WHERE student_id=? AND status='pending'
        """, (user["id"],)).fetchone()[0]

        if (active + pending_req) >= MAX_BORROW:
            print(f"  ❌  You've reached the borrow limit ({MAX_BORROW}).")
            conn.close(); pause(); return

        # Check if already requested
        existing = conn.execute("""
            SELECT request_id FROM borrow_requests
            WHERE student_id=? AND book_id=? AND status='pending'
        """, (user["id"], book_id)).fetchone()
        if existing:
            print("  ⚠️   You already have a pending request for this book.")
            conn.close(); pause(); return

        conn.execute("""
            INSERT INTO borrow_requests (student_id, book_id) VALUES (?, ?)
        """, (user["id"], book_id))
        conn.commit()
        print("  ✅  Borrow request submitted! Wait for staff approval.")

    elif action == "R":
        existing = conn.execute("""
            SELECT id FROM reservations WHERE user_id=? AND book_id=? AND status='pending'
        """, (user["id"], book_id)).fetchone()
        if existing:
            print("  ⚠️   You already reserved this book.")
            conn.close(); pause(); return

        conn.execute("INSERT INTO reservations (user_id, book_id) VALUES (?, ?)",
                     (user["id"], book_id))
        conn.commit()
        print("  ✅  Book reserved!")

    conn.close()
    pause()


def student_borrows(user: dict):
    clear()
    header("MY ACTIVE BORROWS")
    conn = get_db()
    rows = conn.execute("""
        SELECT b.id AS borrow_id, bk.title, bk.author, b.borrowed_at, b.due_date, b.status
        FROM borrows b
        JOIN books bk ON bk.id = b.book_id
        WHERE b.user_id = ? AND b.status = 'borrowed'
        ORDER BY b.borrowed_at DESC
    """, (user["id"],)).fetchall()

    if not rows:
        print("  No active borrows."); conn.close(); pause(); return

    # Mark overdue
    display = []
    for r in rows:
        overdue_flag = " ⚠️ OVERDUE" if is_overdue(r["due_date"]) else ""
        display.append({**dict(r), "due_info": fmt_date(r["due_date"]) + overdue_flag})

    table(display, [("ID","borrow_id"),("Title","title"),("Author","author"),
                    ("Borrowed","borrowed_at"),("Due","due_info")])

    print("\n  [Press Enter to go back]")
    conn.close()
    pause()


def student_reservations(user: dict):
    clear()
    header("MY RESERVATIONS")
    conn = get_db()
    rows = conn.execute("""
        SELECT r.id, bk.title, bk.author, r.reserved_at, r.status
        FROM reservations r
        JOIN books bk ON bk.id = r.book_id
        WHERE r.user_id = ? AND r.status = 'pending'
        ORDER BY r.reserved_at DESC
    """, (user["id"],)).fetchall()
    conn.close()
    if not rows:
        print("  No reservations.")
    else:
        table(rows, [("ID","id"),("Title","title"),("Author","author"),
                     ("Reserved On","reserved_at"),("Status","status")])
    pause()


def student_clearance(user: dict):
    clear()
    header("CLEARANCE STATUS")
    conn = get_db()
    borrowed = conn.execute("""
        SELECT bk.title, b.due_date, b.penalty_amount
        FROM borrows b JOIN books bk ON bk.id=b.book_id
        WHERE b.user_id=? AND b.status IN ('borrowed','overdue')
    """, (user["id"],)).fetchall()

    total_penalty = sum(r["penalty_amount"] for r in borrowed)
    cleared = len(borrowed) == 0 and total_penalty == 0

    if cleared:
        print("\n  ✅  CLEARED — No pending books or penalties.")
    else:
        print("\n  ❌  NOT CLEARED\n")
        if borrowed:
            table(borrowed, [("Title","title"),("Due","due_date"),("Penalty","penalty_amount")])
        print(f"\n  Total Penalty: ₱{total_penalty:.2f}")

    conn.close()
    pause()


# ─────────────────────────────────────────────
#  TEACHER DASHBOARD
# ─────────────────────────────────────────────
def teacher_menu(user: dict):
    while True:
        clear()
        conn = get_db()
        borrowed_count = conn.execute("""
            SELECT COUNT(*) FROM borrows WHERE user_id=? AND status='borrowed'
        """, (user["id"],)).fetchone()[0]
        conn.close()

        header(f"TEACHER DASHBOARD — {user['username']}")
        print(f"\n  📖 Active Borrows : {borrowed_count}  (No limit for teachers)")
        print()
        print("  [1] Browse Books")
        print("  [2] My Borrowed Books")
        print("  [3] My Reservations")
        print("  [4] Clearance Status")
        print("  [5] Profile")
        print("  [0] Logout")
        choice = input("\n  Choose: ").strip()

        if choice == "1":   teacher_browse_books(user)
        elif choice == "2": teacher_borrows(user)
        elif choice == "3": student_reservations(user)   # reuse student view
        elif choice == "4": teacher_clearance(user)
        elif choice == "5": show_profile(user)
        elif choice == "0": break


def teacher_browse_books(user: dict):
    clear()
    header("BROWSE BOOKS (TEACHER)")
    search = input("  Search (title/author, blank=all): ").strip()
    conn = get_db()
    like = f"%{search}%"
    rows = conn.execute("""
        SELECT b.id, b.title, b.author, b.category, b.total_copies,
               br.id AS borrow_id,
               r.id  AS reservation_id
        FROM books b
        LEFT JOIN borrows br ON br.book_id=b.id AND br.user_id=? AND br.status='borrowed'
        LEFT JOIN reservations r ON r.book_id=b.id AND r.user_id=? AND r.status='pending'
        WHERE (b.status IS NULL OR b.status!='archived')
          AND (b.title LIKE ? OR b.author LIKE ?)
        ORDER BY b.title
    """, (user["id"], user["id"], like, like)).fetchall()
    conn.close()

    if not rows:
        print("  No books found."); pause(); return

    display = []
    for r in rows:
        avail = "Available" if r["total_copies"] > 0 else "No copies"
        if r["borrow_id"]:      avail = "You borrowed"
        if r["reservation_id"]: avail = "You reserved"
        display.append({**dict(r), "avail": avail})

    table(display, [("ID","id"),("Title","title"),("Author","author"),
                    ("Copies","total_copies"),("Status","avail")])

    print("\n  [B] Request Borrow  [R] Reserve  [0] Back")
    action = input("  Choose: ").strip().upper()
    if action == "0": return

    try:
        book_id = int(input("  Enter Book ID: ").strip())
    except ValueError:
        pause(); return

    conn = get_db()
    book = conn.execute("SELECT * FROM books WHERE id=? AND (status IS NULL OR status!='archived')",
                        (book_id,)).fetchone()
    if not book:
        print("  ❌  Book not found."); conn.close(); pause(); return

    if action == "B":
        existing = conn.execute("""
            SELECT request_id FROM borrow_requests
            WHERE student_id=? AND book_id=? AND status='pending'
        """, (user["id"], book_id)).fetchone()
        if existing:
            print("  ⚠️   You already have a pending request for this book.")
            conn.close(); pause(); return

        conn.execute("INSERT INTO borrow_requests (student_id, book_id) VALUES (?, ?)",
                     (user["id"], book_id))
        conn.commit()
        print("  ✅  Borrow request submitted! Wait for staff approval.")

    elif action == "R":
        existing = conn.execute("""
            SELECT id FROM reservations WHERE user_id=? AND book_id=? AND status='pending'
        """, (user["id"], book_id)).fetchone()
        if existing:
            print("  ⚠️   You already reserved this book.")
            conn.close(); pause(); return

        conn.execute("INSERT INTO reservations (user_id, book_id) VALUES (?, ?)",
                     (user["id"], book_id))
        conn.commit()
        print("  ✅  Book reserved!")

    conn.close()
    pause()


def teacher_borrows(user: dict):
    clear()
    header("MY BORROWED BOOKS")
    conn = get_db()
    rows = conn.execute("""
        SELECT b.id AS borrow_id, bk.title, bk.author, b.borrowed_at, b.due_date
        FROM borrows b
        JOIN books bk ON bk.id = b.book_id
        WHERE b.user_id = ? AND b.status = 'borrowed'
        ORDER BY b.borrowed_at DESC
    """, (user["id"],)).fetchall()
    conn.close()

    if not rows:
        print("  No active borrows.")
    else:
        table(rows, [("ID","borrow_id"),("Title","title"),("Author","author"),
                     ("Borrowed","borrowed_at"),("Due","due_date")])
    pause()


def teacher_clearance(user: dict):
    clear()
    header("CLEARANCE STATUS (TEACHER)")
    conn = get_db()
    borrowed = conn.execute("""
        SELECT bk.title, b.due_date
        FROM borrows b JOIN books bk ON bk.id=b.book_id
        WHERE b.user_id=? AND b.status='borrowed'
    """, (user["id"],)).fetchall()
    conn.close()

    if not borrowed:
        print("\n  ✅  CLEARED — No unreturned books.")
    else:
        print("\n  ❌  NOT CLEARED — You have unreturned books:\n")
        table(borrowed, [("Title","title"),("Due","due_date")])
    pause()


# ─────────────────────────────────────────────
#  SHARED: PROFILE
# ─────────────────────────────────────────────
def show_profile(user: dict):
    clear()
    header("MY PROFILE")
    joined = fmt_date(user.get("created_at"))
    print(f"\n  Username : {user['username']}")
    print(f"  Email    : {user['email']}")
    print(f"  Role     : {user['role'].title()}")
    print(f"  Joined   : {joined}")
    pause()


# ─────────────────────────────────────────────
#  MAIN ENTRY
# ─────────────────────────────────────────────
def main():
    init_db()

    print("\n" + "=" * 60)
    print("  LIBRARY MANAGEMENT SYSTEM".center(60))
    print("  Python CLI Edition".center(60))
    print("=" * 60)
    print()
    print("  Default test accounts:")
    print("  • admin    / admin123    (Librarian)")
    print("  • staff1   / staff123    (Staff)")
    print("  • student1 / student123  (Student)")
    print("  • teacher1 / teacher123  (Teacher)")
    print()
    input("  Press Enter to start...")

    while True:
        clear()
        header("LIBRARY MANAGEMENT SYSTEM")
        print("\n  [1] Login")
        print("  [2] Register")
        print("  [0] Exit")
        choice = input("\n  Choose: ").strip()

        if choice == "1":
            user = login()
            if user:
                role = user["role"]
                if role == "librarian":
                    librarian_menu(user)
                elif role == "staff":
                    staff_menu(user)
                elif role == "student":
                    student_menu(user)
                elif role == "teacher":
                    teacher_menu(user)
                else:
                    print("  ❌  Unknown role.")
                    pause()

        elif choice == "2":
            register()

        elif choice == "0":
            print("\n  Goodbye! 📚\n")
            sys.exit(0)


if __name__ == "__main__":
    main()
