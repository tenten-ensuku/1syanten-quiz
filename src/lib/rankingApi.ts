export type RankingPeriod = "daily" | "weekly" | "all";
export type RankingCategory = "effort" | "rank";
export type RankingDifficulty = "basic" | "both" | "advanced";
export type RankingChallengeMode = "random10" | "all" | "type_filtered";

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
  answer_count: number;
  average_seconds: number;
};

export type RankRankingRow = {
  device_id: string;
  player_name: string;
  rank: string;
  score: number;
  average_seconds: number;
  answer_count: number;
  difficulty_mode: RankingDifficulty;
  challenge_mode: RankingChallengeMode;
  submitted_at: string;
};

const SUPABASE_URL = "https://kclkzevcgpfbavegwbnf.supabase.co";
const SUPABASE_KEY = "sb_publishable__8xy0NDda20OtQPc1zSEng_6440qlY2";
const RANK_ORDER = ["F", "E", "D", "C", "B", "A", "S", "SS", "神"];

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

  const parts = getJstDateParts();
  const utcDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  if (period === "weekly") {
    const mondayOffset = (utcDate.getUTCDay() + 6) % 7;
    utcDate.setUTCDate(utcDate.getUTCDate() - mondayOffset);
  }
  return utcDate.toISOString().slice(0, 10);
}

async function supabaseRequest<T>(path: string, init?: RequestInit): Promise<T> {
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
    const message = await response.text();
    throw new Error(message || "ランキング通信に失敗しました。");
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
  });
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
  });
}

export async function fetchEffortRankings(period: RankingPeriod) {
  const view = `iishanten_effort_${period}`;
  const periodKey = getPeriodKey(period);
  const query = new URLSearchParams({
    select: "device_id,player_name,correct_count,answer_count,average_seconds",
    order: "correct_count.desc,answer_count.desc,average_seconds.asc",
    limit: "50"
  });
  if (periodKey) {
    query.set("period_key", `eq.${periodKey}`);
  }
  return supabaseRequest<EffortRankingRow[]>(`${view}?${query}`);
}

export async function fetchRankRankings(period: RankingPeriod) {
  const view = `iishanten_rank_${period}`;
  const periodKey = getPeriodKey(period);
  const query = new URLSearchParams({
    select:
      "device_id,player_name,rank,score,average_seconds,answer_count,difficulty_mode,challenge_mode,submitted_at",
    limit: "200"
  });
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
