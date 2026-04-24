"use client";

import { useState, useTransition, useEffect, useRef } from "react";
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
    "id" | "name" | "phone" | "role" | "isActive" | "lockedUntil" | "paychexId"
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
  const editPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editingId && editPanelRef.current) {
      editPanelRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [editingId]);

  function runAction(
    fn: (fd: FormData) => Promise<ActionResult>,
    fd: FormData
  ) {
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
              ? "bg-emerald-900/40 text-emerald-100 ring-emerald-400/40"
              : "bg-red-900/40 text-red-200 ring-red-400/40"
          }`}
        >
          {flash.text}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-brand-moss-500/40 bg-brand-moss-800/60">
        <table className="min-w-full divide-y divide-brand-moss-500/40 text-sm">
          <thead className="bg-brand-moss-900/50 text-left text-xs font-semibold uppercase tracking-[0.15em] text-brand-cream-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-moss-500/30">
            {users.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-brand-cream-400"
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
                  <td className="px-4 py-3 font-medium text-brand-cream-100">
                    {u.name}
                    {isSelf && (
                      <span className="ml-2 text-xs text-brand-cream-500">
                        (you)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-brand-cream-300">
                    {formatPhone(u.phone)}
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-4 py-3">
                    {!u.isActive ? (
                      <span className="inline-flex items-center rounded-full bg-brand-moss-900/60 px-2.5 py-1 text-xs font-semibold text-brand-cream-400 ring-1 ring-inset ring-brand-moss-400/40">
                        Inactive
                      </span>
                    ) : isLocked ? (
                      <span className="inline-flex items-center rounded-full bg-red-900/40 px-2.5 py-1 text-xs font-semibold text-red-200 ring-1 ring-inset ring-red-400/40">
                        Locked
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-emerald-900/40 px-2.5 py-1 text-xs font-semibold text-emerald-100 ring-1 ring-inset ring-emerald-400/40">
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
                        className="rounded-full border border-brand-moss-400/50 bg-brand-moss-700/60 px-3 py-1.5 text-xs font-medium text-brand-cream-200 hover:border-brand-brass-400/60 hover:text-brand-brass-200"
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
                          className="rounded-full border border-amber-400/50 bg-amber-900/30 px-3 py-1.5 text-xs font-medium text-amber-100 hover:bg-amber-900/50"
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
                              ? "border-red-400/50 bg-red-900/20 text-red-200 hover:bg-red-900/40"
                              : "border-emerald-400/50 bg-emerald-900/20 text-emerald-100 hover:bg-emerald-900/40"
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
        <div
          ref={editPanelRef}
          className="mt-6 rounded-2xl border border-brand-brass-400/30 bg-brand-moss-800/60 p-5 ring-1 ring-brand-brass-400/20"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-brand-cream-100">
              Edit user —{" "}
              <span className="text-brand-brass-300">
                {users.find((u) => u.id === editingId)?.name}
              </span>
            </h3>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="text-sm text-brand-cream-500 hover:text-brand-cream-300"
            >
              ✕ Close
            </button>
          </div>
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
