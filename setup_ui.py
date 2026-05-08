import os
import shutil
import sys
import glob
import subprocess
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
import tempfile
import threading
import multiprocessing  # Thêm thư viện này

class PyToPydConverter:
    def __init__(self, root):
        self.root = root
        self.root.title("Tool Convert PY -> PYD - By Dần_VN")
        self.root.geometry("600x200")
        
        self.source_dir = tk.StringVar()
        self.target_dir = tk.StringVar()

        # --- UI Layout giữ nguyên ---
        tk.Label(root, text="Thư mục nguồn (Project):").grid(row=0, column=0, padx=10, pady=10, sticky="w")
        tk.Entry(root, textvariable=self.source_dir, width=50).grid(row=0, column=1, padx=10, pady=10)
        tk.Button(root, text="Chọn", command=self.browse_source).grid(row=0, column=2, padx=10, pady=10)

        tk.Label(root, text="Thư mục đích (Encode):").grid(row=1, column=0, padx=10, pady=10, sticky="w")
        tk.Entry(root, textvariable=self.target_dir, width=50).grid(row=1, column=1, padx=10, pady=10)
        tk.Button(root, text="Chọn", command=self.browse_target).grid(row=1, column=2, padx=10, pady=10)

        tk.Label(root, text="Trạng thái:").grid(row=2, column=0, padx=10, pady=5, sticky="w")
        self.progress = ttk.Progressbar(root, orient="horizontal", length=300, mode="determinate")
        self.progress.grid(row=2, column=1, columnspan=2, padx=10, pady=5, sticky="we")

        btn_frame = tk.Frame(root)
        btn_frame.grid(row=3, column=0, columnspan=3, pady=20)

        self.btn_run = tk.Button(btn_frame, text="CHUYỂN ĐỔI", command=self.start_thread, bg="green", fg="white", width=15, font=('Arial', 10, 'bold'))
        self.btn_run.pack(side=tk.LEFT, padx=10)
        tk.Button(btn_frame, text="ĐÓNG", command=root.quit, bg="red", fg="white", width=15).pack(side=tk.LEFT, padx=10)

    def browse_source(self):
        path = filedialog.askdirectory()
        if path: self.source_dir.set(os.path.normpath(path))

    def browse_target(self):
        path = filedialog.askdirectory()
        if path: self.target_dir.set(os.path.normpath(path))

    def start_thread(self):
        src = self.source_dir.get()
        dst = self.target_dir.get()
        if not src or not dst:
            messagebox.showwarning("Cảnh báo", "Vui lòng chọn đầy đủ thư mục!")
            return
        
        self.progress["value"] = 0
        self.btn_run.config(state=tk.DISABLED)
        thread = threading.Thread(target=self.conversion_worker, args=(src, dst))
        thread.daemon = True
        thread.start()

    def conversion_worker(self, src, dst):
        # Tạo file script biên dịch
        worker_script = os.path.join(tempfile.gettempdir(), "pyd_worker.py")
        self.root.after(0, lambda: self.progress.configure(value=20))

        with open(worker_script, "w", encoding="utf-8") as f:
            f.write(f"""
import os, shutil, glob, sys
from setuptools import setup, Extension
from Cython.Build import cythonize

def run():
    src = r"{src}"
    dst = r"{dst}"
    temp_build = os.path.join(os.environ['TEMP'], 'pyd_build_tmp')
    
    if os.path.exists(temp_build): shutil.rmtree(temp_build)
    os.makedirs(temp_build)

    py_files = []
    for root, dirs, files in os.walk(src):
        dirs[:] = [d for d in dirs if d not in ['venv', '.git', '__pycache__', 'build', 'dist']]
        for file in files:
            if file.endswith('.py') and file != 'setup.py':
                py_files.append(os.path.join(root, file))

    if not py_files: return

    extensions = []
    for f in py_files:
        rel_path = os.path.relpath(f, src)
        module_name = os.path.splitext(rel_path)[0].replace(os.sep, '.')
        extensions.append(Extension(module_name, [f]))

    os.chdir(src)
    setup(
        ext_modules=cythonize(extensions, language_level="3", quiet=True),
        script_args=['build_ext', '--build-lib', temp_build, '--build-temp', os.path.join(temp_build, 'tmp')],
    )

    if os.path.exists(dst): shutil.rmtree(dst)
    shutil.copytree(src, dst, ignore=shutil.ignore_patterns('venv', '.git', '*.py', '*.c', '*.pyc'))

    for root, dirs, files in os.walk(temp_build):
        for file in files:
            if file.endswith('.pyd'):
                source_path = os.path.join(root, file)
                real_name = file.split('.')[0] + '.pyd'
                rel_dir = os.path.relpath(root, temp_build)
                target_pyd_dir = os.path.normpath(os.path.join(dst, rel_dir))
                if not os.path.exists(target_pyd_dir): os.makedirs(target_pyd_dir)
                shutil.copy2(source_path, os.path.join(target_pyd_dir, real_name))

    shutil.rmtree(temp_build)
    for c_file in glob.glob(os.path.join(src, "**/*.c"), recursive=True): os.remove(c_file)

if __name__ == "__main__":
    run()
""")

        try:
            self.root.after(0, lambda: self.progress.configure(value=50))
            
            # QUAN TRỌNG: Nếu là EXE, ta cần gọi python của hệ thống hoặc python đi kèm.
            # Vì sys.executable lúc này là file .exe nên nó sẽ chạy lại UI.
            # Ta sẽ dùng lệnh 'python' hoặc 'pythonw' thay vì sys.executable
            result = subprocess.run(['python', worker_script], capture_output=True, text=True, shell=True)
            
            if result.returncode == 0:
                self.root.after(0, lambda: self.progress.configure(value=100))
                messagebox.showinfo("Thành công", f"Đã chuyển đổi xong!")
            else:
                messagebox.showerror("Lỗi biên dịch", f"Đảm bảo máy đã cài Python và C++ Build Tools.\\n\\n{result.stderr}")
        except Exception as e:
            messagebox.showerror("Lỗi hệ thống", str(e))
        finally:
            if os.path.exists(worker_script): os.remove(worker_script)
            self.root.after(0, lambda: self.btn_run.config(state=tk.NORMAL))

if __name__ == "__main__":
    # Dòng này cực kỳ quan trọng để PyInstaller không chạy đệ quy
    multiprocessing.freeze_support() 
    
    root = tk.Tk()
    app = PyToPydConverter(root)
    root.mainloop()