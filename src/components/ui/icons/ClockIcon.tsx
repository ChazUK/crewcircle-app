import Svg, { Circle, Path } from "react-native-svg";

type Props = {
  size?: number;
  color?: string;
};

export function ClockIcon({ size = 14, color = "#1f2937" }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.6} />
      <Path
        d="M12 7v5l3 2"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
