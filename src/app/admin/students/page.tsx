import Link from "next/link";
import { requireTeacher } from "@/lib/auth";
import { classStudents, progressFor } from "@/lib/admin-data";
import { AVATAR_COLORS } from "@/lib/rules";
import { NewStudentForm, ResetPasswordForm } from "./forms";

export default async function StudentsPage() {
  const teacher = await requireTeacher();
  const students = await classStudents(teacher.classId);
  const prog = await progressFor(students.map((s) => s.id));

  return (
    <>
      <h1>Học sinh</h1>
      <p className="lead">Tạo tài khoản cho học sinh. Học sinh không tự đăng ký được — cô/thầy đưa tên đăng nhập và mật khẩu cho em.</p>

      <div className="panel">
        <h2>Thêm học sinh</h2>
        <NewStudentForm />
      </div>

      <div className="panel">
        <h2>Danh sách ({students.length})</h2>
        <table className="tbl">
          <thead><tr><th>Học sinh</th><th>Tên đăng nhập</th><th>Level đã qua</th><th>Sao</th><th>Đặt lại mật khẩu</th><th></th></tr></thead>
          <tbody>
            {students.map((s) => {
              const mine = prog.filter((p) => p.userId === s.id);
              return (
                <tr key={s.id}>
                  <td>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
                      <span className="avatar-dot" style={{ background: AVATAR_COLORS[s.avatar % 6], width: 24, height: 24, fontSize: 11 }}>{s.displayName.split(" ").pop()?.[0]}</span>
                      {s.displayName}
                    </span>
                  </td>
                  <td><code>{s.username}</code></td>
                  <td>{mine.filter((p) => p.passed).length}</td>
                  <td>⭐ {mine.reduce((a, p) => a + p.bestStars, 0)}</td>
                  <td><ResetPasswordForm id={s.id} /></td>
                  <td><Link className="btn btn-light btn-sm" href={`/admin/students/${s.id}`}>Chi tiết →</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
