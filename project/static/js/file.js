FilePond.registerPlugin(
	// FilePondPluginImagePreview,  // Plugin xem trước ảnh
	FilePondPluginFileValidateSize, // Plugin kiểm tra dung lượng file
	FilePondPluginFileRename,
	FilePondPluginFileValidateType // Plugin tự động đổi tên file
);

var csrf_token = getCookie("csrftoken");
const inputElement = document.querySelector("#filepond");
const pond = FilePond.create(inputElement);

// Cấu hình upload lên server Django
FilePond.setOptions({
	allowMultiple: true, // / Cho phép nhiều file
	allowImagePreview: true, // Cho phép xem trước ảnh
	maxFileSize: "1024MB",
	acceptedFileTypes: [
		"image/jpeg", // jpg
		"image/png", // png
		"video/mp4", // mp4
		// 'image/*', //all images
		// 'video/*', //all videos
		// 'application/*', //all files
		// 'text/*', //all text files

		"application/pdf", // .pdf
		"application/x-msdownload", // .exe
		"application/zip", // .zip
		"application/x-7z-compressed", // .7z
		"application/vnd.rar", // .rar
		"application/x-iso9660-image", // .iso
		"application/octet-stream", // .gho (ghost file, thường để application/octet-stream)
		"application/vnd.ms-cab-compressed", // .cab

		"application/vnd.ms-excel", // .xls
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
		"application/vnd.ms-excel.sheet.macroEnabled.12", // .xlsm
		"application/vnd.ms-excel.addin.macroEnabled.12", // .xlam (Add-In Excel)

		"text/csv", // .csv
		"text/plain", // .txt
	],
	labelFileTypeNotAllowed: "Loại file này không được phép.",
	fileValidateTypeLabelExpectedTypes: "Chỉ chấp nhận {allTypes}",
	// fileRenameFunction: (file) => {
	//     const ext = file.name.split('.').pop();
	//     const newName = Date.now() + '.' + ext;  // Đổi tên file thành timestamp
	//     return newName;
	// },
	allowRevert: false, // Tắt nút Undo (Revert)
	allowProcess: false, // Tắt nút Upload (Process)
	instantUpload: false,
	server: {
		process: {
			url: uploadFile, // biến `uploadFile` phải là URL string, ví dụ "/upload_file/"
			method: "POST",
			headers: {
				"X-CSRFToken": csrf_token,
			},
			withCredentials: false,
		}
	},
});
if (pond.getFiles().length === 0) {
	$("#upload-button").prop("disabled", true);
} else {
	$("#upload-button").prop("disabled", false);
}
// Mỗi khi thêm file
pond.on("addfile", (error, file) => {
	if (!error) {
		$("#upload-button").prop("disabled", pond.getFiles().length === 0);
	}
});

// Mỗi khi xoá file
pond.on("removefile", (error, file) => {
	if (!error) {
		$("#upload-button").prop("disabled", pond.getFiles().length === 0);
	}
});
$("#upload-button").click(function (e) {
	e.preventDefault();
	pond
		.processFiles()
		.then(() => {
			console.log("Tất cả file đã upload xong!");
			// Có thể hiện thông báo thành công ở đây
			// Xóa file trong input sau khi upload thành công
			// notyf.success("Tải lên thành công!");
			var toast = new bootstrap.Toast(document.getElementById("toast"));
			//change body
			document.querySelector(".toast-body").innerHTML =
				"Add command successfully";
			var toastTitle = document.querySelector("#toast-title");
			// remove class
			toastTitle.classList.remove("text-warning");
			// add class
			toastTitle.classList.add("text-success")
			toast.show();
			// remove file after upload
			setTimeout(function () {
				toast.hide();
				// Thêm hiệu ứng rồi mới remove
				const items = document.querySelectorAll('.filepond--item');

				items.forEach(item => {
					item.style.transition = 'height 0.5s ease, margin 0.5s ease, padding 0.5s ease, opacity 0.5s ease';
					item.style.overflow = 'hidden';

					// Force reflow
					void item.offsetHeight;

					// Co dần từng item
					item.style.height = '0px';
					item.style.margin = '0px';
					item.style.padding = '0px';
					item.style.opacity = '0';
					
				});
				// Sau khi xóa file xong, co form lại từ từ
				setTimeout(() => {
					pond.removeFiles();

				}, 500); // khớp thời gian co file
			}, 2000);
		})
		.catch((error) => {
			console.error("Có lỗi khi upload file:", error);
			// Hiện thông báo lỗi nếu cần
		});
});
fetch(listUploadedFiles) // URL của view list_uploaded_files
	.then((response) => response.json())
	.then((data) => {
		console.log(data);
		// append data to the table
		const tableBody = document.querySelector("#table-body-file");
		tableBody.innerHTML = "";
		data.files.forEach((file) => {
			const isoString = file.modified;
			// date format dd/mm/yyyy hh:mm:ss
			const date = new Date(isoString);

			// Hàm thêm số 0 phía trước nếu nhỏ hơn 10
			const pad = (n) => (n < 10 ? "0" + n : n);

			// Format lại theo dd/mm/yyyy hh:mm:ss
			const formattedDate = `${pad(date.getDate())}/${pad(
				date.getMonth() + 1
			)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(
				date.getMinutes()
			)}:${pad(date.getSeconds())}`;

			// return;
			const row = document.createElement("tr");
			row.innerHTML = `
					<td>${file.name}</td>
					<td class="text-center"><i class="m-0">${formattedDate}</i></td>
					<td class="text-center"><i class="bi bi-download text-success download-file"
						style="cursor: pointer;"
						data-link="${file.path}"></i>
					</td>
					<td class="text-center">
					<i class="bi bi-trash text-danger delete-file"
						style="cursor: pointer;"
						data-file-name="${file.name}"></i>
					</td>
				`;

			tableBody.appendChild(row);
			// download file click
			const downloadFile = row.querySelector(".download-file");
			if (downloadFile) {
				downloadFile.addEventListener("click", () => {
					const link = downloadFile.getAttribute("data-link");
					window.location.href = link;
				});
			}
			// delete file click
			const deleteFile_btn = row.querySelector(".delete-file");
			if (deleteFile_btn) {
				deleteFile_btn.addEventListener("click", () => {
					const fileName = deleteFile_btn.getAttribute("data-file-name");
					console.log(fileName);
					fetch(deleteFile, {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							"X-CSRFToken": csrf_token,
						},
						body: JSON.stringify({ file_name: fileName }),
					})
						.then((res) => res.json())
						.then((data) => {
							console.log(data);
							const toast = new bootstrap.Toast(
								document.getElementById("toast")
							);
							const toastTitle = document.querySelector(
								"#toast-title"
							);

							document.querySelector(".toast-body").innerHTML =
								"Xoá file thành công";
							toastTitle.classList.remove("text-warning");
							toastTitle.classList.add("text-success");
							toast.show();

							setTimeout(() => toast.hide(), 2000);
							const row = deleteFile_btn.closest("tr");
							if (row) row.remove();
						});
				});
			}
		});
	})
	.catch((error) => {
		console.error("Có lỗi khi lấy danh sách file:", error);
	});
// }

// fetchFileList();
