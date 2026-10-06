import os
from typing import List, Dict, Any

class LibraryService:
    def __init__(self, storage_dir: str = "books"):
        self.storage_dir = storage_dir
        os.makedirs(self.storage_dir, exist_ok=True)
        
        # Встроенные книги/статьи для заботы и психологической поддержки
        self.preset_books = [
            {
                "id": "book-1",
                "title": "Искусство слышать себя",
                "author": "Анна Психолог",
                "category": "Самопознание",
                "excerpt": "Когда мы останавливаемся и разрешаем себе просто подышать, внутри рождается удивительная тишина, в которой слышен наш истинный голос."
            },
            {
                "id": "book-2",
                "title": "Мягкие границы и ресурс",
                "author": "Елена Гармония",
                "category": "Личные границы",
                "excerpt": "Забота о себе — это не эгоизм. Это фундамент, на котором держится наша способность любить других и наслаждаться жизнью."
            },
            {
                "id": "book-3",
                "title": "Утро начинается с нежности к себе",
                "author": "София Свет",
                "category": "Практики",
                "excerpt": "Подари себе хотя бы 10 минут утром без телефона. Чашка чая, взгляд в окно и мягкое намерение прожить этот день бережно."
            }
        ]

    def list_books(self) -> List[Dict[str, Any]]:
        """Возвращает список доступных книг и цитат"""
        return self.preset_books

    def search_quotes(self, query: str) -> List[Dict[str, Any]]:
        """Ищет цитаты по ключевому слову в библиотеке"""
        if not query:
            return self.preset_books
        
        query_lower = query.lower()
        results = []
        for book in self.preset_books:
            if (query_lower in book["title"].lower() or 
                query_lower in book["author"].lower() or 
                query_lower in book["excerpt"].lower() or
                query_lower in book["category"].lower()):
                results.append(book)
        return results

    def add_custom_excerpt(self, title: str, author: str, category: str, excerpt: str) -> Dict[str, Any]:
        """Добавляет новую выдержку в библиотеку"""
        new_book = {
            "id": f"book-{len(self.preset_books) + 1}",
            "title": title,
            "author": author,
            "category": category,
            "excerpt": excerpt
        }
        self.preset_books.append(new_book)
        return new_book
