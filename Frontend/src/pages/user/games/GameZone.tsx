// src/pages/games/GameZone.tsx
import React from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDetectDarkMode } from "@/components/ui/card";

const GameZone: React.FC = () => {
  const isDark = useDetectDarkMode();
  const gradient = "bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6]";
  const bgColor = isDark ? "bg-gray-900" : "bg-white";
  const textColor = isDark ? "text-gray-300" : "text-gray-800";
  const mutedText = isDark ? "text-gray-400" : "text-gray-600";
  const cardBorder = isDark ? "border-gray-600" : "border-gray-200";

  // base route for gamezone pages — keep routes consistent with App.tsx
  const baseRoute = "/gamezone";

  const games = [
    {
      id: "stress-quiz",
      title: "Stress Quiz",
      desc: "Short self-check to reflect on your current stress levels.",
      details:
        "Answer 6 quick questions and get suggestions tailored to your result.",
      route: `${baseRoute}/stress-quiz`,
      ready: true,
    },
    {
      id: "track-mood",
      title: "Track Mood",
      desc: "Keep track of how you feel over time to understand your wellbeing.",
      details:
        "Quickly log your daily mood and visualize trends to stay mindful of your emotions.",
      route: `${baseRoute}/mental-tracker`,
      ready: true,
    },
    {
      id: "mind-match",
      title: "Mind Match (coming soon)",
      desc: "Memory-style pairing game to practise focus & coping skill association.",
      details:
        "A fun matching game to reinforce healthy coping strategies. Coming soon!",
      route: `${baseRoute}/mind-match`,
      ready: false,
    },
  ];

  return (
    <div className={`min-h-screen ${bgColor} py-8 px-4`}>
      <div className="max-w-5xl mx-auto">
        <header className="mb-6 text-center">
          <h1
            className={`text-2xl sm:text-3xl font-bold ${textColor} mb-2`}
            style={{
              background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            🎮 GameZone
          </h1>
          <p className={`${mutedText} text-sm sm:text-base`}>
            Small, meaningful activities to support mental wellbeing.
            Participate in the games and have fun.
          </p>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {games.map((g) => (
            <Card
              key={g.id}
              className={`${bgColor} ${cardBorder} rounded-2xl shadow-lg transform transition-all hover:scale-[1.02]`}
            >
              <CardHeader className="pb-3">
                <div
                  className={`rounded-full p-3 w-12 h-12 flex items-center justify-center mb-3 ${gradient} text-white shadow-inner`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6M12 9v6M21 12A9 9 0 1112 3a9 9 0 019 9z"
                    />
                  </svg>
                </div>

                <CardTitle className={`text-lg font-semibold ${textColor}`}>
                  {g.title}
                </CardTitle>
                <CardDescription className={`${mutedText} text-sm`}>
                  {g.desc}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <p className={`${mutedText} text-sm mb-4`}>{g.details}</p>

                {g.ready ? (
                  // Link navigates to the stress quiz or mood tracker route when button is clicked
                  <Link to={g.route}>
                    <Button
                      className="rounded-full px-4 py-2"
                      style={{
                        background:
                          "linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%)",
                        color: "white",
                      }}
                    >
                      {g.id === "track-mood" ? "Track" : "Play"}
                    </Button>
                  </Link>
                ) : (
                  <div className="flex items-center gap-3">
                    <Button
                      disabled
                      className="rounded-full px-4 py-2 opacity-80 cursor-not-allowed"
                    >
                      Coming Soon
                    </Button>
                    <p className={`${mutedText} text-xs`}>
                      We'll add this soon.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </div>
  );
};

export default GameZone;
