import StudentTopbar from "@/components/StudentTopbar";
import { requireStudent } from "@/lib/auth";
import { totalStars } from "@/lib/progress";
import SkinPicker from "./SkinPicker";

export const metadata = { title: "Trang phục · Vũ trụ Tri thức" };

export default async function SkinsPage() {
  const user = await requireStudent();
  const stars = await totalStars(user.id);
  return (
    <main className="space-bg">
      <StudentTopbar name={user.displayName} avatar={user.avatar} totalStars={stars} back={{ href: "/home", label: "Trang chủ" }} />
      <div className="page">
        <div className="page-head">
          <h1 className="title-kid">Chọn trang phục chiến binh</h1>
          <p className="muted-light">Nhân vật của em sẽ mặc bộ này trên mọi bản đồ. Đổi lúc nào cũng được!</p>
        </div>
        <SkinPicker current={user.skin} />
      </div>
    </main>
  );
}
