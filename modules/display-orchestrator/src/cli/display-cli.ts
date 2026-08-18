export interface DisplayCliCommand {
  name: string;
  description: string;
}

export const DISPLAY_CLI_COMMANDS: DisplayCliCommand[] = [
  {
    name: "display current <role>",
    description: "Return current payload for hallway, sidewall, or backwall."
  }
];
