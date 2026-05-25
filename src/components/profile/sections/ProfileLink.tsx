import { Directory, File, Paths } from "expo-file-system";
import * as Linking from "expo-linking";
import * as Sharing from "expo-sharing";
import { Chip } from "heroui-native";
import { DownloadIcon, GlobeIcon } from "lucide-react-native";
import { Pressable } from "react-native-gesture-handler";

import IMDBIcon from "../../../assets/icons/imdb.svg";

type Props = {
  type: "download" | "imdb" | "url";
  url: string;
};

function lastPathSegment(u: string) {
  try {
    const path = new URL(u).pathname.replace(/\/$/, "");
    return path.slice(path.lastIndexOf("/") + 1);
  } catch {
    return u;
  }
}

export function ProfileLink({ type, url }: Props) {
  if (!url) return null;

  const Icon = type === "download" ? DownloadIcon : type === "imdb" ? IMDBIcon : GlobeIcon;
  const title =
    type === "url"
      ? url.replace(/^https?:\/\//, "")
      : type === "download"
        ? "CV"
        : type === "imdb"
          ? "IMDb"
          : null;
  const onPress =
    type === "download"
      ? async () => {
          const file = await File.downloadFileAsync(url, new Directory(Paths.cache));

          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(file.uri, {
              mimeType: "application/pdf",
              dialogTitle: "Save CV",
              UTI: "com.adobe.pdf",
            });
          }
        }
      : () => Linking.openURL(url);

  return (
    <Pressable onPress={onPress}>
      <Chip variant="secondary" color="default">
        <Icon width={16} height={16} />
        <Chip.Label>{title}</Chip.Label>
      </Chip>
    </Pressable>
  );
}
