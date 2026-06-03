/**
 * Address Book Panel — Kingdom contacts & groups.
 * Wave 2. Sovereign. Provider-agnostic.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Users, User, Search, X, Save } from "lucide-react";
import {
  listAddressBook,
  upsertContact,
  deleteContact,
  upsertGroup,
  deleteGroup,
  type ContactRow,
  type GroupRow,
} from "@/server/contacts.functions";

type Tab = "contacts" | "groups";

export function AddressBookPanel({
  open,
  onClose,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const listFn = useServerFn(listAddressBook);
  const upsertContactFn = useServerFn(upsertContact);
  const deleteContactFn = useServerFn(deleteContact);
  const upsertGroupFn = useServerFn(upsertGroup);
  const deleteGroupFn = useServerFn(deleteGroup);

  const [tab, setTab] = useState<Tab>("contacts");
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [editingContact, setEditingContact] = useState<Partial<ContactRow> | null>(null);
  const [editingGroup, setEditingGroup] = useState<(Partial<GroupRow> & { member_ids?: string[] }) | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const r = await listFn({});
    setLoading(false);
    if (r.ok) {
      setContacts(r.contacts);
      setGroups(r.groups);
    } else setErr(r.error);
  }, [listFn]);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  const filteredContacts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.display_name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.organization.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [contacts, query]);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) => g.name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q),
    );
  }, [groups, query]);

  const saveContact = async () => {
    if (!editingContact?.display_name?.trim() || !editingContact?.email?.trim()) {
      setErr("Name and email are required."); return;
    }
    setErr(null);
    const r = await upsertContactFn({
      data: {
        id: editingContact.id,
        display_name: editingContact.display_name.trim(),
        email: editingContact.email.trim(),
        organization: editingContact.organization ?? "",
        role_title: editingContact.role_title ?? "",
        phone: editingContact.phone ?? "",
        address: editingContact.address ?? "",
        notes: editingContact.notes ?? "",
        tags: editingContact.tags ?? [],
      },
    });
    if (!r.ok) { setErr(r.error); return; }
    setEditingContact(null);
    await refresh();
    onChanged?.();
  };

  const removeContact = async (id: string) => {
    if (!confirm("Remove this contact from the Kingdom Address Book?")) return;
    const r = await deleteContactFn({ data: { id } });
    if (!r.ok) { setErr(r.error); return; }
    await refresh();
    onChanged?.();
  };

  const saveGroup = async () => {
    if (!editingGroup?.name?.trim()) { setErr("Group name is required."); return; }
    setErr(null);
    const r = await upsertGroupFn({
      data: {
        id: editingGroup.id,
        name: editingGroup.name.trim(),
        description: editingGroup.description ?? "",
        member_ids: editingGroup.member_ids ?? [],
      },
    });
    if (!r.ok) { setErr(r.error); return; }
    setEditingGroup(null);
    await refresh();
    onChanged?.();
  };

  const removeGroup = async (id: string) => {
    if (!confirm("Disband this group? (Contacts themselves are kept.)")) return;
    const r = await deleteGroupFn({ data: { id } });
    if (!r.ok) { setErr(r.error); return; }
    await refresh();
    onChanged?.();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2" style={{ fontFamily: "Cinzel, serif" }}>
            <Users className="h-5 w-5" /> Kingdom Address Book
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex gap-2 border-b border-border/40">
          {(["contacts", "groups"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setEditingContact(null); setEditingGroup(null); }}
              className={`px-3 py-2 text-sm capitalize ${
                tab === t ? "border-b-2 border-primary font-medium" : "text-muted-foreground"
              }`}
            >
              {t === "contacts" ? `Contacts (${contacts.length})` : `Groups (${groups.length})`}
            </button>
          ))}
        </div>

        {err && (
          <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
            {err}
          </div>
        )}

        <div className="mt-4 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${tab}…`}
              className="pl-8"
            />
          </div>
          {tab === "contacts" ? (
            <Button
              size="sm"
              onClick={() =>
                setEditingContact({
                  display_name: "",
                  email: "",
                  organization: "",
                  role_title: "",
                  phone: "",
                  address: "",
                  notes: "",
                  tags: [],
                })
              }
            >
              <Plus className="h-4 w-4 mr-1" /> Contact
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => setEditingGroup({ name: "", description: "", member_ids: [] })}
            >
              <Plus className="h-4 w-4 mr-1" /> Group
            </Button>
          )}
        </div>

        {/* Editors */}
        {tab === "contacts" && editingContact && (
          <ContactEditor
            value={editingContact}
            onChange={setEditingContact}
            onCancel={() => setEditingContact(null)}
            onSave={saveContact}
          />
        )}
        {tab === "groups" && editingGroup && (
          <GroupEditor
            value={editingGroup}
            contacts={contacts}
            onChange={setEditingGroup}
            onCancel={() => setEditingGroup(null)}
            onSave={saveGroup}
          />
        )}

        {/* Lists */}
        <div className="mt-4 space-y-2">
          {loading && <p className="text-xs text-muted-foreground">Reading the scroll…</p>}
          {tab === "contacts" &&
            filteredContacts.map((c) => (
              <div
                key={c.id}
                className="flex items-start justify-between gap-2 rounded-md border border-border/40 p-2"
              >
                <button
                  className="flex-1 text-left"
                  onClick={() => setEditingContact(c)}
                >
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    {c.display_name}
                  </div>
                  <div className="text-xs text-muted-foreground">{c.email}</div>
                  {(c.organization || c.role_title) && (
                    <div className="text-[11px] text-muted-foreground">
                      {[c.role_title, c.organization].filter(Boolean).join(" · ")}
                    </div>
                  )}
                  {c.tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {c.tags.map((t) => (
                        <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                      ))}
                    </div>
                  )}
                </button>
                <Button size="icon" variant="ghost" onClick={() => removeContact(c.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          {tab === "groups" &&
            filteredGroups.map((g) => (
              <div
                key={g.id}
                className="flex items-start justify-between gap-2 rounded-md border border-border/40 p-2"
              >
                <button
                  className="flex-1 text-left"
                  onClick={() => setEditingGroup({ ...g, member_ids: g.member_ids })}
                >
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    {g.name}
                    <Badge variant="secondary" className="text-[10px]">
                      {g.member_count} {g.member_count === 1 ? "member" : "members"}
                    </Badge>
                  </div>
                  {g.description && (
                    <div className="text-xs text-muted-foreground">{g.description}</div>
                  )}
                  <div className="mt-1 text-[10px] text-muted-foreground italic">
                    Use in To/Cc/Bcc as <code>group:{g.name}</code>
                  </div>
                </button>
                <Button size="icon" variant="ghost" onClick={() => removeGroup(g.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          {!loading && tab === "contacts" && filteredContacts.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              No contacts yet. Tomorrow We can import Your existing CSVs in one pass.
            </p>
          )}
          {!loading && tab === "groups" && filteredGroups.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              No groups yet. Create one for Provincial Courts, City Councillors, etc.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Contact Editor ──────────────────────────────────────────────────────
function ContactEditor({
  value,
  onChange,
  onCancel,
  onSave,
}: {
  value: Partial<ContactRow>;
  onChange: (v: Partial<ContactRow>) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const set = <K extends keyof ContactRow>(k: K, v: ContactRow[K]) =>
    onChange({ ...value, [k]: v });
  const tagsText = (value.tags ?? []).join(", ");
  return (
    <div className="mt-4 space-y-2 rounded-md border border-primary/30 bg-primary/5 p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{value.id ? "Edit contact" : "New contact"}</h4>
        <Button size="icon" variant="ghost" onClick={onCancel}><X className="h-4 w-4" /></Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="Display name *" value={value.display_name ?? ""} onChange={(e) => set("display_name", e.target.value)} />
        <Input placeholder="Email *" value={value.email ?? ""} onChange={(e) => set("email", e.target.value)} />
        <Input placeholder="Organization" value={value.organization ?? ""} onChange={(e) => set("organization", e.target.value)} />
        <Input placeholder="Role / Title" value={value.role_title ?? ""} onChange={(e) => set("role_title", e.target.value)} />
        <Input placeholder="Phone" value={value.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
        <Input
          placeholder="Tags (comma-separated)"
          value={tagsText}
          onChange={(e) => set("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))}
        />
      </div>
      <Textarea placeholder="Address" value={value.address ?? ""} onChange={(e) => set("address", e.target.value)} rows={2} />
      <Textarea placeholder="Notes" value={value.notes ?? ""} onChange={(e) => set("notes", e.target.value)} rows={2} />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={onSave}><Save className="h-4 w-4 mr-1" /> Save</Button>
      </div>
    </div>
  );
}

// ─── Group Editor ────────────────────────────────────────────────────────
function GroupEditor({
  value,
  contacts,
  onChange,
  onCancel,
  onSave,
}: {
  value: Partial<GroupRow> & { member_ids?: string[] };
  contacts: ContactRow[];
  onChange: (v: Partial<GroupRow> & { member_ids?: string[] }) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const [memberQuery, setMemberQuery] = useState("");
  const memberIds = value.member_ids ?? [];
  const memberSet = new Set(memberIds);
  const filtered = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    if (!q) return contacts.slice(0, 50);
    return contacts.filter(
      (c) => c.display_name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q),
    );
  }, [contacts, memberQuery]);

  const toggle = (id: string) => {
    const next = new Set(memberSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ ...value, member_ids: Array.from(next) });
  };

  return (
    <div className="mt-4 space-y-2 rounded-md border border-primary/30 bg-primary/5 p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{value.id ? "Edit group" : "New group"}</h4>
        <Button size="icon" variant="ghost" onClick={onCancel}><X className="h-4 w-4" /></Button>
      </div>
      <Input placeholder="Group name *" value={value.name ?? ""} onChange={(e) => onChange({ ...value, name: e.target.value })} />
      <Input placeholder="Description" value={value.description ?? ""} onChange={(e) => onChange({ ...value, description: e.target.value })} />

      <div className="rounded-md border border-border/40 p-2">
        <div className="text-xs font-medium mb-1">Members ({memberIds.length})</div>
        <Input
          placeholder="Search contacts to add…"
          value={memberQuery}
          onChange={(e) => setMemberQuery(e.target.value)}
          className="mb-2"
        />
        <div className="max-h-60 overflow-y-auto space-y-1">
          {filtered.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-xs rounded px-1.5 py-1 hover:bg-muted/40 cursor-pointer">
              <input type="checkbox" checked={memberSet.has(c.id)} onChange={() => toggle(c.id)} />
              <span className="font-medium">{c.display_name}</span>
              <span className="text-muted-foreground">{c.email}</span>
            </label>
          ))}
          {filtered.length === 0 && (
            <p className="text-[11px] text-muted-foreground italic">No contacts match.</p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={onSave}><Save className="h-4 w-4 mr-1" /> Save</Button>
      </div>
    </div>
  );
}
