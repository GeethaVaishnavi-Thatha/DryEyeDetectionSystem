export interface Exercise {
  title: string;
  duration: number;
  description: string;
  animation: string;
  instructions: string[];
}

export const exercises: Exercise[] = [
  {
    title: "The 20-20-20 Rule Focus",
    duration: 20,
    description: "Every 20 minutes, look at something 20 feet away for 20 seconds. This relieves ciliary muscle spasms.",
    animation: "👁️ ➔ ➔ ➔ 🌳 (Focus Far Away)",
    instructions: ["Find an object approximately 20 feet (6 meters) across the room or out a window.", "Focus on the object continuously.", "Blink normally while breathing deeply."]
  },
  {
    title: "Conscious Blink Training",
    duration: 30,
    description: "Digital screen users blink 66% less than normal. This exercise restores the natural lipid layer of your tear film.",
    animation: "😑 (Close) ➔ 😌 (Squeeze) ➔ 👀 (Open)",
    instructions: ["Close your eyes gently for 2 seconds.", "Squeeze the eyelids slightly for 2 seconds to express meibomian oil.", "Open your eyes wide for 2 seconds. Repeat."]
  },
  {
    title: "Palming Warmth Relaxation",
    duration: 45,
    description: "Warmth and darkness soothe the optic nerve and encourage tear production without digital strain.",
    animation: "🤲 ➔ 🙈 ➔ 😌 (Warm Darkness)",
    instructions: ["Rub your palms together rapidly until they feel warm.", "Cup your warm palms gently over your closed eyes without pressing on the eyeballs.", "Enjoy the absolute darkness and take slow, deep breaths."]
  },
  {
    title: "Figure Eight Tracking",
    duration: 40,
    description: "Enhances extraocular muscle flexibility and reduces fixed-gaze fatigue.",
    animation: "♾️ (Trace Figure 8)",
    instructions: ["Imagine a large figure eight (∞) tipped on its side about 10 feet in front of you.", "Trace the figure eight with your eyes slowly, without moving your head.", "Perform 5 circuits in one direction, then switch."]
  }
];
