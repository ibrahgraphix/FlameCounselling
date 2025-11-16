// src/components/Header.tsx
import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useDetectDarkMode } from "@/components/ui/card";

const Header: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const isDark = useDetectDarkMode();

  const gradient = "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)";
  const bgColor = isDark
    ? "bg-gray-800 border-gray-600"
    : "bg-white border-gray-200";
  const textColor = isDark ? "text-gray-300" : "text-gray-700";
  const hoverColor = isDark ? "hover:text-teal-400" : "hover:text-[#1e3a8a]";

  return (
    <header
      className={`sticky top-0 z-50 border-b shadow-sm backdrop-blur-md ${bgColor}`}
    >
      <div className="container mx-auto flex items-center justify-between py-2 px-3 sm:px-6">
        {/* Logo */}
        <Link
          to={user ? (isAdmin() ? "/admin" : "/dashboard") : "/"}
          className="flex items-center gap-2"
        >
          {/* responsive logo sizes for mobile -> desktop */}
          <img
            src="/Assets/FLAME.png"
            alt="Flame Counseling"
            className="h-10 sm:h-12 md:h-16 lg:h-20 w-auto object-contain"
          />
        </Link>

        {/* Desktop nav (hidden on small screens) */}
        <nav className="hidden md:flex items-center gap-4 lg:gap-6 text-sm">
          {!user ? (
            <>
              <Link
                className={`px-2 py-1 ${hoverColor} transition-colors ${textColor}`}
                to="/"
              >
                Home
              </Link>
              <Link
                className={`px-2 py-1 ${hoverColor} transition-colors ${textColor}`}
                to="/gamezone"
              >
                GameZone
              </Link>
              <Link
                className={`px-2 py-1 ${hoverColor} transition-colors ${textColor}`}
                to="/about"
              >
                About
              </Link>
              <Link
                className={`px-2 py-1 ${hoverColor} transition-colors ${textColor}`}
                to="/contact"
              >
                Contact
              </Link>
              <Link to="/login">
                <Button
                  className="rounded-full px-4 py-2 text-white font-semibold shadow-md hover:opacity-90"
                  style={{ background: gradient }}
                >
                  Sign In
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/appointments"
                className={`px-2 py-1 ${hoverColor} transition-colors ${textColor}`}
              >
                Appointments
              </Link>

              {/* user avatar dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-10 w-10 rounded-full p-0"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={user?.avatar ?? ""}
                        alt={user?.name ?? "User"}
                      />
                      <AvatarFallback>
                        {user?.name?.charAt(0) ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{user?.name}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      logout();
                    }}
                  >
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </nav>

        {/* Mobile menu trigger */}
        <div className="md:hidden flex items-center gap-2">
          {/* If logged in show small avatar, else menu */}
          {user ? (
            <Link to="/appointments" className="mr-2">
              <Avatar className="h-9 w-9">
                <AvatarImage
                  src={user?.avatar ?? ""}
                  alt={user?.name ?? "User"}
                />
                <AvatarFallback>{user?.name?.charAt(0) ?? "U"}</AvatarFallback>
              </Avatar>
            </Link>
          ) : null}

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Menu className={`h-6 w-6 ${textColor}`} />
              </Button>
            </SheetTrigger>

            <SheetContent
              side="right"
              className={`p-6 w-full max-w-xs min-h-screen flex flex-col ${bgColor}`}
            >
              <div className="flex items-center justify-between mb-6">
                <Link
                  to={user ? (isAdmin() ? "/admin" : "/dashboard") : "/"}
                  className="flex items-center"
                >
                  <img
                    src="/Assets/FLAME.png"
                    alt="logo"
                    className="h-12 w-auto"
                  />
                </Link>
                <Button
                  variant="ghost"
                  onClick={() => {
                    /* sheet will close automatically */
                  }}
                >
                  Close
                </Button>
              </div>

              <nav className="flex flex-col gap-3 text-base">
                {!user ? (
                  <>
                    <Link
                      to="/"
                      className="py-2 px-2 rounded-md hover:bg-gray-100"
                    >
                      Home
                    </Link>
                    <Link
                      to="/gamezone"
                      className="py-2 px-2 rounded-md hover:bg-gray-100"
                    >
                      GameZone
                    </Link>
                    <Link
                      to="/about"
                      className="py-2 px-2 rounded-md hover:bg-gray-100"
                    >
                      About
                    </Link>
                    <Link
                      to="/contact"
                      className="py-2 px-2 rounded-md hover:bg-gray-100"
                    >
                      Contact
                    </Link>
                    <Link to="/login" className="mt-2">
                      <Button
                        style={{ background: gradient }}
                        className="w-full"
                      >
                        Sign In
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      to="/appointments"
                      className="py-2 px-2 rounded-md hover:bg-gray-100"
                    >
                      Appointments
                    </Link>
                    <Link
                      to="/profile"
                      className="py-2 px-2 rounded-md hover:bg-gray-100"
                    >
                      Profile
                    </Link>
                    <button
                      onClick={logout}
                      className="text-left py-2 px-2 rounded-md hover:bg-gray-100"
                    >
                      Logout
                    </button>
                  </>
                )}
              </nav>

              <div className="mt-auto text-xs text-muted-foreground">
                <p>© Flame Counseling</p>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Header;
