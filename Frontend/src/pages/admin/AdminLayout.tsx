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

  // Main navigation (NOTE: Settings removed from here; moved to bottom "System" section)
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
      // Settings intentionally removed from main nav
    ];
  } else if (role === "counselor") {
    navigation = [
      { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { name: "Booking List", href: "/admin/bookinglist", icon: Menu },
      { name: "Calendar", href: "/admin/calendar", icon: Calendar },
      { name: "Session Notes", href: "/admin/notes", icon: Notebook },
      // Settings intentionally removed from main nav
    ];
  } else {
    navigation = [
      { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
      // Settings intentionally removed from main nav
    ];
  }

  // System section (pinned to bottom)
  const systemItems: {
    name: string;
    href: string;
    icon: React.ComponentType<any>;
  }[] = [{ name: "Settings", href: "/admin/settings", icon: Settings }];

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
  const panelBg = isDark
    ? "bg-gray-800"
    : "bg-gradient-to-r from-blue-900 to-blue-500";

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
              <div className="flex items-center gap-1">
                <Avatar className="h-9 w-9">
                  <AvatarImage
                    src={user?.avatar ?? ""}
                    alt={user?.name ?? ""}
                  />
                  <AvatarFallback>
                    {user?.name?.charAt(0) ?? "A"}
                  </AvatarFallback>
                </Avatar>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-9 w-9 p-0 ${
                    isDark
                      ? "text-gray-400 hover:bg-gray-700"
                      : "text-white hover:bg-blue-600"
                  }`}
                  onClick={logout}
                >
                  <LogOut className={`h-4 w-4 ${iconColor}`} />
                </Button>
              </div>
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

          {/* Navigation (main) */}
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
                  } ${collapsed ? "justify-center" : "justify-start"}`}
                >
                  <Icon
                    className={`${
                      collapsed ? "" : "mr-3"
                    } h-5 w-5 flex-shrink-0 ${
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

          {/* System section pinned to bottom */}
          <div
            className={`mt-auto border-t ${borderColor} p-3 md:p-4 flex-shrink-0`}
          >
            {/* optional section label visible when expanded */}
            {!collapsed && (
              <div className="mb-2 text-xs font-semibold text-white/80">
                System
              </div>
            )}

            <div className="flex items-center">
              {systemItems.map((item) => {
                const isActive = location.pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    title={item.name}
                    className={`flex items-center px-2 py-2 text-sm font-medium rounded-md group transition-colors w-full ${
                      isActive ? navActive : navInactive
                    } ${collapsed ? "justify-center" : "justify-start"}`}
                  >
                    <Icon
                      className={`${
                        collapsed ? "" : "mr-3"
                      } h-5 w-5 flex-shrink-0 ${
                        isActive
                          ? isDark
                            ? "text-white"
                            : "text-blue-800"
                          : iconColor
                      }`}
                    />
                    {!collapsed && (
                      <span className="truncate">{item.name}</span>
                    )}
                  </Link>
                );
              })}
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
        {/* User Panel (desktop) */}
        <div className="hidden md:block fixed top-4 right-4 z-50">
          <div
            className={`flex items-center gap-3 p-3 rounded-xl border ${panelBg} ${borderColor}`}
          >
            <Avatar className={`h-10 w-10 ${isDark ? "bg-gray-700" : ""}`}>
              <AvatarImage src={user?.avatar ?? ""} alt={user?.name ?? ""} />
              <AvatarFallback
                className={isDark ? "text-gray-300" : "text-white"}
              >
                {user?.name?.charAt(0) || "A"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p
                className={`font-medium truncate ${
                  isDark ? "text-gray-300" : "text-white"
                }`}
              >
                {user?.name}
              </p>
              <p
                className={`text-xs truncate ${
                  isDark ? "text-gray-400" : "text-blue-100"
                }`}
              >
                {roleLabel}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className={`${
                isDark
                  ? "text-gray-400 hover:bg-gray-700 hover:text-gray-300"
                  : "text-white hover:bg-blue-600"
              }`}
              onClick={logout}
            >
              <LogOut
                className={`h-4 w-4 ${isDark ? "text-gray-400" : "text-white"}`}
              />
            </Button>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
