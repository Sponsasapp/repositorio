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
  plan: PlanTier;
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

/**
 * Legado — `athlete_profiles` (1 linha por conta). A partir da migration 0014 a
 * parte esportiva do piloto vive em `athlete_modalities` (1 por modalidade). A
 * tabela antiga segue no banco só como origem da migração; o app usa
 * `AthleteModality`.
 */
export type AthleteProfile = {
  profile_id: string;
  modality: string | null;
  category: string | null;
  team: string | null;
  car: string | null;
  car_photo_url: string | null;
  championship: string | null;
  results: string | null;
  desired_value_min: number | null;
  desired_value_max: number | null;
  sponsor_categories: string[] | null;
  offered_deliverables: string[] | null;
  availability_notes: string | null;
  list_name: string | null;
  list_member: boolean;
  list_position: number | null;
  list_shark_tank: boolean;
  list_shark_tank_date: string | null;
  rank_score: number | null;
  rank_tier: RankTier | null;
  rank_factors: RankFactors | null;
  rank_updated_at: string | null;
  updated_at: string;
};

/** Parte esportiva do piloto, uma linha por (piloto, modalidade). */
export type AthleteModality = {
  id: string;
  profile_id: string;
  modality: string;
  category: string | null;
  results: string | null;
  availability_notes: string | null;
  offered_deliverables: string[];
  sponsor_categories: string[];
  desired_value_min: number | null;
  desired_value_max: number | null;
  list_name: string | null;
  list_member: boolean;
  list_position: number | null;
  list_shark_tank: boolean;
  list_shark_tank_date: string | null;
  rank_score: number | null;
  rank_tier: RankTier | null;
  rank_factors: RankFactors | null;
  rank_updated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AthleteCar = {
  id: string;
  athlete_id: string;
  modality: string;
  name: string;
  team: string | null;
  championships: string | null;
  photo_url: string | null;
  position: number;
  created_at: string;
};

export type AthleteAchievement = {
  id: string;
  athlete_id: string;
  modality: string;
  car_id: string | null;
  title: string;
  year: string | null;
  detail: string | null;
  position: number;
  created_at: string;
};

export type AthletePost = {
  id: string;
  athlete_id: string;
  platform: string;
  url: string;
  likes: number;
  posted_on: string | null;
  image_url: string | null;
  created_at: string;
};

export type AthleteRankSnapshot = {
  id: string;
  athlete_id: string;
  modality: string | null;
  score: number | null;
  tier: RankTier | null;
  captured_on: string;
  created_at: string;
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
  modalities: string[];
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
  modality: string;
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

export type NotificationType =
  | "proposal_received"
  | "proposal_accepted"
  | "application_received"
  | "application_accepted"
  | "deliverable_approved"
  | "deliverable_rejected"
  | "rank_up"
  | "rank_down"
  | "plan_expiring"
  | "message_received";

export type Notification = {
  id: string;
  profile_id: string;
  type: NotificationType;
  title: string;
  body: string;
  cta_label: string | null;
  cta_path: string | null;
  read_at: string | null;
  created_at: string;
};

export type Conversation = {
  id: string;
  profile_a: string;
  profile_b: string;
  last_message_at: string;
  created_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
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
        | "photo_url"
        | "city"
        | "state"
        | "bio"
        | "plan"
        | "created_at"
        | "updated_at"
      >;
      athlete_profiles: TableDef<
        AthleteProfile,
        Exclude<keyof AthleteProfile, "profile_id">
      >;
      athlete_modalities: TableDef<
        AthleteModality,
        Exclude<keyof AthleteModality, "profile_id" | "modality">
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
      athlete_cars: TableDef<
        AthleteCar,
        "id" | "team" | "championships" | "photo_url" | "position" | "created_at"
      >;
      athlete_achievements: TableDef<
        AthleteAchievement,
        "id" | "car_id" | "year" | "detail" | "position" | "created_at"
      >;
      athlete_rank_snapshots: TableDef<
        AthleteRankSnapshot,
        "id" | "modality" | "score" | "tier" | "captured_on" | "created_at"
      >;
      athlete_posts: TableDef<
        AthletePost,
        "id" | "likes" | "posted_on" | "image_url" | "created_at"
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
      notifications: TableDef<
        Notification,
        "id" | "cta_label" | "cta_path" | "read_at" | "created_at"
      >;
      conversations: TableDef<
        Conversation,
        "id" | "last_message_at" | "created_at"
      >;
      messages: TableDef<Message, "id" | "created_at" | "read_at">;
    };
    Views: Record<string, never>;
    Functions: {
      redeem_coupon: {
        Args: { p_user: string; p_code: string };
        Returns: string;
      };
      notify: {
        Args: {
          p_target: string;
          p_type: string;
          p_title: string;
          p_body: string;
          p_cta_label: string | null;
          p_cta_path: string | null;
        };
        Returns: string | null;
      };
      capture_rank_snapshots: {
        Args: Record<string, never>;
        Returns: number;
      };
      notify_expiring_plans: {
        Args: Record<string, never>;
        Returns: number;
      };
      get_or_create_conversation: {
        Args: { p_other: string };
        Returns: string | null;
      };
      mark_messages_read: {
        Args: { p_conversation: string };
        Returns: undefined;
      };
    };
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
