/**
 * Tipos do banco Sponsas.
 *
 * Escrito à mão a partir de supabase/migrations/0001_init.sql.
 * Depois de rodar a migration, regenerar com:
 *   npx supabase gen types typescript --project-id <ref> > lib/types/database.types.ts
 *
 * Nota: os tipos de linha são `type` (não `interface`) de propósito — o
 * postgrest-js exige que sejam atribuíveis a Record<string, unknown>.
 */

export type ProfileType = "athlete" | "company";
export type OpportunityStatus = "open" | "closed";
export type ApplicationStatus = "pending" | "accepted" | "rejected";
export type ProposalStatus = "pending" | "accepted" | "rejected" | "withdrawn";
export type ProposalPaymentType = "cash" | "trade" | "mixed";
export type SponsorshipStatus = "active" | "ended" | "cancelled";
export type DeliverableStatus = "pending" | "submitted" | "approved" | "rejected";
export type PlanTier = "free" | "pro";
export type SubscriptionStatus = "active" | "cancelled" | "past_due";

export type Profile = {
  id: string;
  type: ProfileType;
  name: string;
  photo_url: string | null;
  city: string | null;
  state: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
};

export type RankTier = "iniciante" | "bronze" | "prata" | "ouro" | "elite";

export type RankFactors = {
  prazo: number;
  demanda: number;
  engajamento: number;
  atividade: number;
  perfil: number;
  entregas_total: number;
  entregas_no_prazo: number;
  entregas_aprovadas: number;
};

export type AthleteProfile = {
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
  rank_score: number | null;
  rank_tier: RankTier | null;
  rank_factors: RankFactors | null;
  rank_updated_at: string | null;
  updated_at: string;
};

export type CompanyProfile = {
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
};

export type SocialLink = {
  id: string;
  profile_id: string;
  platform: string;
  url: string | null;
  followers: number | null;
  avg_reach: number | null;
  avg_interactions: number | null;
  engagement_rate: number | null;
  updated_at: string;
};

export type AthletePackage = {
  id: string;
  athlete_id: string;
  title: string;
  description: string | null;
  price: number | null;
  position: number;
  created_at: string;
};

export type Opportunity = {
  id: string;
  company_id: string;
  title: string;
  budget: number | null;
  duration_months: number | null;
  region: string | null;
  expected_deliverables: string[] | null;
  description: string | null;
  status: OpportunityStatus;
  created_at: string;
};

export type Application = {
  id: string;
  opportunity_id: string;
  athlete_id: string;
  message: string | null;
  status: ApplicationStatus;
  created_at: string;
};

export type Proposal = {
  id: string;
  from_profile_id: string;
  to_profile_id: string;
  opportunity_id: string | null;
  value: number | null;
  duration_months: number | null;
  deliverables: string[] | null;
  message: string | null;
  status: ProposalStatus;
  payment_type: ProposalPaymentType;
  trade_description: string | null;
  trade_value: number | null;
  created_at: string;
};

export type Sponsorship = {
  id: string;
  proposal_id: string | null;
  athlete_id: string;
  company_id: string;
  value: number | null;
  duration_months: number | null;
  start_date: string;
  status: SponsorshipStatus;
  payment_type: ProposalPaymentType;
  trade_description: string | null;
  trade_value: number | null;
  created_at: string;
};

export type Deliverable = {
  id: string;
  sponsorship_id: string;
  type: string;
  description: string | null;
  due_date: string | null;
  status: DeliverableStatus;
  created_at: string;
};

export type DeliverableProof = {
  id: string;
  deliverable_id: string;
  kind: string;
  url: string;
  submitted_at: string;
};

export type Subscription = {
  profile_id: string;
  plan: PlanTier;
  status: SubscriptionStatus;
  started_at: string;
  renewed_until: string | null;
};

type Insert<T, Optional extends keyof T = never> = Omit<T, Optional> &
  Partial<Pick<T, Optional>>;

type TableDef<T extends Record<string, unknown>, InsertOptional extends keyof T = never> = {
  Row: T;
  Insert: Insert<T, InsertOptional>;
  Update: Partial<T>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDef<
        Profile,
        "photo_url" | "city" | "state" | "bio" | "created_at" | "updated_at"
      >;
      athlete_profiles: TableDef<
        AthleteProfile,
        Exclude<keyof AthleteProfile, "profile_id">
      >;
      company_profiles: TableDef<
        CompanyProfile,
        Exclude<keyof CompanyProfile, "profile_id">
      >;
      social_links: TableDef<
        SocialLink,
        | "id"
        | "url"
        | "followers"
        | "avg_reach"
        | "avg_interactions"
        | "engagement_rate"
        | "updated_at"
      >;
      athlete_packages: TableDef<
        AthletePackage,
        "id" | "description" | "price" | "position" | "created_at"
      >;
      opportunities: TableDef<
        Opportunity,
        | "id"
        | "budget"
        | "duration_months"
        | "region"
        | "expected_deliverables"
        | "description"
        | "status"
        | "created_at"
      >;
      applications: TableDef<
        Application,
        "id" | "message" | "status" | "created_at"
      >;
      proposals: TableDef<
        Proposal,
        | "id"
        | "opportunity_id"
        | "value"
        | "duration_months"
        | "deliverables"
        | "message"
        | "status"
        | "payment_type"
        | "trade_description"
        | "trade_value"
        | "created_at"
      >;
      sponsorships: TableDef<
        Sponsorship,
        | "id"
        | "proposal_id"
        | "value"
        | "duration_months"
        | "start_date"
        | "status"
        | "payment_type"
        | "trade_description"
        | "trade_value"
        | "created_at"
      >;
      deliverables: TableDef<
        Deliverable,
        "id" | "description" | "due_date" | "status" | "created_at"
      >;
      deliverable_proofs: TableDef<DeliverableProof, "id" | "submitted_at">;
      subscriptions: TableDef<
        Subscription,
        "plan" | "status" | "started_at" | "renewed_until"
      >;
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
    CompositeTypes: Record<string, never>;
  };
};
