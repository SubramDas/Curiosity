import { videoDurationSeconds } from "./input.mjs";

export function createTeacher({
  gemini,
  youtube,
  reserveChat,
  reserveVideo,
  videoEnabled = true,
  sources,
}) {
  return async (input) => {
    let currentVideo = input.currentVideo;
    let analyze = false;
    const notices = [];
    if (currentVideo) {
      try {
        const [video] = await youtube.getPlayableVideos([currentVideo.id]);
        if (video)
          currentVideo = {
            ...currentVideo,
            title: video.title,
            durationSeconds: videoDurationSeconds(video.details.duration),
          };
        if (
          videoEnabled &&
          video?.details.privacyStatus === "public" &&
          currentVideo.durationSeconds > 0 &&
          currentVideo.durationSeconds <= 1800
        ) {
          try {
            await reserveVideo();
            analyze = true;
          } catch {
            notices.push(
              "Today's video-analysis allowance is used. I can still explain concepts, but cannot check a timestamp.",
            );
          }
        } else
          notices.push(
            "I cannot check this video's contents right now. Any relevance label is based on its title.",
          );
      } catch {
        notices.push(
          "Video details are unavailable. I can answer generally, but cannot check a timestamp.",
        );
      }
    }
    await reserveChat();
    let result;
    try {
      result = await gemini.answer(
        { ...input, currentVideo },
        sources,
        analyze,
      );
    } catch (error) {
      // Some models/videos do not support public URL input: fall back once to text.
      if (
        !analyze ||
        error.code !== "SERVICE_ERROR" ||
        !error.message.includes("HTTP 400")
      )
        throw error;
      await reserveChat();
      notices.push(
        "Video analysis was unavailable. This explanation uses general knowledge and any supplied notes.",
      );
      result = await gemini.answer({ ...input, currentVideo }, sources, false);
    }
    const { searchQuery, ...answer } = result;
    let recommendations = [];
    if (!answer.timestamp && searchQuery) {
      try {
        const page = await youtube.searchPage(searchQuery);
        const details = await youtube.getPlayableVideos(
          page.videos.map((video) => video.id),
        );
        recommendations = page.videos
          .flatMap((video) => {
            const verified = details.find((item) => item.id === video.id);
            return verified?.details.embeddable &&
              verified.details.privacyStatus === "public" &&
              video.id !== currentVideo?.id
              ? [verified]
              : [];
          })
          .slice(0, 2);
        if (!recommendations.length)
          notices.push(
            "No suitable alternative videos were found for this question.",
          );
      } catch {
        notices.push(
          "The explanation is ready, but video suggestions could not load. The YouTube allowance or connection may be unavailable.",
        );
      }
    }
    return {
      ...answer,
      recommendations,
      notices,
      questionVideo: currentVideo
        ? { id: currentVideo.id, title: currentVideo.title }
        : null,
    };
  };
}
