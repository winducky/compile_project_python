import os
import shutil
import sys
import glob
from setuptools import setup, Extension
from Cython.Build import cythonize

# --- CẤU HÌNH ĐƯỜNG DẪN TUYỆT ĐỐI ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SOURCE_FOLDER = os.path.join(BASE_DIR, 'project')         
TARGET_FOLDER = os.path.join(BASE_DIR, 'project_encode')  
TEMP_BUILD_DIR = os.path.join(BASE_DIR, 'temp_build') 
EXCLUDE_DIRS = ['venv', '.git', '.gitignore', '__pycache__', 'build', 'dist']

def get_py_files(base_dir):
    py_files = []
    for root, dirs, files in os.walk(base_dir):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.startswith('.')]
        for file in files:
            if file.endswith('.py') and file != 'setup.py':
                py_files.append(os.path.join(root, file))
    return py_files

all_py_files = get_py_files(SOURCE_FOLDER)

# 1. Tạo danh sách Extension
extensions = []
for f in all_py_files:
    rel_path = os.path.relpath(f, SOURCE_FOLDER)
    module_name = os.path.splitext(rel_path)[0].replace(os.sep, '.')
    extensions.append(Extension(module_name, [f]))

try:
    if extensions:
        print(f"--- Đang biên dịch {len(extensions)} file py -> pyd ---")
        setup(
            ext_modules=cythonize(extensions, language_level="3", quiet=True),
            script_args=['build_ext', '--build-lib', TEMP_BUILD_DIR],
        )
    else:
        print("Không tìm thấy file .py.")
        sys.exit()

    # 2. Tạo bản sao cấu trúc và copy file phi-python
    print(f"\n--- Đang sao chép tài nguyên & đóng gói: {TARGET_FOLDER} ---")
    if os.path.exists(TARGET_FOLDER):
        shutil.rmtree(TARGET_FOLDER)
    
    # Copy toàn bộ, loại trừ các file code và rác để giữ lại .env, .txt, .json, .ui, .png...
    shutil.copytree(SOURCE_FOLDER, TARGET_FOLDER, 
                    ignore=shutil.ignore_patterns(*EXCLUDE_DIRS, '*.py', '*.c', '*.pyc', '*.cpp', '*.obj'))

    # 3. Chèn file .pyd đã biên dịch vào đúng vị trí
    for root, dirs, files in os.walk(TEMP_BUILD_DIR):
        for file in files:
            if file.endswith('.pyd'):
                source_pyd_path = os.path.join(root, file)
                
                # Làm sạch tên (bỏ phần .cp311-win_amd64)
                parts = file.split('.')
                real_name = parts[0] + '.pyd'
                
                rel_dir = os.path.relpath(root, TEMP_BUILD_DIR)
                target_dir = os.path.normpath(os.path.join(TARGET_FOLDER, rel_dir))
                
                if not os.path.exists(target_dir):
                    os.makedirs(target_dir)
                
                shutil.copy2(source_pyd_path, os.path.join(target_dir, real_name))
                print(f"-> Đã chèn thành công: {os.path.join(rel_dir, real_name)}")

finally:
    # 4. DỌN DẸP TRIỆT ĐỂ
    print("\n--- Đang dọn dẹp file tạm ---")
    try:
        # Xóa các thư mục build tạm
        for d in [TEMP_BUILD_DIR, 'build']:
            if os.path.exists(d):
                shutil.rmtree(d)
                
        # Xóa các file .c, .pyc và __pycache__ trong SOURCE_FOLDER
        patterns = ["**/*.c", "**/*.pyc", "**/__pycache__"]
        for pattern in patterns:
            for item in glob.glob(os.path.join(SOURCE_FOLDER, pattern), recursive=True):
                if os.path.isdir(item):
                    shutil.rmtree(item)
                else:
                    os.remove(item)
                    
    except Exception as e:
        print(f"Lỗi dọn dẹp: {e}")
        
    print(f"\n>>> HOÀN TẤT! Toàn bộ project (bao gồm .env, .txt, .pyd,...) nằm tại: {TARGET_FOLDER}")