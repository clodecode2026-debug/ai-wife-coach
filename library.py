"""
Модуль: Расширенная психологическая библиотека с книгами Ялома, Готтмана, Перель, Франкла, Джонсон и Берна.
"""

from books.psychology_books import get_psychology_books

def get_library_items():
    books = get_psychology_books()
    items = []
    for b in books:
        items.append({
            "id": b["id"],
            "title": b["title"],
            "author": b["author"],
            "category": b["category"],
            "year": b.get("year", 2020),
            "rating": b.get("rating", 4.9),
            "excerpt": b["excerpt"],
            "description": b["description"],
            "key_ideas": b["key_ideas"],
            "takeaway": b.get("key_ideas", [""])[0] if b.get("key_ideas") else "",
            "chapters": b.get("chapters", []),
            "practical_exercises": b.get("practical_exercises", []),
            "discussion_intro": b.get("discussion_intro", "")
        })
    return items

