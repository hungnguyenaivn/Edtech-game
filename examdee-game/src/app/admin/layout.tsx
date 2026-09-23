import { logout } from "@/app/actions";
import { requireTeacher } from "@/lib/auth";
import AdminNav from "./AdminNav";

export const metadata = { title: "Giáo viên · Vũ trụ Tri thức" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const teacher = await requireTeacher();
  return (
    <div className="admin">
      <header className="admin-top">
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <span className="brand">🪐 Vũ trụ Tri thức · Giáo viên</span>
          <AdminNav />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="small">{teacher.displayName}</span>
          <form action={logout}>
            <button className="btn btn-light btn-sm">Đăng xuất</button>
          </form>
        </div>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}
