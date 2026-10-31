import { z } from "zod";

const domains = z.array(z.enum(["library", "projects", "tasks", "rhythm", "reviews", "notes", "thoughts"])).min(1).max(7);
const page = { limit: z.number().int().min(1).max(25).optional(), cursor: z.string().max(100).optional() };
export const tools = [
  { name: "pcc_library_list", operation: "library", description: "Read PCC Library books/media, ratings, reflections, reading state and ownership. Paginate to inspect more than one page; do not infer absence from an incomplete page.", schema: z.object({
    type: z.enum(["book", "film", "series"]).optional(), readingState: z.enum(["unread", "reading", "finished", "paused", "abandoned"]).optional(),
    ownership: z.enum(["unspecified", "owned", "borrowed", "wishlist"]).optional(), priority: z.enum(["none", "up-next", "soon", "later"]).optional(),
    status: z.enum(["wishlist", "watching", "completed", "dropped"]).optional(), ...page }).strict() },
  { name: "pcc_search", operation: "search", description: "Search permitted PCC retained history using lexical terms, not semantic similarity. Returns bounded snippets and source IDs. Use pcc_read_record for details; no matches does not prove the topic is absent.", schema: z.object({
    query: z.string().trim().min(1).max(240), domains, from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), limit: page.limit }).strict() },
  { name: "pcc_read_record", operation: "read", description: "Read one explicitly permitted projected PCC record by canonical source ID (and optional project action ID). Never returns the raw snapshot, Keychain or private upload contents.", schema: z.object({
    domain: z.enum(["library", "projects", "tasks", "reviews", "notes", "thoughts"]), sourceId: z.string().trim().min(1).max(200), sourceSubId: z.string().trim().min(1).max(200).optional() }).strict() },
  { name: "pcc_get_context", operation: "context", description: "Build bounded PCC context from selected granted domains. Optional question invokes deterministic lexical retrieval. This is not an exhaustive list; respect truncation, record/recency bounds and source provenance. Use planning/library tools for complete pagination.", schema: z.object({
    domains, query: z.string().trim().min(1).max(240).optional(), current: z.array(z.enum(["projects", "tasks", "rhythm"])).max(3).optional(), maxChars: z.number().int().min(1000).max(20000).optional(), maxRecords: z.number().int().min(1).max(20).optional() }).strict() },
  { name: "pcc_get_planning", operation: "planning", description: "Read current PCC tasks, open project actions, project attention and weekly intentions using an explicit IANA timezone. Paginate for all records. Meaningful dates differ from flexible focus. Calendar is NOT included: never infer free time from this result. asOf groups current state, not a historical snapshot.", schema: z.object({
    timezone: z.string().min(1).max(100), asOf: z.string().max(40).optional(), ...page }).strict() },
];

const record = z.object({ sourceId: z.string(), domain: z.string(), title: z.string().max(300), text: z.string().max(12000), truncated: z.boolean() }).passthrough();
const common = { version: z.literal(1), revision: z.number().int().nonnegative(), generatedAt: z.iso.datetime(), coverage: domains, warnings: z.array(z.string()) };
const paginated = { complete: z.boolean(), nextCursor: z.string().nullable(), total: z.number().int().nonnegative() };
export const responses = {
  library: z.object({ ...common, ...paginated, records: z.array(record).max(25) }).passthrough(),
  read: z.object({ ...common, record }).passthrough(),
  search: z.object({ ...common, complete: z.boolean(), totalMatches: z.number().int().nonnegative(), results: z.array(z.object({ domain: z.string(), sourceId: z.string(), title: z.string().max(300), snippet: z.string().max(400) }).passthrough()).max(25) }).passthrough(),
  context: z.object({ ...common, complete: z.literal(false), context: z.object({}).passthrough() }).passthrough(),
  planning: z.object({ ...common, ...paginated, calendarCoverage: z.literal("not-included"), timezone: z.string(), today: z.string(), records: z.array(z.object({ kind: z.string(), sourceId: z.string(), title: z.string().max(300), category: z.string() }).passthrough()).max(25) }).passthrough(),
};
