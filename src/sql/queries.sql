DELETE FROM
    keyword;

SELECT
    *
FROM
    keyword;

SELECT
    *
FROM
    keyword OFFSET 200;

SELECT
    count(*)
FROM
    keyword k
WHERE
    keyword LIKE '%gorilla%';

SELECT
    count(*)
FROM
    keyword;

SELECT
    count(*)
FROM
    keyword
WHERE
    keyword LIKE '%atom%';

SELECT
    *
FROM
    keyword
WHERE
    "searchVolume" IS NOT NULL;

SELECT
    *
FROM
    scrape_session;

SELECT
    *
FROM
    scrape_workflow;

SELECT
    k."scrapeSessionId"
FROM
    keyword k;

SELECT
    count(*)
FROM
    keyword
WHERE
    "scrapeSessionId" = '753be610-355a-11ea-92b4-01818489fea5'
    AND "searchVolume" IS NOT NULL;