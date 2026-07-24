export interface UserResponse {
  id: string;
  email: string;
  username: string;
  display_name: string;
  is_active: boolean;
  is_admin: boolean;
  email_verified_at: string | null;
}

export interface UserProfileResponse {
  id: string;
  email: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  locale: string;
  timezone: string;
  is_active: boolean;
  is_admin: boolean;
  deletion_scheduled_at: string | null;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
  display_name: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UpdateProfilePayload {
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  locale?: string;
  timezone?: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export interface ApiErrorBody {
  detail: string | { msg: string; loc: (string | number)[] }[];
}

// --- Catalog domain types ---

export type ContributorRole =
  | "author"
  | "co_author"
  | "translator"
  | "illustrator"
  | "editor"
  | "narrator"
  | "foreword"
  | "other";

export type ReleaseFormat = "hardcover" | "paperback" | "ebook" | "audiobook" | "other";

export type ISBNKind = "isbn10" | "isbn13" | "asin" | "other";

export type EntityType = "book" | "release" | "contributor";

export type ChangeSource = "admin" | "contribution" | "external_sync" | "system";

export type ReviewSort = "created_at" | "rating";

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface BookResponse {
  id: string;
  title: string;
  original_title: string | null;
  original_language: string | null;
  first_publication_year: number | null;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface ISBNResponse {
  id: string;
  code_normalized: string;
  code_original: string;
  kind: ISBNKind;
}

export interface ReleaseWithISBNsResponse {
  id: string;
  format: ReleaseFormat;
  publisher: string;
  published_year: number | null;
  language: string;
  page_count: number | null;
  duration_minutes: number | null;
  cover_image_url: string | null;
  description_override: string | null;
  isbns: ISBNResponse[];
  average_rating: number | null;
  rating_count: number;
}

export interface BookWithReleasesResponse extends BookResponse {
  releases: ReleaseWithISBNsResponse[];
  average_rating: number | null;
  rating_count: number;
}

export interface CreateBookPayload {
  title: string;
  original_title?: string | null;
  original_language?: string | null;
  first_publication_year?: number | null;
  description: string;
}

export interface UpdateBookPayload {
  title?: string;
  original_title?: string | null;
  original_language?: string | null;
  first_publication_year?: number | null;
  description?: string;
}

export interface CreateReleasePayload {
  book_id: string;
  format: ReleaseFormat;
  publisher: string;
  published_year?: number | null;
  language: string;
  page_count?: number | null;
  duration_minutes?: number | null;
  cover_image_url?: string | null;
  description_override?: string | null;
}

export interface UpdateReleasePayload {
  format?: ReleaseFormat;
  publisher?: string;
  published_year?: number | null;
  language?: string;
  page_count?: number | null;
  duration_minutes?: number | null;
  cover_image_url?: string | null;
  description_override?: string | null;
}

export interface AddContributorPayload {
  contributor_id: string;
  role: ContributorRole;
}

export interface AddContributorResult {
  status: "created" | "already_existed";
}

export interface ContributorResponse {
  id: string;
  full_name: string;
  sort_name: string;
  birth_year: number | null;
  death_year: number | null;
  bio: string | null;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface ContributorBookSummary {
  id: string;
  title: string;
}

export interface ContributorReleaseSummary {
  id: string;
  format: ReleaseFormat;
  publisher: string;
  language: string;
}

export interface ContributorDetailResponse extends ContributorResponse {
  books_by_role: Partial<Record<ContributorRole, ContributorBookSummary[]>>;
  releases_by_role: Partial<Record<ContributorRole, ContributorReleaseSummary[]>>;
}

export interface CreateContributorPayload {
  full_name: string;
  sort_name: string;
  birth_year?: number | null;
  death_year?: number | null;
  bio?: string | null;
}

export interface UpdateContributorPayload {
  full_name?: string;
  sort_name?: string;
  birth_year?: number | null;
  death_year?: number | null;
  bio?: string | null;
}

export interface ExternalSearchHit {
  source: string;
  source_id: string;
  title: string;
  isbns: string[];
  authors: string[];
  cover_image_url: string | null;
}

export interface ExternalSearchResponse {
  query: string;
  hits: ExternalSearchHit[];
  partial_failures: Record<string, string>;
}

export interface ImportBookPayload {
  source: string;
  source_id: string;
}

export interface EntityVersionResponse {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  version_number: number;
  changed_by_user_id: string | null;
  change_source: ChangeSource;
  contribution_id: string | null;
  created_at: string;
}

export interface EntityVersionDetailResponse extends EntityVersionResponse {
  snapshot: Record<string, unknown>;
}

export interface ReviewResponse {
  id: string;
  user_id: string | null;
  book_id: string | null;
  release_id: string | null;
  rating: number | null;
  title: string | null;
  body: string | null;
  is_public: boolean;
  contains_spoilers: boolean;
  created_at: string;
  updated_at: string;
}

export interface BookListParams {
  skip?: number;
  limit?: number;
  title?: string;
  author?: string;
  language?: string;
}

export interface ContributorListParams {
  skip?: number;
  limit?: number;
  name?: string;
  role?: ContributorRole;
}

// --- Contributions domain types ---

export type ContributionKind =
  | "new_book"
  | "new_release"
  | "new_contributor"
  | "edit_book"
  | "edit_release"
  | "edit_contributor";

export type ContributionStatus =
  "draft" | "submitted" | "under_review" | "approved" | "rejected" | "merged";

export interface CreateContributionPayload {
  kind: ContributionKind;
  target_id?: string | null;
  payload: Record<string, unknown>;
}

export interface UpdateContributionPayload {
  payload: Record<string, unknown>;
}

export interface ContributionResponse {
  id: string;
  user_id: string;
  kind: ContributionKind;
  target_id: string | null;
  payload: Record<string, unknown>;
  status: ContributionStatus;
  reviewer_id: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

// --- Collections domain types ---

export interface CollectionResponse {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  cover_image_url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CollectionItemResponse {
  id: string;
  collection_id: string;
  book_id: string | null;
  release_id: string | null;
  position: number;
  added_at: string;
  note: string | null;
}

export interface CollectionDetailResponse extends CollectionResponse {
  items: Page<CollectionItemResponse>;
}

export interface CreateCollectionPayload {
  name: string;
  description?: string | null;
  is_public?: boolean;
  cover_image_url?: string | null;
}

export interface UpdateCollectionPayload {
  name?: string;
  description?: string | null;
  is_public?: boolean;
  cover_image_url?: string | null;
}

export interface AddCollectionItemPayload {
  book_id?: string | null;
  release_id?: string | null;
  note?: string | null;
}

export interface UpdateCollectionItemPayload {
  position?: number;
  note?: string | null;
}

export interface CollectionListParams {
  skip?: number;
  limit?: number;
}

export interface CollectionItemListParams {
  items_skip?: number;
  items_limit?: number;
}

// --- Reviews domain types (extends Block 2's ReviewResponse) ---

export interface CreateReviewPayload {
  book_id?: string | null;
  release_id?: string | null;
  rating?: number | null;
  title?: string | null;
  body?: string | null;
  is_public?: boolean;
  contains_spoilers?: boolean;
}

export interface UpdateReviewPayload {
  rating?: number | null;
  title?: string | null;
  body?: string | null;
  is_public?: boolean;
  contains_spoilers?: boolean;
}

// --- Statuses domain types ---

export type BookStatusKind =
  "owned" | "wishlist" | "pre_order" | "lent_out" | "borrowed" | "gifted_away" | "sold" | "lost";

export interface BookStatusResponse {
  id: string;
  user_id: string;
  book_id: string | null;
  release_id: string | null;
  status: BookStatusKind;
  acquired_at: string | null;
  notes: string | null;
  lent_to_user_id: string | null;
  lent_to_name: string | null;
  lent_at: string | null;
  returned_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateStatusPayload {
  book_id?: string | null;
  release_id?: string | null;
  status: BookStatusKind;
  notes?: string | null;
}

export interface UpdateStatusPayload {
  status?: BookStatusKind;
  notes?: string | null;
}

export interface LendStatusPayload {
  lent_to_user_id?: string | null;
  lent_to_name?: string | null;
}

export type StatusViewSort = "acquired_at" | "title";

export interface StatusViewParams {
  sort?: StatusViewSort;
  skip?: number;
  limit?: number;
}

// --- Share domain types ---

export interface SharePayload {
  friend_id: string;
  message: string;
}

// --- Reading domain types ---

export type PositionUnit = "page" | "percent" | "location" | "timestamp";

export interface ReadingSessionResponse {
  id: string;
  user_id: string;
  release_id: string;
  started_at: string;
  ended_at: string | null;
  position_start: number | null;
  position_end: number | null;
  position_unit: PositionUnit | null;
  pages_read: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateReadingSessionPayload {
  release_id: string;
  position_start?: number | null;
  position_unit?: PositionUnit | null;
}

export interface StopReadingSessionPayload {
  release_id: string;
  position_end?: number | null;
  notes?: string | null;
}

export interface UpdateReadingSessionPayload {
  started_at?: string;
  ended_at?: string | null;
  position_start?: number | null;
  position_end?: number | null;
  position_unit?: PositionUnit | null;
  pages_read?: number | null;
  notes?: string | null;
}

export type ReadingStatsPeriod = "week" | "month" | "year" | "all";

export interface ReadingStatsResponse {
  total_minutes: number;
  total_sessions: number;
  unique_books: number;
  total_pages: number;
}

export interface StreakResponse {
  current_streak_days: number;
  longest_streak_days: number;
}

export interface TimelineEntry {
  date: string;
  total_minutes: number;
  sessions: number;
  pages_read: number;
}

export interface TimelineResponse {
  items: TimelineEntry[];
}

export interface ReadingSessionListParams {
  release_id?: string;
}

// --- Friends domain types ---

export type FriendshipStatus = "pending" | "accepted" | "declined" | "blocked";

export interface FriendResponse {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  since: string;
}

export interface FriendRequestResponse {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  responded_at: string | null;
}

export interface SendFriendRequestPayload {
  username: string;
}

export interface PublicUserProfileResponse {
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  collections: Page<CollectionResponse>;
}

// --- Chat domain types ---

export interface ChatThreadResponse {
  id: string;
  user_a_id: string;
  user_b_id: string;
  last_message_at: string | null;
  created_at: string;
}

export interface ChatMessageResponse {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  attachment_book_id: string | null;
  attachment_collection_id: string | null;
  read_at: string | null;
  created_at: string;
}

export interface ChatThreadWithLastMessageResponse extends ChatThreadResponse {
  last_message: ChatMessageResponse | null;
}

export interface StartChatThreadPayload {
  recipient_id: string;
}

export interface SendChatMessagePayload {
  body: string;
  attachment_book_id?: string;
  attachment_collection_id?: string;
}

export interface ListMessagesParams {
  before?: string;
  limit?: number;
}

// --- AI domain types ---

export interface RecommendRequest {
  n?: number;
}

export interface RecommendResponse {
  book_ids: string[];
}

export interface SummaryRequest {
  text: string;
}

export interface SummaryResponse {
  summary: string;
}

export interface TagSuggestRequest {
  book_id: string;
}

export interface TagSuggestResponse {
  tags: string[];
}

// --- Admin domain types ---

export interface AdminUserResponse {
  id: string;
  email: string;
  username: string;
  display_name: string;
  is_active: boolean;
  is_admin: boolean;
}

export interface AdminUserListParams {
  skip?: number;
  limit?: number;
  email?: string;
  username?: string;
  is_active?: boolean;
  is_admin?: boolean;
}

export type AuditAction =
  | "approve_contribution"
  | "reject_contribution"
  | "claim_contribution"
  | "activate_user"
  | "deactivate_user"
  | "promote_user"
  | "demote_user";

export type AuditTargetType = "contribution" | "user";

export interface AuditLogResponse {
  id: string;
  actor_id: string;
  action: AuditAction;
  target_type: AuditTargetType;
  target_id: string;
  audit_metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

export interface AdminAuditLogListParams {
  skip?: number;
  limit?: number;
  actor_id?: string;
  action?: AuditAction;
  target_type?: AuditTargetType;
  start_date?: string;
  end_date?: string;
}

export interface AdminContributionResponse {
  id: string;
  user_id: string;
  kind: ContributionKind;
  target_id: string | null;
  payload: Record<string, unknown>;
  status: ContributionStatus;
  reviewer_id: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
  warnings: string[];
}

export interface ContributionDiffResponse {
  proposed: Record<string, unknown>;
  current: Record<string, unknown> | null;
  warnings: string[];
}

export interface RejectContributionPayload {
  notes: string;
}

export interface PasswordResetTokenResponse {
  reset_token: string;
}

export type CatalogImportProfile = "books" | "comics" | "manga";

export interface CatalogImportRequest {
  profile: CatalogImportProfile;
}

export interface CatalogImportJobStatusResponse {
  job_id: string;
  status: string;
  result?: Record<string, number> | null;
}
