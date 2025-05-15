import * as React from "react";
import Svg, {Circle, Defs, G, Mask, Path } from "react-native-svg";

const SolarSearchOutlineIcon: React.FC<React.ComponentProps<typeof Svg>> = (props) => (
  <Svg
    // xmlns="http://www.w3.org/2000/svg"
    width={props.width || "24"}
    height={props.height || "24"}
    viewBox="0 0 24 24"
    {...props}
  >
    <Defs>
      <Mask id="solarMagniferLineDuotone0">
        <G fill="none" strokeWidth={"1.5"}>
          <Circle cx="11.5" cy="11.5" r="9.5" stroke="#808080" />
          <Path stroke="#fff" strokeLinecap="round" d="M18.5 18.5L22 22" />
        </G>
      </Mask>
    </Defs>
    <Path
      fill="currentColor"
      d="M0 0h24v24H0z"
      mask="url(#solarMagniferLineDuotone0)"
    />
  </Svg>
);

export default SolarSearchOutlineIcon;
