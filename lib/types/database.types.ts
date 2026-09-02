/**
 * Tipos do banco Sponsas.
 *
 * Escrito à mão a partir de supabase/migrations/0001_init.sql.
 * Depois de rodar a migration, regenerar com:
 *   npx supabase gen types typescript --project-id <ref> > lib/types/database.types.ts
 */

export type ProfileType = "athlete" | "company";
export type OpportunityStatus = "open" | "closed";
export type ApplicationStatus = "pending" | "accepted" | "rejected";
export type ProposalStatus = "pending" | "accepted" | "rejected" | "withdrawn";
export type SponsorshipStatus = "active" | "ended" | "cancelled";
export type DeliverableStatus = "pending" | "submitted" | "approved" | "rejected";
export type PlanTier = "free" | "pro";
export type SubscriptionStatus = "active" | "cancelled" | "past_due";

type Timestamps = { created_at: string };

export interface Profile {
  id: string;
  type: ProfileType;
  name: string;
  photo_url: string | null;
  city: string | null;
  state: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface AthleteProfile {
  profile_id: string;
  modality: string | null;
  category: string | null;
  team: string | null;
  car: string | null;
  championship: string | null;
  results: string | null;
  desired_value_min: number | null;
  desired_value_max: number | null;
  sponsor_categories: string[] | null;
  offered_deliverables: string[] | null;
  availability_notes: string | null;
  updated_at: string;
}

export interface CompanyProfile {
  profile_id: string;
  segment: string | null;
  website: string | null;
  instagram: string | null;
  description: string | null;
  campaign_goal: string | null;
  target_audience: string | null;
  budget: number | null;
  campaign_duration_months: number | null;
  region_of_interest: string | null;
  updated_at: string;
}

export interface SocialLink {
  id: string;
  profile_id: string;
  platform: string;
  url: string | null;
  followers: number | null;
  avg_reach: number | null;
  engagement_rate: number | null;
  updated_at: string;
}

export interface Opportunity extends Timestamps {
  id: string;
  company_id: string;
  title: string;
  budget: number | null;
  duration_months: number | null;
  region: string | null;
  expected_deliverables: string[] | null;
  description: string | null;
  status: OpportunityStatus;
}

export interface Application extends Timestamps {
  id: string;
  opportunity_id: string;
  athlete_id: string;
  message: string | null;
  status: ApplicationStatus;
}

export interface Proposal extends Timestamps {
  id: string;
  from_profile_id: string;
  to_profile_id: string;
  opportunity_id: string | null;
  value: number | null;
  duration_months: number | null;
  deliverables: string[] | null;
  message: string | null;
  status: ProposalStatus;
}

export interface Sponsorship extends Timestamps {
  id: string;
  proposal_id: string | null;
  athlete_id: string;
  company_id: string;
  value: number | null;
  duration_months: number | null;
  start_date: string;
  status: SponsorshipStatus;
}

export interface Deliverable extends Timestamps {
  id: string;
  sponsorship_id: string;
  type: string;
  description: string | null;
  due_date: string | null;
  status: DeliverableStatus;
}

export interface DeliverableProof {
  id: string;
  deliverable_id: string;
  kind: string;
  url: string;
  submitted_at: string;
}

export interface Subscription {
  profile_id: string;
  plan: PlanTier;
  status: SubscriptionStatus;
  started_at: string;
  renewed_until: string | null;
}

type Row<T> = T;
type Insert<T, Optional extends keyof T = never> = Omit<T, Optional> &
  Partial<Pick<T, Optional>>;
type Update<T> = Partial<T>;

type TableDef<T, InsertOptional extends keyof T = never> = {
  Row: Row<T>;
  Insert: Insert<T, InsertOptional>;
  Update: Update<T>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: TableDef<Profile, "photo_url" | "city" | "state" | "bio" | "created_at" | "updated_at">;
      athlete_profiles: TableDef<AthleteProfile, Exclude<keyof AthleteProfile, "profile_id">>;
      company_profiles: TableDef<CompanyProfile, Exclude<keyof CompanyProfile, "profile_id">>;
      social_links: TableDef<SocialLink, "id" | "url" | "followers" | "avg_reach" | "engagement_rate" | "updated_at">;
      opportunities: TableDef<Opportunity, "id" | "budget" | "duration_months" | "region" | "expected_deliverables" | "description" | "status" | "created_at">;
      applications: TableDef<Application, "id" | "message" | "status" | "created_at">;
      proposals: TableDef<Proposal, "id" | "opportunity_id" | "value" | "duration_months" | "deliverables" | "message" | "status" | "created_at">;
      sponsorships: TableDef<Sponsorship, "id" | "proposal_id" | "value" | "duration_months" | "start_date" | "status" | "created_at">;
      deliverables: TableDef<Deliverable, "id" | "description" | "due_date" | "status" | "created_at">;
      deliverable_proofs: TableDef<DeliverableProof, "id" | "submitted_at">;
      subscriptions: TableDef<Subscription, "plan" | "status" | "started_at" | "renewed_until">;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      profile_type: ProfileType;
      opportunity_status: OpportunityStatus;
      application_status: ApplicationStatus;
      proposal_status: ProposalStatus;
      sponsorship_status: SponsorshipStatus;
      deliverable_status: DeliverableStatus;
      plan_tier: PlanTier;
      subscription_status: SubscriptionStatus;
    };
  };
}
