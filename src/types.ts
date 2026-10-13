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
export interface Video {
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
