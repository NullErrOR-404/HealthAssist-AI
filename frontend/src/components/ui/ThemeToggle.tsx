import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { flushSync } from 'react-dom';

export const ThemeToggle = () => {
  const [theme, setTheme] = useState<"light" | "dark">(
    () => {
      const saved = localStorage.getItem("theme");
      if (saved === "light" || saved === "dark") return saved;
      // Default to OS preference on very first load if no storage exists
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
  );

  // Update DOM when theme changes
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      root.style.colorScheme = "light";
    }
  }, [theme]);

  const toggleTheme = (event: React.MouseEvent) => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    
    localStorage.setItem("theme", nextTheme);

    // @ts-ignore: View Transitions API
    if (!document.startViewTransition) {
      setTheme(nextTheme);
      return;
    }

    const x = event.clientX;
    const y = event.clientY;
    const right = window.innerWidth - x;
    const bottom = window.innerHeight - y;
    const maxRadius = Math.hypot(Math.max(x, right), Math.max(y, bottom));

    // @ts-ignore
    const transition = document.startViewTransition(() => {
      flushSync(() => {
        setTheme(nextTheme);
      });
    });

    transition.ready.then(() => {
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${maxRadius}px at ${x}px ${y}px)`,
      ];

      document.documentElement.animate(
        {
          clipPath: nextTheme === "dark" ? clipPath : [...clipPath].reverse(),
        },
        {
          duration: 500,
          easing: "ease-in-out",
          pseudoElement: nextTheme === "dark"
            ? "::view-transition-new(root)"
            : "::view-transition-old(root)",
        }
      );
    });
  };

  return (
    <button 
      onClick={toggleTheme}
      className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-foreground shadow-sm hover:scale-110 hover:-translate-y-1 transition-all duration-300 relative"
      title={`Theme: ${theme}`}
    >
      {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
};
