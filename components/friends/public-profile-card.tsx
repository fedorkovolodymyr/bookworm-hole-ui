import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { PublicUserProfileResponse } from "@/lib/api/types";

export function PublicProfileCard({
  profile,
  action,
}: {
  profile: PublicUserProfileResponse;
  action?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar>
            {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.display_name} />}
            <AvatarFallback>{profile.display_name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium">{profile.display_name}</p>
            <p className="text-muted-foreground text-xs">{profile.username}</p>
            {profile.bio && <p className="text-muted-foreground text-xs">{profile.bio}</p>}
          </div>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}
