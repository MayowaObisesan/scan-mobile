import * as React from "react";
import Svg, { Path } from "react-native-svg";

const SolarMagnifierBoldDuotoneIcon: React.FC<React.ComponentProps<typeof Svg>> = (props) => (
  <Svg
    // xmlns="http://www.w3.org/2000/svg"
    width={props.width || "24"}
    height={props.height || "24"}
    viewBox="0 0 24 24"
    {...props}
  >
    <Path
      fill="currentColor"
      d="M20.128 11.143c0 5.05-4.058 9.143-9.064 9.143S2 16.192 2 11.143S6.058 2 11.064 2s9.064 4.093 9.064 9.143"
      opacity={"0.5"}
    />
    <Path
      fill="currentColor"
      fillRule="evenodd"
      d="M17.82 19.7c-.09-1.094.816-2.008 1.9-1.918c.189.016.414.085.643.154l.067.02l.06.018c.21.064.42.127.58.213a1.786 1.786 0 0 1 .637 2.549c-.1.152-.255.308-.41.464l-.045.045l-.044.045c-.155.157-.31.313-.46.414a1.754 1.754 0 0 1-2.527-.643c-.086-.161-.148-.373-.211-.585l-.018-.06l-.02-.068c-.07-.231-.137-.458-.152-.648"
      clipRule="evenodd"
    />
  </Svg>
);

export default SolarMagnifierBoldDuotoneIcon;
