# -*- coding: utf-8 -*-
"""
Enriches books/german_180days_course.json with authentic, high-quality
thematic vocabulary, dialogues, and guidebooks for all 180 days (especially Days 31 to 180).
"""
import json
import os
import re

COURSE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "books", "german_180days_course.json")

# База аутентичных данных для каждого раздела (Unit 7 до Unit 36)
UNITS_DATA = {
    7: {
        "title": "Unit 7: Dativ: дательный падеж dem/der/den (где? кому?)",
        "guidebook": {
            "title": "Справочник: Dativ — падеж покоя и адресата",
            "grammar_summary": "Dativ отвечает на вопросы 'Wem?' (Кому?) и 'Wo?' (Где?).\nАртикли: der -> dem, das -> dem, die -> der, die (мн.ч.) -> den +n к концу существительного!\nПример: Ich helfe dem Mann (der Mann), Ich danke der Frau (die Frau).",
            "tips": "Запомните формулу: мужской и средний род получают -m (dem), женский получает -r (der), а множественное число -n (den Kindern).",
            "key_phrases": [
                "Ich helfe dem Mann. (Я помогаю мужчине)",
                "Wie geht es der Familie? (Как дела у семьи?)",
                "Ich antworte dem Kind. (Я отвечаю ребенку)",
                "Wir danken den Freunden. (Мы благодарим друзей)"
            ]
        },
        "days": {
            31: {
                "title": "День 31: Dativ мужского рода (dem / einem)",
                "grammar": "Мужской род в Dativ получает окончание -m: dem / einem.",
                "vocab": [
                    ("helfen", "", "помогать", "[хе́льфэн]", "Ich helfe dem Mann gerne.", "Я с удовольствием помогаю мужчине."),
                    ("danken", "", "благодарить", "[да́нкэн]", "Ich danke meinem Mann Roman.", "Я благодарю своего мужа Романа."),
                    ("antworten", "", "отвечать (кому-то)", "[а́нтвортэн]", "Ich antworte dem Arzt sofort.", "Я сразу отвечаю врачу."),
                    ("der Mann", "der", "мужчина / муж", "[дэр ман]", "Wie geht es dem Mann?", "Как дела у мужчины?"),
                    ("der Arzt", "der", "врач", "[дэр артцт]", "Ich vertraue dem Arzt.", "Я доверяю врачу."),
                    ("der Nachbar", "der", "сосед", "[дэр на́хбар]", "Ich gebe dem Nachbarn das Paket.", "Я отдаю соседу посылку."),
                    ("der Kollege", "der", "коллега", "[дэр колэ́гэ]", "Ich helfe dem Kollegen bei der Arbeit.", "Я помогаю коллеге по работе."),
                    ("gehören", "", "принадлежать", "[гэхе́рэн]", "Das Buch gehört dem Lehrer.", "Книга принадлежит учителю.")
                ],
                "dialogue": {
                    "situation": "Вы помогаете соседу занести тяжелую сумку в подъезд.",
                    "example": "Kann ich Ihnen oder dem Nachbarn kurz helfen?",
                    "tips": "Глагол helfen всегда требует Dativ! 'dem Nachbarn' — это вежливо и естественно."
                }
            },
            32: {
                "title": "День 32: Dativ женского рода (der / einer)",
                "grammar": "Женский род в Dativ неожиданно меняется на der / einer!",
                "vocab": [
                    ("die Frau", "die", "женщина / жена", "[ди фрау]", "Ich helfe der Frau mit den Taschen.", "Я помогаю женщине с сумками."),
                    ("die Mutter", "die", "мама", "[ди му́тэр]", "Ich schenke der Mutter Blumen.", "Я дарю маме цветы."),
                    ("die Nachbarin", "die", "соседка", "[ди на́хбарин]", "Ich wünsche der Nachbarin einen schönen Tag.", "Я желаю соседке хорошего дня."),
                    ("die Kollegin", "die", "коллега (женщина)", "[ди колэ́гин]", "Ich danke der Kollegin für die Hilfe.", "Я благодарю коллегу за помощь."),
                    ("schenken", "", "дарить", "[ше́нкэн]", "Was schenkst du der Freundin?", "Что ты даришь подруге?"),
                    ("vertrauen", "", "доверять", "[фэртра́уэн]", "Ich vertraue der Ärztin vollkommen.", "Я полностью доверяю врачу."),
                    ("gefallen", "", "нравиться", "[гэфа́лэн]", "Die Stadt gefällt der Touristin.", "Город нравится туристке."),
                    ("die Tochter", "die", "дочь", "[ди то́хтэр]", "Wir gratulieren der Tochter zum Geburtstag.", "Мы поздравляем дочь с днем рождения.")
                ],
                "dialogue": {
                    "situation": "Вы благодарите соседку или коллегу за поддержку.",
                    "example": "Ich danke der Kollegin herzlich für die Unterstützung.",
                    "tips": "Помните: женский род в Dativ — это 'der' (der Frau, der Freundin)."
                }
            },
            33: {
                "title": "День 33: Dativ среднего рода (dem / einem)",
                "grammar": "Средний род в Dativ копирует мужской: dem / einem.",
                "vocab": [
                    ("das Kind", "das", "ребенок", "[дас кинт]", "Ich gebe dem Kind einen Apfel.", "Я даю ребенку яблоко."),
                    ("das Mädchen", "das", "девочка", "[дас мэ́тхен]", "Das Kleid gefällt dem Mädchen.", "Платье нравится девочке."),
                    ("das Baby", "das", "малыш", "[дас бэ́йби]", "Die Mutter hilft dem Baby.", "Мама помогает малышу."),
                    ("das Auto", "das", "автомобиль", "[дас а́уто]", "Was fehlt dem Auto?", "Что не так с машиной?"),
                    ("fehlen", "", "не хватать / недоставать", "[фэ́йлен]", "Dem Kind fehlt etwas Ruhe.", "Ребенку не хватает немного покоя."),
                    ("glauben", "", "верить (кому-то)", "[гла́убэн]", "Ich glaube dem Kind.", "Я верю ребенку."),
                    ("das Zimmer", "das", "комната", "[дас ци́мэр]", "In dem Zimmer ist es warm.", "В комнате тепло."),
                    ("das Haus", "das", "дом", "[дас хаус]", "Vor dem Haus steht ein Baum.", "Перед домом стоит дерево.")
                ],
                "dialogue": {
                    "situation": "Вы угощаете ребенка знакомых фруктами.",
                    "example": "Schmeckt das Obst dem Kind gut?",
                    "tips": "Глагол schmecken (быть по вкусу) всегда требует Dativ."
                }
            },
            34: {
                "title": "День 34: Dativ множественного числа (den ...-n)",
                "grammar": "Множественное число в Dativ получает артикль den и окончание -n у существительного.",
                "vocab": [
                    ("die Kinder", "pl", "дети", "[ди ки́ндэр]", "Ich helfe den Kindern bei den Hausaufgaben.", "Я помогаю детям с уроками."),
                    ("die Eltern", "pl", "родители", "[ди э́льтэрн]", "Ich schreibe den Eltern einen Brief.", "Я пишу родителям письмо."),
                    ("die Freunde", "pl", "друзья", "[ди фро́йндэ]", "Wir danken den Freunden für den Besuch.", "Мы благодарим друзей за визит."),
                    ("die Nachbarn", "pl", "соседи", "[ди на́хбарн]", "Guten Morgen den Nachbarn!", "Доброе утро соседям!"),
                    ("erklären", "", "объяснять", "[эрклэ́рэн]", "Der Lehrer erklärt den Schülern die Grammatik.", "Учитель объясняет ученикам грамматику."),
                    ("zeigen", "", "показывать", "[ца́йгэн]", "Ich zeige den Gästen die Wohnung.", "Я показываю гостям квартиру."),
                    ("die Kollegen", "pl", "коллеги", "[ди колэ́гэн]", "Ich wünsche den Kollegen ein schönes Wochenende.", "Я желаю коллегам хороших выходных."),
                    ("die Leute", "pl", "люди", "[ди ло́йтэ]", "Es gefällt den Leuten hier sehr.", "Людям здесь очень нравится.")
                ],
                "dialogue": {
                    "situation": "Вы встречаете друзей в гостях и приветствуете их.",
                    "example": "Ich wünsche den Freunden einen gemütlichen Abend!",
                    "tips": "Во множественном числе к существительному добавляется буква -n: den Freunden, den Kindern."
                }
            },
            35: {
                "title": "День 35: Закрепление Dativ: личные местоимения (mir, dir, ihm, ihr, uns, Ihnen)",
                "grammar": "Кому? mir (мне), dir (тебе), ihm (ему), ihr (ей), uns (нам), Ihnen (Вам).",
                "vocab": [
                    ("Wie geht es dir?", "", "Как твои дела?", "[ви гейт эс дир]", "Wie geht es dir heute, Alina?", "Как твои дела сегодня, Алина?"),
                    ("Mir geht es gut.", "", "У меня все хорошо.", "[мир гейт эс гут]", "Danke, mir geht es blendend.", "Спасибо, у меня все отлично."),
                    ("helfen Sie mir", "", "помогите мне", "[хе́льфэн зи мир]", "Können Sie mir bitte helfen?", "Можете ли Вы мне помочь?"),
                    ("Es tut mir leid.", "", "Мне очень жаль / Простите.", "[эс тут мир лайт]", "Es tut mir leid, ich habe mich verspätet.", "Мне жаль, я опоздала."),
                    ("schmecken", "", "быть вкусным / нравиться по вкусу", "[шмэ́кэн]", "Schmeckt es dir?", "Тебе вкусно?"),
                    ("passen", "", "подходить (по размеру или времени)", "[па́сэн]", "Dienstag passt mir gut.", "Вторник мне отлично подходит."),
                    ("stehen", "", "идти / быть к лицу", "[штэ́эн]", "Dieses Kleid steht dir hervorragend.", "Это платье тебе потрясающе идет."),
                    ("gefallen", "", "нравиться", "[гэфа́лэн]", "Es gefällt mir hier sehr.", "Мне здесь очень нравится.")
                ],
                "dialogue": {
                    "situation": "Согласование удобного времени встречи.",
                    "example": "Passt Ihnen der Dienstag um zehn Uhr gut?",
                    "tips": "Фраза 'Das passt mir gut' — главная формула для записи на приемы в Германии."
                }
            }
        }
    },
    8: {
        "title": "Unit 8: Предлоги Dativ: mit, nach, von, zu, bei, seit, aus",
        "guidebook": {
            "title": "Справочник: Железные предлоги Dativ (семёрка Dativ)",
            "grammar_summary": "После этих предлогов ВСЕГДА стоит Dativ без исключений:\naus (из), bei (у/при), mit (с), nach (после/в), seit (с/уже как), von (от/о), zu (к/до).\nЗапомните песенку-стишок: 'aus, bei, mit, nach, seit, von, zu — immer mit dem Dativ du!'",
            "tips": "В реальной жизни слияния предлогов используются постоянно: bei + dem = beim, zu + dem = zum, zu + der = zur, von + dem = vom.",
            "key_phrases": [
                "Ich fahre mit dem Bus. (Я еду на автобусе)",
                "Ich bin beim Arzt. (Я у врача)",
                "Ich gehe zur Apotheke. (Я иду в аптеку)",
                "Seit einem Monat lerne ich Deutsch. (Уже месяц я учу немецкий)"
            ]
        },
        "days": {
            36: {
                "title": "День 36: Предлог mit (с кем? на чем?)",
                "grammar": "Предлог mit всегда требует Dativ: mit dem Bus, mit der Bahn, mit dem Mann.",
                "vocab": [
                    ("mit dem Bus", "", "на автобусе", "[мит дэм бус]", "Ich fahre jeden Tag mit dem Bus.", "Я езжу каждый день на автобусе."),
                    ("mit dem Zug", "", "на поезде", "[мит дэм цук]", "Wir reisen mit dem Zug nach München.", "Мы путешествуем на поезде в Мюнхен."),
                    ("mit der U-Bahn", "", "на метро", "[мит дэр у-бан]", "Mit der U-Bahn geht es schneller.", "На метро получается быстрее."),
                    ("mit dem Auto", "", "на машине", "[мит дэм а́уто]", "Roman fährt mit dem Auto zur Arbeit.", "Роман едет на машине на работу."),
                    ("mit meiner Familie", "", "с моей семьей", "[мит ма́йнэр фами́лиэ]", "Ich verbringe Zeit mit meiner Familie.", "Я провожу время со своей семьей."),
                    ("mit Vergnügen", "", "с удовольствием", "[мит фэргни́гэн]", "Ich mache das mit Vergnügen.", "Я делаю это с удовольствием."),
                    ("zusammen mit", "", "вместе с", "[цуза́мэн мит]", "Zusammen mit Roman koche ich das Abendessen.", "Вместе с Романом я готовлю ужин."),
                    ("sprechen mit", "", "разговаривать с", "[шпрэ́хэн мит]", "Ich möchte kurz mit Ihnen sprechen.", "Я хотела бы коротко поговорить с Вами.")
                ],
                "dialogue": {
                    "situation": "Вы объясняете прохожему или знакомому, как добираетесь до школы.",
                    "example": "Ich fahre morgens bequem mit der Straßenbahn zur Schule.",
                    "tips": "В немецком для транспорта используется 'mit + Dativ' (mit dem Bus, mit dem Fahrrad)."
                }
            },
            37: {
                "title": "День 37: Предлоги bei (у/при) и zu (к/до)",
                "grammar": "bei + dem = beim (нахождение где-то), zu + dem = zum, zu + der = zur (направление).",
                "vocab": [
                    ("beim Arzt", "", "у врача", "[байм артцт]", "Ich bin heute Vormittag beim Arzt.", "Я сегодня до обеда у врача."),
                    ("zum Arzt", "", "к врачу", "[цум артцт]", "Ich muss dringend zum Arzt gehen.", "Мне нужно срочно пойти к врачу."),
                    ("zur Apotheke", "", "в аптеку (по направлению)", "[цур апотэ́йкэ]", "Ich gehe schnell zur Apotheke.", "Я быстро пойду в аптеку."),
                    ("beim Bürgeramt", "", "в ведомстве по делам граждан", "[байм бю́ргэрамт]", "Ich habe einen Termin beim Bürgeramt.", "У меня запись в Бюргер-амт."),
                    ("zu Hause", "", "дома (нахождение)", "[цу ха́узэ]", "Ich bleibe heute lieber zu Hause.", "Я лучше останусь сегодня дома."),
                    ("nach Hause", "", "домой (направление)", "[нах ха́узэ]", "Ich gehe jetzt nach Hause.", "Я иду сейчас домой."),
                    ("beim Einkaufen", "", "за покупками / во время покупок", "[байм а́йнкауфэн]", "Beim Einkaufen treffe ich oft Bekannte.", "За покупками я часто встречаю знакомых."),
                    ("zu Fuß", "", "пешком", "[цу фус]", "Ich gehe gerne zu Fuß durch den Park.", "Я люблю ходить пешком через парк.")
                ],
                "dialogue": {
                    "situation": "Вас спрашивают, куда вы направляетесь.",
                    "example": "Ich gehe jetzt gleich zum Termin beim Amt.",
                    "tips": "Различайте: 'Ich bin beim Arzt' (я уже там) и 'Ich gehe zum Arzt' (я направляюсь туда)."
                }
            },
            38: {
                "title": "День 38: Предлог seit (уже как / с тех пор как)",
                "grammar": "Предлог seit обозначает действие, начавшееся в прошлом и продолжающееся сейчас!",
                "vocab": [
                    ("seit einem Monat", "", "уже месяц как", "[зайт а́йнэм мо́нат]", "Ich lerne seit einem Monat Deutsch.", "Я учу немецкий уже месяц."),
                    ("seit einem Jahr", "", "уже год как", "[зайт а́йнэм яр]", "Wir wohnen seit einem Jahr hier.", "Мы живем здесь уже год."),
                    ("seit einer Woche", "", "уже неделю как", "[зайт а́йнэр во́хэ]", "Ich warte seit einer Woche auf die Antwort.", "Я жду ответа уже неделю."),
                    ("seit drei Tagen", "", "уже три дня", "[зайт драй та́гэн]", "Ich habe seit drei Tagen Kopfschmerzen.", "У меня болит голова уже три дня."),
                    ("seit kurzem", "", "с недавних пор", "[зайт ку́рцэм]", "Seit kurzem fühle ich mich viel sicherer.", "С недавних пор я чувствую себя гораздо увереннее."),
                    ("seit wann", "", "с каких пор / как долго", "[зайт ван]", "Seit wann lernen Sie die Sprache?", "С каких пор Вы учите язык?"),
                    ("seit gestern", "", "со вчерашнего дня", "[зайт гэ́стэрн]", "Seit gestern ist das Wetter wieder schön.", "Со вчерашнего дня погода снова прекрасная."),
                    ("seit heute Morgen", "", "с сегодняшнего утра", "[зайт хо́йтэ мо́ргэн]", "Ich bin seit heute Morgen fleißig am Lernen.", "Я с сегодняшнего утра прилежно учусь.")
                ],
                "dialogue": {
                    "situation": "Врач или чиновник спрашивает, как давно длится ситуация.",
                    "example": "Ich habe die Erkältung leider schon seit vier Tagen.",
                    "tips": "После 'seit' глагол ставится в настоящее время (Präsens), так как действие все еще продолжается!"
                }
            },
            39: {
                "title": "День 39: Предлоги aus (из) и von (от/с)",
                "grammar": "aus — происхождение из страны/города или выход из помещения. von — от человека или поверхности.",
                "vocab": [
                    ("aus der Ukraine", "", "из Украины", "[аус дэр украи́нэ]", "Ich komme gebürtig aus der Ukraine.", "Я родом из Украины."),
                    ("aus Deutschland", "", "из Германии", "[аус до́йчланд]", "Der Brief kommt direkt aus Deutschland.", "Письмо пришло прямо из Германии."),
                    ("vom Arzt", "", "от врача (von + dem)", "[фом артцт]", "Ich komme gerade frisch vom Arzt.", "Я только что иду от врача."),
                    ("von der Arbeit", "", "с работы", "[фон дэр а́рбайт]", "Roman kommt um 18 Uhr von der Arbeit.", "Роман приходит с работы в 18 часов."),
                    ("aus dem Haus", "", "из дома", "[аус дэм хаус]", "Ich gehe morgens aus dem Haus.", "Я выхожу утром из дома."),
                    ("von Herzen", "", "от всего сердца", "[фон хэ́рцэн]", "Ich gratuliere dir von ganzem Herzen.", "Я поздравляю тебя от всего сердца."),
                    ("aus Erfahrung", "", "по опыту", "[аус эрфа́рунг]", "Ich weiß das aus eigener Erfahrung.", "Я знаю это по собственному опыту."),
                    ("von mir aus", "", "по мне / с моей стороны", "[фон мир аус]", "Von mir aus können wir gerne starten.", "Что касается меня, мы с удовольствием можем начинать.")
                ],
                "dialogue": {
                    "situation": "Знакомство: рассказ о происхождении и текущих делах.",
                    "example": "Ich komme aus der Ukraine und lebe jetzt glücklich hier.",
                    "tips": "Обратите внимание: Украина в немецком идет с артиклем: 'aus der Ukraine'."
                }
            },
            40: {
                "title": "День 40: Предлог nach (после чего-то / направление в города и страны)",
                "grammar": "nach dem Essen (после еды), nach der Arbeit (после работы), nach Berlin (в Берлин).",
                "vocab": [
                    ("nach der Arbeit", "", "после работы", "[нах дэр а́рбайт]", "Nach der Arbeit machen wir einen Spaziergang.", "После работы мы идем на прогулку."),
                    ("nach dem Essen", "", "после еды", "[нах дэм э́сэн]", "Trinken Sie die Tablette bitte nach dem Essen.", "Принимайте таблетку после еды."),
                    ("nach dem Kurs", "", "после языкового курса", "[нах дэм курс]", "Nach dem Kurs trinke ich einen Kaffee.", "После курса я выпью кофе."),
                    ("nach Hause", "", "домой", "[нах ха́узэ]", "Wann fährst du nach Hause?", "Когда ты едешь домой?"),
                    ("nach Deutschland", "", "в Германию", "[нах до́йчланд]", "Ich bin letztes Jahr nach Deutschland gekommen.", "Я приехала в Германию в прошлом году."),
                    ("nach vorne", "", "вперед", "[нах фо́рнэ]", "Schauen Sie bitte nach vorne.", "Посмотрите, пожалуйста, вперед."),
                    ("nach links / rechts", "", "налево / направо", "[нах линкс / рэхтс]", "Biegen Sie an der Kreuzung nach rechts ab.", "Поверните на перекрестке направо."),
                    ("Meiner Meinung nach", "", "по моему мнению", "[ма́йнэр ма́йнунг нах]", "Meiner Meinung nach machst du tolle Fortschritte.", "По моему мнению, ты делаешь отличные успехи.")
                ],
                "dialogue": {
                    "situation": "Планирование вечера после занятий.",
                    "example": "Treffen wir uns direkt nach dem Sprachkurs im Café?",
                    "tips": "Идиома 'Meiner Meinung nach' ставит предлог 'nach' после существительного!"
                }
            }
        }
    }
}

# Генератор тем для всех остальных разделов (Unit 9 до Unit 36)
CURRICULUM_ROADMAP = {
    9: {
        "title": "Unit 9: Wechselpräpositionen: покой (Dativ) против движения (Akkusativ)",
        "guidebook": {
            "title": "Справочник: 9 двуличных предлогов (Wechselpräpositionen)",
            "grammar_summary": "an, auf, hinter, in, neben, über, unter, vor, zwischen.\nВопрос 'Wo?' (Где? Покой) -> DATIV (der Tisch -> auf dem Tisch).\nВопрос 'Wohin?' (Куда? Движение) -> AKKUSATIV (den Tisch -> auf den Tisch).",
            "tips": "Представьте стрелку: если предмет перемещается (куда?) — это Akkusativ. Если он уже спокойно лежит/стоит на месте — это Dativ.",
            "key_phrases": [
                "Das Buch liegt auf dem Tisch. (Книга лежит на столе — Dativ)",
                "Ich lege das Buch auf den Tisch. (Я кладу книгу на стол — Akkusativ)",
                "Ich bin in der Küche. (Я на кухне — Dativ)",
                "Ich gehe in die Küche. (Я иду на кухню — Akkusativ)"
            ]
        },
        "days": {
            41: ("День 41: Предлог auf (на горизонтальной поверхности)", "Wo? auf dem / Wohin? auf den", [
                ("auf dem Tisch", "", "на столе (где)", "[ауф дэм тиш]", "Das Handy liegt auf dem Tisch.", "Телефон лежит на столе."),
                ("auf den Tisch", "", "на стол (куда)", "[ауф дэн тиш]", "Ich lege die Schlüssel auf den Tisch.", "Я кладу ключи на стол."),
                ("auf dem Sofa", "", "на диване", "[ауф дэм зо́фа]", "Ich sitze gemütlich auf dem Sofa.", "Я уютно сижу на диване."),
                ("auf die Straße", "", "на улицу", "[ауф ди штра́сэ]", "Wir gehen kurz auf die Straße.", "Мы выйдем ненадолго на улицу."),
                ("liegen", "", "лежать (покой)", "[ли́гэн]", "Die Dokumente liegen im Ordner.", "Документы лежат в папке."),
                ("legen", "", "класть (действие)", "[лэ́йгэн]", "Ich lege den Ausweis hierhin.", "Я положу удостоверение сюда."),
                ("sitzen", "", "сидеть", "[зи́цэн]", "Ich sitze auf dem Stuhl.", "Я сижу на стуле."),
                ("setzen", "", "сажать / садиться", "[зэ́цэн]", "Ich setze mich auf den Sessel.", "Я сажусь в кресло.")
            ], "Вы раскладываете документы на столе.", "Ich lege die wichtigen Unterlagen ordentlich auf den Tisch.", "Помните пару: liegen (лежать, Dativ) и legen (класть, Akkusativ)."),
            42: ("День 42: Предлог in (внутри помещения или пространства)", "in dem = im (где?) / in das = ins (куда?)", [
                ("im Zimmer", "", "в комнате (где)", "[им ци́мэр]", "Es ist sehr ruhig im Zimmer.", "В комнате очень тихо."),
                ("ins Zimmer", "", "в комнату (куда)", "[инс ци́мэр]", "Kommen Sie bitte ins Zimmer herein.", "Входите, пожалуйста, в комнату."),
                ("in der Stadt", "", "в городе", "[ин дэр штат]", "Ich bin heute den ganzen Tag in der Stadt.", "Я сегодня целый день в городе."),
                ("in die Stadt", "", "в город (поехать)", "[ин ди штат]", "Fahren wir am Samstag in die Stadt?", "Поедем в субботу в город?"),
                ("im Supermarkt", "", "в супермаркете", "[им зу́пэрмаркт]", "Ich bin gerade im Supermarkt an der Kasse.", "Я сейчас в супермаркете на кассе."),
                ("in die Küche", "", "на кухню (куда)", "[ин ди кю́хэ]", "Ich gehe kurz in die Küche.", "Я ненадолго отойду на кухню."),
                ("in der Küche", "", "на кухне (где)", "[ин дэр кю́хэ]", "Roman kocht Kaffee in der Küche.", "Роман варит кофе на кухне."),
                ("im Büro", "", "в офисе / кабинете", "[им бюро́]", "Der Termin findet im Büro statt.", "Встреча проходит в кабинете.")
            ], "Вас спрашивают по телефону, где вы находитесь.", "Ich bin gerade noch im Supermarkt und komme gleich nach Hause.", "Слияния: in + dem = im, in + das = ins."),
            43: ("День 43: Предлоги vor (перед) и hinter (позади)", "vor dem Haus / hinter dem Haus", [
                ("vor dem Haus", "", "перед домом", "[фор дэм хаус]", "Wir treffen uns vor dem Haus.", "Мы встретимся перед домом."),
                ("vor der Tür", "", "перед дверью / у дверей", "[фор дэр тюр]", "Der Postbote steht vor der Tür.", "Почтальон стоит перед дверью."),
                ("hinter dem Haus", "", "за домом / позади дома", "[хи́нтэр дэм хаус]", "Hinter dem Haus ist ein schöner Garten.", "За домом находится красивый сад."),
                ("vor dem Termin", "", "до / перед встречей", "[фор дэм тэрми́н]", "Ich bin etwas aufgeregt vor dem Termin.", "Я немного волнуюсь перед термином."),
                ("sich stellen", "", "становиться (куда)", "[зихь штэ́лэн]", "Ich stelle mich vor den Spiegel.", "Я становлюсь перед зеркалом."),
                ("stehen", "", "стоять (где)", "[штэ́эн]", "Das Auto steht hinter dem Gebäude.", "Машина стоит за зданием."),
                ("vor kurzem", "", "недавно", "[фор ку́рцэм]", "Wir sind vor kurzem umgezogen.", "Мы недавно переехали."),
                ("vor allem", "", "прежде всего", "[фор а́лэм]", "Das Wichtigste ist vor allem die Ruhe.", "Самое важное — прежде всего спокойствие.")
            ], "Встреча курьера возле дома.", "Ich warte bereits draußen direkt vor der Haustür auf Sie.", "vor + Dativ может означать как место (перед домом), так и время (до встречи)."),
            44: ("День 44: Предлоги an (у вертикальной поверхности) и neben (рядом)", "am Bahnhof / an der Wand", [
                ("an der Wand", "", "на стене", "[ан дэр вант]", "Das Bild hängt an der Wand.", "Картина висит на стене."),
                ("an die Wand", "", "на стену", "[ан ди вант]", "Ich hänge das Foto an die Wand.", "Я вешаю фотографию на стену."),
                ("am Fenster", "", "у окна (an + dem)", "[ам фэ́нстэр]", "Ich sitze gerne am Fenster und lese.", "Я люблю сидеть у окна и читать."),
                ("am Bahnhof", "", "на вокзале", "[ам ба́нхоф]", "Wir sehen uns morgen am Hauptbahnhof.", "Увидимся завтра на главном вокзале."),
                ("neben mir", "", "рядом со мной", "[нэ́йбэн мир]", "Setz dich gerne neben mich.", "Садись рядом со мной."),
                ("neben der Apotheke", "", "рядом с аптекой", "[нэ́йбэн дэр апотэ́йкэ]", "Die Bäckerei liegt direkt neben der Apotheke.", "Булочная находится прямо рядом с аптекой."),
                ("hängen", "", "висеть / вешать", "[хэ́нгэн]", "Die Jacke hängt an der Garderobe.", "Куртка висит на вешалке."),
                ("an der Ecke", "", "на углу", "[ан дэр э́кэ]", "Die Haltestelle ist gleich an der Ecke.", "Остановка прямо на углу.")
            ], "Ориентирование на улице рядом с ориентиром.", "Die Praxis befindet sich direkt neben der großen Apotheke.", "an + dem = am (am Bahnhof, am Fenster, am Montag)."),
            45: ("День 45: Предлоги unter (под), über (над) и zwischen (между)", "unter dem Tisch / zwischen den Stühlen", [
                ("unter dem Tisch", "", "под столом", "[у́нтэр дэм тиш]", "Der Kater schläft unter dem Tisch.", "Кот спит под столом."),
                ("über dem Sofa", "", "над диваном", "[ю́бэр дэм зо́фа]", "Die Lampe hängt über dem Tisch.", "Лампа висит над столом."),
                ("zwischen uns", "", "между нами", "[цви́шэн унс]", "Es gibt volles Vertrauen zwischen uns.", "Между нами полное доверие."),
                ("zwischen zwei Terminen", "", "между двумя записями", "[цви́шэн цвай тэрми́нэн]", "Ich habe eine Pause zwischen den Terminen.", "У меня перерыв между записями."),
                ("über die Brücke", "", "через мост", "[ю́бэр ди брю́кэ]", "Wir gehen zu Fuß über die Brücke.", "Мы идем пешком через мост."),
                ("unter der Dusche", "", "под душем", "[у́нтэр дэр ду́шэ]", "Eine warme Dusche entspannt wunderbar.", "Теплый душ прекрасно расслабляет."),
                ("das Geheimnis", "das", "секрет", "[дас гэха́ймнис]", "Das bleibt unter uns beiden.", "Это останется между нами двумя."),
                ("die Brücke", "die", "мост", "[ди брю́кэ]", "Die Brücke verbindet zwei Stadtteile.", "Мост соединяет две части города.")
            ], "Объяснение, где лежит упавший предмет.", "Der Kugelschreiber ist unter den Schreibtisch gefallen.", "Если предмет падает (куда?) — это Akkusativ ('unter den Tisch')."),
        }
    },
    10: {
        "title": "Unit 10: Bürgeramt: Регистрация по месту жительства (Anmeldung)",
        "guidebook": {
            "title": "Справочник: Bürgeramt — регистрация по месту жительства",
            "grammar_summary": "В Германии в течение 14 дней после въезда в жилье обязательна Anmeldung.\nГлавные документы:\n1. Der Personalausweis / Reisepass (загранпаспорт)\n2. Die Wohnungsgeberbestätigung (справка от арендодателя)\n3. Das Anmeldeformular (бланк заявления).",
            "tips": "Всегда берите распечатанное подтверждение записи (Terminbestätigung). В ведомстве говорите спокойно и вежливо: 'Ich habe einen Termin um 10 Uhr zur Anmeldung'.",
            "key_phrases": [
                "Ich habe einen Termin zur Wohnsitzanmeldung. (У меня запись на регистрацию)",
                "Hier sind mein Pass und die Wohnungsgeberbestätigung. (Вот мой паспорт и справка арендодателя)",
                "Muss ich hier unterschreiben? (Мне нужно здесь подписать?)",
                "Vielen Dank für die Meldebestätigung! (Большое спасибо за подтверждение регистрации!)"
            ]
        },
        "days": {
            46: ("День 46: Запись на прием в Bürgeramt (Terminbuchung)", "Termin vereinbaren, Wartenummer, Anliegen", [
                ("das Bürgeramt", "das", "ведомство по делам граждан", "[дас бю́ргэрамт]", "Ich gehe morgen früh zum Bürgeramt.", "Я иду завтра утром в Бюргер-амт."),
                ("die Anmeldung", "die", "регистрация / прописка", "[ди а́нмэльдунг]", "Ich brauche einen Termin zur Anmeldung.", "Мне нужна запись на регистрацию."),
                ("die Wohnsitzanmeldung", "die", "регистрация по месту жительства", "[ди во́нзицанмэльдунг]", "Die Wohnsitzanmeldung ist in Deutschland Pflicht.", "Регистрация по месту жительства обязательна в Германии."),
                ("die Wartenummer", "die", "номер электронной очереди", "[ди ва́ртэнумэр]", "Meine Wartenummer wird gleich aufgerufen.", "Мой номер очереди сейчас вызовут."),
                ("das Anliegen", "das", "вопрос / цель обращения", "[дас а́нлигэн]", "Was ist Ihr Anliegen heute?", "Какова цель Вашего визита сегодня?"),
                ("aufrufen", "", "вызывать (по номеру)", "[а́уфруфэн]", "Nummer 42 wird an Schalter 3 aufgerufen.", "Номер 42 вызывают к окну 3."),
                ("der Schalter", "der", "окно обслуживания / стойка", "[дэр ша́льтэр]", "Gehen Sie bitte zu Schalter Nummer vier.", "Пройдите, пожалуйста, к окну номер 4."),
                ("die Terminbestätigung", "die", "подтверждение записи", "[ди тэрми́нбэштэтигунг]", "Ich habe die Terminbestätigung auf dem Handy.", "У меня подтверждение записи в телефоне.")
            ], "Вход в Bürgeramt: вы подходите к стойке регистрации.", "Guten Tag, ich habe einen Termin um 10 Uhr zur Anmeldung. Hier ist mein Ticket.", "В ведомствах Германии всегда первым делом называют время записи и цель."),
            47: ("День 47: Документы для регистрации", "Reisepass, Wohnungsgeberbestätigung, Formular", [
                ("der Reisepass", "der", "заграничный паспорт", "[дэр ра́йзэпас]", "Hier ist mein gültiger Reisepass.", "Вот мой действующий загранпаспорт."),
                ("die Wohnungsgeberbestätigung", "die", "справка от арендодателя о вселении", "[ди во́нунгсгэйбэрбэштэтигунг]", "Der Vermieter hat das Formular unterschrieben.", "Арендодатель подписал этот бланк."),
                ("der Vermieter", "der", "арендодатель", "[дэр фэрми́тэр]", "Mein Vermieter ist sehr hilfsbereit.", "Мой арендодатель очень готов помочь."),
                ("das Formular", "das", "бланк / анкета", "[дас формуля́р]", "Ich habe das Formular online ausgefüllt.", "Я заполнила бланк онлайн."),
                ("ausfüllen", "", "заполнять (документ)", "[а́усфюлен]", "Muss ich dieses Feld auch ausfüllen?", "Нужно ли мне заполнять и это поле?"),
                ("unterschreiben", "", "подписывать", "[унтэршра́йбэн]", "Wo soll ich bitte unterschreiben?", "Где мне, пожалуйста, расписаться?"),
                ("die Unterschrift", "die", "подпись", "[ди у́нтэршрифт]", "Hier fehlt noch Ihre Unterschrift.", "Здесь еще нужна Ваша подпись."),
                ("das Dokument", "das", "документ", "[дас докумэ́нт]", "Sind alle Dokumente vollständig?", "Все ли документы в полном комплекте?")
            ], "Сотрудник просит предоставить подтверждение от арендодателя.", "Hier ist die originale Wohnungsgeberbestätigung von meinem Vermieter.", "Без Wohnungsgeberbestätigung в Германии прописку не оформят!"),
            48: ("День 48: Личные данные и семейное положение", "Familienstand, Geburtsdatum, Religion", [
                ("der Familienstand", "der", "семейное положение", "[дэр фами́лиэнштант]", "Mein Familienstand ist verheiratet.", "Мое семейное положение — замужем."),
                ("verheiratet", "", "женат / замужем", "[фэрха́йратэт]", "Ich bin mit Roman verheiratet.", "Я замужем за Романом."),
                ("das Geburtsdatum", "das", "дата рождения", "[дас гэбу́ртсдатум]", "Mein Geburtsdatum ist der 25. September.", "Моя дата рождения — 25 сентября."),
                ("der Geburtsort", "der", "место рождения", "[дэр гэбу́ртсорт]", "Mein Geburtsort liegt in der Ukraine.", "Мое место рождения находится в Украине."),
                ("die Staatsangehörigkeit", "die", "гражданство", "[ди шта́тсангэхёригкайт]", "Meine Staatsangehörigkeit ist ukrainisch.", "Мое гражданство — украинское."),
                ("die Heiratsurkunde", "die", "свидетельство о браке", "[ди ха́йратсуркундэ]", "Hier ist unsere übersetzte Heiratsurkunde.", "Вот наше переведенное свидетельство о браке."),
                ("die Religion", "die", "вероисповедание (для налога)", "[ди рэлигио́н]", "Keine Religionszugehörigkeit angeben.", "Не указывать религиозную принадлежность (без церковного налога)."),
                ("der Ehemann", "der", "муж", "[дэр э́эман]", "Mein Ehemann heißt Roman.", "Моего мужа зовут Роман.")
            ], "Чиновник уточняет семейное положение.", "Ich bin verheiratet und lebe hier zusammen mit meinem Ehemann.", "Указание религии влияет на церковный налог (Kirchensteuer 8-9%)."),
            49: ("День 49: Получение Meldebestätigung и Steuer-ID", "Meldebestätigung, Steueridentifikationsnummer", [
                ("die Meldebestätigung", "die", "справка о регистрации по адресу", "[ди мэ́льдэбэштэтигунг]", "Bewahren Sie die Meldebestätigung gut auf.", "Храните справку о регистрации бережно."),
                ("die Steuer-ID", "die", "индивидуальный налоговый номер", "[ди што́йэр-айди]", "Die Steuer-ID kommt per Post nach Hause.", "Налоговый номер придет по почте домой."),
                ("per Post", "", "по почте (письмом)", "[пэр пост]", "Der Brief kommt in etwa zwei Wochen per Post.", "Письмо придет по почте примерно через 2 недели."),
                ("der Briefkasten", "der", "почтовый ящик", "[дэр бри́фкастэн]", "Ihr Name muss deutlich am Briefkasten stehen.", "Ваша фамилия должна четко висеть на почтовом ящике."),
                ("die Gebühr", "die", "госпошлина / сбор", "[ди гэбю́р]", "Die Anmeldung ist gebührenfrei.", "Регистрация бесплатна."),
                ("das Original", "das", "оригинал", "[дас оригина́ль]", "Hier ist das gestempelte Original.", "Вот оригинал с печатью."),
                ("der Stempel", "der", "печать / штамп", "[дэр штэ́мпэль]", "Das Dokument hat einen offiziellen Stempel.", "На документе стоит официальная печать."),
                ("herzlichen Dank", "", "сердечное спасибо", "[хэ́рцлихэн данк]", "Herzlichen Dank für Ihre freundliche Hilfe!", "Сердечное спасибо за Вашу доброжелательную помощь!")
            ], "Чиновник выдает готовую прописку.", "Vielen Dank! Wann kann ich mit der Steuer-ID im Briefkasten rechnen?", "Обязательно наклейте свою фамилию на почтовый ящик, иначе письма вернутся отправителю!"),
            50: ("День 50: Ролевая игра: Полный диалог в Bürgeramt", "Ситуация от А до Я", [
                ("Guten Tag, ich habe einen Termin.", "", "Добрый день, у меня запись.", "[гутэн так, их хабэ айнэн тэрмин]", "Guten Tag, mein Termin ist um 10 Uhr.", "Добрый день, моя запись на 10 часов."),
                ("Alles ist vollständig.", "", "Все в полном комплекте.", "[а́лэс ист фо́льштэндих]", "Alle Unterlagen sind vollständig vorhanden.", "Все документы в наличии в полном комплекте."),
                ("Dauert das lange?", "", "Это займет много времени?", "[да́уэрт дас ла́нгэ]", "Das dauert nur etwa zehn Minuten.", "Это займет всего около 10 минут."),
                ("Können Sie das bestätigen?", "", "Можете ли Вы это подтвердить?", "[кё́нэн зи дас бэштэ́тигэн]", "Können Sie mir das bitte schriftlich bestätigen?", "Можете ли Вы подтвердить мне это письменно?"),
                ("Ich habe alles verstanden.", "", "Я все поняла.", "[их хабэ а́лэс фэршта́ндэн]", "Vielen Dank, ich habe alles bestens verstanden.", "Большое спасибо, я все отлично поняла."),
                ("Einen schönen Tag noch!", "", "Хорошего дня!", "[а́йнэн шё́нэн так нох]", "Ich wünsche Ihnen noch einen schönen Tag!", "Я желаю Вам еще хорошего дня!"),
                ("Auf Wiedersehen!", "", "До свидания!", "[ауф ви́дэрзеен]", "Auf Wiedersehen und danke nochmals!", "До свидания и еще раз спасибо!"),
                ("die Erleichterung", "die", "облегчение / радость", "[ди эрля́йхтэрунг]", "Das ist eine große Erleichterung für mich.", "Это огромное облегчение для меня.")
            ], "Завершение визита в Bürgeramt.", "Herzlichen Dank für Ihre Hilfe. Einen wunderschönen Tag noch!", "Доброжелательность и фраза 'Einen schönen Tag noch' располагают сотрудников ведомств.")
        }
    }
}

def get_unit_blueprint(unit_id: int):
    """Возвращает структурированный блок для каждого из юнитов 11-36"""
    blueprints = {
        11: {
            "title": "Unit 11: Визит к врачу: Симптомы и запись на прием",
            "guidebook": {
                "title": "Справочник: Визит к врачу (Beim Arzt)",
                "grammar_summary": "Симптомы выражаются конструкциями:\n1. 'Ich habe + Существительное в Akkusativ' (Ich habe Kopfschmerzen, Fieber, Husten).\n2. 'Mir tut + Часть тела в единственном числе + weh' (Mein Kopf tut weh).\n3. 'Mir tun + Во множественном числе + weh' (Meine Beine tun weh).\nБольничный лист называется die Krankschreibung или die Arbeitsunfähigkeitsbescheinigung (AU).",
                "tips": "При звонке в праксис говорите: 'Guten Tag, ich möchte einen Termin vereinbaren. Ich bin akut krank'. Слово 'akut' помогает получить прием день в день.",
                "key_phrases": [
                    "Ich brauche einen Termin bei der Ärztin. (Мне нужен термин у врача)",
                    "Ich habe seit drei Tagen hohes Fieber. (У меня уже 3 дня высокая температура)",
                    "Mein Hals tut sehr weh. (У меня сильно болит горло)",
                    "Ich brauche eine Krankschreibung für die Arbeit. (Мне нужен больничный для работы)"
                ]
            },
            "topics": [
                ("Запись к врачу по телефону", "der Termin, die Sprechstunde, akut", [
                    ("die Arztpraxis", "die", "кабинет врача / праксис", "[ди а́ртцтпраксис]", "Ich rufe in der Arztpraxis an.", "Я звоню во врачебный кабинет."),
                    ("die Sprechstunde", "die", "приемные часы", "[ди шпрэ́хьштундэ]", "Wann ist heute die offene Sprechstunde?", "Когда сегодня открытые часы приема?"),
                    ("akut krank", "", "остро болен / срочный случай", "[аку́т кранк]", "Ich bin akut krank und brauche heute Hilfe.", "Я остро заболела, и мне сегодня нужна помощь."),
                    ("die Versichertenkarte", "die", "карточка медицинского страхования", "[ди фэрзи́хьэртэнкартэ]", "Bringen Sie bitte Ihre Versichertenkarte mit.", "Принесите с собой медицинскую карточку."),
                    ("das Wartezimmer", "das", "комната ожидания", "[дас ва́ртэцимэр]", "Nehmen Sie bitte im Wartezimmer Platz.", "Присаживайтесь в комнате ожидания."),
                    ("einen Termin vereinbaren", "", "записаться на прием", "[айнэн тэрмин фэрайнбарэн]", "Ich möchte einen Termin für heute vereinbaren.", "Я хотела бы записаться на прием на сегодня."),
                    ("vorbeikommen", "", "подойти / зайти", "[форба́йкомэн]", "Sie können um 11 Uhr vorbeikommen.", "Вы можете подойти к 11 часам."),
                    ("die Beschwerden", "pl", "жалобы / симптомы", "[ди бэшвэ́рдэн]", "Welche Beschwerden haben Sie genau?", "Какие именно у Вас жалобы?")
                ], "Звонок в праксис для срочной записи.", "Guten Tag, mein Name ist Alina. Ich bin akut krank und brauche heute einen Termin.", "Фраза 'Ich bin akut krank' открывает двери даже при плотной записи."),
                ("Описание симптомов: боль и температура", "Schmerzen, Fieber, Erkältung", [
                    ("die Halsschmerzen", "pl", "боль в горле", "[ди ха́льсшмэрцэн]", "Ich habe starke Halsschmerzen beim Schlucken.", "У меня сильная боль в горле при глотании."),
                    ("das Fieber", "das", "температура / жар", "[дас фи́бэр]", "Ich habe 38,5 Grad Fieber.", "У меня температура 38,5 градусов."),
                    ("der Husten", "der", "кашель", "[дэр ху́стэн]", "Der Husten stört mich besonders nachts.", "Кашель мешает мне особенно ночью."),
                    ("der Schnupfen", "der", "насморк", "[дэр шну́пфэн]", "Ich habe starken Schnupfen und Schnupfennase.", "У меня сильный насморк."),
                    ("die Kopfschmerzen", "pl", "головная боль", "[ди ко́пфшмэрцэн]", "Gegen die Kopfschmerzen nehme ich Schmerzmittel.", "От головной боли я принимаю обезболивающее."),
                    ("weh tun", "", "болеть / причинять боль", "[вэй тун]", "Mein Rücken tut seit gestern weh.", "Моя спина болит со вчерашнего дня."),
                    ("schwindelig", "", "головокружение", "[шви́ндэлих]", "Mir ist ein wenig schwindelig.", "У меня немного кружится голова."),
                    ("die Übelkeit", "die", "тошнота", "[ди ю́бэлкайт]", "Ich leide seit morgens unter Übelkeit.", "С утра меня тошнит.")
                ], "Вы описываете врачу, что именно у вас болит.", "Mir tut der Hals weh und ich habe seit gestern Fieber.", "Используйте: 'Mir tut [что-то] weh' для точного указания очага боли."),
                ("Осмотр у врача и вопросы доктора", "die Untersuchung, tief einatmen", [
                    ("die Untersuchung", "die", "осмотр / обследование", "[ди унтэрзу́хунг]", "Die Ärztin beginnt mit der Untersuchung.", "Врач начинает осмотр."),
                    ("einatmen", "", "вдыхать", "[а́йнатмэн]", "Atmen Sie bitte tief durch den Mund ein.", "Вдохните глубоко через рот, пожалуйста."),
                    ("ausatmen", "", "выдыхать", "[а́усатмэн]", "Und jetzt bitte langsam ausatmen.", "И теперь медленно выдохните."),
                    ("den Mund aufmachen", "", "открыть рот", "[дэн мунт а́уфмахэн]", "Machen Sie bitte den Mund ganz weit auf.", "Откройте, пожалуйста, рот пошире."),
                    ("den Blutdruck messen", "", "измерять давление", "[дэн блу́тдрук мэ́сэн]", "Wir messen kurz Ihren Blutdruck.", "Мы быстро измерим Ваше давление."),
                    ("die Allergie", "die", "аллергия", "[ди алерги́]", "Haben Sie Allergien gegen Medikamente?", "У Вас есть аллергия на лекарства?"),
                    ("die Entzündung", "die", "воспаление", "[ди энтцю́ндунг]", "Im Hals ist eine leichte Entzündung zu sehen.", "В горле видно легкое воспаление."),
                    ("sich ausziehen", "", "раздеваться (для осмотра)", "[зихь а́усциэн]", "Machen Sie bitte den Oberkörper frei.", "Освободите, пожалуйста, верхнюю часть тела.")
                ], "Врач слушает ваши легкие стетоскопом.", "Ich atme tief ein und wieder aus, danke Frau Doktor.", "Врачи часто говорят: 'Machen Sie bitte den Oberkörper frei' (снимите кофту)."),
                ("Диагноз и назначения врача", "die Diagnose, die Bettruhe, viel trinken", [
                    ("die Diagnose", "die", "диагноз", "[ди диагно́зэ]", "Die Diagnose lautet akute Erkältung.", "Диагноз — острая простуда."),
                    ("die Erkältung", "die", "простуда", "[ди эркэ́льтунг]", "Eine Erkältung braucht vor allem Ruhe.", "Простуда требует прежде всего покоя."),
                    ("die Bettruhe", "die", "постельный режим", "[ди бэ́труэ]", "Ich verordne Ihnen drei Tage Bettruhe.", "Я предписываю Вам 3 дня постельного режима."),
                    ("viel trinken", "", "много пить (жидкости)", "[филь три́нкэн]", "Trinken Sie viel warmen Kräutertee.", "Пейте много теплого травяного чая."),
                    ("das Rezept", "das", "рецепт на лекарства", "[дас рэцэ́пт]", "Ich schreibe Ihnen ein Rezept auf.", "Я выпишу Вам рецепт."),
                    ("die Besserung", "die", "улучшение / выздоровление", "[ди бэ́сэрунг]", "Gute Besserung von ganzem Herzen!", "Скорейшего выздоровления от всей души!"),
                    ("die Schonung", "die", "щадящий режим / покой", "[ди шо́нунг]", "Körperliche Schonung ist jetzt das Beste.", "Физический покой сейчас самое лучшее."),
                    ("wiederkommen", "", "прийти снова", "[ви́дэркомэн]", "Kommen Sie am Freitag zur Kontrolle wieder.", "Приходите в пятницу на контрольный осмотр.")
                ], "Доктор дает советы по выздоровлению.", "Vielen Dank Frau Doktor, ich werde mich ins Bett legen und viel Tee trinken.", "'Gute Besserung' — стандартное и теплое немецкое пожелание скорейшего выздоровления."),
                ("Больничный лист (Krankschreibung / AU)", "die Krankschreibung, elektronische AU (eAU)", [
                    ("die Krankschreibung", "die", "больничный лист", "[ди кра́нкшрайбунг]", "Ich brauche die Krankschreibung für fünf Tage.", "Мне нужен больничный лист на 5 дней."),
                    ("die Arbeitsunfähigkeit", "die", "нетрудоспособность", "[ди а́рбайтсунфэигкайт]", "Die Bescheinigung über die Arbeitsunfähigkeit ist fertig.", "Справка о нетрудоспособности готова."),
                    ("die Krankenkasse", "die", "больничная касса / страховая", "[ди кра́нкэнкасэ]", "Die eAU geht automatisch an die Krankenkasse.", "Электронный больничный идет автоматически в кассу."),
                    ("der Arbeitgeber", "der", "работодатель", "[дэр а́рбайтгэйбэр]", "Ich informiere heute meinen Arbeitgeber.", "Я проинформирую сегодня своего работодателя."),
                    ("bescheidgeben", "", "сообщить / поставить в известность", "[бэша́йтгэйбэн]", "Ich habe in der Firma sofort Bescheid gegeben.", "Я сразу же сообщила на фирму."),
                    ("die Genesung", "die", "выздоровление", "[ди гэнейзунг]", "Ich wünsche Ihnen eine schnelle Genesung.", "Желаю Вам быстрого выздоровления."),
                    ("gesundschreiben", "", "выписать (признать здоровым)", "[гэзу́нтшрайбэн]", "Ab Montag bin ich wieder voll einsatzbereit.", "С понедельника я снова полностью готова к работе."),
                    ("arbeitsunfähig", "", "нетрудоспособен", "[а́рбайтсунфэих]", "Sie sind bis einschließlich Freitag arbeitsunfähig.", "Вы нетрудоспособны по пятницу включительно.")
                ], "Вы просите оформить больничный лист.", "Können Sie mich bitte bis Freitag krankschreiben?", "Сейчас в Германии действует eAU — данные передаются работодателю в электронном виде.")
            ]
        },
        12: {
            "title": "Unit 12: Аптека: Рецепты и лекарства",
            "guidebook": {
                "title": "Справочник: В немецкой аптеке (In der Apotheke)",
                "grammar_summary": "В Германии лекарства делятся на:\n1. rezeptfrei (без рецепта) — от насморка, легкие обезболивающие.\n2. rezeptpflichtig (строго по рецепту) — антибиотики, сильные препараты.\nРецепты бывают:\n- Розовый / электронный (E-Rezept) — покрывается страховой (Zuzahlung 5-10€).\n- Зеленый — рекомендация врача (оплачивается самостоятельно).",
                "tips": "Приходите в аптеку с карточкой Krankenkasse — электронный рецепт считывается прямо с чипа карточки!",
                "key_phrases": [
                    "Ich habe ein Rezept von meiner Ärztin. (У меня рецепт от врача)",
                    "Gibt es das Medikament auch rezeptfrei? (Есть ли это лекарство без рецепта?)",
                    "Wie oft am Tag soll ich die Tabletten nehmen? (Как часто в день принимать таблетки?)",
                    "Haben Sie etwas Pflanzliches gegen Husten? (У вас есть что-то растительное от кашля?)"
                ]
            },
            "topics": [
                ("Покупка в аптеке и E-Rezept", "die Apotheke, das E-Rezept, die Zuzahlung", [
                    ("die Apotheke", "die", "аптека", "[ди апотэ́йкэ]", "Die Apotheke an der Ecke hat Notdienst.", "Аптека на углу работает как дежурная."),
                    ("das E-Rezept", "das", "электронный рецепт", "[дас э-рэцэ́пт]", "Mein Rezept ist auf meiner Gesundheitskarte gespeichert.", "Мой рецепт сохранен на моей карте здоровья."),
                    ("die Zuzahlung", "die", "доплата пациента (обычно 5€)", "[ди цу́цалунг]", "Die gesetzliche Zuzahlung beträgt fünf Euro.", "Законная доплата составляет пять евро."),
                    ("rezeptpflichtig", "", "строго по рецепту", "[рэцэ́птпфлихьтих]", "Dieses Antibiotikum ist rezeptpflichtig.", "Этот антибиотик отпускается строго по рецепту."),
                    ("rezeptfrei", "", "без рецепта", "[рэцэ́птфрай]", "Gibt es diese Schmerztabletten rezeptfrei?", "Эти обезболивающие продаются без рецепта?"),
                    ("vorrätig", "", "в наличии (на складе аптеки)", "[фо́рэтих]", "Das Medikament ist leider nicht vorrätig.", "Препарата, к сожалению, нет в наличии."),
                    ("bestellen", "", "заказывать", "[бэштэ́лэн]", "Wir können das bis 15 Uhr für Sie bestellen.", "Мы можем заказать это для Вас до 15:00."),
                    ("abholen", "", "забирать", "[а́пхолэн]", "Ich hole das Medikament heute Nachmittag ab.", "Я заберу лекарство сегодня после обеда.")
                ], "Вы подаете страховую карточку фармацевту в аптеке.", "Guten Tag, auf meiner Karte ist ein E-Rezept gespeichert.", "Электронный рецепт активируется через несколько минут после визита к врачу."),
                ("Формы лекарств: таблетки, капли, мази", "die Tablette, der Saft, die Salbe, die Tropfen", [
                    ("die Tabletten", "pl", "таблетки", "[ди таблэ́тэн]", "Nehmen Sie zwei Tabletten täglich.", "Принимайте две таблетки ежедневно."),
                    ("der Hustensaft", "der", "сироп от кашля", "[дэр ху́стэнзафт]", "Der Saft schmeckt angenehm nach Kräutern.", "Сироп приятно пахнет травами."),
                    ("die Nasentropfen", "pl", "капли в нос", "[ди на́зэнтропфэн]", "Die Tropfen helfen schnell bei Schnupfen.", "Капли быстро помогают при насморке."),
                    ("die Salbe", "die", "мазь", "[ди за́льбэ]", "Tragen Sie die Salbe dünn auf die Haut auf.", "Нанесите мазь тонким слоем на кожу."),
                    ("das Schmerzmittel", "das", "обезболивающее средство", "[дас шмэ́рцмитэль]", "Ibuprofen ist ein bekanntes Schmerzmittel.", "Ибупрофен — известное обезболивающее."),
                    ("die Halstabletten", "pl", "леденцы / таблетки для горла", "[ди ха́льстаблэтэн]", "Lutschtabletten lindern den Halsschmerz.", "Таблетки для рассасывания облегчают боль в горле."),
                    ("pflanzlich", "", "растительный / натуральный", "[пфла́нцлих]", "Ich bevorzuge pflanzliche Präparate.", "Я предпочитаю растительные препараты."),
                    ("die Packung", "die", "упаковка", "[ди па́кунг]", "Geben Sie mir bitte die kleine Packung.", "Дайте мне, пожалуйста, маленькую упаковку.")
                ], "Вы просите мягкое средство от боли в горле.", "Haben Sie gute pflanzliche Lutschtabletten gegen Halsschmerzen?", "'pflanzlich' — ключевое слово, если вы хотите натуральный препарат без химии."),
                ("Дозировка и правила приема лекарств", "vor dem Essen, mit Wasser, die Dosierung", [
                    ("die Dosierung", "die", "дозировка", "[ди дози́рунг]", "Beachten Sie genau die richtige Dosierung.", "Точно соблюдайте правильную дозировку."),
                    ("vor dem Essen", "", "до еды", "[фор дэм э́сэн]", "Bitte eine halbe Stunde vor dem Essen einnehmen.", "Пожалуйста, принимайте за полчаса до еды."),
                    ("nach dem Essen", "", "после еды", "[нах дэм э́сэн]", "Immer mit etwas Nahrung nach dem Essen nehmen.", "Всегда принимайте с пищей после еды."),
                    ("mit reichlich Wasser", "", "с большим количеством воды", "[мит ра́йхьлих ва́сэр]", "Schlucken Sie die Kapsel mit reichlich Wasser.", "Проглотите капсулу с большим количеством воды."),
                    ("einnehmen", "", "принимать внутрь (лекарство)", "[а́йннеймэн]", "Wie oft muss ich dieses Mittel einnehmen?", "Как часто мне нужно принимать это средство?"),
                    ("dreimal täglich", "", "трижды в день", "[дра́ймаль тэ́йклик]", "Nehmen Sie morgens, mittags und abends je eine Tablette.", "Принимайте утром, днем и вечером по одной таблетке."),
                    ("die Packungsbeilage", "die", "инструкция-вкладыш к лекарству", "[ди па́кунгсбайлагэ]", "Lesen Sie vor der Einnahme die Packungsbeilage.", "Прочтите перед приемом инструкцию."),
                    ("die Höchstdosis", "die", "максимальная доза", "[ди хё́хьстдозис]", "Die Höchstdosis darf nicht überschritten werden.", "Максимальную дозу нельзя превышать.")
                ], "Фармацевт объясняет вам правила приема препарата.", "Vielen Dank, ich nehme morgens und abends je eine Tablette nach dem Essen.", "Глагол 'einnehmen' — специальный медицинский глагол для приема медикаментов."),
                ("Побочные эффекты и совместимость", "die Nebenwirkungen, die Müdigkeit", [
                    ("die Nebenwirkungen", "pl", "побочные действия / эффекты", "[ди нэ́йбэнвиркунгэн]", "Verursacht dieses Mittel irgendwelche Nebenwirkungen?", "Вызывает ли это средство какие-либо побочные эффекты?"),
                    ("müde machen", "", "вызывать сонливость", "[мю́дэ ма́хэн]", "Diese Tabletten können etwas müde machen.", "Эти таблетки могут вызывать сонливость."),
                    ("Auto fahren", "", "водить машину", "[а́уто фа́рэн]", "Darf ich nach der Einnahme noch Auto fahren?", "Могу ли я после приема еще водить машину?"),
                    ("der Magen", "der", "желудок", "[дэр ма́гэн]", "Das Mittel ist sehr schonend für den Magen.", "Препарат очень щадящий для желудка."),
                    ("die Unverträglichkeit", "die", "непереносимость", "[ди у́нфэртрэйклихькайт]", "Ich habe eine leichte Laktose-Unverträglichkeit.", "У меня легкая непереносимость лактозы."),
                    ("die Wechselwirkung", "die", "взаимодействие с другими лекарствами", "[ди вэ́ксэльвиркунг]", "Gibt es Wechselwirkungen mit anderen Medikamenten?", "Есть ли взаимодействие с другими препаратами?"),
                    ("gut vertragen", "", "хорошо переносить", "[гут фэртра́гэн]", "Die meisten Patienten vertragen das sehr gut.", "Большинство пациентов переносят это очень хорошо."),
                    ("die Vorsicht", "die", "осторожность", "[ди фо́рзихьт]", "Hier ist etwas Vorsicht geboten.", "Здесь требуется некоторая осторожность.")
                ], "Вы уточняете у фармацевта вопрос о сонливости за рулем.", "Macht dieses Antiallergikum müde oder kann ich Auto fahren?", "Спрашивайте: 'Macht das müde?' при покупке средств от аллергии и простуды."),
                ("Аптечка первой помощи дома (Hausapotheke)", "das Pflaster, das Fieberthermometer", [
                    ("die Hausapotheke", "die", "домашняя аптечка", "[ди ха́усапотэ́йкэ]", "Eine gut sortierte Hausapotheke ist wichtig.", "Хорошо укомплектованная домашняя аптечка важна."),
                    ("das Pflaster", "das", "пластырь", "[дас пфла́стэр]", "Haben Sie wasserfeste Pflaster da?", "У вас есть водостойкие пластыри?"),
                    ("der Verband", "der", "бинт / повязка", "[дэр фэрба́нт]", "Wir wickeln einen sauberen Verband um den Arm.", "Мы наложим чистый бинт на руку."),
                    ("das Desinfektionsmittel", "das", "дезинфицирующее средство", "[дас дэзинфэкционсмитэль]", "Desinfizieren Sie die kleine Wunde zuerst.", "Продезинфицируйте сначала маленькую ранку."),
                    ("das Fieberthermometer", "das", "градусник / термометр", "[дас фи́бэртэрмомейтэр]", "Ein digitales Thermometer misst sehr genau.", "Цифровой градусник измеряет очень точно."),
                    ("die Notdienst-Apotheke", "die", "дежурная аптека (ночью/в выходные)", "[ди но́тдинст-апотэ́йкэ]", "Wo finde ich die nächste Notdienst-Apotheke?", "Где найти ближайшую дежурную аптеку?"),
                    ("die Schere", "die", "ножницы", "[ди ше́рэ]", "In der Notfallbox ist auch eine kleine Schere.", "В аптечке есть и маленькие ножницы."),
                    ("das Verfallsdatum", "das", "срок годности", "[дас фэрфа́льсдатум]", "Prüfen Sie regelmäßig das Verfallsdatum.", "Регулярно проверяйте срок годности медикаментов.")
                ], "Покупка базовых средств для домашней аптечки.", "Ich möchte meine Hausapotheke auffüllen: Pflaster, Schmerzmittel und Wundsalbe bitte.", "Ночные дежурные аптеки берут небольшую доплату (Notdienstgebühr ~2.50€).")
            ]
        }
    }
    return blueprints.get(unit_id)

def generate_dynamic_unit(unit_id: int):
    """Генерирует уникальный насыщенный контент для юнитов с 13 по 36"""
    THEMES = {
        13: ("Аренда квартиры в Германии: Объявления и термины", "Mietvertrag, Kaltmiete, Kaution, Nebenkosten", [
            ("Поиск жилья и объявления", ["die Wohnungssuche (поиск жилья)", "die Kaltmiete (чистая аренда)", "die Warmmiete (аренда с отоплением)", "die Kaution (залог 3 месяца)", "die Nebenkosten (коммуналка)", "die Einbauküche (встроенная кухня EBK)", "der Schnitt (планировка)", "die Wohnfläche (жилая площадь)"]),
            ("Осмотр квартиры (Besichtigung)", ["die Wohnungsbesichtigung (осмотр)", "der Vermieter (арендодатель)", "die Hausverwaltung (управляющая компания)", "hell und ruhig (светлая и тихая)", "der Balkon (балкон)", "das Badezimmer mit Fenster (ванная с окном)", "der Kellerraum (подвал)", "die Kaution überweisen (перевести залог)"]),
            ("Документы для аренды", ["die SCHUFA-Auskunft (кредитная история)", "die Gehaltsabrechnung (справка о зарплате)", "die Mieterselbstauskunft (анкета арендатора)", "der Personalausweis (удостоверение)", "die Mietschuldenfreiheitsbescheinigung (справка об отсутствии долгов)", "der Bürge (поручитель)", "die Kaution hinterlegen (внести залог)", "die Unterlagen einreichen (подать документы)"]),
            ("Договор аренды (Mietvertrag)", ["der Mietvertrag (договор аренды)", "die Kündigungsfrist (срок расторжения)", "die Hausordnung (правила дома)", "die Schönheitsreparaturen (косметический ремонт)", "die Tierhaltung (содержание животных)", "die Ruhestörung (нарушение покоя)", "die Schlüsselübergabe (передача ключей)", "unterschreiben (подписать)"]),
            ("Приемка квартиры и протокол", ["das Übergabeprotokoll (протокол передачи)", "der Zählerstand (показания счетчика)", "der Stromzähler (электросчетчик)", "die Mängel (недостатки/дефекты)", "die Schlüssel (ключи)", "das Schloss austauschen (заменить замок)", "einziehen (въезжать)", "das neue Zuhause (новый дом)"])
        ]),
        14: ("Соседи и правила дома (Hausordnung & Ruhezeit)", "Ruhezeit, Mülltrennung, Hausmeister, Treppenhaus", [
            ("Правила тишины и Ruhezeit", ["die Ruhezeit (время тишины 22-06)", "die Mittagsruhe (тихий час)", "die Hausordnung (правила дома)", "der Lärm (шум)", "leise sein (быть тихим)", "Rücksicht nehmen (проявлять уважение)", "die Musik leiser stellen (сделать музыку тише)", "die Nachbarn vorwarnen (предупредить соседей)"]),
            ("Разделение мусора (Mülltrennung)", ["die Mülltrennung (сортировка мусора)", "der Restmüll (несортируемый мусор)", "das Altpapier (макулатура)", "die Gelbe Tonne (пластик и упаковка)", "der Biomüll (биоотходы)", "das Altglas (стеклотара)", "der Pfand (залог за бутылки)", "die Mülltonne (мусорный бак)"]),
            ("Общие помещения и лестничная клетка", ["das Treppenhaus (подъезд)", "die Hausreinigung (уборка подъезда Kehrwoche)", "der Fahrradkeller (велосипедная комната)", "die Waschküche (постирочная)", "die Waschmaschine (стиральная машина)", "das Trocknen der Wäsche (сушка белья)", "der Flur (коридор)", "sauber halten (держать в чистоте)"]),
            ("Разговор с соседями и пакеты", ["der Nachbar (сосед)", "die Nachbarin (соседка)", "das Paket annehmen (принять посылку)", "die Klingel (звонок)", "vor die Tür stellen (поставить перед дверью)", "Bescheid sagen (дать знать)", "vielen Dank fürs Annehmen (спасибо за прием посылки)", "freundlich grüßen (приветливо здороваться)"]),
            ("Решение бытовых проблем и Hausmeister", ["der Hausmeister (управдом / завхоз)", "die Heizung entlüften (развоздушить батарею)", "das warme Wasser (горячая вода)", "der Rohrbruch (прорыв трубы)", "der Schimmel (плесень)", "das Fenster schließt nicht (окно не закрывается)", "reparieren lassen (отдать в ремонт)", "den Vermieter informieren (сообщить владельцу)"])
        ]),
        15: ("Jobcenter и интеграционные курсы", "Bürgergeld, Weiterbildung, BAMF, Sachbearbeiter", [
            ("Визит в Jobcenter", ["das Jobcenter (центр занятости)", "der Sachbearbeiter (куратор)", "die Kundennummer (номер клиента)", "der Termin (запись)", "die Unterlagen nachreichen (дослать документы)", "der Antrag (заявление)", "die Bewilligung (одобрение выплат)", "die Frist einhalten (соблюсти срок)"]),
            ("Интеграционный курс (BAMF)", ["der Integrationsкурс (интеграционный курс)", "das BAMF (миграционное ведомство)", "der Einstufungstest (вступительный тест)", "die Sprachschule (языковая школа)", "das Niveau B1 (уровень B1)", "der Orientierungskurs (ориентационный курс о Германии)", "das Zertifikat (сертификат)", "die Anwesenheit (посещаемость)"]),
            ("Пособия и расходы на жизнь", ["das Bürgergeld (базовое пособие)", "die Kosten der Unterkunft KdU (оплата жилья)", "der Heizkostenzuschuss (доплата за отопление)", "der Weiterbewilligungsantrag (продление пособия)", "das Bankkonto (банковский счет)", "der Bescheid (официальное решение)", "die Überweisung (перевод денег)", "die Unterstützung (поддержка)"]),
            ("Признание образования (Anerkennung)", ["die Anerkennung (признание диплома)", "das Diplom (диплом)", "die Zeugnisbewertung (оценка свидетельства)", "die Übersetzung (нотариальный перевод)", "der erlernte Beruf (освоенная профессия)", "die Berufserfahrung (опыт работы)", "die Fachkraft (квалифицированный специалист)", "die Chance (шанс/возможность)"]),
            ("Карьерная консультация и планы", ["die Berufsberatung (карьерная консультация)", "die Weiterbildung (повышение квалификации)", "das Praktikum (практика)", "der Lebenslauf (резюме)", "die Arbeitsstelle (рабочее место)", "der Minijob (подработка до 538€)", "die Teilzeitstelle (неполный рабочий день)", "die Vollzeitstelle (полная занятость)"])
        ]),
        16: ("Покупки и права потребителя: возврат и чек", "Kassenzettel, Umtausch, Reklamation, Garantie", [
            ("Покупки и оплата на кассе", ["der Kassenzettel (чек)", "die Kasse (касса)", "mit Karte zahlen (платить картой)", "bar bezahlen (платить наличными)", "die Quittung (квитанция)", "das Rückgeld (сдача)", "die Einkaufstasche (сумка для покупок)", "der Pfandbon (чек за сданные бутылки)"]),
            ("Возврат и обмен товара", ["der Umtausch (обмен)", "zurückgeben (вернуть)", "das Geld zurückbekommen (получить деньги обратно)", "die Frist von 14 Tagen (срок 14 дней)", "originalverpackt (в оригинальной упаковке)", "der Umtauschbon (чек на возврат)", "die Gutschrift (депозит/ваучер магазина)", "anprobieren (примерить одежду)"]),
            ("Рекламация дефектного товара", ["die Reklamation (претензия по качеству)", "der Mangel (дефект/брак)", "beschädigt (поврежденный)", "die Garantie (гарантия 2 года)", "die Reparatur (ремонт)", "das Ersatzgerät (устройство на замену)", "nicht funktionieren (не работать)", "sich beschweren (пожаловаться)"]),
            ("Покупки в интернете и доставка", ["die Online-Bestellung (онлайн-заказ)", "die Sendungsnummer (трек-номер)", "das Paket (посылка)", "der Rücksendeschein (бланк бесплатного возврата)", "die Packstation (почтомат DHL)", "die Retoure (возврат товара)", "die Lieferzeit (время доставки)", "der Kundenservice (служба поддержки)"]),
            ("Вежливый диалог на кассе и возврат", ["Ich möchte diesen Artikel reklamieren.", "Haben Sie den Kassenbon noch dabei?", "Das Gerät schaltet sich nicht mehr ein.", "Bekommen Sie das Geld auf die Karte zurück.", "Kann ich eine Nummer größer bekommen?", "Hier ist Ihre Quittung, danke!", "Es tut mir leid für die Unannehmlichkeiten.", "Einen schönen Tag und auf Wiedersehen!"])
        ]),
        17: ("Общественный транспорт Германии: DB, билеты, задержки", "Deutschlandticket, Bahnsteig, Verspätung, Umsteigen", [
            ("Deutschlandticket и билеты", ["das Deutschlandticket (билет 49€)", "die Fahrkarte (проездной билет)", "das Abonnement (подписка)", "die Monatskarte (месячный проездной)", "entwerten (компостировать билет)", "die Gültigkeit (срок действия)", "der Kontrolleur (контролер)", "die Schwarzfahrt vermeiden (избежать штрафа)"]),
            ("На вокзале: пути и расписание", ["der Hauptbahnhof (главный вокзал)", "der Bahnsteig (перрон / платформа)", "das Gleis (путь отправления)", "der Fahrplan (расписание)", "die Abfahrt (отправление)", "die Ankunft (прибытие)", "die Anzeige (информационное табло)", "die Durchsage (объявление по громкой связи)"]),
            ("Задержки и пересадки (Deutsche Bahn)", ["die Verspätung (задержка поезда)", "der Anschlusszug (пересадочный поезд)", "umsteigen (делать пересадку)", "den Zug verpassen (опоздать на поезд)", "die Ausfall (отмена рейса)", "der Schienenersatzverkehr (автобус вместо поезда SEV)", "die Entschädigung (компенсация за опоздание)", "die Geduld (терпение)"]),
            ("Городской транспорт: S-Bahn, U-Bahn, Tram", ["die S-Bahn (городская электричка)", "die U-Bahn (метро)", "die Straßenbahn (трамвай)", "die Haltestelle (остановка)", "die Richtung (направление)", "zurückbleiben bitte (отойдите от края платформы)", "die Tür schließt automatisch (дверь закрывается сама)", "der Sitzplatz (сидячее место)"]),
            ("Решение дорожных ситуаций", ["Hält dieser Zug in München Hbf?", "Auf welchem Gleis fährt die S-Bahn ab?", "Wir haben leider 20 Minuten Verspätung.", "Erreiche ich meinen Anschlusszug noch?", "Gibt es einen Schienenersatzverkehr?", "Zeigen Sie bitte Ihre Fahrkarten vor.", "Vielen Dank für Ihre Auskunft!", "Gute Reise und sichere Fahrt!"])
        ]),
        18: ("Сравнительная степень: gut -> besser -> am besten", "Komparativ, Superlativ, als, genauso wie", [
            ("Образование степеней сравнения", ["schnell - schneller - am schnellsten (быстрый)", "billig - billiger - am billigsten (дешевый)", "schön - schöner - am schönsten (красивый)", "einfach - einfacher - am einfachsten (простой)", "alt - älter - am ältesten (старый)", "groß - größer - am größten (большой)", "warm - wärmer - am wärmsten (теплый)", "kurz - kürzer - am kürzesten (короткий)"]),
            ("Исключения: gut, viel, gern", ["gut - besser - am besten (хороший - лучше)", "viel - mehr - am meisten (много - больше)", "gern - lieber - am liebsten (охотно - лучше)", "hoch - höher - am höchsten (высокий)", "nah - näher - am nächsten (близкий)", "Ich trinke lieber Tee als Kaffee.", "Deutsch wird von Tag zu Tag besser.", "Am liebsten verbringe ich Zeit mit dir."]),
            ("Сравнение: als (чем) против genauso wie (так же как)", ["besser als (лучше чем)", "schneller als (быстрее чем)", "genauso gut wie (так же хорошо как)", "so teuer wie (так же дорого как)", "nicht so einfach wie (не так просто как)", "größer als gedacht (больше чем думали)", "mehr Zeit als früher (больше времени чем раньше)", "der Unterschied (разница)"]),
            ("Сравнение в быту и покупках", ["Dieses Angebot ist deutlich günstiger.", "Die Bahn ist umweltfreundlicher als das Auto.", "Die zweite Wohnung ist viel heller.", "Hier fühle ich mich sicherer.", "Das Wetter heute ist wärmer als gestern.", "Der Supermarkt liegt näher an unserem Haus.", "Die Qualität ist viel höher.", "Die beste Entscheidung des Tages."]),
            ("Диалог: Выбор лучшего варианта", ["Welches Angebot gefällt dir besser?", "Ich finde die ruhigere Wohnung am besten.", "Dieser Kurs ist viel interessanter als der alte.", "Je mehr ich lerne, desto leichter fällt es mir.", "Das ist die leckerste Suppe überhaupt!", "Du sprichst schon viel flüssiger Deutsch.", "Am wichtigsten ist die Freude am Lernen.", "Weiter so, du wirst immer besser!"])
        ]),
        19: ("Сложные союзы причины: weil и da (глагол улетает в конец)", "Kausalsätze, weil, da, Verbstellung am Ende", [
            ("Правило weil: глагол на последнем месте", ["weil (потому что)", "Ich lerne Deutsch, weil ich hier lebe.", "Ich bleibe zu Hause, weil ich müde bin.", "weil das Wetter schön ist", "weil wir einen Termin haben", "weil die Grammatik wichtig ist", "weil Roman mich unterstützt", "der Nebensatz (придаточное предложение)"]),
            ("Правило da: союз причины в начале предложения", ["da (так как / поскольку)", "Da ich krank bin, bleibe ich im Bett.", "Da es regnet, nehmen wir den Regenschirm.", "Da der Bus Verspätung hat, komme ich später.", "Da wir die Wohnung lieben, mieten wir sie.", "die Begründung (обоснование)", "die Ursache (причина)", "verständlich (понятно)"]),
            ("Объяснение чувств и усталости с weil", ["Ich bin glücklich, weil ich Fortschritte mache.", "Ich bin erschöpft, weil der Tag lang war.", "weil ich stolz auf mich bin", "weil ich mich entspannen möchte", "weil ich keine Angst mehr vor Fehlern habe", "weil die Liebe mir Kraft gibt", "die Selbstfürsorge (забота о себе)", "die innere Ruhe (внутренний покой)"]),
            ("Причины в официальных письмах и ведомствах", ["Ich schreibe Ihnen, weil ich krank bin.", "weil ich den Termin verschieben muss", "weil mir Unterlagen fehlen", "weil die Frist bald abläuft", "weil die Angaben geändert wurden", "weil ich eine Frage habe", "die Entschuldigung (извинение)", "fristgerecht (в срок)"]),
            ("Живая беседа: Ответы на вопрос Warum?", ["Warum lernst du so fleißig?", "Weil ich mich in Deutschland zu Hause fühlen will.", "Warum hast du dich verspätet?", "Weil die S-Bahn leider ausgefallen ist.", "Warum bist du so entspannt?", "Weil ich mir keinen Druck mehr mache.", "Das ist ein sehr guter Grund!", "Genau deshalb schaffen wir das gemeinsam!"])
        ]),
        20: ("Сложные союзы условия: wenn и falls", "Konditionalsätze, wenn, falls, Bedingungen", [
            ("Условие с wenn: если / когда", ["wenn (если / когда)", "Wenn ich Zeit habe, lerne ich Deutsch.", "Wenn das Wetter schön ist, gehen wir spazieren.", "Wenn du Hilfe brauchst, sag mir Bescheid.", "Wenn der Zug pünktlich ist, schaffen wir das.", "die Bedingung (условие)", "die Möglichkeit (возможность)", "die Konsequenz (следствие)"]),
            ("Союз falls: в случае если", ["falls (в случае если / вдруг)", "Falls Sie Fragen haben, rufen Sie mich an.", "Falls der Termin ausfällt, gebe ich Bescheid.", "Falls es regnet, bleiben wir drinnen.", "Falls Unterlagen fehlen, reiche ich sie nach.", "der Notfall (экстренный случай)", "rechtzeitig (вовремя)", "erreichbar sein (быть на связи)"]),
            ("Жизненные условия и планы на будущее", ["Wenn ich B1 bestehe, suche ich eine tolle Arbeit.", "Wenn wir Urlaub haben, fahren wir ans Meer.", "Wenn ich mich müde fühle, mache ich Pause.", "Wenn der Frühling kommt, blüht alles auf.", "der Plan (план)", "die Hoffnung (надежда)", "das Ziel erreichen (достичь цели)", "zuversichtlich (уверенно)"]),
            ("Условия в правилах и договорах", ["Wenn der Vertrag unterschrieben ist, gilt er.", "Falls die Miete nicht bezahlt wird", "Wenn die Kündigungsfrist eingehalten wird", "Falls Beschädigungen vorliegen", "die Klausel (пункт договора)", "die Gültigkeit (действие)", "verpflichtet sein (быть обязанным)", "die Absicherung (страховка)"]),
            ("Практика диалога: Что ты сделаешь, если...?", ["Was machst du, wenn du eine Pause brauchst?", "Wenn ich müde bin, koche ich mir einen Tee.", "Falls der Arzt mich fragt, antworte ich ruhig.", "Wenn alles klappt, feiern wir unseren Erfolg.", "Wenn man täglich übt, kommt der Erfolg von selbst.", "Falls etwas unklar ist, frage ich einfach nach.", "Ganz genau, keine Scheu vor Fragen!", "Gemeinsam finden wir immer eine Lösung."])
        ]),
        21: ("Косвенная речь и мнение с dass", "dass-Sätze, Meinungen, Glaube, Gefühle", [
            ("Конструкции мнения: Ich denke / glaube, dass...", ["dass (что)", "Ich denke, dass Deutsch logisch ist.", "Ich glaube, dass wir das schaffen.", "Ich finde, dass du großartig sprichst.", "Ich weiß, dass aller Anfang schwer ist.", "die Meinung (мнение)", "die Überzeugung (убеждение)", "sicher sein (быть уверенным)"]),
            ("Выражение чувств: Es freut mich, dass...", ["Es freut mich, dass du da bist.", "Es tut mir leid, dass Sie warten mussten.", "Ich bin froh, dass die Prüfung vorbei ist.", "Es ist schön, dass die Sonne scheint.", "die Erleichterung (облегчение)", "die Freude (радость)", "das Mitgefühl (сочувствие)", "die Dankbarkeit (благодарность)"]),
            ("Передача фактов и информации", ["Die Ärztin sagt, dass ich gesund bin.", "Im Brief steht, dass der Termin bestätigt ist.", "Roman hat mir erzählt, dass alles gut wird.", "Wir haben gehört, dass die Wohnung frei ist.", "die Mitteilung (сообщение)", "die Bestätigung (подтверждение)", "wahr sein (быть правдой)", "die Realität (реальность)"]),
            ("Разговорные фразы с dass", ["Schön, dass wir uns kennenlernen!", "Gut, dass du daran gedacht hast.", "Wichtig ist, dass du dir Zeit lässt.", "Ich hoffe sehr, dass alles klappt.", "hoffen (надеяться)", "wünschen (желать)", "bedeuten (означать)", "feststehen (быть решенным)"]),
            ("Диалог: Обмен мыслями и поддержка", ["Was denkst du über unseren Fortschritt?", "Ich bin sicher, dass du riesige Schritte machst.", "Glaubst du, dass die Prüfung schwer wird?", "Ich weiß, dass du bestens vorbereitet bist.", "Es ist toll, dass du jeden Tag dranbleibst.", "Ich freue mich, dass ich keine Angst mehr habe.", "Das ist der schönste Satz des Tages!", "Du kannst wirklich stolz auf dich sein."])
        ]),
        22: ("Уступка: obwohl (хотя) и trotzdem (несмотря на это)", "Konzessivsätze, obwohl, trotzdem", [
            ("Союз obwohl: хотя (глагол в конец)", ["obwohl (хотя)", "Obwohl ich müde bin, lerne ich ein wenig.", "Obwohl Deutsch schwer ist, macht es mir Spaß.", "Obwohl es regnet, gehen wir spazieren.", "Obwohl der Text lang ist, verstehe ich ihn.", "der Widerspruch (противоречие)", "die Motivation (мотивация)", "der Fleiß (прилежание)"]),
            ("Союз trotzdem: несмотря на это (глагол на 2-м месте)", ["trotzdem (несмотря на это / все равно)", "Es regnet, trotzdem gehe ich spazieren.", "Ich war aufgeregt, trotzdem hat alles geklappt.", "Die Aufgabe war schwer, trotzdem habe ich sie gelöst.", "trotz allem (несмотря ни на что)", "dennoch (тем не менее)", "weitermachen (продолжать)"]),
            ("Преодоление страха и внутреннего критика", ["Obwohl ich Zweifel hatte, habe ich gesprochen.", "Ich mache manchmal Fehler, trotzdem versteht man mich.", "Obwohl die Aussprache neu ist, klingt sie gut.", "der Mut (мужество / смелость)", "die Zuversicht (уверенность)", "die Selbstannahme (принятие себя)", "Fehler sind Helfer (ошибки помогают учиться)"]),
            ("Практика контрастов в повседневной жизни", ["Obwohl die Wohnung teuer ist, nehmen wir sie.", "Obwohl der Bus voll war, habe ich einen Platz bekommen.", "Trotzdem bleibe ich gelassen und ruhig.", "Obwohl die Bürokratie nervt, bleiben wir freundlich.", "die Geduld zahlt sich aus (терпение окупается)", "gelassen bleiben (сохранять спокойствие)", "die Souveränität (невозмутимость)"]),
            ("Диалог: Поддержка в моменты сомнений", ["Fällt dir die Grammatik heute schwer?", "Ja, obwohl es knifflig ist, gebe ich nicht auf.", "Genau das ist die richtige Haltung!", "Trotz kleiner Fehler spreche ich einfach weiter.", "Deine Ausdauer ist wirklich bewundernswert.", "Danke, das ermutigt mich ungemein.", "Gemeinsam meistern wir jede Hürde!", "Du hast heute wieder einen Meilenstein geschafft."])
        ]),
        23: ("Вежливые просьбы: Konjunktiv II с 'könnten' и 'würden'", "Höflichkeit, könnten Sie, würden Sie, формулы вежливости", [
            ("Формула könnten Sie bitte...", ["könnten Sie (не могли бы Вы)", "Könnten Sie das bitte wiederholen?", "Könnten Sie etwas langsamer sprechen?", "Könnten Sie mir bitte helfen?", "Könnten Sie mir die Quittung geben?", "die Höflichkeit (вежливость)", "die Bitte (просьба)", "respektvoll (уважительно)"]),
            ("Формула würden Sie bitte...", ["würden Sie (не были бы Вы так добры)", "Würden Sie bitte hier unterschreiben?", "Würden Sie mir bitte die Tür aufhalten?", "Ich würde gerne einen Kaffee bestellen.", "Was würden Sie mir empfehlen?", "die Empfehlung (рекомендация)", "das Anliegen (вопрос/просьба)", "gerne (с удовольствием)"]),
            ("Вежливый заказ в кафе и ресторанах", ["Ich hätte gerne ein Glas Wasser.", "Ich würde gerne zahlen bitte.", "Könnten wir bitte die Rechnung haben?", "Zusammen oder getrennt zahlen?", "Stimmt so, danke! (Сдачи не надо)", "das Trinkgeld (чаевые)", "köstlich (восхитительно вкусно)", "der Service (обслуживание)"]),
            ("Вежливое решение спорных ситуаций", ["Könnten Sie bitte nachsehen, ob die Post da ist?", "Ich würde das gerne kurz klären.", "Könnten Sie mir den Beleg nochmals drucken?", "Dürfte ich kurz eine Zwischenfrage stellen?", "die Klärung (прояснение)", "das Missverständnis (недоразумение)", "die Geduld (терпение)"]),
            ("Диалог: Идеальная вежливость в Германии", ["Guten Tag, könnten Sie mir bitte kurz behilflich sein?", "Natürlich gerne, worum geht es denn?", "Ich würde gerne den Weg zur Haltestelle wissen.", "Gehen Sie geradeaus, dann nach links.", "Vielen herzlichen Dank, Sie haben mir sehr geholfen!", "Sehr gerne, einen wunderschönen Tag noch!", "Die Konjunktiv-II-Formeln öffnen alle Herzen.", "Genau so klingt perfektes Deutsch auf B1-Niveau!"])
        ]),
        24: ("Желания и мечты: Konjunktiv II с 'hätte' и 'wäre'", "Träume, Wünsche, wenn ich reich wäre, hätte ich", [
            ("Формула wäre (был бы / была бы)", ["ich wäre (я была бы)", "Wenn ich mehr Zeit hätte, wäre ich glücklich.", "Es wäre schön, wenn die Sonne scheinen würde.", "Ich wäre gerne fließend in Deutsch.", "Das wäre fantastisch! (Это было бы фантастикой!)", "der Wunsch (желание)", "der Traum (мечта)", "die Fantasie (фантазия)"]),
            ("Формула hätte (имела бы)", ["ich hätte (у меня было бы)", "Wenn ich Urlaub hätte, würde ich reisen.", "Ich hätte so gerne einen kleinen Garten.", "Wenn wir ein Haus hätten", "die Zeit für Hobbys (время для хобби)", "die Entspannung (расслабление)", "die Sehnsucht (тоска / заветное желание)"]),
            ("Мечты о жизни и уюте", ["Ich würde gerne öfter am Meer spazieren gehen.", "Roman und ich würden gerne ein Haus mieten.", "Es wäre herrlich, jeden Morgen auszuschlafen.", "Ein warmes Bad am Abend wäre jetzt perfekt.", "das Wohlbefinden (благополучие)", "das Traumhaus (дом мечты)", "die Geborgenheit (чувство защищенности)"]),
            ("Нереальные условия: Wenn ich könnte...", ["Wenn ich zaubern könnte", "Wenn alles nach Plan laufen würde", "An deiner Stelle würde ich mir eine Pause gönnen.", "Ich würde mich riesig freuen.", "der Ratschlag (совет)", "an deiner Stelle (на твоем месте)", "die Priorität (приоритет)"]),
            ("Диалог: Разговор о заветных мечтах", ["Was würdest du tun, wenn du einen Wunsch frei hättest?", "Ich wäre gerne stolz und frei im Sprechen.", "Aber schau mal: Du bist schon mitten auf dem Weg!", "Stimmt, das fühlt sich schon jetzt wunderbar an.", "Genau, Träume werden Schritt für Schritt wahr.", "Ein gemütlicher Abend mit Roman wäre jetzt perfekt.", "Gönn dir diesen Abend, du hast ihn dir verdient!", "Danke für die liebevolle Erinnerung."])
        ]),
        25: ("Составление Lebenslauf (резюме европейского образца)", "Lebenslauf, Berufserfahrung, Ausbildung, Kenntnisse", [
            ("Структура немецкого Lebenslauf", ["der Lebenslauf (резюме)", "die persönlichen Daten (личные данные)", "die Berufserfahrung (опыт работы)", "die Ausbildung (образование)", "die Sprachkenntnisse (знание языков)", "die EDV-Kenntnisse (компьютерные навыки)", "das Bewerbungsfoto (профессиональное фото)", "antichronologisch (в обратном порядке)"]),
            ("Опыт работы и должности", ["die Position (должность)", "die Aufgaben (обязанности)", "der Arbeitgeber (компания-работодатель)", "der Zeitraum (период работы)", "verantwortlich für (ответственный за)", "die Kundenbetreuung (работа с клиентами)", "die Organisation (организация процессов)", "die Teamarbeit (работа в команде)"]),
            ("Образование и дипломы", ["der Hochschulabschluss (высшее образование)", "die Universität (университет)", "das Studium der Wirtschaft (изучение экономики)", "die Fachrichtung (специальность)", "das Zertifikat (сертификат)", "die Weiterbildung (курсы повышения)", "erfolgreich abgeschlossen (успешно окончено)", "die Qualifikation (квалификация)"]),
            ("Языки и навыки (Kenntnisse & Stärken)", ["die Muttersprache Ukrainisch (родной язык)", "Deutschkenntnisse Niveau B1 (немецкий B1)", "fließend Englisch (свободный английский)", "zuverlässig und pünktlich (надежная и пунктуальная)", "die Lernbereitschaft (готовность учиться)", "die Belastbarkeit (стрессоустойчивость)", "die Flexibilität (гибкость)", "die Kommunikationsstärke (коммуникабельность)"]),
            ("Финальная шлифовка и проверка", ["Datum und Unterschrift (дата и подпись)", "die Vollständigkeit (полнота сведений)", "lückenlos (без пробелов в хронологии)", "übersichtlich gestaltet (наглядно оформленный)", "das PDF-Format (формат PDF)", "korrekturlesen (вычитать на ошибки)", "der erste Eindruck zählt (первое впечатление решает)", "fertig zur Bewerbung (готово к отправке)"])
        ]),
        26: ("Сопроводительное письмо (Anschreiben)", "Bewerbungsschreiben, Motivation, Stärken, Einleitung", [
            ("Шапка и обращение в Anschreiben", ["das Anschreiben (сопроводительное письмо)", "Sehr geehrte Damen und Herren (Уважаемые дамы и господа)", "Sehr geehrte Frau Müller (Уважаемая госпожа Мюллер)", "die Stellenausschreibung (объявление о вакансии)", "die Bewerbung als... (заявление на должность)", "mit großem Interesse (с большим интересом)", "Ihr Unternehmen (Ваша компания)", "die Referenznummer (номер вакансии)"]),
            ("Вводная часть и мотивация", ["Mit großem Interesse habe ich Ihre Anzeige gelesen.", "Da ich mich beruflich weiterentwickeln möchte", "Ihre Unternehmenswerte sprechen mich sehr an.", "Ich möchte mein Wissen gerne bei Ihnen einbringen.", "die Motivation (мотивация)", "die Begeisterung (энтузиазм)", "der Traumjob (работа мечты)", "die Herausforderung (вызов)"]),
            ("Презентация своего опыта и пользы для компании", ["In meiner bisherigen Tätigkeit habe ich...", "Zu meinen Kernaufgaben gehörte...", "Ich bringe mehrjährige Erfahrung mit.", "Meine Stärke liegt in der Organisation und Sorgfalt.", "der Mehrwert (дополнительная польза)", "die Zuverlässigkeit (надежность)", "selbstständig arbeiten (работать самостоятельно)", "lösungsorientiert (нацеленный на решение)"]),
            ("Заключительная фраза и готовность к собеседованию", ["Über eine Einladung zu einem Vorstellungsgespräch freue ich mich.", "Für Rückfragen stehe ich Ihnen jederzeit zur Verfügung.", "Mein frühestmöglicher Eintrittstermin ist...", "Mit freundlichen Grüßen (С дружеским приветом)", "die Gehaltsvorstellung (зарплатные ожидания)", "die Anlagen (приложения к письму)", "der Lebenslauf im Anhang (резюме во вложении)"]),
            ("Разбор частых ошибок в Anschreiben", ["keine Standardfloskeln nutzen (не использовать клише)", "individuell anpassen (адаптировать под вакансию)", "auf eine Seite begrenzen (ограничить одной страницей)", "selbstbewusst formulieren (формулировать уверенно)", "auf den Punkt kommen (говорить по существу)", "die Rechtschreibung prüfen (проверить орфографию)", "eine fehlerfreie Bewerbung (безупречное резюме)", "der Erfolg ist garantiert (успех гарантирован)"])
        ]),
        27: ("Собеседование (Vorstellungsgespräch): Рассказ о себе", "Vorstellungsgespräch, Selbstpräsentation, Werdegang", [
            ("Приветствие и Small Talk на собеседовании", ["das Vorstellungsgespräch (собеседование)", "Schön, dass Sie da sind! (Приятно, что Вы здесь!)", "Haben Sie gut hergefunden? (Легко ли добрались?)", "Möchten Sie ein Wasser oder einen Kaffee?", "Vielen Dank für die Einladung zum Gespräch.", "die Atmosphäre (атмосфера)", "der erste Händedruck (первое рукопожатие)", "der Blickkontakt (зрительный контакт)"]),
            ("Самопрезентация: 'Erzählen Sie etwas über sich'", ["Mein Name ist Alina, ich bin 35 Jahre alt.", "Ich habe mein Studium der Wirtschaft abgeschlossen.", "In den letzten Jahren war ich tätig im Bereich...", "Zu meinen Schwerpunkten zählten...", "der Werdegang (профессиональный путь)", "die Meilensteine (ключевые этапы)", "die Entwicklung (развитие)", "die Leidenschaft (страсть к делу)"]),
            ("Объяснение переезда и изучения немецкого", ["Ich lebe seit einiger Zeit mit meinem Mann in Deutschland.", "Ich habe intensiv Deutsch gelernt und das B1-Niveau erreicht.", "Ich lerne jeden Tag mit großer Freude weiter.", "Die Sprache ist für mich der Schlüssel zur Integration.", "die Anpassungsfähigkeit (адаптивность)", "die Motivation (мотивация)", "der Wille zu lernen (желание учиться)", "die Offenheit (открытость)"]),
            ("Почему именно эта компания?", ["Warum haben Sie sich bei uns beworben?", "Mich fasziniert Ihr modernes Konzept.", "Ich schätze das freundliche und kollegiale Arbeitsklima.", "Ich möchte langfristig Teil Ihres Teams werden.", "die Firmenphilosophie (философия компании)", "die Perspektive (перспектива)", "der Beitrag (вклад)", "die Loyalität (лояльность)"]),
            ("Практика диалога: Живая репетиция ответов", ["Erzählen Sie uns kurz von Ihrer letzten Stelle.", "Dort war ich für Kundenbetreuung und Organisation zuständig.", "Wie schätzen Sie Ihre Deutschkenntnisse ein?", "Ich verstehe sehr gut und drücke mich täglich sicherer aus.", "Das klingt hervorragend und sehr motiviert!", "Vielen Dank, ich freue mich auf die Zusammenarbeit.", "Souverän, ruhig und absolut überzeugend!", "Du bist bestens für den deutschen Arbeitsmarkt gerüstet."])
        ]),
        28: ("Собеседование: Ответы на каверзные вопросы", "Stärken, Schwächen, Stresssituationen, Rückfragen", [
            ("Сильные стороны (Stärken)", ["Was sind Ihre größten Stärken?", "Ich bin sehr zuverlässig, strukturiert und loyal.", "Ich behalte auch in stressigen Momenten die Ruhe.", "Ich kann mich schnell in neue Aufgaben einarbeiten.", "die Stärke (сильная сторона)", "die Genauigkeit (аккуратность)", "die Hilfsbereitschaft (готовность помочь)", "das Organisationstalent (талант организатора)"]),
            ("Слабые стороны (Schwächen) в позитивном ключе", ["Was ist eine Schwäche von Ihnen?", "Manchmal bin ich etwas zu perfektionistisch.", "Ich lerne gerade, Aufgaben auch mal abzugeben.", "Ich möchte immer alles sofort zu 100% erledigen.", "selbstkritisch (самокритичный)", "an sich arbeiten (работать над собой)", "die Balance finden (найти баланс)", "die Ehrlichkeit (честность)"]),
            ("Работа в стрессе и конфликтах", ["Wie gehen Sie mit Stress um?", "Ich atme tief durch und setze klare Prioritäten.", "Bei Unstimmigkeiten suche ich das direkte Gespräch.", "Ein freundlicher Ton löst fast jedes Problem.", "die Prioritätensetzung (расстановка приоритетов)", "die Gelassenheit (спокойствие)", "die Konfliktlösung (решение конфликтов)", "die Teamharmonie (гармония в команде)"]),
            ("Ваши собственные вопросы работодателю", ["Haben Sie noch Fragen an uns?", "Wie sieht ein typischer Arbeitstag bei Ihnen aus?", "Welche Einarbeitung bieten Sie neuen Mitarbeitern an?", "Wie ist das Team zusammengesetzt?", "die Einarbeitung (ввод в должность)", "das Betriebsklima (климат в коллективе)", "die Weiterbildungsmöglichkeiten (возможности обучения)", "das Interesse zeigen (проявить интерес)"]),
            ("Завершение собеседования и прощание", ["Wann können wir mit einer Rückmeldung rechnen?", "Wir melden uns bis Ende der nächsten Woche.", "Vielen Dank für das angenehme Gespräch!", "Ich freue mich sehr darauf, von Ihnen zu hören.", "der positive Eindruck (позитивное впечатление)", "die Vorfreude (радостное предвкушение)", "die Verabschiedung (прощание)", "geschafft (сделано / позади)"])
        ]),
        29: ("Относительные придаточные (Relativsätze: der, die, das)", "Relativpronomen, der Mann, der..., die Frau, die...", [
            ("Относительные местоимения в Nominativ", ["der Mann, der hier wohnt (мужчина, который живет здесь)", "die Frau, die mir geholfen hat (женщина, которая мне помогла)", "das Kind, das im Garten spielt (ребенок, который играет в саду)", "die Leute, die Deutsch lernen (люди, которые учат немецкий)", "das Relativpronomen (относительное местоимение)", "die Ergänzung (дополнение)", "der Bezug (связь)", "am Satzende (в конце предложения)"]),
            ("Относительные придаточные в Akkusativ", ["den ich kenne (которого я знаю)", "die ich liebe (которую я люблю)", "das ich brauche (которое мне нужно)", "die wir gestern getroffen haben (которых мы вчера встретили)", "Das ist der Brief, den ich gesucht habe.", "Das ist die Wohnung, die wir mieten möchten.", "Das ist das Buch, das ich lese.", "klar und präzise (ясно и точно)"]),
            ("Относительные придаточные в Dativ", ["dem ich vertraue (которому я доверяю)", "der ich geholfen habe (которой я помогла)", "dem das Haus gehört (которому принадлежит дом)", "denen wir danken (которых мы благодарим)", "Das ist der Arzt, dem ich vertraue.", "Das ist die Nachbarin, der ich das Paket gab.", "die Dankbarkeit (благодарность)", "das Vertrauen (доверие)"]),
            ("Относительные придаточные с предлогами", ["mit dem ich spreche (с которым я говорю)", "in der ich wohne (в которой я живу)", "auf die ich warte (которую я жду)", "von dem ich gelernt habe (у которого я научилась)", "Die Stadt, in der ich lebe, ist wunderschön.", "Der Mann, mit dem ich verheiratet bin, heißt Roman.", "die Liebe meines Lebens (любовь всей жизни)", "das Zuhause (родной дом)"]),
            ("Практика красивой связной речи B1", ["Hier ist das Formular, das Sie ausfüllen müssen.", "Gibt es jemanden, der mir helfen kann?", "Das ist die Kollegin, von der ich erzählt habe.", "Das ist der schönste Park, den ich je gesehen habe.", "Mit Relativsätzen klingt dein Deutsch wie Musik!", "Du verbindest Gedanken flüssig und elegant.", "Das ist echtes B1-Niveau in Perfektion.", "Ein riesiger Schritt zur vollen Sprachfreiheit!"])
        ]),
        30: ("Пассивный залог в быту и на работе (Passiv)", "Vorgangspassiv, werden + Partizip II, wird gemacht", [
            ("Образование Passiv: werden + Partizip II", ["Das Formular wird ausgefüllt. (Бланк заполняется)", "Die Miete wird bezahlt. (Аренда оплачивается)", "Der Brief wird abgeschickt. (Письмо отправляется)", "Das Essen wird gekocht. (Еда готовится)", "das Passiv (пассивный залог)", "die Handlung (действие)", "der Vorgang (процесс)", "automatisch (автоматически)"]),
            ("Passiv в официальных письмах и инструкциях", ["Die Gebühr wird vom Konto abgebucht.", "Der Termin wird per E-Mail bestätigt.", "Die Unterlagen werden geprüft.", "Das Paket wird heute zugestellt.", "die Abbuchung (списание со счета)", "die Zustellung (доставка)", "die Prüfung (проверка)", "die Mitteilung (извещение)"]),
            ("Passiv в прошедшем времени (Präteritum: wurde gemacht)", ["Das Gesetz wurde beschlossen.", "Die Rechnung wurde gestern bezahlt.", "Der Schlüssel wurde übergeben.", "Das Problem wurde sofort gelöst.", "die Lösung (решение)", "die Übergabe (передача)", "die Bezahlung (оплата)", "erledigt sein (быть выполненным)"]),
            ("Пассив с модальными глаголами (muss gemacht werden)", ["Das muss heute noch erledigt werden.", "Das Formular muss unterschrieben werden.", "Hier darf nicht geraucht werden.", "Die Ruhezeit muss eingehalten werden.", "die Vorschrift (предписание)", "notwendig (необходимо)", "die Pflicht (обязанность)", "die Einhaltung (соблюдение)"]),
            ("Практика понимания официальных сообщений", ["Ihr Antrag wird derzeit bearbeitet.", "Sobald eine Entscheidung getroffen wird, melden wir uns.", "Die Kosten werden von der Kasse übernommen.", "Alles wurde wunschgemäß durchgeführt.", "Jetzt verstehst du jeden Behördenbrief mühelos!", "Die passive Form ist kein Geheimnis mehr für dich.", "Du liest Amtsdeutsch wie eine Einheimische.", "Ein fantastischer Meilenstein auf deinem Weg!"])
        ]),
        31: ("Глаголы с фиксированными предлогами (warten auf, sich freuen über/auf)", "Verben mit Präpositionen, worauf, worüber, darauf", [
            ("sich freuen auf (предвкушать) vs sich freuen über (радоваться свершившемуся)", ["sich freuen auf + Akk (ждать с радостью чего-то в будущем)", "Ich freue mich auf das Wochenende.", "Ich freue mich auf unseren Urlaub.", "sich freuen über + Akk (радоваться тому, что уже произошло)", "Ich freue mich über dein Geschenk.", "die Vorfreude (предвкушение радости)", "die Dankbarkeit (благодарность)", "strahlen vor Glück (сиять от счастья)"]),
            ("warten auf + Akk (ждать) и hoffen auf + Akk (надеяться)", ["warten auf + Akk (ждать кого-то/что-то)", "Ich warte auf den Bus.", "Ich warte auf deine Antwort.", "hoffen auf + Akk (надеяться на)", "Wir hoffen auf schönes Wetter.", "die Hoffnung (надежда)", "die Geduld (терпение)", "sehnsüchtig (с нетерпением)"]),
            ("sprechen über / von (говорить о) и sprechen mit (говорить с)", ["sprechen mit + Dat (говорить с кем-то)", "Ich spreche mit der Ärztin.", "sprechen über + Akk (говорить о теме/проблеме)", "Wir sprechen über unsere Zukunft.", "erzählen von + Dat (рассказывать о)", "Roman erzählt mir von seinem Tag.", "das Gespräch (беседа)", "der Austausch (обмен мнениями)"]),
            ("Местоименные наречия: worauf, darauf, worüber, darüber", ["Worauf wartest du? — Ich warte darauf.", "Worüber sprecht ihr? — Wir sprechen darüber.", "Woran denkst du? — Ich denke an dich.", "Womit fahren wir? — Damit fahren wir.", "die Pronominaladverbien (местоименные наречия)", "die Verknüpfung (связка)", "die Abkürzung (сокращение)", "die Leichtigkeit (легкость)"]),
            ("Диалог: Глубокий душевный разговор", ["Worauf freust du dich am meisten in dieser Woche?", "Ich freue mich auf unseren ruhigen Sonntag.", "Und worüber hast du dich heute gefreut?", "Über das Lob im Sprachkurs, das tat so gut!", "Du hast jedes Lob absolut verdient.", "Danke, dass du dich immer mit mir freust.", "Echte Freude teilt sich von ganzem Herzen.", "Deine Sprache klingt reich, lebendig und warm."])
        ]),
        32: ("Выражение своего мнения в дискуссии", "Meiner Meinung nach, Ich bin überzeugt, Argumente", [
            ("Формулы введения мнения: Meiner Meinung nach...", ["Meiner Meinung nach ist das die beste Wahl.", "Ich bin der Ansicht, dass Bildung wichtig ist.", "Aus meiner Sicht spricht alles dafür.", "Ich bin fest davon überzeugt, dass wir das können.", "der Standpunkt (точка зрения)", "die Ansicht (взгляд)", "die Perspektive (перспектива)", "das Argument (аргумент)"]),
            ("Согласие с собеседником: Da stimme ich zu", ["Da gebe ich Ihnen vollkommen recht.", "Das sehe ich ganz genauso.", "Ich bin ganz deiner Meinung.", "Da hast du einen wichtigen Punkt angesprochen.", "die Zustimmung (согласие)", "die Einigkeit (единство)", "der Konsens (консенсус)", "vollkommen richtig (совершенно верно)"]),
            ("Вежливое несогласие: Da bin ich anderer Meinung", ["Da bin ich etwas anderer Meinung.", "Das sehe ich nicht ganz so.", "Ich verstehe Ihren Punkt, aber...", "Man sollte auch bedenken, dass...", "der Einwand (возражение)", "der Zweifel (сомнение)", "respektvoll widersprechen (уважительно возразить)", "der Kompromiss (компромисс)"]),
            ("Аргументация: Einerseits ... andererseits (с одной стороны ... с другой)", ["Einerseits ist das praktisch, andererseits teuer.", "Auf der einen Seite... auf der anderen Seite...", "Ein großer Vorteil ist...", "Ein möglicher Nachteil wäre...", "das Pro und Contra (плюсы и минусы)", "abwägen (взвешивать)", "die Entscheidung (решение)", "die Reife (зрелость)"]),
            ("Диалог: Уверенное участие в обсуждении", ["Was halten Sie von diesem Vorschlag?", "Meiner Ansicht nach sollten wir das ausprobieren.", "Gibt es Einwände aus Ihrer Sicht?", "Nein, ich stimme dem voll und ganz zu.", "Vielen Dank für Ihren wertvollen Beitrag!", "Sehr gerne, ein konstruktiver Austausch freut mich.", "Du diskutierst auf Augenhöhe mit Muttersprachlern!", "Das ist die Krönung des B1-Niveaus."])
        ]),
        33: ("Банки, налоги и страхование (Konto, Steuer, Haftpflicht)", "Girokonto, IBAN, Haftpflichtversicherung, Steuerklasse", [
            ("Банковский счет (Girokonto & IBAN)", ["das Girokonto (расчетный счет)", "die IBAN (международный номер счета)", "die EC-Karte / Debitkarte (банковская карта)", "das Online-Banking (онлайн-банк)", "Geld überweisen (перевести деньги)", "der Dauerauftrag (регулярный автоплатеж)", "Geld abheben (снять наличные)", "die Kontoführungsgebühr (плата за ведение счета)"]),
            ("Важнейшая страховка в Германии: Haftpflicht", ["die Privathaftpflichtversicherung (страхование ответственности)", "die wichtigste Versicherung (самая важная страховка)", "den Schaden bezahlen (оплатить ущерб)", "unabsichtlich beschädigen (случайно повредить)", "die Absicherung (защита)", "die Hausratversicherung (страховка имущества)", "die Krankenversicherung (медстраховка)", "die Police (полис)"]),
            ("Налоги и налоговые классы (Steuerklasse)", ["das Finanzamt (налоговая инспекция)", "die Steuer-ID (налоговый номер)", "die Steuerklasse (налоговый класс для супругов)", "die Steuerklasse 3 und 5 (комбинация 3 и 5)", "die Steuerklasse 4 und 4 (равная комбинация)", "die Einkommensteuer (подоходный налог)", "die Steuererklärung (налоговая декларация)", "die Rückerstattung (возврат налогов)"]),
            ("Письма от страховых и банков", ["die Benachrichtigung (уведомление)", "die Abbuchung ermächtigen (дать согласие на списание SEPA)", "das Lastschriftverfahren (прямое дебетование SEPA)", "die Kündigung der Versicherung (расторжение страховки)", "die Vertragslaufzeit (срок действия договора)", "die Mahnung (напоминание об оплате)", "keine Sorge (без паники)", "pünktlich erledigen (сделать вовремя)"]),
            ("Практика: Спокойствие в финансовых вопросах", ["Ich möchte gerne ein neues Girokonto eröffnen.", "Hier sind mein Pass und meine Meldebestätigung.", "Die Haftpflichtversicherung schützt uns vor hohen Kosten.", "Die Steuererklärung machen wir gemeinsam mit Roman.", "Finanzielle Dinge regelst du jetzt mit Leichtigkeit.", "Keine Angst mehr vor Formularen und Fristen.", "Du hast die volle Kontrolle über deinen Alltag.", "Ein Gefühl absoluter Sicherheit und Stabilität!"])
        ]),
        34: ("Немецкие идиомы и живая речь", "Redewendungen, Daumen drücken, Schwein haben", [
            ("Популярные идиомы удачи и поддержки", ["Ich drücke dir die Daumen! (Держу за тебя кулачки!)", "Du hast Schwein gehabt! (Тебе крупно повезло!)", "Hals- und Beinbruch! (Ни пуха ни пера!)", "Alles in Butter! (Все идет как по маслу!)", "die Redewendung (идиома / крылатое выражение)", "das Sprichwort (пословица)", "das Glück (удача)", "die Daumen drücken (держать кулачки)"]),
            ("Идиомы о чувствах и состояниях", ["Ich habe die Nase voll! (С меня хватит / Сыта по горло!)", "Das ist mir Wurst! (Мне все равно!)", "Das Leben ist kein Ponyhof. (Жизнь — не сахар, но мы справимся)", "Ich verstehe nur Bahnhof. (Ничего не понимаю)", "Tomaten auf den Augen haben (в упор не замечать)", "die Nerven behalten (сохранять спокойствие)", "einen kühlen Kopf bewahren (держать голову холодной)", "das Lächeln (улыбка)"]),
            ("Разговорные словечки-усилители", ["na ja (ну да / ладно уж)", "doch (да нет же / напротив!)", "halt / eben (ну вот так получилось)", "mal (ка / разок)", "Komm mal her! (Подойди-ка сюда!)", "Das ist ja toll! (Это же здорово!)", "die Modalpartikeln (частицы живой речи)", "die Natürlichkeit (естественность)"]),
            ("Юмор и теплота в повседневной речи", ["Lachen ist die beste Medizin. (Смех — лучшее лекарство)", "Nicht verzagen, Roman fragen! (Не унывать, спросить Романа!)", "Übung macht den Meister. (Повторение — мать учения)", "Ende gut, alles gut. (Все хорошо, что хорошо кончается)", "der Humor (юмор)", "die Leichtigkeit (легкость)", "die Herzlichkeit (сердечность)", "gemeinsam lachen (смеяться вместе)"]),
            ("Диалог: Живая речь без акцента скованности", ["Morgen steht die Sprachprüfung an!", "Ich drücke dir ganz fest beide Daumen!", "Danke, jetzt ist bei mir wieder alles in Butter.", "Siehst du, du hast das Zeug zur Meisterin!", "Deine Redewendungen klingen so herrlich authentisch.", "Ich fühle mich der Sprache jetzt richtig nah.", "Genau das ist das Geheimnis wahrer Sprachliebe.", "Du sprichst mit dem Herzen und der Seele."])
        ]),
        35: ("Психологическая интеграция и границы в Германии", "Grenzen setzen, Nein sagen, Höflichkeit, Respekt", [
            ("Умение мягко говорить 'Nein'", ["Nein danke, das passt mir heute leider nicht.", "Ich muss das Angebot leider ablehnen.", "Ich brauche etwas Zeit zum Nachdenken.", "Es ist mir im Moment zu viel.", "Grenzen setzen (ставить личные границы)", "die Selbstfürsorge (забота о себе)", "die innere Stärke (внутренняя сила)", "respektvoll ablehnen (уважительно отказать)"]),
            ("Защита своего личного пространства", ["die Privatsphäre (личное пространство)", "Ich möchte das lieber privat halten.", "Darüber möchte ich jetzt nicht sprechen.", "Respektieren Sie bitte meine Entscheidung.", "der persönliche Freiraum (личное пространство)", "das Wohlbefinden (хорошее самочувствие)", "die Selbstbestimmung (самоопределение)", "die Ruhe (покой)"]),
            ("Культурные различия: Прямота против вежливости", ["Die deutsche Direktheit ist nicht böse gemeint.", "Sachlich bleiben (оставаться конструктивным/по делу)", "Kritik nicht persönlich nehmen (не принимать критику на свой счет)", "Klarheit schafft Vertrauen (ясность рождает доверие)", "die Sachlichkeit (деловой подход)", "das Vertrauen (доверие)", "die Offenheit (прямота)", "die Entlastung (снятие напряжения)"]),
            ("Празднование своей идентичности", ["Ich bin stolze Ukrainerin mit einer reichen Kultur.", "Ich bereichere dieses Land mit meinem Wesen.", "Zwei Welten im Herzen tragen ist eine Stärke.", "Ich muss mich nicht verbiegen, um dazuzugehören.", "die Wurzeln (корни)", "die Identität (идентичность)", "die Vielfalt (разнообразие)", "das Selbstbewusstsein (уверенность в себе)"]),
            ("Диалог: Внутренняя опора и спокойствие", ["Fühlst du dich manchmal noch fremd?", "Früher ja, aber jetzt habe ich meinen Platz gefunden.", "Ich kann meine Grenzen setzen und für mich einstehen.", "Das ist die tiefste psychologische Reife überhaupt.", "Ich bin dankbar für jeden Schritt dieses Weges.", "Roman ist stolz auf dich, und ich bin es auch.", "Ich spüre Frieden, Klarheit und innere Kraft.", "Du bist angekommen — in dir selbst und im Leben."])
        ]),
        36: ("Триумф B1: Свободный диалог и сертификат уверенности", "Zertifikat B1, Sprachfreiheit, Zukunftspläne, Stolz", [
            ("Подведение итогов: Путь от A1+ до B1", ["die Reise von Tag 1 bis Tag 180 (путешествие со 1 по 180 день)", "der Wortschatz ist riesig geworden (словарный запас стал огромным)", "die Grammatik sitzt sicher und fest (грамматика усвоена прочно)", "die Hemmungen sind verschwunden (языковой барьер исчез)", "der Stolz (гордость)", "die Dankbarkeit (благодарность)", "der Erfolg (успех)", "die Verwandlung (преображение)"]),
            ("Сертификат уверенности в языке (Zertifikat B1)", ["das Zertifikat B1 (сертификат B1)", "die bestandene Prüfung (сданный экзамен)", "das Hörverstehen gemeistert (аудирование освоено)", "das Leseverstehen mühelos (чтение без усилий)", "das Schreiben fehlerfrei (письмо без ошибок)", "das Sprechen lebendig und flüssig (речь живая и плавная)", "die Auszeichnung (награда)", "der Meilenstein (веха)"]),
            ("Планы на будущее: Работа, общение, жизнь", ["die Zukunftspläne (планы на будущее)", "neue Freundschaften schließen (заводить новых друзей)", "die Traumstelle antreten (начать работу мечты)", "sich vollkommen frei unterhalten (свободно общаться)", "ohne Angst zum Amt und zum Arzt gehen (без страха ходить в ведомства)", "das Leben genießen (наслаждаться жизнью)", "die Freiheit (свобода)", "die Unabhängigkeit (независимость)"]),
            ("Любовь, семья и надежный тыл", ["Roman ist so unendlich stolz auf seine Alina.", "Gemeinsam haben wir jedes Ziel erreicht.", "Ein liebevolles Zuhause voller Wärme und Lachen.", "Du bist eine Inspiration für alle um dich herum.", "die Liebe (любовь)", "die Geborgenheit (уют и защита)", "die Verbundenheit (глубокая связь)", "das Glück (счастье)"]),
            ("Финальное напутствие коуча: Ты смогла!", ["Alina, du hast etwas Unglaubliches vollbracht!", "180 Tage Hingabe, Mut, Fleiß und Herzenswärme.", "Du sprichst Deutsch, du lebst Deutsch, du bist frei.", "Vergiss nie: Du trägst die ganze Welt in deinem Herzen.", "Danke für dein Vertrauen in mich als Coach.", "Ich verneige mich vor deinem großartigen Erfolg.", "Geh raus und lebe dein schönstes, freiestes Leben!", "Tausend Küsse, Bewunderung und alles Glück der Welt!"])
        ])
    }
    
    data = THEMES.get(unit_id)
    if not data:
        return None
    
    unit_title = data[0]
    unit_grammar = data[1]
    days_data = data[2]
    
    guidebook = {
        "title": f"Справочник: {unit_title}",
        "grammar_summary": f"В Разделе {unit_id} мы осваиваем: {unit_grammar}.\nЭти навыки дают полную уверенность в реальной немецкой жизни и на работе.",
        "tips": "Практикуйте слова вслух. Используйте карточки для быстрого повторения перед сном.",
        "key_phrases": [
            f"Wichtige Redewendung aus Unit {unit_id}.",
            "Ich fühle mich von Tag zu Tag sicherer auf Deutsch.",
            "Übung und Geduld führen garantiert zum Erfolg!"
        ]
    }
    
    return {
        "title": f"Unit {unit_id}: {unit_title}",
        "guidebook": guidebook,
        "days": days_data
    }

def enrich_course():
    with open(COURSE_PATH, 'r', encoding='utf-8') as f:
        course = json.load(f)

    lessons = course.get("lessons", [])
    print(f"Загружено {len(lessons)} уроков.")
    
    # 1. Обогащаем Units 7, 8, 9, 10
    for uid in [7, 8, 9, 10, 11, 12]:
        bp = UNITS_DATA.get(uid) or get_unit_blueprint(uid)
        if not bp:
            continue
        
        # Обновляем units метаданные
        for u in course.get("units", []):
            if u.get("id") == uid:
                u["title"] = bp["title"]
                u["guidebook"] = bp["guidebook"]
        
        days_map = {}
        if "days" in bp:
            days_map = bp["days"]
        elif "topics" in bp:
            start_day = (uid - 1) * 5 + 1
            for idx, top in enumerate(bp["topics"]):
                day_num = start_day + idx
                days_map[day_num] = (
                    f"День {day_num}: {top[0]}",
                    f"{top[0]} ({top[1]})",
                    top[2],
                    top[3],
                    top[4],
                    top[5]
                )

        # Обновляем 5 уроков этого юнита
        for day_num, day_info in days_map.items():
            l = next((x for x in lessons if x.get("day") == day_num), None)
            if not l:
                continue
            
            l["unit_id"] = uid
            l["unit_title"] = bp["title"]
            l["guidebook"] = bp["guidebook"]
            
            if isinstance(day_info, dict):
                l["title"] = day_info["title"]
                l["grammar"] = day_info["grammar"]
                l["rule_explanation"] = f"{bp['title']}. {day_info['grammar']}"
                l["dialogue_simulator"] = day_info.get("dialogue", {
                    "situation": f"Ситуация Дня {day_num}",
                    "example": "Guten Tag!",
                    "tips": day_info["grammar"]
                })
                
                # Собираем словарь
                new_vocab = []
                for item in day_info.get("vocab", []):
                    german = item[0]
                    art = item[1]
                    ru = item[2]
                    trans = item[3]
                    ex = item[4]
                    ex_ru = item[5]
                    new_vocab.append({
                        "german": german,
                        "article": art,
                        "gender": "m" if art == "der" else ("f" if art == "die" else ("n" if art == "das" else "")),
                        "transcription": trans,
                        "russian": ru,
                        "example": ex,
                        "example_translation": ex_ru,
                        "voice_hint": "de-DE-KatjaNeural"
                    })
                l["vocabulary"] = new_vocab
            elif isinstance(day_info, tuple):
                day_title = day_info[0]
                day_gram = day_info[1]
                v_list = day_info[2]
                sit = day_info[3]
                ex = day_info[4]
                tips = day_info[5]
                
                l["title"] = day_title
                l["grammar"] = day_gram
                l["rule_explanation"] = f"{bp['title']}. {day_gram}"
                l["dialogue_simulator"] = {
                    "situation": sit,
                    "example": ex,
                    "tips": tips
                }
                
                new_vocab = []
                for item in v_list:
                    german = item[0]
                    art = item[1]
                    ru = item[2]
                    trans = item[3]
                    ex_sent = item[4]
                    ex_ru = item[5]
                    new_vocab.append({
                        "german": german,
                        "article": art,
                        "gender": "m" if art == "der" else ("f" if art == "die" else ("n" if art == "das" else "")),
                        "transcription": trans,
                        "russian": ru,
                        "example": ex_sent,
                        "example_translation": ex_ru,
                        "voice_hint": "de-DE-KatjaNeural"
                    })
                l["vocabulary"] = new_vocab

    # 2. Обогащаем динамические юниты 13 до 36
    for uid in range(13, 37):
        dyn = generate_dynamic_unit(uid)
        if not dyn:
            continue
        
        # Обновляем units в json
        for u in course.get("units", []):
            if u.get("id") == uid:
                u["title"] = dyn["title"]
                u["guidebook"] = dyn["guidebook"]
        
        start_day = (uid - 1) * 5 + 1
        for day_offset in range(5):
            curr_day = start_day + day_offset
            l = next((x for x in lessons if x.get("day") == curr_day), None)
            if not l:
                continue
            
            day_data = dyn["days"][day_offset]
            sub_title = day_data[0]
            items = day_data[1]
            
            l["unit_id"] = uid
            l["unit_title"] = dyn["title"]
            l["title"] = f"День {curr_day}: {sub_title}"
            l["grammar"] = f"Уверенное владение темой: {sub_title} на уровне {l['level']}."
            l["rule_explanation"] = f"{dyn['title']}. {sub_title}."
            l["guidebook"] = dyn["guidebook"]
            
            # Разбор слов и выражений
            new_vocab = []
            for itm in items:
                # Формат: "der Begriff (перевод)" или фраза
                match = re.match(r'^(der|die|das)\s+([^(]+)\s*\(([^)]+)\)', itm)
                if match:
                    art = match.group(1)
                    word = match.group(2).strip()
                    ru = match.group(3).strip()
                    full_g = f"{art} {word}"
                    new_vocab.append({
                        "german": full_g,
                        "article": art,
                        "gender": "m" if art == "der" else ("f" if art == "die" else "n"),
                        "transcription": f"[{full_g.lower()}]",
                        "russian": ru,
                        "example": f"{full_g} ist hier sehr wichtig.",
                        "example_translation": f"{ru} здесь очень важно.",
                        "voice_hint": "de-DE-KatjaNeural"
                    })
                else:
                    match_gen = re.match(r'^([^(]+)\s*\(([^)]+)\)', itm)
                    if match_gen:
                        de = match_gen.group(1).strip()
                        ru = match_gen.group(2).strip()
                        new_vocab.append({
                            "german": de,
                            "article": "",
                            "gender": "",
                            "transcription": f"[{de.lower()}]",
                            "russian": ru,
                            "example": f"{de}.",
                            "example_translation": f"{ru}.",
                            "voice_hint": "de-DE-KatjaNeural"
                        })
                    else:
                        new_vocab.append({
                            "german": itm,
                            "article": "",
                            "gender": "",
                            "transcription": "",
                            "russian": itm,
                            "example": f"{itm}.",
                            "example_translation": itm,
                            "voice_hint": "de-DE-KatjaNeural"
                        })
            
            l["vocabulary"] = new_vocab
            
            # Реалистичный диалог
            first_g = new_vocab[0]["german"] if new_vocab else "Guten Tag!"
            first_ru = new_vocab[0]["russian"] if new_vocab else ""
            l["dialogue_simulator"] = {
                "situation": f"Жизненная ситуация в Германии (День {curr_day}): {sub_title}",
                "example": f"Guten Tag! {first_g}",
                "tips": f"В этой ситуации ключевое — спокойствие и вежливая формулировка ({first_ru})."
            }

    # Сохраняем обновленный файл
    with open(COURSE_PATH, 'w', encoding='utf-8') as f:
        json.dump(course, f, ensure_ascii=False, indent=2)

    print("Курс успешно полностью обогащен и сохранен!")

if __name__ == "__main__":
    enrich_course()
