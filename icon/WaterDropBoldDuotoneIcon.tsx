import * as React from "react";
import Svg, { Path } from "react-native-svg";

const SolarWaterDropBoldDuotoneIcon: React.FC<React.ComponentProps<typeof Svg>> = (props) => (
  <Svg
    // xmlns="http://www.w3.org/2000/svg"
    width={props.width || "24"}
    height={props.height || "24"}
    viewBox="0 0 24 24"
    {...props}
  >
    <Path
      fill="currentColor"
      d="M11.612 22h.777C17.145 22 21 18.057 21 13.193v-.265c0-4.611-2.729-8.765-6.903-10.507a5.43 5.43 0 0 0-4.194 0C5.73 4.163 3 8.317 3 12.928v.265C3 18.057 6.855 22 11.612 22"
      opacity={"0.5"}
    />
    <Path
      fill="currentColor"
      d="M12.066 5.961a.75.75 0 0 1-.366.996c-1.545.715-2.793 2.168-3.37 3.993a.75.75 0 1 1-1.43-.453c.691-2.186 2.206-3.993 4.17-4.902a.75.75 0 0 1 .996.366"
    />
  </Svg>
);

export default SolarWaterDropBoldDuotoneIcon;
