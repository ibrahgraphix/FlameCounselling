import { Link } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import HeroSection from "@/components/layout/HeroSection";
import { useDetectDarkMode } from "@/components/ui/card";

const Index = () => {
  const isDark = useDetectDarkMode();
  const gradient = "bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6]";
  const bgColor = isDark ? "bg-gray-900" : "bg-white";
  const textColor = isDark ? "text-gray-300" : "text-gray-800";
  const mutedText = isDark ? "text-gray-400" : "text-gray-600";
  const cardBorder = isDark ? "border-gray-600" : "border-gray-200";

  return (
    <div className={`min-h-screen flex flex-col items-center ${bgColor} px-4`}>
      <HeroSection />

      <section className="w-full max-w-screen-sm text-center mt-10 sm:mt-16 mb-6 sm:mb-8 px-4 sm:px-0 mx-auto">
        <h1
          className={`text-2xl sm:text-3xl md:text-4xl font-bold ${textColor} mb-3 sm:mb-4 leading-tight`}
        >
          Your journey to better mental wellbeing starts here 💫
        </h1>
        <p className={`text-base sm:text-lg md:text-xl ${mutedText}`}>
          Track your mood, connect with therapists, and join a supportive
          community 💖
        </p>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-6xl w-full mb-12 sm:mb-16 px-2 sm:px-6">
        {[
          {
            title: "Mood Tracking",
            desc: "Monitor your daily mood and mental wellbeing.",
            details:
              "Keep track of your emotions and patterns to better understand yourself.",
            icon: (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            ),
          },
          {
            title: "Appointment Booking",
            desc: "Schedule sessions with your preferred therapists.",
            details:
              "Easily book, manage, and get reminders for your therapy appointments.",
            icon: (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            ),
          },
          {
            title: "Guided Journaling",
            desc: "Reflect on your thoughts and emotions daily.",
            details:
              "Use structured prompts and exercises to track your personal growth.",
            icon: (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            ),
          },
        ].map(({ title, desc, details, icon }, i) => (
          <Card
            key={i}
            className={`${bgColor} ${cardBorder} backdrop-blur-md shadow-lg rounded-2xl transition-all hover:scale-[1.02] active:scale-[1.01]`}
          >
            <CardHeader className="pb-3">
              <div
                className={`rounded-full p-3 w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center mb-3 ${gradient} text-white shadow-inner`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 sm:h-6 sm:w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {icon}
                </svg>
              </div>
              <CardTitle
                className={`text-lg sm:text-xl font-semibold ${textColor}`}
              >
                {title}
              </CardTitle>
              <CardDescription className={`${mutedText} text-sm sm:text-base`}>
                {desc}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className={`${mutedText} text-sm sm:text-base`}>{details}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="w-full max-w-xs sm:max-w-md text-center mx-auto mb-12 sm:mb-16 px-4">
        <h2 className={`text-lg sm:text-2xl font-bold ${textColor} mb-4`}>
          Ready to start your wellness journey?
        </h2>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link to="/appointments" className="w-full sm:w-auto">
            <Button
              className={`w-full sm:w-auto py-3 px-6 rounded-full ${gradient} text-white shadow-lg`}
            >
              Book session 💖
            </Button>
          </Link>
          <Link to="/mental-tracker" className="w-full sm:w-auto">
            <Button
              className={`w-full sm:w-auto py-3 px-6 rounded-full border-2 border-[#1e3a8a] ${textColor} hover:bg-[#1e3a8a]/10 shadow-lg`}
            >
              Track Mood
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Index;
