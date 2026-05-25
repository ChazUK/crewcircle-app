import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { ListGroup, PressableFeedback, Spinner } from "heroui-native";
import {
  BriefcaseIcon,
  BuildingIcon,
  CalendarIcon,
  ChevronRightIcon,
  FileIcon,
  FileTextIcon,
  LanguagesIcon,
  MapPinIcon,
  UserIcon,
} from "lucide-react-native";
import { ScrollView, View } from "react-native";

import { Title } from "@/components/ui/Title";

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

  const identityPreview = profile.nickname ?? "Not added";

  const deptRolesPreview =
    profile.userType === "crew" && profile.department ? profile.department : "Not added";

  const yearsPreview =
    profile.mode === "self" && profile.startYearInDepartment !== undefined
      ? `Started ${profile.startYearInDepartment}`
      : "Not added";

  const languagesPreview =
    profile.mode === "self" && profile.spokenLanguages && profile.spokenLanguages.length > 0
      ? `${profile.spokenLanguages.length} added`
      : "Not added";

  const locationPreview = "city" in profile && profile.city ? profile.city : "Not added";

  const bioPreview = "bio" in profile && profile.bio ? profile.bio.slice(0, 40) : "Not added";

  const productionCompanyPreview =
    "productionCompany" in profile && profile.productionCompany
      ? profile.productionCompany
      : "Not added";

  const cvPreview =
    profile.mode === "self" && "cvUrl" in profile && profile.cvUrl ? "Uploaded" : "Not added";

  return (
    <ScrollView className="flex-1" contentContainerClassName="p-4 gap-4">
      <ListGroup>
        <PressableFeedback animation={false} onPress={() => router.push("/profile/edit/identity")}>
          <PressableFeedback.Scale>
            <ListGroup.Item>
              <ListGroup.ItemPrefix>
                <UserIcon size={20} />
              </ListGroup.ItemPrefix>
              <ListGroup.ItemContent>
                <ListGroup.ItemTitle>Identity</ListGroup.ItemTitle>
                <ListGroup.ItemDescription>{identityPreview}</ListGroup.ItemDescription>
              </ListGroup.ItemContent>
              <ListGroup.ItemSuffix>
                <ChevronRightIcon size={16} />
              </ListGroup.ItemSuffix>
            </ListGroup.Item>
          </PressableFeedback.Scale>
        </PressableFeedback>

        {profile.userType === "crew" ? (
          <PressableFeedback
            animation={false}
            onPress={() => router.push("/profile/edit/department-and-roles")}
          >
            <PressableFeedback.Scale>
              <ListGroup.Item>
                <ListGroup.ItemPrefix>
                  <BriefcaseIcon size={20} />
                </ListGroup.ItemPrefix>
                <ListGroup.ItemContent>
                  <ListGroup.ItemTitle>Department & Roles</ListGroup.ItemTitle>
                  <ListGroup.ItemDescription>{deptRolesPreview}</ListGroup.ItemDescription>
                </ListGroup.ItemContent>
                <ListGroup.ItemSuffix>
                  <ChevronRightIcon size={16} />
                </ListGroup.ItemSuffix>
              </ListGroup.Item>
            </PressableFeedback.Scale>
          </PressableFeedback>
        ) : null}

        {profile.userType === "crew" ? (
          <PressableFeedback animation={false} onPress={() => router.push("/profile/edit/years")}>
            <PressableFeedback.Scale>
              <ListGroup.Item>
                <ListGroup.ItemPrefix>
                  <CalendarIcon size={20} />
                </ListGroup.ItemPrefix>
                <ListGroup.ItemContent>
                  <ListGroup.ItemTitle>Years in Department</ListGroup.ItemTitle>
                  <ListGroup.ItemDescription>{yearsPreview}</ListGroup.ItemDescription>
                </ListGroup.ItemContent>
                <ListGroup.ItemSuffix>
                  <ChevronRightIcon size={16} />
                </ListGroup.ItemSuffix>
              </ListGroup.Item>
            </PressableFeedback.Scale>
          </PressableFeedback>
        ) : null}

        {profile.userType === "crew" ? (
          <PressableFeedback
            animation={false}
            onPress={() => router.push("/profile/edit/languages")}
          >
            <PressableFeedback.Scale>
              <ListGroup.Item>
                <ListGroup.ItemPrefix>
                  <LanguagesIcon size={20} />
                </ListGroup.ItemPrefix>
                <ListGroup.ItemContent>
                  <ListGroup.ItemTitle>Spoken Languages</ListGroup.ItemTitle>
                  <ListGroup.ItemDescription>{languagesPreview}</ListGroup.ItemDescription>
                </ListGroup.ItemContent>
                <ListGroup.ItemSuffix>
                  <ChevronRightIcon size={16} />
                </ListGroup.ItemSuffix>
              </ListGroup.Item>
            </PressableFeedback.Scale>
          </PressableFeedback>
        ) : null}

        <PressableFeedback animation={false} onPress={() => router.push("/profile/edit/location")}>
          <PressableFeedback.Scale>
            <ListGroup.Item>
              <ListGroup.ItemPrefix>
                <MapPinIcon size={20} />
              </ListGroup.ItemPrefix>
              <ListGroup.ItemContent>
                <ListGroup.ItemTitle>Location</ListGroup.ItemTitle>
                <ListGroup.ItemDescription>{locationPreview}</ListGroup.ItemDescription>
              </ListGroup.ItemContent>
              <ListGroup.ItemSuffix>
                <ChevronRightIcon size={16} />
              </ListGroup.ItemSuffix>
            </ListGroup.Item>
          </PressableFeedback.Scale>
        </PressableFeedback>

        {profile.userType === "production-manager" ? (
          <PressableFeedback
            animation={false}
            onPress={() => router.push("/profile/edit/production-company")}
          >
            <PressableFeedback.Scale>
              <ListGroup.Item>
                <ListGroup.ItemPrefix>
                  <BuildingIcon size={20} />
                </ListGroup.ItemPrefix>
                <ListGroup.ItemContent>
                  <ListGroup.ItemTitle>Production Company</ListGroup.ItemTitle>
                  <ListGroup.ItemDescription>{productionCompanyPreview}</ListGroup.ItemDescription>
                </ListGroup.ItemContent>
                <ListGroup.ItemSuffix>
                  <ChevronRightIcon size={16} />
                </ListGroup.ItemSuffix>
              </ListGroup.Item>
            </PressableFeedback.Scale>
          </PressableFeedback>
        ) : null}

        <PressableFeedback animation={false} onPress={() => router.push("/profile/edit/bio-links")}>
          <PressableFeedback.Scale>
            <ListGroup.Item>
              <ListGroup.ItemPrefix>
                <FileTextIcon size={20} />
              </ListGroup.ItemPrefix>
              <ListGroup.ItemContent>
                <ListGroup.ItemTitle>Bio & Links</ListGroup.ItemTitle>
                <ListGroup.ItemDescription>{bioPreview}</ListGroup.ItemDescription>
              </ListGroup.ItemContent>
              <ListGroup.ItemSuffix>
                <ChevronRightIcon size={16} />
              </ListGroup.ItemSuffix>
            </ListGroup.Item>
          </PressableFeedback.Scale>
        </PressableFeedback>

        {profile.userType === "crew" ? (
          <PressableFeedback animation={false} onPress={() => router.push("/profile/edit/cv")}>
            <PressableFeedback.Scale>
              <ListGroup.Item>
                <ListGroup.ItemPrefix>
                  <FileIcon size={20} />
                </ListGroup.ItemPrefix>
                <ListGroup.ItemContent>
                  <ListGroup.ItemTitle>CV</ListGroup.ItemTitle>
                  <ListGroup.ItemDescription>{cvPreview}</ListGroup.ItemDescription>
                </ListGroup.ItemContent>
                <ListGroup.ItemSuffix>
                  <ChevronRightIcon size={16} />
                </ListGroup.ItemSuffix>
              </ListGroup.Item>
            </PressableFeedback.Scale>
          </PressableFeedback>
        ) : null}
      </ListGroup>
    </ScrollView>
  );
}
