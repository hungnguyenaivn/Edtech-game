import type { WorldBank } from "./types";

const bank: WorldBank = {
  slug: "cyber-world",
  levels: [
    // ===== LEVEL 1: Thuật toán và trình tự =====
    {
      title: "Thuật toán và trình tự",
      questions: [
        ["m", "Dãy các bước rõ ràng, làm lần lượt để giải quyết một việc được gọi là gì?", ["Một con robot", "Thuật toán", "Một loại trò chơi", "Một bộ phận của máy tính"], 1, "Thuật toán là danh sách các bước rõ ràng, làm lần lượt để giải quyết một việc, giống như công thức nấu ăn."],
        ["m", "Làm các việc theo thứ tự trước – sau rõ ràng gọi là gì?", ["Ngẫu nhiên", "Lộn xộn", "Trình tự", "Dừng lại"], 2, "Trình tự là làm việc nào trước, việc nào sau theo đúng thứ tự."],
        ["t", "Nếu đảo thứ tự các bước, kết quả có thể bị sai.", true, "Đúng rồi! Mặc áo rồi mới đeo cặp khác với đeo cặp rồi mới mặc áo. Thứ tự rất quan trọng."],
        ["m", "Chương trình máy tính là gì?", ["Một bức ảnh", "Một loại dây cáp", "Một chiếc loa", "Tập hợp các lệnh để máy tính làm theo"], 3, "Chương trình là các lệnh được viết ra để máy tính làm theo từng bước."],
        ["m", "Người viết chương trình cho máy tính được gọi là gì?", ["Lập trình viên", "Thợ điện", "Đầu bếp", "Phi công"], 0, "Lập trình viên là người viết các lệnh để máy tính làm việc."],
        ["t", "Máy tính làm đúng theo từng lệnh mà ta viết, không tự đoán ý của ta.", true, "Máy tính rất 'nghe lời': ta viết gì nó làm đúng như vậy, nên lệnh phải rõ ràng."],
        ["m", "Robot nhận lệnh: 'Tiến 2 bước, rẽ phải, tiến 1 bước'. Robot làm gì đầu tiên?", ["Rẽ phải", "Tiến 1 bước", "Tiến 2 bước", "Dừng lại"], 2, "Robot làm lần lượt từ trên xuống, nên lệnh đầu tiên là 'Tiến 2 bước'."],
        ["m", "Muốn ăn mì gói, bước nào nên làm NGAY TRƯỚC khi đổ nước sôi vào?", ["Ăn mì", "Cho mì vào bát", "Rửa bát", "Tắt bếp"], 1, "Phải cho mì vào bát trước rồi mới đổ nước sôi vào."],
        ["t", "Một bài toán chỉ có đúng một thuật toán duy nhất để giải.", false, "Một bài toán thường có nhiều cách giải khác nhau, tức là có nhiều thuật toán."],
        ["m", "Sơ đồ khối (lưu đồ) dùng để làm gì?", ["Trang trí máy tính", "Vẽ các bước của thuật toán bằng hình", "Sửa máy tính", "Phát nhạc"], 1, "Sơ đồ khối dùng các hình và mũi tên để vẽ ra các bước của thuật toán cho dễ nhìn."],
        ["m", "Lệnh 'In ra: Xin chào' sẽ làm máy tính làm gì?", ["Tắt máy", "Xoá tệp", "Gọi điện", "Hiện dòng chữ Xin chào"], 3, "Lệnh 'In ra' khiến máy tính hiển thị nội dung em viết, ở đây là dòng chữ Xin chào."],
        ["t", "Chương trình có thể tự chạy mà không cần ai viết ra các lệnh.", false, "Chương trình do con người viết ra. Không có lệnh thì máy tính không biết phải làm gì."],
        ["m", "Scratch là gì?", ["Một ngôn ngữ lập trình kéo thả dành cho người mới học", "Một loại virus", "Một loại máy in", "Một trang bán hàng"], 0, "Scratch cho em ghép các khối lệnh bằng cách kéo thả, rất hợp để bắt đầu học lập trình."],
        ["m", "Thuật toán đánh răng: (1) Lấy bàn chải (2) Bóp kem (3) Chải răng. Bước nào còn thiếu?", ["Ăn cơm", "Bật ti vi", "Súc miệng", "Đi ngủ"], 2, "Sau khi chải răng, em cần súc miệng cho sạch kem đánh răng."],
        ["m", "Sắp xếp đúng thứ tự để đăng nhập tài khoản: (1) Nhập mật khẩu (2) Mở trang đăng nhập (3) Bấm nút Đăng nhập", ["2, 1, 3", "1, 2, 3", "3, 2, 1", "1, 3, 2"], 0, "Phải mở trang đăng nhập trước, rồi nhập mật khẩu, cuối cùng mới bấm nút Đăng nhập."],
      ],
    },

    // ===== LEVEL 2: Vòng lặp =====
    {
      title: "Vòng lặp kỳ diệu",
      questions: [
        ["m", "Vòng lặp dùng để làm gì?", ["Tắt máy tính", "Lặp lại một việc nhiều lần", "Vẽ hình tròn", "Xoá chương trình"], 1, "Vòng lặp giúp máy tính làm đi làm lại một việc mà em không phải viết lại nhiều lần."],
        ["m", "Thay vì viết lệnh 'Tiến' 4 lần liên tiếp, cách viết gọn hơn là gì?", ["Dừng lại 4 lần", "Xoá lệnh Tiến", "Lặp 4 lần: Tiến", "Rẽ trái 4 lần"], 2, "'Lặp 4 lần: Tiến' làm đúng việc như viết 'Tiến' bốn lần nhưng ngắn gọn hơn."],
        ["t", "Lặp 3 lần lệnh 'Vỗ tay' thì em vỗ tay 3 lần.", true, "Đúng rồi! Số lần lặp cho biết lệnh bên trong được làm bao nhiêu lần."],
        ["m", "Lặp 5 lần: 'Nhảy'. Nhân vật nhảy tổng cộng mấy lần?", ["3", "4", "6", "5"], 3, "Lặp 5 lần thì lệnh Nhảy được làm 5 lần."],
        ["m", "Lặp 3 lần: [Tiến 2 bước]. Nhân vật đi tổng cộng bao nhiêu bước?", ["5", "6", "3", "2"], 1, "Mỗi lần đi 2 bước, lặp 3 lần nên 2 × 3 = 6 bước."],
        ["t", "Vòng lặp chỉ chạy được một lần rồi tắt.", false, "Vòng lặp được tạo ra để chạy nhiều lần, số lần do em quyết định."],
        ["m", "Vòng lặp vô hạn là gì?", ["Vòng lặp chạy đúng 1 lần", "Vòng lặp bị xoá", "Vòng lặp không bao giờ tự dừng", "Vòng lặp có 10 lần"], 2, "Vòng lặp vô hạn cứ chạy mãi không dừng, cần cẩn thận khi dùng."],
        ["m", "Để vẽ hình vuông, em lặp 4 lần cặp lệnh nào?", ["Chỉ đi thẳng", "Chỉ quay 90°", "Đi thẳng rồi quay 45°", "Đi thẳng rồi quay 90°"], 3, "Hình vuông có 4 cạnh bằng nhau và 4 góc vuông, nên lặp 4 lần: đi thẳng rồi quay 90°."],
        ["t", "Lặp 0 lần thì lệnh bên trong vẫn chạy 1 lần.", false, "Lặp 0 lần nghĩa là lệnh bên trong không chạy lần nào."],
        ["m", "Chương trình: Lặp 2 lần [ Lặp 3 lần [ Vỗ tay ] ]. Vỗ tay tổng cộng mấy lần?", ["5", "6", "8", "3"], 1, "Mỗi lượt ngoài vỗ tay 3 lần, có 2 lượt nên 2 × 3 = 6 lần."],
        ["m", "Trong Scratch, khối lệnh nào dùng để lặp lại một việc?", ["nói", "phát âm thanh", "lặp lại ... lần", "đổi trang phục"], 2, "Khối 'lặp lại ... lần' giúp em làm một việc nhiều lần."],
        ["m", "Bài hát hát đi hát lại câu điệp khúc. Điều này giống khái niệm nào trong lập trình?", ["Biến", "Vòng lặp", "Lỗi", "Điều kiện"], 1, "Hát lại một đoạn nhiều lần chính là ý tưởng của vòng lặp."],
        ["t", "'Lặp 10 lần: Bật đèn' làm việc giống như viết lệnh 'Bật đèn' 10 lần.", true, "Đúng rồi! Vòng lặp là cách viết ngắn gọn cho việc lặp lại."],
        ["m", "Muốn máy tính in các số từ 1 đến 100, cách nào gọn nhất?", ["Viết 100 lệnh in", "Dùng vòng lặp", "Chỉ in 1 số", "Không thể làm được"], 1, "Dùng vòng lặp để in số, em chỉ cần viết vài dòng lệnh thay vì 100 dòng."],
        ["m", "Mỗi lần vòng lặp chạy xong một lượt được gọi là gì?", ["Một lỗi", "Một biến", "Một tệp", "Một lượt lặp"], 3, "Mỗi lần chạy hết các lệnh bên trong vòng lặp là một lượt lặp."],
      ],
    },

    // ===== LEVEL 3: Điều kiện =====
    {
      title: "Rẽ nhánh điều kiện",
      questions: [
        ["m", "Câu lệnh 'Nếu trời mưa thì mang ô' thuộc kiểu lệnh nào?", ["Lệnh lặp", "Lệnh xoá", "Lệnh điều kiện", "Lệnh in"], 2, "Lệnh có dạng 'Nếu ... thì ...' gọi là lệnh điều kiện."],
        ["m", "Trong 'Nếu A thì B', việc B được làm khi nào?", ["Luôn luôn", "Không bao giờ", "Khi A sai", "Khi A đúng"], 3, "Việc B chỉ được làm khi điều kiện A đúng."],
        ["t", "Một điều kiện chỉ có thể là đúng hoặc sai.", true, "Đúng rồi! Máy tính kiểm tra điều kiện và chỉ có hai kết quả: đúng hoặc sai."],
        ["m", "'Nếu điểm ≥ 5 thì Đạt, nếu không thì Chưa đạt'. Điểm là 7 thì kết quả là gì?", ["Đạt", "Chưa đạt", "Không biết", "Lỗi"], 0, "7 lớn hơn 5 nên điều kiện đúng, kết quả là Đạt."],
        ["m", "Phần 'nếu không thì' dùng khi nào?", ["Khi điều kiện đúng", "Khi điều kiện sai", "Khi tắt máy", "Khi bắt đầu vòng lặp"], 1, "'Nếu không thì' chọn việc cần làm khi điều kiện sai."],
        ["t", "Điểm 3 thoả điều kiện 'điểm ≥ 5'.", false, "3 nhỏ hơn 5 nên điều kiện sai."],
        ["m", "Điều kiện nào ĐÚNG khi số đang xét là 10?", ["10 < 5", "10 = 7", "10 > 8", "10 < 0"], 2, "10 lớn hơn 8 nên '10 > 8' là đúng."],
        ["m", "Luật: 'Nếu đèn đỏ thì dừng lại'. Khi gặp đèn xanh thì điều gì xảy ra?", ["Điều kiện sai nên không phải dừng", "Vẫn phải dừng", "Phải quay đầu", "Đèn tắt"], 0, "Đèn xanh thì điều kiện 'đèn đỏ' sai, nên em không phải dừng lại."],
        ["m", "Robot có lệnh: 'Nếu gặp tường thì rẽ phải'. Phía trước là tường. Robot làm gì?", ["Đi tiếp", "Lùi lại", "Dừng mãi", "Rẽ phải"], 3, "Gặp tường thì điều kiện đúng, nên robot rẽ phải."],
        ["t", "Một chương trình có thể có nhiều điều kiện khác nhau.", true, "Đúng rồi! Chương trình càng phức tạp thì càng có nhiều điều kiện."],
        ["m", "Khối lệnh nào trong Scratch giúp chọn việc làm theo điều kiện?", ["quay ... độ", "đợi ... giây", "đi ... bước", "nếu ... thì"], 3, "Khối 'nếu ... thì' kiểm tra điều kiện rồi mới làm các lệnh bên trong."],
        ["m", "Điều kiện 'tuổi ≥ 18' đúng với tuổi nào?", ["15", "17", "10", "20"], 3, "20 lớn hơn 18 nên điều kiện đúng."],
        ["t", "Số 7 thoả điều kiện 'là số chẵn'.", false, "Số chẵn chia hết cho 2. Số 7 là số lẻ nên điều kiện sai."],
        ["m", "Trò chơi có luật: 'Nếu hết máu thì Game Over'. Khi máu bằng 0 thì chuyện gì xảy ra?", ["Tiếp tục chơi", "Thêm máu", "Hiện Game Over", "Tắt điều kiện"], 2, "Máu bằng 0 là hết máu, điều kiện đúng nên trò chơi hiện Game Over."],
        ["m", "Điều kiện 'số lớn hơn 10 và nhỏ hơn 20' đúng với số nào?", ["15", "5", "25", "10"], 0, "15 vừa lớn hơn 10 vừa nhỏ hơn 20."],
      ],
    },

    // ===== LEVEL 4: Biến và dữ liệu =====
    {
      title: "Biến và dữ liệu",
      questions: [
        ["m", "Biến trong lập trình giống như cái gì?", ["Chiếc hộp có tên để chứa một giá trị", "Cái bút", "Con chuột", "Tấm ảnh"], 0, "Biến giống chiếc hộp có dán nhãn tên, bên trong cất một giá trị như số hay chữ."],
        ["m", "Biến điểm = 5. Sau lệnh 'điểm = điểm + 2', biến điểm bằng bao nhiêu?", ["5", "2", "7", "52"], 2, "Lấy giá trị cũ 5 cộng thêm 2 được 7, rồi cất lại vào biến điểm."],
        ["t", "Giá trị của biến có thể thay đổi trong lúc chương trình chạy.", true, "Đúng rồi! Đó là lý do nó được gọi là 'biến'."],
        ["m", "Dữ liệu 'Xin chào' thuộc kiểu nào?", ["Số", "Chuỗi ký tự (văn bản)", "Đúng/Sai", "Hình ảnh"], 1, "Dữ liệu là chữ được gọi là chuỗi ký tự."],
        ["m", "Dữ liệu 42 thuộc kiểu nào?", ["Chữ", "Âm thanh", "Màu sắc", "Số"], 3, "42 là một con số nên thuộc kiểu số."],
        ["t", "Em nên đặt tên biến lung tung cho khó đoán.", false, "Tên biến nên dễ hiểu, như 'diem' hay 'tuoi', để em và người khác đọc là biết biến đó chứa gì."],
        ["m", "Máy tính lưu thông tin bằng những chữ số nào (hệ nhị phân)?", ["0 và 1", "1 đến 9", "A và B", "Chỉ số 5"], 0, "Máy tính dùng hệ nhị phân, chỉ gồm hai chữ số là 0 và 1."],
        ["m", "Một bit có thể là gì?", ["Một chữ cái", "Một bức ảnh", "Từ 0 đến 9", "0 hoặc 1"], 3, "Bit là đơn vị nhỏ nhất của máy tính, chỉ có thể là 0 hoặc 1."],
        ["m", "Biến ten = 'Lan'. Lệnh 'In ten' sẽ hiện ra gì?", ["ten", "Lan", "Ten Lan", "Không hiện gì"], 1, "Máy tính lấy giá trị đang cất trong biến ten, tức là Lan, và in ra."],
        ["t", "Kiểu dữ liệu Đúng/Sai chỉ có hai giá trị.", true, "Đúng rồi! Chỉ có Đúng hoặc Sai, giống như công tắc bật và tắt."],
        ["m", "x = 3 và y = 4. Giá trị của x + y là bao nhiêu?", ["34", "7", "12", "1"], 1, "3 cộng 4 bằng 7."],
        ["m", "Danh sách (list) dùng để làm gì?", ["Vẽ hình", "Tắt máy", "Lưu nhiều giá trị trong một biến", "Phát nhạc"], 2, "Danh sách giúp cất nhiều giá trị, như điểm của cả lớp, vào cùng một chỗ."],
        ["t", "Số 5 và chữ '5' luôn giống hệt nhau với máy tính.", false, "Số 5 dùng để tính toán, còn chữ '5' chỉ là ký tự giống như chữ cái. Máy tính phân biệt hai kiểu này."],
        ["m", "Muốn đếm số lần người chơi ghi điểm, em nên dùng gì?", ["Một chiếc loa", "Một bức tranh", "Một biến để lưu điểm", "Một vòng lặp vô hạn"], 2, "Biến điểm sẽ cất số lần ghi điểm và tăng lên mỗi khi người chơi ghi điểm."],
        ["m", "Trong máy tính, số 1 thường ứng với công tắc ở trạng thái nào?", ["Tắt", "Bật", "Hỏng", "Không có"], 1, "Thường 1 là bật và 0 là tắt, giống như công tắc đèn."],
      ],
    },

    // ===== LEVEL 5 (BOSS): Gỡ lỗi và tổng hợp =====
    {
      title: "Đại chiến gỡ lỗi",
      questions: [
        ["m", "Lỗi trong chương trình được gọi là gì?", ["Pixel", "Cookie", "Icon", "Bug"], 3, "Lỗi trong chương trình gọi là bug (con bọ)."],
        ["m", "Việc tìm và sửa lỗi trong chương trình gọi là gì?", ["Cài đặt", "Gỡ lỗi (debug)", "Sao chép", "Xoá chương trình"], 1, "Gỡ lỗi (debug) là tìm ra chỗ sai và sửa lại cho đúng."],
        ["t", "Gặp lỗi khi lập trình là chuyện bình thường, ngay cả lập trình viên giỏi cũng gặp.", true, "Đúng rồi! Ai cũng gặp lỗi, quan trọng là bình tĩnh tìm và sửa."],
        ["m", "Robot phải đi 3 bước nhưng lại đi 5 bước. Em nên làm gì đầu tiên?", ["Bỏ cuộc", "Xoá hết làm lại ngay", "Đọc lại từng lệnh để tìm chỗ sai", "Tắt máy đi ngủ"], 2, "Đọc lại từng lệnh và theo dõi từng bước là cách tìm lỗi tốt nhất."],
        ["m", "Hàm (function) trong lập trình là gì?", ["Một nhóm lệnh có tên, có thể gọi lại nhiều lần", "Một loại lỗi", "Một thiết bị", "Một bức ảnh"], 0, "Hàm gom các lệnh lại và đặt tên, để em gọi tên là chạy cả nhóm lệnh."],
        ["t", "Mỗi lần dùng hàm, em phải viết lại toàn bộ nội dung của hàm.", false, "Chỉ cần viết hàm một lần, sau đó gọi tên hàm bao nhiêu lần cũng được."],
        ["m", "Biến điểm = 1. Lặp 3 lần: [Nếu điểm < 5 thì điểm = điểm + 2]. Cuối cùng điểm bằng bao nhiêu?", ["7", "5", "3", "6"], 1, "Lần 1: 1 → 3. Lần 2: 3 → 5. Lần 3: 5 không nhỏ hơn 5 nên không đổi. Kết quả là 5."],
        ["m", "Chương trình muốn in 1, 2, 3 nhưng lại in ra 1, 1, 1. Nguyên nhân có thể là gì?", ["Biến đếm không được tăng lên", "Màn hình hỏng", "Mất điện", "Bàn phím hỏng"], 0, "Biến đếm quên không tăng thêm 1 sau mỗi lần lặp nên cứ in lại số 1."],
        ["t", "Chạy thử chương trình nhiều lần giúp em phát hiện lỗi.", true, "Đúng rồi! Chạy thử với nhiều trường hợp giúp lộ ra những chỗ sai."],
        ["m", "Thuật toán tìm số lớn nhất trong ba số 4, 9, 6 cho kết quả nào?", ["4", "6", "19", "9"], 3, "So sánh lần lượt, số lớn nhất là 9."],
        ["m", "Cái nào sau đây là một ngôn ngữ lập trình?", ["Python", "Word", "Paint", "Chrome"], 0, "Python là ngôn ngữ lập trình. Word, Paint và Chrome là phần mềm."],
        ["m", "Lập trình viên thêm ghi chú (comment) vào chương trình để làm gì?", ["Để máy tính chạy nhanh hơn", "Để xoá bớt lệnh", "Để tắt máy", "Để giải thích đoạn lệnh cho người đọc"], 3, "Ghi chú không làm máy tính chạy khác đi, nó giúp người đọc hiểu đoạn lệnh làm việc gì."],
        ["t", "Máy tính luôn tự sửa được mọi lỗi trong chương trình mà không cần con người.", false, "Máy tính có thể báo lỗi, nhưng nhiều lỗi vẫn cần người viết chương trình tìm ra cách sửa."],
        ["m", "Thứ tự nào hợp lý nhất để giải một bài lập trình?", ["Hiểu đề → Nghĩ thuật toán → Viết lệnh → Chạy thử, sửa lỗi", "Viết lệnh → Hiểu đề → Chạy thử", "Chạy thử → Viết lệnh → Hiểu đề", "Viết lệnh → Nghỉ chơi"], 0, "Em cần hiểu đề, nghĩ cách giải, viết lệnh rồi chạy thử và sửa lỗi."],
        ["m", "Chương trình: Lặp 4 lần [Tiến 3 bước], sau đó Lùi 2 bước. Tổng số bước đã tiến và vị trí cuối cách điểm xuất phát bao nhiêu bước?", ["12 và 12", "10 và 12", "12 và 10", "4 và 2"], 2, "Tiến 4 × 3 = 12 bước. Sau đó lùi 2 bước nên cách điểm xuất phát 12 − 2 = 10 bước."],
      ],
    },
  ],
};

export default bank;
