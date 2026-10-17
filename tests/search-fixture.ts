// Explicit provider simulation for existing cache/transport tests.
export const educationalSearchAssessor = {
  async query() {
    return { action: "allow", reason: "Learning request.", choices: [] };
  },
  async videos(videos: { id: string }[]) {
    return videos.map((v) => ({
      id: v.id,
      purpose: "educational",
      related: true,
    }));
  },
};
