import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { RoleAdmin } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  MODUL,
  MODUL_DARI_SEGMEN,
  MODUL_INBOX,
  boleh,
  normalisasiIzin,
  type Izin,
} from "@/lib/permission";
import { AdminShell } from "@/components/admin/AdminShell";
import { IzinProvider } from "@/components/admin/IzinProvider";
import { NotifikasiProvider } from "@/components/admin/NotifikasiProvider";

/**
 * Penjaga halaman Portal Admin.
 *
 * Selain memastikan ada session & akun aktif, layout ini menegakkan izin
 * per-modul dari satu titik: `x-pathname` (di-set middleware) dipetakan ke
 * modul, lalu dicek `lihat`. Halaman `Kelola Admin` hanya untuk superadmin.
 * Halaman client component tidak bisa memanggil guard server sendiri, jadi
 * inilah tempat yang tepat.
 */
/**
 * Halaman pertama yang boleh dibuka admin ini.
 *
 * Dipakai sebagai tujuan pengalihan agar tidak terjadi loop: kalau admin tidak
 * berhak atas Dashboard, jangan pernah mengalihkannya kembali ke `/admin`.
 */
function halamanAwal(superadmin: boolean, izin: Izin): string {
  if (superadmin) return "/admin";
  if (boleh(izin, MODUL.DASHBOARD, "lihat")) return "/admin";
  for (const [seg, modul] of Object.entries(MODUL_DARI_SEGMEN)) {
    if (boleh(izin, modul, "lihat")) return `/admin/${seg}`;
  }
  if (MODUL_INBOX.some((m) => boleh(izin, m, "lihat"))) return "/admin/inbox";
  return "/admin/login";
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/admin/login");
  }

  const admin = await prisma.adminUser.findUnique({
    where: { id: session.sub },
    include: { divisi: { select: { nama: true } } },
  });

  if (!admin || !admin.isAktif) {
    redirect("/admin/login");
  }

  const izin = normalisasiIzin(admin.permissions);
  const superadmin = admin.role === RoleAdmin.SUPERADMIN;
  const beranda = halamanAwal(superadmin, izin);

  const jalur = (await headers()).get("x-pathname") ?? "";
  // "/admin/<segmen>/..." → "<segmen>"; string kosong = Dashboard ("/admin").
  const segmen = jalur.split("/").filter(Boolean)[1] ?? "";

  if (!segmen) {
    // Dashboard.
    if (!superadmin && !boleh(izin, MODUL.DASHBOARD, "lihat")) {
      redirect(beranda);
    }
  } else if (segmen === "admin-users") {
    if (!superadmin) redirect(beranda);
  } else if (segmen === "inbox") {
    if (!superadmin && !MODUL_INBOX.some((m) => boleh(izin, m, "lihat"))) {
      redirect(beranda);
    }
  } else if (MODUL_DARI_SEGMEN[segmen]) {
    if (!superadmin && !boleh(izin, MODUL_DARI_SEGMEN[segmen], "lihat")) {
      redirect(beranda);
    }
  }

  const { passwordHash, ...adminTanpaSandi } = admin;
  void passwordHash;

  return (
    <IzinProvider role={admin.role} permissions={izin}>
      <NotifikasiProvider>
        <AdminShell admin={adminTanpaSandi}>{children}</AdminShell>
      </NotifikasiProvider>
    </IzinProvider>
  );
}
