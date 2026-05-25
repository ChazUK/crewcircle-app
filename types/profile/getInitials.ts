import { Profile } from "./viewableProfile";

type Props = {
  profile: Pick<Profile, "firstName" | "lastName">;
};

export function getInitials({ profile }: Props) {
  const first = profile.firstName[0];
  const last = profile.lastName[0];
  const combined = `${first}${last}`.trim();

  return combined.toUpperCase();
}
