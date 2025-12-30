import re
from pathlib import Path
from typing import List
from pydantic import BaseModel


class Section(BaseModel):
    question: str
    answer_code: str


class Card(BaseModel):
    id: str
    title: str
    sections: List[Section]


class Deck(BaseModel):
    id: str
    name: str
    total_cards: int
    cards: List[Card]


def extract_code_blocks(text: str) -> str:
    """Extract code from triple-backtick blocks."""
    code_match = re.search(r'```(?:\w+)?\s*\n(.*?)\n```', text, re.DOTALL)
    return code_match.group(1).strip() if code_match else ""


def parse_markdown_file(content: str, filename: str) -> Card:
    """Parse a markdown file into a Card with sections."""
    parts = content.split('\n---\n')

    if not parts:
        return Card(id=filename, title="Untitled", sections=[])

    title = parts[0].strip().split('\n')[0]

    sections = []
    i = 0
    while i < len(parts):
        question_text = parts[i].strip()

        if i + 1 < len(parts):
            answer_text = parts[i + 1].strip()
            answer_code = extract_code_blocks(answer_text)

            sections.append(Section(
                question=question_text,
                answer_code=answer_code
            ))
            i += 2
        else:
            i += 1

    card_id = filename.replace('.md', '')

    return Card(id=card_id, title=title, sections=sections)


def parse_deck_folder(folder_path: str) -> Deck:
    """Parse a folder of markdown files into a Deck."""
    folder = Path(folder_path)

    if not folder.exists() or not folder.is_dir():
        raise ValueError(f"Invalid folder path: {folder_path}")

    folder_name = folder.name
    match = re.match(r'^([A-Za-z0-9]+)\s*-\s*(.+)$', folder_name)

    if match:
        deck_id = match.group(1)
        deck_name = match.group(2).strip()
    else:
        deck_id = folder_name
        deck_name = folder_name

    cards = []
    for file_path in sorted(folder.glob('*.md')):
        try:
            content = file_path.read_text(encoding='utf-8')
            card = parse_markdown_file(content, file_path.name)
            cards.append(card)
        except Exception as e:
            print(f"Error parsing {file_path.name}: {e}")
            continue

    return Deck(
        id=deck_id,
        name=deck_name,
        total_cards=len(cards),
        cards=cards
    )
