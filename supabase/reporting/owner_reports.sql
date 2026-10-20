-- Run only in the Supabase project owner's SQL Editor. All dates are Vietnam dates.
-- Change the interval in each `bounds` CTE for another selected period.

-- 1. Recorded page views today (Asia/Ho_Chi_Minh).
select coalesce(sum(page_views), 0) as recorded_page_views_today
from analytics.analytics_daily_totals
where site_id = 'no-bloom'
  and reporting_date = (now() at time zone 'Asia/Ho_Chi_Minh')::date;

-- 2. Historical recorded page views (daily totals survive detail retention).
select coalesce(sum(page_views), 0) as total_recorded_page_views
from analytics.analytics_daily_totals where site_id = 'no-bloom';

-- 3. Daily views for the last seven Vietnam calendar dates.
with bounds as (select (now() at time zone 'Asia/Ho_Chi_Minh')::date as today)
select days.reporting_date, coalesce(t.page_views, 0) as recorded_page_views
from bounds, lateral generate_series(bounds.today - 6, bounds.today, interval '1 day') as days(reporting_date)
left join analytics.analytics_daily_totals t
  on t.site_id = 'no-bloom' and t.reporting_date = days.reporting_date::date
order by days.reporting_date;

-- 4. Estimated unique browsers and identifier coverage over the selected
-- seven-day interval. `null` means that the requested period predates retained
-- detail; do not present it as zero or as a lifetime unique count.
with bounds as (
  select (now() at time zone 'Asia/Ho_Chi_Minh')::date - 6 as start_date,
         (now() at time zone 'Asia/Ho_Chi_Minh')::date + 1 as end_date
), utc_bounds as (
  select start_date::timestamp at time zone 'Asia/Ho_Chi_Minh' as start_utc,
         end_date::timestamp at time zone 'Asia/Ho_Chi_Minh' as end_utc from bounds
)
select utc_bounds.start_utc, utc_bounds.end_utc,
       utc_bounds.start_utc >= now() - interval '30 days' as detail_supported,
       case when utc_bounds.start_utc >= now() - interval '30 days'
         then count(distinct e.visitor_id) else null end as estimated_unique_browsers,
       case when utc_bounds.start_utc >= now() - interval '30 days'
         then count(e.event_id) else null end as detailed_page_views,
       case when utc_bounds.start_utc >= now() - interval '30 days'
         then count(e.visitor_id) else null end as views_with_identifier,
       case when utc_bounds.start_utc >= now() - interval '30 days' and count(e.event_id) > 0
         then round(100.0 * count(e.visitor_id) / count(e.event_id), 1) else null end as identifier_coverage_percent
from utc_bounds
left join analytics.analytics_events e on e.site_id = 'no-bloom'
  and e.received_at >= utc_bounds.start_utc and e.received_at < utc_bounds.end_utc
group by utc_bounds.start_utc, utc_bounds.end_utc;

-- 5. Coarse source categories, only for a fully retained interval.
with bounds as (
  select ((now() at time zone 'Asia/Ho_Chi_Minh')::date - 6)::timestamp at time zone 'Asia/Ho_Chi_Minh' as start_utc,
         ((now() at time zone 'Asia/Ho_Chi_Minh')::date + 1)::timestamp at time zone 'Asia/Ho_Chi_Minh' as end_utc
)
select e.source_category, count(*) as recorded_page_views
from analytics.analytics_events e cross join bounds
where e.site_id = 'no-bloom' and e.received_at >= bounds.start_utc and e.received_at < bounds.end_utc
  and bounds.start_utc >= now() - interval '30 days'
group by e.source_category order by recorded_page_views desc, e.source_category;
