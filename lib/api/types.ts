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
