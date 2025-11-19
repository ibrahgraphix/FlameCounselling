// src/pages/admin/AdminUsers.tsx
import React, { useState, useEffect } from "react";
import {
  getCounselors,
  getUsers,
  updateUserStatus,
  deleteUser,
  createUser as apiCreateUser,
} from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  MoreHorizontal,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { useDetectDarkMode } from "@/components/ui/card";

type User = {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: "admin" | "user" | "counselor";
  status: "active" | "inactive";
  raw?: any;
};

const makeAvatar = (seed?: string) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
    seed ?? "user"
  )}`;

const AdminUsers: React.FC = () => {
  const isDark = useDetectDarkMode();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [detailsUser, setDetailsUser] = useState<User | null>(null);

  // Add User modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "counselor">("admin");
  const [addingUser, setAddingUser] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);

        // fetch counselors (primary source)
        const counselors = (await getCounselors()) || [];

        // fetch all users (may include students/counselors/admins) but we only keep admins from it
        const allUsers = (await getUsers(1000)) || [];

        // Extract admins from allUsers
        const admins = (allUsers || [])
          .filter((u: any) => {
            const roleStr = (u.role ?? u.raw?.role ?? u.role_name ?? "")
              .toString()
              .toLowerCase();
            return roleStr === "admin" || roleStr === "administrator";
          })
          .map((a: any) => {
            const id = String(
              a.id ?? a.userId ?? a.admin_id ?? a.adminId ?? ""
            );
            const name = a.name ?? a.full_name ?? a.email ?? id;
            const email = a.email ?? "";
            const avatar =
              a.avatar ??
              (name ? makeAvatar(name) : makeAvatar(email ?? "admin"));

            // status fallback
            const statusRaw =
              (a.status ?? a.raw?.status ?? "active")
                ?.toString()
                .toLowerCase() ?? "active";
            const status: User["status"] =
              statusRaw === "inactive" ? "inactive" : "active";

            return {
              id,
              name,
              email,
              avatar,
              role: "admin" as User["role"],
              status,
            } as User;
          });

        // Map counselors into same shape
        const mappedCounselors: User[] = (counselors || []).map(
          (c: any, idx: number) => {
            const id = String(
              c.id ?? c.counselor_id ?? c.raw?.id ?? `c-${idx}`
            );
            const name = c.name ?? c.full_name ?? c.raw?.name ?? id;
            const email = c.email ?? c.raw?.email ?? "";
            const avatar =
              c.avatar ??
              (name
                ? makeAvatar(name)
                : makeAvatar(email ?? `counselor-${id}`));
            const statusRaw =
              (c.status ?? c.raw?.status ?? "active")
                ?.toString()
                .toLowerCase() ?? "active";
            const status: User["status"] =
              statusRaw === "inactive" ? "inactive" : "active";
            return {
              id,
              name,
              email,
              avatar,
              role: "counselor",
              status,
            } as User;
          }
        );

        // Merge admins + counselors, dedupe by id (admins should be kept as admin)
        const mergedMap = new Map<string, User>();

        // Put admins first (so if same id appears in counselors, admin role is preserved)
        for (const a of admins) {
          if (!a.id) continue;
          mergedMap.set(a.id, a);
        }
        for (const c of mappedCounselors) {
          if (!c.id) continue;
          if (!mergedMap.has(c.id)) mergedMap.set(c.id, c);
        }

        const merged = Array.from(mergedMap.values());

        setUsers(merged);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast.error("Failed to load users");
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // filter users
  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper to update state after a backend change
  const applyStatusUpdate = (userId: string, status: "active" | "inactive") => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status } : u))
    );
  };

  const handleActivateUser = async (user: User) => {
    if (!window.confirm(`Activate ${user.name}?`)) return;
    try {
      // Use the user's role (admin or counselor)
      await updateUserStatus(
        user.role === "user" ? "student" : user.role,
        user.id,
        "active"
      );
      applyStatusUpdate(user.id, "active");
      toast.success("User activated");
    } catch (err: any) {
      console.error("activate user error", err);
      toast.error(err?.message ?? "Failed to activate user");
    }
  };

  const handleDeactivateUser = async (user: User) => {
    if (!window.confirm(`Deactivate ${user.name}?`)) return;
    try {
      await updateUserStatus(
        user.role === "user" ? "student" : user.role,
        user.id,
        "inactive"
      );
      applyStatusUpdate(user.id, "inactive");
      toast.success("User deactivated");
    } catch (err: any) {
      console.error("deactivate user error", err);
      toast.error(err?.message ?? "Failed to deactivate user");
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (
      !window.confirm(`Permanently delete ${user.name}? This cannot be undone.`)
    )
      return;
    try {
      await deleteUser(user.role === "user" ? "student" : user.role, user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      toast.success("User deleted");
    } catch (err: any) {
      console.error("delete user error", err);
      toast.error(err?.message ?? "Failed to delete user");
    }
  };

  // ---------------- Add User handlers ----------------
  const openAddModal = () => {
    setNewName("");
    setNewEmail("");
    setNewRole("admin");
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
  };

  const handleAddUser = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Basic validation
    if (!newName.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!newEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      toast.error("Valid email is required");
      return;
    }

    try {
      setAddingUser(true);

      const payload = {
        name: newName.trim(),
        email: newEmail.trim(),
        role: newRole,
      };

      // === IMPORTANT: do NOT use createCounselor import.
      // For counselors, send a direct POST to the counselors endpoint so DB writes go to `counselors` table.
      // For admins, use existing apiCreateUser (unchanged).
      let created: any = null;

      if (newRole === "counselor") {
        // direct fetch to counselors endpoint (keeps other code untouched)
        const res = await fetch("/api/counselors", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          // try to parse error json, fall back to status text
          let errBody: any = null;
          try {
            errBody = await res.json();
          } catch {
            errBody = { message: await res.text() };
          }
          throw new Error(
            errBody?.error ??
              errBody?.message ??
              `Create failed (${res.status})`
          );
        }

        created = await res.json();
      } else {
        // admin path: leave existing apiCreateUser usage intact
        created = await apiCreateUser(payload);
      }

      // Normalise the returned user to the shape we use in the table
      const id = String(
        created?.counselor_id ?? created?.id ?? created?.user_id ?? Date.now()
      );
      const name = created?.name ?? created?.full_name ?? newName;
      const email = created?.email ?? newEmail;
      const avatar = created?.avatar ?? makeAvatar(name ?? email);

      const userObj: User = {
        id,
        name,
        email,
        avatar,
        role: newRole as unknown as User["role"],
        status: (created?.status ?? "active") as User["status"],
        raw: created,
      };

      // append to top of the table
      setUsers((prev) => [userObj, ...prev]);
      toast.success("User added");
      setShowAddModal(false);
    } catch (err: any) {
      console.error("Add user failed:", err);
      const msg =
        err?.response?.data?.error ?? err?.message ?? "Failed to add user";
      toast.error(msg);
    } finally {
      setAddingUser(false);
    }
  };

  const bgColor = isDark ? "bg-gray-900" : "bg-white";
  const textColor = isDark ? "text-gray-300" : "text-gray-700";
  const mutedColor = isDark ? "text-gray-400" : "text-gray-600";
  const borderColor = isDark ? "border-gray-600" : "border-gray-200";
  const summaryBg = isDark ? "bg-gray-800/50" : "bg-white";
  const summaryIconBg = isDark ? "bg-blue-900/20" : "bg-blue-50";
  const summaryIconColor = isDark ? "text-blue-400" : "text-blue-600";

  return (
    <div className={`min-h-screen pt-6 pb-16 ${bgColor}`}>
      <div className={`mindease-container ${textColor}`}>
        <div className="mb-8">
          <h1
            className="page-heading"
            style={{ color: isDark ? "#e6eefc" : undefined }}
          >
            User Management
          </h1>
          <p
            className="text-muted-foreground"
            style={{ color: isDark ? "#cbd5e1" : undefined }}
          >
            View, edit, and manage user accounts on the platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className={summaryBg}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p
                    className="text-sm font-medium text-muted-foreground"
                    style={{ color: isDark ? "#cbd5e1" : undefined }}
                  >
                    Total Users
                  </p>
                  <div className="text-2xl font-bold mt-1">{users.length}</div>
                </div>
                <div
                  className={`rounded-md p-2 ${summaryIconBg}`}
                  style={{ color: summaryIconColor }}
                >
                  <Users className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={summaryBg}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p
                    className="text-sm font-medium text-muted-foreground"
                    style={{ color: isDark ? "#cbd5e1" : undefined }}
                  >
                    Active Users
                  </p>
                  <div className="text-2xl font-bold mt-1">
                    {users.filter((u) => u.status === "active").length}
                  </div>
                </div>
                <div
                  className={`rounded-md p-2 ${summaryIconBg}`}
                  style={{ color: summaryIconColor }}
                >
                  <Users className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={summaryBg}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p
                    className="text-sm font-medium text-muted-foreground"
                    style={{ color: isDark ? "#cbd5e1" : undefined }}
                  >
                    Administrators
                  </p>
                  <div className="text-2xl font-bold mt-1">
                    {users.filter((u) => u.role === "admin").length}
                  </div>
                </div>
                <div
                  className={`rounded-md p-2 ${summaryIconBg}`}
                  style={{ color: summaryIconColor }}
                >
                  <Users className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="relative w-full md:max-w-sm">
            <Search
              className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${mutedColor}`}
            />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => setSearchQuery("")}
              className={textColor}
            >
              Clear
            </Button>
            <Button onClick={openAddModal} className={textColor}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        </div>

        <Card className={summaryBg}>
          <CardContent className="p-0">
            {loading ? (
              <div className={`py-32 flex justify-center ${mutedColor}`}>
                <Loader2 className="h-8 w-8 animate-spin text-mindease-primary" />
              </div>
            ) : filteredUsers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user, idx) => (
                    <TableRow key={`${user.role}-${user.id}-${idx}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <Avatar
                            className={`h-8 w-8 ${isDark ? "bg-gray-700" : ""}`}
                          >
                            {user.avatar ? (
                              <AvatarImage src={user.avatar} alt={user.name} />
                            ) : (
                              <AvatarFallback className={textColor}>
                                {user.name?.charAt(0) ?? "U"}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div>
                            <div
                              className="font-medium"
                              style={{
                                color: isDark ? "#e6eefc" : undefined,
                              }}
                            >
                              {user.name}
                            </div>
                            <div
                              className="text-xs text-muted-foreground"
                              style={{
                                color: isDark ? "#cbd5e1" : undefined,
                              }}
                            >
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={
                            user.role === "admin"
                              ? "default"
                              : user.role === "counselor"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {user.role}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={
                            user.status === "active" ? "default" : "secondary"
                          }
                        >
                          {user.status}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal
                                className={`h-4 w-4 ${textColor}`}
                              />
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDetailsUser(user)}
                            >
                              View Details
                            </DropdownMenuItem>

                            {user.status === "inactive" ? (
                              <DropdownMenuItem
                                onClick={() => handleActivateUser(user)}
                              >
                                Activate User
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => handleDeactivateUser(user)}
                              >
                                Deactivate User
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600"
                              onClick={() => handleDeleteUser(user)}
                            >
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className={`py-32 text-center ${mutedColor}`}>
                <p
                  className="text-muted-foreground mb-4"
                  style={{ color: isDark ? "#cbd5e1" : undefined }}
                >
                  No users found matching "{searchQuery}"
                </p>
                <Button
                  onClick={() => setSearchQuery("")}
                  className={textColor}
                >
                  Clear Search
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Simple details modal — name + email */}
        {detailsUser && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={() => setDetailsUser(null)}
          >
            <div
              className={`${
                isDark ? "bg-gray-800 text-gray-300" : "bg-white text-gray-700"
              } rounded-lg p-6 w-96`}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className={`text-lg font-semibold mb-2 ${textColor}`}>
                User Details
              </h3>
              <p className={`text-sm text-muted-foreground mb-4 ${mutedColor}`}>
                Name: {detailsUser.name}
              </p>
              <p className={`text-sm text-muted-foreground mb-4 ${mutedColor}`}>
                Email: {detailsUser.email}
              </p>
              <div className="flex justify-end">
                <Button
                  onClick={() => setDetailsUser(null)}
                  className={textColor}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Add User Modal */}
        {showAddModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={closeAddModal}
          >
            <form
              className={`${
                isDark ? "bg-gray-800 text-gray-300" : "bg-white text-gray-700"
              } rounded-lg p-6 w-full max-w-md`}
              onSubmit={handleAddUser}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className={`text-lg font-semibold ${textColor}`}>
                  Add User
                </h3>
                <button
                  type="button"
                  className={`p-1 rounded ${
                    isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"
                  }`}
                  onClick={closeAddModal}
                >
                  <X className={`h-4 w-4 ${textColor}`} />
                </button>
              </div>

              <div className="space-y-3 mb-4">
                <div>
                  <label
                    className={`text-sm text-muted-foreground block mb-1 ${mutedColor}`}
                  >
                    Name
                  </label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Full name"
                    className={textColor}
                  />
                </div>

                <div>
                  <label
                    className={`text-sm text-muted-foreground block mb-1 ${mutedColor}`}
                  >
                    Email
                  </label>
                  <Input
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="user@example.com"
                    type="email"
                    className={textColor}
                  />
                </div>

                <div>
                  <label
                    className={`text-sm text-muted-foreground block mb-1 ${mutedColor}`}
                  >
                    Role
                  </label>
                  <div className="flex gap-2">
                    <Button
                      variant={newRole === "admin" ? "default" : "outline"}
                      onClick={(ev) => {
                        ev.preventDefault();
                        setNewRole("admin");
                      }}
                      className={textColor}
                    >
                      Admin
                    </Button>
                    <Button
                      variant={newRole === "counselor" ? "default" : "outline"}
                      onClick={(ev) => {
                        ev.preventDefault();
                        setNewRole("counselor");
                      }}
                      className={textColor}
                    >
                      Counselor
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={closeAddModal}
                  type="button"
                  className={textColor}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addingUser}
                  className={textColor}
                >
                  {addingUser ? "Adding..." : "Add User"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;
