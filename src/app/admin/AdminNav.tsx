"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Tiến độ lớp" },
  { href: "/admin/students", label: "Học sinh" },
  { href: "/admin/questions", label: "Câu hỏi" },
];

export default function AdminNav() {
  const path = usePathname();
  return (
    <nav className="admin-nav">
      {LINKS.map((l) => {
        const active = l.href === "/admin" ? path === "/admin" : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} className={active ? "active" : ""}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
