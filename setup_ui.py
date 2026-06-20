import os
import sys
import json
import subprocess
import tempfile
import threading
import multiprocessing
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

WORKER_TEMPLATE = r'''import os, sys, shutil, json, argparse
from setuptools import setup, Extension
from Cython.Build import cythonize

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config")
    parser.add_argument("--src")
    parser.add_argument("--dst")
    args = parser.parse_args()

    with open(args.config, "r") as f:
        cfg = json.load(f)

    exclude_dirs = cfg.get("exclude_dirs", [])
    exclude_files = cfg.get("exclude_files", [])
    exclude_exts = cfg.get("exclude_extensions", [])
    keep_py_files = cfg.get("keep_py_files", [])
    temp_build = os.path.join(os.environ.get("TEMP", "/tmp"), "pyd_build_tmp")

    try:
        if os.path.exists(temp_build):
            shutil.rmtree(temp_build)
        os.makedirs(temp_build)

        py_files = []
        keep_py_set = set(keep_py_files)
        for root, dirs, files in os.walk(args.src):
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            for f in files:
                if f.endswith(".py") and f not in exclude_files and f not in keep_py_set:
                    py_files.append(os.path.join(root, f))

        total = len(py_files)
        print(f"COUNT:{total}", flush=True)
        if total == 0:
            print("DONE", flush=True)
            return 0

        extensions = []
        for f in py_files:
            rel_path = os.path.relpath(f, args.src)
            module_name = os.path.splitext(rel_path)[0].replace(os.sep, ".")
            extensions.append(Extension(module_name, [f]))

        os.chdir(args.src)
        setup(
            ext_modules=cythonize(extensions, language_level="3", quiet=True),
            script_args=["build_ext", "--build-lib", temp_build, "--build-temp", os.path.join(temp_build, "tmp")],
        )

        print("COPY_RESOURCES", flush=True)

        if os.path.exists(args.dst):
            shutil.rmtree(args.dst)

        def _ignore(src_dir, names):
            ignored = set()
            for name in names:
                full = os.path.join(src_dir, name)
                if os.path.isdir(full):
                    if name in exclude_dirs:
                        ignored.add(name)
                else:
                    if name.endswith((".c", ".pyc")):
                        ignored.add(name)
                    elif any(name.endswith(e.lstrip("*.")) for e in exclude_exts if e.startswith("*")):
                        ignored.add(name)
                    elif name.endswith(".py") and name not in keep_py_set:
                        ignored.add(name)
            return ignored

        shutil.copytree(args.src, args.dst, ignore=_ignore)

        for root, dirs, files in os.walk(temp_build):
            for file in files:
                if file.endswith(".pyd"):
                    src_pyd = os.path.join(root, file)
                    real_name = file.split(".")[0] + ".pyd"
                    rel_dir = os.path.relpath(root, temp_build)
                    tgt_dir = os.path.normpath(os.path.join(args.dst, rel_dir))
                    if not os.path.exists(tgt_dir):
                        os.makedirs(tgt_dir)
                    shutil.copy2(src_pyd, os.path.join(tgt_dir, real_name))
                    print(f"PYD:{os.path.join(rel_dir, real_name)}", flush=True)

        print("DONE", flush=True)
        return 0

    except Exception as e:
        print(f"ERROR:{e}", flush=True)
        return 1
    finally:
        if os.path.exists(temp_build):
            shutil.rmtree(temp_build)
        cleaned = 0
        for root, dirs, files in os.walk(args.src):
            for f in files:
                if f.endswith(".c"):
                    try:
                        os.remove(os.path.join(root, f))
                        cleaned += 1
                    except:
                        pass
        if cleaned:
            print(f"CLEANUP:{cleaned}", flush=True)

if __name__ == "__main__":
    sys.exit(main())
'''

CONFIG_DEFAULT = {
    "exclude_dirs": ["venv", ".git", "__pycache__", "build", "dist", "node_modules", "alembic", "migrations"],
    "exclude_files": ["setup.py"],
    "exclude_extensions": ["*.pyc", "*.pyo", "*.c", "*.cpp", "*.obj"],
    "keep_py_files": []
}


class PyToPydConverter:
    def __init__(self, root):
        self.root = root
        self.root.title("Tool Convert PY -> PYD - By Dần_VN")
        self.root.geometry("650x300")
        self.root.resizable(False, False)
        self.root.configure(bg="#f0f4f8")

        self.source_dir = tk.StringVar()
        self.target_dir = tk.StringVar()
        self.config = self._load_config()

        style = ttk.Style()
        style.theme_use("clam")
        style.configure("TFrame", background="#f0f4f8")
        style.configure("Header.TLabel", background="#f0f4f8", foreground="#1a365d", font=("Segoe UI", 11, "bold"))
        style.configure("TLabel", background="#f0f4f8", foreground="#2d3748", font=("Segoe UI", 10))
        style.configure("TEntry", fieldbackground="#ffffff", foreground="#2d3748", font=("Segoe UI", 10))
        style.configure("Horizontal.TProgressbar", background="#48bb78", troughcolor="#e2e8f0", thickness=12)
        style.map("TButton",
                  background=[("active", "#e2e8f0"), ("!active", "#edf2f7")],
                  foreground=[("active", "#2d3748"), ("!active", "#4a5568")])

        self._build_ui()

    def _build_ui(self):
        root = self.root

        header = tk.Frame(root, bg="#1a365d", height=48)
        header.grid(row=0, column=0, columnspan=3, sticky="ew")
        header.grid_propagate(False)
        tk.Label(header, text="PY → PYD CONVERTER", bg="#1a365d", fg="white",
                 font=("Segoe UI", 13, "bold")).pack(side=tk.LEFT, padx=16, pady=10)
        tk.Label(header, text="v1.0 — By Dần_VN", bg="#1a365d", fg="#a0c4e8",
                 font=("Segoe UI", 9)).pack(side=tk.RIGHT, padx=16, pady=10)

        main = tk.Frame(root, bg="#f0f4f8", padx=20, pady=16)
        main.grid(row=1, column=0, columnspan=3, sticky="nsew")
        root.grid_rowconfigure(1, weight=1)
        root.grid_columnconfigure(1, weight=1)

        lbl_w = 22
        entry_w = 50

        row = 0
        tk.Label(main, text="📁 Thư mục nguồn (Project):", anchor="w",
                 width=lbl_w, bg="#f0f4f8", fg="#2d3748", font=("Segoe UI", 10)).grid(
                 row=row, column=0, padx=(0, 8), pady=8, sticky="w")
        tk.Entry(main, textvariable=self.source_dir, width=entry_w,
                 font=("Consolas", 10), relief="solid", bd=1).grid(
                 row=row, column=1, padx=0, pady=8, sticky="ew")
        tk.Button(main, text="Browse", command=self.browse_source,
                  cursor="hand2", relief="raised", bd=1,
                  bg="#edf2f7", fg="#2d3748", font=("Segoe UI", 9, "bold"),
                  padx=12, pady=1).grid(row=row, column=2, padx=(8, 0), pady=8)

        row = 1
        tk.Label(main, text="📦 Thư mục đích (Encode):", anchor="w",
                 width=lbl_w, bg="#f0f4f8", fg="#2d3748", font=("Segoe UI", 10)).grid(
                 row=row, column=0, padx=(0, 8), pady=8, sticky="w")
        tk.Entry(main, textvariable=self.target_dir, width=entry_w,
                 font=("Consolas", 10), relief="solid", bd=1).grid(
                 row=row, column=1, padx=0, pady=8, sticky="ew")
        tk.Button(main, text="Browse", command=self.browse_target,
                  cursor="hand2", relief="raised", bd=1,
                  bg="#edf2f7", fg="#2d3748", font=("Segoe UI", 9, "bold"),
                  padx=12, pady=1).grid(row=row, column=2, padx=(8, 0), pady=8)

        sep = ttk.Separator(main, orient="horizontal")
        sep.grid(row=2, column=0, columnspan=3, sticky="ew", pady=12)

        row = 3
        tk.Label(main, text="⏳ Trạng thái:", anchor="w", width=lbl_w,
                 bg="#f0f4f8", fg="#2d3748", font=("Segoe UI", 10)).grid(
                 row=row, column=0, padx=(0, 8), pady=(0, 4), sticky="w")
        self.progress = ttk.Progressbar(main, orient="horizontal",
                                         length=400, mode="determinate",
                                         style="Horizontal.TProgressbar")
        self.progress.grid(row=row, column=1, columnspan=2, padx=0, pady=(0, 4), sticky="ew")

        row = 4
        self.progress_label = tk.Label(main, text="Sẵn sàng", anchor="w",
                                        bg="#f0f4f8", fg="#718096",
                                        font=("Segoe UI", 9, "italic"))
        self.progress_label.grid(row=row, column=1, columnspan=2, padx=0, pady=(0, 0), sticky="w")

        sep2 = ttk.Separator(main, orient="horizontal")
        sep2.grid(row=5, column=0, columnspan=3, sticky="ew", pady=12)

        row = 6
        btn_frame = tk.Frame(main, bg="#f0f4f8")
        btn_frame.grid(row=row, column=0, columnspan=3, pady=(0, 4))

        self.btn_run = tk.Button(
            btn_frame, text="▶  CHUYỂN ĐỔI", command=self.start_thread,
            cursor="hand2", relief="raised", bd=0,
            bg="#48bb78", fg="white", width=16,
            font=("Segoe UI", 10, "bold"), padx=8, pady=6
        )
        self.btn_run.pack(side=tk.LEFT, padx=6)

        tk.Button(
            btn_frame, text="⚙  CẤU HÌNH", command=self.open_config,
            cursor="hand2", relief="raised", bd=0,
            bg="#ed8936", fg="white", width=13,
            font=("Segoe UI", 10, "bold"), padx=8, pady=6
        ).pack(side=tk.LEFT, padx=6)

        tk.Button(
            btn_frame, text="✕  ĐÓNG", command=root.quit,
            cursor="hand2", relief="raised", bd=0,
            bg="#e53e3e", fg="white", width=13,
            font=("Segoe UI", 10, "bold"), padx=8, pady=6
        ).pack(side=tk.LEFT, padx=6)

    def _app_dir(self):
        if getattr(sys, 'frozen', False):
            return os.path.dirname(sys.executable)
        return os.path.dirname(os.path.abspath(__file__))

    def _config_path(self):
        return os.path.join(self._app_dir(), 'config.json')

    def _load_config(self):
        cfg_path = self._config_path()
        if os.path.exists(cfg_path):
            try:
                with open(cfg_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception:
                pass
        with open(cfg_path, 'w', encoding='utf-8') as f:
            json.dump(CONFIG_DEFAULT, f, indent=2, ensure_ascii=False)
        return dict(CONFIG_DEFAULT)

    def open_config(self):
        cfg_path = self._config_path()
        if os.path.exists(cfg_path):
            os.startfile(cfg_path)
        else:
            messagebox.showerror("Lỗi", "Không tìm thấy file cấu hình!")

    def browse_source(self):
        path = filedialog.askdirectory()
        if path:
            self.source_dir.set(os.path.normpath(path))

    def browse_target(self):
        path = filedialog.askdirectory()
        if path:
            self.target_dir.set(os.path.normpath(path))

    def _ui_update(self, enabled=None, status=None, progress_val=None):
        def _apply():
            if enabled is not None:
                self.btn_run.config(state=tk.NORMAL if enabled else tk.DISABLED)
            if status is not None:
                self.progress_label.config(text=status)
            if progress_val is not None:
                self.progress["value"] = progress_val
        self.root.after(0, _apply)

    def _ui_message(self, title, msg, is_error=False):
        def _show():
            if is_error:
                messagebox.showerror(title, msg)
            else:
                messagebox.showinfo(title, msg)
        self.root.after(0, _show)

    def _detect_python(self):
        if not getattr(sys, 'frozen', False):
            return sys.executable
        try:
            result = subprocess.run(
                ['where', 'python'], capture_output=True, text=True, shell=True
            )
            if result.returncode == 0:
                for p in result.stdout.strip().split('\n'):
                    p = p.strip()
                    if p.lower().endswith('python.exe'):
                        return p
        except Exception:
            pass
        return 'python'

    def _check_deps(self, python_exe):
        try:
            proc = subprocess.run(
                [python_exe, '-c', 'import Cython; from setuptools import setup'],
                capture_output=True, text=True
            )
            return proc.returncode == 0
        except Exception:
            return False

    def start_thread(self):
        src = self.source_dir.get()
        dst = self.target_dir.get()

        if not src or not dst:
            self._ui_message("Cảnh báo", "Vui lòng chọn đầy đủ thư mục!", is_error=True)
            return

        src = os.path.normpath(src)
        dst = os.path.normpath(dst)

        if src == dst:
            self._ui_message("Cảnh báo", "Thư mục nguồn và đích không được trùng nhau!", is_error=True)
            return

        self.progress["value"] = 0
        self._ui_update(enabled=False, status="Đang kiểm tra môi trường...", progress_val=0)
        thread = threading.Thread(target=self._worker_thread, args=(src, dst))
        thread.daemon = True
        thread.start()

    def _worker_thread(self, src, dst):
        worker_path = None
        cfg_path = None
        proc = None

        try:
            python_exe = self._detect_python()

            if not self._check_deps(python_exe):
                self._ui_message(
                    "Thiếu thư viện",
                    "Vui lòng cài đặt Cython và setuptools:\n"
                    f"  {python_exe} -m pip install cython setuptools",
                    is_error=True
                )
                return

            cfg_data = {
                'exclude_dirs': self.config.get('exclude_dirs', CONFIG_DEFAULT['exclude_dirs']),
                'exclude_files': self.config.get('exclude_files', CONFIG_DEFAULT['exclude_files']),
                'exclude_extensions': self.config.get('exclude_extensions', CONFIG_DEFAULT['exclude_extensions']),
                'keep_py_files': self.config.get('keep_py_files', CONFIG_DEFAULT['keep_py_files']),
            }
            cfg_path = os.path.join(tempfile.gettempdir(), 'pyd_config.json')
            with open(cfg_path, 'w', encoding='utf-8') as f:
                json.dump(cfg_data, f)

            worker_path = os.path.join(tempfile.gettempdir(), 'pyd_worker.py')
            with open(worker_path, 'w', encoding='utf-8') as f:
                f.write(WORKER_TEMPLATE)

            self._ui_update(status="Đang biên dịch...", progress_val=10)

            startupinfo = subprocess.STARTUPINFO()
            startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            proc = subprocess.Popen(
                [python_exe, worker_path, '--config', cfg_path, '--src', src, '--dst', dst],
                stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
                startupinfo=startupinfo, creationflags=subprocess.CREATE_NO_WINDOW
            )

            stderr_lines = []

            def _collect_stderr():
                for line in proc.stderr:
                    stderr_lines.append(line)

            stderr_thread = threading.Thread(target=_collect_stderr, daemon=True)
            stderr_thread.start()

            file_count = 0
            pyd_count = 0
            done = False
            error_msg = None

            for line in proc.stdout:
                line = line.strip()
                if not line:
                    continue

                if line.startswith('COUNT:'):
                    file_count = int(line.split(':', 1)[1])
                    if file_count == 0:
                        done = True
                        self._ui_message("Thông báo", "Không có file .py nào để biên dịch!")
                        break
                    self._ui_update(status=f"Đã tìm thấy {file_count} file .py", progress_val=20)

                elif line.startswith('PYD:'):
                    pyd_count += 1
                    pct = 20 + int((pyd_count / file_count) * 60) if file_count else 20
                    self._ui_update(
                        status=f"Đang biên dịch: {pyd_count}/{file_count}",
                        progress_val=pct
                    )

                elif line == 'COPY_RESOURCES':
                    self._ui_update(status="Đang sao chép tài nguyên...", progress_val=85)

                elif line.startswith('CLEANUP:'):
                    cleaned = line.split(':', 1)[1]
                    self._ui_update(status=f"Đã dọn dẹp {cleaned} file .c", progress_val=95)

                elif line == 'DONE':
                    done = True
                    self._ui_update(status="Hoàn tất!", progress_val=100)
                    break

                elif line.startswith('ERROR:'):
                    done = True
                    error_msg = line.split(':', 1)[1] if ':' in line else line
                    break

            proc.wait()
            stderr_text = ''.join(stderr_lines).strip()

            if done and file_count == 0:
                pass  # message already sent
            elif done and not error_msg:
                self._ui_message("Thành công", f"Đã chuyển đổi xong!\n{pyd_count} file .pyd")
            elif error_msg:
                self._ui_message("Lỗi biên dịch", error_msg, is_error=True)
            elif stderr_text:
                self._ui_message("Lỗi biên dịch", stderr_text[:2000], is_error=True)
            elif not done:
                self._ui_update(status="Thất bại - không rõ nguyên nhân", progress_val=0)

        except Exception as e:
            self._ui_message("Lỗi hệ thống", str(e), is_error=True)

        finally:
            if proc and proc.poll() is None:
                try:
                    proc.terminate()
                    proc.wait(timeout=5)
                except Exception:
                    pass
            for tmp in [worker_path, cfg_path]:
                if tmp and os.path.exists(tmp):
                    try:
                        os.remove(tmp)
                    except Exception:
                        pass
            self._ui_update(enabled=True, status="Sẵn sàng", progress_val=0)


if __name__ == "__main__":
    multiprocessing.freeze_support()
    root = tk.Tk()
    app = PyToPydConverter(root)
    root.mainloop()
