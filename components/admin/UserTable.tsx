"use client";

import { useState, useTransition } from "react";
import type { User } from "@prisma/client";
import { RoleBadge } from "@/components/RoleBadge";
import { UserForm } from "./UserForm";
import { formatPhone } from "@/lib/phone";
import {
  toggleActive,
  unlockUser,
  type ActionResult,
} from "@/app/admin/users/actions";

interface UserRow
  extends Pick<
    User,
    "id" | "name" | "phone" | "role" | "isActive" | "lockedUntil"
  > {}

export function UserTable({
  users,
  currentAdminId,
}: {
  users: UserRow[];
  currentAdminId: string;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [flash, setFlash] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function runAction(fn: (fd: FormData) => Promise<ActionResult>, fd: FormData) {
    startTransition(async () => {
      const result = await fn(fd);
      setFlash(
        result.ok
          ? { kind: "ok", text: result.message ?? "Done." }
          : { kind: "err", text: result.error }
      );
    });
  }

  return (
    <div>
      {flash && (
        <div
          role="status"
          className={`mb-4 rounded-lg px-3 py-2 text-sm ring-1 ${
            flash.kind === "ok"
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
              : "bg-red-50 text-red-700 ring-red-200"
          }`}
        >
          {flash.text}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-slate-500"
                >
                  No users yet.
                </td>
              </tr>
            )}
            {users.map((u) => {
              const isLocked =
                u.lockedUntil !== null && u.lockedUntil > new Date();
              const isSelf = u.id === currentAdminId;
              return (
                <tr key={u.id} className="align-middle">
                  <td className="px-4 py-3 font-medium text-brand-navy">
                    {u.name}
                    {isSelf && (
                      <span className="ml-2 text-xs text-slate-400">
                        (you)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatPhone(u.phone)}
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-4 py-3">
                    {!u.isActive ? (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
                        Inactive
                      </span>
                    ) : isLocked ? (
                      <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200">
                        Locked
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setEditingId(editingId === u.id ? null : u.id)
                        }
                        className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        {editingId === u.id ? "Close" : "Edit"}
                      </button>
                      {isLocked && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            const fd = new FormData();
                            fd.set("id", u.id);
                            runAction(unlockUser, fd);
                          }}
                          className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
                        >
                          Unlock
                        </button>
                      )}
                      {!isSelf && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            const fd = new FormData();
                            fd.set("id", u.id);
                            runAction(toggleActive, fd);
                          }}
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                            u.isActive
                              ? "border-red-300 bg-white text-red-700 hover:bg-red-50"
                              : "border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50"
                          }`}
                        >
                          {u.isActive ? "Deactivate" : "Reactivate"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editingId && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-4 text-lg font-semibold text-brand-navy">
            Edit user
          </h3>
          <UserForm
            mode="edit"
            user={users.find((u) => u.id === editingId)}
            onDone={() => setEditingId(null)}
          />
        </div>
      )}
    </div>
  );
}
