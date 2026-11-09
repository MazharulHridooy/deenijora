\set ON_ERROR_STOP 1
insert into auth.users values
 ('aaaaaaaa-0000-0000-0000-000000000001','a@x'),('bbbbbbbb-0000-0000-0000-000000000002','b@x'),
 ('cccccccc-0000-0000-0000-000000000003','c@x'),('dddddddd-0000-0000-0000-000000000004','admin@x');
update profiles set role='admin' where id='dddddddd-0000-0000-0000-000000000004';
create function t_as(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false) $$;
create function t_assert(ok boolean, msg text) returns void language plpgsql as $$
begin if not ok then raise exception 'FAIL: %', msg; end if; raise notice 'PASS: %', msg; end $$;
grant execute on function t_as, t_assert to authenticated, anon;

set role authenticated;
-- A creates biodata, tries to self-approve
select t_as('aaaaaaaa-0000-0000-0000-000000000001');
insert into biodatas (user_id,gender,birth_year,marital_status,district,education,occupation,salah,guardian_relation,consent_publish,status)
 values (auth.uid(),'male',1996,'never_married','ঢাকা','BSc','Engineer','five_daily','বাবা',true,'approved');
select t_assert((select status from biodatas where user_id=auth.uid())='pending', 'owner cannot self-approve (forced to pending)');
insert into biodata_private select id,'Abdullah','+8801711111111','Father','+8801722222222' from biodatas where user_id=auth.uid();
-- pending without consent blocked
do $$ begin
  update biodatas set consent_publish=false where user_id=auth.uid();
  raise exception 'FAIL: consent check missing';
exception when others then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'PASS: pending requires consent'; end $$;

-- B creates biodata
select t_as('bbbbbbbb-0000-0000-0000-000000000002');
insert into biodatas (user_id,gender,birth_year,marital_status,district,education,occupation,salah,guardian_relation,consent_publish,status)
 values (auth.uid(),'female',1999,'never_married','সিলেট','MA','Teacher','five_daily','মা',true,'pending');
insert into biodata_private select id,'Fatima','+8801733333333','Mother','+8801744444444' from biodatas where user_id=auth.uid();
select t_assert((select count(*) from biodatas)=1, 'B cannot see A pending biodata');
select t_assert((select count(*) from biodata_private)=1, 'B sees only own private row');
-- B cannot edit A's biodata
update biodatas set district='hack' where user_id='aaaaaaaa-0000-0000-0000-000000000001';
reset role; select t_assert((select district from biodatas where user_id='aaaaaaaa-0000-0000-0000-000000000001')='ঢাকা','B cannot edit A biodata'); set role authenticated;

-- send_interest before approval fails
do $$ begin
  perform send_interest((select id from biodatas where user_id='bbbbbbbb-0000-0000-0000-000000000002'),'hi');
  raise exception 'FAIL: unapproved could send';
exception when others then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'PASS: unapproved sender blocked (%)', sqlerrm; end $$;

-- Admin approves both
select t_as('dddddddd-0000-0000-0000-000000000004');
update biodatas set status='approved';
select t_assert((select count(*) from biodatas where status='approved' and approved_at is not null)=2, 'admin approves, approved_at set');
select t_assert((select count(*) from biodata_private)=2, 'admin sees all private rows');

-- C (no biodata) sees approved list but no private
select t_as('cccccccc-0000-0000-0000-000000000003');
select t_assert((select count(*) from biodatas)=2, 'logged-in user sees approved biodatas');
select t_assert((select count(*) from biodata_private)=0, 'others never see private contacts');
do $$ begin perform send_interest((select id from biodatas where gender='female'),'x'); raise exception 'FAIL';
exception when others then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'PASS: user without biodata cannot send interest'; end $$;
select record_view((select id from biodatas where gender='female'));
select record_view((select id from biodatas where gender='female'));
insert into favourites values (auth.uid(),(select id from biodatas where gender='female'),'like');

-- A sends interest to B, B accepts
select t_as('aaaaaaaa-0000-0000-0000-000000000001');
select send_interest((select id from biodatas where gender='female'),'আসসালামু আলাইকুম');
select t_assert((select count(*) from interest_requests)=1,'sender sees own request');
do $$ begin perform send_interest((select id from biodatas where gender='female'),'again'); raise exception 'FAIL';
exception when others then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'PASS: duplicate open request blocked'; end $$;
do $$ begin perform respond_interest((select id from interest_requests limit 1), true); raise exception 'FAIL';
exception when others then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'PASS: sender cannot accept own request'; end $$;

select t_as('bbbbbbbb-0000-0000-0000-000000000002');
select t_assert((select count(*) from interest_requests)=1,'recipient sees received request');
select t_assert(request_sender_code((select id from interest_requests limit 1)) like 'DJ-%','recipient sees sender code');
select respond_interest((select id from interest_requests limit 1), true);
select t_assert((select status from interest_requests limit 1)='accepted','recipient accepts');
select t_assert((my_stats()->>'views_30')::int=1 and (my_stats()->>'liked_me')::int=1 and (my_stats()->>'received')::int=1,'stats: 1 view (deduped), 1 like, 1 received');
update interest_requests set status='introduced';
reset role; select t_assert((select status from interest_requests limit 1)='accepted','non-admin cannot mark introduced'); set role authenticated;

-- C cannot see the request
select t_as('cccccccc-0000-0000-0000-000000000003');
select t_assert((select count(*) from interest_requests)=0,'third party cannot see requests');
-- owner edit of approved biodata goes back to pending
select t_as('aaaaaaaa-0000-0000-0000-000000000001');
update biodatas set occupation='Senior Engineer' where user_id=auth.uid();
select t_assert((select status from biodatas where user_id=auth.uid())='pending','edit of approved biodata returns to review');
-- anon sees nothing
reset role; set role anon; select t_as('');
select t_assert((select count(*) from biodatas)=0,'anonymous visitors see no biodatas');
reset role; set role authenticated;
-- delete my biodata
select t_as('bbbbbbbb-0000-0000-0000-000000000002');
select delete_my_biodata();
reset role;
select t_assert((select count(*) from biodatas where user_id='bbbbbbbb-0000-0000-0000-000000000002')=0 and (select count(*) from biodata_private)=1,'delete removes biodata + private + cascades');
