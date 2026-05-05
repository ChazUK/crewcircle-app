import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppRegistry } from "react-native";

import { view } from "./storybook.requires";

const StorybookUIRoot = view.getStorybookUI({
  storage: {
    getItem: AsyncStorage.getItem,
    setItem: AsyncStorage.setItem,
  },
});

AppRegistry.registerComponent("main", () => StorybookUIRoot);

export default StorybookUIRoot;
