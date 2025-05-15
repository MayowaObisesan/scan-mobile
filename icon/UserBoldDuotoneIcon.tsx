import * as React from "react";
import Svg, {Circle, Path} from "react-native-svg";

const SolarUserBoldDuotoneIcon: React.FC<React.ComponentProps<typeof Svg>> = (props) => (
  <Svg
    // xmlns="http://www.w3.org/2000/svg"
    width={props.width || "24"}
    height={props.height || "24"}
    viewBox="0 0 24 24"
    {...props}
  >
    <Circle cx={"12"} cy={"6"} r={"4"} fill="currentColor" />
    <Path
      fill="currentColor"
      d="M20 17.5c0 2.485 0 4.5-8 4.5s-8-2.015-8-4.5S7.582 13 12 13s8 2.015 8 4.5"
      opacity={"0.5"}
    />
  </Svg>
);

export default SolarUserBoldDuotoneIcon;
