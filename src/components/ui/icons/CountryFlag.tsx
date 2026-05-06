import * as flags from "country-flag-icons/string/3x2";
import { View } from "react-native";
import { SvgXml } from "react-native-svg";

type Props = {
  iso2: string;
  size?: number;
};

export function CountryFlag({ iso2, size = 24 }: Props) {
  const code = iso2.toUpperCase() as keyof typeof flags;
  const svgString = flags[code];
  const width = size;
  const height = size * (2 / 3);

  if (!svgString) {
    return <View style={{ width, height }} />;
  }

  return <SvgXml xml={svgString} width={width} height={height} />;
}
