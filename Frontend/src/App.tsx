// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import RequireAuth from "./components/layout/RequireAuth";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import { DarkModeProvider } from "@/contexts/Darkmode";
import React from "react";
// Landing Page
import Index from "./pages/Index";
// Auth Pages
import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";
// User Pages
import MentalTracker from "./pages/user/games/MentalTracker";
import Appointments from "./pages/user/Appointments";
import GameZone from "./pages/user/games/GameZone";
import StressQuiz from "./pages/user/games/StressQuiz";
import MindMatchingGame from "./pages/user/games/MindMatchingGame";
// Static Pages
import About from "./pages/static/About";
import Contact from "./pages/static/Contact";
// Admin Pages
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import Calendar from "./pages/admin/Calendar";
import BookingList from "./pages/admin/BookingList";
import SessionNotes from "./pages/admin/SessionNotes";
import Settings from "./pages/admin/Settings";
// Other Pages
import NotFound from "./pages/NotFound";
const queryClient = new QueryClient();
const AppLayout = ({ children }: { children: React.ReactNode }) => (
  <>
    <Header />
    <main>{children}</main>
    <Footer />
  </>
);

const HomeRedirect: React.FC = () => {
  const { user, loading } = useAuth();
  if (loading) return <Index />; // Show loading or placeholder
  if (user) {
    const role = (user.role ?? "").toString().toLowerCase();
    if (role === "admin" || role === "counselor") {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/appointments" replace />;
  }
  return <Index />;
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Landing page with redirect logic */}
              <Route
                path="/"
                element={
                  <AppLayout>
                    <HomeRedirect />
                  </AppLayout>
                }
              />
              {/* Authentication Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route
                path="/gamezone/mental-tracker"
                element={
                  <AppLayout>
                    <MentalTracker />
                  </AppLayout>
                }
              />
              <Route
                path="/gamezone"
                element={
                  <AppLayout>
                    <GameZone />
                  </AppLayout>
                }
              />
              <Route
                path="/gamezone/stress-quiz"
                element={
                  <AppLayout>
                    <StressQuiz />
                  </AppLayout>
                }
              />
              <Route
                path="/gamezone/mind-matching"
                element={
                  <AppLayout>
                    <MindMatchingGame />
                  </AppLayout>
                }
              />

              <Route
                path="/appointments"
                element={
                  <AppLayout>
                    <Appointments />
                  </AppLayout>
                }
              />
              {/* Public Routes */}
              <Route
                path="/about"
                element={
                  <AppLayout>
                    <About />
                  </AppLayout>
                }
              />
              <Route
                path="/contact"
                element={
                  <AppLayout>
                    <Contact />
                  </AppLayout>
                }
              />
              {/* Admin Routes (Protected + role-aware nested routes)
                  RequireAuth will handle authentication; the AuthContext's isAdmin()
                  allows both admin and counselor to access the top-level admin dashboard.
               */}
              <Route
                path="/admin"
                element={
                  <RequireAuth requireAdmin={true}>
                    <DarkModeProvider>
                      <AdminLayout />
                    </DarkModeProvider>
                  </RequireAuth>
                }
              >
                {/* Everybody who reaches /admin sees the dashboard */}
                <Route index element={<AdminDashboard />} />
                {/* Admin-only route: Users */}
                <Route path="users" element={<AdminUsers />} />
                <Route path="bookinglist" element={<BookingList />} />
                {/* Counselor-only routes */}
                <Route path="calendar" element={<Calendar />} />
                <Route path="notes" element={<SessionNotes />} />
                {/* Both roles get settings */}
                <Route path="settings" element={<Settings />} />
              </Route>
              {/* 404 Page */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};
export default App;
