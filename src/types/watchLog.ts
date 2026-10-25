export interface WatchLogEntry {
  rating: number;
  watchedDate: string;
  rewatch: boolean;
  review: string;
  watchedEpisodes: number[];
  totalSeasons: number;
  watchedSeasons: number[];
}

export type WatchLogMap = Record<string, WatchLogEntry>;

export const emptyWatchLogEntry = (): WatchLogEntry => ({
  rating: 0,
  watchedDate: new Date().toISOString().slice(0, 10),
  rewatch: false,
  review: '',
  watchedEpisodes: [],
  totalSeasons: 0,
  watchedSeasons: [],
});
