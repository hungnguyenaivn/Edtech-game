"use client";
import { useActionState } from "react";
import { login, type LoginState } from "../actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="form-stack">
      <label className="field">
        <span>Tên đăng nhập</span>
        <input name="username" autoComplete="username" placeholder="vd: hs01" defaultValue={state.username} autoFocus={!state.username} required />
      </label>
      <label className="field">
        <span>Mật khẩu</span>
        <input name="password" type="password" autoComplete="current-password" placeholder="••••••" autoFocus={!!state.username} required />
      </label>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <button className="btn btn-primary btn-lg" disabled={pending}>
        {pending ? "Đang vào…" : "Vào chơi ▶"}
      </button>
    </form>
  );
}
