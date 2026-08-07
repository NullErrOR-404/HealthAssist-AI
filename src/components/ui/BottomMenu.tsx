"use client";

import {
  Bell,
  Search,
  Monitor,
  User,
  Plus,
  Mic,
  MapPin,
  Camera,
  Edit2,
  Filter,
  TrendingUp,
  MessageSquare,
  Activity,
  Settings,
  BarChart2,
  Folder,
} from "lucide-react";
import React, { useMemo, useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import useMeasure from "react-use-measure";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";

const MAIN_NAV = [
  { icon: Activity, name: "home", activeColor: "text-red-500" },
  { icon: MessageSquare, name: "chat", activeColor: "text-green-500" },
  { icon: BarChart2, name: "dashboard", activeColor: "text-indigo-500" },
  { icon: Folder, name: "vault", activeColor: "text-yellow-500" },
  { icon: MapPin, name: "maps", activeColor: "text-purple-500" },
  { icon: Settings, name: "settings", activeColor: "text-blue-500" },
];

const CHAT_ITEMS = [
  { icon: Edit2, text: "New Chat" },
  { icon: Mic, text: "Voice Note" },
];

const SEARCH_OPTIONS = [
  { icon: Filter, text: "Filter" },
  { icon: TrendingUp, text: "Trending" },
];

const NOTIFICATION_TYPES = ["Messages", "System Alerts", "Health Insights"];

const PROFILE_LINKS = ["My Profile", "Health Settings", "Wipe My Data (Privacy)"];

export const BottomMenu = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [elementRef] = useMeasure();
  const [hiddenRef, hiddenBounds] = useMeasure();
  const [view, setView] = useState<
    "default" | "home" | "chat" | "maps" | "settings"
  >("default");
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setView("default");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const sharedHover =
    "group transition-all duration-75 px-3 py-2 text-[15px] text-muted-foreground w-full text-left rounded-[12px] hover:bg-muted/80 hover:text-foreground";

  const content = useMemo(() => {
    switch (view) {
      case "default":
        return null;

      case "chat":
        return (
          <div className="space-y-0.5 min-w-[210px] p-[6px] py-0.5">
            {CHAT_ITEMS.map(({ icon: Icon, text }) => (
              <button
                key={text}
                className={`${sharedHover} flex items-center gap-3`}
              >
                <Icon
                  size={20}
                  className="text-muted-foreground group-hover:text-foreground transition-all duration-75"
                />
                <span className="transition-all duration-75">{text}</span>
              </button>
            ))}
          </div>
        );

      case "settings":
        return <div className="p-4 text-sm text-slate-500">Settings panel</div>;

      default:
        return null;
    }
  }, [view]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div ref={containerRef}>
        <motion.div
          animate={{
            height: "auto"
          }}
          transition={{
            type: "spring",
            bounce: 0,
            duration: 0.3,
          }}
          className="bg-white/70 dark:bg-black/80 border border-black/5 dark:border-white/10 rounded-2xl overflow-hidden shadow-xl dark:shadow-black/50 backdrop-blur-3xl"
        >
          <div className="p-2 relative z-10 w-full">
            <div className="flex items-center gap-2" onMouseLeave={() => setHoveredTab(null)}>
              {MAIN_NAV.map(({ icon: Icon, name, activeColor }) => {
                const isActive = view === name;
                const isRouteActive = (name === "home" && location.pathname === "/") || 
                                     (name === "chat" && location.pathname === "/chat") || 
                                     (name === "dashboard" && location.pathname === "/dashboard") ||
                                     (name === "vault" && location.pathname === "/vault") ||
                                     (name === "maps" && location.pathname === "/maps") || 
                                     (name === "settings" && location.pathname === "/settings") || 
                                     isActive;
                const isPillActive = hoveredTab === name || (!hoveredTab && isRouteActive);
                return (
                  <button
                    key={name}
                    onMouseEnter={() => setHoveredTab(name)}
                    onClick={() => {
                      if (name === "home") {
                        navigate("/");
                        setView("default");
                      } else if (name === "chat") {
                        navigate("/chat");
                        setView("default");
                      } else if (name === "dashboard") {
                        navigate("/dashboard");
                        setView("default");
                      } else if (name === "vault") {
                        navigate("/vault");
                        setView("default");
                      } else if (name === "maps") {
                        navigate("/maps");
                        setView("default");
                      } else if (name === "settings") {
                        navigate("/settings");
                        setView("default");
                      } else {
                        setView(isActive ? "default" : (name as typeof view));
                      }
                    }}
                    className="relative p-2 rounded-[14px] text-slate-500 dark:text-slate-400 outline-none flex-1 flex items-center justify-center min-w-[65px] sm:min-w-[75px] md:min-w-[110px]"
                  >
                    <AnimatePresence>
                      {isPillActive && (
                        <motion.div
                          layoutId="active-nav-item"
                          className="absolute inset-0 bg-slate-100 dark:bg-white/10 rounded-[14px]"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{
                            type: "spring",
                            bounce: 0,
                            duration: 0.3,
                          }}
                        />
                      )}
                    </AnimatePresence>
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 transition-all duration-300 transform group-hover:-translate-y-1 group-hover:scale-110">
                      <Icon
                        size={24}
                        className={`transition-colors duration-200 shrink-0 ${isPillActive ? activeColor : ""}`}
                      />
                      <span className={`text-[11px] md:text-sm font-bold transition-colors duration-200 ${isPillActive ? activeColor : ""}`}>
                        {name.charAt(0).toUpperCase() + name.slice(1)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className={cn(
              "px-2 pb-2",
              view === "default" ? "absolute opacity-0 pointer-events-none" : ""
            )}
            ref={elementRef}
          >
            <AnimatePresence mode="popLayout">
              {view !== "default" && (
                <motion.div
                  key={view}
                  initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                  transition={{
                    type: "spring",
                    bounce: 0,
                    duration: 0.3,
                  }}
                  className="pt-1.5"
                >
                  {content}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <div
          ref={hiddenRef}
          className="absolute opacity-0 pointer-events-none px-2 pb-2 pt-2"
          style={{ width: "max-content", visibility: "hidden" }}
        >
          {content}
        </div>
      </div>
    </div>
  );
};
