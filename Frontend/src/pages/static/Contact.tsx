// src/pages/static/Contact.tsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, MapPin, Clock } from "lucide-react";

const Contact = () => {
  const gradientClasses = "bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6]";

  return (
    <div className="min-h-screen pt-10 pb-20 bg-white">
      <div className="mindease-container space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Info */}
          <div className="lg:col-span-3 space-y-6">
            <Card className="bg-white/80 backdrop-blur rounded-2xl shadow-md border border-[#1e3a8a]/20">
              <CardHeader>
                <CardTitle className="font-cute text-[#1e3a8a]">
                  📞 Contact Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {[
                  {
                    icon: <Mail className="h-5 w-5" />,
                    label: "Email",
                    value: "flamecounseling@gmail.com",
                    href: "mailto:flamecounseling@gmail.com",
                  },
                  {
                    icon: <Phone className="h-5 w-5" />,
                    label: "Phone",
                    value: "+91 9876543210",
                    href: "tel:+919876543210",
                  },
                  {
                    icon: <MapPin className="h-5 w-5" />,
                    label: "Address",
                    value: `Chandragupta West Wing, Flame Campus`,
                    href: null,
                  },
                  {
                    icon: <Clock className="h-5 w-5" />,
                    label: "Hours",
                    value: `Mon–Fri: 9am–5pm\nSat: 10am–2pm\nSun: Closed`,
                    href: null,
                  },
                ].map((info, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div
                      className={`${gradientClasses} p-2 rounded-full text-white mt-1`}
                      aria-hidden
                    >
                      {info.icon}
                    </div>
                    <div>
                      <div className="font-medium text-[#1e3a8a]">
                        {info.label}
                      </div>
                      {info.href ? (
                        <a
                          href={info.href}
                          className="text-muted-foreground hover:text-[#3b82f6]"
                        >
                          {info.value}
                        </a>
                      ) : (
                        <pre className="whitespace-pre-wrap text-muted-foreground m-0">
                          {info.value}
                        </pre>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* ---- Last Card: use inner element with inline gradient background so text always contrasts ---- */}
            <Card className="rounded-2xl shadow-sm overflow-hidden border-none">
              {/* We avoid putting the gradient class on the Card itself because the Card component
                  may impose internal background/color rules. Instead we put a full-width inner
                  div that uses the gradient as inline style — this ensures the gradient is the
                  visible background and that text sits on top of it. */}
              <div
                style={{
                  background:
                    "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
                }}
                className="p-6 text-center"
              >
                <CardContent className="p-0">
                  <h3 className="text-lg font-semibold mb-1 text-white">
                    💖 Need Immediate Help?
                  </h3>
                  <p className="text-sm mb-3 text-white/90">
                    Please reach out to a professional right away. Your
                    well-being is important!
                  </p>
                  <p className="text-lg font-bold text-white">+91 9876543210</p>
                </CardContent>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
