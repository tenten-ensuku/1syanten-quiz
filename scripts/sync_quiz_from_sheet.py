from __future__ import annotations

import csv
import io
import json
import re
import urllib.request
from pathlib import Path


SHEET_CSV_URL = (
    "https://docs.google.com/spreadsheets/d/"
    "12bZXrrs3ZL06tRIxkcZ96rdJtiMMVbtyia8qwv9B63s/"
    "export?format=csv&gid=0"
)
QUIZ_DATA_PATH = Path("src/lib/quizData.ts")
EXPLANATIONS_PATH = Path("src/lib/generatedExplanations.ts")

TYPE_COLUMNS = ["余剰牌型", "完全形", "ヘッドレス1型", "ヘッドレス2型", "くっつき"]
DIFFICULTY_LEVELS = ["基本", "応用"]
TILE_ORDER = [
    *(f"{number}m" for number in range(1, 10)),
    *(f"{number}p" for number in range(1, 10)),
    *(f"{number}s" for number in range(1, 10)),
    "ton",
    "nan",
    "sha",
    "pei",
    "haku",
    "hatsu",
    "chun",
]
TILE_ORDER_INDEX = {tile_id: index for index, tile_id in enumerate(TILE_ORDER)}
GROUP_LABELS = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧"]

QUESTION_PATTERN = re.compile(
    r'createQuestion\(\s*"([^"]+)",\s*"([^"]+)",\s*\[(.*?)\],\s*'
    r'"((?:\\.|[^"])*)",\s*\[(.*?)\],\s*"([^"]+)"\s*\)',
    re.S,
)

CHAR_REPLACEMENTS = {
    "１": "1",
    "２": "2",
    "３": "3",
    "４": "4",
    "５": "5",
    "６": "6",
    "７": "7",
    "８": "8",
    "９": "9",
    "ｍ": "m",
    "ｐ": "p",
    "ｓ": "s",
    "東": "ton",
    "南": "nan",
    "西": "sha",
    "北": "pei",
    "白": "haku",
    "發": "hatsu",
    "発": "hatsu",
    "中": "chun",
}


def normalize_notation(value: str) -> str:
    normalized = value.strip()
    for source, replacement in CHAR_REPLACEMENTS.items():
        normalized = normalized.replace(source, replacement)
    return re.sub(r"\s+", " ", normalized)


def compact_notation(value: str) -> str:
    return normalize_notation(value).replace(" ", "")


def parse_answer_notation(value: str) -> list[str]:
    normalized = compact_notation(value)
    tiles: list[str] = []

    for digits, suit, honor in re.findall(
        r"([1-9]+)([mps])|(ton|nan|sha|pei|haku|hatsu|chun)", normalized
    ):
        if honor:
            tiles.append(honor)
        else:
            tiles.extend(f"{digit}{suit}" for digit in digits)

    unknown = re.sub(
        r"([1-9]+)([mps])|(ton|nan|sha|pei|haku|hatsu|chun)|[・、,./+～〜\-]",
        "",
        normalized,
    )
    if unknown:
        raise ValueError(f"Unknown answer notation: {value!r} ({unknown!r})")

    return sorted(set(tiles), key=TILE_ORDER_INDEX.__getitem__)


def parse_existing_answers(source_text: str) -> dict[str, list[str]]:
    answers_by_source: dict[str, list[str]] = {}
    for match in QUESTION_PATTERN.finditer(source_text):
        source = compact_notation(match.group(2))
        answers_by_source[source] = re.findall(r'"([^"]+)"', match.group(3))
    return answers_by_source


def make_question_id(index: int) -> str:
    if index >= 64:
        return f"EX-{index - 63}"
    group_index = index // 8
    number = index % 8 + 1
    return f"{GROUP_LABELS[group_index]}-{number}"


def resolve_types(row_number: int, source: str, row: dict[str, str]) -> list[str]:
    types = [column for column in TYPE_COLUMNS if row.get(column) == "TRUE"]

    # Explicit correction: sheet row 67 is judged as headless type 1.
    if row_number == 67 and source == "223334678m1122p":
        return ["ヘッドレス1型"]

    # EX-20 is explicitly explained through both headless and extra-tile views.
    if row_number == 93 and source == "23345667m56778s":
        return ["余剰牌型", "ヘッドレス1型"]

    # Prior explicit classification request: ⑦-2 belongs only to headless type 1.
    if source == "34456778m78s456p":
        return ["ヘッドレス1型"]

    # Sheet row 75's explanation says complete form, despite the extra-tile checkbox.
    if row_number == 75 and source == "4455567p455567s":
        return ["完全形"]

    if not types:
        raise ValueError(f"No shanten type selected at sheet row {row_number}: {source}")
    return types


def resolve_explanation(row_number: int, source: str, explanation: str) -> str:
    # Keep row 68's explanation aligned with the corrected souzu block.
    if row_number == 68 and source == "134568m234p2244s":
        return explanation.replace("1345688ｍ", "134568ｍ").replace("3ｐ", "3ｓ")
    return explanation


def resolve_difficulty(row_number: int, row: dict[str, str]) -> str:
    difficulty = (row.get("") or "").strip()
    if difficulty not in DIFFICULTY_LEVELS:
        raise ValueError(
            f"Unknown difficulty at sheet row {row_number}: {difficulty!r}"
        )
    return difficulty


def ts_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def format_string_array(values: list[str], indent: str = "    ") -> str:
    if not values:
        return "[]"
    if len(values) <= 5:
        return f"[{', '.join(ts_string(value) for value in values)}]"
    body = ",\n".join(f"{indent}  {ts_string(value)}" for value in values)
    return f"[\n{body}\n{indent}]"


def render_question(question: dict[str, object]) -> str:
    answers = format_string_array(question["answers"], "    ")
    types = format_string_array(question["types"], "    ")
    return (
        "  createQuestion(\n"
        f"    {ts_string(question['id'])},\n"
        f"    {ts_string(question['source'])},\n"
        f"    {answers},\n"
        f"    {ts_string(question['explanation'])},\n"
        f"    {types},\n"
        f"    {ts_string(question['difficulty'])}\n"
        "  )"
    )


def main() -> None:
    existing_source = QUIZ_DATA_PATH.read_text(encoding="utf-8")
    existing_answers = parse_existing_answers(existing_source)

    with urllib.request.urlopen(SHEET_CSV_URL) as response:
        csv_text = response.read().decode("utf-8-sig")

    questions: list[dict[str, object]] = []
    for row_number, row in enumerate(csv.DictReader(io.StringIO(csv_text)), start=2):
        raw_source = (row.get("問題") or "").strip()
        if not raw_source:
            continue

        source = normalize_notation(raw_source)
        source_key = compact_notation(source)
        raw_answer = (row.get("正解") or "").strip()
        answers = (
            parse_answer_notation(raw_answer)
            if raw_answer
            else existing_answers.get(source_key)
        )
        if answers is None:
            raise ValueError(f"Missing answer at sheet row {row_number}: {source}")

        questions.append(
            {
                "id": make_question_id(len(questions)),
                "source": source,
                "answers": answers,
                "explanation": resolve_explanation(
                    row_number, source_key, row.get("解説") or ""
                ),
                "types": resolve_types(row_number, source_key, row),
                "difficulty": resolve_difficulty(row_number, row),
            }
        )

    if len(questions) != 84:
        raise ValueError(f"Expected 84 questions, found {len(questions)}")

    prefix = existing_source.split("export const QUIZ_QUESTIONS", maxsplit=1)[0]
    rendered_questions = ",\n".join(render_question(question) for question in questions)
    QUIZ_DATA_PATH.write_text(
        f"{prefix}export const QUIZ_QUESTIONS: QuizQuestion[] = [\n"
        f"{rendered_questions}\n"
        "];\n",
        encoding="utf-8",
    )

    explanation_rows = ",\n".join(
        f"  {ts_string(question['source'])}: {ts_string(question['explanation'])}"
        for question in questions
    )
    EXPLANATIONS_PATH.write_text(
        "/* This file is generated from the source Google Sheet. */\n"
        "export const GENERATED_EXPLANATIONS: Record<string, string> = {\n"
        f"{explanation_rows}\n"
        "};\n",
        encoding="utf-8",
    )

    print(f"Synced {len(questions)} questions from Google Sheets.")


if __name__ == "__main__":
    main()
