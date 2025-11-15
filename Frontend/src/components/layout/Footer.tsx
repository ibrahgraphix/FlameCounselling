import React from "react";
import { Link } from "react-router-dom";
import { useDetectDarkMode } from "@/components/ui/card";

const Footer = () => {
  const isDark = useDetectDarkMode();
  const gradient = "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)";
  const textMuted = isDark ? "text-gray-400" : "text-gray-600";
  const borderColor = isDark ? "border-gray-600" : "border-gray-200";
  const bgColor = isDark ? "bg-gray-800" : "bg-white";
  const accentColor = isDark ? "text-gray-300" : "text-gray-700";

  return (
    <footer
      className={`py-12 px-6 ${borderColor} shadow-inner rounded-t-3xl ${bgColor}`}
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* Brand */}
        <div>
          <Link to="/" className="inline-block">
            <span
              style={{
                background: gradient,
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
              className="text-3xl font-bold drop-shadow-sm"
            >
              Flame
            </span>
            <span
              style={{ color: "#1e3a8a" }}
              className="text-3xl font-bold drop-shadow-sm ml-1"
            >
              Counseling
            </span>
          </Link>
          <p className={`mt-4 text-sm leading-relaxed ${textMuted}`}>
            Empowering students to connect with counselors and make informed
            academic decisions.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className={`text-md font-semibold mb-4 ${accentColor}`}>
            Quick Links
          </h3>
          <ul className="space-y-2 text-sm">
            {[
              { label: "Home", path: "/" },
              { label: "GameZone", path: "/gamezone" },
              { label: "About Us", path: "/about" },
              { label: "Contact", path: "/contact" },
            ].map(({ label, path }) => (
              <li key={label}>
                <Link
                  to={path}
                  className={`hover:text-[#1e3a8a] transition-colors ${textMuted}`}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Services */}
        <div>
          <h3 className={`text-md font-semibold mb-4 ${accentColor}`}>
            Services
          </h3>
          <ul className="space-y-2 text-sm">
            {[
              { label: "Book Appointment", path: "/appointments" },
              { label: "View Schedule", path: "/appointments" },
            ].map(({ label, path }) => (
              <li key={label}>
                <Link
                  to={path}
                  className={`hover:text-[#1e3a8a] transition-colors ${textMuted}`}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h3 className={`text-md font-semibold mb-4 ${accentColor}`}>
            Contact
          </h3>
          <ul className="space-y-2 text-sm" className={textMuted}>
            <li>flamecounseling@gmail.com</li>
            <li>+91 9876543210</li>
            <li>Chandragupta West Wing, Flame Campus</li>
          </ul>
        </div>
      </div>

      <div className={`mt-10 pt-6 border-t text-center ${borderColor}`}>
        <p className={`text-xs ${textMuted}`}>
          © {new Date().getFullYear()} FlameCounseling. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
