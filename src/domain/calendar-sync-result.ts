export type CalendarSyncResult = {
  attempted: true;
  succeeded: boolean;
  error: string;
};

export async function attemptCalendarSync(
  reconcile: () => Promise<void>,
): Promise<CalendarSyncResult> {
  try {
    await reconcile();
    return { attempted: true, succeeded: true, error: "" };
  } catch (error) {
    return {
      attempted: true,
      succeeded: false,
      error: error instanceof Error ? error.message : "Google Calendar synchronisation failed.",
    };
  }
}
