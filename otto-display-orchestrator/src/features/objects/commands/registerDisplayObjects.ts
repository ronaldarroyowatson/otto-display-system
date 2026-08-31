import { commandService } from "../../../integration/csl-registration.js";
import type { DisplayObject } from "../../layout/models/DisplayObject.js";

export const REGISTER_DISPLAY_OBJECTS_COMMAND_ID = "display.objects.register";

export interface RegisterDisplayObjectsInput {
  objects: DisplayObject[];
}

export interface RegisterDisplayObjectsResult {
  registered: number;
  ids: string[];
}

export async function registerDisplayObjects(input: RegisterDisplayObjectsInput): Promise<RegisterDisplayObjectsResult> {
  const ids = input.objects.map((object) => object.id);
  return {
    registered: ids.length,
    ids
  };
}

commandService.register<RegisterDisplayObjectsInput, RegisterDisplayObjectsResult>(
  REGISTER_DISPLAY_OBJECTS_COMMAND_ID,
  async (input: RegisterDisplayObjectsInput) => registerDisplayObjects(input)
);
