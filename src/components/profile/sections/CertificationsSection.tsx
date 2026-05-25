import type { CertificationEntry, CrewProfile } from "@shared/profile/viewableProfile";
import { Chip, Surface } from "heroui-native";
import { Text, View } from "react-native";

import { SmallHeading } from "@/components/ui/SmallHeading";
import { formatCertificationExpiry } from "@/lib/profile/formatCertificationExpiry";

type Props = Partial<Pick<CrewProfile, "certifications">>;

const STATUS_COLOR = {
  "no-expiry": "default",
  valid: "success",
  "expiring-soon": "warning",
  expired: "danger",
} as const;

export function CertificationsSection({ certifications }: Props) {
  if (!certifications || certifications.length === 0) return null;

  return (
    <View className="gap-1">
      <SmallHeading>Certifications</SmallHeading>
      <View className="gap-2">
        {certifications.map((certificate) => {
          return <CertificateCard key={certificate.id} certificate={certificate} />;
        })}
      </View>
    </View>
  );
}

type CertificateCardProps = {
  certificate: CertificationEntry;
};

function CertificateCard({ certificate }: CertificateCardProps) {
  const now = new Date();
  const expiry = formatCertificationExpiry(certificate.expiresAt, now.getTime());

  return (
    <Surface className="flex-row gap-2 rounded-xl p-3">
      <View className="flex flex-1 gap-1">
        <Text className="text-sm font-medium text-foreground">{certificate.name}</Text>

        <View className="flex-row gap-1">
          {certificate.issuer && (
            <Text className="text-xs text-muted" numberOfLines={1}>
              {certificate.issuer}
            </Text>
          )}
          {certificate.issuer && certificate.referenceNumber && (
            <Text className="text-xs text-muted">•</Text>
          )}
          {certificate.referenceNumber && (
            <Text className="text-xs text-muted" numberOfLines={1}>
              Ref: {certificate.referenceNumber}
            </Text>
          )}
        </View>
      </View>

      {certificate.expiresAt && (
        <Chip
          className="self-center"
          size="sm"
          variant="secondary"
          color={STATUS_COLOR[expiry.status]}
        >
          {expiry.label}
        </Chip>
      )}
    </Surface>
  );
}
