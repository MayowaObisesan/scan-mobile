import * as React from "react";
import Svg, {Circle, Ellipse, G, Path} from "react-native-svg";

const SolarSmileCircleLineDuotoneIcon: React.FC<React.ComponentProps<typeof Svg>> = (props) => (
  <Svg
    // xmlns="http://www.w3.org/2000/svg"
    width={props.width || "24"}
    height={props.height || "24"}
    viewBox="0 0 24 24"
    {...props}
  >
    <G fill="none">
      <Circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth={"1.5"}
        opacity={"0.5"}
      />
      <Path
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth={"1.5"}
        d="M9 16c.85.63 1.885 1 3 1s2.15-.37 3-1"
      />
      <Path
        fill="currentColor"
        d="M16 10.5c0 .828-.448 1.5-1 1.5s-1-.672-1-1.5s.448-1.5 1-1.5s1 .672 1 1.5"
      />
      <Ellipse cx="9" cy="10.5" fill="currentColor" rx="1" ry="1.5" />
    </G>
  </Svg>
);

export default SolarSmileCircleLineDuotoneIcon;
