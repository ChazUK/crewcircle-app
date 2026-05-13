export const DEPARTMENTS = [
  {
    name: "Camera",
    roles: [
      "Director of Photography",
      "Camera Operator",
      "Focus Puller",
      "Clapper Loader",
      "Camera Trainee",
      "Steadicam Operator",
      "Camera Car Driver",
      "Video Split Operator",
      "DIT",
    ],
  },
  {
    name: "Grip",
    roles: ["Key Grip", "Best Boy Grip", "Grip", "Dolly Grip", "Rigging Grip", "Crane Technician"],
  },
  {
    name: "Lighting",
    roles: [
      "Gaffer",
      "Best Boy Electric",
      "Electrician",
      "Rigging Gaffer",
      "Rigging Electrician",
      "Generator Operator",
      "Lighting Technician",
    ],
  },
  {
    name: "Sound",
    roles: ["Production Sound Mixer", "Boom Operator", "Sound Assistant", "Playback Operator"],
  },
  {
    name: "Art Department",
    roles: [
      "Production Designer",
      "Art Director",
      "Set Decorator",
      "Prop Master",
      "Props Buyer",
      "Standby Props",
      "Dressing Props",
      "Construction Manager",
      "Scenic Artist",
      "Draughtsperson",
      "Art Department Assistant",
    ],
  },
  {
    name: "Costume",
    roles: [
      "Costume Designer",
      "Costume Supervisor",
      "Costume Standby",
      "Dresser",
      "Costume Assistant",
      "Crowd Costume Supervisor",
    ],
  },
  {
    name: "Hair & Make-Up",
    roles: [
      "Hair & Make-Up Designer",
      "Hair & Make-Up Supervisor",
      "Hair & Make-Up Artist",
      "Prosthetics Artist",
      "Crowd Hair & Make-Up Supervisor",
      "Hair & Make-Up Assistant",
    ],
  },
  {
    name: "Directing",
    roles: [
      "Director",
      "First Assistant Director",
      "Second Assistant Director",
      "Third Assistant Director",
      "Floor Runner",
      "Script Supervisor",
    ],
  },
  {
    name: "Production",
    roles: [
      "Producer",
      "Executive Producer",
      "Line Producer",
      "Production Manager",
      "Production Coordinator",
      "Production Secretary",
      "Production Assistant",
      "Runner",
      "Location Manager",
      "Assistant Location Manager",
      "Unit Manager",
      "Casting Director",
    ],
  },
  {
    name: "Post Production",
    roles: [
      "Editor",
      "Assistant Editor",
      "Post Production Supervisor",
      "Post Production Coordinator",
      "Colourist",
      "VFX Supervisor",
      "VFX Producer",
      "Sound Designer",
      "Re-Recording Mixer",
      "Foley Artist",
    ],
  },
  {
    name: "Stunts",
    roles: ["Stunt Coordinator", "Stunt Performer", "Stunt Double", "Wire Rigger"],
  },
  {
    name: "Special Effects",
    roles: [
      "Special Effects Supervisor",
      "Special Effects Technician",
      "Special Effects Assistant",
      "Pyrotechnician",
    ],
  },
  {
    name: "Transport",
    roles: [
      "Transport Captain",
      "Transport Coordinator",
      "Unit Driver",
      "Facilities Driver",
      "Camera Car Driver",
      "Minibus Driver",
    ],
  },
] as const;

export type Department = (typeof DEPARTMENTS)[number]["name"];
export type DepartmentRole = (typeof DEPARTMENTS)[number]["roles"][number];
