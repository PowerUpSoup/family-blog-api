CREATE TABLE articles (
    id INTEGER PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    modified TIMESTAMP DEFAULT now() NOT NULL,
    authorId INTEGER
        REFERENCES users(id) ON DELETE CASCADE NOT NULL
);