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

const Header = () => {
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
      <div className="container mx-auto flex items-center justify-between py-3 px-4 sm:px-6">
        {/* Logo */}
        <Link
          to={user ? (isAdmin() ? "/admin" : "/dashboard") : "/"}
          className="flex items-center space-x-2"
        >
          <img
            src="/Assets/FLAME.png"
            alt="Flame Counseling Logo"
            className="h-20 w-auto object-contain"
          />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-4 lg:gap-6 text-sm">
          {!user ? (
            <>
              <Link
                to="/"
                className={`px-2 py-1 ${hoverColor} transition-colors ${textColor}`}
              >
                Home
              </Link>
              <Link
                to="/about"
                className={`px-2 py-1 ${hoverColor} transition-colors ${textColor}`}
              >
                About
              </Link>
              <Link
                to="/contact"
                className={`px-2 py-1 ${hoverColor} transition-colors ${textColor}`}
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
            <Link
              to="/appointments"
              className={`px-2 py-1 ${hoverColor} transition-colors ${textColor}`}
            >
              Appointments
            </Link>
          )}
        </nav>

        {/* Mobile Menu */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <Menu className={`h-6 w-6 ${textColor}`} />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className={`bg-white p-6 w-full max-w-xs min-h-screen flex flex-col ${bgColor}`}
          >
            {/* Mobile nav logic similar to desktop */}
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};

export default Header;
