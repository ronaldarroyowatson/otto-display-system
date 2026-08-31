export type CslCommandHandler<TInput, TOutput> = (payload: TInput) => Promise<TOutput>;

export class InProcessCommandService {
  private readonly handlers = new Map<string, CslCommandHandler<unknown, unknown>>();

  register<TInput, TOutput>(commandName: string, handler: CslCommandHandler<TInput, TOutput>): void {
    if (this.handlers.has(commandName)) {
      return;
    }

    this.handlers.set(commandName, handler as CslCommandHandler<unknown, unknown>);
  }

  async run<TInput, TOutput>(commandName: string, payload: TInput): Promise<TOutput> {
    const handler = this.handlers.get(commandName);
    if (!handler) {
      throw new Error(`Command not registered: ${commandName}`);
    }

    return (await handler(payload)) as TOutput;
  }
}

export const commandService = new InProcessCommandService();

export async function executeDisplayOrchestratorCommand<TInput, TOutput>(commandName: string, input: TInput): Promise<TOutput> {
  return commandService.run<TInput, TOutput>(commandName, input);
}
