import {
  StyleSheet,
} from "react-native";

import {
  Colors,
} from "@/constants/colors";

export const styles =
  StyleSheet.create({
    /**
     * Much wider than the visible 1 px guide.
     *
     * A reference guide must be easy to grab with a finger or mouse.
     */
    touchTarget: {
      position: "absolute",
    },

    horizontalLine: {
      position: "absolute",

      left: 0,
      right: 0,

      height: 1,

      backgroundColor:
        Colors.accentBright,
    },

    verticalLine: {
      position: "absolute",

      top: 0,
      bottom: 0,

      width: 1,

      backgroundColor:
        Colors.accentBright,
    },
  });