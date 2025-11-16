// src/layouts/AdminLayout.tsx
import React, { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Users as UsersIcon,
  Calendar,
  Notebook,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useDetectDarkMode } from "@/components/ui/card";

/**
 * AdminLayout: responsive admin layout.
 * Sidebar collapses on md+ and becomes top header on small screens.
 */
const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isDark = useDetectDarkMode();
  const [collapsed, setCollapsed] = useState<boolean>(true);

  const role = (user?.role ?? "").toString().toLowerCase();

  let navigation: {
    name: string;
    href: string;
    icon: React.ComponentType<any>;
  }[] = [];

  if (role === "admin") {
    navigation = [
      { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { name: "Users", href: "/admin/users", icon: UsersIcon },
      { name: "Booking List", href: "/admin/bookinglist", icon: Menu },
      { name: "Settings", href: "/admin/settings", icon: Settings },
    ];
  } else if (role === "counselor") {
    navigation = [
      { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { name: "Booking List", href: "/admin/bookinglist", icon: Menu },
      { name: "Calendar", href: "/admin/calendar", icon: Calendar },
      { name: "Session Notes", href: "/admin/notes", icon: Notebook },
      { name: "Settings", href: "/admin/settings", icon: Settings },
    ];
  } else {
    navigation = [
      { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { name: "Settings", href: "/admin/settings", icon: Settings },
    ];
  }

  const roleLabel =
    role === "admin"
      ? "Administrator"
      : role === "counselor"
      ? "Counselor"
      : "Staff";

  const bgColor = isDark
    ? "bg-gray-900 text-gray-300"
    : "bg-white text-gray-700";
  const sidebarBg = isDark
    ? "bg-gray-800 border-gray-600"
    : "bg-gradient-to-b from-blue-900 to-blue-500 border-blue-300";
  const borderColor = isDark ? "border-gray-600" : "border-blue-300";
  const navInactive = isDark
    ? "text-gray-400 hover:bg-gray-700"
    : "text-white hover:bg-blue-600";
  const navActive = isDark
    ? "bg-gray-700 text-white"
    : "bg-white text-blue-800";
  const iconColor = isDark ? "text-gray-300" : "text-white";

  return (
    <div className={`min-h-screen flex flex-col md:flex-row ${bgColor}`}>
      {/* Sidebar (on md+) */}
      <aside
        onMouseEnter={() => setCollapsed(false)}
        onMouseLeave={() => setCollapsed(true)}
        className={`w-full ${
          collapsed ? "md:w-16" : "md:w-64"
        } md:flex-shrink-0 text-white border-r ${sidebarBg} transition-all duration-200 ease-in-out`}
        aria-expanded={!collapsed}
      >
        <div className="h-full flex flex-col">
          {/* Mobile top bar (visible only on small screens) */}
          <div
            className={`p-3 md:hidden flex items-center justify-between border-b ${borderColor}`}
          >
            <Link to="/" className="flex items-center gap-3">
              <img
                src="/Assets/FLAME1.png"
                alt="logo"
                className="h-10 w-auto"
              />
              <span className="font-semibold">Flame</span>
            </Link>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setCollapsed((c) => !c)}>
                <Menu />
              </Button>
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.avatar ?? ""} alt={user?.name ?? ""} />
                <AvatarFallback>{user?.name?.charAt(0) ?? "A"}</AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Logo area for md+ */}
          {!collapsed && (
            <div
              className={`hidden md:flex p-6 border-b ${borderColor} items-center justify-center`}
            >
              <Link to="/" className="flex items-center justify-center">
                <img
                  src="/Assets/FLAME1.png"
                  alt="Flame Logo"
                  className="h-16 w-auto"
                />
              </Link>
            </div>
          )}

          {/* User Info */}
          <div className={`p-3 md:p-4 border-b ${borderColor}`}>
            <div
              className={`flex items-center ${
                collapsed ? "justify-center" : ""
              }`}
            >
              <Avatar
                className={`h-10 w-10 mr-3 ${isDark ? "bg-gray-700" : ""}`}
              >
                <AvatarImage src={user?.avatar ?? ""} alt={user?.name ?? ""} />
                <AvatarFallback
                  className={isDark ? "text-gray-300" : "text-white"}
                >
                  {user?.name?.charAt(0) || "A"}
                </AvatarFallback>
              </Avatar>

              {!collapsed && (
                <div className="flex-1 overflow-hidden">
                  <p
                    className={`font-medium ${
                      isDark ? "text-gray-300" : "text-white"
                    }`}
                  >
                    {user?.name}
                  </p>
                  <p
                    className={`text-xs ${
                      isDark ? "text-gray-400" : "text-blue-100"
                    }`}
                  >
                    {roleLabel}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-2 md:p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  title={item.name}
                  className={`flex items-center px-2 py-2 text-sm font-medium rounded-md group transition-colors ${
                    isActive ? navActive : navInactive
                  } ${collapsed ? "justify-center" : ""}`}
                >
                  <Icon
                    className={`mr-3 h-5 w-5 flex-shrink-0 ${
                      isActive
                        ? isDark
                          ? "text-white"
                          : "text-blue-800"
                        : iconColor
                    }`}
                  />
                  {!collapsed && <span className="truncate">{item.name}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className={`p-3 md:p-4 mt-auto border-t ${borderColor}`}>
            <div className="flex flex-col items-center md:items-stretch">
              <Button
                variant="ghost"
                className={`justify-start hover:bg-blue-700 w-full ${
                  isDark ? "text-gray-400 hover:text-gray-300" : "text-white"
                } ${collapsed ? "justify-center" : ""}`}
                onClick={logout}
              >
                <LogOut
                  className={`mr-2 h-4 w-4 ${
                    isDark ? "text-gray-400" : "text-white"
                  }`}
                />
                {!collapsed && "Logout"}
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 overflow-auto ${
          isDark ? "bg-gray-900" : "bg-white"
        } transition-all duration-200`}
      >
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
