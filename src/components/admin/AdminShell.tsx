"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  Calendar,
  Users,
  IdentificationBadge,
  UserCheck,
  Bell,
  List,
  X,
  Handshake,
  Archive,
  Newspaper,
  ShieldCheck,
  ClockCounterClockwise,
  CaretDown,
  type Icon,
} from "@phosphor-icons/react";
import { LogoutButton } from "./LogoutButton";
import { NotifikasiBell } from "./NotifikasiBell";
import { useIzin } from "./IzinProvider";
import { MODUL, type ModulSlug } from "@/lib/permission";

type Admin = {
  id: string;
  nama: string;
  email: string;
  role: string;
  createdAt: Date;
  lastLoginAt: Date | null;
};

type Leaf = {
  href: string;
  label: string;
  /** Modul yang menggerbangi item; tanpa `modul` = selalu tampil. */
  modul?: ModulSlug;
  superadminOnly?: boolean;
};

/** Grup menu: induk yang bisa dibuka-tutup, berisi item terkait. */
type Node =
  | { kind: "link"; icon: Icon; leaf: Leaf }
  | { kind: "group"; icon: Icon; label: string; anak: Leaf[] };

/**
 * Menu portal. Item yang saling terkait dikelompokkan (mis. Data Alumni +
 * Sektor Industri) supaya sidebar ringkas dan tidak perlu digulir.
 */
const MENU: Node[] = [
  { kind: "link", icon: House, leaf: { href: "/admin", label: "Dashboard" } },
  {
    kind: "link",
    icon: Bell,
    leaf: { href: "/admin/inbox", label: "Inbox", modul: MODUL.INBOX },
  },
  {
    kind: "group",
    icon: Users,
    label: "Alumni",
    anak: [
      { href: "/admin/alumni", label: "Data Alumni", modul: MODUL.ALUMNI },
      {
        href: "/admin/sektor-industri",
        label: "Sektor Industri",
        modul: MODUL.SEKTOR_INDUSTRI,
      },
      {
        href: "/admin/jejaring",
        label: "Jejaring Alumni",
        modul: MODUL.JEJARING,
      },
    ],
  },
  {
    kind: "group",
    icon: Calendar,
    label: "Kegiatan",
    anak: [
      { href: "/admin/kegiatan", label: "Data Kegiatan", modul: MODUL.KEGIATAN },
      {
        href: "/admin/kategori-kegiatan",
        label: "Kategori Kegiatan",
        modul: MODUL.KATEGORI_KEGIATAN,
      },
    ],
  },
  {
    kind: "link",
    icon: UserCheck,
    leaf: {
      href: "/admin/alumni-accounts",
      label: "Verifikasi Akun",
      modul: MODUL.VERIFIKASI_AKUN,
    },
  },
  {
    kind: "link",
    icon: IdentificationBadge,
    leaf: { href: "/admin/pengurus", label: "Pengurus Inti", modul: MODUL.PENGURUS },
  },
  {
    kind: "link",
    icon: Handshake,
    leaf: { href: "/admin/kerjasama", label: "Kerjasama", modul: MODUL.KERJASAMA },
  },
  {
    kind: "group",
    icon: Archive,
    label: "Arsip",
    anak: [
      { href: "/admin/arsip", label: "Data Arsip", modul: MODUL.ARSIP },
      { href: "/admin/jenis-arsip", label: "Jenis Arsip", modul: MODUL.JENIS_ARSIP },
    ],
  },
  {
    kind: "group",
    icon: Newspaper,
    label: "Berita",
    anak: [
      { href: "/admin/berita", label: "Data Berita", modul: MODUL.BERITA },
      {
        href: "/admin/jenis-berita",
        label: "Jenis Berita",
        modul: MODUL.JENIS_BERITA,
      },
    ],
  },
  {
    kind: "link",
    icon: ClockCounterClockwise,
    leaf: { href: "/admin/aktivitas", label: "Aktivitas", modul: MODUL.AKTIVITAS },
  },
  {
    kind: "link",
    icon: ShieldCheck,
    leaf: { href: "/admin/admin-users", label: "Kelola Admin", superadminOnly: true },
  },
];

function NavLink({
  href,
  label,
  icon: Icon,
  kecil = false,
  onClick,
}: {
  href: string;
  label: string;
  icon?: Icon;
  /** Item anak grup: lebih kecil, tanpa ikon, dengan penanda titik. */
  kecil?: boolean;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const isActive =
    pathname === href || (href !== "/admin" && pathname?.startsWith(`${href}/`));

  const kelas = kecil
    ? `flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] tracking-[-0.02em] transition-colors ${
        isActive
          ? "bg-white/15 text-white"
          : "text-white/70 hover:bg-white/10 hover:text-white"
      }`
    : `flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
        isActive
          ? "bg-[#0071e3] text-white"
          : "text-white/75 hover:bg-white/10 hover:text-white"
      }`;

  return (
    <Link href={href} onClick={onClick} className={kelas}>
      {Icon ? (
        <Icon weight="bold" className="text-lg" />
      ) : (
        kecil && (
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 rounded-full ${
              isActive ? "bg-white" : "bg-white/40"
            }`}
          />
        )
      )}
      <span className="min-w-0 truncate">{label}</span>
    </Link>
  );
}

function MenuList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { superadmin, boleh } = useIzin();
  /** Buka/tutup manual; kalau belum disentuh, grup yang memuat rute aktif dibuka. */
  const [manual, setManual] = useState<Record<string, boolean>>({});

  const terlihat = (leaf: Leaf) =>
    leaf.superadminOnly
      ? superadmin
      : leaf.modul
        ? boleh(leaf.modul, "lihat")
        : true;

  const grupTerbuka = (label: string, anak: Leaf[]) =>
    manual[label] ?? anak.some((a) => pathname?.startsWith(a.href));

  return (
    <nav className="flex-1 min-h-0 space-y-2 overflow-y-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {MENU.map((node) => {
        if (node.kind === "link") {
          if (!terlihat(node.leaf)) return null;
          return (
            <NavLink
              key={node.leaf.href}
              href={node.leaf.href}
              label={node.leaf.label}
              icon={node.icon}
              onClick={onNavigate}
            />
          );
        }

        const anak = node.anak.filter(terlihat);
        if (anak.length === 0) return null;

        const terbuka = grupTerbuka(node.label, node.anak);
        const aktif = node.anak.some((a) => pathname?.startsWith(a.href));

        return (
          <div key={node.label}>
            <button
              type="button"
              aria-expanded={terbuka}
              onClick={() =>
                setManual((prev) => ({ ...prev, [node.label]: !terbuka }))
              }
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                aktif ? "text-white" : "text-white/75 hover:bg-white/10 hover:text-white"
              }`}
            >
              <node.icon weight="bold" className="text-lg" />
              <span className="min-w-0 flex-1 truncate text-left">
                {node.label}
              </span>
              <CaretDown
                weight="bold"
                aria-hidden="true"
                className={`text-xs transition-transform ${
                  terbuka ? "rotate-180" : ""
                }`}
              />
            </button>

            {terbuka && (
              <div className="mt-1 space-y-1 pl-4">
                {anak.map((a) => (
                  <NavLink
                    key={a.href}
                    href={a.href}
                    label={a.label}
                    kecil
                    onClick={onNavigate}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export function AdminShell({
  admin,
  children,
}: {
  admin: Admin;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { superadmin } = useIzin();

  return (
    <div className="min-h-screen flex bg-[#f2f2f4] text-[#0f1012]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 sticky top-0 h-screen border-r border-white/10 bg-[#0f1012] px-5 py-6 text-white">
        <div className="flex items-center gap-3 px-2 mb-6 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-[#0071e3] text-white flex items-center justify-center">
            <House weight="bold" />
          </div>
          <div>
            <span className="block font-bold text-lg leading-tight text-white">Portal</span>
            <span className="block text-xs text-[#69adff] font-semibold">
              IKASADA
            </span>
          </div>
        </div>

        <MenuList />
      </aside>

      {/* Mobile Header */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-[#fdfdfd] border-b border-black/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#0071e3] text-white flex items-center justify-center">
              <House weight="bold" />
            </div>
            <span className="font-bold">Portal IKASADA</span>
          </div>
          <div className="flex items-center gap-1">
            <NotifikasiBell />
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-black/5"
              aria-label="Buka menu"
            >
              <List weight="bold" className="text-xl" />
            </button>
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:flex items-center justify-end gap-4 px-8 py-4 bg-[#fdfdfd] border-b border-black/[0.06]">
          <NotifikasiBell />
          {superadmin && (
            <span className="rounded-full bg-[#0071e3]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#0071e3]">
              Superadmin
            </span>
          )}
          <div className="text-right">
            <p className="text-sm font-bold">{admin.nama}</p>
            <p className="text-xs text-[#5e5e5e]">{admin.email}</p>
          </div>
          <LogoutButton variant="header" />
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-auto">{children}</main>
      </div>

      {/* Mobile Drawer */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-[#0f1012] px-5 py-6 text-white shadow-2xl lg:hidden flex flex-col">
            <div className="flex items-center justify-between mb-6 shrink-0">
              <div className="flex items-center gap-3 px-2">
                <div className="w-10 h-10 rounded-xl bg-[#0071e3] text-white flex items-center justify-center">
                  <House weight="bold" />
                </div>
                <div>
                  <span className="block font-bold text-lg leading-tight text-white">Portal</span>
                  <span className="block text-xs text-[#69adff] font-semibold">
                    IKASADA
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-lg hover:bg-white/10"
                aria-label="Tutup menu"
              >
                <X weight="bold" className="text-xl" />
              </button>
            </div>

            <MenuList onNavigate={() => setSidebarOpen(false)} />

            <div className="pt-6 border-t border-white/15 shrink-0">
              <div className="px-2 mb-3">
                <p className="text-sm font-bold truncate">{admin.nama}</p>
                <p className="text-xs text-white/60 truncate">{admin.email}</p>
                {superadmin && (
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#69adff]">
                    Superadmin
                  </p>
                )}
              </div>
              <LogoutButton />
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
