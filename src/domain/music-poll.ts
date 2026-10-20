// Keep the scheduled collection stages independent: a playlist or tag service
// failure must never prevent recent plays (or the other stage) being processed.
export type MusicPollStage = "history" | "archive" | "genres";

type GenreResult = { configured: boolean; processed: number };
export type MusicPollTasks = {
  syncHistory: () => Promise<number>;
  syncArchive: () => Promise<number>;
  enrichGenres: () => Promise<GenreResult>;
};

export async function runMusicPollStages(
  tasks: MusicPollTasks,
  reportFailure: (stage: MusicPollStage, error: unknown) => void = () => {},
) {
  const result = { inserted: 0, archived: 0, enriched: 0, failedStages: [] as MusicPollStage[] };
  const stages: Array<{ name: MusicPollStage; run: () => Promise<void> }> = [
    { name: "history", run: async () => { result.inserted = await tasks.syncHistory(); } },
    { name: "archive", run: async () => { result.archived = await tasks.syncArchive(); } },
    { name: "genres", run: async () => { result.enriched = (await tasks.enrichGenres()).processed; } },
  ];
  for (const stage of stages) {
    try {
      await stage.run();
    } catch (error) {
      result.failedStages.push(stage.name);
      reportFailure(stage.name, error);
    }
  }
  return result;
}
