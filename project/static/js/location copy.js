// Lấy PX từ URL
const path = window.location.pathname;
const parts = path.split('/').filter(Boolean);
const pxCode = parts[parts.length - 1];
let warehouseCache = {}; // Bộ nhớ đệm để so sánh dữ liệu cũ
// Bảng mapping
const pxMap = {
    PXMIX: 'Luyện',
    PXEXT: 'Ép Suất',
    PXBLD: 'Thành Hình',
    PXBIA: 'Cắt Vải',
    PXINN: 'Cán Lót',
    PXCLD: 'Cán Tráng',
    PXMNS: 'Cắt Mono',
    PXPAD: 'Lớp Lót',
    PXBWI: 'Tanh',
    PXCUR: 'Lưu Hoá'
};

// Lấy tên công đoạn
const pxName = pxMap[pxCode] || pxCode;
$('#title-location-dept').text('Quản lý FEFO công đoạn ' + pxName);

// Hàm chính để tải dữ liệu
function fetchWarehouseData() {
    $.ajax({
        url: API_GET_LOCATION,
        type: 'GET',
        dataType: 'json',
        success: function (response) {
            if (response.status !== "success") return;
            // Lần đầu: render full
            if (Object.keys(warehouseCache).length === 0) {
                renderWarehouse(response.data);
                populateProductFilter(response.data);
                // Lưu cache
                response.data.forEach(item => {
                    warehouseCache[item.position] = JSON.stringify(item);
                });
                return;
            }

            // Các lần sau: chỉ update slot thay đổi
            response.data.forEach(item => {
                updateSlotIfChanged(item);
            });
        },
        error: function (xhr, status, error) {
        }
    });
}

// Hàm tính toán class màu sắc (Logic y hệt yêu cầu của bạn)
function getBgClass(name, expiryDate) {
    if (!name || !expiryDate) return "bg-secondary"; // Trống

    const today = moment().startOf('day');
    const expiry = moment(expiryDate);
    const diffDays = expiry.diff(today, 'days');

    if (diffDays < 0) return "bg-danger";    // Hết hạn
    if (diffDays <= 1) return "bg-warning";  // Hết hạn hôm nay hoặc mai (còn 1 ngày)
    return "bg-success";                    // Còn hạn
}

// Hàm vẽ giao diện từ JSON
function renderWarehouse(data) {
    const container = $('#warehouse-container');
    container.empty();

    // group theo bin
    const bins = {};
    data.forEach(item => {
        if (!bins[item.bin]) bins[item.bin] = [];
        bins[item.bin].push(item);
    });

    Object.keys(bins).sort().forEach(binName => {
        const slots = bins[binName];

        // sort theo số trong position (A1 → 1)
        slots.sort((a, b) => {
            const na = parseInt(a.position.replace(/\D/g, ''));
            const nb = parseInt(b.position.replace(/\D/g, ''));
            return na - nb;
        });

        const ROWS = 3;
        const COLS = Math.ceil(slots.length / ROWS);

        let grid = Array.from({ length: ROWS }, () => []);

        slots.forEach((slot, index) => {
            const row = index % ROWS;
            const col = Math.floor(index / ROWS);
            grid[row][col] = slot;
        });

        let html = `<h4 class="mt-4">Kệ ${binName}</h4>`;
        html += `
            <div class="warehouse-wrapper p-2">
                <div class="warehouse-grid d-grid gap-3"
                     style="grid-template-columns: repeat(${COLS}, var(--slot-width));">
        `;

        // render từ hàng trên xuống
        for (let r = ROWS - 1; r >= 0; r--) {
            for (let c = 0; c < COLS; c++) {
                const slot = grid[r][c];
                if (!slot) continue;

                const bgClass = getBgClass(slot.item_product_name, slot.item_product_expiry);
                const nsxView = slot.item_product_date
                    ? moment(slot.item_product_date).format('DD/MM/YYYY')
                    : '';
                const hsdView = slot.item_product_expiry
                    ? moment(slot.item_product_expiry).format('DD/MM/YYYY')
                    : '';
                const hsdDays = slot.item_product_expiry
                    ? moment(slot.item_product_expiry).diff(moment().startOf('day'), 'days')
                    : 0;
                html += `
                    <div class="slot ${bgClass} text-white p-2"
                        id="slot-${slot.position}"
                        data-id="${slot.id}"
                        data-position="${slot.position}"
                        data-name="${slot.item_product_name || ''}"
                        data-code="${slot.item_product_code || ''}"
                        data-nsx="${slot.item_product_date || ''}"
                        data-hsd="${slot.item_product_expiry || ''}">
                        <div class="fw-bold text-center fs-6">${slot.position}</div>
                        <div class="slot-content d-flex flex-column justify-content-center align-items-center text-center h-100 pb-2">
                            ${slot.item_product_name
                        ? `<div>SP: ${slot.item_product_name}</div><div>${hsdDays} ngày</div><div>NSX: ${nsxView}</div><div>HSD: ${hsdView}</div>`
                        : 'Trống'}
                        </div>
                    </div>
                `;
            }
        }

        html += `</div></div>`;
        container.append(html);
    });
}

function hasProductInFilter(productName) {
    let exists = false;
    $('#fillter_btp option').each(function () {
        if ($(this).val() === productName) {
            exists = true;
            return false;
        }
    });
    return exists;
}
// Hàm cập nhật từng ô nếu có thay đổi
function updateSlotIfChanged(slot) {
    const key = slot.position;
    const newData = JSON.stringify(slot);

    if (warehouseCache[key] === newData) return;
    warehouseCache[key] = newData;

    const bgClass = getBgClass(slot.item_product_name, slot.item_product_expiry);

    const nsx = slot.item_product_date
        ? moment(slot.item_product_date).format('DD/MM/YYYY')
        : '';

    const hsd = slot.item_product_expiry
        ? moment(slot.item_product_expiry).format('DD/MM/YYYY')
        : '';

    const hsdDays = slot.item_product_expiry
        ? moment(slot.item_product_expiry).diff(moment().startOf('day'), 'days')
        : '';

    const $slot = $('#slot-' + slot.position.replaceAll('-', '_'));

    if ($slot.length) {
        $slot
            .removeClass('bg-success bg-warning bg-danger bg-secondary')
            .addClass(bgClass)
            .data('name', slot.item_product_name || '')
            .data('code', slot.item_product_code || '')
            .data('nsx', slot.item_product_date || '')
            .data('hsd', slot.item_product_expiry || '')
            .find('.slot-content')
            .html(slot.item_product_name
                ? `
                    <div>SP: ${slot.item_product_name}</div>
                    <div>${hsdDays} ngày</div>
                    <div>NSX: ${nsx}</div>
                    <div>HSD: ${hsd}</div>
                  `
                : `<div>Trống</div>`
            );
    }
}



// Hàm điền dữ liệu vào bộ lọc sản phẩm
function populateProductFilter(data) {
    const select = $('#fillter_btp');
    select.empty().append('<option value="">Chọn...</option>');

    const uniqueNames = [...new Set(
        data
            .map(i => i.item_product_name)
            .filter(Boolean)
    )];

    uniqueNames.forEach(name => {
        select.append(`<option value="${name}">${name}</option>`);
    });
}
// Click vào ô (slot)
$(document).on('click', '.slot', function () {
    const $slot = $(this);
    const id = $slot.data('id')
    const position = $slot.data('position');
    const name = $slot.data('name');
    const code = $slot.data('code');
    const nsx = $slot.data('nsx');
    const hsd = $slot.data('hsd');

    // Ô TRỐNG
    if (!name) {
        // Đổ dữ liệu vào modal insert
        $('#modal-insert-slot input').val('');
        $('#modal-insert-slot input[placeholder="A..."]').val(position);
        $('#modal-insert-slot input[name="action"]').val('in');
        $('#modal-insert-slot .modal-title')
            .text('Cất BTP Lên Kệ ' + position);
        $('#modal-insert-slot input#id-location').val(id)
        // $('#modal-insert-slot input[name="position"]').attr('data-position', position);
        $('#modal-insert-slot input[name="position"]').val(position)
        const modalInsert = new bootstrap.Modal(
            document.getElementById('modal-insert-slot')
        );
        modalInsert.show();
    }
    // Ô CÓ CAO SU
    else {
        $('#modal-clear-slot input#clear-position').val(position);
        $('#modal-clear-slot input#clear-item-production-code').val(code);
        $('#modal-clear-slot input#clear-item-production-name').val(name);
        $('#modal-clear-slot input#clear-nsx').val(nsx);
        $('#modal-clear-slot input#clear-hsd').val(hsd);
        $('#modal-clear-slot input#clear-nsx-view').val(toDDMMYYYY(nsx));
        $('#modal-clear-slot input#clear-hsd-view').val(toDDMMYYYY(hsd));
        $('#modal-clear-slot input#clear-id').val(id);
        const modalClear = new bootstrap.Modal(
            document.getElementById('modal-clear-slot')
        );
        modalClear.show();
    }
});
function filter_btp(element) {
    const selectedName = $(element).val();
    const $resultsSection = $('#filtered-results-section');
    const $tableBody = $('#fifo-table-body');

    // Reset toàn bộ trạng thái
    $('.slot').removeClass('dimmed highlight fifo-allowed');

    if (!selectedName) {
        $resultsSection.addClass('d-none');
        $tableBody.empty();
        return;
    }

    const today = moment().startOf('day');

    // Lấy data theo SP
    let filteredData = Object.values(warehouseCache)
        .map(i => JSON.parse(i))
        .filter(i => i.item_product_name === selectedName);

    if (filteredData.length === 0) {
        $resultsSection.addClass('d-none');
        return;
    }

    // Chia nhóm
    let expiredSlots = filteredData.filter(i =>
        i.item_product_expiry &&
        moment(i.item_product_expiry).diff(today, 'days') < 0
    );

    let validSlots = filteredData.filter(i =>
        i.item_product_expiry &&
        moment(i.item_product_expiry).diff(today, 'days') >= 0
    );

    // Sort slot còn hạn theo FIFO
    validSlots.sort((a, b) =>
        new Date(a.item_product_expiry) - new Date(b.item_product_expiry)
    );

    // Slot còn hạn DUY NHẤT được phép xuất
    // HSD gần nhất (FIFO)
    const fifoNearestExpiry = validSlots.length
        ? moment(validSlots[0].item_product_expiry).format('YYYY-MM-DD')
        : null;

    let tight_fifo = true; // FIFO CHẶT
    // ===== GRID =====
    $('.slot')
        .removeClass('dimmed highlight fifo-allowed highlight-expired')
        .addClass('dimmed');

    // Chỉ xử lý slot thuộc SP đang filter
    filteredData.forEach(item => {
        const $slot = $('#slot-' + item.position.replaceAll('-', '_'));

        if (!tight_fifo) {
            // FIFO MỞ → slot thuộc SP đều click được + highlight
            $slot
                .removeClass('dimmed')
                .addClass('fifo-allowed highlight');
        }
    });

    // FIFO CHẶT
    if (tight_fifo) {

        // Slot hết hạn → click + highlight đỏ
        expiredSlots.forEach(i => {
            $('#slot-' + i.position.replaceAll('-', '_'))
                .removeClass('dimmed')
                .addClass('fifo-allowed highlight-expired');
        });

        // Slot còn hạn có HSD = HSD gần nhất → cho xuất
        validSlots.forEach(i => {
            const expiry = moment(i.item_product_expiry).format('YYYY-MM-DD');
            if (expiry === fifoNearestExpiry) {
                $('#slot-' + i.position.replaceAll('-', '_'))
                    .removeClass('dimmed')
                    .addClass('fifo-allowed highlight');
            }
        });
    }
    // ===== TABLE =====
    $tableBody.empty();

    filteredData
        .sort((a, b) => {
            if (!a.item_product_expiry) return 1;
            if (!b.item_product_expiry) return -1;
            return new Date(a.item_product_expiry) - new Date(b.item_product_expiry);
        })
        .forEach(item => {
            const expiry = moment(item.item_product_expiry);
            const diffDays = expiry.diff(today, 'days');

            let hsdDisplay = '';
            if (diffDays < 0) {
                hsdDisplay = `Đã hết hạn (${Math.abs(diffDays)} ngày)`;
            } else if (diffDays === 0) {
                hsdDisplay = `Hết hạn hôm nay`;
            } else {
                hsdDisplay = `Còn ${diffDays} ngày`;
            }

            const bgClass = getBgClass(item.item_product_name, item.item_product_expiry);

            const isExpired = diffDays < 0;
            const isNearestExpiry =
                fifoNearestExpiry &&
                moment(item.item_product_expiry).format('YYYY-MM-DD') === fifoNearestExpiry;

            const canExport = tight_fifo
                ? (isExpired || isNearestExpiry)
                : true;
            const alertMsg = 'Slot này không thể xuất vì không phải HSD gần nhất';
            $tableBody.append(`
                <tr>
                    <td class="ps-3 fw-bold text-primary">${item.position}</td>
                    <td>${item.item_product_name}</td>
                    <td>
                        <span class="badge ${bgClass}">${hsdDisplay}</span>
                        <small class="text-muted d-block">${expiry.format('DD/MM/YYYY')}</small>
                    </td>
                    <td class="text-center">
                        <button class="btn btn-sm rounded-pill px-3
                            ${canExport ? 'btn-outline-primary' : 'btn-outline-secondary'}"
                            onclick="${
                                canExport
                                    ? `triggerSlotClick('${item.position}')`
                                    : `alert('${alertMsg}')`
                            }">
                            <i class="fa fa-sign-out me-1"></i> Xuất
                        </button>
                    </td>
                </tr>
            `);
        });

    $resultsSection.removeClass('d-none');
}


// Hàm phụ để kích hoạt sự kiện click vào ô từ table
function triggerSlotClick(position) {
    const slotId = '#slot-' + position.replaceAll('-', '_');
    $(slotId).click();
}

function clear_filter() {
    $('#fillter_btp').val('');
    $('.slot').removeClass('dimmed highlight');
    $('#filtered-results-section').addClass('d-none');
    $('#fifo-table-body').empty();
}
// Thiết lập vòng lặp 5 giây
$(document).ready(function () {
    fetchWarehouseData(); // Gọi ngay lần đầu khi load trang

    setInterval(function () {
        fetchWarehouseData();
    }, 5000); // 5000ms = 5 giây
});


// modal insert
function clean_data(element) {
    element.value = "";
}
function check_position(element) {
    let position = element.value.trim();
    if (position !== $('#insert-position').val().slice(0, 1)) {
        alert("Vị trí không khớp.");
        element.value = "";
    }
}
function check_worker(element) {
    let worker_code = element.value.trim()
    const action = element.dataset.action
    if (worker_code.startsWith("OP")) {
        // element.value = worker_code.slice(3)
        $.ajax({
            url: API_GET_WORKER,
            type: 'GET',
            dataType: 'json',
            success: function (response) {
                if (response.status === "success") {
                    const worker = response.data.find(i => i.operatorNo === worker_code.slice(3));
                    if (worker) {
                        switch (action) {
                            case "insert":
                                $(element).val(worker_code.slice(3));
                                $('#insert-worker-name').val(worker.name);
                                break;
                            case "clean":
                                $(element).val(worker_code.slice(3));
                                $('#clean-worker-name').val(worker.name);
                                break;
                        }
                    } else {
                        alert("Không tìm thấy công nhân.");
                        $('#insert-worker-code').val("");
                    }
                } else {
                    alert("Lỗi: " + response.message);
                }
            },
            error: function (xhr, status, error) {
                alert("Đã xảy ra lỗi khi lấy thông tin công nhân.");
            }
        })
    } else {
        alert("Mã công nhân không hợp lệ! Mã công nhân phải bắt đầu bằng 'OP'");
        $(element).val('');
    }
}


function get_label_info(element) {
    let label_code = element.value.trim()
    if (label_code.startsWith("WO")) {
        $.ajax({
            url: API_GET_LABEL_INFO.replace('LABEL_CODE', label_code),
            type: 'GET',
            dataType: 'json',
            success: function (response) {
                if (response.status === "success") {
                    // clear data old
                    $('#insert-name').val('')
                    $('#insert-nsx-view').val('');
                    $('#insert-nsx').val('');
                    $('#insert-hsd-view').val('');
                    $('#insert-hsd').val('');
                    // set data new
                    $('#insert-name').val(response.data.name);
                    $('#insert-nsx-view').val(toDDMMYYYY(response.data.finish));
                    $('#insert-nsx').val(response.data.finish.split('T')[0]);
                    $.ajax({
                        url: API_GET_ITEM_PRODUCT_EXPIRY.replace('PRODUCT_CODE', response.data.code),
                        type: 'GET',
                        dataType: 'json',
                        success: function (resp) {
                            if (resp.status === "success") {
                                const finishStr = response.data.finish.split('T')[0];
                                const expireDay = parseInt(resp.data.expireDay);
                                let d = new Date(finishStr);
                                d.setDate(d.getDate() + expireDay);
                                $('#insert-hsd-view').val(toDDMMYYYY(d.toISOString().split('T')[0]));
                                $('#insert-hsd').val(d.toISOString().split('T')[0]);
                            } else {
                                alert("Lỗi: " + resp.message);
                            }
                        },
                        error: function (xhr, status, error) {
                            alert("Đã xảy ra lỗi khi lấy thông tin hạn sử dụng.");
                        }
                    })
                    // $('#insert-hsd').val(response.data.item_product_expiry);
                } else {
                    $('#insert-code').val('');
                    alert("Lỗi: " + response.message);
                }
            },
            error: function (xhr, status, error) {
                alert("Mã Tem không tồn tại!");
                $('#insert-code').val('');
            }
        });
    } else {
        alert("Mã tem không hợp lệ! Mã tem phải bắt đầu bằng 'WO'");
        element.value = "";
    }
}
function submit_in() {
    // console.log($('#form-in-btp').serialize());
    let position = $('#position_scan').val().trim();
    let tem_code = $('#insert-code').val().trim();
    let worker_code = $('#insert-worker-code').val().trim();
    const checks = [
        { value: position, message: 'Vui lòng scan vị trí!' },
        { value: tem_code, message: 'Vui lòng scan mã tem!' },
        { value: worker_code, message: 'Vui lòng nhập mã công nhân!' },
    ];
    for (const item of checks) {
        if (!item.value) {
            showNotify('info', item.message);
            return;
        }
    }
    $.ajax({
        url: API_UPDATE_LOCATION,
        type: 'POST',
        data: $('#form-in-btp').serialize(),
        success: function (response) {
            if (response.status === "success") {
                // alert("Cất BTP thành công!");
                showNotify(response.status, response.message);
                $('#modal-insert-slot').modal('hide');
                fetchWarehouseData(); // Tải lại dữ liệu kho
            } else {
                showNotify(response.status, response.message);
            }
        },
        error: function (xhr, status, error) {
            alert("Đã xảy ra lỗi khi cất BTP.");
        }
    });
}

// modal out
function check_item_product_out(element) {
    const item_product_code = $('#clear-item-production-code').val();
    const item_product_code_scan = element.value.trim();
    if (item_product_code_scan !== item_product_code) {
        alert('Mã tem không đúng mã cần xuất!');
        element.value = '';
    }
}
function submit_out() {
    var item_product_code_scan = $('#clear-item-production-code-scan').val();
    var worker_code = $('#clean-worker-code').val();
    const checks = [
        { value: item_product_code_scan, message: 'Vui lòng scan mã tem!' },
        { value: worker_code, message: 'Vui lòng scan mã công nhân!' },
    ];

    for (const item of checks) {
        if (!item.value) {
            showNotify('info', item.message);
            return;
        }
    }
    // console.log($('#form-out-btp').serialize());
    $.ajax({
        url: API_UPDATE_LOCATION,
        type: 'POST',
        data: $('#form-out-btp').serialize(),
        success: function (response) {
            if (response.status === "success") {
                showNotify(response.status, response.message);
                $('#clear-item-production-code-scan').val('');
                $('#clean-worker-code').val('');
                $('#clean-worker-name').val('');
                $('#modal-clear-slot').modal('hide');
                fetchWarehouseData(); // Tải lại dữ liệu kho
            } else {
                showNotify('error', response.message);
            }
        }
    });
}