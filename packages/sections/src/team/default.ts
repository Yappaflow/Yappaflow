import type { TeamContent } from "./schema.js";

export const DEFAULT_TEAM_CONTENT: TeamContent = {
  eyebrow: "The studio",
  heading: "People who care about the result.",
  subheading: "",
  columns: 3,
  members: [
    {
      name: "Mira Alden",
      role: "Creative Director",
      bio: "Brand systems. Leads identity work.",
    },
    {
      name: "Tomás Ruiz",
      role: "Head of Engineering",
      bio: "TypeScript, build pipelines, performance.",
    },
    {
      name: "Iro Okafor",
      role: "Design Lead",
      bio: "Typography and editorial layout.",
    },
  ],
};
