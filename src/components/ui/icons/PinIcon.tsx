import Svg, { Circle, Path } from "react-native-svg";

type Props = {
  size?: number;
  color?: string;
};

export function PinIcon({ size = 14, color = "#1f2937" }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21s7-6.2 7-11.5a7 7 0 1 0-14 0C5 14.8 12 21 12 21Z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={9.5} r={2.5} stroke={color} strokeWidth={1.6} />
    </Svg>
  );
}
