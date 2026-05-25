import { Profile } from "./viewableProfile";

type Props = {
  profile: Pick<Profile, "firstName" | "lastName"> & Partial<Pick<Profile, "nickname">>;
};

export function getDisplayName({ profile }: Props) {
  const parts: string[] = [];

  if (profile.firstName) parts.push(profile.firstName);
  if (profile.lastName) parts.push(profile.lastName);

  const fullName = parts.join(" ");

  if (profile.nickname) return `${fullName} (${profile.nickname})`.trim();

  return fullName;
}
