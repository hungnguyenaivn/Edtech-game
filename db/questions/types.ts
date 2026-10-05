/**
 * Định dạng ngân hàng câu hỏi gọn để soạn tay.
 *  - Trắc nghiệm: ["m", "Đề bài", ["A", "B", "C", "D"], chỉ_số_đáp_án_đúng (0-3), "Giải thích"]
 *  - Đúng/Sai:    ["t", "Mệnh đề", true | false, "Giải thích"]
 */
export type McqRow = ["m", string, [string, string, string, string], 0 | 1 | 2 | 3, string];
export type TfRow = ["t", string, boolean, string];
export type QuestionRow = McqRow | TfRow;

export interface LevelBank {
  title: string; // tên level ngắn, vd "Làm quen máy tính"
  questions: QuestionRow[]; // đúng 15 câu
}

export interface WorldBank {
  slug: string;
  levels: [LevelBank, LevelBank, LevelBank, LevelBank, LevelBank];
}
