import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { RoleAdmin } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  MODUL_DARI_SEGMEN,
  boleh,
  normalisasiIzin,
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
  });

  if (!admin || !admin.isAktif) {
    redirect("/admin/login");
  }

  const izin = normalisasiIzin(admin.permissions);
  const superadmin = admin.role === RoleAdmin.SUPERADMIN;

  const jalur = (await headers()).get("x-pathname") ?? "";
  // "/admin/<segmen>/..." → "<segmen>"
  const segmen = jalur.split("/").filter(Boolean)[1] ?? "";

  if (segmen === "admin-users") {
    if (!superadmin) redirect("/admin");
  } else if (segmen && MODUL_DARI_SEGMEN[segmen]) {
    if (!superadmin && !boleh(izin, MODUL_DARI_SEGMEN[segmen], "lihat")) {
      redirect("/admin");
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
