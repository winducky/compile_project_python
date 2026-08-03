if ('scrollRestoration' in history) {
    // history.scrollRestoration = 'manual'; // Tắt tính năng khôi phục cuộn tự động
    history.scrollRestoration = 'auto'; // Bật tính năng khôi phục cuộn tự động
}

// // Cuộn trang về tọa độ (0, 0) - tức là đầu trang
// window.onload = function () {
//     window.scrollTo(0, 0);
// };
document.addEventListener("DOMContentLoaded", function () {
    let title = document.title;
    let space = "     "; // khoảng cách giữa 2 vòng lặp
    let pos = 0;

    // function scrollTitle() {
    //     document.title = title.slice(pos) + space + title.slice(0, pos);
    //     pos = (pos + 1) % (title.length + space.length);
    // }

    // setInterval(scrollTitle, 50); // tốc độ chạy (ms)
    AOS.init({
        offset: 10,
        easing: 'ease-in-out',
        // once: true // hoặc false nếu muốn lặp
    });
    // AOS.refresh(); // đảm bảo các element sẵn trong viewport animate
    AOS.refreshHard();
    // Khởi tạo tooltip cho các thẻ có data-bs-toggle="tooltip"
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    })
    
});
function scrollToSection(id) {
    const target = document.querySelector(id);
    const navbar = document.querySelector('nav');
    const navHeight = navbar.offsetHeight;
    const rect = target.getBoundingClientRect();
    const scrollTop = window.pageYOffset + rect.top - navHeight;
    window.scrollTo({ top: scrollTop, behavior: 'smooth' });
}
// Fix lỗi khi click vào nút đóng modal để đóng modal
$(document).on('click', '[data-bs-dismiss="modal"]', function() {
    // Bỏ focus khỏi nút
    this.blur();
});
document.addEventListener('pointerdown', () => {
    document.activeElement?.blur();
}, true);




// Khởi tạo lại tooltip sau khi modal được hiển thị
// $(document).on('shown.bs.modal', '.modal', function() {
    // initTooltips(this);
// });

// Định dạng ngày tháng năm giờ phút giây
function formatDate(dateInput, format = "dd/MM/yyyy hh:mm:ss") {
    const d = new Date(dateInput);
    if (isNaN(d)) return "";
    const pad = n => n.toString().padStart(2, '0');
    const replacements = {
        dd: pad(d.getDate()),
        MM: pad(d.getMonth() + 1),
        yyyy: d.getFullYear(),
        hh: pad(d.getHours()),
        mm: pad(d.getMinutes()), // phút
        ss: pad(d.getSeconds())
    };
    return format.replace(/dd|MM|yyyy|hh|mm|ss/g, match => replacements[match]);
}
function toDDMMYYYY(value) {
    if (!value) return '';

    const d = new Date(value);
    if (isNaN(d)) return '';

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
}