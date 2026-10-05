import type { WorldBank } from "./types";

const bank: WorldBank = {
  slug: "toan-ly-hoa",
  levels: [
    // ===== LEVEL 1: rất dễ (lớp 2–3) =====
    {
      title: "Đếm Sao Nhí",
      questions: [
        ["m", "7 + 5 = ?", ["10", "11", "12", "13"], 2, "Đếm tiếp từ 7 thêm 5 bước: 7 + 5 = 12. Giỏi lắm!"],
        ["m", "Nước đá là nước ở thể gì?", ["Thể rắn", "Thể lỏng", "Thể khí", "Không có thể"], 0, "Nước đá cứng, có hình dạng riêng nên là thể rắn."],
        ["t", "2 × 5 = 10", true, "Đúng rồi! 2 × 5 nghĩa là 5 + 5 = 10."],
        ["m", "15 − 8 = ?", ["6", "7", "8", "9"], 1, "15 − 8 = 7. Thử lại nhé: 7 + 8 = 15."],
        ["m", "Hình nào có 3 cạnh?", ["Hình vuông", "Hình tròn", "Hình tam giác", "Hình chữ nhật"], 2, "Hình tam giác có 3 cạnh và 3 góc, chữ «tam» nghĩa là ba."],
        ["t", "Mặt Trời mọc ở hướng Tây.", false, "Mặt Trời mọc ở hướng Đông và lặn ở hướng Tây bạn nhé."],
        ["m", "1 giờ có bao nhiêu phút?", ["30 phút", "100 phút", "12 phút", "60 phút"], 3, "1 giờ = 60 phút. Kim phút chạy đúng một vòng là hết 1 giờ."],
        ["m", "Ta nghe âm thanh bằng bộ phận nào?", ["Mắt", "Tai", "Mũi", "Lưỡi"], 1, "Tai giúp ta nghe âm thanh, còn mắt giúp ta nhìn."],
        ["t", "Nam châm hút được cái đinh sắt.", true, "Đúng! Nam châm hút được các vật làm bằng sắt như đinh, ghim."],
        ["m", "3 × 4 = ?", ["7", "12", "10", "14"], 1, "3 × 4 = 4 + 4 + 4 = 12."],
        ["m", "Vật nào sau đây là chất lỏng?", ["Hòn đá", "Quyển sách", "Sữa", "Cái bàn"], 2, "Sữa chảy được và có hình dạng theo cái cốc, nên là chất lỏng."],
        ["t", "Số 45 lớn hơn số 54.", false, "Sai rồi! So hàng chục: 4 chục < 5 chục, nên 45 < 54."],
        ["m", "20 : 4 = ?", ["4", "6", "16", "5"], 3, "20 : 4 = 5, vì 4 × 5 = 20."],
        ["m", "1 m bằng bao nhiêu xăng-ti-mét?", ["100 cm", "10 cm", "1000 cm", "50 cm"], 0, "1 m = 100 cm. Cây thước mét dài bằng 100 vạch xăng-ti-mét."],
        ["t", "Không khí sạch không có màu, không có mùi.", true, "Đúng! Không khí sạch trong suốt, không màu, không mùi nên ta không nhìn thấy."],
      ],
    },
    // ===== LEVEL 2: dễ (lớp 3) =====
    {
      title: "Vũ Điệu Cửu Chương",
      questions: [
        ["m", "7 × 8 = ?", ["54", "56", "63", "48"], 1, "Bảng nhân 7: 7 × 8 = 56. Mẹo nhớ: 5, 6, 7, 8 → 56 = 7 × 8."],
        ["m", "Nước sôi ở bao nhiêu độ C?", ["50 °C", "80 °C", "100 °C", "0 °C"], 2, "Nước sôi ở 100 °C, còn đông thành đá ở 0 °C."],
        ["t", "6 × 9 = 56", false, "Sai rồi! 6 × 9 = 54, còn 56 là 7 × 8 nhé."],
        ["m", "72 : 8 = ?", ["9", "8", "7", "6"], 0, "72 : 8 = 9, vì 8 × 9 = 72."],
        ["m", "Nước đá để ngoài nắng sẽ chuyển thành thể gì?", ["Thể rắn", "Thể khí ngay", "Thể cứng hơn", "Thể lỏng"], 3, "Gặp nóng, nước đá tan chảy thành nước ở thể lỏng."],
        ["t", "Chu vi hình vuông cạnh 5 cm là 20 cm.", true, "Đúng! Hình vuông có 4 cạnh bằng nhau: 5 × 4 = 20 (cm)."],
        ["m", "245 + 138 = ?", ["373", "383", "393", "384"], 1, "Cộng từng hàng: 245 + 138 = 383 (5 + 8 = 13, nhớ 1)."],
        ["m", "Vật nào cho ánh sáng truyền qua?", ["Tấm gỗ", "Tường gạch", "Tấm kính trong", "Tấm sắt"], 2, "Kính trong suốt cho ánh sáng đi qua, nên ta nhìn xuyên qua cửa kính được."],
        ["t", "Âm thanh có thể truyền qua nước.", true, "Đúng! Khi lặn, ta vẫn nghe được tiếng động vì âm thanh truyền qua nước."],
        ["m", "1 kg bằng bao nhiêu gam?", ["10 g", "100 g", "500 g", "1000 g"], 3, "1 kg = 1000 g. Một túi đường 1 kg nặng bằng 1000 g."],
        ["m", "Lan có 32 viên bi, chia đều cho 4 bạn. Mỗi bạn được mấy viên?", ["8", "7", "9", "6"], 0, "Chia đều nghĩa là phép chia: 32 : 4 = 8 (viên bi)."],
        ["t", "Nam châm hút được thước nhựa.", false, "Sai rồi! Nam châm chỉ hút sắt, thép; nhựa thì không bị hút."],
        ["m", "Dụng cụ nào dùng để đo nhiệt độ?", ["Cái cân", "Nhiệt kế", "Thước kẻ", "Đồng hồ"], 1, "Nhiệt kế cho ta biết nóng hay lạnh bao nhiêu độ."],
        ["m", "Số liền sau của 999 là số nào?", ["998", "1001", "1000", "990"], 2, "Số liền sau thì thêm 1: 999 + 1 = 1000."],
        ["t", "Chạm tay ướt vào ổ điện là an toàn.", false, "Rất nguy hiểm! Nước dẫn điện, tay ướt chạm ổ điện có thể bị điện giật."],
      ],
    },
    // ===== LEVEL 3: trung bình (lớp 4) =====
    {
      title: "Phân Số Thần Kỳ",
      questions: [
        ["m", "1/2 của 18 là bao nhiêu?", ["9", "6", "8", "12"], 0, "Tìm 1/2 của một số thì chia số đó cho 2: 18 : 2 = 9."],
        ["m", "Khí nào cần cho sự cháy và sự thở?", ["Khí ni-tơ", "Khí các-bô-níc", "Hơi nước", "Khí ô-xi"], 3, "Khí ô-xi giúp lửa cháy và giúp con người, động vật thở."],
        ["t", "Phân số 3/4 lớn hơn 1/2.", true, "Đúng! 1/2 = 2/4, mà 3/4 > 2/4 nên 3/4 > 1/2."],
        ["m", "125 × 4 = ?", ["400", "450", "520", "500"], 3, "125 × 4 = 500. Mẹo: 100 × 4 = 400, 25 × 4 = 100, cộng lại 500."],
        ["m", "Hình chữ nhật dài 8 cm, rộng 5 cm có diện tích là bao nhiêu?", ["40 cm²", "26 cm²", "13 cm²", "45 cm²"], 0, "Diện tích = dài × rộng = 8 × 5 = 40 (cm²). Chú ý: 26 cm là chu vi đó!"],
        ["t", "Bóng của vật nằm cùng phía với nguồn sáng.", false, "Sai rồi! Bóng nằm phía sau vật, ngược phía với nguồn sáng."],
        ["m", "Hòa muối vào nước, ta được gì?", ["Hỗn hợp cát", "Chất khí", "Dung dịch", "Chất rắn"], 2, "Muối tan đều vào nước tạo thành dung dịch nước muối."],
        ["m", "3 tấn bằng bao nhiêu ki-lô-gam?", ["3000 kg", "300 kg", "30 kg", "30 000 kg"], 0, "1 tấn = 1000 kg, nên 3 tấn = 3 × 1000 = 3000 kg."],
        ["t", "Trung bình cộng của 4, 6 và 8 là 6.", true, "Đúng! (4 + 6 + 8) : 3 = 18 : 3 = 6."],
        ["m", "Âm thanh được tạo ra do đâu?", ["Do ánh sáng chiếu", "Do nam châm", "Do vật nóng lên", "Do vật rung động"], 3, "Âm thanh sinh ra khi vật rung động, như mặt trống rung khi ta gõ."],
        ["m", "2/5 + 1/5 = ?", ["3/10", "3/5", "2/5", "1/5"], 1, "Cùng mẫu số thì cộng tử số, giữ mẫu: 2/5 + 1/5 = 3/5."],
        ["t", "Nước tự chảy từ chỗ thấp lên chỗ cao.", false, "Sai rồi! Nước chảy từ chỗ cao xuống chỗ thấp, như suối chảy xuống chân núi."],
        ["m", "1 thế kỷ bằng bao nhiêu năm?", ["10 năm", "50 năm", "1000 năm", "100 năm"], 3, "1 thế kỷ = 100 năm. Chúng ta đang sống ở thế kỷ 21."],
        ["m", "Muốn tách cát ra khỏi nước, ta làm thế nào?", ["Lọc qua giấy lọc", "Thêm đường vào", "Khuấy thật mạnh", "Cho vào tủ lạnh"], 0, "Giấy lọc giữ cát lại, còn nước chảy qua. Đó là cách lọc!"],
        ["t", "Số 3456 chia hết cho 2.", true, "Đúng! Số có chữ số tận cùng là 6 (số chẵn) thì chia hết cho 2."],
      ],
    },
    // ===== LEVEL 4: khá khó (lớp 4–5) =====
    {
      title: "Thám Tử Đo Lường",
      questions: [
        ["m", "3/4 của 36 kg là bao nhiêu?", ["9 kg", "27 kg", "24 kg", "12 kg"], 1, "36 : 4 = 9 (kg), rồi 9 × 3 = 27 (kg)."],
        ["m", "Quần áo phơi mau khô nhất khi nào?", ["Trời lạnh, lặng gió", "Đậy kín trong túi", "Trời nắng, có gió", "Trời mưa phùn"], 2, "Nắng và gió làm nước bay hơi nhanh hơn, nên quần áo mau khô."],
        ["t", "2/3 = 4/6", true, "Đúng! Nhân cả tử và mẫu của 2/3 với 2: (2 × 2)/(3 × 2) = 4/6."],
        ["m", "Vườn hình vuông có chu vi 36 m. Diện tích vườn là?", ["81 m²", "36 m²", "144 m²", "72 m²"], 0, "Cạnh = 36 : 4 = 9 (m). Diện tích = 9 × 9 = 81 (m²)."],
        ["m", "Vì sao mùa đông ta mặc áo len?", ["Áo len tự sinh ra nhiệt", "Áo len hút hơi lạnh vào", "Áo len dẫn điện tốt", "Áo len giữ ấm cơ thể"], 3, "Len dẫn nhiệt kém nên giữ hơi ấm của cơ thể không thoát ra ngoài."],
        ["t", "1 km = 100 m", false, "Sai rồi! 1 km = 1000 m nhé."],
        ["m", "Tìm x, biết x × 6 = 138.", ["22", "24", "23", "144"], 2, "x = 138 : 6 = 23. Thử lại: 23 × 6 = 138. Chính xác!"],
        ["m", "Vật nào dẫn điện tốt?", ["Dây đồng", "Thước nhựa", "Cục tẩy", "Đũa gỗ"], 0, "Kim loại như đồng dẫn điện tốt, nên lõi dây điện làm bằng đồng."],
        ["t", "Ánh sáng truyền theo đường thẳng.", true, "Đúng! Vì thế tia nắng qua khe cửa trông như những đường thẳng."],
        ["m", "Trung bình cộng của 15, 25, 35 và 45 là?", ["25", "35", "40", "30"], 3, "(15 + 25 + 35 + 45) : 4 = 120 : 4 = 30."],
        ["m", "5 giờ 15 phút bằng bao nhiêu phút?", ["315 phút", "515 phút", "300 phút", "320 phút"], 0, "5 giờ = 5 × 60 = 300 phút. 300 + 15 = 315 phút."],
        ["t", "Hai cực cùng tên của nam châm thì hút nhau.", false, "Sai rồi! Cùng tên thì đẩy nhau, khác tên (Bắc – Nam) mới hút nhau."],
        ["m", "Lực nào làm quả táo rơi xuống đất?", ["Lực đẩy của gió", "Lực nam châm", "Lực hút Trái Đất", "Lực của lá cây"], 2, "Trái Đất hút mọi vật về phía nó, nên quả táo rơi xuống."],
        ["m", "Có 5 thùng, mỗi thùng 24 chai. Bán đi 38 chai. Còn lại mấy chai?", ["86", "72", "82", "92"], 2, "Có tất cả 5 × 24 = 120 (chai). Còn lại 120 − 38 = 82 (chai)."],
        ["t", "Số 1050 chia hết cho cả 2 và 5.", true, "Đúng! Số có tận cùng là 0 thì chia hết cho cả 2 và 5."],
      ],
    },
    // ===== LEVEL 5: khó nhất (lớp 5, nhiều bước) =====
    {
      title: "Thử Thách Vô Địch",
      questions: [
        ["m", "Tổng hai số là 60, hiệu là 14. Số lớn là bao nhiêu?", ["37", "23", "46", "30"], 0, "Số lớn = (tổng + hiệu) : 2 = (60 + 14) : 2 = 37. Số bé là 23."],
        ["m", "Ô tô đi mỗi giờ 45 km. Trong 2 giờ 30 phút đi được bao nhiêu km?", ["90 km", "112,5 km", "135 km", "100 km"], 1, "2 giờ 30 phút = 2,5 giờ. Quãng đường: 45 × 2,5 = 112,5 (km)."],
        ["t", "0,5 lớn hơn 0,45.", true, "Đúng! 0,5 = 0,50 và 0,50 > 0,45. Đừng bị lừa vì 45 nhiều chữ số hơn nhé!"],
        ["m", "Tổng hai số là 48, số lớn gấp 3 lần số bé. Số bé là?", ["16", "36", "24", "12"], 3, "Tổng số phần: 1 + 3 = 4. Số bé = 48 : 4 = 12, số lớn = 36."],
        ["m", "Muốn lấy lại muối từ nước muối, ta làm gì?", ["Lọc qua giấy lọc", "Đun cho nước bay hơi", "Để lắng xuống đáy", "Dùng nam châm hút"], 1, "Muối tan nên lọc không được. Đun cho nước bay hơi hết, muối sẽ còn lại."],
        ["t", "Hình tròn bán kính 2 cm có chu vi là 12,56 cm.", true, "Đúng! Chu vi = bán kính × 2 × 3,14 = 2 × 2 × 3,14 = 12,56 (cm)."],
        ["m", "Lớp có 40 học sinh, 25% là học sinh giỏi. Có bao nhiêu bạn giỏi?", ["8", "10", "15", "25"], 1, "25% của 40 là 40 × 25 : 100 = 10 (bạn)."],
        ["m", "Vì sao cốc nước đá có nước đọng bên ngoài?", ["Nước thấm qua thành cốc", "Đá tan tràn ra ngoài", "Cốc tự sinh ra nước", "Hơi nước trong không khí ngưng tụ"], 3, "Hơi nước trong không khí gặp thành cốc lạnh thì ngưng tụ thành giọt nước."],
        ["t", "Mạch điện bị hở thì bóng đèn vẫn sáng.", false, "Sai rồi! Mạch hở thì dòng điện không chạy qua được, đèn sẽ tắt."],
        ["m", "Bể hình hộp chữ nhật dài 2 m, rộng 1,5 m, cao 1 m. Thể tích bể là?", ["4,5 m³", "6 m³", "3 m³", "2,5 m³"], 2, "Thể tích = dài × rộng × cao = 2 × 1,5 × 1 = 3 (m³)."],
        ["m", "Nhúng vào bát canh nóng, thìa nào nóng lên nhanh nhất?", ["Thìa nhựa", "Thìa gỗ", "Thìa sứ", "Thìa kim loại"], 3, "Kim loại dẫn nhiệt tốt nhất, nên thìa kim loại nóng nhanh nhất."],
        ["t", "3/5 giờ bằng 30 phút.", false, "Sai rồi! 3/5 giờ = 60 × 3 : 5 = 36 phút."],
        ["m", "Mẹ mua 3 kg táo, giá 35 000 đồng/kg, đưa 200 000 đồng. Được thối lại?", ["95 000 đồng", "105 000 đồng", "85 000 đồng", "100 000 đồng"], 0, "Tiền táo: 35 000 × 3 = 105 000 (đồng). Thối lại: 200 000 − 105 000 = 95 000 (đồng)."],
        ["m", "Ruộng hình chữ nhật chu vi 120 m, dài hơn rộng 10 m. Diện tích ruộng là?", ["900 m²", "875 m²", "600 m²", "750 m²"], 1, "Nửa chu vi: 60 m. Dài = (60 + 10) : 2 = 35 m, rộng = 25 m. Diện tích = 35 × 25 = 875 m²."],
        ["t", "Âm thanh truyền nhanh hơn ánh sáng, nên ta nghe sấm trước khi thấy chớp.", false, "Ngược lại! Ánh sáng nhanh hơn rất nhiều, nên ta thấy chớp trước rồi mới nghe sấm."],
      ],
    },
  ],
};

export default bank;
