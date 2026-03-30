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
  createUser,
  updateUser,
  deleteUser,
  type UserInfo,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";

const ROLE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  admin: { label: "Admin", icon: ShieldCheck, color: "text-red-600" },
  manager: { label: "Manager", icon: Shield, color: "text-blue-600" },
  viewer: { label: "Viewer", icon: Eye, color: "text-muted-foreground" },
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
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

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetchUsers();
      setUsers(res.users);
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
        });
      }
      setDialogOpen(false);
      loadUsers();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to save user");
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
          <h1 className="text-3xl font-bold tracking-tight">Utilizatori</h1>
          <p className="text-muted-foreground">Gestionarea conturilor de acces.</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Utilizator nou
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
            Toti utilizatorii ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilizator</TableHead>
                <TableHead>Nume complet</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Status</TableHead>
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
                      {isMe && <Badge variant="secondary" className="ml-2 text-xs">Tu</Badge>}
                    </TableCell>
                    <TableCell>{u.full_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`gap-1 ${cfg.color}`}>
                        <Icon className="h-3 w-3" />
                        {cfg.label}
                      </Badge>
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
            <DialogTitle>{editingUser ? "Editare utilizator" : "Utilizator nou"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {formError && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-3">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {formError}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Username</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={!!editingUser}
                placeholder="ionpopescu"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nume complet</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ion Popescu"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ion@company.ro"
              />
            </div>
            {!editingUser && (
              <div className="space-y-1.5">
                <Label>Parola</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minim 8 caractere, 1 majuscula, 1 cifra"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <Select value={role} onValueChange={(v) => v && setRole(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="min-w-[350px]">
                  <SelectItem value="admin">Admin — acces complet + gestionare utilizatori</SelectItem>
                  <SelectItem value="manager">Manager — acces complet</SelectItem>
                  <SelectItem value="viewer">Viewer — doar vizualizare</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Anuleaza</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingUser ? "Salveaza" : "Creeaza"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
