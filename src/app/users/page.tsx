"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Shield,
  ShieldCheck,
  Eye,
  AlertCircle,
} from "lucide-react";
import {
  fetchUsers,
  fetchAgents,
  createUser,
  updateUser,
  deleteUser,
  type UserInfo,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";

const ALL_PAGES = [
  { key: "calls", label: "Apeluri" },
  { key: "agents", label: "Agenti" },
  { key: "rules", label: "Reguli QA" },
  { key: "export", label: "Export" },
  { key: "logs", label: "Loguri & Monitorizare" },
  { key: "ingestion", label: "Ingestie date" },
  { key: "ai", label: "AI & Transcriere" },
  { key: "webhooks", label: "Export & Webhook-uri" },
  { key: "docs", label: "Documentatie" },
];

const ROLE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  admin: { label: "Admin", icon: ShieldCheck, color: "text-red-600" },
  manager: { label: "Manager", icon: Shield, color: "text-blue-600" },
  viewer: { label: "Viewer", icon: Eye, color: "text-muted-foreground" },
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form fields
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("viewer");
  const [allowedAgents, setAllowedAgents] = useState<string[]>([]);
  const [allowedPages, setAllowedPages] = useState<string[]>([]);

  // Available agents
  const [agents, setAgents] = useState<{ agentId: string; agentName: string }[]>([]);

  const loadUsers = useCallback(async () => {
    try {
      const [res, agentRes] = await Promise.all([fetchUsers(), fetchAgents()]);
      setUsers(res.users);
      setAgents(agentRes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const openCreate = () => {
    setEditingUser(null);
    setUsername("");
    setEmail("");
    setPassword("");
    setFullName("");
    setRole("viewer");
    setAllowedAgents([]);
    setAllowedPages([]);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (u: UserInfo) => {
    setEditingUser(u);
    setUsername(u.username);
    setEmail(u.email);
    setPassword("");
    setFullName(u.full_name);
    setRole(u.role);
    setAllowedAgents(u.allowed_agents || []);
    setAllowedPages(u.allowed_pages || []);
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError(null);
    try {
      if (editingUser) {
        await updateUser(editingUser.id, {
          email,
          full_name: fullName,
          role,
          allowed_agents: allowedAgents,
          allowed_pages: allowedPages,
        });
      } else {
        if (!username || !email || !password) {
          setFormError("Username, email and password are required");
          setSaving(false);
          return;
        }
        await createUser({
          username,
          email,
          password,
          full_name: fullName,
          role,
          allowed_agents: allowedAgents,
          allowed_pages: allowedPages,
        });
      }
      setDialogOpen(false);
      loadUsers();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save user";
      // Parse 422 validation errors into friendly messages
      const match = msg.match(/API error 422: (.*)/);
      if (match) {
        try {
          const body = JSON.parse(match[1]);
          const errors = (body.detail || []).map((d: { msg?: string; loc?: string[] }) => {
            const field = d.loc?.slice(-1)[0] || "";
            const message = (d.msg || "").replace("Value error, ", "").replace("value is not a valid email address: ", "");
            const fieldNames: Record<string, string> = {
              username: "Username", email: "Email", password: "Parola", full_name: "Nume",
            };
            return `${fieldNames[field] || field}: ${message}`;
          });
          setFormError(errors.join("\n"));
        } catch {
          setFormError(msg);
        }
      } else {
        // Parse other API errors like 409 Conflict
        const detailMatch = msg.match(/API error \d+: (.*)/);
        if (detailMatch) {
          try {
            const body = JSON.parse(detailMatch[1]);
            setFormError(body.detail || msg);
          } catch {
            setFormError(msg);
          }
        } else {
          setFormError(msg);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId: string, userName: string) => {
    if (!confirm(`Delete user "${userName}"?`)) return;
    try {
      await deleteUser(userId);
      loadUsers();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete user");
    }
  };

  const handleToggleActive = async (u: UserInfo) => {
    try {
      await updateUser(u.id, { is_active: !u.is_active });
      loadUsers();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update user");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.users.title}</h1>
          <p className="text-muted-foreground">{t.users.subtitle}</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> {t.users.newUser}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-3">
        {Object.entries(ROLE_CONFIG).map(([key, cfg]) => {
          const count = users.filter((u) => u.role === key).length;
          const Icon = cfg.icon;
          return (
            <Card key={key}>
              <CardContent className="pt-6 flex items-center gap-3">
                <Icon className={`h-5 w-5 ${cfg.color}`} />
                <div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-sm text-muted-foreground">{cfg.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t.users.allUsers} ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.users.username}</TableHead>
                <TableHead>{t.users.fullName}</TableHead>
                <TableHead>{t.users.email}</TableHead>
                <TableHead>{t.users.role}</TableHead>
                <TableHead>{t.users.restrictions}</TableHead>
                <TableHead>{t.users.statusLabel}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const cfg = ROLE_CONFIG[u.role] || ROLE_CONFIG.viewer;
                const Icon = cfg.icon;
                const isMe = currentUser?.id === u.id;
                return (
                  <TableRow key={u.id} className={!u.is_active ? "opacity-50" : ""}>
                    <TableCell className="font-medium">
                      {u.username}
                      {isMe && <Badge variant="secondary" className="ml-2 text-xs">{t.users.you}</Badge>}
                    </TableCell>
                    <TableCell>{u.full_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`gap-1 ${cfg.color}`}>
                        <Icon className="h-3 w-3" />
                        {cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.allowed_agents?.length > 0 && (
                        <span>{u.allowed_agents.length} agent(i)</span>
                      )}
                      {u.allowed_pages?.length > 0 && (
                        <span className={u.allowed_agents?.length ? " ml-1" : ""}>{u.allowed_pages.length} pagin(i)</span>
                      )}
                      {!u.allowed_agents?.length && !u.allowed_pages?.length && t.users.fullAccess}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={u.is_active}
                        onCheckedChange={() => handleToggleActive(u)}
                        disabled={isMe}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {!isMe && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(u.id, u.username)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? t.users.editUser : t.users.newUser}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {formError && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-3">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  {formError.split("\n").map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>{t.users.username}</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={!!editingUser}
                placeholder="ionpopescu"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t.users.fullName}</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ion Popescu"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t.users.email}</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ion@company.ro"
              />
            </div>
            {!editingUser && (
              <div className="space-y-1.5">
                <Label>{t.users.password}</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.users.passwordHint}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>{t.users.role}</Label>
              <Select value={role} onValueChange={(v) => v && setRole(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="min-w-[350px]">
                  <SelectItem value="admin">Admin — acces complet + gestionare utilizatori</SelectItem>
                  <SelectItem value="manager">Manager — acces complet</SelectItem>
                  <SelectItem value="viewer">Viewer — doar vizualizare</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Agent restrictions */}
            {role !== "admin" && (
              <div className="space-y-1.5 pt-3 border-t">
                <Label>{t.users.allowedAgents}</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  {t.users.allowedAgentsDesc}
                </p>
                <div className="grid grid-cols-2 gap-1.5 max-h-[150px] overflow-y-auto">
                  {agents.map((a) => (
                    <label key={a.agentId} className="flex items-center gap-2 text-sm cursor-pointer p-1.5 rounded hover:bg-muted">
                      <input
                        type="checkbox"
                        checked={allowedAgents.includes(a.agentId)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAllowedAgents([...allowedAgents, a.agentId]);
                          } else {
                            setAllowedAgents(allowedAgents.filter((id) => id !== a.agentId));
                          }
                        }}
                        className="rounded"
                      />
                      {a.agentName}
                    </label>
                  ))}
                </div>
                {allowedAgents.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setAllowedAgents([])} className="text-xs">
                    {t.users.clearAgents}
                  </Button>
                )}
              </div>
            )}

            {/* Page restrictions */}
            {role !== "admin" && (
              <div className="space-y-1.5 pt-3 border-t">
                <Label>{t.users.allowedPages}</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  {t.users.allowedPagesDesc}
                </p>
                <div className="grid grid-cols-2 gap-1.5 max-h-[150px] overflow-y-auto">
                  {ALL_PAGES.map((p) => (
                    <label key={p.key} className="flex items-center gap-2 text-sm cursor-pointer p-1.5 rounded hover:bg-muted">
                      <input
                        type="checkbox"
                        checked={allowedPages.includes(p.key)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAllowedPages([...allowedPages, p.key]);
                          } else {
                            setAllowedPages(allowedPages.filter((k) => k !== p.key));
                          }
                        }}
                        className="rounded"
                      />
                      {p.label}
                    </label>
                  ))}
                </div>
                {allowedPages.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setAllowedPages([])} className="text-xs">
                    {t.users.clearPages}
                  </Button>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t.users.cancel}</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingUser ? t.users.save : t.users.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
