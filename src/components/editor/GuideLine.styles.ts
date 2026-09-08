import { StyleSheet } from "react-native";

import { Colors } from "@/constants/colors";

export const styles = StyleSheet.create({
  /**
   * The actual touch area is wider than the visible guide line so
   * dragging a 1px line remains usable on touch screens.
   */
  touchTarget: {
    position: "absolute",
  },

  horizontalLine: {
    position: "absolute",

    left: 0,

    right: 0,

    height: 1,

    backgroundColor: Colors.accentBright,
  },

  verticalLine: {
    position: "absolute",

    top: 0,

    bottom: 0,

    width: 1,

    backgroundColor: Colors.accentBright,
  },
});
