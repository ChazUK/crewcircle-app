import { api } from "@convex/_generated/api";
import type { Profile } from "@shared/profile/viewableProfile";
import { useQuery } from "convex/react";
import { Href, useRouter } from "expo-router";
import { ListGroup, PressableFeedback, Spinner } from "heroui-native";
import {
  BriefcaseIcon,
  BuildingIcon,
  CarIcon,
  ChevronRightIcon,
  FileIcon,
  FileTextIcon,
  GlobeIcon,
  IdCardIcon,
  LanguagesIcon,
  LucideIcon,
  MapPinIcon,
  UserIcon,
} from "lucide-react-native";
import { ScrollView, View } from "react-native";

import { Title } from "@/components/ui/Title";

type UserType = Profile["userType"];

type EditRow = {
  key: string;
  icon: LucideIcon;
  title: string;
  preview: string;
  href: Href;
  visibleFor: UserType | "all";
};

function buildRows(profile: Profile): EditRow[] {
  return [
    {
      key: "identity",
      icon: UserIcon,
      title: "Identity",
      preview:
        profile.firstName || profile.lastName
          ? [profile.firstName, profile.lastName].filter(Boolean).join(" ")
          : "Not added",
      href: "/profile/edit/identity",
      visibleFor: "all",
    },
    {
      key: "department-and-roles",
      icon: BriefcaseIcon,
      title: "Department & Roles",
      preview: profile.department ?? "Not added",
      href: "/profile/edit/department-and-roles",
      visibleFor: "crew",
    },
    {
      key: "languages",
      icon: LanguagesIcon,
      title: "Spoken Languages",
      preview:
        profile.spokenLanguages && profile.spokenLanguages.length > 0
          ? `${profile.spokenLanguages.length} added`
          : "Not added",
      href: "/profile/edit/languages",
      visibleFor: "crew",
    },
    {
      key: "location",
      icon: MapPinIcon,
      title: "Location",
      preview: profile.city ?? "Not added",
      href: "/profile/edit/location",
      visibleFor: "all",
    },
    {
      key: "production-company",
      icon: BuildingIcon,
      title: "Production Company",
      preview: profile.productionCompany ?? "Not added",
      href: "/profile/edit/production-company",
      visibleFor: "production-manager",
    },
    {
      key: "bio-links",
      icon: FileTextIcon,
      title: "Bio & Links",
      preview: profile.bio ? profile.bio.slice(0, 40) : "Not added",
      href: "/profile/edit/bio-links",
      visibleFor: "all",
    },
    {
      key: "cv",
      icon: FileIcon,
      title: "CV",
      preview: profile.cvUrl ? "Uploaded" : "Not added",
      href: "/profile/edit/cv",
      visibleFor: "crew",
    },
    {
      key: "passports",
      icon: IdCardIcon,
      title: "Passports",
      preview:
        profile.passports && profile.passports.length > 0
          ? `${profile.passports.length} added`
          : "Not added",
      href: "/profile/edit/passports",
      visibleFor: "crew",
    },
    {
      key: "driving-licences",
      icon: CarIcon,
      title: "Driving Licences",
      preview:
        profile.drivingLicences && profile.drivingLicences.length > 0
          ? `${profile.drivingLicences.length} added`
          : "Not added",
      href: "/profile/edit/driving-licences",
      visibleFor: "crew",
    },
    {
      key: "work-eligibility",
      icon: GlobeIcon,
      title: "Work Eligibility",
      preview:
        profile.workEligibility && profile.workEligibility.length > 0
          ? `${profile.workEligibility.length} added`
          : "Not added",
      href: "/profile/edit/work-eligibility",
      visibleFor: "crew",
    },
  ];
}

export default function EditProfileHubScreen() {
  const router = useRouter();
  const profile = useQuery(api.users.queries.getMyProfile);

  if (profile === undefined) {
    return (
      <View className="flex-1 items-center justify-center">
        <Spinner />
      </View>
    );
  }

  if (profile === null) {
    return (
      <View className="flex-1 items-center justify-center px-4">
        <Title title="Sign in to edit your profile" />
      </View>
    );
  }

  const rows = buildRows(profile).filter(
    (row) => row.visibleFor === "all" || row.visibleFor === profile.userType,
  );

  return (
    <ScrollView className="flex-1" contentContainerClassName="p-4 gap-4">
      <ListGroup>
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <PressableFeedback
              key={row.key}
              animation={false}
              onPress={() => router.push(row.href)}
            >
              <PressableFeedback.Scale>
                <ListGroup.Item disabled>
                  <ListGroup.ItemPrefix>
                    <Icon size={20} />
                  </ListGroup.ItemPrefix>
                  <ListGroup.ItemContent>
                    <ListGroup.ItemTitle>{row.title}</ListGroup.ItemTitle>
                    <ListGroup.ItemDescription>{row.preview}</ListGroup.ItemDescription>
                  </ListGroup.ItemContent>
                  <ListGroup.ItemSuffix>
                    <ChevronRightIcon size={16} />
                  </ListGroup.ItemSuffix>
                </ListGroup.Item>
              </PressableFeedback.Scale>
            </PressableFeedback>
          );
        })}
      </ListGroup>
    </ScrollView>
  );
}
