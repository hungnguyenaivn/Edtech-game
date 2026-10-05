import LoginForm from "./LoginForm";

export const metadata = { title: "Đăng nhập · Vũ trụ Tri thức" };

export default function LoginPage() {
  return (
    <main className="space-bg center-screen">
      <div className="login-card">
        <div className="login-logo" aria-hidden>
          <span className="logo-planet" />
        </div>
        <h1 className="title-kid">Vũ trụ Tri thức</h1>
        <p className="muted">Đăng nhập bằng tài khoản thầy cô cấp cho em</p>
        <LoginForm />
      </div>
    </main>
  );
}
