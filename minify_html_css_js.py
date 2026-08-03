import os
import re
import sys
import threading
from pathlib import Path

import minify_html
import rcssmin
import rjsmin

try:
    import tkinter as tk
    from tkinter import filedialog, messagebox, ttk
except ImportError:
    tk = None


# ─── JS Obfuscator (pure Python) ─────────────────────────────────────────────


def _js_encode_strings(code: str) -> str:
    parts, i = [], 0
    while i < len(code):
        q = code[i]
        if q in ("'", '"'):
            s = i + 1
            j = i + 1
            while j < len(code):
                if code[j] == "\\":
                    j += 2
                elif code[j] == q:
                    parts.append((s, j))
                    i = j + 1
                    break
                else:
                    j += 1
            else:
                i = j
        else:
            i += 1

    for s, e in reversed(parts):
        code = code[:s] + "".join(f"\\u{ord(c):04x}" for c in code[s:e]) + code[e:]
    return code


def _js_encode_identifiers(code: str) -> str:
    apis = [
        "getElementById", "innerText", "createElement", "appendChild",
        "addEventListener", "removeEventListener", "querySelector",
        "querySelectorAll", "classList", "setAttribute", "getAttribute",
        "removeAttribute", "textContent", "innerHTML",
    ]
    for name in apis:
        code = code.replace(name, "".join(f"\\u{ord(c):04x}" for c in name))
    return code


def obfuscate_js(code: str) -> str:
    minified = rjsmin.jsmin(code)
    minified = _js_encode_strings(minified)
    minified = _js_encode_identifiers(minified)
    junk = 'var _0x0d3d=["",""];(function(){var _0x0=!0,_0x1=!1;while(_0x0){if(_0x1){break}else{_0x1=!_0x1;continue}return}})();'
    return f"{minified}{junk}"


# ─── HTML ────────────────────────────────────────────────────────────────────

def html_entity_encode(text: str) -> str:
    return "".join(f"&#{ord(c)};" for c in text)


_JINJA_SPLIT = re.compile(r"(\{\{.*?\}\}|\{%.*?%\}|\{#.*?#\})", re.DOTALL)


def _obfuscate_html_text(html: str) -> str:
    pattern = re.compile(
        r'(<script[^>]*>.*?</script\s*>|<style[^>]*>.*?</style\s*>)|>([^<]+)<',
        re.DOTALL | re.IGNORECASE,
    )
    def replacer(m):
        if m.group(1):
            return m.group(1)
        text = m.group(2)
        parts = _JINJA_SPLIT.split(text)
        encoded = []
        for i, part in enumerate(parts):
            if i % 2 == 0:
                encoded.append(html_entity_encode(part))
            else:
                encoded.append(part)
        return ">" + "".join(encoded) + "<"

    return pattern.sub(replacer, html)


# ─── Main Processing ─────────────────────────────────────────────────────────

def process_file(source_path: Path, dest_path: Path, obfuscate_html: bool):
    suffix = source_path.suffix.lower()
    content = source_path.read_text(encoding="utf-8")

    if suffix == ".html":
        minified = minify_html.minify(content, minify_css=True, minify_js=True)
        if obfuscate_html:
            minified = _obfuscate_html_text(minified)
    elif suffix == ".css":
        minified = rcssmin.cssmin(content)
    elif suffix == ".js":
        minified = obfuscate_js(content)
    else:
        minified = content

    dest_path.parent.mkdir(parents=True, exist_ok=True)
    dest_path.write_text(minified, encoding="utf-8")


def run_minify(src_root: Path, dst_root: Path, obfuscate_html: bool, log_func, done_callback):
    extensions = {".html", ".css", ".js"}
    files = [
        p for p in src_root.rglob("*")
        if p.suffix.lower() in extensions and p.is_file()
    ]
    total = len(files)
    for i, file_path in enumerate(files, 1):
        rel_path = file_path.relative_to(src_root)
        dest_path = dst_root / rel_path
        log_func(f"[{i}/{total}] {rel_path}")
        process_file(file_path, dest_path, obfuscate_html)
    done_callback(total)


# ─── GUI ─────────────────────────────────────────────────────────────────────

class MinifierGUI:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Minify & Obfuscate HTML / CSS / JS")
        self.root.geometry("680x540")
        self.root.minsize(500, 360)

        frame_src = ttk.LabelFrame(self.root, text="Thư mục nguồn (Source)", padding=8)
        frame_src.pack(fill="x", padx=10, pady=(10, 0))
        self.src_var = tk.StringVar()
        ttk.Entry(frame_src, textvariable=self.src_var).pack(side="left", fill="x", expand=True, padx=(0, 6))
        ttk.Button(frame_src, text="Chọn...", command=self.choose_src).pack(side="right")

        frame_dst = ttk.LabelFrame(self.root, text="Thư mục đích (Destination)", padding=8)
        frame_dst.pack(fill="x", padx=10, pady=(6, 0))
        self.dst_var = tk.StringVar()
        ttk.Entry(frame_dst, textvariable=self.dst_var).pack(side="left", fill="x", expand=True, padx=(0, 6))
        ttk.Button(frame_dst, text="Chọn...", command=self.choose_dst).pack(side="right")

        frame_opt = ttk.LabelFrame(self.root, text="Tùy chọn (Options)", padding=8)
        frame_opt.pack(fill="x", padx=10, pady=(6, 0))
        self.obf_html_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(
            frame_opt, text="Mã hóa nội dung HTML thành thực thể (&#NN;) - khó đọc hơn",
            variable=self.obf_html_var
        ).pack(anchor="w")

        self.run_btn = ttk.Button(self.root, text="Minify & Obfuscate!", command=self.start_minify)
        self.run_btn.pack(pady=10)

        self.progress = ttk.Progressbar(self.root, mode="indeterminate")
        self.progress.pack(fill="x", padx=10, pady=(0, 6))

        frame_log = ttk.LabelFrame(self.root, text="Nhật ký (Log)", padding=4)
        frame_log.pack(fill="both", expand=True, padx=10, pady=(0, 10))
        self.log_text = tk.Text(frame_log, wrap="word", state="disabled", font=("Consolas", 10))
        scrollbar = ttk.Scrollbar(frame_log, orient="vertical", command=self.log_text.yview)
        self.log_text.configure(yscrollcommand=scrollbar.set)
        self.log_text.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

    def choose_src(self):
        d = filedialog.askdirectory(title="Chọn thư mục nguồn")
        if d:
            self.src_var.set(d)

    def choose_dst(self):
        d = filedialog.askdirectory(title="Chọn thư mục đích")
        if d:
            self.dst_var.set(d)

    def log(self, msg):
        self.log_text.configure(state="normal")
        self.log_text.insert("end", msg + "\n")
        self.log_text.see("end")
        self.log_text.configure(state="disabled")
        self.root.update_idletasks()

    def done(self, total):
        self.progress.stop()
        self.progress.pack_forget()
        self.run_btn.configure(state="normal")
        messagebox.showinfo("Hoàn tất", f"Đã xử lý {total} file.")

    def start_minify(self):
        src = self.src_var.get().strip()
        dst = self.dst_var.get().strip()
        if not src:
            messagebox.showerror("Lỗi", "Vui lòng chọn thư mục nguồn.")
            return
        if not dst:
            messagebox.showerror("Lỗi", "Vui lòng chọn thư mục đích.")
            return
        src_path = Path(src)
        dst_path = Path(dst)
        if not src_path.is_dir():
            messagebox.showerror("Lỗi", f"Thư mục nguồn '{src}' không tồn tại.")
            return
        if src_path == dst_path:
            messagebox.showerror("Lỗi", "Thư mục nguồn và đích phải khác nhau.")
            return

        self.run_btn.configure(state="disabled")
        self.log_text.configure(state="normal")
        self.log_text.delete("1.0", "end")
        self.log_text.configure(state="disabled")
        self.progress.pack(fill="x", padx=10, pady=(0, 6))
        self.progress.start()

        threading.Thread(
            target=run_minify,
            args=(src_path, dst_path, self.obf_html_var.get(), self.log, self.done),
            daemon=True,
        ).start()

    def run(self):
        self.root.mainloop()


def main():
    if len(sys.argv) >= 3 and not sys.argv[1].startswith("-"):
        src_root = Path(sys.argv[1])
        dst_root = Path(sys.argv[2])
        if not src_root.is_dir():
            print(f"Error: source directory '{src_root}' not found.")
            sys.exit(1)
        obf_html = "--no-obf-html" not in sys.argv
        extensions = {".html", ".css", ".js"}
        for file_path in src_root.rglob("*"):
            if file_path.suffix.lower() in extensions and file_path.is_file():
                rel_path = file_path.relative_to(src_root)
                dest_path = dst_root / rel_path
                print(f"Processing: {rel_path}")
                process_file(file_path, dest_path, obf_html)
        print("Done.")
    else:
        if tk is None:
            print("tkinter not available. Usage: python minify_html_css_js.py <source> <dest>")
            sys.exit(1)
        MinifierGUI().run()


if __name__ == "__main__":
    main()
