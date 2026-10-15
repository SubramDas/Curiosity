// Increment when classification meaning changes; old cached decisions stay isolated.
export const POLICY_VERSION = "1";
export const universePolicy = {
  science: {
    name: "Science & Technology",
    definition:
      "Nature, mathematics, health, medicine, engineering, and how technology works.",
  },
  commerce: {
    name: "Commerce & Business",
    definition:
      "Money, trade, finance, accounting, taxation, business operations and organisations.",
  },
  arts: {
    name: "Arts & Humanities",
    definition:
      "Human expression, culture, history, society, law, language, philosophy, and practical activities such as cooking techniques and sports tactics.",
  },
};
export const boundaryExamples = [
  ["Preparing biryani", "arts"],
  ["Chemistry of browning food", "science"],
  ["Running a profitable restaurant", "commerce"],
  ["Football technique and tactics", "arts"],
  ["Physiology of endurance training", "science"],
  ["Economics of player transfers", "commerce"],
  ["Constitutional rights", "arts"],
  ["Calculating business tax", "commerce"],
  ["GPU architecture evolving over time", "science"],
  ["Valuing Nvidia shares", "commerce"],
];
