// src/components/HeroSection.tsx
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectFade, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-fade";
import { useDetectDarkMode } from "@/components/ui/card";

const slides = [{ src: "Assets/flameUni.webp", alt: "Counseling session" }];

const HeroSection: React.FC = () => {
  const isDark = useDetectDarkMode();
  const gradient = "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)";
  const bgColor = isDark ? "bg-gray-900" : "bg-white";
  const mutedText = isDark ? "text-gray-400" : "text-gray-600";
  const textColor = isDark ? "text-gray-300" : "text-gray-700";

  return (
    <section className={`py-12 sm:py-16 overflow-hidden ${bgColor}`}>
      <div className="max-w-7xl mx-auto flex flex-col-reverse md:flex-row items-center px-4 sm:px-6 gap-8">
        {/* Text Section */}
        <div className="w-full md:w-1/2 space-y-6 text-center md:text-left">
          <h1
            style={{
              background: gradient,
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight"
          >
            Begin Your Journey to Mental Wellness
          </h1>
          <p className={`text-base sm:text-lg md:text-lg ${mutedText}`}>
            Schedule sessions with university advisors and take a step toward
            your academic goals.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
            {/* Both buttons share size so they match on all screen sizes.
                Use full width on mobile (w-full), auto width on sm+ (sm:w-auto) */}
            <Link to="/appointments" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto rounded-full shadow-md hover:opacity-90"
                style={{ background: gradient, color: "white" }}
                aria-label="Book a counseling session"
              >
                Book Session
              </Button>
            </Link>

            <Link to="/gamezone" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto py-3 px-6 rounded-full shadow-md hover:shadow-lg text-sm sm:text-base"
                style={{ borderColor: "#3b82f6", color: "#1e3a8a" }}
                aria-label="Open GameZone"
              >
                GameZone
              </Button>
            </Link>
          </div>
        </div>

        {/* Swiper / Image */}
        <div className="w-full md:w-1/2 flex justify-center">
          <div className="w-full max-w-md sm:max-w-md md:max-w-full">
            <Swiper
              modules={[EffectFade, Autoplay]}
              effect="fade"
              autoplay={{ delay: 4000, disableOnInteraction: false }}
              loop
              className="rounded-xl overflow-hidden shadow-lg"
            >
              {slides.map((slide, i) => (
                <SwiperSlide key={i}>
                  <img
                    src={slide.src}
                    alt={slide.alt}
                    className="w-full h-56 sm:h-72 md:h-80 object-cover rounded-xl"
                    loading="lazy"
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
