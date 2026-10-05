import type { WorldBank } from "./types";

const bank: WorldBank = {
  slug: "ai-cong-nghe",
  levels: [
    // ===== LEVEL 1: Nhận biết — máy tính, thiết bị cơ bản =====
    {
      title: "Làm quen máy tính",
      questions: [
        ["m", "Bộ phận nào dùng để gõ chữ vào máy tính?", ["Chuột", "Bàn phím", "Loa", "Màn hình"], 1, "Bàn phím có các phím chữ và số, giúp em gõ chữ vào máy tính đó!"],
        ["m", "Màn hình máy tính dùng để làm gì?", ["Phát ra âm thanh", "In ra giấy", "Hiển thị hình ảnh, chữ", "Nhập chữ vào máy"], 2, "Màn hình hiện ra hình ảnh và chữ để em nhìn thấy những gì máy tính đang làm."],
        ["t", "Chuột máy tính giúp em di chuyển con trỏ trên màn hình.", true, "Đúng rồi! Khi em di chuột, con trỏ trên màn hình cũng di chuyển theo."],
        ["m", "Thiết bị nào giúp em nghe được âm thanh từ máy tính?", ["Máy in", "Chuột", "Bàn phím", "Loa hoặc tai nghe"], 3, "Loa và tai nghe phát ra âm thanh, nhờ vậy em nghe được nhạc và tiếng nói."],
        ["m", "Thiết bị nào dùng để in bài làm ra giấy?", ["Máy in", "Loa", "Micrô", "Bàn phím"], 0, "Máy in lấy nội dung từ máy tính rồi in ra giấy cho em cầm được."],
        ["t", "Máy tính có thể tự suy nghĩ và có cảm xúc giống con người.", false, "Máy tính chỉ làm theo chương trình con người tạo ra, nó không có cảm xúc thật đâu."],
        ["m", "Thiết bị nhỏ, cầm tay, dùng để gọi điện và lướt web là gì?", ["Máy tính để bàn", "Điện thoại thông minh", "Máy in", "Ti vi"], 1, "Điện thoại thông minh nhỏ gọn, vừa gọi điện vừa lên mạng được, như một chiếc máy tính bỏ túi."],
        ["m", "Em nên làm gì trước khi rút điện máy tính?", ["Rút phích điện ngay", "Chỉ tắt màn hình", "Tắt máy đúng cách", "Để máy chạy mãi"], 2, "Tắt máy đúng cách (Shut down) giúp máy lưu dữ liệu và không bị hỏng."],
        ["t", "Micrô giúp máy tính thu được giọng nói của em.", true, "Chính xác! Micrô thu âm thanh, nhờ đó máy tính nghe được em nói."],
        ["m", "Webcam là thiết bị dùng để làm gì?", ["In tài liệu", "Phát nhạc", "Gõ chữ", "Quay video, chụp ảnh"], 3, "Webcam là camera nhỏ gắn với máy tính, giúp quay video và gọi điện có hình."],
        ["m", "Robot là gì?", ["Một loại trái cây", "Máy móc làm việc theo lập trình", "Một con vật", "Một bài hát"], 1, "Robot là máy móc được con người lập trình để làm việc, như robot hút bụi ở nhà."],
        ["t", "Ngồi dùng máy tính thật lâu không nghỉ là tốt cho mắt.", false, "Nhìn màn hình quá lâu làm mắt mỏi. Em nên nghỉ ngơi, nhìn ra xa sau mỗi 20–30 phút nhé!"],
        ["m", "AI là viết tắt của cụm từ nào?", ["Trí tuệ nhân tạo", "Máy tính bảng", "Mạng Internet", "Trò chơi điện tử"], 0, "AI là viết tắt của Artificial Intelligence, nghĩa là trí tuệ nhân tạo."],
        ["m", "Khi dùng máy tính, em nên ngồi thế nào?", ["Cúi sát màn hình", "Nằm trên giường", "Thẳng lưng, cách màn hình vừa phải", "Vừa ăn vừa gõ phím"], 2, "Ngồi thẳng lưng và cách màn hình vừa phải giúp em bảo vệ mắt và cột sống."],
        ["t", "Trợ lý ảo trên điện thoại có thể trả lời khi em hỏi bằng giọng nói.", true, "Đúng vậy! Trợ lý ảo nghe câu hỏi của em và nói lại câu trả lời."],
      ],
    },

    // ===== LEVEL 2: Hiểu — Internet và an toàn mạng =====
    {
      title: "Hiệp sĩ an toàn mạng",
      questions: [
        ["m", "Internet giúp em làm gì?", ["Nấu cơm nhanh hơn", "Giặt quần áo", "Sạc pin xe đạp", "Tìm thông tin, kết nối mọi người"], 3, "Internet nối các máy tính trên khắp thế giới, giúp em tìm thông tin và liên lạc với mọi người."],
        ["m", "Mật khẩu tốt nhất là mật khẩu như thế nào?", ["Khó đoán, có chữ, số, kí hiệu", "Là tên của em", "Là 123456", "Là ngày sinh của em"], 0, "Mật khẩu trộn chữ, số và kí hiệu thì kẻ xấu rất khó đoán ra."],
        ["t", "Em có thể cho bạn thân biết mật khẩu tài khoản của mình.", false, "Mật khẩu là bí mật! Em chỉ nên chia sẻ với bố mẹ thôi, kể cả bạn thân cũng không nên biết."],
        ["m", "Người lạ trên mạng hỏi địa chỉ nhà em. Em nên làm gì?", ["Gửi ngay cho họ", "Hẹn gặp họ", "Không trả lời, báo bố mẹ", "Gửi cả số điện thoại"], 2, "Không bao giờ cho người lạ biết địa chỉ nhà. Hãy báo ngay cho bố mẹ để được bảo vệ."],
        ["m", "Thông tin nào KHÔNG nên đăng lên mạng?", ["Con vật em thích", "Địa chỉ nhà và trường học", "Màu sắc yêu thích", "Bức tranh em vẽ"], 1, "Địa chỉ nhà và trường học là thông tin cá nhân, kẻ xấu có thể dùng để tìm đến em."],
        ["t", "Nếu thấy nội dung đáng sợ trên mạng, em nên kể cho bố mẹ hoặc thầy cô.", true, "Đúng rồi! Người lớn sẽ giúp em xử lý và bảo vệ em an toàn."],
        ["m", "Em nhận tin nhắn «Bấm vào đây để nhận quà miễn phí». Em nên?", ["Bấm ngay", "Gửi cho bạn bè", "Nhập mật khẩu để nhận", "Không bấm, hỏi người lớn"], 3, "Đường link «quà miễn phí» thường là bẫy lừa đảo. Không bấm và hỏi người lớn là khôn ngoan nhất."],
        ["m", "Trình duyệt web dùng để làm gì?", ["Mở và xem các trang web", "Vẽ tranh", "Chơi đàn", "Nấu ăn"], 0, "Trình duyệt web như Chrome, Cốc Cốc giúp em mở và xem các trang web trên Internet."],
        ["t", "Mọi thông tin trên Internet đều đúng 100%.", false, "Ai cũng có thể đăng lên mạng nên có tin đúng và tin sai. Em cần kiểm tra lại nhé!"],
        ["m", "Virus máy tính là gì?", ["Vi khuẩn thật trong máy", "Một loại chuột", "Chương trình xấu làm hại máy", "Bụi bám trong máy"], 2, "Virus máy tính là chương trình xấu có thể làm hỏng máy hoặc lấy trộm thông tin."],
        ["m", "Dùng xong máy tính chung ở trường, em nên làm gì?", ["Để nguyên tài khoản", "Đăng xuất tài khoản", "Ghi mật khẩu lên bàn", "Chỉ tắt màn hình"], 1, "Đăng xuất giúp người khác không dùng được tài khoản của em."],
        ["t", "Chê bai, bắt nạt bạn trên mạng cũng làm bạn buồn như ngoài đời.", true, "Đúng vậy! Lời nói trên mạng cũng làm tổn thương thật. Hãy luôn tử tế với mọi người nhé."],
        ["m", "Trước khi tải trò chơi mới về máy, em nên làm gì?", ["Tải từ bất kỳ trang nào", "Nhờ người lạ gửi", "Tắt phần mềm diệt virus", "Xin phép bố mẹ trước"], 3, "Xin phép bố mẹ giúp em tránh tải phải phần mềm xấu hoặc trò chơi không phù hợp."],
        ["m", "Khi xem video trên mạng, em nên làm gì?", ["Hẹn giờ, nghỉ mắt thường xuyên", "Xem suốt đêm", "Vừa ăn vừa xem", "Bật âm lượng thật to"], 0, "Hẹn giờ và nghỉ mắt giúp em khỏe mạnh, không bị nghiện màn hình."],
        ["t", "Người mới quen trên mạng luôn đúng như họ tự giới thiệu.", false, "Người trên mạng có thể nói dối về tên, tuổi. Em cần cẩn thận và kể với bố mẹ."],
      ],
    },

    // ===== LEVEL 3: Hiểu sâu — máy nhận biết hình ảnh, dạy máy phân loại =====
    {
      title: "Mắt thần của máy",
      questions: [
        ["m", "Máy tính «nhìn» thấy hình ảnh nhờ thiết bị nào?", ["Loa", "Camera", "Bàn phím", "Máy in"], 1, "Camera giống như đôi mắt, giúp máy tính thu được hình ảnh xung quanh."],
        ["m", "Muốn dạy máy nhận ra con mèo, ta cần cho máy xem gì?", ["Một bài hát về mèo", "Chỉ 1 tấm ảnh chó", "Tiếng kêu của gà", "Thật nhiều ảnh mèo"], 3, "Máy học bằng ví dụ. Xem càng nhiều ảnh mèo khác nhau, máy càng nhận ra mèo giỏi hơn."],
        ["t", "Với máy tính, một bức ảnh gồm rất nhiều điểm màu nhỏ gọi là điểm ảnh.", true, "Đúng rồi! Ảnh được ghép từ hàng nghìn điểm ảnh (pixel), mỗi điểm có một màu."],
        ["m", "Mở khóa điện thoại bằng khuôn mặt dùng công nghệ gì?", ["Nhận diện khuôn mặt", "Nhận diện giọng hát", "Đo nhiệt độ", "In 3D"], 0, "Điện thoại dùng AI để nhận ra khuôn mặt chủ nhân rồi mới mở khóa."],
        ["m", "Dạy máy chia ảnh thành nhóm «táo» và «cam» gọi là gì?", ["Tô màu ảnh", "Xóa ảnh", "Phân loại", "Phóng to ảnh"], 2, "Chia các thứ vào từng nhóm theo đặc điểm gọi là phân loại, một việc AI làm rất giỏi."],
        ["t", "Máy chỉ cần xem 1 tấm ảnh là nhận ra mọi con chó trên đời.", false, "Chó có rất nhiều giống, màu lông, dáng vẻ. Máy cần xem rất nhiều ảnh mới nhận ra tốt."],
        ["m", "Ảnh dạy máy bị ghi nhãn sai (mèo ghi là chó). Máy sẽ thế nào?", ["Tự sửa lại cho đúng", "Dễ nhận nhầm hơn", "Nhận biết giỏi hơn", "Không thay đổi gì"], 1, "Máy học theo đúng những gì được dạy. Dạy sai thì máy sẽ học sai và nhận nhầm."],
        ["m", "Em chụp ảnh chiếc lá, ứng dụng cho biết tên cây. AI đã làm gì?", ["Tưới nước cho cây", "Vẽ thêm lá", "Làm cây lớn nhanh", "Nhận biết cây qua hình ảnh"], 3, "AI so sánh hình dạng, màu sắc của lá với những gì đã học để đoán ra tên cây."],
        ["t", "Camera ở bãi đỗ xe có thể dùng AI để đọc biển số xe.", true, "Chính xác! AI nhận ra các chữ và số trên biển số, giúp quản lý xe ra vào nhanh hơn."],
        ["m", "«Nhãn» trong dữ liệu dạy máy là gì?", ["Tên đúng gắn cho mỗi ví dụ", "Màu của bức ảnh", "Kích thước màn hình", "Giá của máy tính"], 0, "Nhãn là tên gọi đúng, ví dụ ghi «mèo» cho ảnh mèo, để máy biết mỗi ảnh là gì."],
        ["m", "Để máy nhận biết chữ viết tay, ta nên dạy bằng gì?", ["Ảnh phong cảnh", "Tiếng nhạc", "Nhiều mẫu chữ viết tay", "Ảnh con vật"], 2, "Muốn máy nhận ra chữ viết tay thì phải cho máy học từ thật nhiều mẫu chữ viết tay."],
        ["t", "Chỉ dạy máy bằng ảnh mèo lông trắng, máy vẫn luôn nhận đúng mèo lông đen.", false, "Máy chưa từng thấy mèo đen nên dễ nhận nhầm. Dữ liệu cần đa dạng nhiều kiểu mèo."],
        ["m", "Xe tự lái dùng camera để làm gì?", ["Chụp ảnh tự sướng", "Nhận biết đường, người, biển báo", "Phát nhạc cho khách", "Đo cân nặng hành khách"], 1, "Xe tự lái dùng camera và AI để thấy đường, người đi bộ và biển báo, giúp đi an toàn."],
        ["m", "Dạy máy phân loại rác, ta nên chia ảnh vào nhóm nào?", ["Rác to và rác nhỏ", "Rác đẹp và rác xấu", "Rác sáng và rác tối", "Rác hữu cơ và tái chế"], 3, "Chia rác hữu cơ và rác tái chế giúp xử lý rác đúng cách, bảo vệ môi trường."],
        ["t", "Máy nhận biết hình ảnh bằng cách tìm đặc điểm như hình dạng, màu sắc.", true, "Đúng vậy! Máy tìm các đặc điểm như tai nhọn, râu dài để đoán đó là con mèo."],
      ],
    },

    // ===== LEVEL 4: Vận dụng — trợ lý ảo, dữ liệu, thuật toán =====
    {
      title: "Thuật toán và dữ liệu",
      questions: [
        ["m", "Thuật toán là gì?", ["Một loại máy tính", "Một phép cộng", "Các bước giải quyết theo thứ tự", "Tên một trò chơi"], 2, "Thuật toán là các bước làm lần lượt theo thứ tự để giải quyết một việc."],
        ["m", "Trợ lý ảo hiểu câu em nói nhờ khả năng nào?", ["Nhận dạng giọng nói", "Nhận dạng vân tay", "Đo nhịp tim", "Chụp ảnh"], 0, "Trợ lý ảo dùng AI nhận dạng giọng nói để biến lời em nói thành chữ rồi hiểu ý em."],
        ["t", "Các bước đánh răng theo thứ tự cũng có thể xem là một thuật toán.", true, "Đúng rồi! Lấy bàn chải, bóp kem, chải, súc miệng là các bước theo thứ tự, giống một thuật toán."],
        ["m", "Robot ở ô 1, làm lệnh «tiến 3 ô» rồi «lùi 1 ô». Robot ở ô nào?", ["Ô 2", "Ô 4", "Ô 5", "Ô 3"], 3, "Từ ô 1 tiến 3 ô đến ô 4, lùi 1 ô về ô 3. Giỏi lắm!"],
        ["m", "Bảng ghi chiều cao, cân nặng của cả lớp được gọi là gì?", ["Thuật toán", "Dữ liệu", "Phần cứng", "Mật khẩu"], 1, "Những con số, thông tin được thu thập lại gọi là dữ liệu."],
        ["t", "Trợ lý ảo luôn trả lời đúng mọi câu hỏi, không bao giờ sai.", false, "Trợ lý ảo có thể nghe nhầm hoặc trả lời sai. Em nên kiểm tra lại thông tin quan trọng."],
        ["m", "Ứng dụng nghe nhạc gợi ý bài em thích. Nó dựa vào đâu?", ["Đoán may rủi", "Hỏi cô giáo em", "Dữ liệu các bài em đã nghe", "Thời tiết hôm nay"], 2, "Ứng dụng xem em hay nghe bài nào rồi gợi ý bài giống vậy. Đó là AI dùng dữ liệu!"],
        ["m", "«Nếu trời mưa thì mang ô» là loại lệnh gì?", ["Lệnh điều kiện", "Lệnh lặp", "Lệnh in", "Lệnh xóa"], 0, "Lệnh có «nếu… thì…» là lệnh điều kiện: chỉ làm khi điều kiện xảy ra."],
        ["t", "Dữ liệu dạy AI càng nhiều, đúng và đa dạng thì AI thường càng giỏi.", true, "Chính xác! Giống như em học nhiều bài hay thì sẽ giỏi hơn vậy."],
        ["m", "Lặp lại lệnh «bước 1 bước» 5 lần, robot đi được mấy bước?", ["1 bước", "6 bước", "10 bước", "5 bước"], 3, "Mỗi lần đi 1 bước, lặp 5 lần thì được 1 × 5 = 5 bước."],
        ["m", "Robot cần về đích nhanh nhất. Em nên chọn đường nào?", ["Đường dài, nhiều khúc quanh", "Đường ngắn, không vật cản", "Đường có tường chắn", "Đi vòng quanh sân"], 1, "Đường ngắn và không có vật cản giúp robot đến đích nhanh nhất."],
        ["t", "Máy dịch tự động luôn dịch đúng hoàn toàn mọi câu văn.", false, "Máy dịch rất tiện nhưng đôi khi dịch sai nghĩa, nhất là thành ngữ, câu đùa."],
        ["m", "Muốn robot vẽ hình vuông, lặp «đi thẳng, rẽ phải» mấy lần?", ["2 lần", "3 lần", "4 lần", "6 lần"], 2, "Hình vuông có 4 cạnh bằng nhau và 4 góc, nên lặp 4 lần là vẽ xong."],
        ["m", "Biểu đồ cột giúp em làm gì với dữ liệu?", ["So sánh số liệu dễ hơn", "Xóa dữ liệu", "Làm dữ liệu sai đi", "Giấu dữ liệu"], 0, "Nhìn các cột cao thấp, em so sánh số liệu nhanh hơn đọc bảng số."],
        ["t", "Xếp các bạn theo chiều cao từ thấp đến cao là một cách xử lý dữ liệu.", true, "Đúng vậy! Sắp xếp là một cách xử lý dữ liệu, máy tính làm việc này rất nhanh."],
      ],
    },

    // ===== LEVEL 5: Vận dụng cao — suy luận, tình huống, dùng AI có trách nhiệm =====
    {
      title: "Nhà thông thái AI",
      questions: [
        ["m", "Em nhờ AI viết cả bài văn rồi nộp như bài của mình. Việc đó thế nào?", ["Rất tốt, đỡ mệt", "Được, vì AI viết hay", "Không sao nếu cô không biết", "Không trung thực, nên tự viết"], 3, "Nộp bài AI viết mà nói là của mình là không trung thực. Em tự viết mới giỏi lên được!"],
        ["m", "AI nói «Cá voi là loài cá». Em nên làm gì?", ["Tin ngay vì AI thông minh", "Kiểm tra sách, hỏi thầy cô", "Chép vào bài kiểm tra", "Kể cho cả lớp nghe"], 1, "Cá voi là động vật có vú, không phải cá. AI có thể sai nên em cần kiểm tra lại."],
        ["t", "AI có thể đưa ra câu trả lời sai nhưng nghe rất tự tin.", true, "Đúng rồi! AI nói trôi chảy chưa chắc đã đúng, em hãy luôn kiểm tra lại."],
        ["m", "Cách dùng AI nào giúp em học tốt hơn?", ["Nhờ AI giải thích chỗ chưa hiểu", "Nhờ AI làm hết bài tập", "Chép đáp án không cần đọc", "Nhờ AI làm bài kiểm tra"], 0, "Dùng AI như một người bạn giải thích bài giúp em hiểu sâu, còn bài làm em tự làm nhé."],
        ["m", "Máy chỉ học ảnh bác sĩ nam nên nghĩ «bác sĩ đều là nam». Vì sao?", ["Máy bị hỏng màn hình", "Máy thích bác sĩ nam", "Dữ liệu dạy máy thiếu đa dạng", "Do bị mất điện"], 2, "Máy chỉ biết những gì được dạy. Dữ liệu thiếu đa dạng làm máy hiểu sai, gọi là thiên lệch."],
        ["t", "Dùng AI tạo ảnh giả của bạn cùng lớp để trêu chọc là trò đùa vô hại.", false, "Ảnh giả có thể làm bạn xấu hổ, tổn thương. Đó là bắt nạt, em không nên làm."],
        ["m", "Đèn giao thông AI: đường A có 30 xe, đường B có 5 xe. Nên cho đèn xanh lâu hơn ở đâu?", ["Đường B", "Tắt cả hai đèn", "Đường không có xe", "Đường A"], 3, "Đường A đông xe hơn nên cần đèn xanh lâu hơn để xe đi hết, bớt tắc đường."],
        ["m", "Trước khi đưa ảnh của bạn vào ứng dụng AI, em cần làm gì?", ["Không cần hỏi ai", "Xin phép bạn đó trước", "Chỉnh ảnh cho xấu đi", "Đăng lên mạng luôn"], 1, "Ảnh của bạn là thông tin riêng của bạn ấy, nên em phải xin phép trước."],
        ["t", "Máy chỉ học 1.000 ảnh táo đỏ chắc chắn sẽ nhận đúng mọi quả táo xanh.", false, "Máy chưa thấy táo xanh bao giờ nên có thể nhận nhầm. Cần thêm ảnh táo xanh để dạy."],
        ["m", "Robot hút bụi đụng tường thì rẽ hướng khác. Robot đang làm gì?", ["Làm theo lệnh «nếu… thì…»", "Robot đang giận", "Robot hết pin", "Robot đang ngủ"], 0, "Robot được lập trình: nếu đụng vật cản thì rẽ hướng khác. Đó là lệnh điều kiện."],
        ["m", "Video «người nổi tiếng» nói điều lạ, có thể do AI làm giả. Em nên?", ["Chia sẻ ngay cho mọi người", "Tin ngay vì có hình, có tiếng", "Kiểm tra ở nguồn tin tin cậy", "Bình luận chê bai"], 2, "AI có thể làm video giả rất giống thật. Kiểm tra nguồn tin trước giúp em không lan truyền tin sai."],
        ["t", "AI do con người tạo ra và học từ dữ liệu con người cung cấp.", true, "Chính xác! AI không tự nhiên có, nó do con người tạo ra và dạy bằng dữ liệu."],
        ["m", "Robot ở ô 2, lặp 3 lần lệnh «tiến 2 ô», sau đó «lùi 1 ô» một lần. Robot ở ô nào?", ["Ô 5", "Ô 7", "Ô 8", "Ô 9"], 1, "Lặp 3 lần tiến 2 ô là tiến 6 ô: 2 + 6 = 8, lùi 1 ô còn ô 7. Tuyệt vời!"],
        ["m", "AI nhận nhầm con vật vì ảnh quá mờ, tối. Em nên làm gì?", ["Tắt máy đi", "Mắng máy tính", "Xóa ứng dụng", "Chụp lại ảnh rõ, đủ sáng"], 3, "Ảnh rõ nét, đủ sáng giúp AI thấy rõ đặc điểm con vật nên nhận đúng hơn."],
        ["t", "Khi dùng AI, em cứ nhập số điện thoại, địa chỉ nhà mà không cần lo.", false, "Thông tin cá nhân cần được giữ kín. Đừng nhập địa chỉ, số điện thoại vào AI khi chưa hỏi bố mẹ."],
      ],
    },
  ],
};

export default bank;
