import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectFade, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-fade";
import { useDetectDarkMode } from "@/components/ui/card";

const slides = [{ src: "Assets/flameUni.webp", alt: "Counseling session" }];

const HeroSection = () => {
  const isDark = useDetectDarkMode();
  const gradient = "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)";
  const bgColor = isDark ? "bg-gray-900" : "bg-white";
  const mutedText = isDark ? "text-gray-400" : "text-gray-600";
  const textColor = isDark ? "text-gray-300" : "text-gray-700";

  return (
    <section className={`py-16 sm:py-20 overflow-hidden ${bgColor}`}>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center px-4 sm:px-6 space-y-10 md:space-y-0 md:space-x-10">
        {/* Text Section */}
        <div className="md:w-1/2 space-y-6 text-center md:text-left">
          <h1
            style={{
              background: gradient,
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold drop-shadow-md"
          >
            Begin Your Journey to Mental Wellness
          </h1>
          <p className={`text-base sm:text-lg md:text-xl ${mutedText}`}>
            Schedule sessions with university advisors and take a step toward
            your academic goals.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
            <Link to="/appointments">
              <Button
                size="lg"
                style={{ background: gradient, color: "white" }}
                className="rounded-full shadow-md hover:opacity-90"
              >
                Book Session
              </Button>
            </Link>
            <Link to="/gamezone" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full sm:w-auto py-3 px-6 rounded-full shadow-md hover:shadow-lg text-sm sm:text-base"
                style={{ borderColor: "#3b82f6", color: "#1e3a8a" }}
              >
                GameZone
              </Button>
            </Link>
          </div>
        </div>

        {/* Swiper */}
        <div className="md:w-1/2 w-full flex justify-center overflow-hidden">
          <div className="w-full max-w-sm sm:max-w-md md:max-w-full">
            <Swiper
              modules={[EffectFade, Autoplay]}
              effect="fade"
              autoplay={{ delay: 5050 }}
              loop
              className="rounded-xl"
            >
              {slides.map((slide, i) => (
                <SwiperSlide key={i}>
                  <img
                    src={slide.src}
                    alt={slide.alt}
                    className="w-full h-64 sm:h-72 md:h-80 object-cover rounded-xl"
                  />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
