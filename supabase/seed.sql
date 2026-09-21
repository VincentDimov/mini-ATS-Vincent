-- Safe, fictional demo data. This seed never creates auth users or passwords.
-- Create an Auth user first, then insert its profile as described in README.md.

insert into public.organizations (name, website_url, industry, location)
values ('Acme Recruitment', 'https://acme.example', 'Recruitment', 'Stockholm')
on conflict (name) do nothing;

with acme as (
  select id from public.organizations where name = 'Acme Recruitment'
)
insert into public.jobs (
  organization_id, title, description, location, employment_type, notes, status
)
select
  acme.id,
  item.title,
  item.description,
  item.location,
  item.employment_type,
  item.notes,
  'active'
from acme
cross join (
  values
    (
      'Senior Backend Engineer',
      'Build reliable services and APIs for a growing B2B platform. You will work with TypeScript, PostgreSQL and cloud infrastructure.',
      'Stockholm / Hybrid',
      'Full-time',
      'Demo role for the ATS walkthrough'
    ),
    (
      'Product Designer',
      'Own product discovery and interaction design for a compact recruitment SaaS used by modern hiring teams.',
      'Remote, Sweden',
      'Full-time',
      'Demo role for the ATS walkthrough'
    )
) as item(title, description, location, employment_type, notes)
where not exists (
  select 1
  from public.jobs j
  where j.organization_id = acme.id
    and j.title = item.title
);

with acme as (
  select id from public.organizations where name = 'Acme Recruitment'
), demo_candidates as (
  select * from (values
    ('Senior Backend Engineer', 'Maya Lind', 'maya.lind@example.test', '+46 70 111 22 33', 'Staff Backend Engineer', 'Northstar Labs', 'new', 'Strong API and distributed-systems background.'),
    ('Senior Backend Engineer', 'Elias Berg', 'elias.berg@example.test', '+46 70 222 33 44', 'Backend Engineer', 'Kiteworks', 'screening', 'Previously built payment and event-processing systems.'),
    ('Senior Backend Engineer', 'Nora Sten', 'nora.sten@example.test', '+46 70 333 44 55', 'Platform Engineer', 'Cloud Ridge', 'interview', 'Platform and SRE experience; enjoys mentoring.'),
    ('Senior Backend Engineer', 'Adam Nyström', 'adam.nystrom@example.test', '+46 70 444 55 66', 'Senior Software Engineer', 'Atlas Data', 'offered', 'Experienced TypeScript developer with product focus.'),
    ('Senior Backend Engineer', 'Lina Öberg', 'lina.oberg@example.test', '+46 70 555 66 77', 'Software Engineer', 'Cedar Systems', 'rejected', 'Relevant profile, but timing did not align.'),
    ('Product Designer', 'Oskar Wallin', 'oskar.wallin@example.test', '+46 70 666 77 88', 'Product Designer', 'Studio Dot', 'new', 'B2B workflow and design-systems experience.'),
    ('Product Designer', 'Sara Holm', 'sara.holm@example.test', '+46 70 777 88 99', 'Senior UX Designer', 'Field Notes', 'screening', 'Research-led designer with SaaS experience.'),
    ('Product Designer', 'Vera Ahl', 'vera.ahl@example.test', '+46 70 888 99 00', 'Product Designer', 'Orbit', 'interview', 'Led discovery and delivery for complex internal tools.')
  ) as c(job_title, full_name, email, phone, current_title, current_company, pipeline_stage, notes)
)
insert into public.candidates (
  organization_id, job_id, full_name, email, phone, current_title, current_company, pipeline_stage, notes
)
select
  acme.id,
  jobs.id,
  demo_candidates.full_name,
  demo_candidates.email,
  demo_candidates.phone,
  demo_candidates.current_title,
  demo_candidates.current_company,
  demo_candidates.pipeline_stage,
  demo_candidates.notes
from demo_candidates
join public.jobs on jobs.title = demo_candidates.job_title
join acme on acme.id = jobs.organization_id
on conflict (job_id, email) do nothing;
