import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" },
  }),
};

const sectionFade = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.8, ease: "easeOut" } },
};

const About = () => {
  const team = [
    {
      name: "Sherouk Hatem",
      role: "CTO",
      bio: "...",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sherouk",
    },
    {
      name: "Lydia Refaat",
      role: "Founder & Clinical Director",
      bio: "...",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lydia",
    },
    {
      name: "Miral Farghaly",
      role: "Lead Therapist",
      bio: "...",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=miral",
    },
    {
      name: "Ganna Mokhtar",
      role: "Community Relations Manager",
      bio: "...",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ganna",
    },
  ];

  return (
    <div className="min-h-screen pt-6 pb-16 bg-white">
      <div className="mindease-container space-y-24">
        {/* Our Team */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="pt-12"
        >
          <h2 className="section-heading text-center mb-12">
            The Minds Behind
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, i) => (
              <motion.div key={i} custom={i} variants={fadeUp}>
                <Card className="text-center rounded-3xl bg-white hover:shadow-xl transition h-full border-0 overflow-hidden group">
                  <div className="relative h-64 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent z-10"></div>
                    <Avatar className="w-32 h-32 mx-auto absolute inset-0 m-auto z-20 border-4 border-white group-hover:scale-105 transition">
                      <AvatarImage src={member.avatar} alt={member.name} />
                      <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </div>
                  <CardContent className="p-6 h-full flex flex-col mt-16">
                    <h3 className="font-semibold text-xl text-[#1e3a8a]">
                      {member.name}
                    </h3>
                    <p className="text-[#3b82f6] mb-4 font-medium">
                      {member.role}
                    </p>
                    <p className="text-muted-foreground mt-auto">
                      {member.bio}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default About;
