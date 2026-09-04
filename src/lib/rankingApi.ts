export type RankingPeriod = "daily" | "weekly" | "monthly" | "all";
export type RankingCategory = "effort" | "rank";
export type RankingDifficulty = "basic" | "both" | "advanced";
export type RankingChallengeMode = "random10" | "all" | "type_filtered";
export type RankGenre =
  | "basic-random10"
  | "both-random10"
  | "advanced-random10"
  | "basic-all"
  | "both-all";

export type RankingSubmission = {
  run_id: string;
  player_name: string;
  device_id: string;
  difficulty_mode: RankingDifficulty;
  challenge_mode: RankingChallengeMode;
  rank: string;
  score: number;
  correct_count: number;
  answer_count: number;
  elapsed_seconds: number;
  average_seconds: number;
  client_version: string;
};

export type PendingDailyEffort = {
  correctCount: number;
  answerCount: number;
  totalMs: number;
};

export type EffortRankingRow = {
  device_id: string;
  player_name: string;
  correct_count: number;
  answer_count: number | null;
  average_seconds: number | null;
};

export type RankRankingRow = {
  device_id: string;
  player_name: string;
  rank: string;
  score: number;
  correct_count: number;
  correct_rate: number;
  elapsed_seconds: number;
  average_seconds: number;
  answer_count: number;
  difficulty_mode: RankingDifficulty;
  challenge_mode: RankingChallengeMode;
  submitted_at: string;
};

export type RankingOperation = "submit" | "view";

export const SUPABASE_SERVICE_STATUS = {
  enabled: true,
  bannerTitle: "一部機能を一時停止しています",
  bannerBody:
    "現在システム調整のため、成績送信・ランキング閲覧など一部のオンライン機能をご利用いただけません。問題演習・採点・ローカル履歴は引き続きご利用いただけます。",
  recoveryNotice: "2026年9月6日以降、順次復旧予定です。",
  submitNotice:
    "現在、成績送信機能は一時停止中です。2026年9月6日以降、順次復旧予定です。ご不便をおかけして申し訳ございません。",
  viewNotice:
    "現在、成績・ランキングの閲覧機能は一時停止中です。2026年9月6日以降、順次復旧予定です。ご不便をおかけして申し訳ございません。"
} as const;

export function getSupabaseServiceNotice(operation: RankingOperation) {
  return operation === "view"
    ? SUPABASE_SERVICE_STATUS.viewNotice
    : SUPABASE_SERVICE_STATUS.submitNotice;
}

type SupabaseRequestError = Error & {
  code?: string;
  details?: string;
  status?: number;
  statusCode?: number;
  operation?: RankingOperation;
};

function createSupabasePausedError(operation: RankingOperation): SupabaseRequestError {
  const error = new Error("Supabase request paused") as SupabaseRequestError;
  error.code = "ONLINE_SERVICE_PAUSED";
  error.operation = operation;
  return error;
}

function isSupabaseServiceUnavailable(error: unknown) {
  const candidate = error as SupabaseRequestError | null;
  const status = Number(candidate?.status || candidate?.statusCode || candidate?.code);
  const message = String(
    `${candidate?.message || ""} ${candidate?.details || ""} ${error || ""}`
  ).toLowerCase();
  return [402, 429].includes(status)
    || (status >= 500 && status <= 599)
    || /quota exceeded|service restricted|payment required|failed to fetch|networkerror|fetch failed|supabase error/.test(message);
}

export function getSupabaseUserMessage(error: unknown, operation: RankingOperation) {
  const candidate = error as SupabaseRequestError | null;
  if (candidate?.code === "ONLINE_SERVICE_PAUSED" || SUPABASE_SERVICE_STATUS.enabled || isSupabaseServiceUnavailable(error)) {
    return getSupabaseServiceNotice(operation);
  }
  return operation === "view"
    ? "成績・ランキングを取得できませんでした。時間をおいてもう一度お試しください。"
    : "成績を送信できませんでした。時間をおいてもう一度お試しください。";
}

const SUPABASE_URL = "https://kclkzevcgpfbavegwbnf.supabase.co";
const SUPABASE_KEY = "sb_publishable__8xy0NDda20OtQPc1zSEng_6440qlY2";
const RANK_ORDER = ["F", "E", "D", "C", "B", "A", "S", "SS", "神"];
const RANK_GENRE_ANSWER_COUNTS: Record<RankGenre, number> = {
  "basic-random10": 10,
  "both-random10": 10,
  "advanced-random10": 10,
  "basic-all": 63,
  "both-all": 85
};

function getJstDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day)
  };
}

export function getJstDateKey(date = new Date()) {
  const parts = getJstDateParts(date);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(
    parts.day
  ).padStart(2, "0")}`;
}

function getPeriodKey(period: RankingPeriod) {
  if (period === "all") {
    return null;
  }

  return getJstDateKey();
}

async function supabaseRequest<T>(
  path: string,
  init?: RequestInit,
  operation: RankingOperation = "view"
): Promise<T> {
  if (SUPABASE_SERVICE_STATUS.enabled) {
    throw createSupabasePausedError(operation);
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...init?.headers
    }
  });

  if (!response.ok) {
    const details = await response.text();
    const error = new Error("Supabase request failed") as SupabaseRequestError;
    error.status = response.status;
    error.details = details;
    error.operation = operation;
    throw error;
  }

  const responseText = await response.text();
  if (!responseText) {
    return undefined as T;
  }
  return JSON.parse(responseText) as T;
}

export async function submitRankingResult(payload: RankingSubmission) {
  await supabaseRequest("iishanten_ranking_submissions", {
    method: "POST",
    headers: {
      Prefer: "return=minimal,resolution=ignore-duplicates"
    },
    body: JSON.stringify(payload)
  }, "submit");
}

export async function submitDailyEffortEvent(
  eventId: string,
  deviceId: string,
  playerName: string,
  activityDate: string,
  pending: PendingDailyEffort
) {
  if (pending.answerCount === 0) {
    return;
  }

  await supabaseRequest("iishanten_effort_events", {
    method: "POST",
    headers: {
      Prefer: "return=minimal,resolution=ignore-duplicates"
    },
    body: JSON.stringify({
      event_id: eventId,
      device_id: deviceId,
      activity_date: activityDate,
      player_name: playerName,
      correct_count: pending.correctCount,
      answer_count: pending.answerCount,
      elapsed_seconds: Number((pending.totalMs / 1000).toFixed(2))
    })
  }, "submit");
}

export async function fetchEffortRankings(period: RankingPeriod) {
  const view = `iishanten_effort_${period}`;
  const periodKey = getPeriodKey(period);
  const query = new URLSearchParams({
    select: "device_id,player_name,correct_count,answer_count,average_seconds",
    order: "correct_count.desc,answer_count.desc.nullslast,average_seconds.asc.nullslast",
    limit: "50"
  });
  if (periodKey) {
    query.set("period_key", `eq.${periodKey}`);
  }
  return supabaseRequest<EffortRankingRow[]>(`${view}?${query}`);
}

export async function fetchRankRankings(
  period: RankingPeriod,
  genre: RankGenre
) {
  const view = `iishanten_rank_${period}`;
  const periodKey = getPeriodKey(period);
  const [difficultyMode, challengeMode] = genre.split("-") as [
    RankingDifficulty,
    Exclude<RankingChallengeMode, "type_filtered">
  ];
  const query = new URLSearchParams({
    select:
      "device_id,player_name,rank,score,correct_count,correct_rate,elapsed_seconds,average_seconds,answer_count,difficulty_mode,challenge_mode,submitted_at",
    limit: "200"
  });
  query.set("difficulty_mode", `eq.${difficultyMode}`);
  query.set("challenge_mode", `eq.${challengeMode}`);
  query.set("answer_count", `eq.${RANK_GENRE_ANSWER_COUNTS[genre]}`);
  if (periodKey) {
    query.set("period_key", `eq.${periodKey}`);
  }
  const rows = await supabaseRequest<RankRankingRow[]>(`${view}?${query}`);
  return rows
    .sort((left, right) => {
      const rankDifference =
        RANK_ORDER.indexOf(right.rank) - RANK_ORDER.indexOf(left.rank);
      if (rankDifference !== 0) {
        return rankDifference;
      }
      if (left.average_seconds !== right.average_seconds) {
        return left.average_seconds - right.average_seconds;
      }
      if (left.score !== right.score) {
        return right.score - left.score;
      }
      return left.submitted_at.localeCompare(right.submitted_at);
    })
    .slice(0, 50);
}
