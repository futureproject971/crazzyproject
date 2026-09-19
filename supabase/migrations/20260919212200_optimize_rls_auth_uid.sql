-- CRAZZY PROJECT - optimize RLS auth.uid() evaluation without changing authorization.
begin;


-- ============================================================
-- RLS PERFORMANCE: avoid re-evaluating auth.uid() for every row.
-- Preserve each policy expression and only wrap direct auth.uid() calls in a scalar
-- subquery so Postgres can use an initPlan.
-- ============================================================
do $$
declare
  pol record;
  stmt text;
  new_qual text;
  new_check text;
begin
  for pol in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (
        (coalesce(qual, '') like '%auth.uid()%' and coalesce(qual, '') not ilike '%select auth.uid()%')
        or
        (coalesce(with_check, '') like '%auth.uid()%' and coalesce(with_check, '') not ilike '%select auth.uid()%')
      )
  loop
    new_qual := case when pol.qual is null then null else replace(pol.qual, 'auth.uid()', '(select auth.uid())') end;
    new_check := case when pol.with_check is null then null else replace(pol.with_check, 'auth.uid()', '(select auth.uid())') end;

    stmt := format('alter policy %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    if new_qual is not null then
      stmt := stmt || format(' using (%s)', new_qual);
    end if;
    if new_check is not null then
      stmt := stmt || format(' with check (%s)', new_check);
    end if;
    execute stmt;
  end loop;
end
$$;

commit;
