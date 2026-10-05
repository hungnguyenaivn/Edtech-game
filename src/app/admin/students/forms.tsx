"use client";
import { useActionState, useState } from "react";
import { AVATAR_COLORS } from "@/lib/rules";
import { createStudent, resetPassword, type FormState } from "../actions";

export function NewStudentForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createStudent, {});
  const [avatar, setAvatar] = useState(0);
  return (
    <form action={action} className="inline-form" key={state.ok}>
      <label className="field"><span>Họ tên</span><input name="displayName" placeholder="Nguyễn Văn A" defaultValue={state.values?.displayName} required /></label>
      <label className="field"><span>Tên đăng nhập</span><input name="username" placeholder="hs06" defaultValue={state.values?.username} required /></label>
      <label className="field"><span>Mật khẩu</span><input name="password" placeholder="ít nhất 6 ký tự" required minLength={6} /></label>
      <div className="field">
        <span>Màu áo</span>
        <div style={{ display: "flex", gap: 6, padding: "6px 0" }}>
          {AVATAR_COLORS.map((c, i) => (
            <button
              type="button"
              key={c}
              onClick={() => setAvatar(i)}
              aria-label={`Màu ${i + 1}`}
              style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: avatar === i ? "3px solid #1f2140" : "2px solid #fff", boxShadow: "0 0 0 1px #ddd" }}
            />
          ))}
        </div>
        <input type="hidden" name="avatar" value={avatar} />
      </div>
      <button className="btn btn-primary" disabled={pending}>{pending ? "Đang tạo…" : "+ Tạo tài khoản"}</button>
      {state.error && <p className="form-error" style={{ flexBasis: "100%" }}>{state.error}</p>}
      {state.ok && <p className="form-ok" style={{ flexBasis: "100%" }}>{state.ok}</p>}
    </form>
  );
}

export function ResetPasswordForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(resetPassword, {});
  return (
    <form action={action} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <input type="hidden" name="id" value={id} />
      <input name="password" placeholder="Mật khẩu mới" minLength={6} required style={{ padding: "6px 10px", borderRadius: 8, border: "1.5px solid #e0e2ee", width: 140 }} />
      <button className="btn btn-light btn-sm" disabled={pending}>Đổi</button>
      {state.error && <span className="pill pill-red">{state.error}</span>}
      {state.ok && <span className="pill pill-green">Đã đổi</span>}
    </form>
  );
}
