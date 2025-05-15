import * as React from "react";
import Svg, { G, Path } from "react-native-svg";

const SolarCheckReadIcon: React.FC<React.ComponentProps<typeof Svg>> = (props) => (
  <Svg
    // xmlns="http://www.w3.org/2000/svg"
    width={props.width || "24"}
    height={props.height || "24"}
    viewBox="0 0 24 24"
    {...props}
  >
    <G
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={"1.5"}
    >
      <Path d="m4 12.9l3.143 3.6L15 7.5" opacity={"0.5"} />
      <Path d="m20 7.563l-8.571 9L11 16" />
    </G>
  </Svg>
);

export default SolarCheckReadIcon;
