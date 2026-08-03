// Lấy PX từ URL
const path = window.location.pathname;
const parts = path.split('/').filter(Boolean);
const pxCode = parts[parts.length - 1];
let warehouseCache = {}; // Bộ nhớ đệm để so sánh dữ liệu cũ
let productNameCache = new Set();
let isFiltering = false;
let currentFilterProduct = null;
let itemProductHistory = null;
let dataWarehouse = null;
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
            dataWarehouse = response.data;
            // ===== GRID =====
            if (Object.keys(warehouseCache).length === 0) {
                renderWarehouse(response.data);
            } else {
                response.data.forEach(item => {
                    updateSlotIfChanged(item);
                });
            }

            // ===== FILTER PRODUCT =====
            updateProductFilterIfChanged(response.data);

            // ===== UPDATE CACHE =====
            response.data.forEach(item => {
                warehouseCache[item.position] = JSON.stringify(item);
            })

            // 🔥 RE-FILTER nếu đang filter
            if (isFiltering && currentFilterProduct) {
                filter_btp(currentFilterProduct);
            } else {
                applyDefaultSlotRule();
            }

        }
    });
}
function updateProductFilterIfChanged(data) {
    const newNames = new Set(
        data
            .map(i => i.item_product_name)
            .filter(Boolean)
    );

    let changed = false;

    if (newNames.size !== productNameCache.size) {
        changed = true;
    } else {
        for (let name of newNames) {
            if (!productNameCache.has(name)) {
                changed = true;
                break;
            }
        }
    }

    if (changed) {
        productNameCache = newNames;
        populateProductFilter(data);
    }
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
                        data-hsd="${slot.item_product_expiry || ''}"
                        data-qty="${slot.item_product_qty || ''}"
                        data-unit="${slot.item_product_unit || ''}"
                        data-pack="${slot.item_product_pack || ''}"
                        data-has-item="${slot.item_product_name ? '1' : '0'}">
                        <div class="fw-bold text-center fs-6">${slot.position}</div>
                        <div class="slot-content d-flex flex-column justify-content-center align-items-center text-center h-100 pb-2">
                            ${slot.item_product_name
                        ? `<div class="fs-5 fw-bold">SP: ${slot.item_product_name}</div><div>Mẻ: ${slot.item_product_pack}</div><div>SL: ${slot.item_product_qty} ${slot.item_product_unit}</div><div>${hsdDays} ngày</div><div>NSX: ${nsxView}</div><div>HSD: ${hsdView}</div>`
                        : '<div class="fs-3">Trống</div>'}
                        </div>
                    </div>
                `;
            }
        }

        html += `</div></div>`;
        container.append(html);
    });
    applyDefaultSlotRule();
}
function getMinPack(packStr) {
    if (!packStr) return Number.MAX_SAFE_INTEGER;
    return Math.min(
        ...packStr
            .split(',')
            .map(p => parseInt(p.trim(), 10))
            .filter(n => !isNaN(n))
    );
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

    // Thay thế dấu gạch ngang trong ID để selector JQuery không bị lỗi
    const safeId = slot.position.replaceAll('-', '_');
    const $slot = $('#slot-' + safeId);
    if (!$slot.length) return;

    const hasItem = !!slot.item_product_name;
    const bgClass = getBgClass(slot.item_product_name, slot.item_product_expiry);

    // Cập nhật giao diện và dữ liệu
    $slot
        .removeClass('bg-success bg-warning bg-danger bg-secondary dimmed highlight fifo-allowed highlight-expired')
        .addClass(bgClass)
        .attr({
            'data-name': slot.item_product_name || '', // QUAN TRỌNG: Phải cập nhật lại cái này
            'data-code': slot.item_product_code || '',
            'data-nsx': slot.item_product_date || '',
            'data-hsd': slot.item_product_expiry || '',
            'data-qty': slot.item_product_qty || '',
            'data-unit': slot.item_product_unit || '',
            'data-pack': slot.item_product_pack || '',
            'data-has-item': hasItem ? '1' : '0'
        });

    // Xử lý logic click dựa trên trạng thái Filter
    // if (!isFiltering) {
    if (hasItem) {
        // Có hàng -> Không cho click (để chờ xuất qua filter FIFO)
        $slot.css('pointer-events', 'none');
    } else {
        // Trống -> Cho phép click để IN (Cất hàng)
        $slot.css('pointer-events', 'auto');
    }
    // }

    // Cập nhật nội dung hiển thị
    const nsxView = slot.item_product_date ? moment(slot.item_product_date).format('DD/MM/YYYY') : '';
    const hsdView = slot.item_product_expiry ? moment(slot.item_product_expiry).format('DD/MM/YYYY') : '';
    const hsdDays = slot.item_product_expiry ? moment(slot.item_product_expiry).diff(moment().startOf('day'), 'days') : 0;

    $slot.find('.slot-content').html(
        hasItem
            ? `<div class="fs-5 fw-bold">SP: ${slot.item_product_name}</div>
               <div>Mẻ: ${slot.item_product_pack}</div>
               <div>SL: ${slot.item_product_qty} ${slot.item_product_unit}</div>
               <div>${hsdDays} ngày</div>
               <div>NSX: ${nsxView}</div>
               <div>HSD: ${hsdView}</div>`
            : '<div class="fs-3">Trống</div>'
    );
}
// Hàm áp dụng quy tắc mặc định cho slot
function applyDefaultSlotRule() {
    if (isFiltering) return;

    $('.slot').each(function () {
        // Lấy trực tiếp từ attr để đảm bảo giá trị mới nhất
        const hasItem = $(this).attr('data-has-item') === '1';

        if (hasItem) {
            $(this).css('pointer-events', 'none');
        } else {
            $(this).css('pointer-events', 'auto');
        }
    });
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

    // 🚨 slot đang bị khóa bởi filter → không cho click
    if ($slot.hasClass('dimmed')) return;

    const hasItem = $slot.attr('data-has-item') === '1';

    const id = $slot.data('id');
    const position = $slot.data('position');

    if (!hasItem) {
        // ===== IN =====
        $('#modal-insert-slot input').val('');
        $('#modal-insert-slot input[placeholder="A..."]').val(position);
        $('#modal-insert-slot input[name="action"]').val('in');
        $('#modal-insert-slot .modal-title')
            .text('Cất BTP Lên Kệ ' + position);
        $('#modal-insert-slot input#id-location').val(id);
        $('#modal-insert-slot input[name="position"]').val(position);

        new bootstrap.Modal(
            document.getElementById('modal-insert-slot')
        ).show();
    } else {
        // ===== OUT =====
        $('#modal-clear-slot input#clear-position').val(position);
        $('#modal-clear-slot input#clear-item-production-code').val($slot.data('code'));
        $('#modal-clear-slot input#clear-item-production-name').val($slot.data('name'));
        $('#modal-clear-slot input#clear-nsx').val($slot.data('nsx'));
        $('#modal-clear-slot input#clear-hsd').val($slot.data('hsd'));
        $('#modal-clear-slot input#clear-nsx-view').val(toDDMMYYYY($slot.data('nsx')));
        $('#modal-clear-slot input#clear-hsd-view').val(toDDMMYYYY($slot.data('hsd')));
        $('#modal-clear-slot input#clear-id').val(id);
        $('#modal-clear-slot input#clear-item-production-qty').val($slot.data('qty'));
        $('#modal-clear-slot input#clear-item-production-unit').val($slot.data('unit'));
        $('#modal-clear-slot input#clear-item-production-pack').val($slot.data('pack'));

        new bootstrap.Modal(
            document.getElementById('modal-clear-slot')
        ).show();
    }
});

function filter_btp(elementOrValue) {
    isFiltering = true;
    $('#clear-fillter').prop('disabled', false);
    let selectedName = (typeof elementOrValue === 'string') ? elementOrValue : $(elementOrValue).val();
    currentFilterProduct = selectedName;

    const $resultsSection = $('#filtered-results-section');
    const $tableBody = $('#fifo-table-body');

    // 1. Reset tất cả các ô về trạng thái mặc định của Filter (mờ và khóa)
    $('.slot')
        .removeClass('highlight fifo-allowed highlight-expired')
        .addClass('dimmed')
        .css('pointer-events', 'none');

    if (!selectedName) {
        $resultsSection.addClass('d-none');
        $tableBody.empty();
        clear_filter(); // Trở về trạng thái bình thường nếu không chọn SP
        return;
    }

    const today = moment().startOf('day');
    let filteredData = Object.values(warehouseCache)
        .map(i => JSON.parse(i))
        .filter(i => i.item_product_name === selectedName);

    if (filteredData.length === 0) {
        $resultsSection.addClass('d-none');
        return;
    }

    // Phân loại và tìm FIFO Target
    let expiredSlots = filteredData.filter(i => i.item_product_expiry && moment(i.item_product_expiry).isBefore(today));
    let validSlots = filteredData.filter(i => i.item_product_expiry && !moment(i.item_product_expiry).isBefore(today));

    validSlots.sort((a, b) => {
        const expDiff = new Date(a.item_product_expiry) - new Date(b.item_product_expiry);
        return expDiff !== 0 ? expDiff : getMinPack(a.item_product_pack) - getMinPack(b.item_product_pack);
    });

    const fifoTarget = validSlots.length ? validSlots[0] : null;
    let tight_fifo = true;

    // 2. Xử lý logic Click và Highlight
    if (tight_fifo) {
        // Hết hạn -> Cho phép xuất
        expiredSlots.forEach(i => {
            $('#slot-' + i.position.replaceAll('-', '_'))
                .removeClass('dimmed')
                .addClass('fifo-allowed highlight-expired')
                .css('pointer-events', 'auto'); // Mở khóa để click xuất
        });

        // FIFO Target (Cận hạn nhất) -> Cho phép xuất
        if (fifoTarget) {
            $('#slot-' + fifoTarget.position.replaceAll('-', '_'))
                .removeClass('dimmed')
                .addClass('fifo-allowed highlight')
                .css('pointer-events', 'auto'); // Mở khóa để click xuất
        }
    } else {
        // Nếu là FIFO MỞ: Tất cả SP được chọn đều click được
        filteredData.forEach(item => {
            $('#slot-' + item.position.replaceAll('-', '_'))
                .removeClass('dimmed')
                .addClass('fifo-allowed highlight')
                .css('pointer-events', 'auto');
        });
    }
    // ===== TABLE =====
    $tableBody.empty();

    filteredData
        .sort((a, b) => {
            const today = moment().startOf('day');

            const aExpired = moment(a.item_product_expiry).diff(today, 'days') < 0;
            const bExpired = moment(b.item_product_expiry).diff(today, 'days') < 0;

            // 1️⃣ Hết hạn lên trước
            if (aExpired !== bExpired) {
                return aExpired ? -1 : 1;
            }

            // 2️⃣ HSD tăng dần
            const expDiff =
                new Date(a.item_product_expiry) - new Date(b.item_product_expiry);
            if (expDiff !== 0) return expDiff;

            // 3️⃣ Cùng HSD → pack nhỏ trước
            return getMinPack(a.item_product_pack) - getMinPack(b.item_product_pack);
        })

        .forEach(item => {
            const product_date = moment(item.item_product_date);
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
            const isTargetFIFO =
                fifoTarget && item.position === fifoTarget.position;

            const canExport = tight_fifo
                ? (isExpired || isTargetFIFO)
                : true;

            const alertMsg = 'Slot này không thể xuất vì không phải HSD gần nhất';

            $tableBody.append(`
                <tr>
                    <td class="ps-3 fw-bold text-primary">${item.position}</td>
                    <td class="text-center">
                        <div class="fw-bold">${item.item_product_name}</div>
                        <small>${item.item_product_pack}</small><i>-</i><small>${item.item_product_qty}${item.item_product_unit}</small>
                    </td>
                    <td class="text-center">
                        <span class="badge ${bgClass}">${hsdDisplay}</span>
                        <div>
                            <small class="text-muted">${product_date.format('DD/MM/YYYY')}</small><i>-</i>
                            <small class="text-muted">${expiry.format('DD/MM/YYYY')}</small>
                        </div>
                    </td>
                    <td class="text-center">
                        <button
                            type="button"
                            class="btn btn-sm rounded-pill px-3
                                ${canExport ? 'btn-outline-primary' : 'btn-outline-secondary'}"
                            onclick="${canExport
                    ? `triggerSlotClick('${item.position}')`
                    : `showPrompt('${alertMsg}')`
                }">
                            <i class="fa fa-sign-out me-1"></i> Xuất
                        </button>
                    </td>
                </tr>
            `);

        });

    $resultsSection.removeClass('d-none');
    window.showPrompt = function (alertMsg) {
        const value = prompt(alertMsg);
        console.log('Giá trị nhập:', value);
    };
}


// Hàm phụ để kích hoạt sự kiện click vào ô từ table
function triggerSlotClick(position) {
    const slotId = '#slot-' + position.replaceAll('-', '_');
    $(slotId).click();
}

function clear_filter() {
    isFiltering = false;
    currentFilterProduct = null;
    $('#clear-fillter').prop('disabled', true);
    fetchWarehouseData()
    $('#fillter_btp').val('');
    $('#filtered-results-section').addClass('d-none');
    $('#fifo-table-body').empty();
    applyDefaultSlotRule();
    $('.slot').each(function () {
        const name = $(this).data('name');

        $(this)
            .removeClass('dimmed highlight fifo-allowed highlight-expired');

        if (name) {
            // ❌ slot có hàng → KHÓA
            $(this).css('pointer-events', 'none');
        } else {
            // ✅ slot trống → cho click (IN)
            $(this).css('pointer-events', 'auto');
        }
    });
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
    const action = $(element)
        .parent().parent().parent()
        .find('input[name="action"]')
        .val();
    if (action == "in" && element.name == "item_product_code") {
        $('#form-pack-used').addClass('d-none');
        $('#form-pack-used').removeClass('d-block');
        // clear các input trong form #form-in-btp
        $('#form-in-btp #insert-item-product-pack-used').val('');
        $('#form-in-btp #insert-item-product-name').val('');
        $('#form-in-btp #insert-item-product-qty').val('');
        $('#form-in-btp #insert-item-product-unit').val('');
        $('#form-in-btp #insert-item-product-pack').val('');
        $('#form-in-btp #insert-item-product-date').val('');
        $('#form-in-btp #insert-item-product-date-view').val('');
        $('#form-in-btp #insert-item-product-expiry').val('');
        $('#form-in-btp #insert-item-product-expiry-view').val('');
    }
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
function update_pack_used(element) {
    const max = parseInt(element.max);
    let val = parseInt(element.value);

    if (val > max) {
        element.value = max;
    }
    let item_product_pack = itemProductHistory.item_product_pack;
    let item_product_qty = itemProductHistory.item_product_qty;
    let item_product_unit = itemProductHistory.item_product_unit;
    if (element.value != "") {
        $('#insert-item-product-qty').val(item_product_qty / max * (max - element.value));
        let list = item_product_pack.split(',');
        let current = Number(element.value);

        let result = list.slice(current).join(',');

        $('#insert-item-product-pack').val(result);

    } else {
        $('#insert-item-product-qty').val(item_product_qty);
        $('#insert-item-product-pack').val(item_product_pack);
    }
}
function get_label_info(element) {
    let label_code = element.value.trim()
    if (label_code.startsWith("WO")) {
        let split = label_code.split('*');
        let product_name = split[1];
        let item_product_pack = split[2];
        let item_product_qty = split[3];
        let item_product_unit = split[4];
        function formatDateVN(dateStr) {
            const d = new Date(dateStr);
            const dd = String(d.getDate()).padStart(2, '0');
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const yyyy = d.getFullYear();
            return `${dd}/${mm}/${yyyy}`;
        }
        let item_product_date = formatDateVN(split[5]);
        let item_product_expiry = formatDateVN(split[6]);
        if (dataWarehouse.some(item => item.item_product_code === label_code)) {
            showNotify("warning", "Đã tồn tại BTP phẩm này trên kệ!")
            element.value = "";
            return
        }
        $.ajax({
            url: API_CHECK_IN_NEW_OR_RETURN,
            type: 'POST',
            dataType: 'json',
            data: {
                dept: pxCode,
                item_product_code: label_code
            },
            success: function (response) {
                if (response.status === "success") {
                    // return
                    $('#form-pack-used').removeClass('d-none');
                    $('#form-pack-used').addClass('d-block');
                    $('#insert-item-product-pack-used').attr('max', response.data.item_product_pack.split(',').length);
                    $('#insert-item-product-name').val(response.data.item_product_name);
                    $('#insert-item-product-qty').val(response.data.item_product_qty);
                    $('#insert-item-product-pack').val(response.data.item_product_pack);
                    $('#insert-item-product-unit').val(response.data.item_product_unit);
                    $('#insert-item-product-date').val(response.data.item_product_date);
                    $('#insert-item-product-date-view').val(formatDateVN(response.data.item_product_date));
                    $('#insert-item-product-expiry').val(response.data.item_product_expiry);
                    $('#insert-item-product-expiry-view').val(formatDateVN(response.data.item_product_expiry));
                    itemProductHistory = response.data;
                } else {
                    //new
                    $('#form-pack-used').removeClass('d-block');
                    $('#form-pack-used').addClass('d-none');
                    $('#insert-item-product-name').val(product_name);
                    $('#insert-item-product-pack').val(item_product_pack);
                    $('#insert-item-product-qty').val(item_product_qty);
                    $('#insert-item-product-unit').val(item_product_unit);
                    $('#insert-item-product-date').val(split[5]);
                    $('#insert-item-product-date-view').val(item_product_date);
                    $('#insert-item-product-expiry').val(split[6]);
                    $('#insert-item-product-expiry-view').val(item_product_expiry);
                }
            },
            error: function (xhr, status, error) {
                showNotify("error", "Đã xảy ra lỗi khi lấy thông tin sản phẩm.");
            }
        })
    } else {
        showNotify("error", "Mã tem không hợp lệ! Mã tem phải bắt đầu bằng 'WO'");
        element.value = "";
    }
}
function submit_in() {
    // console.log($('#form-in-btp').serialize());
    let position = $('#position_scan').val().trim();
    let tem_code = $('#insert-code').val().trim();
    let worker_code = $('#insert-worker-code').val().trim();
    let item_product_pack_used = $('#insert-item-product-pack-used').val().trim();
    const checks = [
        { value: position, message: 'Vui lòng scan vị trí!' },
        { value: tem_code, message: 'Vui lòng scan mã tem!' },
        { value: worker_code, message: 'Vui lòng nhập mã công nhân!' },
    ];
    if ($('#form-pack-used').hasClass('d-block')) {
        if (item_product_pack_used === '') {
            showNotify('info', 'Vui lòng nhập số mẻ đã sửa dụng!');
            return;
        }
    }
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
    $.ajax({
        url: API_UPDATE_LOCATION,
        type: 'POST',
        data: $('#form-out-btp').serialize(),
        success: function (response) {
            if (response.status === "success") {
                showNotify(response.status, response.message);

                const position = $('#clear-position').val();
                const slotId = '#slot-' + position.replaceAll('-', '_');
                const $slot = $(slotId);

                // 🔥 UPDATE UI NGAY – KHÔNG CHỜ FETCH
                $slot
                    .removeClass('bg-success bg-warning bg-danger dimmed highlight fifo-allowed highlight-expired')
                    .addClass('bg-secondary')
                    .attr({
                        'data-name': '',
                        'data-code': '',
                        'data-nsx': '',
                        'data-hsd': '',
                        'data-qty': '',
                        'data-unit': '',
                        'data-pack': '',
                        'data-has-item': '0'
                    })
                    .css('pointer-events', 'auto');

                $slot.find('.slot-content').html('<div class="fs-3">Trống</div>');

                // Reset modal
                $('#clear-item-production-code-scan').val('');
                $('#clean-worker-code').val('');
                $('#clean-worker-name').val('');
                $('#modal-clear-slot').modal('hide');
                
                // 🔥 Nếu đang filter thì kiểm tra còn lô nào không
                if (isFiltering && currentFilterProduct) {
                    const stillExists = dataWarehouse.some(
                        i => i.item_product_name === currentFilterProduct
                    );

                    if (!stillExists) {
                        clear_filter(); // ❗ tự động thoát filter
                        return; // tránh fetch lại bị filter tiếp
                    }
                }

                // Sync lại data nền
                fetchWarehouseData();
            } else {
                showNotify('error', response.message);
            }
        }
    });
}