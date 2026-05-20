import React from 'react';
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AppProvider } from './context/AppContext';
import Dashboard from "./pages/Dashboard";
import Codebook from "./pages/Codebook";

export default function App() {
  const location = useLocation();

  const links = [
    { to: "/", label: "Interactive Dashboard" },
    { to: "/codebook", label: "Codebook" },
  ];

  return (
    <AppProvider>
      <div className="min-h-screen bg-gray-950">
        <nav className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/80 backdrop-blur-lg">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-emerald-600 text-sm font-bold text-white shadow-lg">
                ST
              </div>
              <span className="font-semibold text-gray-100">
                Speech Tech · UTS
              </span>
            </div>
            <div className="flex gap-1 rounded-lg bg-gray-900 p-1 border border-gray-800">
              {links.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    location.pathname === to
                      ? "bg-blue-600 text-white shadow"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        <AnimatePresence mode="wait">
          <motion.main
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <Routes location={location}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/codebook" element={<Codebook />} />
            </Routes>
          </motion.main>
        </AnimatePresence>
      </div>
    </AppProvider>
  );
}
