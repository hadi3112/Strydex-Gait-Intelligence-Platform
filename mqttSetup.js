import { Buffer } from "buffer";
import process from "process";
import { Platform } from "react-native";

global.Buffer = Buffer;
global.process = process;

if (Platform.OS !== "web") {
  global.setImmediate = global.setImmediate || ((...args) => setTimeout(...args));
}
