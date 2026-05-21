import type { CertificationEntry, ViewableProfile } from "@shared/profile/viewableProfile";
import { Chip } from "heroui-native";
import { Text, View } from "react-native";

import { formatCertificationExpiry } from "@/lib/profile/formatCertificationExpiry";

type Props = {
  profile: ViewableProfile;
};

const STATUS_COLOR = {
  "no-expiry": "default",
  valid: "success",
  "expiring-soon": "warning",
  expired: "danger",
} as const;

function hasCertifications(profile: ViewableProfile): profile is Extract<
  ViewableProfile,
  { certifications: CertificationEntry[] | undefined }
> & {
  certifications: CertificationEntry[];
} {
  return (
    "certifications" in profile &&
    Array.isArray(profile.certifications) &&
    profile.certifications.length > 0
  );
}

export function CertificationsSection({ profile }: Props) {
  if (!hasCertifications(profile)) return null;

  const now = Date.now();

  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-muted">Certifications</Text>
      <View className="gap-3">
        {profile.certifications.map((cert) => {
          const expiry = formatCertificationExpiry(cert.expiresAt, now);
          return (
            <View key={cert.id} className="gap-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-base font-medium text-foreground">{cert.name}</Text>
                <Chip size="sm" variant="secondary" color={STATUS_COLOR[expiry.status]}>
                  {expiry.label}
                </Chip>
              </View>
              {cert.issuer && <Text className="text-sm text-muted">{cert.issuer}</Text>}
              {cert.referenceNumber && (
                <Text className="text-sm text-muted">Ref: {cert.referenceNumber}</Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
