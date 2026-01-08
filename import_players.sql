-- Import players from CSV
-- First, check for duplicates and only insert new players

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'Vovchik', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'Vovchik'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'Dima', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'Dima'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'ולרה ביקוב', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'ולרה ביקוב'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'אולגה כדורעף', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'אולגה כדורעף'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'Yulia Rudyak', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'Yulia Rudyak'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'Elena Vostrikova', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'Elena Vostrikova'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'Александр', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'Александр'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'ויקטור כדורעף', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'ויקטור כדורעף'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'אלכסיי כדורעף', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'אלכסיי כדורעף'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'Dovydas Grybauskas', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'Dovydas Grybauskas'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'Tima Y', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'Tima Y'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'D A', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'D A'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'ויטלי כדורעף', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'ויטלי כדורעף'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'Michael', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'Michael'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'Антон', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'Антон'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'איליה סוחנוב', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'איליה סוחנוב'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'lis', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'lis'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'Vladimir Rudyak', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'Vladimir Rudyak'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'Alexey Kh', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'Alexey Kh'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'Miron Andrusenko', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'Miron Andrusenko'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'Stanislav', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'Stanislav'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'Pavel Altshuler', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'Pavel Altshuler'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'Bog Dmi', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'Bog Dmi'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'פבל כדורעף', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'פבל כדורעף'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'סטס ביאליק כדורעף', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'סטס ביאליק כדורעף'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'Alexey Leonidovych', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'Alexey Leonidovych'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'Micky', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'Micky'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'Liya T', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'Liya T'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'דני ק. ביאליק', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'דני ק. ביאליק'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'דב', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'דב'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'Александр', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'Александр'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'Alex Merphi', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'Alex Merphi'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'מישה כדורעף', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'מישה כדורעף'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'אלина כדורעף', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'אלина כדורעף'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'Ирочка Билера', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'Ирочка Билера'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'Dan', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'Dan'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'Аlex', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'Аlex'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'Aleksandr אלכסנדר', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'Aleksandr אלכסנדר'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'Карина', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'Карина'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'רמיל', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'רמיל'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'Mili', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'Mili'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'אניה כדורעף', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'אניה כדורעף'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT '🔥 гиена 🔥', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = '🔥 гиена 🔥'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'Zhenya Trevogina', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'Zhenya Trevogina'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'Sergei', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'Sergei'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'Alex Ra', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'Alex Ra'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'Abcd', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'Abcd'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'Mark', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'Mark'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'Maria', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'Maria'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'АдАм', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'АдАм'
);

INSERT INTO players (display_name, created_at, updated_at)
SELECT 'volleyball_party', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM players WHERE display_name = 'volleyball_party'
);

