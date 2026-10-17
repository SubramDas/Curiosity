export type PageView =
  "home" | "topic" | "shorts" | "history" | "topics" | "universe" | "graph";

export type CategoryId =
  | "computing"
  | "money"
  | "science"
  | "health"
  | "society"
  | "language"
  | "arts"
  | "life"
  | "general";
export interface Topic {
  key: string;
  query: string;
  category: CategoryId;
  relatedCategories: CategoryId[];
}
export interface VideoClassification {
  topic: {
    label: string;
    wikidataId: string | null;
    status: "matched" | "provisional";
  };
  primaryUniverse: "science" | "commerce" | "arts" | null;
  relatedUniverses: ("science" | "commerce" | "arts")[];
  reason: string;
  policyVersion: string;
  wikidataStatus?: "available" | "unavailable" | "not-needed";
}
export interface Video {
  classification?: VideoClassification;
  description?: string;
  tags?: string[];
  categoryId?: string;
  id: string;
  title: string;
  channel: string;
  watchUrl: string;
  reviewed: boolean;
  details: {
    duration: string | null;
    embeddable: boolean;
    privacyStatus: string;
  } | null;
}
export interface VideoPage {
  videos: Video[];
  nextPageToken: string | null;
}
export interface Answer {
  answer: string;
  insufficientInformation: boolean;
  sources: { id: string; title: string; url: string }[];
}

export interface VideoSeekRequest {
  videoId: string;
  seconds: number;
  requestId: number;
}
export interface TeacherAnswer {
  answer: string;
  relation: "related" | "unrelated" | "unclear" | "no-video";
  relationReason: string;
  videoContext: "analyzed" | "title-only" | "none";
  answerBasis: "checked-notes" | "video-analysis" | "general";
  sources: Answer["sources"];
  timestamp: {
    videoId: string;
    startSeconds: number;
    endSeconds: number;
    explanation: string;
    evidence: string;
  } | null;
  recommendations: Video[];
  notices: string[];
  questionVideo: { id: string; title: string } | null;
}
