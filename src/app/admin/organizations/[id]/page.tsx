"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
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
  ArrowLeft,
  Building2,
  Loader2,
  AlertCircle,
  Plus,
  Users as UsersIcon,
  Save,
} from "lucide-react";
import {
  fetchOrganization,
  updateOrganization,
  fetchOrgUsers,
  createOrgUser,
  type Organization,
  type UserInfo,
} from "@/lib/api";

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;

  const [org, setOrg] = useState<Organization | null>(null);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit org form
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [savingOrg, setSavingOrg] = useState(false);

  // New user dialog
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"org_admin" | "manager" | "viewer">("viewer");
  const [savingUser, setSavingUser] = useState(false);
  const [userFormError, setUserFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [orgData, usersData] = await Promise.all([
        fetchOrganization(orgId),
        fetchOrgUsers(orgId),
      ]);
      setOrg(orgData);
      setName(orgData.name);
      setIsActive(orgData.is_active);
      setUsers(usersData.users);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load organization");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveOrg = async () => {
    setSavingOrg(true);
    try {
      const updated = await updateOrganization(orgId, { name, is_active: isActive });
      setOrg(updated);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSavingOrg(false);
    }
  };

  const handleCreateUser = async () => {
    setSavingUser(true);
    setUserFormError(null);
    try {
      await createOrgUser(orgId, {
        username,
        email,
        password,
        full_name: fullName,
        role,
      });
      setUserDialogOpen(false);
      setUsername("");
      setEmail("");
      setPassword("");
      setFullName("");
      setRole("viewer");
      load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create user";
      const match = msg.match(/API error \d+: (.*)/);
      if (match) {
        try {
          const body = JSON.parse(match[1]);
          setUserFormError(
            typeof body.detail === "string"
              ? body.detail
              : JSON.stringify(body.detail)
          );
        } catch {
          setUserFormError(msg);
        }
      } else {
        setUserFormError(msg);
      }
    } finally {
      setSavingUser(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-muted-foreground">{error || "Organization not found"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/admin/organizations")}
          className="gap-2 mb-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">{org.name}</h1>
        </div>
        <p className="text-muted-foreground font-mono text-sm">{org.slug}</p>
      </div>

      <div className="grid gap-4 grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{org.user_count}</p>
            <p className="text-sm text-muted-foreground">Users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{org.call_count}</p>
            <p className="text-sm text-muted-foreground">Calls</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Badge variant={org.is_active ? "default" : "secondary"} className="text-base">
              {org.is_active ? "Active" : "Inactive"}
            </Badge>
            <p className="text-sm text-muted-foreground mt-1">Status</p>
          </CardContent>
        </Card>
      </div>

      {/* Edit Org */}
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Active</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <Button onClick={handleSaveOrg} disabled={savingOrg} className="gap-2">
            {savingOrg ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* Users */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              Users ({users.length})
            </CardTitle>
            <Button onClick={() => setUserDialogOpen(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> New User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.username}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{u.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.is_active ? "default" : "secondary"}>
                      {u.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {users.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No users yet</p>
          )}
        </CardContent>
      </Card>

      {/* New User Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New User in {org.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {userFormError && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded">
                {userFormError}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Username</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Min 8 chars, 1 uppercase, 1 digit
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as "org_admin" | "manager" | "viewer")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="org_admin">Org Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser} disabled={savingUser}>
              {savingUser && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
