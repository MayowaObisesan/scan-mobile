import * as React from "react";
import Svg, { Path } from "react-native-svg";

const SolarPaperclipBoldDuotoneIcon: React.FC<React.ComponentProps<typeof Svg>> = (props) => (
  <Svg
    // xmlns="http://www.w3.org/2000/svg"
    width={props.width || "24"}
    height={props.height || "24"}
    viewBox="0 0 24 24"
    {...props}
  >
    <Path
      fill="currentColor"
      fillRule="evenodd"
      d="M8.886 3.363c2.942-2.817 7.7-2.817 10.643 0a.75.75 0 0 1-1.037 1.083c-2.363-2.261-6.206-2.261-8.57 0l-6.403 6.13A.75.75 0 0 1 2.48 9.493zm6.38 3.088a.75.75 0 0 1 1.061-.023a3 3 0 0 1 0 4.367l-7.89 7.554a.75.75 0 1 1-1.038-1.084l7.89-7.553a1.503 1.503 0 0 0 0-2.2a.75.75 0 0 1-.022-1.061"
      clipRule="evenodd"
    />
    <Path
      fill="currentColor"
      d="M18.491 4.446c2.345 2.244 2.345 5.868 0 8.112l-7.948 7.608c-1.51 1.445-3.971 1.445-5.481 0a3.53 3.53 0 0 1 0-5.156l7.834-7.499a1.753 1.753 0 0 1 2.393 0a.75.75 0 0 1 1.022-1.099a3.253 3.253 0 0 0-4.453.015l-7.833 7.499a5.03 5.03 0 0 0 0 7.323c2.09 2 5.466 2 7.556 0l7.948-7.608c2.956-2.83 2.96-7.428.015-10.264a.75.75 0 0 1-1.053 1.069"
      opacity={"0.5"}
    />
  </Svg>
);

export default SolarPaperclipBoldDuotoneIcon;
