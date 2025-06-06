import * as React from "react";
import Svg, {G, Path } from "react-native-svg";

const SolarScannerOutlineDuotoneIcon: React.FC<React.ComponentProps<typeof Svg>> = (props) => (
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
      strokeWidth={"1.5"}
    >
      <Path
        d="M10 22c-3.771 0-5.657 0-6.828-1.172S2 18.771 2 15m20 0c0 3.771 0 4.657-1.172 5.828S17.771 22 14 22m0-20c3.771 0 5.657 0 6.828 1.172S22 5.229 22 9M10 2C6.229 2 4.343 2 3.172 3.172S2 5.229 2 9"
        opacity={"0.5"}
      />
      <Path d="M2 12h20" />
    </G>
  </Svg>
);

export default SolarScannerOutlineDuotoneIcon;
