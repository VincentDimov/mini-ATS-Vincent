-- Safe, fictional demo data for the Mini ATS walkthrough.
-- Login-capable Auth users are deliberately provisioned separately through
-- Supabase Auth's Admin API; do not insert into auth.users from this file.

insert into public.organizations (name, website_url, industry, location)
values
  ('Northstar Cloud AB', 'https://northstar.example.test', 'B2B SaaS', 'Stockholm'),
  ('Lumen Design AB', 'https://lumen.example.test', 'Product design', 'Gothenburg'),
  ('Fjord Logistics AB', 'https://fjord.example.test', 'Logistics', 'Malmo')
on conflict (name) do nothing;

with demo_jobs as (
  select * from (values
    ('Northstar Cloud AB', 'Senior Fullstack Developer', 'Build product features and reliable integrations for a growing B2B SaaS platform.', 'Stockholm / Hybrid', 'Full-time', 'TypeScript, React and PostgreSQL experience are valued.'),
    ('Northstar Cloud AB', 'Data Analyst', 'Turn customer and product data into clear insights that guide product and commercial decisions.', 'Stockholm / Hybrid', 'Full-time', 'SQL and stakeholder communication are central to the role.'),
    ('Northstar Cloud AB', 'Platform Engineer', 'Improve developer tooling, cloud infrastructure and operational reliability across product teams.', 'Remote, Sweden', 'Full-time', 'Kubernetes, CI/CD and observability experience are valued.'),
    ('Lumen Design AB', 'Product Designer', 'Lead discovery and interaction design for digital products used by small business teams.', 'Gothenburg / Hybrid', 'Full-time', 'Portfolio review is part of the process.'),
    ('Lumen Design AB', 'UX Researcher', 'Plan and run qualitative research that helps cross-functional teams understand customer needs.', 'Remote, Sweden', 'Full-time', 'Experience with B2B research is a plus.'),
    ('Lumen Design AB', 'Frontend Developer', 'Create accessible, polished interfaces in close collaboration with product designers and backend engineers.', 'Gothenburg / Hybrid', 'Full-time', 'React, TypeScript and modern CSS are central.'),
    ('Fjord Logistics AB', 'Transport Planner', 'Coordinate daily transport flows and improve delivery precision for Nordic customers.', 'Malmo', 'Full-time', 'Analytical planning and clear communication are essential.'),
    ('Fjord Logistics AB', 'Warehouse Coordinator', 'Support warehouse operations, inventory accuracy and safe, efficient daily routines.', 'Malmo', 'Full-time', 'Experience from warehouse or distribution operations is valuable.'),
    ('Fjord Logistics AB', 'Operations Manager', 'Lead continuous improvement across logistics operations, people and performance metrics.', 'Malmo / Hybrid', 'Full-time', 'Leadership experience and a structured improvement mindset are required.')
  ) as j(organization_name, title, description, location, employment_type, notes)
)
insert into public.jobs (
  organization_id, title, description, location, employment_type, notes, status
)
select
  organizations.id,
  demo_jobs.title,
  demo_jobs.description,
  demo_jobs.location,
  demo_jobs.employment_type,
  demo_jobs.notes,
  'active'
from demo_jobs
join public.organizations on organizations.name = demo_jobs.organization_name
where not exists (
  select 1
  from public.jobs
  where jobs.organization_id = organizations.id
    and jobs.title = demo_jobs.title
);

with demo_candidates as (
  select * from (values
    ('Northstar Cloud AB', 'Senior Fullstack Developer', 'Elin Karlsson', 'elin.karlsson@demo.test', '+46 70 101 11 01', 'Senior Fullstack Developer', 'Aurora Systems', 'new', 'Strong TypeScript and product engineering background.'),
    ('Northstar Cloud AB', 'Data Analyst', 'Marcus Lindberg', 'marcus.lindberg@demo.test', '+46 70 101 11 02', 'Data Analyst', 'Metric Labs', 'screening', 'Experienced in SQL, dashboards and commercial analytics.'),
    ('Northstar Cloud AB', 'Platform Engineer', 'Tove Ekstrom', 'tove.ekstrom@demo.test', '+46 70 101 11 03', 'Platform Engineer', 'Cloud Ridge', 'interview', 'Platform and SRE experience with a mentoring focus.'),
    ('Northstar Cloud AB', 'Senior Fullstack Developer', 'Leo Nyberg', 'leo.nyberg@demo.test', '+46 70 101 11 04', 'Software Engineer', 'Atlas Data', 'offered', 'Fullstack engineer with strong API and React experience.'),
    ('Northstar Cloud AB', 'Data Analyst', 'Fatima Hassan', 'fatima.hassan@demo.test', '+46 70 101 11 05', 'Business Analyst', 'Northline Retail', 'rejected', 'Relevant analytical profile; process concluded with another candidate.'),
    ('Lumen Design AB', 'Product Designer', 'Oskar Wallin', 'oskar.wallin@demo.test', '+46 70 202 22 01', 'Product Designer', 'Studio Dot', 'new', 'B2B workflow and design-system experience.'),
    ('Lumen Design AB', 'UX Researcher', 'Sara Holm', 'sara.holm@demo.test', '+46 70 202 22 02', 'Senior UX Researcher', 'Field Notes', 'screening', 'Research-led designer with SaaS experience.'),
    ('Lumen Design AB', 'Frontend Developer', 'Vera Ahl', 'vera.ahl@demo.test', '+46 70 202 22 03', 'Frontend Developer', 'Orbit', 'interview', 'Accessible interface work and close designer collaboration.'),
    ('Lumen Design AB', 'Product Designer', 'Noah Bergstrom', 'noah.bergstrom@demo.test', '+46 70 202 22 04', 'Digital Product Designer', 'Signal Works', 'offered', 'Strong discovery practice and concise product communication.'),
    ('Lumen Design AB', 'Frontend Developer', 'Amira Saleh', 'amira.saleh@demo.test', '+46 70 202 22 05', 'UI Engineer', 'Mosaic', 'rejected', 'Technically strong profile; role scope was not the right match.'),
    ('Fjord Logistics AB', 'Transport Planner', 'Jonas Svensson', 'jonas.svensson@demo.test', '+46 70 303 33 01', 'Transport Planner', 'Routewise', 'new', 'Route planning and carrier coordination experience.'),
    ('Fjord Logistics AB', 'Warehouse Coordinator', 'Klara Eriksson', 'klara.eriksson@demo.test', '+46 70 303 33 02', 'Warehouse Supervisor', 'Harbor Goods', 'screening', 'Hands-on operations profile with a safety-first approach.'),
    ('Fjord Logistics AB', 'Operations Manager', 'David Chen', 'david.chen@demo.test', '+46 70 303 33 03', 'Operations Manager', 'Flow Nordic', 'interview', 'Leads continuous improvement and team performance work.'),
    ('Fjord Logistics AB', 'Transport Planner', 'Maja Dahl', 'maja.dahl@demo.test', '+46 70 303 33 04', 'Logistics Coordinator', 'Freightline', 'offered', 'Structured planner with cross-border logistics experience.'),
    ('Fjord Logistics AB', 'Warehouse Coordinator', 'Isak Pettersson', 'isak.pettersson@demo.test', '+46 70 303 33 05', 'Inventory Controller', 'Distribution Hub', 'rejected', 'Relevant warehouse experience; hiring need changed during the process.')
  ) as c(organization_name, job_title, full_name, email, phone, current_title, current_company, pipeline_stage, notes)
)
insert into public.candidates (
  organization_id, job_id, full_name, email, phone, current_title, current_company, pipeline_stage, notes
)
select
  organizations.id,
  jobs.id,
  demo_candidates.full_name,
  demo_candidates.email,
  demo_candidates.phone,
  demo_candidates.current_title,
  demo_candidates.current_company,
  demo_candidates.pipeline_stage,
  demo_candidates.notes
from demo_candidates
join public.organizations on organizations.name = demo_candidates.organization_name
join public.jobs on jobs.organization_id = organizations.id
  and jobs.title = demo_candidates.job_title
on conflict (job_id, email) do nothing;
