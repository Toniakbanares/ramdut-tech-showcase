import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Compass, Home, Wand2, Clapperboard } from "lucide-react";

const LINKS = [
  { to: "/", label: "Início", icon: Home },
  { to: "/lab", label: "AI Lab", icon: Wand2 },
  { to: "/studio", label: "Studio", icon: Clapperboard },
];

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404: rota inexistente:", location.pathname);
  }, [location.pathname]);

  return (
    <main className="min-h-screen grid place-items-center px-6 bg-[#0A0A0B] text-neutral-200">
      <div className="max-w-sm w-full text-center">
        <Compass className="h-10 w-10 mx-auto text-[#8B5CF6] mb-3" />
        <h1 className="text-3xl font-bold mb-1">404</h1>
        <p className="text-sm text-neutral-400 mb-6">
          Essa página não existe. Talvez o link esteja antigo.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {LINKS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="min-h-[56px] rounded-xl bg-white/5 border border-white/10 text-xs flex flex-col items-center justify-center gap-1 hover:bg-white/10 transition-colors"
            >
              <Icon className="h-4 w-4 text-[#06B6D4]" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
};

export default NotFound;
