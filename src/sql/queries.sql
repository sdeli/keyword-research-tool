delete from keyword;

select * from keyword;
select * from keyword offset 200;

select
    count(*)
from
    keyword k where keyword like '%gorilla%';

select
    count(*)
from keyword;`

select
    count(*)
from keyword where keyword like '%atom%';

select * from keyword where keyword in(
--    'majom rágóka',
    'majomparádé2',
    'majomkenyérfa2',
    'majomparádé2',
    'majomkenyér',
    'majomfa',
    'majom fajták'
    );

select * from keyword where "searchVolume" is not null;

select * from scrape_session;
select * from scrape_workflow;

select
    k."scrapeSessionId"
from
    keyword k;

select count(*) from keyword where "scrapeSessionId"='753be610-355a-11ea-92b4-01818489fea5' and "searchVolume" is not null;
